/** Static server for dist/ with the COOP/COEP headers expo-sqlite's worker wants. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const DIST = resolve('dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.map': 'application/json',
};

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  for (const c of [clean, `${clean}.html`, join(clean, 'index.html')]) {
    const p = join(DIST, c);
    if (!p.startsWith(DIST)) continue;
    try {
      if ((await stat(p)).isFile()) return p;
    } catch { /* next */ }
  }
  return join(DIST, 'index.html');
}

export function serveDist(port) {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      const file = await resolveFile(req.url ?? '/');
      try {
        const body = await readFile(file);
        res.writeHead(200, {
          'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cache-Control': 'no-store',
        });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(port, '127.0.0.1', () => ok(server));
  });
}
