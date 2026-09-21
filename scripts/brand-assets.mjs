// Renders assets/brand/*.svg to the PNGs Expo consumes, with Chromium.
// Usage: npm run brand:assets
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const JOBS = [
  ['icon.svg', 'icon.png', 1024, false],
  ['adaptive-foreground.svg', 'android-icon-foreground.png', 1024, true],
  ['adaptive-background.svg', 'android-icon-background.png', 1024, false],
  ['adaptive-monochrome.svg', 'android-icon-monochrome.png', 1024, true],
  ['splash-icon.svg', 'splash-icon.png', 512, true],
  ['icon.svg', 'favicon.png', 48, false],
];

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
for (const [svg, png, size, transparent] of JOBS) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const markup = readFileSync(resolve('assets/brand', svg), 'utf8');
  await page.setContent(`<!doctype html><html><body style="margin:0;background:${transparent ? 'transparent' : '#fff'}">${markup.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</body></html>`);
  await page.screenshot({ path: resolve('assets/images', png), clip: { x: 0, y: 0, width: size, height: size }, omitBackground: transparent });
  console.log(`  ✓ assets/images/${png}  ${size}×${size}${transparent ? ' (transparent)' : ''}`);
  await page.close();
}
await browser.close();
