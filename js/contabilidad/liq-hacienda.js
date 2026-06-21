let lhArchivoActual = null;
let liqhacTodas = [];
let liqhacPagina = 1;

function irPaginaLiqHac(p) { liqhacPagina = p; renderLiqHacienda(); window.scrollTo({ top: document.getElementById('section-liq_hacienda').offsetTop, behavior: 'smooth' }); }

async function procesarLiqHaciendaDoc(input) {
  const file = input.files[0];
  if (!file) return;
  lhArchivoActual = file;
  const status = document.getElementById('lh-doc-status');
  status.textContent = `📄 Leyendo ${file.name}...`;
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable agropecuario argentino experto en liquidaciones de venta de hacienda (consignatarios como Ferialvarez, Gananor Pujol, Central Ganadera, etc.). Leé TODO el documento y extraé cada dato. Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"fecha":"DD/MM/YYYY","numero":"string (N° de liquidación)","consignatario":"string","categoria":"Terneros invernada|Terneras invernada|Vacas invernada|Vacas preñadas|Vaquillonas invernada|Novillos|Toros","cabezas":0,"kg_totales":0,"precio":0,"subtotal":0,"comision":0,"ret_ganancias":0,"iva":0,"total_neto":0}

Guía de campos:
- cabezas: cantidad de animales.
- kg_totales: kilos totales vendidos.
- precio: precio unitario ($/kg o $/cabeza).
- subtotal: importe bruto antes de deducciones.
- comision: comisión / gastos de venta del consignatario.
- ret_ganancias: retención de impuesto a las ganancias.
- iva: IVA.
- total_neto: neto a cobrar / total a liquidar.

IMPORTANTE: revisá la sección de deducciones línea por línea. Si un valor no figura, poné 0. Montos como número sin símbolos ni puntos de miles.`,
      'Extraé TODOS los datos de esta liquidación de hacienda.');

    if (datos.fecha) document.getElementById('lh-fecha').value = parseFechaIA(datos.fecha);
    if (datos.numero) document.getElementById('lh-num').value = datos.numero;
    if (datos.consignatario) document.getElementById('lh-cons').value = datos.consignatario;
    if (datos.categoria) document.getElementById('lh-cat').value = datos.categoria;
    if (datos.cabezas) document.getElementById('lh-cab').value = datos.cabezas;
    if (datos.kg_totales) document.getElementById('lh-kg').value = datos.kg_totales;
    if (datos.precio) document.getElementById('lh-precio').value = datos.precio;
    if (datos.subtotal) document.getElementById('lh-sub').value = datos.subtotal;
    if (datos.comision) document.getElementById('lh-com').value = datos.comision;
    if (datos.ret_ganancias) document.getElementById('lh-gan').value = datos.ret_ganancias;
    if (datos.iva) document.getElementById('lh-iva').value = datos.iva;
    if (datos.total_neto) document.getElementById('lh-neto').value = datos.total_neto;

    status.textContent = `✅ ${file.name} leída — revisá los campos y guardá`;
    toast('✅ Documento leído — revisá y guardá');
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

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
  if (data.numero) {
    const existentes = await sb('GET', 'liquidaciones_hacienda', '', `?numero=eq.${encodeURIComponent(data.numero)}`);
    if (existentes && existentes.length && !confirm(`⚠️ Ya existe una liquidación con el N° "${data.numero}". ¿Querés guardarla igual?`)) {
      toast('Guardado cancelado — posible duplicado', 'var(--tierra)');
      return;
    }
  }
  if (lhArchivoActual) {
    toast('⏳ Subiendo documento...');
    const url = await subirArchivo(lhArchivoActual);
    if (url) data.archivo_url = url;
    else toast('⚠️ No se pudo subir el documento (se guarda igual)', 'var(--tierra)');
  }
  const r = await sb('POST', 'liquidaciones_hacienda', data);
  if (r) {
    toast('✅ Liquidación registrada');
    toggleForm('form-liqhac');
    document.getElementById('lh-archivo').value = '';
    document.getElementById('lh-doc-status').textContent = '';
    lhArchivoActual = null;
    cargarLiqHacienda();
  } else toast('❌ Error', 'var(--rojo)');
}

async function cargarLiqHacienda() {
  liqhacTodas = await sb('GET', 'liquidaciones_hacienda', '', '?order=fecha.desc') || [];
  renderLiqHacienda();
}

function renderLiqHacienda() {
  const rows = liqhacTodas;
  const tbody = document.getElementById('tabla-liqhac');
  if (!tbody) return;
  const pag = document.getElementById('liqhac-paginador');
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="icon">📄</div><h3>Sin liquidaciones</h3></div></td></tr>';
    if (pag) pag.innerHTML = '';
    return;
  }
  const totalPag = Math.ceil(rows.length / FILAS_POR_PAGINA) || 1;
  if (liqhacPagina > totalPag) liqhacPagina = totalPag;
  const pagina = rows.slice((liqhacPagina - 1) * FILAS_POR_PAGINA, liqhacPagina * FILAS_POR_PAGINA);
  if (pag) pag.innerHTML = htmlPaginador(liqhacPagina, rows.length, 'irPaginaLiqHac');
  tbody.innerHTML = pagina.map(l => `
    <tr>
      <td>${fmtFecha(l.fecha)}</td>
      <td>${l.numero || '—'}</td>
      <td>${l.consignatario || '—'}</td>
      <td><span class="badge badge-bordo">${l.cabezas ? l.cabezas + ' ' : ''}${l.categoria || ''}</span></td>
      <td>${l.cabezas || '—'}</td>
      <td>${l.subtotal ? fmtMonto(l.subtotal, 'ARS') : '—'}</td>
      <td>${l.ret_ganancias ? fmtMonto(l.ret_ganancias, 'ARS') : '—'}</td>
      <td><strong>${l.total_neto ? fmtMonto(l.total_neto, 'ARS') : '—'}</strong></td>
      <td style="white-space:nowrap">${l.archivo_url ? `<a class="btn btn-secondary" style="padding:4px 8px;font-size:12px;text-decoration:none" href="${l.archivo_url}" target="_blank" rel="noopener" title="Ver documento">👁️</a> ` : ''}<button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarLiqHacienda('${l.id}')">🗑️</button></td>
    </tr>`).join('');
}

async function borrarLiqHacienda(id) {
  if (!confirm('¿Borrar esta liquidación? Esta acción no se puede deshacer.')) return;
  await sb('DELETE', 'liquidaciones_hacienda', '', `?id=eq.${id}`);
  toast('🗑️ Liquidación borrada');
  cargarLiqHacienda();
}
