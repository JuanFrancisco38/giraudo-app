let lgArchivoActual = null;

async function procesarLiqGranoDoc(input) {
  const file = input.files[0];
  if (!file) return;
  lgArchivoActual = file;
  const status = document.getElementById('lg-doc-status');
  status.textContent = `📄 Leyendo ${file.name}...`;
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable agropecuario argentino experto en liquidaciones de granos (formato C1116, liquidaciones de acopios como Turaglio, CEC, etc.). Leé TODO el documento con atención y extraé cada dato. Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"firma":"string (Razón Social que figura en el recuadro VENDEDOR del documento, ej: GIRAUDO FRANCISCO JAVIER)","razon_social":"string (nombre del acopio/comprador, recuadro COMPRADOR)","fecha":"DD/MM/YYYY","grano":"Soja|Maíz|Trigo|Girasol|Sorgo","numero":"string (N° formulario, COE o número de liquidación)","observacion":"Venta|Canje|Ajuste calidad","campania":"string (ej 25/26)","kg":0,"precio_tt":0,"subtotal":0,"importe_iva":0,"operacion_civa":0,"comision_civa":0,"derecho_registro":0,"sellados_cordoba":0,"flete_puerto_civa":0,"ganancias":0,"iva_5_8":0,"total_retencion_afip":0,"total_deducciones":0,"iva_rg2300":0,"neto_cobrar":0}

Guía de campos (pueden aparecer con otros nombres en el documento):
- firma: el documento suele tener un recuadro "VENDEDOR" con su Razón Social, Domicilio, C.U.I.T., etc. Tomá el valor de "Razón Social" de ESE recuadro (el del vendedor, es decir Grupo Giraudo) y poné lo en "firma". No confundir con el recuadro "COMPRADOR" (acopio/cerealera), que va en "razon_social".
- kg: kilogramos netos / peso neto.
- precio_tt: precio por tonelada (TT). Si el documento da precio por kg, multiplicá por 1000.
- subtotal: importe bruto / importe de la operación antes de IVA.
- importe_iva: monto de IVA de la operación (no retención).
- operacion_civa: importe de la operación con IVA incluido (subtotal + importe_iva).
- comision_civa: comisión o gastos de comercialización con IVA incluido.
- derecho_registro: derecho de registro de la operación.
- sellados_cordoba: sellados de la provincia de Córdoba.
- flete_puerto_civa: flete a puerto con IVA incluido.
- ganancias: retención de impuesto a las ganancias.
- iva_5_8: retención de IVA al 5% u 8% según corresponda.
- total_retencion_afip: total de retenciones de AFIP (suma de ganancias + IVA RG2300 + iva_5_8 si corresponde).
- total_deducciones: total de deducciones (comisión + derecho de registro + sellados + flete, etc.).
- iva_rg2300: retención de IVA RG 2300 (puede decir "RG 2300" o percepción/retención IVA específica).
- neto_cobrar: neto a cobrar / total a liquidar / importe neto.

