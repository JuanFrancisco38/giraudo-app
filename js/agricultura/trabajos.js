// ── AUTOCOMPLETE ──────────────────────────────────────────────
let _acCache = {};

async function cargarCacheAutocomplete() {
  if (_acCache._cargado) return;
  const rows = await sb('GET', 'trabajos_agricolas', '', '?order=fecha.desc&limit=500') || [];
  const boletas = await sb('GET', 'boletas', '', '?order=fecha.desc&limit=500') || [];
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
  _acCache.contratista  = uniq(rows.map(r => r.contratista).filter(c => c && c !== 'Propio'));
  _acCache.cultivo      = uniq(rows.map(r => r.cultivo));
  _acCache.cliente      = uniq(rows.map(r => r.cliente));
  _acCache.campo_tercero= uniq(rows.map(r => r.cliente ? r.campo : null));
  _acCache.tarifa       = uniq(rows.filter(r => r.tarifa_cobrada).map(r => String(r.tarifa_cobrada)));
  // insumos: de trabajos + descripciones de boletas agroquímicos/semillas/fertilizantes
  const insTrabajos = rows.map(r => r.descripcion).filter(Boolean);
  const insBoletas  = boletas.filter(b => ['Agroquímicos','Semillas','Fertilizantes'].includes(b.categoria))
    .map(b => { try { return JSON.parse(b.observaciones||'[]'); } catch(e){ return []; } })
    .flat().map(i => i.descripcion_a).filter(Boolean);
  _acCache.insumo = uniq([...insTrabajos, ...insBoletas]);
  _acCache._cargado = true;
}

function mostrarSugerencias(input, lista) {
  cerrarSugerencias();
  const q = input.value.trim().toLowerCase();
  const sugs = q
    ? lista.filter(v => v.toLowerCase().includes(q)).slice(0, 8)
    : lista.slice(0, 8);
  if (!sugs.length) return;
  const rect = input.getBoundingClientRect();
  const div = document.createElement('div');
  div.id = 'ac-dropdown';
  div.style.cssText = `position:fixed;top:${rect.bottom+2}px;left:${rect.left}px;width:${rect.width}px;background:#fff;border:1px solid #ccc;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:99999;max-height:200px;overflow-y:auto`;
  sugs.forEach(v => {
    const item = document.createElement('div');
    item.textContent = v;
    item.style.cssText = 'padding:7px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #f0f0f0';
    item.onmousedown = (e) => { e.preventDefault(); input.value = v; input.dispatchEvent(new Event('input')); cerrarSugerencias(); };
    item.onmouseover = () => item.style.background = '#f5f5f5';
    item.onmouseout  = () => item.style.background = '';
    div.appendChild(item);
  });
  document.body.appendChild(div);
}

function cerrarSugerencias() {
  document.getElementById('ac-dropdown')?.remove();
}

function acInput(input, key) {
  mostrarSugerencias(input, _acCache[key] || []);
}

document.addEventListener('click', e => { if (!e.target.closest('#ac-dropdown')) cerrarSugerencias(); });
// ── FIN AUTOCOMPLETE ───────────────────────────────────────────

function filaInsumoModalHTML() {
  return `<div class="insumo-row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr auto;gap:6px;margin-bottom:8px;align-items:flex-end">
    <div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:11px;color:#555;font-weight:600">Insumo / Producto</label><input type="text" class="ins-desc" style="border:1px solid #ccc;border-radius:5px;padding:5px 7px;font-size:13px" oninput="acInput(this,'insumo')" onfocus="acInput(this,'insumo')" onblur="cerrarSugerencias()"></div>
    <div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:11px;color:#555;font-weight:600">Dosis</label><input type="text" class="ins-dosis" placeholder="3 lt/ha" style="border:1px solid #ccc;border-radius:5px;padding:5px 7px;font-size:13px" oninput="calcConsumoInsumo(this)"></div>
    <div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:11px;color:#555;font-weight:600">Consumo total</label><input type="text" class="ins-consumo" placeholder="Auto" style="border:1px solid #ccc;border-radius:5px;padding:5px 7px;font-size:13px;background:#f8f8f8" readonly></div>
    <div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:11px;color:#555;font-weight:600">$ Unitario</label><input type="number" class="ins-precio" placeholder="0" style="border:1px solid #ccc;border-radius:5px;padding:5px 7px;font-size:13px" oninput="calcTotalInsumo(this)"></div>
    <div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:11px;color:#555;font-weight:600">$ Total</label><input type="number" class="ins-total" placeholder="0" style="border:1px solid #ccc;border-radius:5px;padding:5px 7px;font-size:13px;background:#f8f8f8" readonly></div>
    <button type="button" onclick="this.closest('.insumo-row').remove()" style="padding:5px 8px;border:1px solid #ccc;background:#fff;border-radius:5px;cursor:pointer;font-size:14px;color:#999;align-self:flex-end">🗑️</button>
  </div>`;
}

function agregarFilaInsumoModal() {
  document.getElementById('mtr-insumos-list').insertAdjacentHTML('beforeend', filaInsumoModalHTML());
}

function getTotalHectareas() {
  const filas = [...document.querySelectorAll('#mtr-lotes-list .lote-row')];
  return filas.reduce((s, f) => s + (parseFloat(f.querySelector('.lot-has').value) || 0), 0);
}

function recalcularTodosInsumos() {
  document.querySelectorAll('#mtr-insumos-list .insumo-row').forEach(row => {
    const dosisInput = row.querySelector('.ins-dosis');
    if (dosisInput.value) calcConsumoInsumo(dosisInput);
  });
}

function calcConsumoInsumo(input) {
  const row = input.closest('.insumo-row');
  const dosis = parseNumeroDeTexto(input.value) || 0;
  const unidad = (input.value.match(/[a-zA-Z]+/) || [''])[0];
  const has = getTotalHectareas();
  const consumo = dosis && has ? dosis * has : 0;
  row.querySelector('.ins-consumo').value = consumo ? `${consumo} ${unidad}`.trim() : '';
  calcTotalInsumo(row.querySelector('.ins-precio'));
}

function calcTotalInsumo(input) {
  const row = input.closest('.insumo-row');
  const consumoRaw = row.querySelector('.ins-consumo').value;
  const precio = parseFloat(input.value) || 0;
  const cantidad = parseNumeroDeTexto(consumoRaw) || 0;
  row.querySelector('.ins-total').value = precio && cantidad ? Math.round(precio * cantidad) : '';
}

