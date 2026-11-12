// Shared quality-office dashboard storage for the public Vercel build.
// Keeps one JSON blob of per-faculty submissions in Vercel Blob storage.
const { put, head } = require("@vercel/blob");

const BLOB_PATH = "submissions.json";

async function readAll() {
  try {
    const info = await head(BLOB_PATH);
    const r = await fetch(info.url, { cache: "no-store" });
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
