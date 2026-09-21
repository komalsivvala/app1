#!/usr/bin/env node
/**
 * Gate G-LANG — src/content/content-config.json is internally consistent.
 *
 * Zero dependencies, same reasons as validate-exam-config.mjs.
 *
 * Usage:  node scripts/validate-content-config.mjs [path]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT = resolve(HERE, '../src/content/content-config.json');
const KNOWN_LANGS = ['en', 'te'];

/** @returns {{ errors: string[] }} */
export function validateContentConfig(c) {
  const errors = [];
  const fail = (m) => errors.push(m);
  if (typeof c !== 'object' || c === null || Array.isArray(c)) return { errors: ['config is not an object'] };

  if (typeof c.contentVersion !== 'string' || !/^\d{4}\.\d{2}\.\d+$/.test(c.contentVersion)) {
    fail(`contentVersion must be "YYYY.MM.N", got ${JSON.stringify(c.contentVersion)} — pinned, never derived from the clock`);
  }

  const langs = c.languages;
  if (!Array.isArray(langs) || langs.length === 0) fail('languages must be a non-empty array');
  else {
    for (const l of langs) if (!KNOWN_LANGS.includes(l)) fail(`languages contains unknown "${l}" (known: ${KNOWN_LANGS.join(', ')})`);
    if (new Set(langs).size !== langs.length) fail('languages has duplicates');
  }

  if (!KNOWN_LANGS.includes(c.defaultLanguage)) fail(`defaultLanguage "${c.defaultLanguage}" is not a known language`);
  else if (Array.isArray(langs) && !langs.includes(c.defaultLanguage)) {
    fail(`defaultLanguage "${c.defaultLanguage}" is not in languages [${langs.join(', ')}] — the app would default to a language it has no content for`);
  }

  const planned = c.plannedLanguages;
  if (!Array.isArray(planned)) fail('plannedLanguages must be an array (may be empty)');
  else {
    for (const l of planned) {
      if (!KNOWN_LANGS.includes(l)) fail(`plannedLanguages contains unknown "${l}"`);
      if (Array.isArray(langs) && langs.includes(l)) fail(`"${l}" is both shipped and planned — pick one`);
    }
  }

  const d = c.decision;
  if (typeof d !== 'object' || d === null) fail('decision block is required — a language set is a product decision and must say why');
  else {
    for (const k of ['date', 'summary', 'reason', 'reversal']) {
      if (typeof d[k] !== 'string' || !d[k].trim()) fail(`decision.${k} must be a non-empty string`);
    }
    if (typeof d.date === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) fail(`decision.date must be YYYY-MM-DD, got ${JSON.stringify(d.date)}`);
  }

  const KNOWN = new Set(['$schema', 'contentVersion', 'languages', 'defaultLanguage', 'plannedLanguages', 'decision']);
  for (const k of Object.keys(c)) if (!KNOWN.has(k)) fail(`unknown key "${k}"`);

  return { errors };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const path = process.argv[2] ? resolve(process.argv[2]) : DEFAULT;
  let parsed;
  try { parsed = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { console.error(`G-LANG FAIL — cannot read/parse ${path}\n  ${e.message}`); process.exit(1); }
  const { errors } = validateContentConfig(parsed);
  if (errors.length) {
    console.error(`\nG-LANG FAIL — ${errors.length} violation(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const planned = parsed.plannedLanguages.length ? `, planned: ${parsed.plannedLanguages.join(', ')}` : '';
  console.log(`G-LANG PASS — content ${parsed.contentVersion}, shipping [${parsed.languages.join(', ')}], default ${parsed.defaultLanguage}${planned}`);
}
