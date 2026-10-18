# Nano Banana Tasks by Ace Data Cloud for ChatGPT

**Independent implementation candidate, not listed or deployed.** Independent Ace Data Cloud integration, not an official Nano Banana app. This profile is a distinct runnable App configuration from one shared source, not an all-service tool collection. A process exposes **only** `nano_banana_get_existing_task` and `ui://nano-banana-task-viewer/v1.html`. Brand rights, similar-App and media/commercial eligibility remain unknown pending full official policy/rights review; no five-App upload occurred.

[简体中文](README_zh_Hans.md) · [Runtime contract](runtime.json) · [Listing draft](listing.json) · [Source service contract](https://github.com/AceDataCloud/MCPs/tree/4a2abb23a6f19ea8460c4883dabb5ad378a428b7/nanobanana)

## 1. Official installation status

There is no published listing URL. Future approved search phrase: **Nano Banana** / **Nano Banana Tasks by Ace Data Cloud**, with Ace Data Cloud as provider. Manual developer-mode connection and local tests are not App Directory installation. Once a permitted endpoint and account exist, use ChatGPT Connect → Ace OAuth and select the App for the conversation. Current official screenshot reference:

![Official ChatGPT More menu reference; no Ace installed App](https://github.com/user-attachments/assets/26852b36-7f9e-4f48-a515-aebd87173399)

[OpenAI official source](https://github.com/openai/openai-apps-sdk-examples/blob/18cc38e78a968712c357bacdc3c79fead5bfc6b4/README.md#testing-in-chatgpt), obtained 2026-10-17; original capture date/version unknown. This is not a Nano Banana runtime screenshot.

## 2. Ace registration and token controls

Open [Applications](https://platform.acedata.cloud/console/applications?utm_source=github&utm_medium=referral&utm_campaign=evergreen&utm_content=nanobananachatgpt_readme_api_key), register/sign in and initialize **General application** if absent. Copy an existing key or **Manage Keys → Create** to name a dedicated integration token. Review allowed service/APIs, expiry, usage limit, balance and [current prices](https://platform.acedata.cloud/models?utm_source=github&utm_medium=referral&utm_campaign=evergreen&utm_content=nanobananachatgpt_readme_pricing). No fixed free quota is promised. Never place keys in chat, tool arguments, screenshots or Git.

![Real redacted Ace Applications key controls](https://raw.githubusercontent.com/AceDataCloud/SunoDify/8d3d03570e73324220f111f7fe343da0792a8071/_assets/tutorial/get-api-key-en.png)

![Real redacted Ace dedicated key creation](https://raw.githubusercontent.com/AceDataCloud/SunoDify/8d3d03570e73324220f111f7fe343da0792a8071/_assets/tutorial/create-api-key-en.png)

Pinned AceDataCloud/SunoDify source `8d3d03570e73324220f111f7fe343da0792a8071`, reused 2026-10-18; original date/version unknown. “Dify tutorial” is an old example label. These show Ace controls, not ChatGPT authorization.

## 3. Actual authorization path

There is **no ChatGPT API-key input added by this project**. The application requests `nano-banana.tasks:read` through an approved browser OAuth flow. The scope issuer/consent/PKCE/revocation and trusted owner-scoped readback service are still platform dependencies. A broad API token cannot replace them. Each deployment needs its own exact resource audience, origin and service binding; the internal readback credential stays in server secret storage. See [production gates](../../production-readiness.md).

## 4. Query an existing task and inspect the result

After production dependencies and approved testing are ready, ask **“Check my existing Nano Banana task &lt;task ID&gt;.”** Only `task_id` is accepted; no service/model/owner/action override is allowed. A task from another service is rejected even if owned by the same user. The identity and original service/model classification come from the trusted server-side record, never model input.

The result component shows status and `image` result cards with width/height. Refresh queries that same ID only. An in-progress state is not complete even when a success flag or preview URL is present. The component does not fetch or play result URLs. Do not resubmit an entire generation when a task is pending. Unknown, deleted, cross-user/tenant/service/model tasks return the same not-found response.

## 5. Free developer checks

```bash
npm ci --ignore-scripts
npm run build
npm run check
npm test
# Operator configuration only, not a release instruction:
APP_PROFILE=nano-banana npm start
```

`npm start` fails closed until required operator secrets/issuer/readback settings are configured. `runtime.json` uses `.invalid` placeholders, not deployed URLs. `dist/nano-banana/widget.html` is a real MCP Apps bridge component; standalone HTML or screenshots are not ChatGPT acceptance evidence.

## Troubleshooting and release boundary

401: reconnect through approved OAuth; 403: missing this profile's scope or untrusted Origin; 404: unavailable/unowned/wrong-product task; 429: wait and query the same ID, no new task or fallback generation. A valid status response does not prove media access, original billing, ordinary installation or revenue. Existing-task/media/unique-bill checks and reviewer screenshots remain pending. No paid generation/API request, agreement or production deployment is performed by this profile.
