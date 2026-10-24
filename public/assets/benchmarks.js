(() => {
  const D = window.BENCH, I = window.DOCS_I18N, B = I.b;
  const tpl = (str, v) => str.replace(/\{(\w+)\}/g, (_, k) => v[k]);
  const FW = ['angelite-aot', 'angelite', 'preact', 'vue', 'react', 'angular'];
  const NAME = { 'angelite-aot': B.precompiled, angelite: B.inBrowser, preact: 'Preact', vue: 'Vue', react: 'React', angular: 'Angular' };
  const $ = id => document.getElementById(id);
  const f = D.frameworks;
  const LA = f['angelite-aot'], LJ = f.angelite;
  const fmt = (n, d = 1) => n.toLocaleString(I.locale, { maximumFractionDigits: d, minimumFractionDigits: d });
  const kb = n => fmt(n / 1024) + ' KB';

  $('legend').innerHTML = FW.map(k => `<span><i style="background:var(--c-${k})"></i>${NAME[k]}</span>`).join('');
  $('env').textContent = tpl(B.env, D.env);
  $('when').textContent = new Date(D.generatedAt).toLocaleString(I.locale);
  $('versions').textContent = Object.entries(D.versions).map(([k, v]) => `${k === 'angelite' ? 'AngeLite' : k} ${v}`).join(' · ');

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
    chart(B.gz, pick(x => x.size.gzip / 1024), 'KB') +
    chart(B.br, pick(x => x.size.brotli / 1024), 'KB') +
    chart(B.raw, pick(x => x.size.raw / 1024), 'KB');
  $('startup').innerHTML = chart(B.startup, pick(x => x.startup.median), 'ms');
  $('memory').innerHTML =
    chart(B.idle, pick(x => x.memory.idle), 'MB', 2) +
    chart(B.rows1k, pick(x => x.memory.rows1k), 'MB', 2) +
    chart(B.rows10k, pick(x => x.memory.rows10k), 'MB', 2);

  // operations table
  const head = '<tr><th>' + B.operation + '</th>' + FW.map(k => `<th style="color:var(--c-${k})">${NAME[k]}</th>`).join('') + '</tr>';
  const rel = {};
  FW.forEach(k => rel[k] = []);
  const rows = D.benches.map(b => {
    b = { ...b, label: B.labels[b.id] || b.label };
    const vals = FW.map(k => f[k].ops[b.id].median);
    const best = Math.min(...vals);
    FW.forEach((k, i) => rel[k].push(vals[i] / best));
    return `<tr><td>${b.label}</td>` + FW.map((k, i) => {
      const o = f[k].ops[b.id];
      return `<td class="${vals[i] <= best * (1 + TIE) ? 'best' : ''}" title="p10 ${fmt(o.p10)} – p90 ${fmt(o.p90)} ms (n=${o.n})">${fmt(vals[i])}</td>`;
    }).join('') + '</tr>';
  });
  $('ops').innerHTML = `<div class="chart"><table>${head}${rows.join('')}</table><p class="small">${B.opsNote}</p></div>`;

  const geo = k => Math.exp(rel[k].reduce((s, r) => s + Math.log(r), 0) / rel[k].length);
  const score = Object.fromEntries(FW.map(k => [k, geo(k)]));
  $('score').innerHTML = chart(B.scoreTitle, score, '×', 2);

  // data-driven reading, so the text can never drift from the numbers
  const bestOf = (vals, low = true) => FW.reduce((a, b) => (low ? vals[b] < vals[a] : vals[b] > vals[a]) ? b : a);
  const rank = (vals, k) => FW.slice().sort((a, b) => vals[a] - vals[b]).indexOf(k) + 1;
  const ord = n => B.ord[n - 1];
  const lab = x => B.labels[x.id] || x.label;
  const gz = pick(x => x.size.gzip / 1024), st = pick(x => x.startup.median), mem = pick(x => x.memory.rows10k);
    // every individual measurement: size, startup, memory and each operation
  const all = {
    [B.mSize]: gz, [B.mStartup]: st, [B.mMemory]: mem,
    ...Object.fromEntries(D.benches.map(b => [lab(b).toLowerCase(), Object.fromEntries(FW.map(k => [k, f[k].ops[b.id].median]))]))
  };
  const strict = [], tied = [], behind = [];
  for (const [name, v] of Object.entries(all)) {
    const best = Math.min(...FW.map(k => v[k]));
    if (v['angelite-aot'] === best) strict.push(name);
    else if (v['angelite-aot'] <= best * (1 + TIE)) tied.push(`${name} (${NAME[bestOf(v)]})`);
    else behind.push(`${name} (${NAME[bestOf(v)]}, +${Math.round((v['angelite-aot'] / best - 1) * 100)} %)`);
  }
  const wins = strict, losses = behind;
  const slow = k => D.benches.filter(b => f[k].ops[b.id].median / Math.min(...FW.map(x => f[x].ops[b.id].median)) > 1.25).map(b => lab(b).toLowerCase());
  const slowLA = slow('angelite-aot');

  const R = (v, d = 1) => fmt(v, d);
  const overlap = f['angelite-aot'].startup.p25 <= f.preact.startup.p75 && f.preact.startup.p25 <= f['angelite-aot'].startup.p75;
  const bullets = [
    tpl(B.size, { la: R(gz['angelite-aot']), laRank: ord(rank(gz, 'angelite-aot')), lj: R(gz.angelite), ljRank: ord(rank(gz, 'angelite')), preact: R(gz.preact), vue: R(gz.vue), angular: R(gz.angular), react: R(gz.react) }),
    tpl(B.start, { la: R(st['angelite-aot']), laRank: ord(rank(st, 'angelite-aot')), lj: R(st.angelite), ljRank: ord(rank(st, 'angelite')), preact: R(st.preact), react: R(st.react) }) + (overlap ? B.overlap : ''),
    tpl(B.speed, { la: R(score['angelite-aot'], 2), lj: R(score.angelite, 2), best: NAME[bestOf(score)], bestV: R(score[bestOf(score)], 2), worst: NAME[bestOf(score, false)], worstV: R(score[bestOf(score, false)], 2), slow: slowLA.length ? tpl(B.slow, { list: slowLA.join(', ') }) : B.noSlow }),
    tpl(B.memory, { la: R(mem['angelite-aot']), laRank: ord(rank(mem, 'angelite-aot')), angular: R(mem.angular), preact: R(mem.preact), react: R(mem.react) }),
    tpl(B.summary, { n: Object.keys(all).length, strict: strict.length, strictList: strict.join(', '), tied: tied.length ? tpl(B.tied, { n: tied.length, list: tied.join(', ') }) : '', behind: behind.length ? tpl(B.behind, { list: behind.join(', ') }) : B.notBehind })
  ];
  $('reading').innerHTML = bullets.map(b => `<li>${b}</li>`).join('');

  $('summary').innerHTML = `<div class="cards">
    <div class="card"><b>${fmt(gz['angelite-aot'])} KB</b><span>${tpl(B.cardSize, { preact: fmt(gz.preact) })}</span></div>
    <div class="card"><b>${fmt(gz.react / gz['angelite-aot'], 1)}×</b><span>${B.cardReact}</span></div>
    <div class="card"><b>${fmt(gz.angular / gz['angelite-aot'], 1)}×</b><span>${B.cardAngular}</span></div>
    <div class="card"><b>${fmt(score['angelite-aot'], 2)}×</b><span>${tpl(B.cardSpeed, { best: NAME[bestOf(score)], bestV: fmt(score[bestOf(score)], 2) })}</span></div>
  </div>`;
})();
