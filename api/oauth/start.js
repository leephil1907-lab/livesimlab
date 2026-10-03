import crypto from "node:crypto";
import { getProvider } from "../_lib/providers.js";
import { seal, setCookie } from "../_lib/security.js";

export default function handler(req, res) {
  const providerId = new URL(req.url, `http://${req.headers.host}`).searchParams.get("provider");
  const provider = getProvider(providerId);
  if (!provider) return res.status(400).json({ error: "Unsupported provider." });

  const clientId = provider.clientId();
  if (!clientId) return res.status(503).json({ error: `${provider.label} OAuth is not configured yet.` });

  const state = crypto.randomBytes(32).toString("base64url");
  const redirectUri = provider.redirect(req);
  const url = new URL(provider.authorize);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", provider.scopes());

  if (providerId === "google") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("prompt", "consent");
  }

  res.setHeader("Set-Cookie", setCookie("livesim_oauth_state", seal({ provider: providerId, state }, 600), 600));
  res.redirect(302, url.toString());
}
