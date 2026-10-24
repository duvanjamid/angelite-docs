/* Home page: the numbers come from the benchmark and the feature table, so they cannot go stale. */
(() => {
  const B = window.BENCH, F = window.FEATURES, I = window.DOCS_I18N, el = document.getElementById('stats');
  const tpl = (str, v) => str.replace(/\{(\w+)\}/g, (_, k) => v[k]);
  if (!B || !F || !el) return;
  const fw = B.frameworks;
  const num = (n, d = 1) => n.toLocaleString(I.locale, { maximumFractionDigits: d });
  const kb = n => num(n / 1024);
  const score = k => F.groups.reduce((s, g) => s + g.rows.reduce((t, r) => t + { y: 1, p: 0.5, n: 0 }[r.cells[k][0]], 0), 0);
  const rows = F.groups.reduce((n, g) => n + g.rows.length, 0);
  const best = Math.max(...['preact', 'vue', 'react', 'angular'].map(score));
  const stats = [
    [`${kb(fw['angelite-aot'].size.gzip)} KB`, tpl(I.statSize, { preact: kb(fw.preact.size.gzip) })],
    [`${num(fw['angelite-aot'].memory.rows10k)} MB`, tpl(I.statMemory, { angular: num(fw.angular.memory.rows10k) })],
    [`${num(score('angelite'))} ${I.of} ${rows}`, tpl(I.statFeatures, { best: num(best) })],
    ['0', I.statDeps]
  ];
  el.innerHTML = stats.map(([a, b]) => `<div class="stat"><b>${a}</b><span>${b}</span></div>`).join('');
})();
