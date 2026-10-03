import { parseCookies, unseal } from "./_lib/security.js";

export default function handler(req, res) {
  const connection = unseal(parseCookies(req).livesim_connection);
  if (!connection) return res.status(200).json({ connected: false });
  res.status(200).json({
    connected: true,
    provider: connection.provider,
    label: connection.label,
    accountId: connection.accountId,
    displayName: connection.displayName,
    avatarUrl: connection.avatarUrl,
    scope: connection.scope,
    expiresAt: connection.expiresAt
  });
}
