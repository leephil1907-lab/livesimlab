import crypto from "node:crypto";

const secret = () => {
  const value = process.env.LIVESIM_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("LIVESIM_SESSION_SECRET must be at least 32 characters.");
  return crypto.createHash("sha256").update(value).digest();
};

export function seal(payload, maxAgeSeconds = 900) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret(), iv);
  const body = JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + maxAgeSeconds * 1000 });
  const ciphertext = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map(x => x.toString("base64url")).join(".");
}

export function unseal(value) {
  try {
    const [ivB64, tagB64, dataB64] = String(value || "").split(".");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", secret(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final()
    ]).toString("utf8");
    const data = JSON.parse(plaintext);
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const raw = req.headers.cookie || "";
  return Object.fromEntries(raw.split(";").map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf("=");
    return [i > -1 ? x.slice(0, i) : x, i > -1 ? decodeURIComponent(x.slice(i + 1)) : ""];
  }));
}

export function setCookie(name, value, maxAge = 86400 * 30) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
