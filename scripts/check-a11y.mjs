// G-A11Y — static accessibility gate over src/ (zero dependencies).
// Every interactive element must carry a role, and icon-only or text-input
// controls a label; the only Text in the app is AppText (so nothing escapes
// the type scale or the line-height rule). Runs in `npm run check` and CI.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      yield* walk(p);
    } else if (p.endsWith('.tsx')) yield p;
  }
}

/** The opening tag starting at `start`, brace-aware so `=>` inside props
 *  does not end it early. */
function openingTag(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0 && src[i - 1] !== '=') return src.slice(start, i + 1);
  }
  return src.slice(start);
}

const RULES = [
  { tag: 'Pressable', needs: ['accessibilityRole', 'role='], why: 'a Pressable must declare its role' },
  { tag: 'TouchableOpacity', needs: ['accessibilityRole', 'role='], why: 'declare the role' },
  { tag: 'IconButton', needs: ['accessibilityLabel'], why: 'an icon-only control needs a label' },
  { tag: 'TextInput', needs: ['accessibilityLabel'], why: 'an input needs a label' },
  { tag: 'Card', needs: ['accessibilityLabel'], onlyIf: 'onPress', why: 'a pressable Card needs a label (children are not announced)' },
  { tag: 'SignArt', needs: ['alt='], why: 'artwork needs alt text' },
];

const problems = [];
let files = 0;
for (const file of walk(ROOT)) {
  files++;
  const src = readFileSync(file, 'utf8');
  const rel = relative(process.cwd(), file);
  const isAppText = rel.endsWith('components/AppText.tsx');
  for (const rule of RULES) {
    const re = new RegExp(`<${rule.tag}\\b`, 'g');
    for (const m of src.matchAll(re)) {
      const tag = openingTag(src, m.index);
      if (rule.onlyIf && !tag.includes(rule.onlyIf)) continue;
      if (!rule.needs.some((n) => tag.includes(n))) {
        problems.push(`${rel}:${src.slice(0, m.index).split('\n').length}  <${rule.tag}> — ${rule.why}`);
      }
    }
  }
  if (!isAppText) {
    for (const m of src.matchAll(/<Text\b/g)) {
      problems.push(`${rel}:${src.slice(0, m.index).split('\n').length}  raw <Text> — use AppText so the type scale and line height apply`);
    }
  }
}

if (problems.length) {
  console.error(`G-A11Y FAIL — ${problems.length} problem(s) in ${files} files:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`G-A11Y PASS — ${files} screen/component files: every Pressable has a role, every icon control, input and pressable Card a label, no raw <Text>`);
