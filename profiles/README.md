# Independent service App candidates from one source

These are independently runnable single-service configurations, not a public five-tool collection. `APP_PROFILE` selects exactly one; there is no "all" profile. Each has distinct tool, OAuth scope, UI resource, service binding, bilingual guide and internal listing/runtime draft. Reuse this source instead of copying it into five empty repositories. The repository retains the historical SunoChatGPT name; directory naming and future repo split are release decisions, not technical blockers.

| Profile | Brand | Result component |
|---|---|---|
| [suno](suno/README.md) | Suno | music title/duration |
| [seedance](seedance/README.md) | Seedance | video duration/dimensions |
| [happyhorse](happyhorse/README.md) | HappyHorse | video duration/dimensions, per-item failure |
| [gpt-image](gpt-image/README.md) | GPT Image | image dimensions; original gpt-image family + finished_at |
| [nano-banana](nano-banana/README.md) | Nano Banana | image dimensions; original nano-banana family |

No process exposes another profile's tool or accepts service/model overrides. Every scope is still proposed; none is permission to create scopes in production. Every trusted readback must validate original service/model, owner/tenant and revocation before returning the envelope. Asset URLs, previews and prompts are not returned.

## Multi-App policy check, 2026-10-18

The canonical https://developers.openai.com/apps-sdk/app-submission-guidelines/ and .md requests returned HTTP 403. The official OpenAI GitHub maintained readiness checklist was readable, but no exact rule allowing/prohibiting similar or service-brand independent App listings was established. An org:openai code search for "duplicate apps" produced zero results; absence of search results is not a policy conclusion. We therefore implement independent runtime candidates without creating OpenAI App records, identities, submissions or accepting terms. Full brand/rights/similar-App/media policy is an explicit release gate; there is no invented blanket prohibition used to avoid implementation.

Technical sources: OpenAI openai-apps-sdk-examples@18cc38e78a968712c357bacdc3c79fead5bfc6b4 (mcp_app_basics_node and authenticated_server_python). Service readback source facts pinned in service-contract-sources.json. We do not modify shared MCPs/PlatformBackend/Gateway auth.
