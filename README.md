# Suno Tasks by Ace Data Cloud for ChatGPT

**Implementation preview. Not deployed or listed in the ChatGPT App Directory.** Independently provided by **Ace Data Cloud**, not the official Suno app. Candidate title and third-party naming require rights and policy review before submission.

Read [简体中文](docs/README_zh_Hans.md) · [Current pricing and access](https://platform.acedata.cloud/models?utm_source=github&utm_medium=referral&utm_campaign=evergreen&utm_content=sunochatgpt_readme_pricing) · [Privacy policy](https://platform.acedata.cloud/documents/privacy)

The goal is a searchable **Suno** application in ChatGPT, with one clear task: check an existing music task and see its status/titles without leaving the conversation. This source implements a real MCP Apps component and authenticated Streamable HTTP server; it does not replace ChatGPT's model provider. Generation, editing, payments and account administration are not included in this first release.

## 1. Official installation — release pending

There is **no published installation link yet**. Do not confuse a public GitHub repository, a local SDK test, or a manual connector URL with an approved App Directory listing. When published, search for **Suno Tasks by Ace Data Cloud**, check the provider is Ace Data Cloud, and use the listing's Connect action.

For approved development testing, an organization administrator can add the deployed test `/mcp` URL in ChatGPT developer mode, authorize the Ace account, and select the app from the conversation's **More** menu. Terminology varies by ChatGPT version. Do not create an App or accept terms merely to test this repository; the issuer, readback service and account permissions must be ready first.

![Official ChatGPT developer-mode More menu; reference only, not an installed Ace app](https://github.com/user-attachments/assets/26852b36-7f9e-4f48-a515-aebd87173399)

Source: [OpenAI's official Apps SDK example](https://github.com/openai/openai-apps-sdk-examples/blob/18cc38e78a968712c357bacdc3c79fead5bfc6b4/README.md#testing-in-chatgpt), retrieved 2026-10-17. Capture date/version unlabelled. This is the official original screenshot, not an Ace execution or listing.

## 2. Register/sign in and prepare an Ace API token

1. Open [Ace Data Cloud → Applications](https://platform.acedata.cloud/console/applications?utm_source=github&utm_medium=referral&utm_campaign=evergreen&utm_content=sunochatgpt_readme_api_key); register or sign in. If General application does not exist, select **Initialize General Application**.
2. In **General application**, copy an existing API key, or use **Manage Keys → Create** to name a dedicated integration key. Confirm your own Suno permissions, expiration, allowed APIs and current balance/pricing. Trial availability is what your account shows; no fixed allowance is promised.
3. Copy only the token value. Never paste it in a prompt, ChatGPT conversation, shared screenshot, source commit or widget. An account-management `platform-...` token is not a generation API key.

![Ace Applications: copy an existing API key or open Manage Keys; redacted official Ace screenshot](https://raw.githubusercontent.com/AceDataCloud/SunoDify/8d3d03570e73324220f111f7fe343da0792a8071/_assets/tutorial/get-api-key-en.png)

![Ace Manage Keys: create a dedicated key; redacted official Ace screenshot](https://raw.githubusercontent.com/AceDataCloud/SunoDify/8d3d03570e73324220f111f7fe343da0792a8071/_assets/tutorial/create-api-key-en.png)

Image source: AceDataCloud/SunoDify pinned commit `8d3d03570e73324220f111f7fe343da0792a8071`, reused 2026-10-18; original capture date unlabelled. Images show Ace credential controls, not ChatGPT authorization. The example name “Dify tutorial” in the reused image is an old label; use a distinct name for this integration.

## 3. Where to authorize in ChatGPT

This App uses browser OAuth sign-in, **not an API-key field in ChatGPT**. After an approved listing/developer connection, choose **Connect** and review the Ace consent page. Only existing music-task read access should be requested. Do not paste a broad key into ChatGPT: this repository deliberately does not add a made-up key dialog.

The token instructions above explain the existing Ace account/API controls. The App-specific short-lived `music.tasks:read` token and owner-scoped internal readback adapter are **not yet provided by the platform**. A general API key is not a replacement for either. Operators configure a service credential only in the server secret store; it is never returned to the model or component. See [production dependencies](production-readiness.md).

## 4. First use: query the same existing task

After the actual service and authorization are ready, ask: **“Check this existing Suno task: &lt;my task ID&gt;.”**

The tool `suno_get_existing_task` queries only that ID under the verified account/tenant. The component shows **pending**, **processing**, **complete**, **failed** or **unknown**, and completed track titles. Use **Refresh this task** to query the same ID again; it does not submit a new generation or poll in the background. Unknown, deleted or other users' tasks all return “Task not found”.

This version deliberately returns no audio URL or playable media. A preview, a green tool call, or an HTTP 200 is not proof of a successful generation or unique billing. Before a public release, verify one approved existing successful task, its result, its original unique bill, and that readback adds no charge. No fresh generation is needed for that acceptance. Expanding to generation requires explicit budget, present pricing, media-policy and rights review.

## 5. Local development and free checks

Node.js 22+; no OpenAI API key or Ace customer token is needed for tests. The tests create synthetic RSA-signed identities and a private loopback HTTP server, perform real MCP SDK initialization/list/call/resource operations, then close it. They do not run a browser, publish a tunnel, create accounts or access paid APIs.

```bash
npm ci --ignore-scripts
npm run build
npm run check
npm test
npm audit --audit-level=high
```

The widget uses the real `@modelcontextprotocol/ext-apps` bridge, receives tool results, and calls the server with the same ID on refresh. The server uses `registerAppTool`, `registerAppResource`, the MCP App MIME type and exact CSP domains. Building this UI is product implementation; it is not a product screenshot or ChatGPT acceptance proof.

`npm start` fails closed unless all variables in `.env.example` are configured. Never use the example `.invalid` hosts as real endpoints. No real deployment is bundled or authorized. The backend adapter URL is an internal contract to implement, not a currently available Ace API.

## FAQ

- **Can I select Ace as ChatGPT's underlying model provider?** No public third-party model-picker contribution mechanism was identified. This application supplies a tool and result component; OpenAI-compatible API access does not change ChatGPT's underlying model.
- **401 / reconnect?** Token missing, expired, wrong issuer/audience, bad signature or revoked at the readback boundary. Complete the approved OAuth flow; do not replace it with a general key.
- **403?** Missing task-read permission or untrusted Origin. Generation scope and `mcp:access` alone are rejected. Do not expand permissions to work around it.
- **404?** Unknown/deleted/unowned task. Verify the task belongs to the connected account; do not try other people's task IDs.
- **429 / server error?** Read the error and retry only the same task when appropriate; this app never generates a fallback task.
- **Can I install Seedance/HappyHorse/GPT Image/Nano Banana here?** They are independent directory candidates, not hidden capabilities of this Suno entry. Their MCP packages do not prove ChatGPT listings.

## Submission and source ownership

[Listing draft](submission/listing.json), [review checklist](submission/README.md) and [privacy data inventory](privacy-data-inventory.md) are internal preparation artifacts, **not an official manifest, submitted agreement or approved policy**. No listing URL, review ID, runtime screenshot or usage/revenue claim exists yet.

This repository owns the ChatGPT-specific server/component, not Ace generation services. It reuses the existing [MCPs Suno source](https://github.com/AceDataCloud/MCPs/tree/main/suno) and existing task semantics; it does not copy provider generation logic. A single dedicated repository is useful for the Suno directory release and avoids one generic app trying to rank for unrelated services. Further independent apps require distinct functionality and platform/brand permission; no bulk duplicate submission is planned.
