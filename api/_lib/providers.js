const origin = (envKey, req) => process.env[envKey] || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

export const providers = {
  google: {
    label: "Google Meet",
    clientId: () => process.env.LIVESIM_GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.LIVESIM_GOOGLE_CLIENT_SECRET,
    redirect: req => process.env.LIVESIM_GOOGLE_REDIRECT_URI || `${origin("LIVESIM_PUBLIC_ORIGIN", req)}/api/oauth/callback?provider=google`,
    scopes: () => process.env.LIVESIM_GOOGLE_SCOPES || "openid email profile https://www.googleapis.com/auth/meetings.space.created",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    profile: "https://openidconnect.googleapis.com/v1/userinfo"
  },
  zoom: {
    label: "Zoom",
    clientId: () => process.env.LIVESIM_ZOOM_CLIENT_ID,
    clientSecret: () => process.env.LIVESIM_ZOOM_CLIENT_SECRET,
    redirect: req => process.env.LIVESIM_ZOOM_REDIRECT_URI || `${origin("LIVESIM_PUBLIC_ORIGIN", req)}/api/oauth/callback?provider=zoom`,
    scopes: () => process.env.LIVESIM_ZOOM_SCOPES || "user:read user:read:token",
    authorize: "https://zoom.us/oauth/authorize",
    token: "https://zoom.us/oauth/token",
    profile: "https://api.zoom.us/v2/users/me"
  },
  tiktok: {
    label: "TikTok LIVE",
    clientId: () => process.env.LIVESIM_TIKTOK_CLIENT_KEY,
    clientSecret: () => process.env.LIVESIM_TIKTOK_CLIENT_SECRET,
    redirect: req => process.env.LIVESIM_TIKTOK_REDIRECT_URI || `${origin("LIVESIM_PUBLIC_ORIGIN", req)}/api/oauth/callback?provider=tiktok`,
    scopes: () => process.env.LIVESIM_TIKTOK_SCOPES || "user.info.basic",
    authorize: "https://www.tiktok.com/v2/auth/authorize/",
    token: "https://open.tiktokapis.com/v2/oauth/token/",
    profile: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url"
  }
};

export function getProvider(id) {
  return providers[id] || null;
}
