import crypto from "node:crypto";
import { parseCookies, seal, unseal, setCookie } from "../_lib/security.js";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST required." });

  const connection = unseal(parseCookies(req).livesim_connection);
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

  const session = {
    id: "ls_" + crypto.randomBytes(12).toString("hex"),
    status: "ready",
    mode: "simulation",
    mediaName,
    voiceProfileId,
    destination: connection.provider,
    accountId: connection.accountId,
    startedAt: Date.now()
  };

  res.setHeader("Set-Cookie", setCookie("livesim_session", seal(session, 60 * 60 * 8), 60 * 60 * 8));
  res.status(201).json({
    id: session.id,
    status: session.status,
    mode: session.mode,
    mediaName: session.mediaName,
    voiceProfileId: session.voiceProfileId,
    destination: session.destination,
    startedAt: session.startedAt
  });
}
