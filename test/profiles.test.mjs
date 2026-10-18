import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { PROFILE_IDS, getProfile } from "../src/profiles.mjs";
import { createVerifier } from "../src/auth.mjs";
import { createHttpApp, readWidget } from "../src/server.mjs";
import { taskView, getOwnedTask, HttpOwnedTaskReader } from "../src/tasks.mjs";
const issuer = "https://issuer.example.invalid/";
const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = await exportJWK(publicKey);
jwk.kid = "profiles";
const principal = { subject: "alice", tenant: "one", jti: "fixture" };
function fixture(profile, overrides = {}) {
  return {
    service: profile.id,
    model: profile.modelPrefix ? `${profile.modelPrefix}fixture` : "fixture",
    owner_subject: "alice",
    tenant_id: "one",
    state: "succeeded",
    finished_at: 123,
    response: {
      success: true,
      data: [
        {
          title: '<img src=x onerror="secret">',
          duration: 8,
          width: 1280,
          height: 720,
          video_url: "secret-preview",
          image_url: "secret-image",
          audio_url: "secret-audio",
          prompt: "private prompt",
        },
      ],
    },
    ...overrides,
  };
}
async function signed(profile, audience, scope = profile.scope) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: "alice", tenant_id: "one", scope, jti: "fixture" })
    .setProtectedHeader({ alg: "RS256", kid: "profiles" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 120)
    .sign(privateKey);
}
test("five independent service profiles have unique identities, scopes, resources and tools", () => {
  assert.equal(PROFILE_IDS.length, 5);
  for (const key of ["id", "scope", "resourceUri", "tool"])
    assert.equal(new Set(PROFILE_IDS.map((id) => getProfile(id)[key])).size, 5);
  assert.throws(() => getProfile("../suno"));
  assert.throws(() => getProfile("all"));
});
for (const id of PROFILE_IDS) {
  const profile = getProfile(id);
  test(`${id}: own scope, exactly one tool/resource, owned task via real HTTP MCP client`, async () => {
    const origin = `https://${id}.example.invalid`;
    const audience = `${origin}/mcp`;
    const verify = createVerifier({
      issuer,
      audience,
      keyResolver: createLocalJWKSet({ keys: [jwk] }),
      requiredScope: profile.scope,
    });
    const calls = [];
    const app = createHttpApp({
      verify,
      profile,
      publicOrigin: origin,
      issuer,
      widgetHtml: readWidget(profile),
      reader: {
        getOwned: async (taskId, identity) => {
          calls.push({ taskId, identity });
          return taskId === "owned-task"
            ? fixture(profile)
            : fixture(profile, { service: "foreign" });
        },
      },
    });
    const http = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const url = new URL(`http://127.0.0.1:${http.address().port}/mcp`);
    const client = new Client({ name: `${id}-local-test`, version: "1" });
    try {
      const metadata = await (
        await fetch(new URL("/.well-known/oauth-protected-resource/mcp", url))
      ).json();
      assert.deepEqual(metadata.scopes_supported, [profile.scope]);
      assert.equal(metadata.resource, audience);
      const denied = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${await signed(profile, audience, "other.tasks:read")}`,
        },
        body: "{}",
      });
      assert.equal(denied.status, 403);
      await client.connect(
        new StreamableHTTPClientTransport(url, {
          requestInit: {
            headers: {
              authorization: `Bearer ${await signed(profile, audience)}`,
            },
          },
        }),
      );
      const tools = (await client.listTools()).tools;
      assert.deepEqual(
        tools.map((x) => x.name),
        [profile.tool],
      );
      assert.equal(tools[0]._meta.ui.resourceUri, profile.resourceUri);
      assert.deepEqual(tools[0]._meta.securitySchemes[0].scopes, [
        profile.scope,
      ]);
      const resources = (await client.listResources()).resources;
      assert.deepEqual(
        resources.map((x) => x.uri),
        [profile.resourceUri],
      );
      const resource = (await client.readResource({ uri: profile.resourceUri }))
        .contents[0];
      assert.equal(resource.mimeType, "text/html;profile=mcp-app");
      assert.ok(resource.text.includes(`${profile.brand} task viewer`));
      assert.ok(!resource.text.includes("<iframe"));
      assert.deepEqual(resource._meta.ui.csp.resourceDomains, []);
      const result = await client.callTool({
        name: profile.tool,
        arguments: { task_id: "owned-task" },
      });
      assert.ok(!result.isError);
      assert.equal(result.structuredContent.service, id);
      assert.equal(result.structuredContent.tool_name, profile.tool);
      assert.equal(result.structuredContent.assets[0].kind, profile.kind);
      assert.equal(calls[0].identity.subject, "alice");
      assert.equal(result.structuredContent.media_available, false);
      for (const args of [
        { task_id: "owned-task", service: "other" },
        { task_id: "owned-task", action: "delete" },
        { task_id: "owned-task", model: "other" },
      ])
        assert.equal(
          (await client.callTool({ name: profile.tool, arguments: args }))
            .isError,
          true,
        );
      assert.equal(calls.length, 1);
      const wrongService = await client.callTool({
        name: profile.tool,
        arguments: { task_id: "foreign-task" },
      });
      assert.equal(wrongService.isError, true);
      const otherTool = getProfile(PROFILE_IDS.find((x) => x !== id)).tool;
      assert.equal(
        (
          await client.callTool({
            name: otherTool,
            arguments: { task_id: "owned-task" },
          })
        ).isError,
        true,
      );
    } finally {
      await client.close();
      await new Promise((resolve) => http.close(resolve));
    }
  });
  test(`${id}: pending/running media is a preview, explicit failure wins, safe metadata only`, () => {
    for (const state of ["running", "processing", "queued", "pending"]) {
      const result = taskView("same", fixture(profile, { state }), profile);
      assert.equal(result.terminal, false);
      assert.deepEqual(result.assets, []);
    }
    const result = taskView("same", fixture(profile), profile);
    assert.equal(result.state, "complete");
    const serialized = JSON.stringify(result);
    for (const secret of [
      "secret-preview",
      "secret-image",
      "secret-audio",
      "private prompt",
    ])
      assert.ok(!serialized.includes(secret));
    assert.equal(
      result.assets[0].duration_seconds,
      profile.kind === "image" ? undefined : 8,
    );
    assert.equal(
      result.assets[0].width,
      profile.kind === "music" ? undefined : 1280,
    );
    assert.equal(
      taskView("same", fixture(profile, { state: "failed" }), profile).state,
      "failed",
    );
    assert.equal(
      taskView(
        "same",
        fixture(profile, { response: { success: false } }),
        profile,
      ).state,
      "failed",
    );
  });
  test(`${id}: trusted readback envelope binds service/API plus owner/tenant/jti and fixed retrieve`, async () => {
    let request;
    const reader = new HttpOwnedTaskReader({
      profile,
      url: "https://internal.example.invalid/read",
      token: "fixture",
      fetchImpl: async (_url, options) => {
        request = JSON.parse(options.body);
        return new Response(JSON.stringify(fixture(profile)));
      },
    });
    await getOwnedTask(reader, principal, "same", profile);
    assert.deepEqual(request, {
      task_id: "same",
      subject: "alice",
      tenant_id: "one",
      token_jti: "fixture",
      service: id,
      task_api: profile.taskApi,
      action: "retrieve",
    });
    await assert.rejects(
      getOwnedTask(
        { getOwned: async () => fixture(profile, { owner_subject: "bob" }) },
        principal,
        "same",
        profile,
      ),
      (e) => e.status === 404,
    );
    await assert.rejects(
      getOwnedTask(
        { getOwned: async () => fixture(profile, { service: "foreign" }) },
        principal,
        "same",
        profile,
      ),
      (e) => e.status === 404,
    );
  });
  test(`${id}: actual widget bridge renders text and refreshes only its own same ID`, async () => {
    const elements = Object.fromEntries(
      ["status", "tracks", "refresh"].map((name) => [
        name,
        {
          textContent: "",
          children: [],
          disabled: true,
          replaceChildren() {
            this.children = [];
          },
          append(x) {
            this.children.push(x);
          },
          addEventListener(_event, callback) {
            this.click = callback;
          },
        },
      ]),
    );
    const calls = [];
    let instance;
    class MockApp {
      constructor() {
        instance = this;
      }
      async connect() {}
      async callServerTool(args) {
        calls.push(args);
        return {
          structuredContent: taskView(
            "same",
            fixture(profile, { state: "processing" }),
            profile,
          ),
        };
      }
    }
    const code = fs
      .readFileSync(new URL("../web/widget.mjs", import.meta.url), "utf8")
      .replace(
        'import { App } from "@modelcontextprotocol/ext-apps";',
        "const App = MockApp;",
      );
    vm.runInNewContext(code, {
      MockApp,
      __APP_PROFILE__: profile,
      document: {
        getElementById: (id) => elements[id],
        createElement: () => ({ textContent: "" }),
      },
    });
    instance.ontoolresult({
      structuredContent: taskView("same", fixture(profile), profile),
    });
    assert.ok(
      elements.tracks.children[0].textContent.includes(
        '<img src=x onerror="secret">',
      ),
    );
    assert.equal(elements.tracks.children[0].innerHTML, undefined);
    assert.equal(elements.refresh.disabled, true);
    instance.ontoolresult({
      structuredContent: taskView(
        "same",
        fixture(profile, { state: "processing" }),
        profile,
      ),
    });
    assert.equal(elements.refresh.disabled, false);
    await elements.refresh.click();
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
      { name: profile.tool, arguments: { task_id: "same" } },
    ]);
    instance.ontoolresult({
      structuredContent: {
        task_id: "same",
        service: "foreign",
        tool_name: profile.tool,
        assets: [],
      },
    });
    assert.equal(elements.refresh.disabled, true);
  });
}
test("GPT Image requires finished_at and rejects other OpenAI image families", async () => {
  const profile = getProfile("gpt-image");
  for (const row of [
    fixture(profile, { finished_at: null }),
    fixture(profile, { finished_at: undefined }),
  ])
    assert.equal(taskView("same", row, profile).terminal, false);
  await assert.rejects(
    getOwnedTask(
      { getOwned: async () => fixture(profile, { model: "dall-e-3" }) },
      principal,
      "same",
      profile,
    ),
    (e) => e.status === 404,
  );
  await assert.rejects(
    getOwnedTask(
      { getOwned: async () => fixture(profile, { model: undefined }) },
      principal,
      "same",
      profile,
    ),
    (e) => e.status === 404,
  );
});
test("Nano Banana rejects other image task families", async () => {
  const profile = getProfile("nano-banana");
  await assert.rejects(
    getOwnedTask(
      { getOwned: async () => fixture(profile, { model: "gpt-image-2" }) },
      principal,
      "same",
      profile,
    ),
    (e) => e.status === 404,
  );
});
test("HappyHorse does not equate video URL with terminal success and keeps per-item failures", () => {
  const profile = getProfile("happyhorse");
  assert.equal(
    taskView(
      "same",
      { response: { data: [{ video_url: "preview" }] } },
      profile,
    ).state,
    "unknown",
  );
  assert.equal(
    taskView("same", { response: { data: [{ state: "succeeded" }] } }, profile)
      .state,
    "complete",
  );
  assert.equal(
    taskView(
      "same",
      fixture(profile, {
        response: { data: [{ state: "error", video_url: "preview" }] },
      }),
      profile,
    ).state,
    "failed",
  );
});

test("all profile runtime/listing packets match executable contracts and do not claim publication", () => {
  for (const id of PROFILE_IDS) {
    const profile = getProfile(id);
    const runtime = JSON.parse(
      fs.readFileSync(
        new URL(`../profiles/${id}/runtime.json`, import.meta.url),
        "utf8",
      ),
    );
    const listing = JSON.parse(
      fs.readFileSync(
        new URL(`../profiles/${id}/listing.json`, import.meta.url),
        "utf8",
      ),
    );
    assert.equal(runtime.environment.APP_PROFILE, id);
    assert.equal(runtime.one_tool, profile.tool);
    assert.equal(runtime.one_resource, profile.resourceUri);
    assert.equal(runtime.scope, profile.scope);
    assert.equal(runtime.public_api_semantics.path, profile.taskApi);
    assert.equal(runtime.public_api_semantics.action, "retrieve");
    assert.equal(runtime.deployment_authorized, false);
    assert.equal(listing.auth.scopes[0], profile.scope);
    assert.equal(listing.tool, profile.tool);
    assert.equal(listing.submitted, false);
    assert.equal(listing.published, false);
    assert.equal(listing.install_url, null);
    assert.equal(listing.multi_app_policy_verified, false);
    assert.ok(
      fs
        .readFileSync(
          new URL(`../profiles/${id}/README.md`, import.meta.url),
          "utf8",
        )
        .includes(profile.scope),
    );
    assert.ok(
      fs
        .readFileSync(
          new URL(`../profiles/${id}/README_zh_Hans.md`, import.meta.url),
          "utf8",
        )
        .includes(profile.scope),
    );
  }
});
