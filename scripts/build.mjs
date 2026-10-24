// Builds the documentation site into dist/: pages from content/*.html and analysis/*.md, the API reference from the
// type definitions, the search index, the sitemap and the static files in public/.
//   npm run build
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { marked } from 'marked';
import { T, LANGS } from './strings.mjs';
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

/* current language: the build runs once per language (English at the root, Spanish in /es/) */
let L = 'en', S = T.en, P = '', A = '';
const setLang = lang => { L = lang; S = T[lang]; P = lang === 'en' ? '' : `${lang}/`; A = lang === 'en' ? '' : '../'; };
const tr = v => (v && typeof v === 'object' ? v[L] ?? v.en : v);

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
    const title = (/data-title="([^"]*)"/.exec(attrs) || [, S.example])[1];
    const code = body.replace(/^\n/, '').replace(/\s+$/, '');
    const box = codebox(code, 'javascript');
    return `<div class="example" data-run><div class="tag"><span>${title}</span><span>${S.live}</span></div><div class="demo" aria-live="polite"></div>` +
      `<details><summary>${S.viewCode}</summary>${box}</details><script type="text/plain" class="src">${code.replace(/<\/script/gi, '<\\/script')}</script></div>`;
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
    return `<h${level} id="${key}">${inner}<a class="anchor" href="#${key}" aria-label="${S.anchor} ${esc(plain)}">#</a></h${level}>`;
  });
  return { html: out, toc };
}


const pagesById = new Map();
nav.groups.forEach(g => g.pages.forEach(p => pagesById.set(p.id, { ...p, groupObj: g })));
const order = [...pagesById.values()];
const pageTitle = p => tr(p.title), groupTitle = p => (p.groupObj ? tr(p.groupObj.title) : '');

/** Shared files live at the site root; language-specific ones next to the page or with a language suffix. */
function asset(p) {
  if (p === 'ui-meta.js') return p;
  if (p === 'features-data.js' && L !== 'en') return `${A}features-data.${L}.js`;
  if (p === 'ui-examples.js' && L !== 'en') return `${A}ui-examples.${L}.js`;
  return A + p;
}

function sidebar(currentId, extra) {
  return nav.groups.map(g => `<h2>${esc(tr(g.title))}</h2>${g.hint ? `<p class="hint">${esc(tr(g.hint))}</p>` : ''}<ul${g.steps ? ' class="steps"' : ''}>${g.pages.map(p => {
    const cur = p.id === currentId;
    const sub = cur && extra ? extra : '';
    return `<li><a href="${p.id}.html"${cur ? ' aria-current="page"' : ''}>${esc(tr(p.title))}</a>${sub}</li>`;
  }).join('')}</ul>`).join('');
}

const otherLang = () => LANGS.find(l => l !== L);
/** URL of the same page in the other language, relative to the current page. */
const altHref = id => (L === 'en' ? `es/${id}.html` : `../${id}.html`);

