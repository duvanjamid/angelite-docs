// Brings the generated parts from a checkout of the framework:  node scripts/sync.mjs ../angelite-core
//   - rebuilds the bundles (npm run build) so site/ runs exactly the published code
//   - converts the benchmark results into site/benchmarks-data.js
//   - copies SECURITY.md, CHANGELOG.md and the raw results into analysis/
// The pages, the feature table (site/features-data.js) and the analysis texts are written in this repository.
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const here = resolve(import.meta.dirname, '..');
const src = resolve(process.argv[2] || '../angelite-core');
if (!existsSync(join(src, 'package.json'))) { console.error(`not a framework checkout: ${src}`); process.exit(1); }

if (!process.env.SKIP_BUILD) execFileSync('npm', ['run', 'build'], { cwd: src, stdio: 'inherit' });

const copy = (from, to) => { copyFileSync(from, to); console.log('copied', to.replace(here + '/', '')); };
for (const f of ['angelite-lite.min.js', 'angelite-ui.min.js', 'angelite-addons.min.js']) copy(join(src, 'dist', f), join(here, 'site', f));
for (const f of ['SECURITY.md', 'CHANGELOG.md']) copy(join(src, f), join(here, 'analysis', f));
copy(join(src, 'benchmarks', 'results.json'), join(here, 'analysis', 'benchmark-results.json'));

const results = JSON.parse(readFileSync(join(src, 'benchmarks', 'results.json'), 'utf8'));
writeFileSync(join(here, 'site', 'benchmarks-data.js'), `// Generated from benchmarks/results.json of the framework repository (node scripts/sync.mjs)\nwindow.BENCH = ${JSON.stringify(results)};\n`);
console.log('wrote site/benchmarks-data.js');
