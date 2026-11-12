// Shared quality-office dashboard storage for the public Vercel build.
// Keeps one JSON blob of per-faculty submissions in Vercel Blob storage.
const { put, head } = require("@vercel/blob");

const BLOB_PATH = "submissions-v2.json";

const PUT_OPTS = {
  access: "public",
  contentType: "application/json",
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 0
};

async function readAll() {
  try {
    const info = await head(BLOB_PATH);
    // Plain public blob URLs sit behind a CDN that can pin stale content
    // indefinitely. Reading with the read/write token as a Bearer auth
    // header makes this an authenticated request, which shared caches
    // must not store, so it always reaches the current content.
    const r = await fetch(info.url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
    });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
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
    const before = await readAll();
    console.log("[DELETE] id to remove:", JSON.stringify(id), "before:", JSON.stringify(before));
    const rows = before.filter(r => r.id !== id);
    console.log("[DELETE] after filter:", JSON.stringify(rows));
    try {
      const putResult = await put(BLOB_PATH, JSON.stringify(rows), PUT_OPTS);
      console.log("[DELETE] put() result:", JSON.stringify(putResult));
      res.status(200).json({ ok: true });
    } catch (err) {
      console.log("[DELETE] put() error:", String((err && err.stack) || err));
      res.status(500).json({ error: String((err && err.message) || err) });
    }
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
};
