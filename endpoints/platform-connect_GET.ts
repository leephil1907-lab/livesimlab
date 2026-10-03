import superjson from "superjson";
import { randomBytes, createHmac } from "node:crypto";
import type { PlatformId, OutputType } from "./platform-connect_GET.schema";

const providers: PlatformId[] = ["whatsapp", "googlemeet", "zoom", "telegram", "tiktok", "custom"];

function envFor(provider: string, key: string) {
  return process.env["LIVESIM_" + provider.toUpperCase() + "_" + key];
}

export async function handle(request: Request) {
  const provider = new URL(request.url).searchParams.get("provider") as PlatformId | null;
  if (!provider || !providers.includes(provider)) {
    return new Response(superjson.stringify({ error: "Unsupported platform." }), { status: 400 });
  }
  if (provider === "custom") {
    return new Response(superjson.stringify({ provider, configured: false, message: "Custom destinations are configured inside the session and do not use OAuth." } satisfies OutputType));
  }

  const clientId = envFor(provider, "CLIENT_ID");
  const authUrl = envFor(provider, "AUTH_URL");
  const redirectUri = envFor(provider, "REDIRECT_URI");
  const scopes = envFor(provider, "SCOPES") || "";

  if (!clientId || !authUrl || !redirectUri) {
    return new Response(superjson.stringify({
      provider,
      configured: false,
      message: "OAuth is not configured for this provider yet. Add its server-side client ID, authorization URL and redirect URI."
    } satisfies OutputType));
  }

  const nonce = randomBytes(24).toString("hex");
  const secret = process.env.LIVESIM_OAUTH_STATE_SECRET;
  if (!secret) {
    return new Response(superjson.stringify({ error: "LIVESIM_OAUTH_STATE_SECRET is missing on the server." }), { status: 503 });
  }
  const state = nonce + "." + createHmac("sha256", secret).update(provider + ":" + nonce).digest("hex");
  const url = new URL(authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  if (scopes) url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);

  return new Response(superjson.stringify({ provider, configured: true, authorizationUrl: url.toString() } satisfies OutputType));
}
