async function guardarLiqHacienda() {
  const data = {
    fecha: document.getElementById('lh-fecha').value,
    numero: document.getElementById('lh-num').value,
    consignatario: document.getElementById('lh-cons').value,
    categoria: document.getElementById('lh-cat').value,
    cabezas: parseInt(document.getElementById('lh-cab').value) || null,
    kg_totales: parseFloat(document.getElementById('lh-kg').value) || null,
    precio: parseFloat(document.getElementById('lh-precio').value) || null,
    subtotal: parseFloat(document.getElementById('lh-sub').value) || null,
    comision: parseFloat(document.getElementById('lh-com').value) || null,
    ret_ganancias: parseFloat(document.getElementById('lh-gan').value) || null,
    iva: parseFloat(document.getElementById('lh-iva').value) || null,
    total_neto: parseFloat(document.getElementById('lh-neto').value) || null
  };
  const r = await sb('POST', 'liquidaciones_hacienda', data);
  if (r) { toast('✅ Liquidación registrada'); toggleForm('form-liqhac'); cargarLiqHacienda(); }
  else toast('❌ Error', 'var(--rojo)');
}

async function cargarLiqHacienda() {
  const rows = await sb('GET', 'liquidaciones_hacienda', '', '?order=fecha.desc');
  const tbody = document.getElementById('tabla-liqhac');
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">📄</div><h3>Sin liquidaciones</h3></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(l => `
    <tr>
      <td>${fmtFecha(l.fecha)}</td>
      <td>${l.numero || '—'}</td>
      <td>${l.consignatario || '—'}</td>
      <td><span class="badge badge-bordo">${l.cabezas ? l.cabezas + ' ' : ''}${l.categoria || ''}</span></td>
      <td>${l.cabezas || '—'}</td>
      <td>${l.subtotal ? '$' + Math.round(l.subtotal).toLocaleString() : '—'}</td>
      <td>${l.ret_ganancias ? '$' + Math.round(l.ret_ganancias).toLocaleString() : '—'}</td>
      <td><strong>${l.total_neto ? '$' + Math.round(l.total_neto).toLocaleString() : '—'}</strong></td>
    </tr>`).join('');
}