// Filtro por tipo_labor → IDs de máquina que aparecen en el desplegable
// (implementa tipo_labor_asociado de la spec sin requerir columna en DB)
const TIPO_LABOR_MAQUINAS = {
  corte:              ['12ad762c-6a3d-4158-b8a4-417606732785'], // Segadora NH 313
  rastrillado:        ['b77334c2-18e8-445d-89cb-77cc4553ca6b'], // Rastrillo Gimetal 16 Estrellas
  enrollado:          ['879f7b85-0b7f-4573-ad1d-1d13411b6b8f'], // New Holland RB460C
  recoleccion_rollos: ['ae011f70-6b2a-4958-b8b7-9b8cdda3de4d'], // Sacarrollos
  cosecha:            ['bd759fb7-1ae2-4bef-a88a-8df3a7a85937'], // Case IH 2388
  siembra:            ['e45170d7-8851-4a70-9c1b-3c02d048bfa4'], // Super Walter 630 WG
  picado:             ['90d4acf6-98ea-4754-967b-a3090a42a960'], // Picadora Mainero 4751
  pulverizacion:      ['c0f57a24-d499-4502-8155-965acaa934b7'], // Fumigador Praba
  // fertilizacion / movimiento_suelos → sin máquina específica, se filtra por categoría
};

let maquinariaModalCache = [];
let _mtrTipo = null;
let _mtrLotes = [];
let _mtrLoteSeleccionado = null;

async function cargarMaquinariaModal() {
  if (typeof maquinas !== 'undefined' && maquinas.length) {
    maquinariaModalCache = maquinas;
    return maquinariaModalCache;
  }
  if (maquinariaModalCache.length) return maquinariaModalCache;
  const rows = await sb('GET', 'maquinaria', null, '?order=categoria,nombre');
  maquinariaModalCache = rows || [];
  return maquinariaModalCache;
}

function normCat(s) {
  return (s || '').toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n').trim();
}

function actualizarSelectMaquinaria(tipo) {
  const sel = document.getElementById('mtr-herramienta');
  if (!sel) return;
  let filtradas = maquinariaModalCache;
  if (tipo) {
    const ids = TIPO_LABOR_MAQUINAS[tipo];
    if (ids) {
      // Filtro preciso por ID de máquina según spec
      filtradas = maquinariaModalCache.filter(m => ids.includes(m.id));
      if (!filtradas.length) filtradas = maquinariaModalCache; // fallback si no hay match
    }
    // Para tipos sin mapa de IDs (fertilizacion, movimiento_suelos, etc.) → todas las máquinas
  }

  sel.innerHTML = '<option value="">— Sin especificar —</option>';
  // Agrupar por categoría
  const grupos = {};
  filtradas.forEach(m => {
    const c = m.categoria || 'Otro';
    if (!grupos[c]) grupos[c] = [];
    grupos[c].push(m);
  });
  Object.entries(grupos).forEach(([cat, items]) => {
    const og = document.createElement('optgroup');
    og.label = cat;
    items.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.dataset.nombre = m.nombre;
      opt.textContent = m.nombre;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
}

function filaLoteModalHTML() {
  return `<div class="lote-row" style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:flex-end">
    <div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:11px;color:#555;font-weight:600">Lote</label><input type="text" class="lot-num" placeholder="Ej: 3" style="border:1px solid #ccc;border-radius:5px;padding:5px 7px;font-size:13px"></div>
    <div style="display:flex;flex-direction:column;gap:3px"><label style="font-size:11px;color:#555;font-weight:600">Hectáreas</label><input type="number" class="lot-has" placeholder="Ej: 78" style="border:1px solid #ccc;border-radius:5px;padding:5px 7px;font-size:13px" oninput="recalcularTodosInsumos()"></div>
    <button type="button" onclick="this.closest('.lote-row').remove()" style="padding:5px 8px;border:1px solid #ccc;background:#fff;border-radius:5px;cursor:pointer;font-size:14px;color:#999;align-self:flex-end">🗑️</button>
  </div>`;
}

function agregarFilaLoteModal() {
  document.getElementById('mtr-lotes-list').insertAdjacentHTML('beforeend', filaLoteModalHTML());
}

let _boletasInsumos = null;
let _rubroActivoPanel = 'Agroquímicos';

async function cargarPanelPreciosInsumos() {
  if (!_boletasInsumos) {
    const rubros = ['Agroquímicos', 'Semillas', 'Fertilizantes'];
    const todas = await sb('GET', 'boletas', '', '?order=fecha.desc') || [];
    _boletasInsumos = todas.filter(b => rubros.includes(b.categoria)).map(b => {
      let obs = {};
      try { obs = JSON.parse(b.observaciones || '[]'); } catch(e) {}
      // observaciones puede ser array de items o un objeto
      const items = Array.isArray(obs) ? obs : (obs.items || [obs]);
      return items.map(it => ({
        descripcion_a: it.descripcion_a || b.concepto || '—',
        costo_unitario: it.costo_unitario ?? null,
        unidad: it.unidad || '',
        moneda: it.moneda_costo || 'ARS',
        campania: it.campania || b.campania || null,
        fecha: b.fecha,
        categoria: b.categoria,
      }));
    }).flat().filter(i => i.descripcion_a && i.descripcion_a !== '—');
    // Poblar select de campañas
    const camps = [...new Set(_boletasInsumos.map(b => b.campania).filter(Boolean))].sort().reverse();
    const sel = document.getElementById('panel-insumos-camp');
    if (sel) camps.forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));
  }
  renderPanelInsumos();
}

function toggleRubroPanel(rubro) {
  _rubroActivoPanel = rubro;
  ['Agroquímicos','Semillas','Fertilizantes'].forEach(r => {
    const ids = {'Agroquímicos':'btn-pi-agro','Semillas':'btn-pi-semi','Fertilizantes':'btn-pi-fert'};
    const btn = document.getElementById(ids[r]);
    if (!btn) return;
    const activo = r === rubro;
    btn.style.background = activo ? '#8B1A2F' : '#fff';
    btn.style.color = activo ? '#fff' : '#555';
    btn.style.border = activo ? '1px solid #8B1A2F' : '1px solid #ccc';
  });
  renderPanelInsumos();
}

function renderPanelInsumos() {
  const lista = document.getElementById('panel-insumos-lista');
  if (!lista) return;
  const q = (document.getElementById('panel-insumos-busca')?.value || '').toLowerCase().trim();
  const camp = document.getElementById('panel-insumos-camp')?.value || '';
  const items = (_boletasInsumos || []).filter(b => {
    if (b.categoria !== _rubroActivoPanel) return false;
    if (camp && b.campania !== camp) return false;
    if (q && !(b.descripcion_a || '').toLowerCase().includes(q)) return false;
    return true;
  });
  if (!items.length) {
    lista.innerHTML = `<div style="padding:20px;text-align:center;color:#aaa;font-size:13px">Sin resultados</div>`;
    return;
  }
  lista.innerHTML = items.map(b => {
    const precioUnit = b.costo_unitario;
    const unidad = b.unidad || '';
    const moneda = b.moneda || 'ARS';
    const campania = b.campania || '—';
    return `<div style="padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:12px">
      <div style="font-weight:600;color:#222;margin-bottom:2px">${b.descripcion_a}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;color:#555">
        <span style="color:#2a6f2a;font-weight:600">${precioUnit != null ? fmtMonto(precioUnit, moneda) + (unidad ? '/' + unidad : '') : '—'}</span>
        <span style="color:#888">📅 ${campania}</span>
        <span style="color:#aaa">${fmtFecha(b.fecha)}</span>
      </div>
    </div>`;
  }).join('');
}

