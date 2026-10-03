import superjson from "superjson";

export type PlatformId = "whatsapp" | "googlemeet" | "zoom" | "telegram" | "tiktok" | "custom";

export type OutputType = {
  provider: PlatformId;
  authorizationUrl?: string;
  configured: boolean;
  message?: string;
};

export const getPlatformConnect = async (provider: PlatformId, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch("/_api/platform-connect?provider=" + encodeURIComponent(provider), { method: "GET", ...init });
  const body = superjson.parse<OutputType & { error?: string }>(await result.text());
  if (!result.ok) throw new Error(body.error || body.message || "Platform connection is unavailable.");
  return body;
};
