// Shared quality-office dashboard storage for the public Vercel build.
// Keeps one JSON blob of per-faculty submissions in Vercel Blob storage.
const { put, head } = require("@vercel/blob");

const BLOB_PATH = "submissions.json";

async function readAll() {
  try {
    const info = await head(BLOB_PATH);
    // Vercel Blob's CDN caches the public URL by pathname and ignores query
    // strings, so a classic cache-busting query param does nothing here.
    // put() below sets cacheControlMaxAge:0 so the CDN doesn't cache writes.
    const r = await fetch(info.url, { cache: "no-store" });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

const PUT_OPTS = {
  access: "public",
  contentType: "application/json",
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 0
};

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    if (req.query && req.query.debug) {
      try {
        const info = await head(BLOB_PATH);
        const r = await fetch(info.url, { cache: "no-store" });
        const text = await r.text();
        res.status(200).json({ info, fetchStatus: r.status, fetchOk: r.ok, text });
      } catch (err) {
        res.status(200).json({ debugError: String((err && err.stack) || err) });
      }
      return;
    }
    const rows = await readAll();
    res.status(200).json(rows);
    return;
  }
  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const id = body && body.id;
    const data = body && body.data;
    if (!id || typeof id !== "string" || !data || typeof data !== "object") {
      res.status(400).json({ error: "Missing id/data" });
      return;
    }
    const rows = await readAll();
    const idx = rows.findIndex(r => r.id === id);
    const rec = Object.assign({ id }, data);
    if (idx >= 0) rows[idx] = rec; else rows.push(rec);
    try {
      await put(BLOB_PATH, JSON.stringify(rows), PUT_OPTS);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String((err && err.message) || err) });
    }
    return;
  }
  if (req.method === "DELETE") {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const id = (body && body.id) || (req.query && req.query.id);
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const rows = (await readAll()).filter(r => r.id !== id);
    try {
      await put(BLOB_PATH, JSON.stringify(rows), PUT_OPTS);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String((err && err.message) || err) });
    }
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
};
