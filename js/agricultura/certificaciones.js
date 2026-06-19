// Los datos del grano se guardan como JSON dentro de 'descripcion'
// para no requerir columnas nuevas en la tabla certificaciones.

async function guardarCertificacion() {
  const extra = {
    coe: document.getElementById('cert-coe').value,
    grano: document.getElementById('cert-grano').value,
    depositario: document.getElementById('cert-dep').value,
    ctgs: parseInt(document.getElementById('cert-ctgs').value) || null,
    kg_bruto: parseFloat(document.getElementById('cert-bruto').value) || null,
    merma: parseFloat(document.getElementById('cert-merma').value) || null,
    kg_neto: parseFloat(document.getElementById('cert-neto').value) || null,
    campania: '25/26'
  };
  const data = {
    fecha: document.getElementById('cert-fecha').value,
    tipo: 'deposito',
    descripcion: JSON.stringify(extra)
  };
  const r = await sb('POST', 'certificaciones', data);
  if (r) { toast('✅ Certificación registrada'); toggleForm('form-cert'); cargarCertificaciones(); }
  else toast('❌ Error', 'var(--rojo)');
}

function parseCert(c) {
  let extra = {};
  try { extra = c.descripcion ? JSON.parse(c.descripcion) : {}; } catch(e) {}
  return { fecha: c.fecha, ...extra };
}

async function cargarCertificaciones() {
  const rows = await sb('GET', 'certificaciones', '', '?tipo=eq.deposito&order=fecha.desc');
  const tbody = document.getElementById('tabla-cert');
  if (!tbody) return;
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">📋</div><h3>Sin certificaciones</h3></div></td></tr>';
    return;
  }
  const cultColors = {soja:'green',maiz:'yellow',trigo:'tierra',girasol:'amarillo'};
  tbody.innerHTML = rows.map(row => {
    const c = parseCert(row);
    return `<tr>
      <td>${fmtFecha(c.fecha)}</td>
      <td>${c.coe || '—'}</td>
      <td><span class="badge badge-${cultColors[c.grano?.toLowerCase()] || 'gray'}">${c.grano || '—'}</span></td>
      <td>${c.ctgs || '—'}</td>
      <td>${c.kg_bruto ? Math.round(c.kg_bruto).toLocaleString() + ' kg' : '—'}</td>
      <td>${c.merma ? Math.round(c.merma).toLocaleString() + ' kg' : '—'}</td>
      <td><strong>${c.kg_neto ? Math.round(c.kg_neto).toLocaleString() + ' kg' : '—'}</strong></td>
      <td>${c.depositario || '—'}</td>
    </tr>`;
  }).join('');
}
