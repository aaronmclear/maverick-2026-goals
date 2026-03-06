const fs = require('fs/promises');
const path = require('path');
const { put, list } = require('@vercel/blob');

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_KEY = 'maverick-2026/data.json';

async function blobList() {
  const result = await list({ prefix: BLOB_KEY, limit: 20, token: BLOB_TOKEN });
  if (!result || !result.blobs || result.blobs.length === 0) return [];
  return result.blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

async function blobGet() {
  const versions = await blobList();
  if (!versions.length) return null;
  const latest = versions[0];
  const res = await fetch(latest.url);
  if (!res.ok) return null;
  return await res.json();
}

async function blobSet(value) {
  await put(BLOB_KEY, JSON.stringify(value), {
    access: 'public',
    contentType: 'application/json',
    token: BLOB_TOKEN
  });
}

async function fileGet() {
  const filePath = path.join(process.cwd(), 'data.json');
  const text = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(text);
}

async function getStoredData() {
  if (BLOB_TOKEN) {
    let data = await blobGet();
    if (!data) {
      data = await fileGet();
      await blobSet(data);
    }
    return data;
  }
  return await fileGet();
}

function mergePreservingGames(existing, incoming) {
  const merged = { ...existing, ...incoming };

  const existingGames = Array.isArray(existing.games) ? existing.games : [];
  const incomingGames = Array.isArray(incoming.games) ? incoming.games : [];

  if (existingGames.length > 0 && incomingGames.length === 0) {
    merged.games = existingGames;
    merged.current = existing.current || merged.current;
  } else {
    merged.games = incomingGames;
  }

  merged.meta = { ...(existing.meta || {}), ...(incoming.meta || {}) };
  merged.baseline = { ...(existing.baseline || {}), ...(incoming.baseline || {}) };
  merged.goals = { ...(existing.goals || {}), ...(incoming.goals || {}) };
  merged.current = { ...(existing.current || {}), ...(incoming.current || {}) };

  return merged;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (req.query && req.query.history === '1' && BLOB_TOKEN) {
        const versions = await blobList();
        return res.status(200).json({
          versions: versions.map(({ url, uploadedAt, pathname }) => ({ url, uploadedAt, pathname }))
        });
      }
      const data = await getStoredData();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const payload = req.body;

      if (payload && payload.action === 'restorePrevious') {
        if (!BLOB_TOKEN) return res.status(400).json({ error: 'Restore requires Blob storage' });
        const versions = await blobList();
        if (versions.length < 2) return res.status(400).json({ error: 'No previous backup found' });
        const previous = versions[1];
        const restoreRes = await fetch(previous.url);
        if (!restoreRes.ok) return res.status(500).json({ error: 'Restore failed' });
        const restored = await restoreRes.json();
        await blobSet(restored);
        return res.status(200).json({ ok: true, data: restored });
      }

      if (payload && payload.action === 'restoreSeed') {
        const seed = await fileGet();
        if (BLOB_TOKEN) await blobSet(seed);
        return res.status(200).json({ ok: true, data: seed });
      }

      if (payload && payload.action === 'clearSeason') {
        const existing = await getStoredData();
        const cleared = {
          ...existing,
          current: payload.current || existing.current,
          games: [],
          meta: { ...(existing.meta || {}), ...(payload.meta || {}) }
        };
        if (BLOB_TOKEN) await blobSet(cleared);
        return res.status(200).json({ ok: true, data: cleared });
      }

      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const existing = await getStoredData();
      const merged = mergePreservingGames(existing, payload);
      if (BLOB_TOKEN) await blobSet(merged);

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
