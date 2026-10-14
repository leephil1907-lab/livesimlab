import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const dist = resolve(root, "dist");
const apiRoot = resolve(root, "api");
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
  ".wasm": "application/wasm", ".mp4": "video/mp4", ".webm": "video/webm", ".wav": "audio/wav"
};

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map(part => {
    const i = part.indexOf("=");
    if (i < 0) return [part.trim(), ""];
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    try { return [key, decodeURIComponent(value)]; } catch { return [key, value]; }
  }).filter(([key]) => key));
}
function parseQuery(params) {
  const query = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(query, key)) query[key] = Array.isArray(query[key]) ? [...query[key], value] : [query[key], value];
    else query[key] = value;
  }
  return query;
}
async function readBody(req, limit = 20 * 1024 * 1024) {
  if (["GET", "HEAD"].includes(req.method || "GET")) return undefined;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) { const error = new Error("Request body is too large."); error.statusCode = 413; throw error; }
    chunks.push(chunk);
  }
  if (!size) return undefined;
  const buffer = Buffer.concat(chunks);
  const type = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (type === "application/json" || type.endsWith("+json")) {
    try { return JSON.parse(buffer.toString("utf8")); }
    catch { const error = new Error("Invalid JSON request body."); error.statusCode = 400; throw error; }
  }
  if (type === "application/x-www-form-urlencoded") return Object.fromEntries(new URLSearchParams(buffer.toString("utf8")));
  if (type.startsWith("text/")) return buffer.toString("utf8");
  return buffer;
}
function addVercelResponseHelpers(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => { if (!res.headersSent) res.setHeader("content-type", "application/json; charset=utf-8"); res.end(JSON.stringify(value)); return res; };
  res.send = value => {
    if (value === undefined || value === null) return res.end();
    if (Buffer.isBuffer(value)) return res.end(value);
    if (typeof value === "object") return res.json(value);
    if (!res.headersSent) res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(String(value)); return res;
  };
  res.redirect = (statusOrLocation, maybeLocation) => {
    const status = typeof statusOrLocation === "number" ? statusOrLocation : 302;
    const location = typeof statusOrLocation === "number" ? maybeLocation : statusOrLocation;
    res.statusCode = status; res.setHeader("location", String(location || "/")); res.end(); return res;
  };
}
async function handleApi(req, res, url) {
  const route = decodeURIComponent(url.pathname);
  if (route.split("/").includes("..") || route.includes("\\\\") || route.includes("\\0")) {
    res.statusCode = 400; return res.json({ error: "Invalid API path." });
  }
  const file = resolve(apiRoot, route.slice("/api/".length) + ".js");
  if (!file.startsWith(apiRoot + sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.statusCode = 404; return res.json({ error: "API route not found." });
  }
  try {
    req.query = parseQuery(url.searchParams);
    req.cookies = parseCookies(req.headers.cookie || "");
    req.body = await readBody(req);
    const module = await import(pathToFileURL(file).href);
    if (typeof module.default !== "function") { res.statusCode = 500; return res.json({ error: "API route has no default handler." }); }
    await module.default(req, res);
    if (!res.writableEnded) res.end();
  } catch (error) {
    console.error("[api]", route, error);
    if (res.writableEnded) return;
    res.statusCode = error.statusCode || 500;
    res.json({ error: res.statusCode === 500 ? "Internal server error." : error.message });
  }
}
function serveFile(req, res, file) {
  const ext = extname(file).toLowerCase();
  res.statusCode = 200;
  res.setHeader("content-type", mime[ext] || "application/octet-stream");
  if (ext === ".html") res.setHeader("cache-control", "no-cache");
  else if (file.includes(sep + "assets" + sep)) res.setHeader("cache-control", "public, max-age=31536000, immutable");
  else res.setHeader("cache-control", "public, max-age=300");
  if (req.method === "HEAD") return res.end();
  createReadStream(file).on("error", error => { console.error("[static]", error); if (!res.headersSent) res.statusCode = 500; res.end(); }).pipe(res);
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://" + (req.headers.host || "localhost"));
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  res.setHeader("x-frame-options", "SAMEORIGIN");
  addVercelResponseHelpers(res);
  if (url.pathname === "/healthz") { res.statusCode = 200; return res.json({ ok: true, service: "reachmark-facehub", runtime: "node" }); }
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { res.statusCode = 400; return res.end("Bad request"); }
  const requested = resolve(dist, "." + pathname);
  if (requested.startsWith(dist + sep) && existsSync(requested) && statSync(requested).isFile()) return serveFile(req, res, requested);
  if (extname(pathname)) { res.statusCode = 404; return res.end("Not found"); }
  const index = resolve(dist, "index.html");
  if (!existsSync(index)) { res.statusCode = 503; return res.end("Build output missing. Run npm run build first."); }
  return serveFile(req, res, index);
});
server.requestTimeout = 120000;
server.headersTimeout = 65000;
server.listen(port, host, () => console.log("Reachmark FaceHub listening on " + host + ":" + port));
