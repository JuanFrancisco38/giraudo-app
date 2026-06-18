async function guardarLiqGrano() {
  const data = {
    fecha: document.getElementById('lg-fecha').value,
    numero: document.getElementById('lg-coe').value,
    acopio: document.getElementById('lg-acop').value,
    cultivo: document.getElementById('lg-grano').value,
    kg: parseFloat(document.getElementById('lg-kg').value) || null,
    precio: parseFloat(document.getElementById('lg-precio').value) || null,
    ret_iva: parseFloat(document.getElementById('lg-retiva').value) || null,
    ret_iva_rg4310: parseFloat(document.getElementById('lg-rg4310').value) || null,
    flete: parseFloat(document.getElementById('lg-flete').value) || null,
    comision: parseFloat(document.getElementById('lg-com').value) || null,
    total_neto: parseFloat(document.getElementById('lg-neto').value) || null,
    campania: '25/26'
  };
  const r = await sb('POST', 'liquidaciones_granos', data);
  if (r) { toast('✅ Liquidación registrada'); toggleForm('form-liqgr'); cargarLiqGranos(); }
  else toast('❌ Error', 'var(--rojo)');
}

async function cargarLiqGranos() {
  const rows = await sb('GET', 'liquidaciones_granos', '', '?order=fecha.desc');
  const tbody = document.getElementById('tabla-liqgranos');
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">📄</div><h3>Sin liquidaciones</h3></div></td></tr>';
    return;
  }
  const cultColors = {soja:'green',maiz:'yellow',trigo:'tierra',girasol:'amarillo'};
  tbody.innerHTML = rows.map(l => `
    <tr>
      <td>${l.fecha || '—'}</td>
      <td>${l.numero || '—'}</td>
      <td>${l.acopio || '—'}</td>
      <td><span class="badge badge-${cultColors[l.cultivo?.toLowerCase()] || 'gray'}">${l.cultivo || '—'}</span></td>
      <td>${l.kg ? Math.round(l.kg).toLocaleString() + ' kg' : '—'}</td>
      <td>${l.ret_iva ? '$' + Math.round(l.ret_iva).toLocaleString() : '—'}</td>
      <td>${l.flete ? '$' + Math.round(l.flete).toLocaleString() : '—'}</td>
      <td><strong>${l.total_neto ? '$' + Math.round(l.total_neto).toLocaleString() : '—'}</strong></td>
    </tr>`).join('');
}