function layout({ id, title, description, body, toc = [], scripts = [], styles = [], wide = false, sideExtra = '', source = '', noToc = false, bare = false }) {
  const page = pagesById.get(id) || { title, groupObj: null };
  const idx = order.findIndex(p => p.id === id);
  const prev = idx > 0 ? order[idx - 1] : null, next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  const showToc = !noToc && toc.length > 1;
  const tocHtml = showToc ? `<aside class="toc" aria-label="${S.onThisPage}"><h2>${S.onThisPage}</h2><ul>${toc.map(t => `<li class="l${t.level}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ul></aside>` : '';
  const url = `${SITE.url}/${P}${id}.html`;
  const pager = `<nav class="pager" aria-label="${S.pagesLabel}">${prev ? `<a class="prev" href="${prev.id}.html"><small>${S.prev}</small>${esc(pageTitle(prev))}</a>` : '<span></span>'}${next ? `<a class="next" href="${next.id}.html"><small>${S.next}</small>${esc(pageTitle(next))}</a>` : ''}</nav>`;
  const edit = source ? `<a href="${SITE.docsRepo}/blob/main/${source}">${S.edit}</a>` : '';
  const o = otherLang();
  const alt = id === '404' ? '' : `<link rel="alternate" hreflang="${o}" href="${SITE.url}/${o === 'en' ? '' : o + '/'}${id}.html"><link rel="alternate" hreflang="${L}" href="${url}"><link rel="alternate" hreflang="x-default" href="${SITE.url}/${id}.html">`;
  const switcher = id === '404' ? '' : `<a class="langbtn" href="${altHref(id)}" hreflang="${o}" lang="${o}" data-lang="${o}" title="${T[o].switchTo}" aria-label="${T[o].switchTo}"><b>${T[L].short}</b><span aria-hidden="true">/</span><i>${T[o].short}</i></a>`;
  const i18n = `window.DOCS_LANG=${JSON.stringify(L)};window.DOCS_I18N=${JSON.stringify(S.js)};`;
  return `<!doctype html>
<html lang="${S.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · AngeLite</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#d6336c">
<link rel="canonical" href="${url}">
${alt}
<link rel="icon" href="${A}favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${esc(title)} · AngeLite">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<script>try{var t=localStorage.getItem('angelite-theme');if(t)document.documentElement.setAttribute('data-theme',t);var l=localStorage.getItem('angelite-lang');if(l&&l!=='${L}'&&${id !== '404'}){var u=${JSON.stringify(altHref(id))};if(l==='${otherLang()}')location.replace(u+location.hash)}}catch(e){}</script>
<link rel="stylesheet" href="${A}assets/docs.css">
${styles.map(h => `<link rel="stylesheet" href="${asset(h)}">`).join('\n')}
</head>
<body>
<a class="skip" href="#main">${S.skip}</a>
<header class="topbar">
  <button class="iconbtn menu-btn" id="menu" type="button" aria-controls="sidebar" aria-expanded="false" aria-label="${S.openMenu}">☰</button>
  <a class="brand" href="index.html"><img src="${A}assets/icon.svg" alt="" width="30" height="31"><span><span class="w1">Ang</span><span class="w2">elite</span></span><small>docs</small></a>
  <span class="spacer"></span>
  <nav class="toplinks" aria-label="${S.linksLabel}"><a href="getting-started.html">${S.guide}</a><a href="ui.html">${S.components}</a><a href="api.html">${S.api}</a><a href="benchmarks.html">${S.benchmark}</a></nav>
  ${switcher}
  <a class="iconbtn" href="${SITE.repo}" aria-label="${S.github}" title="${S.github}"><svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>
  <button class="iconbtn" id="theme" type="button" aria-label="${S.theme}">☾</button>
</header>
<div class="shell">
  <nav class="sidebar" id="sidebar" aria-label="${S.docsLabel}" data-open="false">
    <button class="closebtn" type="button" aria-label="${S.closeMenu}">×</button>
    <div class="brandrow"><a class="brand" href="index.html"><img src="${A}assets/icon.svg" alt="" width="30" height="31"><span><span class="w1">Ang</span><span class="w2">elite</span></span></a></div>
    <div class="search"><input id="search" type="search" placeholder="${S.searchPlaceholder}" aria-label="${S.searchLabel}" autocomplete="off" data-index="search-index.json" aria-controls="results"><kbd aria-hidden="true">/</kbd></div>
    <ul class="results" id="results" role="listbox" aria-label="${S.results}" hidden></ul>
    ${sidebar(id, sideExtra)}
  </nav>
  <div class="scrim" data-open="false"></div>
  <div class="main${showToc ? '' : ' no-toc'}${wide ? ' wide' : ''}" id="main" tabindex="-1">
    <article>
      ${id === 'index' ? '' : `<p class="crumbs"><a href="index.html">${S.home}</a>${groupTitle(page) ? ` › ${esc(groupTitle(page))}` : ''}</p>`}
      <h1>${esc(title)}</h1>
      ${description ? `<p class="lead">${esc(description)}</p>` : ''}
${body}
      ${pager}
    </article>
    ${tocHtml}
  </div>
</div>
<footer class="foot">AngeLite · <a href="${SITE.repo}">${S.footerCode}</a> · <a href="${SITE.docsRepo}">${S.footerDocs}</a> ${edit ? '· ' + edit : ''}</footer>
<script>${i18n}</script>
${scripts.map(x => `<script src="${asset(x)}"></script>`).join('\n')}
<script src="${A}assets/docs.js"></script>
</body>
</html>
`;
}

