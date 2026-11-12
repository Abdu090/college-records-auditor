// Shared quality-office dashboard storage for the public Vercel build.
// Keeps one JSON blob of per-faculty submissions in Vercel Blob storage.
const { put, head } = require("@vercel/blob");

const BLOB_PATH = "submissions.json";

async function readAll() {
  try {
    const info = await head(BLOB_PATH);
    // The blob's public URL sits behind a CDN that ignores our cache
    // headers, so bust it with a query string tied to the blob's own
    // last-modified time (changes on every write).
    const bust = info.uploadedAt ? new Date(info.uploadedAt).getTime() : Date.now();
    const r = await fetch(`${info.url}?v=${bust}`, { cache: "no-store" });
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
      await put(BLOB_PATH, JSON.stringify(rows), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true
      });
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
      await put(BLOB_PATH, JSON.stringify(rows), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String((err && err.message) || err) });
    }
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
};
