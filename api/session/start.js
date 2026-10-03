import crypto from "node:crypto";
import { parseCookies, seal, unseal, setCookie } from "../_lib/security.js";
import { googleStart, zoomStart, tiktokCreatorInfo, refreshConnection } from "../_lib/platforms.js";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST required." });

  let connection = unseal(parseCookies(req).livesim_connection);
  if (!connection) return res.status(401).json({ error: "No authorized destination connection." });

  let body = {};
  try { body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}"); }
  catch { return res.status(400).json({ error: "Invalid JSON body." }); }

  const { mediaName, voiceProfileId, destination } = body;
  if (!mediaName) return res.status(400).json({ error: "Media is required." });
  if (!voiceProfileId) return res.status(400).json({ error: "An authorized voice profile is required." });
  if (!destination || destination !== connection.provider) {
    return res.status(409).json({ error: "Destination does not match the authorized account." });
  }

  if (connection.expiresAt && connection.expiresAt < Date.now() + 60_000 && connection.refreshToken) {\n    try { connection = await refreshConnection(connection); res.setHeader("Set-Cookie", setCookie("livesim_connection", seal(connection, 60 * 60 * 24 * 30), 60 * 60 * 24 * 30)); }\n    catch (error) { return res.status(401).json({ error: "The destination authorization expired and could not be refreshed. Reconnect the account." }); }\n  }\n\n  let platform = null;
  try {
    if (destination === "google") platform = await googleStart(connection);
    else if (destination === "zoom") platform = await zoomStart(connection, { topic: mediaName });
    else if (destination === "tiktok") platform = await tiktokCreatorInfo(connection);
    else if (destination === "whatsapp" || destination === "telegram") platform = { provider: destination, status: "external", mediaInjection: "external_client", message: "Open the platform client and select LiveSim processed media where supported." };
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }

  const session = {
    id: "ls_" + crypto.randomBytes(12).toString("hex"),
    status: "ready",
    mode: "external-platform",
    mediaName,
    voiceProfileId,
    destination: connection.provider,
    accountId: connection.accountId,
    startedAt: Date.now(),
    platform
  };

  res.setHeader("Set-Cookie", setCookie("livesim_session", seal(session, 60 * 60 * 8), 60 * 60 * 8));
  res.status(201).json({
    id: session.id,
    status: session.status,
    mode: session.mode,
    mediaName: session.mediaName,
    voiceProfileId: session.voiceProfileId,
    destination: session.destination,
    startedAt: session.startedAt,
    platform
  });
}