/* ---------- content pages ---------- */

let out, searchDocs;     // per language: file name -> html, and the search index
const warnings = [];

function addSearch({ id, title, toc, text }) {
  const p = pagesById.get(id);
  searchDocs.push({ url: `${id}.html`, title, group: p ? groupTitle(p) : '', headings: toc.map(t => ({ id: t.id, text: t.text })), text: text.slice(0, 6000) });
}

const LIB = ['angelite.min.js', 'angelite-addons.min.js'];

function readMeta(file) {
  const raw = readFileSync(file, 'utf8');
  const m = /^<!--(\{[\s\S]*?\})-->\s*/.exec(raw);
  if (!m) throw new Error(`${file}: missing the <!--{"title":...}--> header`);
  return { meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
}

function contentPage(id) {
  const file = join(root, 'content', L, `${id}.html`);
  if (!existsSync(file)) { warnings.push(`${L}: content/${L}/${id}.html is missing`); return; }
  const { meta, body: raw } = readMeta(file);
  const processed = processBlocks(raw);
  const { html, toc } = headings(processed);
  const scripts = [...(meta.examples ? LIB : []), ...(meta.ui ? ['angelite-ui.min.js'] : []), ...(meta.scripts || []), ...(meta.inline || [])];
  out.set(`${id}.html`, layout({ id, title: meta.title, description: meta.description || '', body: html, toc, scripts, styles: meta.css || [], wide: !!meta.wide, noToc: !!meta.noToc, source: `content/${L}/${id}.html` }));
  addSearch({ id, title: meta.title, toc, text: stripTags(raw) });
}

/* ---------- markdown pages ---------- */

function mdPage(id, source) {
  // Spanish pages use analysis/es/<file> when it exists; otherwise the English file, with a note
  const localized = join('analysis', L, source.split('/').pop());
  const useLocal = L !== 'en' && existsSync(join(root, localized));
  const file = useLocal ? localized : source;
  const text = readFileSync(join(root, file), 'utf8');
  const tokens = marked.lexer(text);
  const h1 = tokens.find(t => t.type === 'heading' && t.depth === 1);
  const title = pageTitle(pagesById.get(id));
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
  const note = L !== 'en' && !useLocal ? `<div class="callout"><span class="t">English</span><p>${S.englishOnly}</p></div>` : '';
  const rendered = note + marked.parser(tokens, { renderer, gfm: true });
  const { html, toc } = headings(rendered);
  out.set(`${id}.html`, layout({ id, title, description, body: html, toc, source: file }));
  addSearch({ id, title, toc, text: stripTags(rendered) });
}

/* ---------- API reference, generated from the type definitions ---------- */

const MODULES = [
  { file: 'angelite.d.ts', id: 'angelite', name: '@duvanjamid/angelite' },
  { file: 'forms.d.ts', id: 'forms', name: '@duvanjamid/angelite/forms' },
  { file: 'http.d.ts', id: 'http', name: '@duvanjamid/angelite/http' },
  { file: 'i18n.d.ts', id: 'i18n', name: '@duvanjamid/angelite/i18n' },
  { file: 'hydrate.d.ts', id: 'hydrate', name: '@duvanjamid/angelite/hydrate' },
  { file: 'devtools.d.ts', id: 'devtools', name: '@duvanjamid/angelite/devtools' },
  { file: 'testing.d.ts', id: 'testing', name: '@duvanjamid/angelite/testing' },
  { file: 'ssr.d.mts', id: 'ssr', name: '@duvanjamid/angelite/tools/ssr.mjs' },
  { file: 'aot.d.mts', id: 'aot', name: '@duvanjamid/angelite/tools/aot.mjs' },
  { file: 'vite.d.mts', id: 'vite', name: '@duvanjamid/angelite/tools/vite.mjs' },
  { file: 'check.d.mts', id: 'check', name: '@duvanjamid/angelite/tools/check.mjs' }
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
      const head = e.section && e.section !== lastSection ? `<h3 class="refsec" id="${m.id}-sec-${slug(e.section)}">${esc(S.sections[e.section] || e.section[0].toUpperCase() + e.section.slice(1))}</h3>` : '';
      lastSection = e.section;
      const sig = e.lines.join('\n').replace(/\s+$/, '');
      return `${head}<section class="ref" id="${eid}"><h4><code>${esc(e.name)}</code><a class="anchor" href="#${eid}" aria-label="${S.anchor} ${esc(e.name)}">#</a></h4>${e.doc ? `<p>${esc(e.doc)}</p>` : ''}${codebox(sig, 'typescript')}</section>`;
    }).join('\n');
    parts.push(`<h2 id="${m.id}">${esc(m.name)}</h2><p>${esc(S.modules[m.id])} <code>import { … } from '${esc(m.name)}'</code></p>${body}`);
  }
  const intro = `<p class="lead" style="display:none"></p><div class="callout"><span class="t">${S.apiIntroTitle}</span><p>${S.apiIntro}</p></div>`;
  const { html, toc } = headings(parts.join('\n'));
  // the table of contents lists modules only (the entries would make it endless)
  const modulesToc = toc.filter(t => t.level === 2);
  out.set('api.html', layout({ id: 'api', title: S.apiTitle, description: S.apiDesc, body: intro + html, toc: modulesToc, source: 'scripts/build.mjs' }));
  addSearch({ id: 'api', title: S.apiTitle, toc: toc.filter(t => t.level === 2 || t.level === 4), text: stripTags(html) });
}

