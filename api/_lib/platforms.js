import crypto from "node:crypto";

const json = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || data.reason || `Platform request failed (${response.status})`);
  return data;
};

export async function refreshConnection(connection) {
  if (!connection?.refreshToken) return connection;
  const provider = connection.provider;
  if (!['google','zoom'].includes(provider)) return connection;
  const tokenUrl = provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://zoom.us/oauth/token';
  const clientId = provider === 'google' ? process.env.LIVESIM_GOOGLE_CLIENT_ID : process.env.LIVESIM_ZOOM_CLIENT_ID;
  const clientSecret = provider === 'google' ? process.env.LIVESIM_GOOGLE_CLIENT_SECRET : process.env.LIVESIM_ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) return connection;
  const body = new URLSearchParams({grant_type:'refresh_token',refresh_token:connection.refreshToken});
  const response = await fetch(tokenUrl,{method:'POST',headers:{
    Authorization:'Basic '+Buffer.from(clientId+':'+clientSecret).toString('base64'),
    'Content-Type':'application/x-www-form-urlencoded'
  },body});
  const data = await json(response);
  return {...connection,accessToken:data.access_token,refreshToken:data.refresh_token||connection.refreshToken,
    scope:data.scope||connection.scope,expiresAt:Date.now()+Number(data.expires_in||3600)*1000};
}

export async function googleStart(connection) {
  const response = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
  const space = await json(response);
  return {
    provider: "google",
    status: "created",
    spaceName: space.name,
    meetingUri: space.meetingUri,
    mediaInjection: "not_supported_by_google_meet_media_api",
    message: "Google Meet space created. LiveSim cannot inject a custom outgoing video track through the current public Meet Media API; use the processed stream as a browser/virtual-camera source."
  };
}

export async function zoomStart(connection, { topic = "LiveSim Lab Session", type = 1 } = {}) {
  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      topic,
      type,
      settings: { host_video: true, participant_video: true, waiting_room: false }
    })
  });
  const meeting = await json(response);
  return {
    provider: "zoom",
    status: "created",
    meetingId: meeting.id,
    password: meeting.password || "",
    startUrl: meeting.start_url,
    joinUrl: meeting.join_url,
    mediaInjection: "sdk_or_virtual_camera",
    message: "Zoom meeting created. Browser Meeting SDK can join the meeting; custom raw Production Studio media requires supported native host tooling."
  };
}

export function zoomSignature({ sdkKey, sdkSecret, meetingNumber, role = 1 }) {
  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const tokenExp = exp;
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    appKey: sdkKey,
    mn: String(meetingNumber),
    role,
    iat,
    exp,
    tokenExp
  })).toString("base64url");
  const body = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", sdkSecret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export async function zoomJoinSignature(connection, meetingNumber, role = 0) {
  const sdkKey = process.env.LIVESIM_ZOOM_SDK_KEY || process.env.LIVESIM_ZOOM_CLIENT_ID;
  const sdkSecret = process.env.LIVESIM_ZOOM_SDK_SECRET || process.env.LIVESIM_ZOOM_CLIENT_SECRET;
  if (!sdkKey || !sdkSecret) throw new Error("Zoom Meeting SDK credentials are not configured.");
  return {
    provider: "zoom",
    meetingNumber: String(meetingNumber),
    role,
    sdkKey,
    signature: zoomSignature({ sdkKey, sdkSecret, meetingNumber, role }),
    mediaInjection: "sdk_or_virtual_camera"
  };
}

export async function tiktokCreatorInfo(connection) {
  const response = await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8"
    }
  });
  const data = await json(response);
  return {
    provider: "tiktok",
    status: "authorized",
    creator: data.data || null,
    mediaInjection: "direct_post",
    message: "TikTok authorization is verified for Content Posting. The public Content Posting API publishes recorded media; it is not a general-purpose LIVE ingest endpoint."
  };
}
