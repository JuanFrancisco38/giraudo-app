// Los datos del grano se guardan como JSON dentro de 'descripcion'
// para no requerir columnas nuevas en la tabla certificaciones.

async function procesarCertDoc(input) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('cert-doc-status');
  status.textContent = `📄 Leyendo ${file.name}...`;
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente agropecuario argentino. Analizá este certificado de depósito de granos (C.O.E.) y extraé los datos. Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"fecha":"DD/MM/YYYY","coe":"string","grano":"Soja|Maíz|Trigo|Girasol|Sorgo","depositario":"string (acopio/cerealera donde está depositado)","ctgs":0,"kg_bruto":0,"merma":0,"kg_neto":0}
Los montos en números sin símbolos ni puntos de miles. Si un dato no está, poné 0 o "".`,
      'Extraé los datos de este certificado de depósito de granos.');

    if (datos.fecha) document.getElementById('cert-fecha').value = parseFechaIA(datos.fecha);
    if (datos.coe) document.getElementById('cert-coe').value = datos.coe;
    if (datos.grano) document.getElementById('cert-grano').value = datos.grano;
    if (datos.depositario) document.getElementById('cert-dep').value = datos.depositario;
    if (datos.ctgs) document.getElementById('cert-ctgs').value = datos.ctgs;
    if (datos.kg_bruto) document.getElementById('cert-bruto').value = datos.kg_bruto;
    if (datos.merma) document.getElementById('cert-merma').value = datos.merma;
    if (datos.kg_neto) document.getElementById('cert-neto').value = datos.kg_neto;

    status.textContent = `✅ ${file.name} leída — revisá los campos y guardá`;
    toast('✅ Documento leído — revisá y guardá');
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

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
  if (extra.coe) {
    const todas = await sb('GET', 'certificaciones', '', '?tipo=eq.deposito');
    const dup = (todas || []).some(c => parseCert(c).coe === extra.coe);
    if (dup && !confirm(`⚠️ Ya existe una certificación con el C.O.E. "${extra.coe}". ¿Querés guardarla igual?`)) {
      toast('Guardado cancelado — posible duplicado', 'var(--tierra)');
      return;
    }
  }
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
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="icon">📋</div><h3>Sin certificaciones</h3></div></td></tr>';
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
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarCertificacion('${row.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

async function borrarCertificacion(id) {
  if (!confirm('¿Borrar esta certificación? Esta acción no se puede deshacer.')) return;
  await sb('DELETE', 'certificaciones', '', `?id=eq.${id}`);
  toast('🗑️ Certificación borrada');
  cargarCertificaciones();
  if (typeof cargarResumenGranos === 'function') cargarResumenGranos();
}