/* ---------- the component library page (an AngeLite app, see public/assets/ui-app.js) ---------- */

/** English metadata comes from the library; Spanish text is an overlay keyed by component id (data/ui-meta.es.json). */
function uiMeta() {
  const metaFile = join(root, 'data', 'ui-meta.json');
  if (!existsSync(metaFile)) return null;
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  if (L === 'en') return meta;
  const ovFile = join(root, 'data', `ui-meta.${L}.json`);
  if (!existsSync(ovFile)) return meta;
  const ov = JSON.parse(readFileSync(ovFile, 'utf8'));
  const groupName = new Map(meta.groups.map((g, i) => [g, ov.groups[i] || g]));
  return {
    groups: ov.groups,
    components: meta.components.map(c => {
      const o = ov.components[c.id];
      if (!o) { warnings.push(`ui-meta.${L}.json has no entry for ${c.id}`); return { ...c, group: groupName.get(c.group) }; }
      return { ...c, group: groupName.get(c.group), summary: o.summary, a11y: o.a11y,
        inputs: c.inputs.map(i => ({ ...i, desc: o.inputs[i.name] ?? i.desc })),
        outputs: c.outputs.map(x => ({ ...x, desc: (o.outputs[x.name] || {}).desc ?? x.desc })),
        slots: c.slots.map(x => ({ ...x, name: x.name === '(default)' ? '(por defecto)' : x.name, desc: o.slots[x.name === '(default)' ? '(por defecto)' : x.name] ?? x.desc })) };
    })
  };
}

