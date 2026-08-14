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

// Mapeo tipo de trabajo → categorías de maquinaria (acepta múltiples alias)
const MAQUINARIA_POR_TIPO = {
  'Siembra':       ['Siembra', 'Tractores'],
  'Pulverización': ['Pulverización', 'Pulverizacion', 'Tractores'],
  'Fertilización': ['Fertilización', 'Fertilizacion', 'Tractores'],
  'Cosecha':       ['Cosecha'],
  'Henificación':  ['Henificación', 'Henificacion', 'Forrajes', 'Tractores'],
  'Enrollado':     ['Enrollado', 'Forrajes', 'Tractores'],
  'Labranza':      ['Labranza', 'Tractores'],
  'Otro':          null, // null = todas
};

let maquinariaModalCache = [];

async function cargarMaquinariaModal() {
  // Reusar el array global si ya fue cargado por el módulo de maquinaria
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
  const cats = MAQUINARIA_POR_TIPO[tipo];
  let filtradas = maquinariaModalCache;
  if (tipo && cats) {
    const catNorms = cats.map(normCat);
    const candidatas = maquinariaModalCache.filter(m => catNorms.includes(normCat(m.categoria)));
    // Si hay resultado usamos el filtro; si no, mostramos todas para que el usuario pueda elegir igual
    filtradas = candidatas.length ? candidatas : maquinariaModalCache;
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

async function abrirModalTrabajo() {
  document.getElementById('modal-trabajo-overlay').style.display = 'block';
  const m = document.getElementById('modal-trabajo');
  m.style.display = 'flex';

  // Cargar panel de precios y cache de autocomplete en paralelo
  cargarPanelPreciosInsumos();
  cargarCacheAutocomplete();

  // Cargar maquinaria si no está en caché
  await cargarMaquinariaModal();

  // Limpiar campos
  ['mtr-cultivo','mtr-campania','mtr-cont','mtr-cliente','mtr-campo-tercero','mtr-tarifa-cobrada'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('mtr-tipo').value = '';
  document.getElementById('mtr-fecha').value = new Date().toISOString().split('T')[0];
  actualizarSelectMaquinaria('');

  // Reset tercero
  const chk = document.getElementById('mtr-tercero');
  if (chk) chk.checked = false;
  toggleTerceroModal();

  // Lotes: una fila inicial
  document.getElementById('mtr-lotes-list').innerHTML = '';
  agregarFilaLoteModal();

  // Insumos: una fila inicial
  document.getElementById('mtr-insumos-list').innerHTML = '';
  agregarFilaInsumoModal();
}

function toggleTerceroModal() {
  const esTercero = document.getElementById('mtr-tercero')?.checked;
  document.getElementById('mtr-panel-tercero').style.display = esTercero ? 'block' : 'none';
  document.getElementById('mtr-campo-propio-wrap').style.display = esTercero ? 'none' : '';
}

function cerrarModalTrabajo() {
  document.getElementById('modal-trabajo-overlay').style.display = 'none';
  document.getElementById('modal-trabajo').style.display = 'none';
}

async function guardarTrabajoModal() {
  const fecha = document.getElementById('mtr-fecha').value;
  const tipo = document.getElementById('mtr-tipo').value;
  if (!fecha || !tipo) { toast('Completá fecha y tipo de trabajo', 'var(--tierra)'); return; }

  // Leer lotes
  const lotesFilas = [...document.querySelectorAll('#mtr-lotes-list .lote-row')];
  const lotes = lotesFilas.map(f => ({
    lote: f.querySelector('.lot-num').value.trim(),
    hectareas: parseFloat(f.querySelector('.lot-has').value) || null,
  })).filter(l => l.lote);
  if (!lotes.length) { toast('Agregá al menos un lote', 'var(--tierra)'); return; }

  // Leer insumos
  const insFilas = [...document.querySelectorAll('#mtr-insumos-list .insumo-row')];
  const insumos = insFilas.map(f => ({
    descripcion: f.querySelector('.ins-desc').value,
    dosis: f.querySelector('.ins-dosis').value,
    consumo_total: f.querySelector('.ins-consumo').value,
    precio_unitario: parseFloat(f.querySelector('.ins-precio').value) || null,
  })).filter(i => i.descripcion || i.dosis);

  const esTercero = document.getElementById('mtr-tercero')?.checked;
  const baseHeader = {
    tipo,
    fecha,
    campo: esTercero ? (document.getElementById('mtr-campo-tercero').value || 'Tercero') : document.getElementById('mtr-campo').value,
    cultivo: document.getElementById('mtr-cultivo').value,
    contratista: document.getElementById('mtr-cont').value || 'Propio',
    campania: document.getElementById('mtr-campania').value,
    herramienta: document.getElementById('mtr-herramienta').selectedOptions[0]?.dataset.nombre || '',
    maquina_id: document.getElementById('mtr-herramienta').value || null,
    cliente: esTercero ? document.getElementById('mtr-cliente').value : null,
    tarifa_cobrada: esTercero ? (parseFloat(document.getElementById('mtr-tarifa-cobrada').value) || null) : null,
    moneda_cobrada: esTercero ? document.getElementById('mtr-moneda-cobrada').value : null,
  };

  // Generar registros: un registro por lote × insumo (o uno por lote si no hay insumos)
  const registros = [];
  for (const l of lotes) {
    const header = { ...baseHeader, lote: l.lote, hectareas: l.hectareas };
    if (insumos.length) {
      insumos.forEach(ins => registros.push({ ...header, ...ins }));
    } else {
      registros.push({ ...header });
    }
  }

  const TIPO_MAP_TRAB = {
    'Siembra':'siembra','Pulverización':'pulverizacion','Fertilización':'fertilizacion',
    'Cosecha':'cosecha','Henificación':'enrollado','Enrollado':'enrollado',
    'Labranza':'movimiento_suelos','Otro':'otro'
  };
  const tipoLabor = TIPO_MAP_TRAB[baseHeader.tipo] || (baseHeader.tipo || '').toLowerCase();
  const contratistaNombre = baseHeader.contratista;
  const campo = baseHeader.campo;

  let ok = 0;
  for (const l of lotes) {
    // 1. Escribir a tabla vieja (legacy, mantener funcionando)
    const header = { ...baseHeader, lote: l.lote, hectareas: l.hectareas };
    if (insumos.length) {
      for (const ins of insumos) {
        await sb('POST', 'trabajos_agricolas', {
          ...header, descripcion: ins.descripcion, dosis: ins.dosis,
          consumo_total: ins.consumo_total, precio_unitario: ins.precio_unitario || null
        });
      }
    } else {
      await sb('POST', 'trabajos_agricolas', header);
    }

    // 2. Escribir a tablas nuevas
    const loteId = await resolverLoteId(campo, l.lote, l.hectareas);
    const tRes = await sb('POST', 'trabajos', {
      fecha, tipo_labor: tipoLabor, hectareas: l.hectareas,
      cultivo: baseHeader.cultivo, campania: baseHeader.campania,
      lote_id: loteId || undefined
    });
    if (tRes?.[0]) {
      const tid = tRes[0].id;
      if (baseHeader.maquina_id) {
        await sb('POST', 'trabajo_maquinaria', { trabajo_id: tid, maquina_id: baseHeader.maquina_id });
      }
      if (contratistaNombre && contratistaNombre !== 'Propio') {
        const contId = await resolverParteId(contratistaNombre);
        if (contId) await sb('POST', 'trabajo_contratista', { trabajo_id: tid, contratista_id: contId });
      }
      for (const ins of insumos) {
        await sb('POST', 'trabajo_insumos', {
          trabajo_id: tid, insumo: ins.descripcion, cantidad: ins.consumo_total,
          costo_total: ins.precio_unitario && ins.consumo_total
            ? Math.round(ins.precio_unitario * (parseNumeroDeTexto(ins.consumo_total) || 0)) : null
        });
      }
      ok++;
    }
  }

  if (ok) {
    toast(`✅ ${ok > 1 ? ok + ' trabajos guardados' : 'Trabajo guardado'}`);
    cerrarModalTrabajo();
    cargarTrabajos();
  } else toast('❌ Error al guardar', 'var(--rojo)');
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
