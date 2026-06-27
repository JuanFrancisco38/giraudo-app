let tarifasTrabajos = [];

async function cargarTarifas() {
  tarifasTrabajos = await sb('GET', 'tarifas_trabajos', '', '?order=tipo') || [];
  renderTarifas();
}

function renderTarifas() {
  const tbody = document.getElementById('tabla-tarifas');
  if (!tbody) return;
  if (!tarifasTrabajos.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><div class="icon">💲</div><h3>Sin tarifas cargadas</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = tarifasTrabajos.map(t => `
    <tr>
      <td>${t.tipo}</td>
      <td>${t.tarifa_ha ? fmtMonto(t.tarifa_ha, 'ARS') : '—'}</td>
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarTarifaTrabajo('${t.id}')">🗑️</button></td>
    </tr>`).join('');
}

async function guardarTarifaTrabajo() {
  const data = {
    tipo: document.getElementById('tar-tipo').value,
    tarifa_ha: parseFloat(document.getElementById('tar-precio').value) || null
  };
  const r = await sb('POST', 'tarifas_trabajos', data);
  if (r) {
    toast('✅ Tarifa registrada');
    toggleForm('form-tarifa');
    document.getElementById('tar-precio').value = '';
    cargarTarifas();
    renderLotes();
  } else toast('❌ Error', 'var(--rojo)');
}

async function borrarTarifaTrabajo(id) {
  if (!confirm('¿Borrar esta tarifa?')) return;
  await sb('DELETE', 'tarifas_trabajos', '', `?id=eq.${id}`);
  toast('🗑️ Tarifa borrada');
  cargarTarifas();
  renderLotes();
}

let lotesData = [];
let trabajosParaLotes = [];
let boletasParaLotes = [];
let liqGranosParaLotes = [];

async function cargarDatosCostosInsumos() {
  if (boletasParaLotes.length) return;
  const boletas = await sb('GET', 'boletas', '');
  boletasParaLotes = (boletas || []).filter(b => {
    try { return JSON.parse(b.observaciones || '{}').tipo_factura === 'recibida'; } catch(e) { return false; }
  });
}

async function cargarLotes() {
  const [lotes, trabajos, boletas, liqs] = await Promise.all([
    sb('GET', 'lotes', '', '?order=campo,lote'),
    sb('GET', 'trabajos_agricolas', '', '?tipo=neq.alimentacion'),
    sb('GET', 'boletas', ''),
    sb('GET', 'liquidaciones_granos', '')
  ]);
  lotesData = lotes || [];
  trabajosParaLotes = trabajos || [];
  boletasParaLotes = (boletas || []).filter(b => {
    try { return JSON.parse(b.observaciones || '{}').tipo_factura === 'recibida'; } catch(e) { return false; }
  });
  liqGranosParaLotes = liqs || [];
  cargarTarifas();
  renderLotes();
}

function parseNumeroDeTexto(str) {
  const m = String(str || '').match(/[\d.,]+/);
  if (!m) return 0;
  return parseFloat(m[0].replace(/\./g, '').replace(',', '.')) || 0;
}

function parseUnidadDeTexto(str) {
  const m = String(str || '').match(/[a-zA-Z]+/);
  return m ? m[0].toLowerCase() : '';
}

const EQUIVALENCIAS_UNIDAD = { kg:'kg', kgs:'kg', kilo:'kg', kilos:'kg', gr:'gr', grs:'gr', gramo:'gr', gramos:'gr', g:'gr', lt:'lt', lts:'lt', litro:'lt', litros:'lt', l:'lt', cc:'cc', ml:'cc', tn:'tn', ton:'tn', tonelada:'tn', toneladas:'tn' };
const FACTORES_A_BASE = { kg: 1, gr: 0.001, tn: 1000, lt: 1, cc: 0.001 };

function convertirCantidad(cantidad, unidadOrigen, unidadDestino) {
  const uo = EQUIVALENCIAS_UNIDAD[unidadOrigen] || unidadOrigen;
  const ud = EQUIVALENCIAS_UNIDAD[unidadDestino] || unidadDestino;
  if (!uo || !ud || uo === ud) return cantidad;
  const fo = FACTORES_A_BASE[uo], fd = FACTORES_A_BASE[ud];
  if (!fo || !fd) return cantidad;
  return cantidad * fo / fd;
}

function normalizarTexto(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

function normalizarCampania(c) { return (c || '').split('/').map(p => p.trim().slice(-2)).join('/'); }

function campaniaAnio(c) { return parseInt(normalizarCampania(c).split('/')[0], 10) || 0; }

function buscarCostoUnitarioInsumo(descripcion, campania) {
  if (!descripcion) return null;
  const needle = normalizarTexto(descripcion);
  if (needle.length < 3) return null;

  const porCampania = {};
  boletasParaLotes.forEach(b => {
    if (!normalizarTexto(b.concepto).includes(needle)) return;
    let obs;
    try { obs = JSON.parse(b.observaciones || '{}'); } catch(e) { return; }
    if (!obs.costo_unitario) return;
    const camp = obtenerCampaniaDeBoleta(b, obs);
    if (!camp) return;
    const precio = obs.moneda_costo === 'USD' ? obs.costo_unitario * (obs.tipo_cambio || 1) : obs.costo_unitario;
    const unidad = EQUIVALENCIAS_UNIDAD[(obs.unidad || '').toLowerCase()] || (obs.unidad || '').toLowerCase();
    if (!porCampania[camp]) porCampania[camp] = [];
    porCampania[camp].push({ precio, unidad });
  });

  const promediar = lista => ({
    precio: lista.reduce((s, x) => s + x.precio, 0) / lista.length,
    unidad: lista.find(x => x.unidad)?.unidad || ''
  });

  const campN = normalizarCampania(campania);
  if (porCampania[campN]) return promediar(porCampania[campN]);

  // Sin facturas de esta campaña: usar el promedio de la campaña anterior más reciente que tenga datos.
  const anioTarget = campaniaAnio(campania);
  const anteriores = Object.keys(porCampania).filter(c => campaniaAnio(c) <= anioTarget).sort((a, b) => campaniaAnio(b) - campaniaAnio(a));
  const candidatas = anteriores.length ? anteriores : Object.keys(porCampania).sort((a, b) => campaniaAnio(a) - campaniaAnio(b));
  if (!candidatas.length) return null;
  return promediar(porCampania[candidatas[0]]);
}

function obtenerCampaniaDeBoleta(b, obs) {
  if (obs.campania) return normalizarCampania(obs.campania);
  const m = (b.concepto || '').match(/(20)?(\d{2})\s*[\/\-]\s*(20)?(\d{2})/);
  if (m) return `${m[2]}/${m[4]}`;
  if (b.fecha) {
    const f = new Date(b.fecha);
    const anio = f.getFullYear() % 100;
    const mes = f.getMonth() + 1;
    return mes >= 7 ? `${anio}/${anio + 1}` : `${anio - 1}/${anio}`;
  }
  return '';
}

const POOLS_ARRENDAMIENTO = [
  { campos: ['Don Alfredo (Azcona)'], proveedorMatch: 'azcona', hectareasTotales: 278 },
  { campos: ['Doña Vica', 'Sant-Yago'], excluirProveedor: 'azcona', hectareasTotales: 490 }
];

function poolDeCampo(campo) { return POOLS_ARRENDAMIENTO.find(p => p.campos.includes(campo)); }

function costoArrendamientoLote(campo, hectareasLote, campania) {
  const pool = poolDeCampo(campo);
  if (!pool || !hectareasLote) return 0;
  const campN = normalizarCampania(campania);
  const total = boletasParaLotes.reduce((s, b) => {
    if (b.categoria !== 'Arrendamientos Rurales') return s;
    const prov = (b.proveedor || '').toLowerCase();
    if (pool.proveedorMatch && !prov.includes(pool.proveedorMatch)) return s;
    if (pool.excluirProveedor && prov.includes(pool.excluirProveedor)) return s;
    let obs;
    try { obs = JSON.parse(b.observaciones || '{}'); } catch(e) { obs = {}; }
    if (obtenerCampaniaDeBoleta(b, obs) !== campN) return s;
    return s + (parseFloat(b.monto) || 0);
  }, 0);
  return (total / pool.hectareasTotales) * hectareasLote;
}

function precioPromedioGrano(grano, campania) {
  const filtradas = liqGranosParaLotes.filter(l => (l.grano || '').toLowerCase() === (grano || '').toLowerCase() && l.campania === campania && l.precio_tt);
  if (!filtradas.length) return null;
  const prom = filtradas.reduce((s, l) => s + parseFloat(l.precio_tt), 0) / filtradas.length;
  return prom / 1000;
}

function calcularResumenLote(campo, lote, campania, hectareasLote) {
  const trabs = trabajosParaLotes.filter(t => t.campo === campo && String(t.lote) === String(lote) && t.campania === campania);
  const costoArrendamiento = costoArrendamientoLote(campo, hectareasLote, campania);

  let costoInsumos = 0, sinPrecio = 0;
  const tarifaPorTipo = {};
  tarifasTrabajos.forEach(t => tarifaPorTipo[t.tipo] = t.tarifa_ha);
  const headersContados = new Set();
  let costoTarifas = 0;

  let ingresoRendimiento = 0;
  const rendimientos = [];

  trabs.forEach(t => {
    if (t.descripcion && (t.dosis || t.consumo_total)) {
      let cantidad = parseNumeroDeTexto(t.consumo_total) || parseNumeroDeTexto(t.dosis) * (t.hectareas || 0);
      const unidadTrabajo = parseUnidadDeTexto(t.consumo_total) || parseUnidadDeTexto(t.dosis);
      const r = buscarCostoUnitarioInsumo(t.descripcion, campania);
      if (r && unidadTrabajo && r.unidad) cantidad = convertirCantidad(cantidad, unidadTrabajo, r.unidad);
      if (r && cantidad) costoInsumos += r.precio * cantidad;
      else if (t.descripcion) sinPrecio++;
    }
    const headerKey = `${t.fecha}|${t.tipo}`;
    if (t.contratista === 'Propio' && tarifaPorTipo[t.tipo] && !headersContados.has(headerKey)) {
      headersContados.add(headerKey);
      costoTarifas += tarifaPorTipo[t.tipo] * (t.hectareas || 0);
    }
    if (t.rendimiento) {
      const precio = t.precio_rendimiento || precioPromedioGrano(t.cultivo, campania);
      if (precio) ingresoRendimiento += t.rendimiento * precio;
      rendimientos.push(`${fmtNum(t.rendimiento)} ${t.rendimiento_unidad || ''} (${t.cultivo || t.tipo})`);
    }
  });

  const margenBruto = ingresoRendimiento - costoInsumos - costoTarifas - costoArrendamiento;
  return { cantTrabajos: trabs.length, costoInsumos, costoTarifas, costoArrendamiento, sinPrecio, ingresoRendimiento, rendimientos, margenBruto };
}

const colorPorCampo = { 'Don Alfredo (Azcona)': 'bordo', 'Doña Vica': 'cielo', 'Sant-Yago': 'tierra' };

let loteSeleccionado = null;

function verDetalleLote(campo, lote) {
  const key = `${campo}|${lote}`;
  loteSeleccionado = loteSeleccionado === key ? null : key;
  renderLotes();
  if (loteSeleccionado) {
    document.getElementById('lotes-detalle').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderLotes() {
  const cont = document.getElementById('lotes-cards');
  if (!cont) return;
  const campania = document.getElementById('lotes-campania')?.value || '25/26';
  if (!lotesData.length) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">🗺️</div><h3>Sin lotes cargados</h3></div>';
    return;
  }
  cont.innerHTML = lotesData.map(l => {
    const key = `${l.campo}|${l.lote}`;
    const r = calcularResumenLote(l.campo, l.lote, campania, l.hectareas);
    const color = colorPorCampo[l.campo] || 'gray';
    const margenColor = r.margenBruto > 0 ? 'var(--verde)' : (r.margenBruto < 0 ? 'var(--rojo)' : 'var(--texto-suave)');
    const seleccionado = loteSeleccionado === key;
    return `<div onclick="verDetalleLote('${l.campo}', '${l.lote}')" style="cursor:pointer;background:var(--${color}-claro,#f5f5f5);border:2px solid ${seleccionado ? 'var(--' + color + ')' : 'var(--gris-borde)'};border-radius:8px;padding:14px">
      <div style="font-weight:600;font-size:13px;color:var(--${color});margin-bottom:4px">${l.campo} — Lote ${l.lote}</div>
      <div style="font-size:12px;color:var(--texto-suave);margin-bottom:8px">${l.hectareas || '—'} has · ${l.tenencia || '—'}</div>
      <div style="font-size:12px;line-height:1.6">
        <div>Trabajos registrados: <strong>${r.cantTrabajos}</strong></div>
        <div>Costo insumos: <strong>${r.costoInsumos ? fmtMonto(r.costoInsumos, 'ARS') : '—'}</strong>${r.sinPrecio ? ` <span style="color:var(--tierra)">(${r.sinPrecio} sin precio)</span>` : ''}</div>
        <div>Costo trabajos propios: <strong>${r.costoTarifas ? fmtMonto(r.costoTarifas, 'ARS') : '—'}</strong></div>
        <div>Costo arrendamiento: <strong>${r.costoArrendamiento ? fmtMonto(r.costoArrendamiento, 'ARS') : '—'}</strong></div>
        <div>Rendimiento: <strong>${r.rendimientos.length ? r.rendimientos.join(', ') : '—'}</strong></div>
        <div>Ingreso estimado: <strong>${r.ingresoRendimiento ? fmtMonto(r.ingresoRendimiento, 'ARS') : '—'}</strong></div>
      </div>
      <div style="font-weight:600;font-size:13px;margin-top:8px;color:${margenColor}">Margen bruto estimado: ${fmtMonto(r.margenBruto, 'ARS')}</div>
    </div>`;
  }).join('');

  renderDetalleLote(campania);
}

function inputEditableLote(id, campo, valor, ancho, placeholder) {
  return `<input type="text" value="${valor || ''}" placeholder="${placeholder || ''}" style="width:${ancho}px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 5px;font-size:12px" onchange="editarCampoTrabajoLote('${id}', '${campo}', this.value)">`;
}

async function editarCampoTrabajoLote(id, campo, valor) {
  const t = trabajosParaLotes.find(x => x.id === id);
  if (t) t[campo] = valor;
  const r = await sb('PATCH', 'trabajos_agricolas', { [campo]: valor }, `?id=eq.${id}`);
  if (r) toast('✅ Actualizado');
  else toast('❌ Error al actualizar', 'var(--rojo)');
  renderLotes();
}

function renderDetalleLote(campania) {
  const cont = document.getElementById('lotes-detalle');
  if (!cont) return;
  if (!loteSeleccionado) { cont.innerHTML = ''; return; }
  const [campo, lote] = loteSeleccionado.split('|');
  const trabs = trabajosParaLotes
    .filter(t => t.campo === campo && String(t.lote) === String(lote) && t.campania === campania)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const colors = {Siembra:'green',Pulverización:'blue',Fertilización:'yellow',Cosecha:'tierra',Henificación:'bordo'};
  cont.innerHTML = `<div class="card">
    <div class="card-header"><h3>🌾 Trabajos — ${campo}, Lote ${lote} (Campaña ${campania})</h3>
      <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px" onclick="verDetalleLote('${campo}','${lote}')">✕ Cerrar</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Cultivo</th><th>Contratista</th><th>Insumo</th><th>Dosis</th><th>Consumo total</th><th>$ Unitario</th><th>$ Total</th></tr></thead>
    <tbody>${trabs.length ? trabs.map(t => {
      let cantidad = parseNumeroDeTexto(t.consumo_total) || parseNumeroDeTexto(t.dosis) * (t.hectareas || 0);
      const unidadTrabajo = parseUnidadDeTexto(t.consumo_total) || parseUnidadDeTexto(t.dosis);
      const r = t.descripcion ? buscarCostoUnitarioInsumo(t.descripcion, campania) : null;
      if (r && unidadTrabajo && r.unidad) cantidad = convertirCantidad(cantidad, unidadTrabajo, r.unidad);
      const costoUnit = r ? r.precio : null;
      const costoTotal = r && cantidad ? r.precio * cantidad : null;
      return `
      <tr>
        <td>${fmtFecha(t.fecha)}</td>
        <td><span class="badge badge-${colors[t.tipo] || 'gray'}">${t.tipo}</span></td>
        <td>${inputEditableLote(t.id, 'cultivo', t.cultivo, 70)}</td>
        <td>${inputEditableLote(t.id, 'contratista', t.contratista, 80)}</td>
        <td>${inputEditableLote(t.id, 'descripcion', t.descripcion, 130)}</td>
        <td>${inputEditableLote(t.id, 'dosis', t.dosis, 80, 'Ej: 3 lt/ha')}</td>
        <td>${inputEditableLote(t.id, 'consumo_total', t.consumo_total, 80, 'Ej: 270 lts')}</td>
        <td>${costoUnit ? fmtMonto(costoUnit, 'ARS') : '—'}</td>
        <td>${costoTotal ? fmtMonto(costoTotal, 'ARS') : '—'}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="9"><div class="empty-state"><div class="icon">🌾</div><h3>Sin trabajos en este lote para esta campaña</h3></div></td></tr>`}</tbody></table></div>
  </div>`;
}
