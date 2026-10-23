// Opens every page in headless Chromium at phone and desktop widths and checks what a build cannot:
// no console errors, no horizontal scroll, the live examples run, the sidebar overlays the content on small screens,
// search and the theme switch work.   node scripts/browser-check.mjs   (needs playwright-core and a Chromium)
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

const pages = readdirSync(root).filter(f => f.endsWith('.html') && !['guia.html', 'components.html'].includes(f));
let failures = 0;
const fail = (where, what) => { failures++; console.log(`FAIL ${where}: ${what}`); };

for (const [name, size] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  for (const file of pages) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', r => errors.push('request failed: ' + r.url()));
    page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`${base}/${file}`);
    await page.waitForTimeout(file === 'ui.html' ? 900 : 300);
    const where = `${name} ${file}`;
    if (errors.length) fail(where, errors.slice(0, 3).join(' | '));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 1) {
      const culprit = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.tablewrap,pre,.demo,.feat,.sidebar,.preview,.chart,.pg-stage')).slice(0, 3).map(e => e.tagName + '.' + e.className));
      if (culprit.length) fail(where, `horizontal overflow of ${overflow}px (${culprit.join(', ')})`);
    }
    const bad = await page.$$eval('.demo', els => els.filter(e => /^Error/.test(e.textContent)).map(e => e.textContent));
    if (bad.length) fail(where, `a live example failed: ${bad[0]}`);
    const h1 = await page.$$eval('h1', e => e.length);
    if (h1 !== 1) fail(where, `${h1} h1 elements`);
    await page.close();
  }
  await ctx.close();
}

// the sidebar on a phone
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/empezar.html`);
  const hidden = await page.evaluate(() => getComputedStyle(document.getElementById('sidebar')).visibility);
  if (hidden !== 'hidden') fail('phone sidebar', `visible before opening (${hidden})`);
  await page.click('#menu');
  await page.waitForTimeout(350);
  const state = await page.evaluate(() => ({
    open: document.getElementById('sidebar').dataset.open, expanded: document.getElementById('menu').getAttribute('aria-expanded'),
    inert: document.getElementById('main').inert, box: document.getElementById('sidebar').getBoundingClientRect().toJSON(), focus: document.activeElement.className
  }));
  if (state.open !== 'true' || state.expanded !== 'true') fail('phone sidebar', 'did not open');
  if (!state.inert) fail('phone sidebar', 'the page behind is not inert');
  if (state.box.left < -1 || state.box.width > 330) fail('phone sidebar', `bad geometry ${JSON.stringify(state.box)}`);
  const overlaps = await page.evaluate(() => { const s = document.getElementById('sidebar').getBoundingClientRect(), a = document.querySelector('article').getBoundingClientRect(); return s.right > a.left && s.left < a.right; });
  if (!overlaps) fail('phone sidebar', 'it does not overlap the content');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  if ((await page.evaluate(() => document.getElementById('sidebar').dataset.open)) !== 'false') fail('phone sidebar', 'Escape does not close it');
  await page.click('#menu');
  await page.waitForTimeout(300);
  await page.mouse.click(370, 400);
  await page.waitForTimeout(300);
  if ((await page.evaluate(() => document.getElementById('sidebar').dataset.open)) !== 'false') fail('phone sidebar', 'the backdrop does not close it');
  await page.click('#menu');
  await page.waitForTimeout(300);
  await page.click('#sidebar a[href="router.html"]');
  await page.waitForURL('**/router.html');
  await ctx.close();
}

// desktop: sidebar always visible, search, theme
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/index.html`);
  if ((await page.evaluate(() => getComputedStyle(document.getElementById('sidebar')).visibility)) !== 'visible') fail('desktop sidebar', 'hidden');
  if (!(await page.evaluate(() => getComputedStyle(document.getElementById('menu')).display === 'none'))) fail('desktop', 'menu button is shown');
  await page.keyboard.press('/');
  await page.keyboard.type('portal');
  await page.waitForTimeout(400);
  const hits = await page.$$eval('#results a', a => a.map(x => x.getAttribute('href')));
  if (!hits.some(h => h.startsWith('componentes.html'))) fail('search', `"portal" did not find the components chapter: ${hits.join(', ')}`);
  await page.keyboard.press('Enter');
  await page.waitForURL('**/componentes.html*');
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('#theme');
  const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (before === after) fail('theme', 'the switch does not change the page colors');
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} problem(s)` : `ok: ${pages.length} pages at 2 widths, sidebar, search and theme`);
process.exit(failures ? 1 : 0);
