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
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from './lib/serve-dist.mjs';

const DIST = resolve('dist');
const OUT = resolve(process.env.SCREENSHOT_DIR ?? 'docs/screenshots');
const PORT = Number(process.env.PORT ?? 4173);

/** Screens to capture: [name, route, testID that must be visible]. */
const SCREENS = [
  ['home', '/', 'home'],
  ['learn', '/learn', 'learn'],
  ['signs', '/signs', 'signs'],
  ['progress', '/progress', 'progress'],
  ['exam-intro', '/exam/intro', 'exam-intro'],
  ['settings', '/settings', 'settings'],
  ['about', '/about', 'about'],
  ['learn-topic', '/learn/road-signs', 'question-row-0'],
  ['question-detail', '/question/rs-004', 'question-detail'],
  ['flashcards', '/learn/flashcards', 'flashcard'],
  ['signs-detail', '/signs/cautionary-cattle', 'sign-detail-art'],
  ['guide', '/guide', 'guide-eligibility'],
  ['bookmarks-empty', '/bookmarks', 'bookmarks-empty'],
];

/** Screens that need typing before the shot: [name, route, testID, input testID, text]. */
const TYPED = [
  ['search', '/learn/search', 'search-result-0', 'search-input', 'speed'],
];

/** Stateful flows: drive the exam and capture session, result and review. */
async function examFlow(page, base, shoot) {
  const tid = (id) => page.getByTestId(id);
  await page.goto(`${base}/exam/intro`, { waitUntil: 'networkidle' });
  await tid('start-exam').click();
  await tid('exam-question').first().waitFor({ state: 'visible', timeout: 15_000 });
  await tid('exam-option-1').click();
  await page.waitForTimeout(200);
  await shoot('exam-session');
  for (let guard = 0; guard < 25; guard++) {
    await page.locator('[data-testid="exam-result"], [data-testid="exam-option-0"]').first().waitFor({ state: 'visible', timeout: 15_000 });
    if (await tid('exam-result').count()) break;
    await tid('exam-option-0').click();
    await tid('exam-next').click();
    await page.waitForTimeout(50);
  }
  await tid('exam-result').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(200);
  await shoot('exam-result');
  await tid('result-review').click();
  await tid('review-item-0').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(300);
  await shoot('exam-review');
  await tid('review-bookmark-0').click();
  await page.locator('[data-testid="review-bookmark-0"][aria-label="Remove bookmark"]').waitFor({ state: 'visible', timeout: 5_000 });

  // With a completed mock: progress has history and bars; practice draws weak areas.
  await page.goto(`${base}/progress`, { waitUntil: 'networkidle' });
  await tid('progress-history').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(200);
  await shoot('progress-with-data');
  await tid('practice-weak').click();
  await page.locator('[data-testid="practice-option-0"]:visible').first().waitFor({ state: 'visible', timeout: 15_000 });
  await tid('practice-option-1').click();
  await page.locator('[data-testid="practice-feedback"]:visible').first().waitFor({ state: 'visible', timeout: 5_000 });
  await page.waitForTimeout(200);
  await shoot('practice-session');
  await page.goto(`${base}/bookmarks`, { waitUntil: 'networkidle' });
  await tid('bookmark-row-0').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(200);
  await shoot('bookmarks');
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('dist/index.html not found — run `npm run export:web` first');
    process.exit(1);
  }
  await mkdir(OUT, { recursive: true });
  const server = await serveDist(PORT);
  const base = `http://127.0.0.1:${PORT}`;
  const launch = {};
  if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launch);

  const failures = [];
  // The matrix: every screen × {light, dark} at 100%, and every screen at
  // 200% text size in light (layout, not colour, is what text scale changes).
  // The web export has no OS text size; the app reads `aplld.textScale` from
  // localStorage as a stand-in (src/design/use-web-text-scale.web.ts).
  const PASSES = [
    ['light', 1],
    ['dark', 1],
    ['light', 2],
  ];
  for (const [colorScheme, textScale] of PASSES) {
    const suffix = textScale === 1 ? colorScheme : `${colorScheme}-${textScale * 100}`;
    const contextOptions = {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme,
      reducedMotion: 'reduce',
    };
    const context = await browser.newContext(contextOptions);
    if (textScale !== 1) await context.addInitScript((v) => localStorage.setItem('aplld.textScale', String(v)), textScale);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

    for (const [name, route, testId] of SCREENS) {
      errors.length = 0;
      const file = join(OUT, `${name}-${suffix}.png`);
      try {
        await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
        await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 15_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`  ✓ ${name}-${suffix}.png${errors.length ? `   (${errors.length} console error(s))` : ''}`);
        for (const e of errors) console.log(`      ${e.slice(0, 160)}`);
      } catch (e) {
        failures.push(`${name}-${suffix}: ${e.message.split('\n')[0]}`);
        await page.screenshot({ path: file.replace('.png', '-FAILED.png'), fullPage: true }).catch(() => {});
        console.log(`  ✗ ${name}-${suffix}: ${e.message.split('\n')[0]}`);
        for (const err of errors) console.log(`      ${err.slice(0, 200)}`);
      }
    }
    for (const [name, route, testId, inputId, text] of TYPED) {
      const file = join(OUT, `${name}-${suffix}.png`);
      try {
        await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
        await page.getByTestId(inputId).fill(text);
        await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 15_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`  ✓ ${name}-${suffix}.png`);
      } catch (e) {
        failures.push(`${name}-${suffix}: ${e.message.split('\n')[0]}`);
        console.log(`  ✗ ${name}-${suffix}: ${e.message.split('\n')[0]}`);
      }
    }

    // Stateful exam flow in a FRESH context (empty database).
    const flowContext = await browser.newContext(contextOptions);
    if (textScale !== 1) await flowContext.addInitScript((v) => localStorage.setItem('aplld.textScale', String(v)), textScale);
    const flowPage = await flowContext.newPage();
    try {
      await examFlow(flowPage, base, async (name) => {
        await flowPage.evaluate(() => document.fonts.ready);
        await flowPage.screenshot({ path: join(OUT, `${name}-${suffix}.png`), fullPage: true });
        console.log(`  ✓ ${name}-${suffix}.png`);
      });
    } catch (e) {
      failures.push(`exam-flow-${suffix}: ${e.message.split('\n')[0]}`);
      console.log(`  ✗ exam-flow-${suffix}: ${e.message.split('\n')[0]}`);
      await flowPage.screenshot({ path: join(OUT, `exam-flow-${suffix}-FAILED.png`), fullPage: true }).catch(() => {});
    }
    await flowContext.close();
    await context.close();
  }
  await browser.close();
  server.close();
  if (failures.length) {
    console.error(`\n${failures.length} screenshot(s) failed`);
    process.exit(1);
  }
  console.log(`\n${(SCREENS.length + TYPED.length + 6) * PASSES.length} screenshots -> ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