function filtrarPanelInsumos() {
  renderPanelInsumos();
}

const _MTR_TIPO_MAQ = {
  siembra:'Siembra', pulverizacion:'Pulverización', fertilizacion:'Fertilización',
  cosecha:'Cosecha', enrollado:'Henificación', recoleccion_rollos:'Henificación',
  corte:'Henificación', rastrillado:'Labranza', movimiento_suelos:'Labranza', picado:'Labranza'
};

function mtrSeleccionarTipo(tipo) {
  _mtrTipo = tipo;
  document.querySelectorAll('.mtr-tipo-btn').forEach(b => {
    const sel = b.dataset.tipo === tipo;
    b.style.background  = sel ? '#8B1A2F' : '#fff';
    b.style.color       = sel ? '#fff'    : '#333';
    b.style.borderColor = sel ? '#8B1A2F' : '#ddd';
  });
  document.getElementById('mtr-resto').style.display = '';
  const esRollos  = ['enrollado','recoleccion_rollos'].includes(tipo);
  const esCosecha = tipo === 'cosecha';
  const esInsumos = ['siembra','pulverizacion','fertilizacion'].includes(tipo);
  document.getElementById('mtr-wrap-rollos').style.display     = esRollos  ? '' : 'none';
  document.getElementById('mtr-wrap-rendimiento').style.display = esCosecha ? '' : 'none';
  document.getElementById('mtr-wrap-insumos').style.display     = esInsumos ? '' : 'none';
  if (esInsumos && !document.querySelector('#mtr-insumos-list .insumo-row')) agregarFilaInsumoModal();
  const labelEl = document.getElementById('mtr-tarifa-unidad');
  if (labelEl) labelEl.textContent = esRollos ? 'rollo' : 'ha';
  const tarifaEl = document.getElementById('mtr-tarifa-lts');
  if (tarifaEl && !tarifaEl.value) {
    if (esRollos) tarifaEl.value = 10;
    else if (tipo === 'corte') tarifaEl.value = 23;
  }
  // Filtrar maquinaria por tipo_labor
  actualizarSelectMaquinaria(tipo);
  mtrMostrarCobro();
  mtrCalcCobro();
}

function mtrMostrarCobro() {
  const esTercero = !!_mtrLoteSeleccionado?.propietario_id;
  const el = document.getElementById('mtr-panel-cobro');
  if (el) el.style.display = esTercero && _mtrTipo ? '' : 'none';
}

function mtrLoteChange() {
  const loteId = document.getElementById('mtr-lote-id')?.value;
  _mtrLoteSeleccionado = _mtrLotes.find(l => l.id === loteId) || null;
  // Auto-fill hectareas
  const hasEl = document.getElementById('mtr-has');
  if (hasEl && !hasEl.value && _mtrLoteSeleccionado?.hectareas) {
    hasEl.value = _mtrLoteSeleccionado.hectareas;
    mtrRecalcInsumos();
  }
  // Aviso tercero
  const esTercero = !!_mtrLoteSeleccionado?.propietario_id;
  const avisoEl = document.getElementById('mtr-aviso-tercero');
  if (avisoEl) {
    avisoEl.style.display = esTercero ? '' : 'none';
    if (esTercero) {
      const n = document.getElementById('mtr-tercero-nombre');
      if (n) n.textContent = _mtrLoteSeleccionado?.partes?.nombre || '(propietario)';
    }
  }
  mtrMostrarCobro();
  mtrCalcCobro();
}

function mtrCampoChange() {
  const campo = document.getElementById('mtr-campo-sel')?.value;
  const sel   = document.getElementById('mtr-lote-id');
  if (!sel) return;
  const filtrados = campo ? _mtrLotes.filter(l => l.campo === campo) : _mtrLotes;
  sel.innerHTML = '<option value="">— Elegir lote —</option>' +
    filtrados.map(l => `<option value="${l.id}">${l.lote}${l.hectareas ? ' — '+l.hectareas+' ha' : ''}</option>`).join('');
  _mtrLoteSeleccionado = null;
}

function mtrActualizarCampania() {
  const fecha = document.getElementById('mtr-fecha')?.value;
  if (!fecha) return;
  const d = new Date(fecha), m = d.getMonth()+1, y = d.getFullYear();
  const from = m >= 7 ? y : y-1;
  const camp = `${String(from).slice(2)}/${String(from+1).slice(2)}`;
  const el = document.getElementById('mtr-campania');
  if (el && !el.dataset.editado) el.value = camp;
}

function mtrCalcCobro() {
  const tarifa = parseFloat(document.getElementById('mtr-tarifa-lts')?.value) || 0;
  const esRollos = ['enrollado','recoleccion_rollos'].includes(_mtrTipo);
  const qty = esRollos
    ? parseFloat(document.getElementById('mtr-rollos')?.value) || 0
    : parseFloat(document.getElementById('mtr-has')?.value) || 0;
  const el = document.getElementById('mtr-cobro-lts');
  if (el) el.value = tarifa && qty ? (tarifa * qty).toFixed(1) : '';
  mtrCalcCobroPesos();
}

function mtrCalcCobroPesos() {
  const lts    = parseFloat(document.getElementById('mtr-cobro-lts')?.value)     || 0;
  const precio = parseFloat(document.getElementById('mtr-precio-gasoil')?.value) || 0;
  const el     = document.getElementById('mtr-cobro-pesos');
  if (el) el.value = lts && precio ? Math.round(lts * precio) : '';
}

function mtrCalcRindeHa() {
  const total = parseFloat(document.getElementById('mtr-rendimiento')?.value) || 0;
  const has   = parseFloat(document.getElementById('mtr-has')?.value) || 0;
  const el    = document.getElementById('mtr-rinde-ha');
  if (el) el.value = total && has ? fmtNum(Math.round(total / has)) + ' kg/ha' : '';
}

function mtrEjecutorChange() {
  const val = document.querySelector('input[name="mtr-ejecutor"]:checked')?.value;
  const pp = document.getElementById('mtr-panel-propio');
  const pc = document.getElementById('mtr-panel-contratista');
  if (pp) pp.style.display = val === 'propio'      ? '' : 'none';
  if (pc) pc.style.display = val === 'contratista' ? '' : 'none';
  if (val === 'propio' && _mtrTipo) actualizarSelectMaquinaria(_mtrTipo);
}

function mtrRecalcInsumos() {
  document.querySelectorAll('#mtr-insumos-list .insumo-row').forEach(row => {
    const d = row.querySelector('.ins-dosis');
    if (d?.value) calcConsumoInsumo(d);
  });
  mtrCalcCobro();
}

