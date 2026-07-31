let _proyMesActivo = {};
let _proyData    = null;
let _proyMeses12 = [];

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function _getMeses12() {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const out = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  return out;
}

async function cargarProyecciones() {
  const cont = document.getElementById('proy-contenido');
  if (!cont) return;
  cont.innerHTML = '<div style="text-align:center;padding:40px;color:var(--texto-suave)">Cargando...</div>';

  _proyMeses12 = _getMeses12();
  const HOY_KEY = _proyMeses12[0];
  const RUBROS_FIJOS = ['Arrendamientos Rurales','Servicios Profesionales','Seguros','Servicios Energéticos'];

  function initMeses() {
    const m = {};
    _proyMeses12.forEach(k => m[k] = { total: 0, items: [] });
    return m;
  }

  const [boletas, cheques, costosFijos] = await Promise.all([
    sb('GET', 'boletas', '', '?order=fecha.desc') || [],
    sb('GET', 'cheques', '', '?tipo=eq.emitido&estado=eq.cartera&order=fecha_cobro.desc') || [],
    sb('GET', 'costos_fijos', '', '?activo=eq.true&order=nombre') || [],
  ]);

  // ── 1. FACTURAS A PAGAR ──────────────────────────────────────
  const facturas = initMeses();
  (boletas || []).forEach(r => {
    let obs = {};
    try { obs = JSON.parse(r.observaciones || '{}'); } catch(e) {}
    if (obs.pago === 'Paga') return;
    if (!obs.vencimiento) return;
    const vto = new Date(obs.vencimiento + 'T12:00:00');
    const key = `${vto.getFullYear()}-${String(vto.getMonth()+1).padStart(2,'0')}`;
    if (!facturas[key]) return;
    facturas[key].total += r.monto || 0;
    facturas[key].items.push({ fecha: obs.vencimiento, proveedor: r.proveedor||'—', concepto: r.concepto||'—', categoria: r.categoria||'—', monto: r.monto||0 });
  });

  // ── 2. CHEQUES EMITIDOS ──────────────────────────────────────
  const cqs = initMeses();
  (cheques || []).forEach(c => {
    if (!c.fecha_cobro) return;
    const key = c.fecha_cobro.slice(0,7);
    if (!cqs[key]) return;
    cqs[key].total += c.monto||0;
    cqs[key].items.push({ fecha: c.fecha_cobro, beneficiario: c.beneficiario||c.contra||'—', banco: c.banco||'—', numero: c.numero||'—', monto: c.monto||0 });
  });

  // ── 3. COSTOS FIJOS ──────────────────────────────────────────
  const fijos = initMeses();
  // Desde boletas (arrendamientos, servicios, etc.)
  (boletas || []).forEach(r => {
    let obs = {};
    try { obs = JSON.parse(r.observaciones || '{}'); } catch(e) {}
    if (obs.pago === 'Paga') return;
    if (!RUBROS_FIJOS.includes(r.categoria)) return;
    if (!obs.vencimiento) return;
    const vto = new Date(obs.vencimiento + 'T12:00:00');
    const key = `${vto.getFullYear()}-${String(vto.getMonth()+1).padStart(2,'0')}`;
    if (!fijos[key]) return;
    fijos[key].total += r.monto||0;
    fijos[key].items.push({ fecha: obs.vencimiento, proveedor: r.proveedor||'—', concepto: r.concepto||'—', categoria: r.categoria||'—', monto: r.monto||0 });
  });
  // Costos fijos recurrentes (sueldos, etc.) — se repiten en los 12 meses
  (costosFijos || []).forEach(cf => {
    _proyMeses12.forEach(key => {
      fijos[key].total += cf.monto||0;
      fijos[key].items.push({ fecha: null, proveedor: cf.nombre, concepto: 'Recurrente mensual', categoria: cf.moneda||'ARS', monto: cf.monto||0 });
    });
  });

  // ── 4. TOTAL CONSOLIDADO ─────────────────────────────────────
  const total = initMeses();
  _proyMeses12.forEach(k => {
    total[k].total = (facturas[k]?.total||0) + (cqs[k]?.total||0) + (fijos[k]?.total||0);
  });

  _proyData = { facturas, cheques: cqs, fijos, total };

  const GRAFICOS = [
    { id:'facturas', titulo:'Facturas a pagar',                   color:'#8B1A2F', icon:'🧾', datos: facturas },
    { id:'cheques',  titulo:'Cheques emitidos pendientes',         color:'#1a5f8b', icon:'💳', datos: cqs     },
    { id:'fijos',    titulo:'Costos fijos',                       color:'#5f7a1a', icon:'📌', datos: fijos   },
    { id:'total',    titulo:'Total consolidado',                   color:'#444',    icon:'📊', datos: total   },
  ];

  const totalAnio = _proyMeses12.reduce((s,k) => s + (total[k]?.total||0), 0);

  cont.innerHTML = `
    <div style="background:var(--bg-card,#fff);border:1px solid var(--gris-borde,#e0e0e0);border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:20px">
      <div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--texto-suave)">Flujo proyectado — próximos 12 meses</div>
        <div style="font-size:28px;font-weight:800;color:#8B1A2F;margin-top:2px">${fmtMonto(totalAnio,'ARS')}</div>
      </div>
    </div>
    ${GRAFICOS.map(g => _htmlGrafico(g, HOY_KEY)).join('')}
  `;
}

