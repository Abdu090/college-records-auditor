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

// Returns the current list of submissions. Only treats "the blob doesn't
// exist yet" (first ever write) as an empty list -- any other failure
// (network blip, propagation hiccup, bad JSON) is rethrown so callers abort
// instead of overwriting real data with an accidentally-empty read.
async function readAll() {
  let info;
  try {
    info = await head(BLOB_PATH);
  } catch (err) {
    if (/does not exist/i.test(String((err && err.message) || err))) return [];
    throw err;
  }
  const r = await fetch(info.url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
  });
  if (!r.ok) throw new Error("Could not read current data (HTTP " + r.status + ")");
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      res.status(200).json(await readAll());
    } catch (err) {
      res.status(500).json({ error: String((err && err.message) || err) });
    }
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
    try {
      const rows = await readAll();
      const idx = rows.findIndex(r => r.id === id);
      const rec = Object.assign({ id }, data);
      if (idx >= 0) rows[idx] = rec; else rows.push(rec);
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
    try {
      const rows = (await readAll()).filter(r => r.id !== id);
      await put(BLOB_PATH, JSON.stringify(rows), PUT_OPTS);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String((err && err.message) || err) });
    }
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
};