function uiPage() {
  const meta = uiMeta();
  if (!meta) { warnings.push('ui: data/ui-meta.json not found (run npm run sync)'); return; }
  const sub = `<div class="uinav">${meta.groups.map(g => `<div class="uigroup"><a class="uig" href="ui.html#group-${slug(g)}">${esc(g)}</a><div class="chips">${meta.components.filter(c => c.group === g).map(c => `<a href="ui.html#${c.id}">${esc(c.name)}</a>`).join('')}</div></div>`).join('')}</div>`;
  const body = `<noscript><p>${S.uiNoscript}</p></noscript><div id="app" aria-live="polite"><p>${S.uiLoading}</p></div>`;
  out.set('ui.html', layout({ id: 'ui', title: S.uiTitle, description: S.uiDesc(meta.components.length), body, scripts: [...LIB, 'angelite-ui.min.js', 'ui-meta.js', 'ui-examples.js', 'assets/ui-app.js'], wide: true, noToc: true, sideExtra: sub, source: 'public/assets/ui-app.js' }));
  addSearch({ id: 'ui', title: S.uiTitle, toc: meta.components.map(c => ({ id: c.id, text: c.name })), text: meta.components.map(c => `${c.name} ${c.summary} ${c.a11y} ${c.inputs.map(i => i.name + ' ' + i.desc).join(' ')}`).join(' ') });
  writeFileSync(join(dist, P, 'ui-meta.js'), `window.UI_META = ${JSON.stringify(meta)};\n`);
}

/* ---------- home, redirects, 404 ---------- */

function homePage() {
  const { meta, body: raw } = readMeta(join(root, 'content', L, 'index.html'));
  const { html, toc } = headings(processBlocks(raw));
  out.set('index.html', layout({ id: 'index', title: meta.title, description: meta.description, body: html, toc, noToc: true, wide: true, scripts: [...LIB, 'benchmarks-data.js', 'features-data.js', 'assets/home.js'], source: `content/${L}/index.html` }));
  addSearch({ id: 'index', title: meta.title, toc, text: stripTags(raw) });
}

const redirect = (to, why, lang = 'en') => `<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>${why}</title><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${SITE.url}/${to}"><p><a href="${to}">${T[lang].moved} ${to}</a></p></html>\n`;

/* ---------- run ---------- */

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'public'), dist, { recursive: true });
mkdirSync(join(dist, 'es'), { recursive: true });

const built = {};
for (const lang of LANGS) {
  setLang(lang);
  out = new Map();
  searchDocs = [];
  for (const p of order) {
    if (p.source) mdPage(p.id, p.source);
    else if (p.special === 'ui') uiPage();
    else if (p.id === 'api') referencePage();
    else contentPage(p.id);
  }
  homePage();
  out.set('404.html', layout({ id: '404', title: S.notFoundTitle, description: S.notFoundDesc, noToc: true, body: `<p>${S.notFoundBody}</p>` }).replace(/<link rel="canonical"[^>]*>\n/, ''));
  for (const [file, html] of out) writeFileSync(join(dist, P, file), html);
  writeFileSync(join(dist, P, 'search-index.json'), JSON.stringify(searchDocs));
  built[lang] = new Set(out.keys());
}

// the old Spanish URLs (before the site was bilingual) now live under /es/
const OLD = { empezar: 'getting-started', diferencias: 'from-angular', plantillas: 'templates', componentes: 'components', formularios: 'forms', datos: 'data', servidor: 'server', seguridad: 'security', herramientas: 'tools', rendimiento: 'performance', referencia: 'api', comparativa: 'comparison', analisis: 'analysis', cambios: 'changelog', 'politica-seguridad': 'security-policy', guia: 'getting-started' };
for (const [old, now] of Object.entries(OLD)) writeFileSync(join(dist, `${old}.html`), redirect(`es/${now}.html`, old, 'es'));

const urls = [];
for (const id of ['index', ...order.map(p => p.id)]) {
  if (!built.en.has(`${id}.html`)) continue;
  const en = `${SITE.url}/${id === 'index' ? '' : id + '.html'}`, es = `${SITE.url}/es/${id === 'index' ? '' : id + '.html'}`;
  const links = `<xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="es" href="${es}"/>`;
  urls.push(`  <url><loc>${en}</loc>${links}</url>`, `  <url><loc>${es}</loc>${links}</url>`);
}
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
writeFileSync(join(dist, '.nojekyll'), '');

for (const w of warnings) console.warn('warning:', w);
console.log(`built ${built.en.size + built.es.size} pages (${built.en.size} en, ${built.es.size} es) -> dist/`);