function _htmlGrafico({ id, titulo, color, icon, datos }, HOY_KEY) {
  const maxVal = Math.max(..._proyMeses12.map(k => datos[k]?.total||0), 1);

  const BAR_MAX_H = 90; // px
  const bars = _proyMeses12.map(key => {
    const val   = datos[key]?.total||0;
    const barH  = val ? Math.max(Math.round((val/maxVal)*BAR_MAX_H), 3) : 0;
    const label = val >= 1e6 ? (val/1e6).toFixed(1)+'M' : val >= 1e3 ? Math.round(val/1e3)+'k' : val ? String(Math.round(val)) : '';
    const mes   = MESES_ES[parseInt(key.split('-')[1])-1];
    const esHoy = key === HOY_KEY;
    return `<div class="proy-bar-col" data-graf="${id}" data-key="${key}" onclick="seleccionarMesProy('${id}','${key}')"
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;cursor:pointer;padding:0 1px" title="${mes}: ${fmtMonto(val,'ARS')}">
      <div class="proy-bar-lbl" style="font-size:9px;font-weight:700;color:#bbb;min-height:13px;white-space:nowrap;text-align:center">${label}</div>
      <div class="proy-bar" style="width:80%;border-radius:4px 4px 0 0;background:${color}44;height:${barH}px;transition:background .15s"></div>
      <div style="font-size:9px;color:${esHoy?color:'#aaa'};font-weight:${esHoy?'700':'400'};text-align:center;line-height:1.3;padding-top:4px;border-top:2px solid #ddd;width:100%">
        ${mes}${esHoy?`<br><span style="background:${color};color:#fff;border-radius:4px;padding:0 3px;font-size:7px">hoy</span>`:''}
      </div>
    </div>`;
  }).join('');

  return `<div id="proy-card-${id}" style="margin-bottom:20px;background:var(--bg-card,#fff);border:1px solid var(--gris-borde,#e0e0e0);border-radius:12px;padding:16px">
    <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:${color}">${icon} ${titulo}</div>
    <div style="overflow-x:auto"><div style="min-width:460px;display:flex;align-items:flex-end;gap:3px;padding-bottom:2px">${bars}</div></div>
    <div id="proy-det-${id}" style="margin-top:12px"></div>
  </div>`;
}

function seleccionarMesProy(grafId, key) {
  if (!_proyData) return;
  const datos = _proyData[grafId];
  if (!datos) return;

  // Toggle
  _proyMesActivo[grafId] = _proyMesActivo[grafId] === key ? null : key;
  const activo = _proyMesActivo[grafId];

  // Actualizar colores de barras solo en este gráfico
  const card = document.getElementById(`proy-card-${grafId}`);
  if (!card) return;
  const maxVal = Math.max(..._proyMeses12.map(k => datos[k]?.total||0), 1);
  const COLORS = { facturas:'#8B1A2F', cheques:'#1a5f8b', fijos:'#5f7a1a', total:'#444' };
  const color = COLORS[grafId] || '#555';
  const BAR_MAX_H = 90;

  card.querySelectorAll(`.proy-bar-col[data-graf="${grafId}"]`).forEach(col => {
    const k   = col.dataset.key;
    const val = datos[k]?.total || 0;
    const bar = col.querySelector('.proy-bar');
    const lbl = col.querySelector('.proy-bar-lbl');
    if (!bar) return;
    const isActivo = k === activo;
    bar.style.background = isActivo ? color : (val ? color+'44' : 'transparent');
    if (lbl) lbl.style.color = isActivo ? color : '#bbb';
  });

  // Detalle
  const det = document.getElementById(`proy-det-${grafId}`);
  if (!det) return;
  if (!activo || !datos[activo]?.items?.length) { det.innerHTML = ''; return; }

  const items = [...datos[activo].items].sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));
  const [anio, mes] = activo.split('-');
  const nombreMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(mes)-1];

  let filas = '';
  if (grafId === 'cheques') {
    filas = items.map(it => `<tr>
      <td>${fmtFecha(it.fecha)}</td>
      <td>${it.beneficiario}</td>
      <td>${it.banco}</td>
      <td>${it.numero}</td>
      <td style="text-align:right;font-weight:600">${fmtMonto(it.monto,'ARS')}</td>
    </tr>`).join('');
    det.innerHTML = `
      <div style="border-top:1px solid #eee;padding-top:10px">
        <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:8px">${nombreMes} ${anio} — ${items.length} cheque${items.length!==1?'s':''}</div>
        <div style="overflow-x:auto"><table class="tabla-datos" style="width:100%;font-size:12px">
          <thead><tr><th>Vencimiento</th><th>Beneficiario</th><th>Banco</th><th>Nro.</th><th style="text-align:right">Monto</th></tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr><td colspan="4" style="font-weight:700;text-align:right">Total</td>
            <td style="font-weight:700;text-align:right;color:${color}">${fmtMonto(datos[activo].total,'ARS')}</td></tr></tfoot>
        </table></div>
      </div>`;
  } else {
    filas = items.map(it => `<tr>
      <td>${fmtFecha(it.fecha)}</td>
      <td>${it.proveedor}</td>
      <td>${it.concepto}</td>
      <td>${it.categoria||'—'}</td>
      <td style="text-align:right;font-weight:600">${fmtMonto(it.monto,'ARS')}</td>
    </tr>`).join('');
    det.innerHTML = `
      <div style="border-top:1px solid #eee;padding-top:10px">
        <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:8px">${nombreMes} ${anio} — ${items.length} ítem${items.length!==1?'s':''}</div>
        <div style="overflow-x:auto"><table class="tabla-datos" style="width:100%;font-size:12px">
          <thead><tr><th>Vencimiento</th><th>Proveedor</th><th>Concepto</th><th>Categoría</th><th style="text-align:right">Monto</th></tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr><td colspan="4" style="font-weight:700;text-align:right">Total</td>
            <td style="font-weight:700;text-align:right;color:${color}">${fmtMonto(datos[activo].total,'ARS')}</td></tr></tfoot>
        </table></div>
      </div>`;
  }
}

