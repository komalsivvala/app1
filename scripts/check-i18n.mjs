#!/usr/bin/env node
/**
 * Gate G-I18N — every locale file in src/i18n has exactly the key set of
 * en.json, and every language content-config.json ships has a locale file.
 * Zero dependencies. Exit 1 on any violation.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const I18N = resolve(HERE, '../src/i18n');
const CONTENT_CONFIG = resolve(HERE, '../src/content/content-config.json');

function leaves(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.push(key);
    else if (v && typeof v === 'object') out.push(...leaves(v, key));
    else throw new Error(`non-string leaf at ${key}`);
  }
  return out.sort();
}

const files = readdirSync(I18N).filter((f) => /^[a-z]{2}\.json$/.test(f));
const tables = Object.fromEntries(files.map((f) => [f.replace('.json', ''), leaves(JSON.parse(readFileSync(resolve(I18N, f), 'utf8')))]));
const errors = [];

if (!tables.en) errors.push('src/i18n/en.json is missing');
for (const [lang, keys] of Object.entries(tables)) {
  if (lang === 'en' || !tables.en) continue;
  const missing = tables.en.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !tables.en.includes(k));
  if (missing.length) errors.push(`${lang}.json is missing ${missing.length} key(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
  if (extra.length) errors.push(`${lang}.json has ${extra.length} key(s) not in en.json: ${extra.slice(0, 5).join(', ')}`);
}

const { languages } = JSON.parse(readFileSync(CONTENT_CONFIG, 'utf8'));
for (const lang of languages) {
  if (!tables[lang]) errors.push(`content-config.json ships "${lang}" but src/i18n/${lang}.json does not exist`);
}

if (errors.length) {
  console.error(`G-I18N FAIL — ${errors.length} violation(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`G-I18N PASS — ${Object.keys(tables).length} locale file(s) [${Object.keys(tables).join(', ')}], ${tables.en.length} keys each, shipping [${languages.join(', ')}]`);