async function abrirModalTrabajo() {
  _mtrTipo = null;
  _mtrLoteSeleccionado = null;

  const [lotes, empleados, partes] = await Promise.all([
    sb('GET', 'lotes', '', '?select=id,campo,lote,propietario_id,hectareas,partes(nombre)&order=campo,lote'),
    sb('GET', 'empleados', '', '?order=nombre'),
    sb('GET', 'partes', '', '?order=nombre'),
    cargarMaquinariaModal(),
  ]);
  _mtrLotes = lotes || [];

  cargarPanelPreciosInsumos();
  cargarCacheAutocomplete();

  // Opciones lotes agrupadas por campo
  const porCampo = {};
  for (const l of _mtrLotes) {
    const c = l.campo || '—';
    if (!porCampo[c]) porCampo[c] = [];
    porCampo[c].push(l);
  }
  const lotesOpts = Object.entries(porCampo).map(([campo, ls]) =>
    `<optgroup label="${campo}">${ls.map(l =>
      `<option value="${l.id}">${l.lote}${l.hectareas ? ` — ${l.hectareas} ha` : ''}${l.propietario_id ? ' 👤' : ''}</option>`
    ).join('')}</optgroup>`
  ).join('');

  // Opciones maquinaria agrupadas por categoría
  const porCat = {};
  for (const m of maquinariaModalCache) {
    const c = m.categoria || 'Otro';
    if (!porCat[c]) porCat[c] = [];
    porCat[c].push(m);
  }
  const maqOpts = `<option value="">— Sin especificar —</option>` +
    Object.entries(porCat).map(([cat, items]) =>
      `<optgroup label="${cat}">${items.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('')}</optgroup>`
    ).join('');

  const empOpts = (empleados || []).map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  const partesOpts = (partes || []).map(p => `<option value="${p.nombre}">`).join('');

  const hoy = new Date().toISOString().split('T')[0];
  const TIPOS = [
    {k:'siembra',label:'🌱 Siembra'},
    {k:'pulverizacion',label:'💧 Pulverización'},
    {k:'fertilizacion',label:'🌿 Fertilización'},
    {k:'cosecha',label:'🌾 Cosecha'},
    {k:'corte',label:'✂️ Corte'},
    {k:'rastrillado',label:'〰️ Rastrillado'},
    {k:'enrollado',label:'🟤 Enrollado'},
    {k:'recoleccion_rollos',label:'📦 Recolección'},
    {k:'picado',label:'⚙️ Picado (silaje)'},
    {k:'movimiento_suelos',label:'🪚 Mov. suelos'},
  ];
  const tipoBtns = TIPOS.map(t =>
    `<button class="mtr-tipo-btn" data-tipo="${t.k}" onclick="mtrSeleccionarTipo('${t.k}')"
      style="padding:10px 6px;border:1.5px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;text-align:center;line-height:1.3;transition:all .15s">
      ${t.label}
    </button>`
  ).join('');

  document.getElementById('mtr-form-contenido').innerHTML = `
    <div style="padding:20px 24px 16px;border-bottom:2px solid #8B1A2F;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#fff;z-index:1">
      <h3 style="margin:0;color:#8B1A2F;font-size:17px">✚ Nuevo trabajo de campo</h3>
      <button onclick="cerrarModalTrabajo()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666;line-height:1">✕</button>
    </div>
    <div style="padding:20px 24px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8B1A2F;letter-spacing:.5px;margin-bottom:10px">1. Tipo de trabajo</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:22px">${tipoBtns}</div>

      <div id="mtr-resto" style="display:none">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8B1A2F;letter-spacing:.5px;margin-bottom:10px">2. Datos generales</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
          <div class="form-group" style="margin:0"><label>Fecha</label>
            <input type="date" id="mtr-fecha" value="${hoy}" oninput="mtrActualizarCampania()"></div>
          <div class="form-group" style="margin:0"><label>Establecimiento</label>
            <select id="mtr-campo-sel" onchange="mtrCampoChange()" style="width:100%">
              <option value="">— Elegir campo —</option>
              ${[...new Set(_mtrLotes.map(l=>l.campo))].sort().map(c=>`<option value="${c}">${c}</option>`).join('')}
            </select></div>
          <div class="form-group" style="margin:0"><label>Hectáreas trabajadas</label>
            <input type="number" id="mtr-has" placeholder="Ej: 78" oninput="mtrRecalcInsumos()"></div>
          <div class="form-group" style="margin:0"><label>Lote</label>
            <select id="mtr-lote-id" onchange="mtrLoteChange()" style="width:100%">
              <option value="">— Elegir lote —</option>
            </select></div>
          <div class="form-group" style="margin:0"><label>Cultivo</label>
            <input type="text" id="mtr-cultivo" placeholder="Ej: Soja, Maíz, Alfalfa"></div>
          <div class="form-group" style="margin:0"><label>Campaña</label>
            <input type="text" id="mtr-campania" placeholder="Auto" oninput="this.dataset.editado='1'"></div>
        </div>

        <div id="mtr-aviso-tercero" style="display:none;background:#fff8e1;border:1px solid #f0c040;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px">
          👤 Campo de tercero: <strong id="mtr-tercero-nombre"></strong>. Se calculará lo que se le cobra en gasoil.
        </div>

        <div id="mtr-wrap-rollos" style="display:none;margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8B1A2F;letter-spacing:.5px;margin-bottom:8px">3. Producción</div>
          <div class="form-group" style="margin:0;max-width:220px"><label>Cantidad de rollos</label>
            <input type="number" id="mtr-rollos" placeholder="Ej: 120" oninput="mtrCalcCobro()"></div>
        </div>

        <div id="mtr-wrap-rendimiento" style="display:none;margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8B1A2F;letter-spacing:.5px;margin-bottom:8px">3. Producción cosechada</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:420px">
            <div class="form-group" style="margin:0"><label>Total cosechado (kg)</label>
              <input type="number" id="mtr-rendimiento" placeholder="Ej: 195000" oninput="mtrCalcRindeHa()"></div>
            <div class="form-group" style="margin:0"><label>Rinde/ha (auto)</label>
              <input type="text" id="mtr-rinde-ha" readonly style="background:#f5f5f5" placeholder="—"></div>
          </div>
        </div>

        <div id="mtr-wrap-insumos" style="display:none;margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8B1A2F;letter-spacing:.5px;margin-bottom:8px">3. Insumos / Productos</div>
          <p style="font-size:12px;color:#888;margin:0 0 8px">Un insumo por fila. El consumo total se calcula solo si cargás la dosis y las hectáreas.</p>
          <div id="mtr-insumos-list"></div>
          <button type="button" onclick="agregarFilaInsumoModal()" style="margin-top:6px;padding:6px 12px;font-size:12px;border:1px dashed #8B1A2F;background:none;color:#8B1A2F;border-radius:6px;cursor:pointer">+ Agregar insumo</button>
        </div>

        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8B1A2F;letter-spacing:.5px;margin-bottom:10px">4. ¿Quién lo ejecuta?</div>
          <div style="display:flex;gap:20px;margin-bottom:12px">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:500">
              <input type="radio" name="mtr-ejecutor" value="propio" checked onchange="mtrEjecutorChange()"> Maquinaria propia
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:500">
              <input type="radio" name="mtr-ejecutor" value="contratista" onchange="mtrEjecutorChange()"> Contratista externo
            </label>
          </div>
          <div id="mtr-panel-propio" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="form-group" style="margin:0"><label>Maquinaria</label>
              <select id="mtr-herramienta" style="width:100%">${maqOpts}</select></div>
            <div class="form-group" style="margin:0"><label>Operario</label>
              <select id="mtr-operario-id" style="width:100%"><option value="">— Sin especificar —</option>${empOpts}</select></div>
          </div>
          <div id="mtr-panel-contratista" style="display:none;grid-template-columns:1fr 1fr;gap:10px">
            <div class="form-group" style="margin:0"><label>Contratista</label>
              <input type="text" id="mtr-contratista-nombre" list="mtr-partes-list" placeholder="Nombre" style="width:100%">
              <datalist id="mtr-partes-list">${partesOpts}</datalist></div>
            <div class="form-group" style="margin:0"><label>Costo $</label>
              <input type="number" id="mtr-contratista-costo" placeholder="0" style="width:100%"></div>
          </div>
        </div>

        <div id="mtr-panel-cobro" style="display:none;background:#eef5ff;border:1px solid #6699cc;border-radius:8px;padding:12px;margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;color:#1a4a80;margin-bottom:8px">5. 💰 Cobro al tercero (en litros de gasoil)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">
            <div class="form-group" style="margin:0"><label>Tarifa (lts/<span id="mtr-tarifa-unidad">ha</span>)</label>
              <input type="number" id="mtr-tarifa-lts" placeholder="0" step="0.1" oninput="mtrCalcCobro()" style="width:100%"></div>
            <div class="form-group" style="margin:0"><label>Total a cobrar (lts)</label>
              <input type="number" id="mtr-cobro-lts" readonly style="background:#f5f5f5;width:100%"></div>
            <div class="form-group" style="margin:0"><label>Precio gasoil ($/lt)</label>
              <input type="number" id="mtr-precio-gasoil" placeholder="0" step="1" oninput="mtrCalcCobroPesos()" style="width:100%"></div>
            <div class="form-group" style="margin:0"><label>Total trabajo ($)</label>
              <input type="number" id="mtr-cobro-pesos" readonly style="background:#f5f5f5;width:100%"></div>
          </div>
          <div style="font-size:11px;color:#555;margin-top:8px">Tarifas estándar: enrollado 10 lts/rollo · corte 23 lts/ha</div>
        </div>
      </div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e0e0e0;display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;background:#fff">
      <button onclick="cerrarModalTrabajo()" style="padding:8px 20px;border:1px solid #ccc;background:#fff;border-radius:7px;cursor:pointer;font-size:14px">Cancelar</button>
      <button onclick="guardarTrabajoModal()" style="padding:8px 22px;background:#8B1A2F;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:14px;font-weight:600">💾 Guardar</button>
    </div>`;

  document.getElementById('modal-trabajo-overlay').style.display = 'block';
  document.getElementById('modal-trabajo').style.display = 'flex';
  mtrActualizarCampania();
}

