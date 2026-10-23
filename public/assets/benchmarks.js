(() => {
  const D = window.BENCH;
  const FW = ['lite-aot', 'lite', 'preact', 'vue', 'react', 'angular'];
  const NAME = { 'lite-aot': 'Lite precompilado', lite: 'Lite en navegador', preact: 'Preact', vue: 'Vue', react: 'React', angular: 'Angular' };
  const $ = id => document.getElementById(id);
  const f = D.frameworks;
  const LA = f['lite-aot'], LJ = f.lite;
  const fmt = (n, d = 1) => n.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d });
  const kb = n => fmt(n / 1024) + ' KB';

  $('legend').innerHTML = FW.map(k => `<span><i style="background:var(--c-${k})"></i>${NAME[k]}</span>`).join('');
  $('env').textContent = `${D.env.chromium} headless, ${D.env.cpus} CPU (${D.env.cpu}), Node ${D.env.node}, ${D.env.rounds} rondas × ${D.env.iterations} iteraciones`;
  $('when').textContent = new Date(D.generatedAt).toLocaleString('es-ES');
  $('versions').textContent = Object.entries(D.versions).map(([k, v]) => `${k === 'lite' ? 'AngeLite' : k} ${v}`).join(' · ');

  const TIE = 0.10; // within 10% of the best counts as a tie: below that the measurement cannot separate them
  function chart(title, values, unit, d = 1, note = '') {
    const max = Math.max(...FW.map(k => values[k]));
    const best = Math.min(...FW.map(k => values[k]));
    return `<div class="chart"><h3>${title}</h3>` + FW.slice().sort((a, b) => values[a] - values[b]).map(k =>
      `<div class="row${values[k] <= best * (1 + TIE) ? ' best' : ''}"><span><i class="sw" style="background:var(--c-${k})"></i>${NAME[k]}</span>
       <div><div class="bar" style="width:${(values[k] / max * 100).toFixed(1)}%;background:var(--c-${k})"></div></div>
       <span class="v">${fmt(values[k], d)} ${unit}</span></div>`).join('') + (note ? `<p class="small">${note}</p>` : '') + '</div>';
  }
  const pick = fn => Object.fromEntries(FW.map(k => [k, fn(f[k])]));

  $('size').innerHTML =
    chart('Min + gzip', pick(x => x.size.gzip / 1024), 'KB') +
    chart('Min + brotli', pick(x => x.size.brotli / 1024), 'KB') +
    chart('Min (sin comprimir)', pick(x => x.size.raw / 1024), 'KB');
  $('startup').innerHTML = chart('Arranque (mediana)', pick(x => x.startup.median), 'ms');
  $('memory').innerHTML =
    chart('Heap en reposo (0 filas)', pick(x => x.memory.idle), 'MB', 2) +
    chart('Heap con 1.000 filas', pick(x => x.memory.rows1k), 'MB', 2) +
    chart('Heap con 10.000 filas', pick(x => x.memory.rows10k), 'MB', 2);

  // operations table
  const head = '<tr><th>Operación</th>' + FW.map(k => `<th style="color:var(--c-${k})">${NAME[k]}</th>`).join('') + '</tr>';
  const rel = {};
  FW.forEach(k => rel[k] = []);
  const rows = D.benches.map(b => {
    const vals = FW.map(k => f[k].ops[b.id].median);
    const best = Math.min(...vals);
    FW.forEach((k, i) => rel[k].push(vals[i] / best));
    return `<tr><td>${b.label}</td>` + FW.map((k, i) => {
      const o = f[k].ops[b.id];
      return `<td class="${vals[i] <= best * (1 + TIE) ? 'best' : ''}" title="p10 ${fmt(o.p10)} – p90 ${fmt(o.p90)} ms (n=${o.n})">${fmt(vals[i])}</td>`;
    }).join('') + '</tr>';
  });
  $('ops').innerHTML = `<div class="chart"><table>${head}${rows.join('')}</table><p class="small">Milisegundos, mediana. En negrita, el más rápido y los que quedan a menos de un 10 % (empate técnico: la medición no los separa).</p></div>`;

  const geo = k => Math.exp(rel[k].reduce((s, r) => s + Math.log(r), 0) / rel[k].length);
  const score = Object.fromEntries(FW.map(k => [k, geo(k)]));
  $('score').innerHTML = chart('Puntuación global (media geométrica del tiempo relativo al mejor; 1,00 = el más rápido en todo)', score, '×', 2);

  // data-driven reading, so the text can never drift from the numbers
  const bestOf = (vals, low = true) => FW.reduce((a, b) => (low ? vals[b] < vals[a] : vals[b] > vals[a]) ? b : a);
  const rank = (vals, k) => FW.slice().sort((a, b) => vals[a] - vals[b]).indexOf(k) + 1;
  const ord = n => ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'][n - 1];
  const gz = pick(x => x.size.gzip / 1024), st = pick(x => x.startup.median), mem = pick(x => x.memory.rows10k);
  const metrics = { 'peso': gz, 'arranque': st, 'velocidad global': score, 'memoria': mem };
  // every individual measurement: size, startup, memory and each operation
  const all = {
    'peso': gz, 'arranque': st, 'memoria con 10.000 filas': mem,
    ...Object.fromEntries(D.benches.map(b => [b.label.toLowerCase(), Object.fromEntries(FW.map(k => [k, f[k].ops[b.id].median]))]))
  };
  const strict = [], tied = [], behind = [];
  for (const [name, v] of Object.entries(all)) {
    const best = Math.min(...FW.map(k => v[k]));
    if (v['lite-aot'] === best) strict.push(name);
    else if (v['lite-aot'] <= best * (1 + TIE)) tied.push(`${name} (${NAME[bestOf(v)]})`);
    else behind.push(`${name} (${NAME[bestOf(v)]}, +${Math.round((v['lite-aot'] / best - 1) * 100)} %)`);
  }
  const wins = strict, losses = behind;
  const slow = k => D.benches.filter(b => f[k].ops[b.id].median / Math.min(...FW.map(x => f[x].ops[b.id].median)) > 1.25).map(b => b.label.toLowerCase());
  const slowLA = slow('lite-aot');

  const bullets = [
    `<b>Peso</b>: Lite precompilado ${fmt(gz['lite-aot'])} KB gzip (${ord(rank(gz, 'lite-aot'))}); con las plantillas compiladas en el navegador ${fmt(gz.lite)} KB (${ord(rank(gz, 'lite'))}). Preact: ${fmt(gz.preact)} KB, Vue ${fmt(gz.vue)}, Angular ${fmt(gz.angular)}, React ${fmt(gz.react)}.`,
    `<b>Arranque</b>: ${fmt(st['lite-aot'], 1)} ms precompilado (${ord(rank(st, 'lite-aot'))}) y ${fmt(st.lite, 1)} ms con compilador en el navegador (${ord(rank(st, 'lite'))}); Preact ${fmt(st.preact, 1)} ms, React ${fmt(st.react, 1)} ms.${(f['lite-aot'].startup.p25 <= f.preact.startup.p75 && f.preact.startup.p25 <= f['lite-aot'].startup.p75) ? ' Los rangos de medición (p25–p75) de Lite precompilado y Preact se solapan: es un empate técnico, no una victoria clara.' : ''}`,
    `<b>Velocidad</b>: puntuación global ${fmt(score['lite-aot'], 2)}× precompilado y ${fmt(score.lite, 2)}× en navegador (${NAME[bestOf(score)]} es la mejor con ${fmt(score[bestOf(score)], 2)}×; ${NAME[bestOf(score, false)]}, la peor con ${fmt(score[bestOf(score, false)], 2)}×). ${slowLA.length ? `El precompilado tarda más de un 25 % más que el mejor en: ${slowLA.join(', ')}.` : 'El precompilado no queda a más de un 25 % del mejor en ninguna operación.'} Diferencias de pocos ms o por debajo del ~10 % están dentro del ruido.`,
    `<b>Memoria</b> con 10.000 filas: ${fmt(mem['lite-aot'], 1)} MB (${ord(rank(mem, 'lite-aot'))}), frente a ${fmt(mem.angular, 1)} MB de Angular, ${fmt(mem.preact, 1)} MB de Preact y ${fmt(mem.react, 1)} MB de React.`,
    `<b>En resumen</b> (${Object.keys(all).length} mediciones): Lite precompilado tiene la mediana más baja en ${strict.length} (${strict.join(', ')})${tied.length ? `; empata dentro del 10 % en ${tied.length}: ${tied.join(', ')}` : ''}${behind.length ? `; queda por detrás en ${behind.join(', ')}` : '; no queda por detrás en ninguna'}. El precio del modo precompilado es un paso de build (como el JSX de React/Preact o las plantillas de Vue/Angular); sin él, el modo en navegador mantiene la ergonomía de «un solo script».`
  ];
  $('reading').innerHTML = bullets.map(b => `<li>${b}</li>`).join('');

  $('summary').innerHTML = `<div class="cards">
    <div class="card"><b>${fmt(gz['lite-aot'])} KB</b><span>Lite precompilado, min+gzip (Preact: ${fmt(gz.preact)} KB)</span></div>
    <div class="card"><b>${fmt(gz.react / gz['lite-aot'], 1)}×</b><span>React pesa más que Lite precompilado</span></div>
    <div class="card"><b>${fmt(gz.angular / gz['lite-aot'], 1)}×</b><span>Angular pesa más que Lite precompilado</span></div>
    <div class="card"><b>${fmt(score['lite-aot'], 2)}×</b><span>velocidad global vs el mejor (${NAME[bestOf(score)]}: ${fmt(score[bestOf(score)], 2)}×)</span></div>
  </div>`;
})();
