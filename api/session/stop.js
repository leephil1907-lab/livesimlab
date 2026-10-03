import { parseCookies } from "../_lib/security.js";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST required." });
  const connection = parseCookies(req);
  res.setHeader("Set-Cookie", "livesim_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  res.status(200).json({ stopped: true });
}
