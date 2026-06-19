async function cargarAgroDashboard() {
  const [trabajos, liqGranos] = await Promise.all([
    sb('GET', 'trabajos_agricolas', '', '?tipo=neq.alimentacion&order=fecha.desc'),
    sb('GET', 'liquidaciones_granos', '', '?campania=eq.25/26')
  ]);

  const trabs = trabajos || [];
  const liqs = liqGranos || [];

  // Stat cards
  const totalHas = trabs.reduce((s, t) => s + (parseFloat(t.hectareas) || 0), 0);
  const totalKg = liqs.reduce((s, l) => s + (parseFloat(l.kg) || 0), 0);
  const totalNeto = liqs.reduce((s, l) => s + (parseFloat(l.total_neto) || 0), 0);

  document.getElementById('ag-trabajos').textContent = trabs.length || '—';
  document.getElementById('ag-has').textContent = totalHas ? fmtNum(totalHas) : '—';
  document.getElementById('ag-liqgranos').textContent = liqs.length || '—';
  document.getElementById('ag-kg').textContent = totalKg ? fmtKg(totalKg) : '—';
  document.getElementById('ag-neto').textContent = totalNeto ? fmtMonto(totalNeto, 'ARS') : '—';

  // Trabajos por tipo
  const porTipo = {};
  trabs.forEach(t => { const k = t.tipo || 'Otro'; porTipo[k] = (porTipo[k] || 0) + 1; });
  const tipoEl = document.getElementById('ag-portipo');
  const tipos = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);
  const colors = {Siembra:'green',Pulverización:'blue',Fertilización:'yellow',Cosecha:'tierra',Henificación:'bordo'};
  if (tipos.length) {
    const max = tipos[0][1];
    tipoEl.innerHTML = tipos.map(([tipo, n]) => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
          <span><span class="badge badge-${colors[tipo] || 'gray'}">${tipo}</span></span>
          <strong>${n}</strong>
        </div>
        <div style="background:var(--gris-borde);border-radius:6px;height:8px;overflow:hidden">
          <div style="background:var(--verde);height:100%;width:${Math.round(n / max * 100)}%"></div>
        </div>
      </div>`).join('');
  } else {
    tipoEl.innerHTML = '<div class="empty-state"><div class="icon">🌾</div><h3>Sin datos</h3></div>';
  }

  // Granos por cultivo
  const porCultivo = {};
  liqs.forEach(l => {
    const k = l.cultivo || 'Sin especificar';
    if (!porCultivo[k]) porCultivo[k] = { kg: 0, neto: 0 };
    porCultivo[k].kg += parseFloat(l.kg) || 0;
    porCultivo[k].neto += parseFloat(l.total_neto) || 0;
  });
  const cultEl = document.getElementById('ag-porcultivo');
  const cultivos = Object.entries(porCultivo).sort((a, b) => b[1].kg - a[1].kg);
  if (cultivos.length) {
    cultEl.innerHTML = `<table style="width:100%;font-size:13px">
      <thead><tr style="text-align:left;color:var(--texto-suave)"><th>Cultivo</th><th style="text-align:right">Kg</th><th style="text-align:right">Total neto</th></tr></thead>
      <tbody>${cultivos.map(([c, d]) => `
        <tr>
          <td style="padding:6px 0"><strong>${c}</strong></td>
          <td style="text-align:right">${fmtKg(d.kg)}</td>
          <td style="text-align:right">${fmtMonto(d.neto, 'ARS')}</td>
        </tr>`).join('')}</tbody></table>`;
  } else {
    cultEl.innerHTML = '<div class="empty-state"><div class="icon">📊</div><h3>Sin datos</h3></div>';
  }

  // Últimos trabajos
  const ultEl = document.getElementById('ag-ultimos');
  if (trabs.length) {
    ultEl.innerHTML = trabs.slice(0, 8).map(t => `
      <tr>
        <td>${fmtFecha(t.fecha)}</td>
        <td><span class="badge badge-${colors[t.tipo] || 'gray'}">${t.tipo || '—'}</span></td>
        <td>${t.campo || '—'}</td>
        <td>${t.lote || '—'}</td>
        <td>${t.hectareas ? t.hectareas + ' has' : '—'}</td>
        <td>${t.cultivo || '—'}</td>
      </tr>`).join('');
  } else {
    ultEl.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">🌾</div><h3>Sin trabajos</h3></div></td></tr>';
  }
}
