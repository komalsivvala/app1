#!/usr/bin/env node
/**
 * Gate G-CONFIG — cross-field invariants for src/content/exam-config.json.
 *
 * JSON Schema checks the shape of each field. It cannot check that sectionMix
 * sums to questionCount, or that the timing fields agree with the timing mode.
 * Those are exactly the mistakes a hurried edit makes, and each one silently
 * produces a wrong exam rather than a crash — so they are gated here.
 *
 * Zero dependencies on purpose: this must run in CI before `npm install` has
 * any chance to fail, and before the app exists at all.
 *
 * Usage:  node scripts/validate-exam-config.mjs [path-to-config]
 * Exit 0 = pass. Exit 1 = fail, with every violation listed.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = resolve(HERE, '../src/content/exam-config.json');

const TOPICS = ['road-signs', 'rules-of-road-regulations', 'general-driving-principles'];

/**
 * @param {unknown} config parsed exam-config.json
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateExamConfig(config) {
  const errors = [];
  const warnings = [];
  const fail = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return { errors: ['config is not a JSON object'], warnings };
  }

  const c = /** @type {Record<string, any>} */ (config);

  const isInt = (v) => Number.isInteger(v);
  const isBool = (v) => typeof v === 'boolean';

  // --- questionCount ---------------------------------------------------
  if (!isInt(c.questionCount) || c.questionCount < 1) {
    fail(`questionCount must be a positive integer, got ${JSON.stringify(c.questionCount)}`);
  }

  // --- passMark --------------------------------------------------------
  if (!isInt(c.passMark) || c.passMark < 1) {
    fail(`passMark must be a positive integer, got ${JSON.stringify(c.passMark)}`);
  } else if (isInt(c.questionCount)) {
    if (c.passMark > c.questionCount) {
      fail(`passMark (${c.passMark}) exceeds questionCount (${c.questionCount}) — the exam would be unpassable`);
    }
    const pct = (c.passMark / c.questionCount) * 100;
    if (pct < 50 || pct > 90) {
      warn(
        `passMark is ${pct.toFixed(0)}% of questionCount (${c.passMark}/${c.questionCount}). ` +
          `Every source surveyed puts the real AP bar between 60% and 80% — check this is deliberate.`,
      );
    }
  }

  // --- negativeMark ----------------------------------------------------
  if (typeof c.negativeMark !== 'number' || Number.isNaN(c.negativeMark) || c.negativeMark < 0) {
    fail(`negativeMark must be a number >= 0, got ${JSON.stringify(c.negativeMark)}`);
  }

  // --- booleans --------------------------------------------------------
  for (const key of ['allowBackNavigation', 'allowSkip']) {
    if (!isBool(c[key])) fail(`${key} must be a boolean, got ${JSON.stringify(c[key])}`);
  }

  // --- timing ----------------------------------------------------------
  const t = c.timing;
  if (typeof t !== 'object' || t === null || Array.isArray(t)) {
    fail('timing must be an object');
  } else if (t.mode !== 'per-question' && t.mode !== 'whole-paper') {
    fail(`timing.mode must be "per-question" or "whole-paper", got ${JSON.stringify(t.mode)}`);
  } else if (t.mode === 'per-question') {
    if (!isInt(t.secondsPerQuestion) || t.secondsPerQuestion < 1) {
      fail(`timing.mode is "per-question" so timing.secondsPerQuestion must be a positive integer, got ${JSON.stringify(t.secondsPerQuestion)}`);
    }
    if (t.totalSeconds !== null) {
      fail(`timing.mode is "per-question" so timing.totalSeconds must be null, got ${JSON.stringify(t.totalSeconds)} — two live clocks is undefined behaviour`);
    }
  } else {
    if (!isInt(t.totalSeconds) || t.totalSeconds < 1) {
      fail(`timing.mode is "whole-paper" so timing.totalSeconds must be a positive integer, got ${JSON.stringify(t.totalSeconds)}`);
    }
    if (t.secondsPerQuestion !== null) {
      fail(`timing.mode is "whole-paper" so timing.secondsPerQuestion must be null, got ${JSON.stringify(t.secondsPerQuestion)} — two live clocks is undefined behaviour`);
    }
  }

  // --- sectionMix ------------------------------------------------------
  const mix = c.sectionMix;
  if (typeof mix !== 'object' || mix === null || Array.isArray(mix)) {
    fail('sectionMix must be an object');
  } else {
    const keys = Object.keys(mix);
    for (const topic of TOPICS) {
      if (!(topic in mix)) fail(`sectionMix is missing topic "${topic}"`);
      else if (!isInt(mix[topic]) || mix[topic] < 0) {
        fail(`sectionMix["${topic}"] must be a non-negative integer, got ${JSON.stringify(mix[topic])}`);
      }
    }
    for (const k of keys) {
      if (!TOPICS.includes(k)) fail(`sectionMix has unknown topic "${k}" — valid topics are ${TOPICS.join(', ')}`);
    }
    const sum = TOPICS.reduce((a, k) => a + (isInt(mix[k]) ? mix[k] : 0), 0);
    if (isInt(c.questionCount) && sum !== c.questionCount) {
      fail(`sectionMix sums to ${sum} but questionCount is ${c.questionCount} — the paper cannot be filled (gate G-MIX)`);
    }
  }

  // --- formatVerifiedOn ------------------------------------------------
  if (c.formatVerifiedOn !== null) {
    if (typeof c.formatVerifiedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.formatVerifiedOn)) {
      fail(`formatVerifiedOn must be null or an ISO date "YYYY-MM-DD", got ${JSON.stringify(c.formatVerifiedOn)}`);
    } else {
      const d = new Date(`${c.formatVerifiedOn}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) {
        fail(`formatVerifiedOn is not a real date: ${c.formatVerifiedOn}`);
      } else if (d.getTime() > Date.now()) {
        fail(`formatVerifiedOn is in the future (${c.formatVerifiedOn}) — it records a visit that has already happened`);
      }
    }
  }

  // --- unknown keys ----------------------------------------------------
  const KNOWN = new Set([
    '$schema', 'questionCount', 'passMark', 'timing', 'allowBackNavigation',
    'allowSkip', 'negativeMark', 'sectionMix', 'formatVerifiedOn',
  ]);
  for (const k of Object.keys(c)) {
    if (!KNOWN.has(k)) {
      fail(`unknown key "${k}" — the engine will ignore it, so it is almost certainly a mistake (did you mean one of: ${[...KNOWN].filter((x) => x !== '$schema').join(', ')}?)`);
    }
  }

  return { errors, warnings };
}

// --- CLI -------------------------------------------------------------
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const path = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_CONFIG;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`G-CONFIG FAIL — cannot read/parse ${path}\n  ${e.message}`);
    process.exit(1);
  }

  const { errors, warnings } = validateExamConfig(parsed);

  for (const w of warnings) console.warn(`  warn: ${w}`);

  if (errors.length > 0) {
    console.error(`\nG-CONFIG FAIL — ${errors.length} violation(s) in ${path}:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const verified = parsed.formatVerifiedOn
    ? `verified ${parsed.formatVerifiedOn}`
    : 'UNVERIFIED (formatVerifiedOn: null — app must say so on the pre-exam screen)';
  console.log(
    `G-CONFIG PASS — ${parsed.questionCount} questions, ${parsed.passMark} to pass ` +
      `(${((parsed.passMark / parsed.questionCount) * 100).toFixed(0)}%), ` +
      `${parsed.timing.mode}, ${verified}`,
  );
}
