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

function normalizarTexto(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

function normalizarCampania(c) { return (c || '').split('/').map(p => p.trim().slice(-2)).join('/'); }

function buscarCostoUnitarioInsumo(descripcion, campania) {
  if (!descripcion) return null;
  const needle = normalizarTexto(descripcion);
  if (needle.length < 3) return null;
  const campN = normalizarCampania(campania);
  const precios = [];
  boletasParaLotes.forEach(b => {
    if (!normalizarTexto(b.concepto).includes(needle)) return;
    let obs;
    try { obs = JSON.parse(b.observaciones || '{}'); } catch(e) { return; }
    if (normalizarCampania(obs.campania) !== campN) return;
    if (!obs.costo_unitario) return;
    const precio = obs.moneda_costo === 'USD' ? obs.costo_unitario * (obs.tipo_cambio || 1) : obs.costo_unitario;
    precios.push(precio);
  });
  if (!precios.length) return null;
  return precios.reduce((s, p) => s + p, 0) / precios.length;
}

function precioPromedioGrano(grano, campania) {
  const filtradas = liqGranosParaLotes.filter(l => (l.grano || '').toLowerCase() === (grano || '').toLowerCase() && l.campania === campania && l.precio_tt);
  if (!filtradas.length) return null;
  const prom = filtradas.reduce((s, l) => s + parseFloat(l.precio_tt), 0) / filtradas.length;
  return prom / 1000;
}

function calcularResumenLote(campo, lote, campania) {
  const trabs = trabajosParaLotes.filter(t => t.campo === campo && String(t.lote) === String(lote) && t.campania === campania);

  let costoInsumos = 0, sinPrecio = 0;
  const tarifaPorTipo = {};
  tarifasTrabajos.forEach(t => tarifaPorTipo[t.tipo] = t.tarifa_ha);
  const headersContados = new Set();
  let costoTarifas = 0;

  let ingresoRendimiento = 0;
  const rendimientos = [];

  trabs.forEach(t => {
    if (t.descripcion && (t.dosis || t.consumo_total)) {
      const cantidad = parseNumeroDeTexto(t.consumo_total) || parseNumeroDeTexto(t.dosis) * (t.hectareas || 0);
      const costoUnit = buscarCostoUnitarioInsumo(t.descripcion, campania);
      if (costoUnit && cantidad) costoInsumos += costoUnit * cantidad;
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

  const margenBruto = ingresoRendimiento - costoInsumos - costoTarifas;
  return { cantTrabajos: trabs.length, costoInsumos, costoTarifas, sinPrecio, ingresoRendimiento, rendimientos, margenBruto };
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
    const r = calcularResumenLote(l.campo, l.lote, campania);
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
        <div>Rendimiento: <strong>${r.rendimientos.length ? r.rendimientos.join(', ') : '—'}</strong></div>
        <div>Ingreso estimado: <strong>${r.ingresoRendimiento ? fmtMonto(r.ingresoRendimiento, 'ARS') : '—'}</strong></div>
      </div>
      <div style="font-weight:600;font-size:13px;margin-top:8px;color:${margenColor}">Margen bruto estimado: ${fmtMonto(r.margenBruto, 'ARS')}</div>
    </div>`;
  }).join('');

  renderDetalleLote(campania);
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
    <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Cultivo</th><th>Contratista</th><th>Insumo</th><th>Dosis</th><th>Consumo total</th><th>Rendimiento</th></tr></thead>
    <tbody>${trabs.length ? trabs.map(t => `
      <tr>
        <td>${fmtFecha(t.fecha)}</td>
        <td><span class="badge badge-${colors[t.tipo] || 'gray'}">${t.tipo}</span></td>
        <td>${t.cultivo || '—'}</td>
        <td>${t.contratista || '—'}</td>
        <td>${t.descripcion || '—'}</td>
        <td>${t.dosis || '—'}</td>
        <td>${t.consumo_total || '—'}</td>
        <td>${t.rendimiento ? fmtNum(t.rendimiento) + ' ' + (t.rendimiento_unidad || '') : '—'}</td>
      </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="icon">🌾</div><h3>Sin trabajos en este lote para esta campaña</h3></div></td></tr>`}</tbody></table></div>
  </div>`;
}
