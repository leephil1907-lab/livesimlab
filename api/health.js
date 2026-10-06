import { providers } from "./_lib/providers.js";

const configured = value => Boolean(String(value || "").trim());

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET required." });

  const oauth = Object.fromEntries(Object.entries(providers).map(([id, provider]) => [
    id,
    {
      configured: configured(provider.clientId()) && configured(provider.clientSecret()),
      redirectConfigured: configured(provider.redirect(req))
    }
  ]));

  const transport = {
    gpuWorker: configured(process.env.LIVESIM_GPU_WORKER_URL),
    voiceWorker: configured(process.env.LIVESIM_VOICE_WORKER_URL),
    mediaGateway: configured(process.env.LIVESIM_MEDIA_GATEWAY_URL),
    signal: configured(process.env.LIVESIM_SIGNAL_URL),
    whip: configured(process.env.LIVESIM_WHIP_URL),
    voiceConverter: configured(process.env.LIVESIM_VOICE_CONVERTER_URL),
    sessionSecret: configured(process.env.LIVESIM_SESSION_SECRET) && process.env.LIVESIM_SESSION_SECRET.length >= 32,
    publicOrigin: configured(process.env.LIVESIM_PUBLIC_ORIGIN)
  };

  const blockers = [];
  if (!transport.sessionSecret) blockers.push("LIVESIM_SESSION_SECRET is missing or shorter than 32 characters.");
  if (!transport.publicOrigin) blockers.push("LIVESIM_PUBLIC_ORIGIN is not configured.");
  if (!transport.gpuWorker) blockers.push("GPU worker URL is not configured; browser preview remains available.");
  if (!transport.voiceWorker) blockers.push("Voice worker URL is not configured; voice synthesis is unavailable.");
  if (!transport.signal) blockers.push("WebRTC signaling URL is not configured; video-call transport is unavailable.");
  if (!transport.whip) blockers.push("WHIP URL is not configured; live publishing is unavailable.");

  const ready = transport.sessionSecret && transport.publicOrigin;
  return res.status(ready ? 200 : 503).json({
    ok: ready,
    service: "livesim-control-plane",
    transport,
    oauth,
    blockers,
    note: "This endpoint reports configuration presence only. It does not expose secrets or claim that a remote worker is reachable."
  });
}
