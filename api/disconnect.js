export default function handler(req, res) {
  res.setHeader("Set-Cookie", "livesim_connection=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  res.status(200).json({ connected: false });
}
