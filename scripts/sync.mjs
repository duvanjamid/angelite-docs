// Brings the generated parts from a checkout of the framework:  node scripts/sync.mjs ../angelite
//   - rebuilds the bundles (npm run build) so the site runs exactly the published code
//   - copies the three browser bundles into public/
//   - copies the type definitions into data/types/ (the API reference is generated from them)
//   - exports the UI component metadata to data/ui-meta.json (the component library page and its tests read it)
//   - converts the benchmark results into public/benchmarks-data.js
//   - copies SECURITY.md and CHANGELOG.md into analysis/
// Pages, the feature table (public/features-data.js), the examples of the component library and the analysis texts
// are written in this repository.
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const here = resolve(import.meta.dirname, '..');
const src = resolve(process.argv[2] || '../angelite');
if (!existsSync(join(src, 'package.json'))) { console.error(`not a framework checkout: ${src}`); process.exit(1); }

if (!process.env.SKIP_BUILD) execFileSync('npm', ['run', 'build'], { cwd: src, stdio: 'inherit' });

const copy = (from, to) => { mkdirSync(join(to, '..'), { recursive: true }); copyFileSync(from, to); console.log('copied', to.replace(here + '/', '')); };
for (const f of ['angelite-lite.min.js', 'angelite-ui.min.js', 'angelite-addons.min.js']) copy(join(src, 'dist', f), join(here, 'public', f));
for (const f of readdirSync(join(src, 'types'))) if (/\.d\.m?ts$/.test(f)) copy(join(src, 'types', f), join(here, 'data', 'types', f));
for (const f of ['SECURITY.md', 'CHANGELOG.md']) copy(join(src, f), join(here, 'analysis', f));
copy(join(src, 'benchmarks', 'results.json'), join(here, 'analysis', 'benchmark-results.json'));

const results = JSON.parse(readFileSync(join(src, 'benchmarks', 'results.json'), 'utf8'));
writeFileSync(join(here, 'public', 'benchmarks-data.js'), `// Generated from benchmarks/results.json of the framework repository (node scripts/sync.mjs)\nwindow.BENCH = ${JSON.stringify(results)};\n`);
console.log('wrote public/benchmarks-data.js');

const metaFile = join(src, 'src', 'ui', 'meta.js');
if (existsSync(metaFile)) {
  const { meta, groups } = await import(pathToFileURL(metaFile).href);
  writeFileSync(join(here, 'data', 'ui-meta.json'), JSON.stringify({ groups, components: meta }, null, 1));
  console.log(`wrote data/ui-meta.json (${meta.length} components)`);
} else console.warn('this checkout has no src/ui/meta.js: the component library page will not be built');
