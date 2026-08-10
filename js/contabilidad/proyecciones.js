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

  const [boletas, cheques, costosFijos, creditosActivos] = await Promise.all([
    sb('GET', 'boletas', '', '?order=fecha.desc') || [],
    sb('GET', 'cheques', '', '?tipo=eq.emitido&estado=eq.cartera&order=fecha_cobro.desc') || [],
    sb('GET', 'costos_fijos', '', '?activo=eq.true&order=nombre') || [],
    sb('GET', 'creditos', '', '?activo=eq.true') || [],
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

  // ── 4. CUOTAS DE CRÉDITOS ────────────────────────────────────
  const credsProy = initMeses();
  const MESES_FREC_CRED = { mensual:1, trimestral:3, semestral:6, anual:12 };
  (creditosActivos || []).forEach(r => {
    if (!r.fecha_inicio || !r.cuotas_total || !r.monto_cuota) return;
    const mesesSalto = MESES_FREC_CRED[r.frecuencia_cuota||'mensual'] || 1;
    const inicio = new Date(r.fecha_inicio + 'T12:00:00');
    const pagadas = r.cuotas_pagadas || 0;

    // Reconstruir cronograma para sistema alemán
    let tasaPeriodo = 0;
    if (r.tasa_interes && r.sistema === 'aleman') {
      const t = r.tasa_interes / 100;
      if (r.tipo_tasa === 'TEA') tasaPeriodo = Math.pow(1 + t, mesesSalto / 12) - 1;
      else if (r.tipo_tasa === 'TEM') tasaPeriodo = Math.pow(1 + t, mesesSalto) - 1;
      else tasaPeriodo = t * (mesesSalto / 12);
    }
    const capitalFijo = r.monto_total / r.cuotas_total;

    for (let i = pagadas; i < r.cuotas_total; i++) {
      const fechaCuota = new Date(inicio.getFullYear(), inicio.getMonth() + i * mesesSalto, inicio.getDate());
      const key = `${fechaCuota.getFullYear()}-${String(fechaCuota.getMonth()+1).padStart(2,'0')}`;
      if (!credsProy[key]) continue;

      let montoCuota = r.monto_cuota;
      if (r.sistema === 'aleman' && tasaPeriodo) {
        const saldoRestante = r.monto_total - capitalFijo * i;
        montoCuota = capitalFijo + saldoRestante * tasaPeriodo;
      }

      const hayTC = r.moneda_pago && r.moneda_pago !== r.moneda && r.tc_valor;
      const montoFinal = hayTC ? montoCuota * r.tc_valor : montoCuota;
      const monedaFinal = hayTC ? r.moneda_pago : (r.moneda||'ARS');

      credsProy[key].total += montoFinal;
      credsProy[key].items.push({
        fecha: fechaCuota.toISOString().split('T')[0],
        banco: r.banco||'—',
        titular: r.titular||'—',
        num: i + 1,
        total: r.cuotas_total,
        moneda: monedaFinal,
        monto: montoFinal
      });
    }
  });

  // ── 5. TOTAL CONSOLIDADO ─────────────────────────────────────
  const total = initMeses();
  _proyMeses12.forEach(k => {
    total[k].total = (facturas[k]?.total||0) + (cqs[k]?.total||0) + (fijos[k]?.total||0) + (credsProy[k]?.total||0);
  });

  _proyData = { facturas, cheques: cqs, fijos, creditos: credsProy, total };

  const GRAFICOS = [
    { id:'total',    titulo:'Total consolidado',                   color:'#444',    icon:'📊', datos: total      },
    { id:'facturas', titulo:'Facturas a pagar',                   color:'#8B1A2F', icon:'🧾', datos: facturas   },
    { id:'cheques',  titulo:'Cheques emitidos pendientes',         color:'#1a5f8b', icon:'💳', datos: cqs        },
    { id:'fijos',    titulo:'Costos fijos',                       color:'#5f7a1a', icon:'📌', datos: fijos      },
    { id:'creditos', titulo:'Cuotas de créditos',                 color:'#7a3a1a', icon:'🏦', datos: credsProy  },
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

  const CHART_H  = 230; // altura total del área de barras en px
  const BAR_MAX_H = 160; // px máximo de la barra más alta
  const bars = _proyMeses12.map(key => {
    const val   = datos[key]?.total||0;
    const barH  = val ? Math.max(Math.round((val/maxVal)*BAR_MAX_H), 14) : 0;
    const label = val >= 1e6 ? (val/1e6).toFixed(2)+'M' : val >= 1e3 ? Math.round(val/1e3)+'k' : val ? String(Math.round(val)) : '';
    const mes   = MESES_ES[parseInt(key.split('-')[1])-1];
    const esHoy = key === HOY_KEY;
    // color sólido para la barra
    const barBg = color === '#444' ? '#888' : color;
    return `<div class="proy-bar-col" data-graf="${id}" data-key="${key}" onclick="seleccionarMesProy('${id}','${key}')"
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;cursor:pointer;padding:0 2px;height:${CHART_H}px" title="${mes}: ${fmtMonto(val,'ARS')}">
      <div class="proy-bar-lbl" style="font-size:10px;font-weight:800;color:#444;min-height:16px;white-space:nowrap;text-align:center;line-height:1.3">${label}</div>
      <div class="proy-bar" style="width:85%;border-radius:5px 5px 0 0;background:${barBg};opacity:0.75;height:${barH}px;transition:opacity .15s,height .15s;flex-shrink:0"></div>
      <div style="width:100%;border-top:2px solid #ccc;padding-top:4px;font-size:10px;color:${esHoy?color:'#666'};font-weight:${esHoy?'800':'500'};text-align:center;line-height:1.3;flex-shrink:0">
        ${mes}${esHoy?`<br><span style="background:${color};color:#fff;border-radius:4px;padding:0 4px;font-size:8px">hoy</span>`:''}
      </div>
    </div>`;
  }).join('');

  return `<div id="proy-card-${id}" style="margin-bottom:20px;background:var(--bg-card,#fff);border:1px solid var(--gris-borde,#e0e0e0);border-radius:12px;padding:18px">
    <div style="font-weight:700;font-size:13px;margin-bottom:12px;color:${color}">${icon} ${titulo}</div>
    <div style="overflow-x:auto"><div style="min-width:520px;display:flex;align-items:flex-end;gap:4px">${bars}</div></div>
    <div id="proy-det-${id}" style="margin-top:14px"></div>
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
  const COLORS = { facturas:'#8B1A2F', cheques:'#1a5f8b', fijos:'#5f7a1a', total:'#444', creditos:'#7a3a1a' };
  const color = COLORS[grafId] || '#555';
  const BAR_MAX_H = 90;

  card.querySelectorAll(`.proy-bar-col[data-graf="${grafId}"]`).forEach(col => {
    const k   = col.dataset.key;
    const val = datos[k]?.total || 0;
    const bar = col.querySelector('.proy-bar');
    const lbl = col.querySelector('.proy-bar-lbl');
    if (!bar) return;
    const isActivo = k === activo;
    const barBg = color === '#444' ? '#888' : color;
    bar.style.opacity = isActivo ? '1' : '0.75';
    bar.style.background = barBg;
    if (lbl) lbl.style.color = isActivo ? color : '#444';
  });

  // Detalle
  const det = document.getElementById(`proy-det-${grafId}`);
  if (!det) return;
  if (!activo || !datos[activo]?.items?.length) { det.innerHTML = ''; return; }

  const items = [...datos[activo].items].sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));
  const [anio, mes] = activo.split('-');
  const nombreMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(mes)-1];

  let filas = '';
  if (grafId === 'creditos') {
    filas = items.map(it => `<tr>
      <td>${fmtFecha(it.fecha)}</td>
      <td>${it.banco}</td>
      <td>${it.titular}</td>
      <td style="text-align:center">Cuota ${it.num}/${it.total}</td>
      <td style="text-align:right;font-weight:600">${fmtMonto(it.monto, it.moneda)}</td>
    </tr>`).join('');
    det.innerHTML = `
      <div style="border-top:1px solid #eee;padding-top:10px">
        <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:8px">${nombreMes} ${anio} — ${items.length} cuota${items.length!==1?'s':''}</div>
        <div style="overflow-x:auto"><table class="tabla-datos" style="width:100%;font-size:12px">
          <thead><tr><th>Vencimiento</th><th>Banco</th><th>Titular</th><th style="text-align:center">Cuota</th><th style="text-align:right">Monto</th></tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr><td colspan="4" style="font-weight:700;text-align:right">Total</td>
            <td style="font-weight:700;text-align:right;color:${color}">${fmtMonto(datos[activo].total, items[0]?.moneda||'ARS')}</td></tr></tfoot>
        </table></div>
      </div>`;
    return;
  } else if (grafId === 'cheques') {
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
