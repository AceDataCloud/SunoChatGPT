import { createVerifier } from "./auth.mjs";
import { HttpOwnedTaskReader } from "./tasks.mjs";
import { createHttpApp, readWidget } from "./server.mjs";
const required = [
  "PUBLIC_ORIGIN",
  "OAUTH_ISSUER",
  "OAUTH_JWKS_URL",
  "OAUTH_AUDIENCE",
  "OWNED_TASK_READBACK_URL",
  "OWNED_TASK_READBACK_TOKEN",
];
for (const name of required)
  if (!process.env[name])
    throw new Error(`${name} required; no production auth fallback exists`);
if (
  process.env.OAUTH_AUDIENCE !==
  `${new URL(process.env.PUBLIC_ORIGIN).origin}/mcp`
)
  throw new Error("OAuth audience must equal this app MCP resource");
const verify = createVerifier({
  issuer: process.env.OAUTH_ISSUER,
  audience: process.env.OAUTH_AUDIENCE,
  jwksUrl: process.env.OAUTH_JWKS_URL,
});
const reader = new HttpOwnedTaskReader({
  url: process.env.OWNED_TASK_READBACK_URL,
  token: process.env.OWNED_TASK_READBACK_TOKEN,
});
createHttpApp({
  verify,
  reader,
  publicOrigin: process.env.PUBLIC_ORIGIN,
  issuer: process.env.OAUTH_ISSUER,
  widgetHtml: readWidget(),
}).listen(Number(process.env.PORT ?? 8000), "127.0.0.1");
