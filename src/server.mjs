import fs from "node:fs";
import express from "express";
import { AsyncLocalStorage } from "node:async_hooks";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { httpsUrl } from "./auth.mjs";
import { getProfile } from "./profiles.mjs";
import { getOwnedTask, TaskError } from "./tasks.mjs";
export const RESOURCE_URI = getProfile().resourceUri;
const identity = new AsyncLocalStorage();

export function createMcpServer({
  reader,
  widgetHtml,
  resourceOrigin,
  profile = getProfile(),
}) {
  const securitySchemes = [{ type: "oauth2", scopes: [profile.scope] }];
  const server = new McpServer({
    name: `${profile.id}-by-ace-data-cloud`,
    version: profile.version,
  });
  registerAppTool(
    server,
    profile.tool,
    {
      title: profile.title,
      description: `Check an existing ${profile.brand} ${profile.kind} task belonging to the connected Ace Data Cloud account. ${profile.attribution} Does not generate media or modify tasks.`,
      inputSchema: z.object({ task_id: z.string().min(1).max(128) }).strict(),
      outputSchema: {
        task_id: z.string(),
        service: z.string(),
        brand: z.string(),
        tool_name: z.string(),
        assets: z.array(
          z.object({
            kind: z.enum(["music", "video", "image"]),
            title: z.string(),
            duration_seconds: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
          }),
        ),
        state: z.enum([
          "pending",
          "processing",
          "complete",
          "failed",
          "unknown",
        ]),
        terminal: z.boolean(),
        tracks: z.array(z.object({ title: z.string() })),
        media_available: z.boolean(),
        billing_verified: z.boolean(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      securitySchemes,
      _meta: {
        securitySchemes,
        ui: { resourceUri: profile.resourceUri },
        "openai/outputTemplate": profile.resourceUri,
      },
    },
    async ({ task_id }) => {
      try {
        const structuredContent = await getOwnedTask(
          reader,
          identity.getStore(),
          task_id,
          profile,
        );
        return {
          content: [
            {
              type: "text",
              text: `${profile.brand} task: ${structuredContent.state}. Media playback has not been validated.`,
            },
          ],
          structuredContent,
        };
      } catch (error) {
        const status = error instanceof TaskError ? error.status : 500;
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                status === 404
                  ? "Task not found."
                  : status === 429
                    ? "Rate limited. Try this same task later."
                    : status === 403
                      ? "Permission denied."
                      : status === 401
                        ? "Reconnect your account."
                        : "Task could not be read.",
            },
          ],
          _meta: {
            status,
            ...(status === 401
              ? {
                  "mcp/www_authenticate": [
                    `Bearer resource_metadata="${resourceOrigin}/.well-known/oauth-protected-resource/mcp", error="invalid_token", scope="${profile.scope}"`,
                  ],
                }
              : {}),
          },
        };
      }
    },
  );
  // The high-level SDK currently retains securitySchemes only under _meta.
  // Mirror the public descriptor field as required by the official auth example.
  const listTools = server.server._requestHandlers.get("tools/list");
  server.server.setRequestHandler(
    ListToolsRequestSchema,
    async (request, extra) => {
      const result = await listTools(request, extra);
      return {
        ...result,
        tools: result.tools.map((tool) => ({ ...tool, securitySchemes })),
      };
    },
  );
  registerAppResource(
    server,
    `${profile.brand} task result`,
    profile.resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: profile.resourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: {
              csp: { connectDomains: [], resourceDomains: [] },
              domain: resourceOrigin,
            },
            "openai/widgetDescription": `Shows only status and safe result metadata of the connected account’s existing ${profile.brand} task; does not generate media.`,
          },
        },
      ],
    }),
  );
  return server;
}
export function createHttpApp({
  verify,
  reader,
  publicOrigin,
  issuer,
  widgetHtml,
  profile = getProfile(),
}) {
  const origin = httpsUrl(publicOrigin, "public origin").origin;
  httpsUrl(issuer, "issuer");
  const resource = `${origin}/mcp`;
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource/mcp`;
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (_req, res) =>
    res.json({
      status: "ok",
      app: `${profile.id}-by-ace-data-cloud`,
      version: profile.version,
    }),
  );
  app.get("/.well-known/oauth-protected-resource/mcp", (_req, res) =>
    res.json({
      resource,
      authorization_servers: [issuer],
      scopes_supported: [profile.scope],
      bearer_methods_supported: ["header"],
    }),
  );
  app.all("/mcp", async (req, res) => {
    if (req.headers.origin && req.headers.origin !== origin)
      return res.status(403).json({ error: "origin_not_allowed" });
    let principal;
    try {
      principal = await verify(req.headers.authorization);
    } catch (error) {
      const status = error.status === 403 ? 403 : 401;
      res.set(
        "WWW-Authenticate",
        `Bearer resource_metadata="${metadataUrl}", error="${status === 403 ? "insufficient_scope" : "invalid_token"}", scope="${profile.scope}"`,
      );
      return res.status(status).json({
        error:
          status === 403 ? "insufficient_scope" : "authentication_required",
      });
    }
    const server = createMcpServer({
      reader,
      widgetHtml,
      resourceOrigin: origin,
      profile,
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await identity.run(principal, async () => {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      });
    } catch {
      if (!res.headersSent) res.status(500).json({ error: "internal_error" });
    }
  });
  return app;
}
export function readWidget(profile = getProfile()) {
  return fs.readFileSync(
    new URL(`../dist/${profile.id}/widget.html`, import.meta.url),
    "utf8",
  );
}
