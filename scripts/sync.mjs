// Brings the generated documentation from an angelite checkout:  node scripts/sync.mjs ../angelite
import { execFileSync } from 'node:child_process';
import { copyFileSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const here = resolve(import.meta.dirname, '..');
const src = resolve(process.argv[2] || '../angelite');
if (!existsSync(join(src, 'package.json'))) { console.error(`not an angelite checkout: ${src}`); process.exit(1); }

if (!process.env.SKIP_BUILD) execFileSync('npm', ['run', 'build:docs'], { cwd: src, stdio: 'inherit' });

const copy = (from, to) => { copyFileSync(from, to); console.log('copied', to.replace(here + '/', '')); };
// pages owned by this repo are never overwritten
const OWN = new Set(['index.html', 'guia.html']);
for (const f of readdirSync(join(src, 'docs'))) {
  if (f.endsWith('.md')) { if (f !== 'api-reference.md') copy(join(src, 'docs', f), join(here, 'analysis', f)); continue; }
  if (f === 'index.html') { copy(join(src, 'docs', f), join(here, 'site', 'guia.html')); continue; }
  if (OWN.has(f)) continue;
  copy(join(src, 'docs', f), join(here, 'site', f));
}
for (const f of ['SECURITY.md', 'CHANGELOG.md']) copy(join(src, f), join(here, 'analysis', f));
copy(join(src, 'benchmarks', 'results.json'), join(here, 'analysis', 'benchmark-results.json'));

// the navigation bar shared by the pages that come from angelite
const bar = readFileSync(join(here, 'scripts', 'sitebar.html'), 'utf8');
for (const f of ['guia.html', 'components.html', 'benchmarks.html']) {
  const file = join(here, 'site', f);
  const html = readFileSync(file, 'utf8');
  if (!html.includes('class="sitebar"')) writeFileSync(file, html.replace('<body>', '<body>\n' + bar));
}
