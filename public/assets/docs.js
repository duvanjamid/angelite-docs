/* AngeLite documentation: sidebar (an overlay on small screens), theme, search, copy buttons, live examples, table of contents. */
(() => {
  const I = window.DOCS_I18N || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const mobile = matchMedia('(max-width: 900px)');

  /* ---------- theme ---------- */
  const themeBtn = $('#theme');
  const applyTheme = t => {
    if (t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    const dark = (t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    if (themeBtn) {
      themeBtn.textContent = dark ? '☀' : '☾';
      themeBtn.setAttribute('aria-label', dark ? I.themeToLight : I.themeToDark);
      themeBtn.title = themeBtn.getAttribute('aria-label');
    }
    root.dispatchEvent(new CustomEvent('themechange', { detail: dark ? 'dark' : 'light' }));
  };
  let saved = null;
  try { saved = localStorage.getItem('angelite-theme'); } catch (e) { /* private mode */ }
  applyTheme(saved);
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const dark = (root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    const next = dark ? 'light' : 'dark';
    try { localStorage.setItem('angelite-theme', next); } catch (e) { /* ignore */ }
    applyTheme(next);
  });

  /* ---------- language: remember the choice so the next page opens in it ---------- */
  const langBtn = $('.langbtn');
  if (langBtn) langBtn.addEventListener('click', () => { try { localStorage.setItem('angelite-lang', langBtn.dataset.lang); } catch (e) { /* private mode */ } });

  /* ---------- sidebar: slides over the content on small screens ---------- */
  const sidebar = $('#sidebar'), scrim = $('.scrim'), menuBtn = $('#menu'), closeBtn = $('.closebtn');
  const page = [$('#main'), $('.foot')].filter(Boolean);
  let opener = null;
  function setNav(open) {
    if (!sidebar) return;
    sidebar.dataset.open = open;
    if (scrim) scrim.dataset.open = open;
    document.body.dataset.navOpen = open;
    if (menuBtn) { menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? I.closeMenu : I.openMenu); }
    page.forEach(el => { el.inert = open && mobile.matches; }); // keeps focus and screen readers inside the menu while it overlaps the page
    if (open) { opener = document.activeElement; (closeBtn || $('input', sidebar)).focus(); }
    else if (opener && mobile.matches) { opener.focus(); opener = null; }
  }
  const isOpen = () => sidebar && sidebar.dataset.open === 'true';
  if (menuBtn) menuBtn.addEventListener('click', () => setNav(!isOpen()));
  if (scrim) scrim.addEventListener('click', () => setNav(false));
  if (closeBtn) closeBtn.addEventListener('click', () => setNav(false));
  if (sidebar) {
    sidebar.addEventListener('click', e => { if (e.target.closest('a') && mobile.matches) setNav(false); });
    sidebar.addEventListener('keydown', e => {
      if (!isOpen() || !mobile.matches || e.key !== 'Tab') return;
      const items = $$('a[href],button,input', sidebar).filter(el => el.offsetParent !== null);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    const current = $('[aria-current=page]', sidebar);
    // scroll only the menu (scrollIntoView would also scroll the page)
    if (current) sidebar.scrollTop = Math.max(0, current.offsetTop - sidebar.clientHeight / 2);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) setNav(false); });
  mobile.addEventListener('change', () => { if (!mobile.matches) { setNav(false); page.forEach(el => { el.inert = false; }); } });

  /* ---------- search ---------- */
  const box = $('#search'), list = $('#results');
  let index = null, active = -1;
  const load = () => index || (index = fetch(box.dataset.index).then(r => r.json()).catch(() => []));
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function mark(text, words) {
    let out = esc(text);
    for (const w of words) out = out.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>');
    return out;
  }
  async function run(q) {
    const words = norm(q).split(/\s+/).filter(w => w.length > 1);
    if (!words.length) { list.hidden = true; list.innerHTML = ''; return; }
    const docs = await load();
    const hits = [];
    for (const d of docs) {
      const title = norm(d.title), text = norm(d.text);
      let score = 0, where = null;
      for (const w of words) {
        if (title.includes(w)) score += 12;
        for (const h of d.headings) if (norm(h.text).includes(w)) { score += 6; where = where || h; }
        const at = text.indexOf(w);
        if (at >= 0) score += 1 + (text.split(w).length > 3 ? 1 : 0);
        else if (!title.includes(w) && !d.headings.some(h => norm(h.text).includes(w))) { score = 0; break; }
      }
      if (score > 0) hits.push({ d, score, where });
    }
    hits.sort((a, b) => b.score - a.score);
    list.innerHTML = hits.slice(0, 8).map(({ d, where }, i) => {
      const at = norm(d.text).indexOf(words[0]);
      const snippet = at >= 0 ? d.text.slice(Math.max(0, at - 30), at + 70) : d.group;
      return `<li><a href="${d.url}${where ? '#' + where.id : ''}" role="option" aria-selected="false" data-i="${i}">${mark(where ? `${d.title} › ${where.text}` : d.title, words)}<small>${mark(snippet, words)}</small></a></li>`;
    }).join('') || `<li><a href="#" role="option" aria-disabled="true">${I.noResults}<small>${I.tryAnother}</small></a></li>`;
    list.hidden = false;
    active = -1;
  }
  if (box && list) {
    box.addEventListener('input', () => run(box.value));
    box.addEventListener('focus', load);
    box.addEventListener('keydown', e => {
      const items = $$('a[href]:not([href="#"])', list);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((a, i) => a.setAttribute('aria-selected', String(i === active)));
        items[active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && items[Math.max(active, 0)]) { location.href = items[Math.max(active, 0)].href; }
      else if (e.key === 'Escape') { box.value = ''; list.hidden = true; }
    });
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if (((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
        e.preventDefault();
        if (mobile.matches && !isOpen()) setNav(true);
        box.focus();
        box.select();
      }
    });
  }

  /* ---------- copy buttons ---------- */
  $$('.codebox').forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'copy';
    btn.type = 'button';
    btn.textContent = I.copy;
    btn.addEventListener('click', async () => {
      const code = $('code', b).textContent;
      try { await navigator.clipboard.writeText(code); btn.textContent = I.copied; } catch (e) { btn.textContent = I.copyFailed; }
      setTimeout(() => { btn.textContent = I.copy; }, 1500);
    });
    b.append(btn);
  });

  /* ---------- live examples ---------- */
  const runners = $$('.example[data-run]');
  if (runners.length && window.AngeLite) {
    const Ng = Object.assign({}, window.AngeLite, window.AngeLiteAddons || {});
    for (const ex of runners) {
      const demo = $('.demo', ex);
      try { new Function('AngeLite', 'AngeLiteUI', 'root', $('script.src', ex).textContent)(Ng, window.AngeLiteUI, demo); }
      catch (e) { demo.textContent = I.error + e.message; }
    }
  }

  /* ---------- table of contents: highlight the section being read ---------- */
  const links = $$('.toc a');
  if (links.length && 'IntersectionObserver' in window) {
    const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      for (const e of entries) (e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id));
      const first = [...byId.keys()].find(id => seen.has(id));
      if (first) links.forEach(a => a.setAttribute('aria-current', String(a === byId.get(first))));
    }, { rootMargin: '-64px 0px -65% 0px' });
    byId.forEach((_, id) => { const h = document.getElementById(id); if (h) io.observe(h); });
  }
})();
