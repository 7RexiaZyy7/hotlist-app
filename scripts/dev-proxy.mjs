import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from '../api/proxy.js';

// Load .env manually (no dotenv dep needed)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {} // .env doesn't exist, that's fine

const PORT = process.env.PROXY_PORT || 3001;

// Extend IncomingMessage to match Vercel's req.body
function wrapRequest(req, res) {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
  // Vercel auto-parses JSON body; dev server needs to do it manually
  // handler already calls parseBody for POST, so we're fine
}

const server = http.createServer(async (req, res) => {
  // Collect raw body and attach to req
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', async () => {
    req.body = Buffer.concat(chunks).toString('utf-8');
    // Extend res with .json() and .status()
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    // Parse query string into req.query
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    req.query = Object.fromEntries(url.searchParams);
    req.url = url.pathname + url.search;

    // Vercel-style body: already parsed JSON object
    try {
      if (req.body) req.body = JSON.parse(req.body);
      else req.body = {};
    } catch {
      req.body = {};
    }

    await handler(req, res);
  });
});

server.listen(PORT, () => {
  console.log(`[dev-proxy] Running on http://localhost:${PORT}`);
  console.log(`[dev-proxy] Vite should proxy /api/proxy to this server`);
});
