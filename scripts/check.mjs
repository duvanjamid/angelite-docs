// Comprueba dist/: enlaces internos, anclas, ids duplicados e imágenes sin alt.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const dist = resolve('dist');
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p);
  }
})(dist);

const ids = new Map();
const pages = new Map();
for (const f of files) {
  const html = readFileSync(f, 'utf8');
  const list = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  ids.set(f, new Set(list));
  pages.set(f, html);
}

const errors = [];
for (const [f, html] of pages) {
  const rel = f.slice(dist.length + 1);
  const seen = new Set();
  for (const id of ids.get(f)) { /* set already unique */ }
  const all = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  for (const id of all) { if (seen.has(id)) errors.push(`${rel}: id duplicado "${id}"`); seen.add(id); }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) errors.push(`${rel}: <img> sin alt`);
  for (const m of html.matchAll(/\shref="([^"]*)"/g)) {
    const href = m[1];
    if (!href || /^(https?:|mailto:|tel:|javascript:|data:)/.test(href)) continue;
    const [pathPart, hash] = href.split('#');
    const target = pathPart ? resolve(dirname(f), pathPart) : f;
    const file = existsSync(target) && statSync(target).isDirectory() ? join(target, 'index.html') : target;
    if (!existsSync(file)) { errors.push(`${rel}: enlace roto "${href}"`); continue; }
    if (hash && !file.endsWith('ui.html') && file.endsWith('.html') && !ids.get(file)?.has(hash)) errors.push(`${rel}: ancla inexistente "${href}"`);
  }
}
if (errors.length) { console.error(errors.join('\n')); console.error(`\n${errors.length} problema(s)`); process.exit(1); }
console.log(`ok: ${files.length} páginas revisadas`);
