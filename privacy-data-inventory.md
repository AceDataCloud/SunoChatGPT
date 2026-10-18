# App privacy inventory — draft, not a replacement policy

2026-10-18. Existing policy: https://platform.acedata.cloud/documents/privacy. Operator: GERMEY TECHNOLOGY (HONG KONG) LIMITED. Privacy/deletion contact recorded by the source policy: office@acedata.cloud. No outbound message sent.

| Data | Implementation / pending proof |
|---|---|
| OAuth token | Verified server-side using issuer JWKS, not sent to model/widget; platform token issuance/revocation/consent remains pending |
| Subject, tenant, jti | Passed only to trusted internal owner-scoped adapter; adapter must enforce ownership and revocation; not put in tool arguments/results |
| Task ID | Supplied by user, appears in minimal structured result; only owned existing tasks allowed |
| State and title | Returned to ChatGPT/component after policy checks; titles treated as untrusted text, never HTML |
| Lyrics, signed media URLs, raw provider responses | Not returned by this release |
| Logs | Application does not log token/payload; infrastructure logs/retention and access controls must be reviewed before deployment |
| Chat history | App does not request full chat history; users' existing ChatGPT conversations have separate retention/delete semantics |
| Disconnect/delete | Stop later reads via revoked token; historical task/chat deletion requires separate platform support procedure, not implied by disconnect |

Before submission, confirm actual public policy version, data-sharing disclosure to ChatGPT, supported deletion path and exact retention periods. Do not claim zero retention or approved rights without operational evidence.