function toggleTerceroModal() {} // conservado por compatibilidad

function cerrarModalTrabajo() {
  document.getElementById('modal-trabajo-overlay').style.display = 'none';
  document.getElementById('modal-trabajo').style.display = 'none';
}

async function guardarTrabajoModal() {
  if (!_mtrTipo) { toast('Elegí un tipo de trabajo primero', 'var(--tierra)'); return; }

  const fecha    = document.getElementById('mtr-fecha')?.value;
  const loteId   = document.getElementById('mtr-lote-id')?.value;
  const has      = parseFloat(document.getElementById('mtr-has')?.value) || null;
  const cultivo  = document.getElementById('mtr-cultivo')?.value || null;
  const campania = document.getElementById('mtr-campania')?.value || null;

  if (!fecha)  { toast('Completá la fecha', 'var(--tierra)'); return; }
  if (!loteId) { toast('Elegí un lote', 'var(--tierra)'); return; }

  const lote      = _mtrLotes.find(l => l.id === loteId);
  const esTercero = !!lote?.propietario_id;

  const cantRollos  = parseFloat(document.getElementById('mtr-rollos')?.value)     || null;
  const rendimiento = parseFloat(document.getElementById('mtr-rendimiento')?.value) || null;

  const ejecutor           = document.querySelector('input[name="mtr-ejecutor"]:checked')?.value || 'propio';
  const maquinaId          = document.getElementById('mtr-herramienta')?.value || null;
  const operarioId         = document.getElementById('mtr-operario-id')?.value || null;
  const contratistaNombre  = document.getElementById('mtr-contratista-nombre')?.value?.trim() || null;
  const contratistaCosto   = parseFloat(document.getElementById('mtr-contratista-costo')?.value) || null;
  const tarifaLts          = parseFloat(document.getElementById('mtr-tarifa-lts')?.value)        || null;
  const cobroLts           = parseFloat(document.getElementById('mtr-cobro-lts')?.value)         || null;
  const precioGasoil       = parseFloat(document.getElementById('mtr-precio-gasoil')?.value)     || null;
  const cobroPesos         = parseFloat(document.getElementById('mtr-cobro-pesos')?.value)       || null;

  const insFilas = [...document.querySelectorAll('#mtr-insumos-list .insumo-row')];
  const insumos = insFilas.map(f => ({
    insumo:        f.querySelector('.ins-desc')?.value?.trim() || '',
    dosis:         f.querySelector('.ins-dosis')?.value?.trim() || '',
    cantidad:      f.querySelector('.ins-consumo')?.value?.trim() || '',
    precio_unit:   parseFloat(f.querySelector('.ins-precio')?.value) || null,
    costo_total:   parseFloat(f.querySelector('.ins-total')?.value) || null,
  })).filter(i => i.insumo);

  // 1. Insertar en tabla nueva TRABAJOS
  const tRes = await sb('POST', 'trabajos', {
    fecha, tipo_labor: _mtrTipo, lote_id: loteId,
    hectareas: has, cultivo, campania,
    cantidad_rollos: cantRollos, rendimiento
  });
  if (!tRes?.[0]) { toast('❌ Error al guardar', 'var(--rojo)'); return; }
  const tid = tRes[0].id;

  // 2. Ejecutor
  if (ejecutor === 'propio' && (maquinaId || operarioId)) {
    await sb('POST', 'trabajo_maquinaria', {
      trabajo_id: tid,
      maquina_id:   maquinaId || undefined,
      operario_id:  operarioId || undefined,
      tarifa_gasoil:      esTercero ? tarifaLts    : null,
      precio_gasoil_ars:  esTercero ? precioGasoil : null,
      cobro_total_pesos:  esTercero ? cobroPesos   : null,
    });
  } else if (ejecutor === 'contratista' && contratistaNombre) {
    const contId = await resolverParteId(contratistaNombre);
    if (contId) await sb('POST', 'trabajo_contratista', {
      trabajo_id: tid, contratista_id: contId, costo: contratistaCosto
    });
  }

  // 3. Insumos
  for (const ins of insumos) {
    await sb('POST', 'trabajo_insumos', {
      trabajo_id: tid, insumo: ins.insumo,
      cantidad: ins.cantidad, costo_total: ins.costo_total
    });
  }

  // 4. Dual-write a trabajos_agricolas (legacy)
  const TIPO_INV = {
    siembra:'Siembra', pulverizacion:'Pulverización', fertilizacion:'Fertilización',
    cosecha:'Cosecha', enrollado:'Henificación', corte:'Segadora',
    rastrillado:'Rastrillo', movimiento_suelos:'Labranza',
    recoleccion_rollos:'Enrollado', picado:'Picado'
  };
  const legBase = {
    tipo: TIPO_INV[_mtrTipo] || _mtrTipo,
    fecha, campo: lote?.campo || '', lote: lote?.lote || '',
    hectareas: has, cultivo, campania,
    maquina_id: maquinaId || null,
    contratista: ejecutor === 'contratista' ? (contratistaNombre || 'Propio') : 'Propio',
    cliente: esTercero ? lote?.partes?.nombre : null,
    tarifa_cobrada:    esTercero ? cobroLts    : null,
    precio_gasoil_ars: esTercero ? precioGasoil: null,
    total_pesos:       esTercero ? cobroPesos  : null,
  };
  if (insumos.length) {
    for (const ins of insumos) {
      await sb('POST', 'trabajos_agricolas', {
        ...legBase, descripcion: ins.insumo, dosis: ins.dosis,
        consumo_total: ins.cantidad, precio_unitario: ins.precio_unit
      });
    }
  } else {
    await sb('POST', 'trabajos_agricolas', legBase);
  }

  toast('✅ Trabajo guardado');
  cerrarModalTrabajo();
  cargarTrabajos();
}

