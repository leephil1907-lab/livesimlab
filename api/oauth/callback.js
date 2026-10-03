import { getProvider } from "../_lib/providers.js";
import { parseCookies, seal, setCookie, unseal } from "../_lib/security.js";

const form = body => new URLSearchParams(Object.entries(body).filter(([,v]) => v !== undefined && v !== null));

async function exchange(providerId, provider, code, redirectUri) {
  const body = { code, redirect_uri: redirectUri, grant_type: "authorization_code" };
  let headers = { "Content-Type": "application/x-www-form-urlencoded" };

  if (providerId === "tiktok") {
    body.client_key = provider.clientId();
    body.client_secret = provider.clientSecret();
  } else {
    headers.Authorization = "Basic " + Buffer.from(`${provider.clientId()}:${provider.clientSecret()}`).toString("base64");
  }

  const response = await fetch(provider.token, { method: "POST", headers, body: form(body) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error_description || data.error || "Token exchange failed.");
  return data;
}

async function profile(providerId, provider, accessToken) {
  const response = await fetch(provider.profile, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || "Profile lookup failed.");

  if (providerId === "google") return {
    accountId: data.sub,
    displayName: data.name || data.email || "Google account",
    avatarUrl: data.picture || null
  };
  if (providerId === "zoom") return {
    accountId: data.id || data.account_id,
    displayName: data.display_name || data.email || "Zoom account",
    avatarUrl: data.pic_url || null
  };
  return {
    accountId: data.data?.user?.open_id || data.open_id,
    displayName: data.data?.user?.display_name || "TikTok account",
    avatarUrl: data.data?.user?.avatar_url || null
  };
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const providerId = url.searchParams.get("provider");
  const provider = getProvider(providerId);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const stored = unseal(parseCookies(req).livesim_oauth_state);

  if (!provider || !code || !returnedState || !stored || stored.provider !== providerId || stored.state !== returnedState) {
    return res.status(400).send("OAuth validation failed. Please start the connection again.");
  }

  try {
    const clientSecret = provider.clientSecret();
    if (!clientSecret) throw new Error(`${provider.label} OAuth is not configured yet.`);

    const redirectUri = provider.redirect(req);
    const tokens = await exchange(providerId, provider, code, redirectUri);
    const account = await profile(providerId, provider, tokens.access_token);

    const connection = {
      provider: providerId,
      label: provider.label,
      accountId: account.accountId,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      scope: tokens.scope || provider.scopes(),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000
    };

    res.setHeader("Set-Cookie", [
      setCookie("livesim_connection", seal(connection, 60 * 60 * 24 * 30), 60 * 60 * 24 * 30),
      "livesim_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
    ]);
    res.redirect(302, "/?connected=" + encodeURIComponent(providerId));
  } catch (error) {
    res.status(502).send(`OAuth connection failed: ${error.message}`);
  }
}
