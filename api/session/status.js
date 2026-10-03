import { parseCookies, unseal } from "../_lib/security.js";

export default function handler(req, res) {
  const session = unseal(parseCookies(req).livesim_session);
  if (!session) return res.status(200).json({ active: false });
  res.status(200).json({ active: true, ...session });
}
