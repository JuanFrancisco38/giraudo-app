async function guardarPesada() {
  const cant = parseInt(document.getElementById('pes-cant').value) || null;
  const prom = parseFloat(document.getElementById('pes-prom').value) || null;
  const data = {
    fecha: document.getElementById('pes-fecha').value,
    campo: document.getElementById('pes-campo').value,
    lote: document.getElementById('pes-lote').value,
    categoria: document.getElementById('pes-cat').value,
    cantidad_animales: cant,
    peso_promedio: prom,
    peso_total: parseFloat(document.getElementById('pes-total').value) || (cant && prom ? Math.round(cant * prom) : null),
    observaciones: document.getElementById('pes-obs').value
  };
  const r = await sb('POST', 'pesadas', data);
  if (r) toast('✅ Pesada registrada'); else toast('❌ Error', 'var(--rojo)');
}

async function cargarPesadas() {
  const rows = await sb('GET', 'pesadas', '', '?order=fecha.desc');
  const tbody = document.getElementById('tabla-pesadas');
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">⚖️</div><h3>Sin pesadas</h3></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(p => `
    <tr>
      <td>${fmtFecha(p.fecha)}</td>
      <td>${p.campo || '—'}</td>
      <td>${p.lote || '—'}</td>
      <td>${p.categoria || '—'}</td>
      <td>${p.cantidad_animales || '—'}</td>
      <td><strong>${p.peso_promedio ? p.peso_promedio + ' kg' : '—'}</strong></td>
      <td>${p.peso_total ? p.peso_total.toLocaleString() + ' kg' : '—'}</td>
      <td><span class="badge badge-gray">—</span></td>
    </tr>`).join('');
}