async function guardarTrabajo() {
  const header = {
    tipo: document.getElementById('tr-tipo').value,
    fecha: document.getElementById('tr-fecha').value,
    campo: document.getElementById('tr-campo').value,
    lote: document.getElementById('tr-lote').value,
    hectareas: parseFloat(document.getElementById('tr-has').value) || null,
    cultivo: document.getElementById('tr-cultivo').value,
    contratista: document.getElementById('tr-cont').value || 'Propio',
    campania: document.getElementById('tr-campania').value,
    rendimiento: parseFloat(document.getElementById('tr-rend').value) || null,
    rendimiento_unidad: document.getElementById('tr-rendunidad').value,
    precio_rendimiento: parseFloat(document.getElementById('tr-rendprecio').value) || null
  };
  const filas = [...document.querySelectorAll('#tr-insumos-list .insumo-row')];
  const insumos = filas.map(f => ({
    descripcion: f.querySelector('.ins-desc').value,
    dosis: f.querySelector('.ins-dosis').value,
    consumo_total: f.querySelector('.ins-consumo').value
  })).filter(i => i.descripcion || i.dosis || i.consumo_total);

  const registros = insumos.length ? insumos.map(i => ({ ...header, ...i })) : [{ ...header, descripcion: '', dosis: '', consumo_total: '' }];

  let ok = 0;
  for (const data of registros) {
    const r = await sb('POST', 'trabajos_agricolas', data);
    if (r) ok++;
  }
  if (ok) {
    toast(`✅ ${ok > 1 ? ok + ' renglones registrados' : 'Trabajo registrado'}`);
    toggleForm('form-trab');
    document.getElementById('tr-insumos-list').innerHTML = '';
    agregarInsumoTrabajo();
    cargarTrabajos();
  } else toast('❌ Error', 'var(--rojo)');
}

let trabajosTodos = [];
let trabajosPagina = 1;

function filtrarTrabajosReset() { trabajosPagina = 1; renderTrabajos(); }
function irPaginaTrabajos(p) { trabajosPagina = p; renderTrabajos(); window.scrollTo({ top: document.getElementById('section-trabajos_agri').offsetTop, behavior: 'smooth' }); }

// Resuelve o crea un lote en la tabla lotes por campo+numero
async function resolverLoteId(campo, loteNum, hectareas) {
  if (!campo || !loteNum) return null;
  const rows = await sb('GET', 'lotes', '', `?campo=eq.${encodeURIComponent(campo)}&lote=eq.${encodeURIComponent(loteNum)}`);
  if (rows && rows.length) return rows[0].id;
  const r = await sb('POST', 'lotes', { campo, lote: loteNum, hectareas: hectareas || null });
  return r?.[0]?.id || null;
}

// Resuelve o crea una parte (tercero) por nombre
async function resolverParteId(nombre) {
  if (!nombre || nombre === 'Propio') return null;
  const rows = await sb('GET', 'partes', '', `?nombre=eq.${encodeURIComponent(nombre)}`);
  if (rows && rows.length) return rows[0].id;
  const r = await sb('POST', 'partes', { nombre });
  return r?.[0]?.id || null;
}

async function cargarTrabajos() {
  const [rows] = await Promise.all([
    sb('GET', 'trabajos', '', '?select=id,fecha,tipo_labor,hectareas,cultivo,campania,origen_id,lotes(campo,lote),trabajo_insumos(*),trabajo_contratista(partes(nombre))&order=fecha.desc'),
    cargarDatosCostosInsumos()
  ]);
  trabajosTodos = rows || [];
  renderTrabajos();
}

const TIPO_LABEL_TRAB = {
  siembra:'Siembra', pulverizacion:'Pulverización', fertilizacion:'Fertilización',
  cosecha:'Cosecha', enrollado:'Enrollado', corte:'Corte', rastrillado:'Rastrillado',
  movimiento_suelos:'Labranza', otro:'Otro'
};
const TIPO_COLORS_TRAB = {
  siembra:'green', pulverizacion:'blue', fertilizacion:'yellow',
  cosecha:'tierra', enrollado:'bordo', corte:'bordo', rastrillado:'gris',
  movimiento_suelos:'tierra'
};

function normTipoTrab(s) {
  return (s || '').toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n').trim();
}

