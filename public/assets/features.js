(() => {
  const F = window.FEATURES;
  const el = id => document.getElementById(id);
  const SYM = { y: '✓', p: '<span class="half"></span>', n: '✕' };
  const WHERE = { core: 'integrado', mod: 'módulo', off: 'oficial', ext: 'terceros' };
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/`([^`]+)`/g, '<code>$1</code>');
  el('fver').textContent = F.versions;
  el('flegend').innerHTML = Object.entries(F.legend).map(([k, v]) => `<span><b style="color:${k === 'y' ? '#2f9e5b' : '#d63a3a'}">${SYM[k]}</b> ${v}</span>`).join('') +
    '';
  el('wlegend').innerHTML = Object.entries(F.where).map(([k, v]) => `<span><span style="font-size:.72rem;border:1px solid var(--line);border-radius:99px;padding:1px 7px">${WHERE[k]}</span> ${esc(v)}</span>`).join('');
  el('wnote').textContent = F.evidenceWhere;
  const fw = F.frameworks;
  const totals = Object.fromEntries(fw.map(([k]) => [k, { score: 0, n: 0, bundled: 0 }]));
  let html = '<div class="feat"><table><thead><tr><th>Característica</th>' + fw.map(([k, n]) => `<th style="color:var(--c-${k === 'lite' ? 'lite' : k})">${n}</th>`).join('') + '<th>Fuente</th></tr></thead><tbody>';
  for (const g of F.groups) {
    html += `<tr class="grp"><td colspan="${fw.length + 2}">${esc(g.title)}</td></tr>`;
    for (const r of g.rows) {
      html += `<tr><td class="name">${esc(r.name)}<small>${esc(r.why)}</small></td>` + fw.map(([k]) => {
        const [v, note] = r.cells[k];
        totals[k].score += v === 'y' ? 1 : v === 'p' ? 0.5 : 0;
        totals[k].n++;
        const loc = v !== 'n' && r.where && r.where[k];
        if (loc === 'core' || loc === 'mod') totals[k].bundled++;
        return `<td class="c ${v}"><b aria-label="${F.legend[v]}">${SYM[v]}</b>${loc ? `<i class="w w-${loc}" title="${esc(F.where[loc])}">${WHERE[loc]}</i>` : ''}${note ? `<small>${esc(note)}</small>` : ''}</td>`;
      }).join('') + `<td class="ev" title="${esc(F.evidence[r.ev])}">${r.ev}</td></tr>`;
    }
  }
  html += '</tbody><tfoot><tr><td>Cubre (sí = 1, parcial = ½)</td>' + fw.map(([k]) => `<td class="c">${totals[k].score.toLocaleString('es-ES')} de ${totals[k].n}</td>`).join('') + '<td></td></tr>' +
    '<tr><td>Filas que vienen en el propio paquete (integrado o módulo)<small>sin instalar nada aparte; solo las filas con etiqueta de ubicación</small></td>' + fw.map(([k]) => `<td class="c">${totals[k].bundled}</td>`).join('') + '<td></td></tr></tfoot></table></div>';
  el('features-table').innerHTML = html;
})();
