#!/usr/bin/env node
/** Renders every drawn sign, grouped by category, into three PNG contact sheets. */
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const registry = JSON.parse(readFileSync('pipeline/build/signs.json', 'utf8'));
const OUT = process.env.SCREENSHOT_DIR ?? 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1.5 });
for (const category of ['mandatory', 'cautionary', 'informatory']) {
  const signs = registry.filter((s) => s.category === category);
  const cells = signs.map((s) => `<figure><div class="art">${readFileSync(`src/content/signs/${s.id}.svg`, 'utf8')}</div><figcaption>${s.name}</figcaption></figure>`).join('');
  await page.setContent(`<!doctype html><html><head><style>
    body{margin:0;padding:24px;background:#fff;font:13px Inter,Helvetica,Arial,sans-serif;color:#111}
    h1{font-size:18px;margin:0 0 16px}
    .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:18px 14px}
    figure{margin:0;text-align:center}.art svg{width:120px;height:120px;display:block;margin:0 auto 6px}
    figcaption{line-height:1.3;min-height:2.6em}
  </style></head><body><h1>${category} — ${signs.length} signs</h1><div class="grid">${cells}</div></body></html>`);
  await page.screenshot({ path: `${OUT}/signs-${category}.png`, fullPage: true });
  console.log(`  ✓ signs-${category}.png (${signs.length})`);
}
await browser.close();
