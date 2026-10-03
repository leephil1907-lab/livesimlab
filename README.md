# LiveSim Lab

A transparent video-call and livestream simulation lab for education and security research.

## Scope

- User-supplied video media for controlled call and livestream research
- Clearly labeled synthetic, pre-recorded, or user-supplied media
- Authorized voice workflows
- Playback and audit markers
- User-provided synthetic Bitcoin transaction analysis
- Event/timeline logging
- Responsive dark broadcast-console interface

## Safety boundary

LiveSim Lab is a simulation/research environment. It does not capture real credentials, wallets, camera video, or real transaction signatures, and it does not present simulated media as genuinely live.

Voice cloning is restricted to voices the user owns or is authorized to use. Provider credentials remain server-side and must never be committed to the repository.

## Platform connection model

The connection center now has a real server-side OAuth path for:

- **Google Meet / Google account:** OAuth 2.0 authorization with server-side code exchange.
- **Zoom:** user-managed OAuth 2.0 authorization with server-side code exchange.
- **TikTok:** TikTok Login Kit OAuth 2.0 authorization with server-side code exchange.

The callback validates an anti-CSRF state value, exchanges the authorization code server-side, retrieves the authorized account profile, and exposes only non-secret account metadata to the React client.

WhatsApp and Telegram are intentionally **not** treated as generic OAuth providers. Their official web authorization/product models differ, so LiveSim Lab does not fake a connection flow for them. Dedicated adapters should be added only against the exact approved product/API capability.

## Token storage

For this repository-stage implementation, the connection record is sealed with AES-256-GCM and placed in an HTTP-only, Secure, SameSite cookie. The React application never receives the raw access or refresh token.

For a multi-user production launch, replace this cookie-based token store with an authenticated server-side database/KMS-backed token store and implement token refresh/revocation there. Do not use the current cookie store as the final multi-tenant credential architecture.

## Session engine

The session gate is now an authenticated orchestration boundary rather than a local toggle. A session can start only when:

1. user-supplied media is loaded;
2. an authorized voice profile is selected;
3. a supported destination account is actually connected; and
4. the selected destination matches the authenticated provider.

The server creates a short-lived simulation session record, keeps the provider credential server-side, and returns only session metadata to the browser. Session state can be restored after a refresh and explicitly stopped. This does not claim to create or place a real call, livestream, transaction, or identity session on the external platform; provider-specific execution adapters remain a separate capability layer.

## Environment

Copy `.env.example` into the deployment environment. Configure the exact callback URL in each provider's developer console.

Required:

- `LIVESIM_SESSION_SECRET` — random secret, at least 32 characters.
- Provider client credentials for Google, Zoom, and/or TikTok.

Never commit `.env`, client secrets, access tokens, refresh tokens, or provider credentials.

## Local build

```bash
npm install
npm run build
```

## Current UI

The frontend is a standalone Vite + React application. It does **not** depend on Floot.

## Research boundary

- Synthetic media stays visibly labeled.
- User-supplied inputs remain explicit.
- Authorized voices only.
- OAuth tokens are never exposed to client JavaScript.
- No real wallet signing or transaction execution.