IMPORTANTE: revisá la sección de deducciones/retenciones línea por línea. Si un valor realmente no figura, poné 0 o "". Montos como número sin símbolos ni puntos de miles.`,
      'Extraé TODOS los datos de esta liquidación de granos, incluyendo cada deducción y retención.');

    if (datos.firma) document.getElementById('lg-firma').value = datos.firma;
    if (datos.razon_social) document.getElementById('lg-razonsocial').value = datos.razon_social;
    if (datos.fecha) document.getElementById('lg-fecha').value = parseFechaIA(datos.fecha);
    if (datos.grano) document.getElementById('lg-grano').value = datos.grano;
    if (datos.numero) document.getElementById('lg-numero').value = datos.numero;
    if (datos.observacion) document.getElementById('lg-obs').value = datos.observacion;
    if (datos.campania) document.getElementById('lg-campania').value = datos.campania;
    if (datos.kg) document.getElementById('lg-kg').value = datos.kg;
    if (datos.precio_tt) document.getElementById('lg-preciott').value = datos.precio_tt;
    if (datos.subtotal) document.getElementById('lg-sub').value = datos.subtotal;
    if (datos.importe_iva) document.getElementById('lg-importeiva').value = datos.importe_iva;
    if (datos.operacion_civa) document.getElementById('lg-opciva').value = datos.operacion_civa;
    if (datos.comision_civa) document.getElementById('lg-comciva').value = datos.comision_civa;
    if (datos.derecho_registro) document.getElementById('lg-derecho').value = datos.derecho_registro;
    if (datos.sellados_cordoba) document.getElementById('lg-sellados').value = datos.sellados_cordoba;
    if (datos.flete_puerto_civa) document.getElementById('lg-fleteciva').value = datos.flete_puerto_civa;
    if (datos.ganancias) document.getElementById('lg-ganancias').value = datos.ganancias;
    if (datos.iva_5_8) document.getElementById('lg-iva58').value = datos.iva_5_8;
    if (datos.total_retencion_afip) document.getElementById('lg-totalretafip').value = datos.total_retencion_afip;
    if (datos.total_deducciones) document.getElementById('lg-totaldeducciones').value = datos.total_deducciones;
    if (datos.iva_rg2300) document.getElementById('lg-rg2300').value = datos.iva_rg2300;
    if (datos.neto_cobrar) document.getElementById('lg-neto').value = datos.neto_cobrar;

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
    firma: document.getElementById('lg-firma').value,
    razon_social: document.getElementById('lg-razonsocial').value,
    fecha: document.getElementById('lg-fecha').value,
    grano: document.getElementById('lg-grano').value,
    numero: document.getElementById('lg-numero').value,
    observacion: document.getElementById('lg-obs').value,
    campania: document.getElementById('lg-campania').value || '25/26',
    kg: parseFloat(document.getElementById('lg-kg').value) || null,
    precio_tt: parseFloat(document.getElementById('lg-preciott').value) || null,
    subtotal: parseFloat(document.getElementById('lg-sub').value) || null,
    importe_iva: parseFloat(document.getElementById('lg-importeiva').value) || null,
    operacion_civa: parseFloat(document.getElementById('lg-opciva').value) || null,
    comision_civa: parseFloat(document.getElementById('lg-comciva').value) || null,
    derecho_registro: parseFloat(document.getElementById('lg-derecho').value) || null,
    sellados_cordoba: parseFloat(document.getElementById('lg-sellados').value) || null,
    flete_puerto_civa: parseFloat(document.getElementById('lg-fleteciva').value) || null,
    ganancias: parseFloat(document.getElementById('lg-ganancias').value) || null,
    iva_5_8: parseFloat(document.getElementById('lg-iva58').value) || null,
    total_retencion_afip: parseFloat(document.getElementById('lg-totalretafip').value) || null,
    total_deducciones: parseFloat(document.getElementById('lg-totaldeducciones').value) || null,
    iva_rg2300: parseFloat(document.getElementById('lg-rg2300').value) || null,
    neto_cobrar: parseFloat(document.getElementById('lg-neto').value) || null
  };
  if (data.numero) {
    const existentes = await sb('GET', 'liquidaciones_granos', '', `?numero=eq.${encodeURIComponent(data.numero)}`);
    if (existentes && existentes.length) {
      if (!confirm(`⚠️ Ya existe una liquidación con el N° "${data.numero}". ¿Querés guardarla igual?`)) {
        toast('Guardado cancelado — posible duplicado', 'var(--tierra)');
        return;
      }
    }
  }
  if (lgArchivoActual) {
    toast('⏳ Subiendo documento...');
    const url = await subirArchivo(lgArchivoActual);
    if (url) data.archivo_url = url;
    else toast('⚠️ No se pudo subir el documento (se guarda igual)', 'var(--tierra)');
  }
  const r = await sb('POST', 'liquidaciones_granos', data);
  if (r) {
    toast('✅ Liquidación registrada');
    toggleForm('form-liqgr');
    document.getElementById('lg-archivo').value = '';
    lgArchivoActual = null;
    cargarLiqGranos(); cargarResumenGranos();
  } else toast('❌ Error', 'var(--rojo)');
}

let liqgrTodas = [];
let liqgrPagina = 1;

function irPaginaLiqGr(p) { liqgrPagina = p; renderLiqGranos(); window.scrollTo({ top: document.getElementById('section-liq_granos').offsetTop, behavior: 'smooth' }); }

async function cargarLiqGranos() {
  liqgrTodas = await sb('GET', 'liquidaciones_granos', '', '?order=fecha.desc') || [];
  renderLiqGranos();
}

function filtrarLiqGrReset() { liqgrPagina = 1; renderLiqGranos(); }

function renderLiqGranos() {
  const fBusca = (document.getElementById('liqgr-filtro-busca')?.value || '').trim().toLowerCase();
  const rows = fBusca ? liqgrTodas.filter(l => `${l.razon_social || ''} ${l.numero || ''} ${l.grano || ''}`.toLowerCase().includes(fBusca)) : liqgrTodas;
  const tbody = document.getElementById('tabla-liqgr');
  if (!tbody) return;
  const pag = document.getElementById('liqgr-paginador');
  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="23"><div class="empty-state"><div class="icon">📄</div><h3>${fBusca ? 'Sin resultados para la búsqueda' : 'Sin liquidaciones'}</h3></div></td></tr>`;
    if (pag) pag.innerHTML = '';
    return;
  }
  const totalPag = Math.ceil(rows.length / FILAS_POR_PAGINA) || 1;
  if (liqgrPagina > totalPag) liqgrPagina = totalPag;
  const pagina = rows.slice((liqgrPagina - 1) * FILAS_POR_PAGINA, liqgrPagina * FILAS_POR_PAGINA);
  if (pag) pag.innerHTML = htmlPaginador(liqgrPagina, rows.length, 'irPaginaLiqGr');
  const cultColors = {soja:'green',maiz:'yellow',trigo:'tierra',girasol:'amarillo'};
  tbody.innerHTML = pagina.map(l => `
    <tr>
      <td>${l.firma || '—'}</td>
      <td>${l.razon_social || '—'}</td>
      <td>${fmtFecha(l.fecha)}</td>
      <td><span class="badge badge-${cultColors[l.grano?.toLowerCase()] || 'gray'}">${l.grano || '—'}</span></td>
      <td>${l.numero || '—'}</td>
      <td><select onchange="editarObservacionLiqGrano('${l.id}', this.value)" style="border:1px solid var(--gris-borde);border-radius:4px;padding:3px 5px;font-size:12px">
        <option value="" ${!l.observacion ? 'selected' : ''}>—</option>
        <option ${l.observacion === 'Venta' ? 'selected' : ''}>Venta</option>
        <option ${l.observacion === 'Canje' ? 'selected' : ''}>Canje</option>
        <option ${l.observacion === 'Ajuste calidad' ? 'selected' : ''}>Ajuste calidad</option>
      </select></td>
      <td>${l.campania || '—'}</td>
      <td>${l.kg ? fmtKg(l.kg) : '—'}</td>
      <td>${l.precio_tt ? fmtMonto(l.precio_tt, 'ARS') : '—'}</td>
      <td>${l.subtotal ? fmtMonto(l.subtotal, 'ARS') : '—'}</td>
      <td>${l.importe_iva ? fmtMonto(l.importe_iva, 'ARS') : '—'}</td>
      <td>${l.operacion_civa ? fmtMonto(l.operacion_civa, 'ARS') : '—'}</td>
      <td>${l.comision_civa ? fmtMonto(l.comision_civa, 'ARS') : '—'}</td>
      <td>${l.derecho_registro ? fmtMonto(l.derecho_registro, 'ARS') : '—'}</td>
      <td>${l.sellados_cordoba ? fmtMonto(l.sellados_cordoba, 'ARS') : '—'}</td>
      <td>${l.flete_puerto_civa ? fmtMonto(l.flete_puerto_civa, 'ARS') : '—'}</td>
      <td>${l.ganancias ? fmtMonto(l.ganancias, 'ARS') : '—'}</td>
      <td>${l.iva_5_8 ? fmtMonto(l.iva_5_8, 'ARS') : '—'}</td>
      <td>${l.total_retencion_afip ? fmtMonto(l.total_retencion_afip, 'ARS') : '—'}</td>
      <td>${l.total_deducciones ? fmtMonto(l.total_deducciones, 'ARS') : '—'}</td>
      <td>${l.iva_rg2300 ? fmtMonto(l.iva_rg2300, 'ARS') : '—'}</td>
      <td><strong>${l.neto_cobrar ? fmtMonto(l.neto_cobrar, 'ARS') : '—'}</strong></td>
      <td style="white-space:nowrap">${l.archivo_url ? `<a class="btn btn-secondary" style="padding:4px 8px;font-size:12px;text-decoration:none" href="${l.archivo_url}" target="_blank" rel="noopener" title="Ver documento">👁️</a> ` : ''}<button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarLiqGrano('${l.id}')">🗑️</button></td>
    </tr>`).join('');
}

async function editarObservacionLiqGrano(id, valor) {
  const l = liqgrTodas.find(x => x.id === id);
  if (l) l.observacion = valor;
  const r = await sb('PATCH', 'liquidaciones_granos', { observacion: valor }, `?id=eq.${id}`);
  if (r) toast('✅ Observación actualizada');
  else toast('❌ Error al actualizar', 'var(--rojo)');
}

async function borrarLiqGrano(id) {
  if (!confirm('¿Borrar esta liquidación? Esta acción no se puede deshacer.')) return;
  await sb('DELETE', 'liquidaciones_granos', '', `?id=eq.${id}`);
  toast('🗑️ Liquidación borrada');
  cargarLiqGranos();
  cargarResumenGranos();
}
