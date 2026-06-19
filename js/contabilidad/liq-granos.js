async function procesarLiqGranoDoc(input) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('lg-doc-status');
  status.textContent = `📄 Leyendo ${file.name}...`;
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable agropecuario argentino experto en liquidaciones de granos (formato C1116, liquidaciones de acopios como Turaglio, CEC, etc.). Leé TODO el documento con atención y extraé cada dato. Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"fecha":"DD/MM/YYYY","coe":"string (COE, C.O.E. o número de liquidación)","acopiador":"string (nombre del acopio/comprador)","grano":"Soja|Maíz|Trigo|Girasol|Sorgo","kg":0,"precio":0,"subtotal":0,"ret_iva":0,"ret_iva_rg4310":0,"ret_ganancias":0,"flete":0,"comision":0,"neto":0}

Guía de campos (pueden aparecer con otros nombres):
- kg: kilogramos netos / peso neto.
- precio: precio unitario $/kg o $/tn (si es por tonelada, dividí por 1000).
- subtotal: importe bruto / importe de la operación antes de deducciones.
- ret_iva: retención de IVA (IVA retenido).
- ret_iva_rg4310: retención IVA RG 4310/2018 (puede decir "RG 4310" o "percepción IVA").
- ret_ganancias: retención de impuesto a las ganancias.
- flete: gastos de flete / acarreo / flete a puerto.
- comision: comisión / gastos de comercialización / gastos de venta.
- neto: neto a cobrar / total a liquidar / importe neto.

IMPORTANTE: revisá la sección de deducciones/gastos línea por línea. Si un valor realmente no figura, poné 0. Montos como número sin símbolos ni puntos de miles.`,
      'Extraé TODOS los datos de esta liquidación de granos, incluyendo cada retención, flete y comisión.');

    if (datos.fecha) document.getElementById('lg-fecha').value = parseFechaIA(datos.fecha);
    if (datos.coe) document.getElementById('lg-coe').value = datos.coe;
    if (datos.acopiador) document.getElementById('lg-acop').value = datos.acopiador;
    if (datos.grano) document.getElementById('lg-grano').value = datos.grano;
    if (datos.kg) document.getElementById('lg-kg').value = datos.kg;
    if (datos.precio) document.getElementById('lg-precio').value = datos.precio;
    if (datos.subtotal) document.getElementById('lg-sub').value = datos.subtotal;
    if (datos.ret_iva) document.getElementById('lg-retiva').value = datos.ret_iva;
    if (datos.ret_iva_rg4310) document.getElementById('lg-rg4310').value = datos.ret_iva_rg4310;
    if (datos.ret_ganancias) document.getElementById('lg-retgan').value = datos.ret_ganancias;
    if (datos.flete) document.getElementById('lg-flete').value = datos.flete;
    if (datos.comision) document.getElementById('lg-com').value = datos.comision;
    if (datos.neto) document.getElementById('lg-neto').value = datos.neto;

    status.textContent = `✅ ${file.name} leída — revisá los campos y guardá`;
    toast('✅ Documento leído — revisá y guardá');
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

async function guardarLiqGrano() {
  const data = {
    fecha: document.getElementById('lg-fecha').value,
    numero: document.getElementById('lg-coe').value,
    acopio: document.getElementById('lg-acop').value,
    cultivo: document.getElementById('lg-grano').value,
    kg: parseFloat(document.getElementById('lg-kg').value) || null,
    precio: parseFloat(document.getElementById('lg-precio').value) || null,
    subtotal: parseFloat(document.getElementById('lg-sub').value) || null,
    ret_iva: parseFloat(document.getElementById('lg-retiva').value) || null,
    ret_iva_rg4310: parseFloat(document.getElementById('lg-rg4310').value) || null,
    ret_ganancias: parseFloat(document.getElementById('lg-retgan').value) || null,
    flete: parseFloat(document.getElementById('lg-flete').value) || null,
    comision: parseFloat(document.getElementById('lg-com').value) || null,
    total_neto: parseFloat(document.getElementById('lg-neto').value) || null,
    campania: '25/26'
  };
  const r = await sb('POST', 'liquidaciones_granos', data);
  if (r) { toast('✅ Liquidación registrada'); toggleForm('form-liqgr'); cargarLiqGranos(); cargarResumenGranos(); }
  else toast('❌ Error', 'var(--rojo)');
}

async function cargarLiqGranos() {
  const rows = await sb('GET', 'liquidaciones_granos', '', '?order=fecha.desc');
  const tbody = document.getElementById('tabla-liqgr');
  if (!tbody) return;
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="icon">📄</div><h3>Sin liquidaciones</h3></div></td></tr>';
    return;
  }
  const cultColors = {soja:'green',maiz:'yellow',trigo:'tierra',girasol:'amarillo'};
  tbody.innerHTML = rows.map(l => `
    <tr>
      <td>${fmtFecha(l.fecha)}</td>
      <td>${l.numero || '—'}</td>
      <td>${l.acopio || '—'}</td>
      <td><span class="badge badge-${cultColors[l.cultivo?.toLowerCase()] || 'gray'}">${l.cultivo || '—'}</span></td>
      <td>${l.kg ? Math.round(l.kg).toLocaleString() + ' kg' : '—'}</td>
      <td>${l.ret_iva ? '$' + Math.round(l.ret_iva).toLocaleString() : '—'}</td>
      <td>${l.flete ? '$' + Math.round(l.flete).toLocaleString() : '—'}</td>
      <td><strong>${l.total_neto ? '$' + Math.round(l.total_neto).toLocaleString() : '—'}</strong></td>
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarLiqGrano('${l.id}')">🗑️</button></td>
    </tr>`).join('');
}

async function borrarLiqGrano(id) {
  if (!confirm('¿Borrar esta liquidación? Esta acción no se puede deshacer.')) return;
  await sb('DELETE', 'liquidaciones_granos', '', `?id=eq.${id}`);
  toast('🗑️ Liquidación borrada');
  cargarLiqGranos();
  cargarResumenGranos();
}