function renderTrabajos() {
  const tbody = document.getElementById('tabla-trabajos');
  if (!tbody) return;
  const fBusca = (document.getElementById('trab-filtro-busca')?.value || '').trim().toLowerCase();
  const fTipo  = normTipoTrab(document.getElementById('trab-filtro-tipo')?.value || '');

  const rows = trabajosTodos.filter(t => {
    const tl = normTipoTrab(t.tipo_labor);
    if (fTipo && tl !== fTipo) return false;
    const lote = t.lotes?.lote || '';
    const cultivo = t.cultivo || '';
    const cont = t.trabajo_contratista?.[0]?.partes?.nombre || 'Propio';
    if (fBusca && !`${lote} ${cultivo} ${cont}`.toLowerCase().includes(fBusca)) return false;
    return true;
  });

  const pag = document.getElementById('trab-paginador');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="icon">🌾</div><h3>${fBusca || fTipo ? 'Sin resultados para el filtro' : 'Sin trabajos'}</h3></div></td></tr>`;
    if (pag) pag.innerHTML = '';
    return;
  }

  const totalPag = Math.ceil(rows.length / FILAS_POR_PAGINA) || 1;
  if (trabajosPagina > totalPag) trabajosPagina = totalPag;
  const pagina = rows.slice((trabajosPagina - 1) * FILAS_POR_PAGINA, trabajosPagina * FILAS_POR_PAGINA);
  if (pag) pag.innerHTML = htmlPaginador(trabajosPagina, rows.length, 'irPaginaTrabajos');

  tbody.innerHTML = pagina.map(t => {
    const tl = t.tipo_labor || '';
    const tipoLabel = TIPO_LABEL_TRAB[tl] || tl;
    const campo = t.lotes?.campo || '—';
    const lote  = t.lotes?.lote  || '—';
    const cont  = t.trabajo_contratista?.[0]?.partes?.nombre || 'Propio';
    const insList = t.trabajo_insumos || [];
    const insDisplay = insList.length
      ? insList.map(i => `${i.insumo || ''}${i.cantidad ? ` (${i.cantidad})` : ''}`).join('<br>')
      : '—';
    const costoIns = insList.reduce((s, i) => s + (i.costo_total || 0), 0);
    const tarifaRow = (tarifasTrabajos || []).find(r => normTipoTrab(r.tipo) === normTipoTrab(tl));
    const costoTrab = tarifaRow?.tarifa_ha && t.hectareas ? tarifaRow.tarifa_ha * t.hectareas : null;
    const total = costoIns || costoTrab;
    const totalMostrar = total ? fmtMonto(total, 'ARS') : '—';
    const tarifaLabel = tarifaRow ? `<small style="color:#888;display:block">${fmtMonto(tarifaRow.tarifa_ha,'ARS')}/ha</small>` : '';
    return `<tr>
      <td>${fmtFecha(t.fecha)}</td>
      <td><span class="badge badge-${TIPO_COLORS_TRAB[tl] || 'gris'}">${tipoLabel}</span>${tarifaLabel}</td>
      <td>${campo}</td>
      <td>${lote}</td>
      <td>${t.hectareas ? t.hectareas + ' has' : '—'}</td>
      <td>${inputEditableTrabajo(t.id, 'cultivo', t.cultivo, 70)}</td>
      <td>${cont}</td>
      <td style="max-width:200px">${insDisplay}</td>
      <td>${totalMostrar}</td>
      <td>${inputEditableTrabajo(t.id, 'campania', t.campania, 70, 'Ej: 25/26')}</td>
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarTrabajo('${t.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

function inputEditableTrabajo(id, campo, valor, ancho, placeholder) {
  return `<input type="text" value="${valor || ''}" placeholder="${placeholder || ''}" style="width:${ancho}px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 5px;font-size:12px" onchange="editarCampoTrabajo('${id}', '${campo}', this.value)">`;
}

function inputEditableTrabajoNum(id, campo, valor, ancho) {
  const v = valor != null ? Math.round(valor * 100) / 100 : '';
  return `<span style="display:inline-flex;align-items:center;gap:3px"><span style="font-size:12px;color:var(--texto-suave)">$</span><input type="number" value="${v}" style="width:${ancho}px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 5px;font-size:12px" onchange="editarCampoTrabajo('${id}', '${campo}', parseFloat(this.value)||null)"></span>`;
}

async function editarCampoTrabajo(id, campo, valor) {
  const t = trabajosTodos.find(x => x.id === id);
  if (t) t[campo] = valor;
  const r = await sb('PATCH', 'trabajos', { [campo]: valor }, `?id=eq.${id}`);
  if (r) {
    if (t?.origen_id) await sb('PATCH', 'trabajos_agricolas', { [campo]: valor }, `?id=eq.${t.origen_id}`);
    toast('✅ Actualizado');
  } else toast('❌ Error al actualizar', 'var(--rojo)');
}

async function borrarTrabajo(id) {
  if (!confirm('¿Borrar este trabajo? Esta acción no se puede deshacer.')) return;
  const t = trabajosTodos.find(x => x.id === id);
  // Borrar de tabla nueva (cascade a insumos/contratista)
  await sb('DELETE', 'trabajos', null, `?id=eq.${id}`);
  // Borrar de tabla vieja por origen_id
  if (t?.origen_id) await sb('DELETE', 'trabajos_agricolas', null, `?id=eq.${t.origen_id}`);
  toast('🗑️ Trabajo borrado');
  cargarTrabajos();
}

async function procesarTrabajoImagen(input) {
  const file = input.files[0];
  if (!file) return;
  const campo = document.getElementById('trt-campo').value;
  const fecha = document.getElementById('trt-fecha').value;
  const status = document.getElementById('trt-img-status');
  const result = document.getElementById('trt-result');
  status.textContent = `📷 Leyendo ${file.name}...`;
  result.style.display = 'block'; result.innerHTML = 'Analizando...';

  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente agropecuario del Grupo Giraudo, Argentina. Analizá esta foto o PDF de una planilla / cuaderno de campo con trabajos agrícolas anotados (a mano o impresos) y extraé cada trabajo. Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"trabajos":[{"tipo":"Siembra|Pulverización|Fertilización|Cosecha|Henificación|Enrollado|Labranza|Otro","fecha":"DD/MM/YYYY","campo":"string","lote":"string","hectareas":0,"cultivo":"string","contratista":"string","dosis":"string (ej: 3 lt/ha)","consumo_total":"string (ej: 270 lts)","campania":"string (ej: 25/26)","descripcion":"string"}]}
Campo por defecto si no se aclara: "${campo}". Fecha por defecto si no se aclara: "${fecha ? fecha.split('-').reverse().join('/') : ''}". Si hay varios trabajos anotados, devolvé un objeto por cada uno. Si un dato no está, poné "" o 0. Si NO se menciona contratista (es decir, si la planilla no aclara que el trabajo lo hizo un tercero/contratista), poné "Propio" en ese campo, asumiendo que lo hizo el Grupo Giraudo con maquinaria/personal propio.

EQUIVALENCIAS DE CAMPO: "AZ" o "Azcona" = "Don Alfredo (Azcona)". "DV", "Vica" o "Doña Vica" = "Doña Vica". "SY", "Sant-Yago" o "Santiago" = "Sant-Yago". Usá siempre el nombre completo del campo tal como figura en estas equivalencias.

LOTE: los lotes de Grupo Giraudo son SIEMPRE numéricos, sin letras. Si en la planilla aparece como "LT6", "Lote 6", "L6" o similar, extraé solo el número: "6". Nunca incluyas "LT", "L" ni "Lote" en el campo "lote".

REGLA OBLIGATORIA SOBRE PRODUCTOS MÚLTIPLES: nunca pongas más de un producto/insumo en el campo "descripcion", y nunca sumes o concatenes dosis de distintos productos en "dosis" ni "consumo_total". Si un mismo trabajo (misma fecha/campo/lote/tipo) usó VARIOS productos (ej: una pulverización con dos herbicidas, o una siembra con semilla + fertilizante), tenés que devolver UN OBJETO POR CADA PRODUCTO, repitiendo fecha/campo/lote/hectareas/cultivo/contratista/campania en cada uno, y usando "descripcion" para el nombre de ESE producto puntual con su propia "dosis" y "consumo_total". Ejemplo: "Pulverización lote 1, 78has, glifosato 2lt/ha (160lts), 2,4-D 0.8lt/ha (60lts) y Finesse 1050gr" → TRES objetos (mismo lote/fecha/has): uno con descripcion "Glifosato", dosis "2 lt/ha", consumo_total "160 lts"; otro con descripcion "2,4-D", dosis "0.8 lt/ha", consumo_total "60 lts"; otro con descripcion "Finesse", dosis "1050 gr", consumo_total "1050 gr". NUNCA un solo objeto con todos los productos mezclados.`,
      'Extraé todos los trabajos de campo que figuren en esta imagen/PDF.');

    let ok = 0, fail = 0;
    for (const t of (datos.trabajos || [])) {
      const r = await sb('POST', 'trabajos_agricolas', {
        tipo: t.tipo, fecha: parseFechaIA(t.fecha) || fecha, campo: t.campo || campo,
        lote: t.lote, hectareas: t.hectareas || null, cultivo: t.cultivo,
        contratista: t.contratista, dosis: t.dosis, consumo_total: t.consumo_total, campania: t.campania, descripcion: t.descripcion
      });
      if (r) ok++; else fail++;
    }

    result.innerHTML = ok ? `✅ ${ok} trabajo${ok > 1 ? 's' : ''} registrado${ok > 1 ? 's' : ''}` + (fail ? `<br>❌ ${fail} con error` : '') : '❌ No se encontraron trabajos en la imagen.';
    status.textContent = ok ? `✅ ${file.name} leída` : '';
    if (ok) { toast(`✅ ${ok} trabajo${ok > 1 ? 's' : ''} registrado${ok > 1 ? 's' : ''}`); input.value = ''; cargarTrabajos(); }
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    result.innerHTML = '❌ Error al procesar la imagen.';
    toast('❌ Error al leer la imagen', 'var(--rojo)');
  }
}

async function importarTrabajoTexto() {
  const texto = document.getElementById('trt-texto').value.trim();
  const campo = document.getElementById('trt-campo').value;
  const fecha = document.getElementById('trt-fecha').value;
  if (!texto) { toast('Describí el trabajo primero', 'var(--tierra)'); return; }

  const btn = document.getElementById('btn-trab-texto');
  btn.disabled = true; btn.textContent = '⏳ Procesando...';
  document.getElementById('trt-status').textContent = 'La IA está interpretando...';
  const result = document.getElementById('trt-result');
  result.style.display = 'block'; result.innerHTML = 'Analizando...';

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        temperature: 0,
        system: `Sos un asistente agropecuario del Grupo Giraudo, Argentina. El usuario describe trabajos de campo. Extraé cada trabajo y devolvé SOLO JSON válido sin backticks:
{"trabajos":[{"tipo":"Siembra|Pulverización|Fertilización|Cosecha|Henificación|Enrollado|Labranza|Otro","fecha":"YYYY-MM-DD","campo":"string","lote":"string","hectareas":null,"cultivo":"string","contratista":"string","dosis":"string (ej: 3 lt/ha)","consumo_total":"string (ej: 270 lts)","campania":"string (ej: 25/26)","descripcion":"string","detalle":{}}]}
Campo por defecto: "${campo}". Fecha por defecto: "${fecha || new Date().toISOString().split('T')[0]}". Si hay varios trabajos en el texto, creá un objeto por cada uno. Si NO se menciona contratista (no se aclara que lo hizo un tercero), poné "Propio" en ese campo, asumiendo que lo hizo el Grupo Giraudo con maquinaria/personal propio.

EQUIVALENCIAS DE CAMPO: "AZ" o "Azcona" = "Don Alfredo (Azcona)". "DV", "Vica" o "Doña Vica" = "Doña Vica". "SY", "Sant-Yago" o "Santiago" = "Sant-Yago". Usá siempre el nombre completo del campo tal como figura en estas equivalencias.

LOTE: los lotes de Grupo Giraudo son SIEMPRE numéricos, sin letras. Si en la planilla aparece como "LT6", "Lote 6", "L6" o similar, extraé solo el número: "6". Nunca incluyas "LT", "L" ni "Lote" en el campo "lote".

REGLA OBLIGATORIA SOBRE PRODUCTOS MÚLTIPLES: nunca pongas más de un producto/insumo en el campo "descripcion", y nunca sumes o concatenes dosis de distintos productos en "dosis" ni "consumo_total". Si un mismo trabajo (misma fecha/campo/lote/tipo) menciona VARIOS productos, tenés que devolver UN OBJETO JSON POR CADA PRODUCTO, repitiendo fecha/campo/lote/hectareas/cultivo/contratista/campania en cada uno, y usando "descripcion" para el nombre de ESE producto puntual con su propia "dosis" y "consumo_total".
Ejemplo: si el texto dice "Pulverización lote 1, 78has, glifosato 2lt/ha (160lts), 2,4-D 0.8lt/ha (60lts) y Finesse 1050gr" tenés que devolver TRES objetos de trabajos (mismo lote/fecha/has), cada uno con su propio producto en "descripcion": uno con descripcion "Glifosato", dosis "2 lt/ha", consumo_total "160 lts"; otro con descripcion "2,4-D", dosis "0.8 lt/ha", consumo_total "60 lts"; otro con descripcion "Finesse", dosis "1050 gr", consumo_total "1050 gr". NUNCA un solo objeto con todos los productos mezclados.`,
        messages: [{ role: 'user', content: texto }]
      })
    });

    const json = await res.json();
    let raw = json.content?.[0]?.text || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    const p = JSON.parse(raw);

    let summary = [], errors = [];
    for (const t of (p.trabajos || [])) {
      const r = await sb('POST', 'trabajos_agricolas', {
        tipo: t.tipo, fecha: t.fecha, campo: t.campo || campo,
        lote: t.lote, hectareas: t.hectareas, cultivo: t.cultivo,
        contratista: t.contratista, dosis: t.dosis, consumo_total: t.consumo_total, campania: t.campania, descripcion: t.descripcion, detalle: t.detalle || {}
      });
      if (r) summary.push(`✅ ${t.tipo} — ${t.cultivo || ''} ${t.lote || ''}`);
      else errors.push(`❌ Error: ${t.tipo}`);
    }

    result.innerHTML = [...summary, ...errors].join('<br>') || 'No se encontraron datos.';
    if (summary.length) {
      toast(`✅ ${summary.length} trabajo${summary.length > 1 ? 's' : ''} registrado${summary.length > 1 ? 's' : ''}`);
      document.getElementById('trt-texto').value = '';
      cargarTrabajos();
    }
  } catch(e) {
    result.innerHTML = '❌ Error al procesar. Verificá tu conexión.';
    console.error(e);
  }
  btn.disabled = false; btn.textContent = '🤖 Interpretar y cargar con IA';
  document.getElementById('trt-status').textContent = '';
}
