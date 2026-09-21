#!/usr/bin/env node
/**
 * Screenshot matrix: every major screen × {light, dark} at phone size, from the
 * static web export in dist/. Web is a CI/screenshot target only — device-only
 * behaviour (OS font scale, native SQLite) is verified on hardware.
 *
 *   npm run export:web && npm run screenshots
 *
 * Serves dist/ itself with the COOP/COEP headers expo-sqlite's web worker
 * wants, so no extra server package is needed.
 */
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const OUT = resolve(process.env.SCREENSHOT_DIR ?? 'docs/screenshots');
const PORT = Number(process.env.PORT ?? 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.map': 'application/json',
};

/** Screens to capture: [name, route, testID that must be visible]. */
const SCREENS = [
  ['home', '/', 'home'],
  ['learn', '/learn', 'learn'],
  ['signs', '/signs', 'signs'],
  ['progress', '/progress', 'progress'],
  ['exam-intro', '/exam/intro', 'exam-intro'],
  ['settings', '/settings', 'settings'],
  ['about', '/about', 'about'],
];

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const candidates = [clean, `${clean}.html`, join(clean, 'index.html')];
  for (const c of candidates) {
    const p = join(DIST, c);
    if (!p.startsWith(DIST)) continue;
    try {
      if ((await stat(p)).isFile()) return p;
    } catch { /* next */ }
  }
  return join(DIST, 'index.html'); // SPA fallback for client-side routes
}

function serve() {
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
    server.listen(PORT, '127.0.0.1', () => ok(server));
  });
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('dist/index.html not found — run `npm run export:web` first');
    process.exit(1);
  }
  await mkdir(OUT, { recursive: true });
  const server = await serve();
  const launch = {};
  if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launch);

  const failures = [];
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

    for (const [name, route, testId] of SCREENS) {
      errors.length = 0;
      const file = join(OUT, `${name}-${colorScheme}.png`);
      try {
        await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
        await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 15_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`  ✓ ${name}-${colorScheme}.png${errors.length ? `   (${errors.length} console error(s))` : ''}`);
        for (const e of errors) console.log(`      ${e.slice(0, 160)}`);
      } catch (e) {
        failures.push(`${name}-${colorScheme}: ${e.message.split('\n')[0]}`);
        await page.screenshot({ path: file.replace('.png', '-FAILED.png'), fullPage: true }).catch(() => {});
        console.log(`  ✗ ${name}-${colorScheme}: ${e.message.split('\n')[0]}`);
        for (const err of errors) console.log(`      ${err.slice(0, 200)}`);
      }
    }
    await context.close();
  }
  await browser.close();
  server.close();
  if (failures.length) {
    console.error(`\n${failures.length} screenshot(s) failed`);
    process.exit(1);
  }
  console.log(`\n${SCREENS.length * 2} screenshots -> ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
