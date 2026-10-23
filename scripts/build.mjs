// Builds the documentation site into dist/: pages from content/*.html and analysis/*.md, the API reference from the
// type definitions, the search index, the sitemap and the static files in public/.
//   npm run build
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import http from 'highlight.js/lib/languages/http';
import diff from 'highlight.js/lib/languages/diff';

for (const [name, lang] of Object.entries({ javascript, typescript, xml, css, bash, json, http, diff })) hljs.registerLanguage(name, lang);
hljs.registerAliases(['js', 'mjs'], { languageName: 'javascript' });
hljs.registerAliases(['ts'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'vue'], { languageName: 'xml' });
hljs.registerAliases(['sh', 'shell'], { languageName: 'bash' });

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const nav = JSON.parse(readFileSync(join(root, 'nav.json'), 'utf8'));
const SITE = nav.site;

/* ---------- helpers ---------- */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'seccion';
const stripTags = s => unesc(s.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function guess(code) {
  const t = code.trim();
  if (/^(\$ |npm |npx |node |git |cd |curl )/.test(t)) return 'bash';
  if (/^<(!|\/|[a-z])/i.test(t)) return 'xml';
  if (/^(Content-Security-Policy|GET |POST )/.test(t)) return 'http';
  if (/^[{[]\s*"/.test(t)) return 'json';
  return 'javascript';
}
function highlight(code, lang) {
  const language = lang && hljs.getLanguage(lang) ? lang : guess(code);
  return { html: hljs.highlight(code, { language }).value, language };
}
const codebox = (code, lang) => {
  const h = highlight(code, lang);
  return `<div class="codebox"><pre><code class="hljs language-${h.language}">${h.html}</code></pre></div>`;
};

/* ---------- page processing ---------- */

/** Replaces <pre><code> with highlighted boxes and <script class="example"> with runnable examples. */
function processBlocks(html) {
  html = html.replace(/<script type="text\/plain" class="example"([^>]*)>([\s\S]*?)<\/script>/g, (_, attrs, body) => {
    const title = (/data-title="([^"]*)"/.exec(attrs) || [, 'Ejemplo'])[1];
    const code = body.replace(/^\n/, '').replace(/\s+$/, '');
    const box = codebox(code, 'javascript');
    return `<div class="example" data-run><div class="tag"><span>${title}</span><span>en vivo</span></div><div class="demo" aria-live="polite"></div>` +
      `<details><summary>Ver el código</summary>${box}</details><script type="text/plain" class="src">${code.replace(/<\/script/gi, '<\\/script')}</script></div>`;
  });
  html = html.replace(/<pre><code(?: class="language-([\w-]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_, lang, body) => codebox(unesc(body).replace(/^\n/, '').replace(/\s+$/, ''), lang));
  html = html.replace(/<table(?![^>]*class=)([\s\S]*?)<\/table>/g, '<div class="tablewrap"><table$1</table></div>');
  return html;
}

/** Gives every h2/h3 an id and an anchor; returns the html and the list for the table of contents. */
function headings(html) {
  const used = new Set(), toc = [];
  const out = html.replace(/<h([23])(?: id="([^"]*)")?>([\s\S]*?)<\/h\1>/g, (_, level, id, inner) => {
    let key = id || slug(inner);
    for (let n = 2; used.has(key); n++) key = `${id || slug(inner)}-${n}`;
    used.add(key);
    const plain = stripTags(inner);
    toc.push({ level: +level, id: key, text: plain });
    return `<h${level} id="${key}">${inner}<a class="anchor" href="#${key}" aria-label="Enlace a ${esc(plain)}">#</a></h${level}>`;
  });
  return { html: out, toc };
}

const pagesById = new Map();
nav.groups.forEach(g => g.pages.forEach(p => pagesById.set(p.id, { ...p, group: g.title })));
const order = [...pagesById.values()];

function sidebar(currentId, extra) {
  const groups = nav.groups.map(g => `<h2>${esc(g.title)}</h2><ul>${g.pages.map(p => {
    const cur = p.id === currentId;
    const sub = cur && extra ? extra : '';
    return `<li><a href="${p.id}.html"${cur ? ' aria-current="page"' : ''}>${esc(p.title)}</a>${sub}</li>`;
  }).join('')}</ul>`).join('');
  return groups;
}

function layout({ id, title, description, body, toc = [], scripts = [], styles = [], wide = false, sideExtra = '', source = '', noToc = false }) {
  const page = pagesById.get(id) || { title, group: '' };
  const idx = order.findIndex(p => p.id === id);
  const prev = idx > 0 ? order[idx - 1] : null, next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  const showToc = !noToc && toc.length > 1;
  const tocHtml = showToc ? `<aside class="toc" aria-label="En esta página"><h2>En esta página</h2><ul>${toc.map(t => `<li class="l${t.level}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ul></aside>` : '';
  const url = `${SITE.url}/${id}.html`;
  const pager = `<nav class="pager" aria-label="Páginas">${prev ? `<a class="prev" href="${prev.id}.html"><small>← Anterior</small>${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="next" href="${next.id}.html"><small>Siguiente →</small>${esc(next.title)}</a>` : ''}</nav>`;
  const edit = source ? `<a href="${SITE.docsRepo}/blob/main/${source}">Editar esta página en GitHub</a>` : '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · AngeLite</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#3d6c6f">
<link rel="canonical" href="${url}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${esc(title)} · AngeLite">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<script>try{var t=localStorage.getItem('angelite-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<link rel="stylesheet" href="assets/docs.css">
${styles.map(h => `<link rel="stylesheet" href="${h}">`).join('\n')}
</head>
<body>
<a class="skip" href="#main">Saltar al contenido</a>
<header class="topbar">
  <button class="iconbtn menu-btn" id="menu" type="button" aria-controls="sidebar" aria-expanded="false" aria-label="Abrir el menú">☰</button>
  <a class="brand" href="index.html"><img src="assets/icon.svg" alt="" width="30" height="31"><span><span class="w1">Ang</span><span class="w2">elite</span></span><small>docs</small></a>
  <span class="spacer"></span>
  <nav class="toplinks" aria-label="Enlaces"><a href="empezar.html">Guía</a><a href="ui.html">Componentes</a><a href="referencia.html">API</a><a href="benchmarks.html">Benchmark</a></nav>
  <a class="iconbtn" href="${SITE.repo}" aria-label="Código en GitHub" title="Código en GitHub"><svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>
  <button class="iconbtn" id="theme" type="button" aria-label="Cambiar de tema">☾</button>
</header>
<div class="shell">
  <nav class="sidebar" id="sidebar" aria-label="Documentación" data-open="false">
    <button class="closebtn" type="button" aria-label="Cerrar el menú">×</button>
    <div class="brandrow"><a class="brand" href="index.html"><img src="assets/icon.svg" alt="" width="30" height="31"><span><span class="w1">Ang</span><span class="w2">elite</span></span></a></div>
    <div class="search"><input id="search" type="search" placeholder="Buscar en la documentación" aria-label="Buscar en la documentación" autocomplete="off" data-index="search-index.json" aria-controls="results"><kbd aria-hidden="true">/</kbd></div>
    <ul class="results" id="results" role="listbox" aria-label="Resultados" hidden></ul>
    ${sidebar(id, sideExtra)}
  </nav>
  <div class="scrim" data-open="false"></div>
  <div class="main${showToc ? '' : ' no-toc'}${wide ? ' wide' : ''}" id="main" tabindex="-1">
    <article>
      ${id === 'index' ? '' : `<p class="crumbs"><a href="index.html">Inicio</a>${page.group ? ` › ${esc(page.group)}` : ''}</p>`}
      <h1>${esc(title)}</h1>
      ${description ? `<p class="lead">${esc(description)}</p>` : ''}
${body}
      ${pager}
    </article>
    ${tocHtml}
  </div>
</div>
<footer class="foot">AngeLite · <a href="${SITE.repo}">código</a> · <a href="${SITE.docsRepo}">esta documentación</a> ${edit ? '· ' + edit : ''}</footer>
${scripts.map(s => `<script src="${s}"></script>`).join('\n')}
<script src="assets/docs.js"></script>
</body>
</html>
`;
}

/* ---------- content pages ---------- */

const out = new Map();     // file name -> html
const searchDocs = [];
const warnings = [];

function addSearch({ id, title, toc, text }) {
  const p = pagesById.get(id);
  searchDocs.push({ url: `${id}.html`, title, group: p ? p.group : '', headings: toc.map(t => ({ id: t.id, text: t.text })), text: text.slice(0, 6000) });
}

const LIB = ['angelite-lite.min.js', 'angelite-addons.min.js'];

function readMeta(file) {
  const raw = readFileSync(file, 'utf8');
  const m = /^<!--(\{[\s\S]*?\})-->\s*/.exec(raw);
  if (!m) throw new Error(`${file}: missing the <!--{"title":...}--> header`);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

function contentPage(id) {
  const { meta, body: raw } = readMeta(join(root, 'content', `${id}.html`));
  const processed = processBlocks(raw);
  const { html, toc } = headings(processed);
  const scripts = [...(meta.examples ? LIB : []), ...(meta.ui ? ['angelite-ui.min.js'] : []), ...(meta.scripts || []), ...(meta.inline || [])];
  out.set(`${id}.html`, layout({ id, title: meta.title, description: meta.description || '', body: html, toc, scripts, styles: meta.css || [], wide: !!meta.wide, noToc: !!meta.noToc, source: `content/${id}.html` }));
  addSearch({ id, title: meta.title, toc, text: stripTags(raw) });
}

/* ---------- markdown pages ---------- */

function mdPage(id, source) {
  const text = readFileSync(join(root, source), 'utf8');
  const tokens = marked.lexer(text);
  const h1 = tokens.find(t => t.type === 'heading' && t.depth === 1);
  const title = pagesById.get(id).title;
  const renderer = new marked.Renderer();
  renderer.code = ({ text: code, lang }) => codebox(code, (lang || '').split(/\s/)[0]);
  renderer.table = function (token) {
    const head = `<tr>${token.header.map(c => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('')}</tr>`;
    const rows = token.rows.map(r => `<tr>${r.map(c => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('');
    return `<div class="tablewrap"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  };
  if (h1) tokens.splice(tokens.indexOf(h1), 1);
  const first = tokens.find(t => t.type === 'paragraph');
  const description = first ? stripTags(marked.parseInline(first.text)).slice(0, 190) : title;
  const rendered = marked.parser(tokens, { renderer, gfm: true });
  const { html, toc } = headings(rendered);
  out.set(`${id}.html`, layout({ id, title, description: h1 ? description : description, body: html, toc, source }));
  addSearch({ id, title, toc, text: stripTags(rendered) });
}

/* ---------- API reference, generated from the type definitions ---------- */

const MODULES = [
  { file: 'lite.d.ts', id: 'lite', name: '@duvanjamid/angelite', desc: 'El núcleo: señales, componentes, inyección de dependencias, router, seguridad, pipes y referencias.' },
  { file: 'forms.d.ts', id: 'forms', name: '@duvanjamid/angelite/lite/forms', desc: 'Formularios reactivos sobre señales.' },
  { file: 'http.d.ts', id: 'http', name: '@duvanjamid/angelite/lite/http', desc: 'Cliente HTTP con interceptores y resource().' },
  { file: 'i18n.d.ts', id: 'i18n', name: '@duvanjamid/angelite/lite/i18n', desc: 'Internacionalización con plurales y formatos.' },
  { file: 'hydrate.d.ts', id: 'hydrate', name: '@duvanjamid/angelite/lite/hydrate', desc: 'El lado del cliente del renderizado en servidor.' },
  { file: 'devtools.d.ts', id: 'devtools', name: '@duvanjamid/angelite/lite/devtools', desc: 'Inspector de componentes y señales.' },
  { file: 'testing.d.ts', id: 'testing', name: '@duvanjamid/angelite/lite/testing', desc: 'Utilidades para probar componentes.' },
  { file: 'ssr.d.mts', id: 'ssr', name: '@duvanjamid/angelite/tools/ssr.mjs', desc: 'Renderizado en servidor (Node).' },
  { file: 'aot.d.mts', id: 'aot', name: '@duvanjamid/angelite/tools/aot.mjs', desc: 'Compilador de plantillas para el build y chequeo de plantillas.' },
  { file: 'vite.d.mts', id: 'vite', name: '@duvanjamid/angelite/tools/vite.mjs', desc: 'Plugin de Vite para plantillas precompiladas.' },
  { file: 'check.d.mts', id: 'check', name: '@duvanjamid/angelite/tools/check.mjs', desc: 'Comprobación de plantillas desde la línea de comandos.' }
];

function parseDts(text) {
  const entries = [];
  let section = '', doc = [], current = null, inDoc = false;
  const flush = () => { if (current) { entries.push(current); current = null; } };
  for (const line of text.split('\n')) {
    const sec = /^\/\* -{3,} (.+?) -{3,} \*\/$/.exec(line);
    if (sec) { flush(); section = sec[1]; doc = []; continue; }
    if (/^\/\*\*/.test(line) && !current) {
      doc = [];
      if (/\*\/\s*$/.test(line)) doc.push(line.replace(/^\/\*\*\s?|\s*\*\/\s*$/g, ''));
      else inDoc = true;
      continue;
    }
    if (inDoc) {
      if (/\*\//.test(line)) { inDoc = false; const last = line.replace(/\s*\*\/.*$/, '').replace(/^\s*\* ?/, ''); if (last) doc.push(last); }
      else doc.push(line.replace(/^\s*\* ?/, ''));
      continue;
    }
    const exp = /^export (?:declare )?(?:abstract )?(?:function|const|class|interface|type|let)\s+([A-Za-z0-9_$]+)/.exec(line);
    if (exp) {
      flush();
      current = { name: exp[1], section, doc: doc.join(' ').replace(/\s+/g, ' ').trim(), lines: [line] };
      doc = [];
      continue;
    }
    if (current) {
      if (/^\S/.test(line) && !/^[}\]]/.test(line)) { flush(); doc = []; if (line.trim()) { /* stray top-level line */ } }
      else current.lines.push(line);
    }
  }
  flush();
  return entries;
}

const SECTIONS = { signals: 'Señales', components: 'Componentes', 'dependency injection': 'Inyección de dependencias', security: 'Seguridad', pipes: 'Pipes', 'template references': 'Referencias a la plantilla', router: 'Router', development: 'Desarrollo' };

function referencePage() {
  const dir = join(root, 'data', 'types');
  const parts = [];
  for (const m of MODULES) {
    const file = join(dir, m.file);
    if (!existsSync(file)) { warnings.push(`reference: ${m.file} not found (run npm run sync)`); continue; }
    const entries = parseDts(readFileSync(file, 'utf8'));
    let lastSection = null;
    const usedIds = new Set([m.id]);
    const body = entries.map(e => {
      let eid = `${m.id}-${slug(e.name)}`;
      for (let n = 2; usedIds.has(eid); n++) eid = `${m.id}-${slug(e.name)}-${n}`;
      usedIds.add(eid);
      const head = e.section && e.section !== lastSection ? `<h3 class="refsec" id="${m.id}-sec-${slug(e.section)}">${esc(SECTIONS[e.section] || e.section[0].toUpperCase() + e.section.slice(1))}</h3>` : '';
      lastSection = e.section;
      const sig = e.lines.join('\n').replace(/\s+$/, '');
      return `${head}<section class="ref" id="${eid}"><h4><code>${esc(e.name)}</code><a class="anchor" href="#${eid}" aria-label="Enlace a ${esc(e.name)}">#</a></h4>${e.doc ? `<p>${esc(e.doc)}</p>` : ''}${codebox(sig, 'typescript')}</section>`;
    }).join('\n');
    parts.push(`<h2 id="${m.id}">${esc(m.name)}</h2><p>${esc(m.desc)} <code>import { … } from '${esc(m.name)}'</code></p>${body}`);
  }
  const intro = `<p class="lead" style="display:none"></p><div class="callout"><span class="t">Generada desde los tipos</span><p>Esta referencia se genera a partir de las definiciones de TypeScript del paquete (<code>types/*.d.ts</code>), así que no puede quedarse atrás del código: cada firma de aquí es la que comprueba <code>tsc</code> en el CI.</p></div>`;
  const { html, toc } = headings(parts.join('\n'));
  // the table of contents lists modules only (the entries would make it endless)
  const modulesToc = toc.filter(t => t.level === 2);
  out.set('referencia.html', layout({ id: 'referencia', title: 'Referencia de la API', description: 'Todas las funciones, clases y tipos públicos, con su firma y su descripción.', body: intro + html, toc: modulesToc, source: 'scripts/build.mjs' }));
  addSearch({ id: 'referencia', title: 'Referencia de la API', toc: toc.filter(t => t.level === 2 || t.level === 4), text: stripTags(html) });
}

/* ---------- the component library page (an AngeLite app, see public/assets/ui-app.js) ---------- */

function uiPage() {
  const metaFile = join(root, 'data', 'ui-meta.json');
  if (!existsSync(metaFile)) { warnings.push('ui: data/ui-meta.json not found (run npm run sync)'); return; }
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  const sub = `<ul>${meta.groups.map(g => `<li><a href="ui.html#grupo-${slug(g)}">${esc(g)}</a><ul>${meta.components.filter(c => c.group === g).map(c => `<li><a href="ui.html#${c.id}">${esc(c.name)}</a></li>`).join('')}</ul></li>`).join('')}</ul>`;
  const body = `<noscript><p>Esta página es una aplicación AngeLite: necesita JavaScript para mostrar los componentes en vivo.</p></noscript><div id="app" aria-live="polite"><p>Cargando componentes…</p></div>`;
  out.set('ui.html', layout({ id: 'ui', title: 'Biblioteca de componentes', description: `${meta.components.length} componentes accesibles hechos con AngeLite: con ejemplos en vivo, controles para probarlos, tablas de API y notas de accesibilidad.`, body, scripts: [...LIB, 'angelite-ui.min.js', 'ui-meta.js', 'ui-examples.js', 'assets/ui-app.js'], wide: true, noToc: true, sideExtra: sub, source: 'public/assets/ui-app.js' }));
  addSearch({ id: 'ui', title: 'Biblioteca de componentes', toc: meta.components.map(c => ({ id: c.id, text: c.name })), text: meta.components.map(c => `${c.name} ${c.summary} ${c.a11y} ${c.inputs.map(i => i.name + ' ' + i.desc).join(' ')}`).join(' ') });
  writeFileSync(join(dist, 'ui-meta.js'), `window.UI_META = ${JSON.stringify(meta)};\n`);
}

/* ---------- home, redirects, 404 ---------- */

function homePage() {
  const read = f => { try { return JSON.parse(readFileSync(join(root, f), 'utf8')); } catch (e) { return null; } };
  void read;
  const { meta, body: raw } = readMeta(join(root, 'content', 'index.html'));
  const { html, toc } = headings(processBlocks(raw));
  out.set('index.html', layout({ id: 'index', title: meta.title, description: meta.description, body: html, toc, noToc: true, wide: true, scripts: [...LIB, 'benchmarks-data.js', 'features-data.js', 'assets/home.js'], source: 'content/index.html' }));
  addSearch({ id: 'index', title: meta.title, toc, text: stripTags(raw) });
}

const redirect = (to, why) => `<!doctype html><html lang="es"><meta charset="utf-8"><title>${why}</title><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${SITE.url}/${to}"><p><a href="${to}">Esta página se movió a ${to}</a></p></html>\n`;

/* ---------- run ---------- */

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'public'), dist, { recursive: true });

for (const p of order) {
  if (p.source) mdPage(p.id, p.source);
  else if (p.special === 'ui') uiPage();
  else if (p.id === 'referencia') referencePage();
  else contentPage(p.id);
}
homePage();
out.set('guia.html', redirect('empezar.html', 'Guía'));
out.set('components.html', redirect('ui.html', 'Componentes'));
out.set('404.html', layout({ id: '404', title: 'Página no encontrada', description: 'Esa página no existe o se movió.', noToc: true, body: '<p>Prueba con el buscador del menú, o vuelve a la <a href="index.html">portada</a>.</p>' }).replace('<link rel="canonical" href="https://duvanjamid.github.io/angelite-docs/404.html">', ''));

for (const [file, html] of out) writeFileSync(join(dist, file), html);
writeFileSync(join(dist, 'search-index.json'), JSON.stringify(searchDocs));
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['index', ...order.map(p => p.id)].filter(id => out.has(`${id}.html`)).map(id => `  <url><loc>${SITE.url}/${id === 'index' ? '' : id + '.html'}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
writeFileSync(join(dist, '.nojekyll'), '');

for (const w of warnings) console.warn('warning:', w);
console.log(`built ${out.size} pages, ${searchDocs.length} in the search index -> dist/`);
