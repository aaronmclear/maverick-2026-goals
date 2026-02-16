# Maverick 2026 Baseball Goals

This is a lightweight, mobile-friendly dashboard for viewing and updating 2026 stats and goals. It is designed for Vercel hosting with a simple KV-backed API.

## Deploy (Vercel)
1. Create a Vercel project from this folder.
2. In Vercel, add a **KV** store (Storage tab).
3. Add these environment variables to the project:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
4. Deploy. The app will seed the KV store from `data.json` on first run.

## Usage
- Open the site on your phone or desktop.
- Update 2026 totals or goals in the forms and hit **Save**.
- Upload a single-row CSV with headers: `AVG,OBP,SLG,OPS,K%,ERA,WHIP,K/BB,K/BF,BB/BF`.

## Data Model
Stored in KV as a JSON document. The initial seed is `data.json`.