// ── MODAL COSTOS FIJOS RECURRENTES ───────────────────────────

function abrirModalCostosFijos() {
  document.getElementById('modal-costos-fijos').style.display = 'flex';
  renderListaCostosFijos();
}

function cerrarModalCostosFijos() {
  document.getElementById('modal-costos-fijos').style.display = 'none';
}

async function renderListaCostosFijos() {
  const lista = document.getElementById('cf-lista');
  lista.innerHTML = '<div style="text-align:center;color:var(--texto-suave);padding:20px">Cargando...</div>';
  const rows = await sb('GET', 'costos_fijos', '', '?order=nombre') || [];
  if (!rows.length) {
    lista.innerHTML = '<div style="text-align:center;color:var(--texto-suave);padding:24px">No hay costos fijos cargados</div>';
    return;
  }
  lista.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="border-bottom:2px solid #eee">
      <th style="text-align:left;padding:6px 4px">Nombre</th>
      <th style="text-align:right;padding:6px 4px">Monto mensual</th>
      <th style="text-align:center;padding:6px 4px">Activo</th>
      <th style="padding:6px 4px"></th>
    </tr></thead>
    <tbody>
      ${rows.map(r => `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px 4px;font-weight:500">${r.nombre}</td>
        <td style="padding:8px 4px;text-align:right">${fmtMonto(r.monto, r.moneda||'ARS')}</td>
        <td style="padding:8px 4px;text-align:center">
          <input type="checkbox" ${r.activo?'checked':''} onchange="toggleCostoFijo('${r.id}',this.checked)" style="cursor:pointer;width:16px;height:16px">
        </td>
        <td style="padding:8px 4px;text-align:right">
          <button onclick="eliminarCostoFijo('${r.id}')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:16px" title="Eliminar">🗑</button>
        </td>
      </tr>`).join('')}
    </tbody>
    <tfoot><tr>
      <td style="padding:8px 4px;font-weight:700">Total mensual</td>
      <td style="padding:8px 4px;text-align:right;font-weight:700;color:#5f7a1a">
        ${fmtMonto(rows.filter(r=>r.activo).reduce((s,r)=>s+(r.monto||0),0),'ARS')}
      </td>
      <td colspan="2"></td>
    </tr></tfoot>
  </table>`;
}

async function guardarCostoFijo() {
  const nombre = document.getElementById('cf-nombre').value.trim();
  const monto  = parseFloat(document.getElementById('cf-monto').value);
  const moneda = document.getElementById('cf-moneda').value;
  if (!nombre || !monto) { toast('Completá nombre y monto'); return; }
  const r = await sb('POST', 'costos_fijos', { nombre, monto, moneda, activo: true });
  if (!r) { toast('Error al guardar'); return; }
  document.getElementById('cf-nombre').value = '';
  document.getElementById('cf-monto').value  = '';
  toast('Costo fijo agregado');
  renderListaCostosFijos();
  cargarProyecciones();
}

async function toggleCostoFijo(id, activo) {
  await sb('PATCH', 'costos_fijos', { activo }, `?id=eq.${id}`);
  cargarProyecciones();
}

async function eliminarCostoFijo(id) {
  if (!confirm('¿Eliminar este costo fijo?')) return;
  await sb('DELETE', 'costos_fijos', null, `?id=eq.${id}`);
  toast('Eliminado');
  renderListaCostosFijos();
  cargarProyecciones();
}
