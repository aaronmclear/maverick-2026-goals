const fs = require('fs/promises');
const path = require('path');

const { put, list } = require('@vercel/blob');
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_KEY = 'maverick-2026/data.json';

async function blobGet() {
  const result = await list({
    prefix: BLOB_KEY,
    limit: 20,
    token: BLOB_TOKEN
  });
  if (!result || !result.blobs || result.blobs.length === 0) {
    return null;
  }
  const latest = result.blobs.sort(
    (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
  )[0];
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
  return true;
}

async function fileGet() {
  const filePath = path.join(process.cwd(), 'data.json');
  const text = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(text);
}

async function fileSet(value) {
  const filePath = path.join(process.cwd(), 'data.json');
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      let data = null;
      if (BLOB_TOKEN) {
        data = await blobGet();
        if (!data) {
          data = await fileGet();
          await blobSet(data);
        }
      } else {
        data = await fileGet();
      }
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      if (BLOB_TOKEN) {
        await blobSet(payload);
      } else {
        await fileSet(payload);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}

    return res.status(500).json({ error: 'Server error' });
  }
}
