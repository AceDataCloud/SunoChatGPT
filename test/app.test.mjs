import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createVerifier, READ_SCOPE } from "../src/auth.mjs";
import { createHttpApp, readWidget, RESOURCE_URI } from "../src/server.mjs";
import { taskView, getOwnedTask, HttpOwnedTaskReader } from "../src/tasks.mjs";
const issuer = "https://issuer.example.invalid/";
const audience = "https://app.example.invalid/mcp";
const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = await exportJWK(publicKey);
jwk.kid = "test";
const verify = createVerifier({
  issuer,
  audience,
  keyResolver: createLocalJWKSet({ keys: [jwk] }),
});
async function token(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: "alice",
    tenant_id: "one",
    scope: READ_SCOPE,
    iss: issuer,
    aud: audience,
    iat: now,
    exp: now + 120,
    jti: "fixture-token",
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .sign(privateKey);
}
test("valid signature identifies subject and tenant", async () => {
  assert.equal((await verify(`Bearer ${await token()}`)).subject, "alice");
});
for (const [name, changes] of Object.entries({
  "wrong audience": { aud: "wrong" },
  "wrong issuer": { iss: "https://wrong.invalid/" },
  expired: { exp: 1 },
  "overlong lifetime": { exp: Math.floor(Date.now() / 1000) + 400 },
  "future issued": { iat: Math.floor(Date.now() / 1000) + 90 },
  "missing revocation identifier": { jti: "" },
  "inverted lifetime": { iat: Math.floor(Date.now() / 1000) + 200 },
  "missing tenant": { tenant_id: "" },
  "missing subject": { sub: "" },
  "wrong scope": { scope: "mcp:access" },
  "generation scope": { scope: "music:generate" },
})) {
  test(`reject ${name}`, async () =>
    assert.rejects(verify(`Bearer ${await token(changes)}`)));
}
test("reject tampered signature and absent header", async () => {
  const signed = await token();
  const parts = signed.split(".");
  parts[1] = Buffer.from(JSON.stringify({ sub: "attacker" })).toString(
    "base64url",
  );
  await assert.rejects(verify(`Bearer ${parts.join(".")}`));
  await assert.rejects(verify(undefined));
});
const principal = { subject: "alice", tenant: "one", jti: "fixture-token" };
const complete = {
  service: "suno",
  owner_subject: "alice",
  tenant_id: "one",
  state: "complete",
  response: {
    success: true,
    data: [{ title: "<script>unsafe</script>", audio_url: "secret" }],
    token: "private",
  },
};
test("owner mismatch, deleted and unknown produce same error", async () => {
  for (const row of [
    null,
    { ...complete, owner_subject: "bob" },
    { ...complete, tenant_id: "other" },
    { ...complete, deleted: true },
  ]) {
    await assert.rejects(
      getOwnedTask({ getOwned: async () => row }, principal, "task"),
      (e) => e.status === 404,
    );
  }
});
test("states never expose previews or raw response", () => {
  for (const state of ["pending", "processing"]) {
    const r = taskView("same", { ...complete, state });
    assert.equal(r.state, state);
    assert.equal(r.terminal, false);
    assert.deepEqual(r.tracks, []);
  }
  assert.equal(taskView("same", { state: "complete" }).state, "unknown");
  assert.equal(
    taskView("same", { ...complete, state: "failed" }).state,
    "failed",
  );
  const r = taskView("same", complete);
  assert.equal(r.state, "complete");
  assert.equal(r.billing_verified, false);
  assert.equal(r.media_available, false);
  assert.ok(!JSON.stringify(r).includes("secret"));
});
test("readback envelope fixes action, binds trusted identity and token revocation ID", async () => {
  let request;
  const reader = new HttpOwnedTaskReader({
    url: "https://internal.example.invalid/read",
    token: "fixture-only",
    fetchImpl: async (url, options) => {
      request = { url, ...options };
      return new Response(JSON.stringify(complete));
    },
  });
  await getOwnedTask(reader, principal, "same");
  assert.deepEqual(JSON.parse(request.body), {
    task_id: "same",
    subject: "alice",
    tenant_id: "one",
    token_jti: "fixture-token",
    service: "suno",
    task_api: "/suno/tasks",
    action: "retrieve",
  });
  assert.equal(request.redirect, "error");
});
test("upstream permission errors and revocation remain distinguishable", async () => {
  for (const status of [401, 403]) {
    const reader = new HttpOwnedTaskReader({
      url: "https://internal.example.invalid/read",
      token: "fixture",
      fetchImpl: async () => new Response("", { status }),
    });
    await assert.rejects(
      reader.getOwned("same", principal),
      (e) => e.status === status,
    );
  }
});
test("rate limit is preserved and not retried", async () => {
  let calls = 0;
  const reader = new HttpOwnedTaskReader({
    url: "https://internal.example.invalid/read",
    token: "fixture",
    fetchImpl: async () => {
      calls++;
      return new Response("", { status: 429 });
    },
  });
  await assert.rejects(
    reader.getOwned("same", principal),
    (e) => e.status === 429,
  );
  assert.equal(calls, 1);
});
test("real HTTP MCP SDK roundtrip: identity, resource, task result and strict inputs", async () => {
  const calls = [];
  const app = createHttpApp({
    verify,
    reader: {
      getOwned: async (id, p) => {
        calls.push({ id, p });
        return id === "same-task" ? complete : null;
      },
    },
    publicOrigin: "https://app.example.invalid",
    issuer,
    widgetHtml: readWidget(),
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const url = `http://127.0.0.1:${server.address().port}/mcp`;
  const client = new Client({ name: "free-local-contract-test", version: "1" });
  try {
    const foreignOrigin = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://untrusted.invalid",
      },
      body: "{}",
    });
    assert.equal(foreignOrigin.status, 403);
    const unauthorized = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(unauthorized.status, 401);
    assert.match(
      unauthorized.headers.get("www-authenticate"),
      /resource_metadata/,
    );
    const denied = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${await token({ scope: "mcp:access" })}`,
      },
      body: "{}",
    });
    assert.equal(denied.status, 403);
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { authorization: `Bearer ${await token()}` } },
    });
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((x) => x.name),
      ["suno_get_existing_task"],
    );
    assert.equal(tools.tools[0]._meta.ui.resourceUri, RESOURCE_URI);
    assert.equal(tools.tools[0]._meta.securitySchemes[0].scopes[0], READ_SCOPE);
    const wire = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${await token()}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 20,
        method: "tools/list",
        params: {},
      }),
    });
    assert.equal(
      (await wire.json()).result.tools[0].securitySchemes[0].scopes[0],
      READ_SCOPE,
    );
    const resources = await client.listResources();
    assert.equal(resources.resources[0].mimeType, "text/html;profile=mcp-app");
    const widget = await client.readResource({ uri: RESOURCE_URI });
    assert.match(widget.contents[0].text, /Suno task viewer/);
    assert.deepEqual(widget.contents[0]._meta.ui.csp.connectDomains, []);
    const result = await client.callTool({
      name: "suno_get_existing_task",
      arguments: { task_id: "same-task" },
    });
    assert.equal(result.structuredContent.state, "complete");
    assert.equal(calls[0].p.subject, "alice");
    for (const args of [
      { task_id: "same-task", owner: "bob" },
      { task_id: "same-task", action: "delete" },
      { task_id: "" },
    ]) {
      const r = await client.callTool({
        name: "suno_get_existing_task",
        arguments: args,
      });
      assert.equal(r.isError, true);
    }
    assert.equal(calls.length, 1);
    const missing = await client.callTool({
      name: "suno_get_existing_task",
      arguments: { task_id: "unknown" },
    });
    assert.equal(missing.isError, true);
    const gen = await client.callTool({
      name: "generate_music",
      arguments: {},
    });
    assert.equal(gen.isError, true);
  } finally {
    await client.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

// The adapter must not convert upstream revocation into a retry or raw error leak.
test("revoked readback returns an MCP auth hint without leaking upstream data", async () => {
  const app = createHttpApp({
    verify,
    reader: {
      getOwned: async () => {
        const e = new (await import("../src/tasks.mjs")).TaskError(
          401,
          "revoked",
        );
        throw e;
      },
    },
    publicOrigin: "https://app.example.invalid",
    issuer,
    widgetHtml: readWidget(),
  });
  const http = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const client = new Client({ name: "revocation-local-test", version: "1" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${http.address().port}/mcp`),
        {
          requestInit: {
            headers: { authorization: `Bearer ${await token()}` },
          },
        },
      ),
    );
    const result = await client.callTool({
      name: "suno_get_existing_task",
      arguments: { task_id: "same-task" },
    });
    assert.equal(result.isError, true);
    assert.equal(result._meta.status, 401);
    assert.match(result._meta["mcp/www_authenticate"][0], /invalid_token/);
    assert.equal(result.structuredContent, undefined);
  } finally {
    await client.close();
    await new Promise((resolve) => http.close(resolve));
  }
});
