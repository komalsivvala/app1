// Store screenshots at device sizes, rendered from the web export (dist/).
// The same React Native components, fonts and content as the phone build;
// recapture on a device before submission if the store asks for it.
// Usage: npm run export:web && npm run store:screenshots
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from './lib/serve-dist.mjs';

const OUT = resolve('store/screenshots');
const PORT = Number(process.env.PORT ?? 4181);

// Store size → CSS viewport × device scale factor.
const DEVICES = [
  ['android-phone-1080x2340', 360, 780, 3],
  ['ios-6.7in-1290x2796', 430, 932, 3],
  ['ios-ipad-12.9in-2048x2732', 1024, 1366, 2],
];

async function main() {
  const server = await serveDist(PORT);
  const base = `http://127.0.0.1:${PORT}`;
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const failures = [];
  for (const [name, width, height, dpr] of DEVICES) {
    const dir = join(OUT, name);
    await mkdir(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: width < 700, hasTouch: true, colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const tid = (id) => page.getByTestId(id);
    const vis = (id) => page.locator(`[data-testid="${id}"]:visible`).first();
    let n = 0;
    const shoot = async (label) => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      n += 1;
      const file = join(dir, `${String(n).padStart(2, '0')}-${label}.png`);
      await page.screenshot({ path: file });
      console.log(`  ✓ ${name}/${String(n).padStart(2, '0')}-${label}.png`);
    };
    try {
      await page.goto(`${base}/`, { waitUntil: 'networkidle' });
      await vis('home').waitFor();
      await shoot('home');
      await tid('start-mock').click();
      await vis('exam-intro').waitFor();
      await shoot('pre-exam');
      await tid('start-exam').click();
      await vis('exam-option-0').waitFor();
      await tid('exam-option-1').click();
      await shoot('exam-question');
      for (let i = 0; i < 20; i++) {
        if (!(await vis('exam-option-0').count())) break;
        await vis('exam-option-0').click();
        await vis('exam-next').click();
        await page.locator('[data-testid="exam-result"]:visible, [data-testid="exam-option-0"]:visible').first().waitFor({ timeout: 15_000 });
        if (await page.locator('[data-testid="exam-result"]:visible').count()) break;
      }
      await vis('exam-result').waitFor();
      await shoot('result');
      await tid('result-review').click();
      await vis('review-item-0').waitFor();
      await shoot('review');
      await page.goto(`${base}/learn/road-signs`, { waitUntil: 'networkidle' });
      await vis('learn-topic').waitFor().catch(() => vis('learn-topic-list').waitFor());
      await shoot('learn');
      await page.goto(`${base}/signs`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid^="sign-tile-"]:visible').first().waitFor();
      await shoot('road-signs');
      await page.goto(`${base}/progress`, { waitUntil: 'networkidle' });
      await vis('progress-topics').waitFor();
      await shoot('progress');
    } catch (e) {
      failures.push(`${name}: ${e.message.split('\n')[0]}`);
      console.log(`  ✗ ${name}: ${e.message.split('\n')[0]}`);
    }
    await context.close();
  }
  await browser.close();
  server.close();
  if (failures.length) {
    console.error(`\n${failures.length} device(s) failed`);
    process.exit(1);
  }
  console.log(`\nstore screenshots -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
