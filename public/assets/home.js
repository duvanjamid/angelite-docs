/* Home page: the numbers come from the benchmark and the feature table, so they cannot go stale. */
(() => {
  const B = window.BENCH, F = window.FEATURES, el = document.getElementById('stats');
  if (!B || !F || !el) return;
  const fw = B.frameworks;
  const num = (n, d = 1) => n.toLocaleString('es-ES', { maximumFractionDigits: d });
  const kb = n => num(n / 1024);
  const score = k => F.groups.reduce((s, g) => s + g.rows.reduce((t, r) => t + { y: 1, p: 0.5, n: 0 }[r.cells[k][0]], 0), 0);
  const rows = F.groups.reduce((n, g) => n + g.rows.length, 0);
  const best = Math.max(...['preact', 'vue', 'react', 'angular'].map(score));
  const stats = [
    [`${kb(fw['angelite-aot'].size.gzip)} KB`, `app precompilada, min+gzip (Preact ${kb(fw.preact.size.gzip)} KB)`],
    [`${num(fw['angelite-aot'].memory.rows10k)} MB`, `memoria con 10.000 filas (Angular ${num(fw.angular.memory.rows10k)} MB)`],
    [`${num(score('angelite'))} de ${rows}`, `características cubiertas (la mejor de las demás: ${num(best)})`],
    ['0', 'dependencias de runtime; sin eval ni new Function']
  ];
  el.innerHTML = stats.map(([a, b]) => `<div class="stat"><b>${a}</b><span>${b}</span></div>`).join('');
})();
