// Módulo Clima — Lluvias

const CAMPOS_LLUVIA = ['Doña Vica', 'Sant-Yago', 'Don Alfredo (Azcona)'];

// Color por campo — usa variables CSS del sistema
const CAMPO_COLOR = {
  'Doña Vica':           { color: 'var(--bordo)',  bg: 'var(--bordo-claro)'  },
  'Sant-Yago':           { color: 'var(--cielo)',  bg: 'var(--cielo-claro)'  },
  'Don Alfredo (Azcona)':{ color: 'var(--tierra)', bg: 'var(--tierra-claro)' },
};

let lluviasTodas = [];
let lluviaCampFiltro = '';
let lluviaCampoFiltro = '';
let _calCampoActivo = 'Doña Vica';
let _calMesAbierto  = null;

function campaniaLluvia(fecha) {
  const d = new Date(fecha);
  const y = d.getFullYear(), mo = d.getMonth() + 1;
  const desde = mo >= 7 ? y : y - 1;
  return `${String(desde).slice(2)}/${String(desde + 1).slice(2)}`;
}

function campaniaActualLluvia() {
  return campaniaLluvia(new Date().toISOString().slice(0, 10));
}

function _lluviasGetFiltered() {
  return lluviasTodas.filter(r => {
    if (lluviaCampFiltro && campaniaLluvia(r.fecha) !== lluviaCampFiltro) return false;
    if (lluviaCampoFiltro && r.campo !== lluviaCampoFiltro) return false;
    return true;
  });
}

async function cargarLluvias() {
  const data = await sb('GET', 'lluvias', null, '?order=fecha.desc');
  lluviasTodas = data || [];
  // Mes abierto por defecto: el más reciente con datos
  const hoy = new Date().toISOString().slice(0, 7);
  _calMesAbierto = hoy;
  renderLluvias();
}

function renderLluvias() {
  _renderCargaRapida();
  _renderTotalesCampania();
  _renderCalendario();
  _renderTablaRegistros();
  _renderComparacion();
  _poblarFiltrosCampania();
}

// ── CARGA RÁPIDA ──────────────────────────────────────────────────────────────

function _renderCargaRapida() {
  const el = document.getElementById('lluvia-fecha');
  if (el && !el.value) el.value = new Date().toISOString().slice(0, 10);
}

async function guardarLluvia() {
  const fecha = document.getElementById('lluvia-fecha').value;
  const campo = document.getElementById('lluvia-campo').value;
  const mm    = parseFloat(document.getElementById('lluvia-mm').value);
  const obs   = document.getElementById('lluvia-obs').value.trim();

  if (!fecha || !campo || isNaN(mm) || mm < 0) {
    toast('Completá fecha, campo y milímetros', 'var(--tierra)');
    return;
  }

  const r = await sb('POST', 'lluvias', { fecha, campo, mm, observacion: obs || null });
  if (r && r.length) {
    lluviasTodas.unshift(r[0]);
    document.getElementById('lluvia-mm').value  = '';
    document.getElementById('lluvia-obs').value = '';
    toast('Lluvia registrada ✓', 'var(--verde)');
    renderLluvias();
  } else {
    toast('Error al guardar', 'var(--tierra)');
  }
}

// ── TOTALES CAMPAÑA ───────────────────────────────────────────────────────────

function _renderTotalesCampania() {
  const campUsada = lluviaCampFiltro || campaniaActualLluvia();
  const enCamp = _lluviasGetFiltered().filter(r => campaniaLluvia(r.fecha) === campUsada);

  const totPorCampo = {};
  CAMPOS_LLUVIA.forEach(c => { totPorCampo[c] = 0; });
  enCamp.forEach(r => { totPorCampo[r.campo] = (totPorCampo[r.campo] || 0) + (r.mm || 0); });

  const tarjetas = CAMPOS_LLUVIA.map(c => {
    const { color, bg } = CAMPO_COLOR[c];
    return `<div style="background:${bg};border-radius:12px;padding:16px;flex:1;min-width:140px;border-left:4px solid ${color}">
      <div style="font-size:11px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${c}</div>
      <div style="font-size:28px;font-weight:700;color:${color}">${fmtNum(totPorCampo[c], 1)} <span style="font-size:14px;font-weight:400;opacity:.7">mm</span></div>
    </div>`;
  }).join('');

  // Días sin lluvia por campo
  const hoy = new Date();
  const ultimos = {};
  enCamp.forEach(r => {
    if (!ultimos[r.campo] || r.fecha > ultimos[r.campo]) ultimos[r.campo] = r.fecha;
  });

  const diasHtml = CAMPOS_LLUVIA.map(c => {
    if (!ultimos[c]) return '';
    const d = Math.floor((hoy - new Date(ultimos[c])) / 86400000);
    const clr = d >= 20 ? 'var(--rojo)' : d >= 10 ? 'var(--amarillo)' : 'var(--verde)';
    return `<span style="margin-right:14px;color:${clr};font-size:13px"><strong>${c.split(' ')[0]}</strong>: ${d}d sin lluvia</span>`;
  }).filter(Boolean).join('') || '<span style="color:var(--texto-suave);font-size:13px">Sin registros</span>';

  const el = document.getElementById('lluvia-totales');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">${tarjetas}</div>
    <div style="padding:6px 0">${diasHtml}</div>`;
}

// ── PANORAMA CALENDARIO ───────────────────────────────────────────────────────

function _renderCalendario() {
  const el = document.getElementById('lluvia-calendario');
  if (!el) return;

  const campUsada = lluviaCampFiltro || campaniaActualLluvia();
  const [desde, hasta] = _campaniaMeses(campUsada);
  const meses = _mesesCampania(desde, hasta).reverse(); // más reciente primero

  // Índice: { 'YYYY-MM-DD': mm } para el campo activo
  const byDia = {};
  lluviasTodas
    .filter(r => r.campo === _calCampoActivo && campaniaLluvia(r.fecha) === campUsada)
    .forEach(r => { byDia[r.fecha] = (byDia[r.fecha] || 0) + (r.mm || 0); });

  // Selector de campo
  const selectorCampos = CAMPOS_LLUVIA.map(c => {
    const { color, bg } = CAMPO_COLOR[c];
    const activo = c === _calCampoActivo;
    return `<button onclick="_calCambiarCampo('${c}')" style="padding:5px 12px;border-radius:20px;border:2px solid ${color};background:${activo ? color : 'transparent'};color:${activo ? '#fff' : color};font-size:12px;font-weight:600;cursor:pointer">${c}</button>`;
  }).join('');

  // Meses como acordeón
  const { color: campColor, bg: campBg } = CAMPO_COLOR[_calCampoActivo];
  const diaSemLabels = ['D','L','M','X','J','V','S'];

  const mesesHtml = meses.map(mes => {
    const [y, m] = mes.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const label2 = label.charAt(0).toUpperCase() + label.slice(1);
    const diasEnMes = new Date(y, m, 0).getDate();
    const primerDia = new Date(y, m - 1, 1).getDay(); // 0=dom

    // Total del mes
    let totMes = 0;
    for (let d = 1; d <= diasEnMes; d++) {
      const key = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      totMes += byDia[key] || 0;
    }

    const abierto = mes === _calMesAbierto;

    // Cabecera días semana
    const diasSemHtml = diaSemLabels.map(d =>
      `<div style="text-align:center;font-size:10px;font-weight:700;color:var(--texto-suave);padding:4px 0">${d}</div>`
    ).join('');

    // Celdas vacías iniciales
    let celdas = '';
    for (let i = 0; i < primerDia; i++) celdas += '<div></div>';

    // Días del mes
    for (let d = 1; d <= diasEnMes; d++) {
      const key = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const mm = byDia[key] || 0;
      if (mm > 0) {
        celdas += `<div style="background:${campColor};color:#fff;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 2px;min-height:42px">
          <span style="font-size:11px;opacity:.8">${d}</span>
          <span style="font-size:13px;font-weight:700">${fmtNum(mm,1)}</span>
        </div>`;
      } else {
        celdas += `<div style="border:1px solid var(--gris-borde);border-radius:6px;display:flex;align-items:center;justify-content:center;min-height:42px;color:var(--texto-suave);font-size:12px">${d}</div>`;
      }
    }

    return `<div style="border:1px solid var(--gris-borde);border-radius:10px;overflow:hidden;margin-bottom:8px">
      <div onclick="_calToggleMes('${mes}')" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;cursor:pointer;background:${abierto ? campBg : 'var(--blanco)'}">
        <span style="font-size:14px;font-weight:600;color:${abierto ? campColor : 'var(--texto)'}">${label2}</span>
        <div style="display:flex;align-items:center;gap:10px">
          ${totMes > 0 ? `<span style="font-size:13px;font-weight:700;color:${campColor}">${fmtNum(totMes,1)} mm</span>` : '<span style="font-size:12px;color:var(--texto-suave)">Sin lluvia</span>'}
          <span style="font-size:12px;color:var(--texto-suave)">${abierto ? '▲' : '▼'}</span>
        </div>
      </div>
      ${abierto ? `<div style="padding:10px 12px;background:var(--blanco)">
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">${diasSemHtml}</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${celdas}</div>
      </div>` : ''}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${selectorCampos}</div>
    ${mesesHtml || '<div style="color:var(--texto-suave);font-size:13px;padding:12px 0">Sin datos para esta campaña</div>'}`;
}

function _calCambiarCampo(campo) {
  _calCampoActivo = campo;
  _renderCalendario();
}

function _calToggleMes(mes) {
  _calMesAbierto = _calMesAbierto === mes ? null : mes;
  _renderCalendario();
}

function _campaniaMeses(camp) {
  const [a, b] = camp.split('/').map(s => parseInt(s));
  const desde = 2000 + a;
  const hasta = 2000 + b;
  return [`${desde}-07`, `${hasta}-06`];
}

function _mesesCampania(desde, hasta) {
  const meses = [];
  let [y, m] = desde.split('-').map(Number);
  const [yh, mh] = hasta.split('-').map(Number);
  while (y < yh || (y === yh && m <= mh)) {
    meses.push(`${y}-${String(m).padStart(2, '0')}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return meses;
}

// ── TABLA REGISTROS ───────────────────────────────────────────────────────────

function _renderTablaRegistros() {
  const el = document.getElementById('lluvia-tabla-body');
  if (!el) return;

  const rows = _lluviasGetFiltered();
  if (!rows.length) {
    el.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--texto-suave)">Sin registros</td></tr>';
    return;
  }

  el.innerHTML = rows.map((r, i) => {
    const { color, bg } = CAMPO_COLOR[r.campo] || { color: 'var(--texto)', bg: 'var(--gris)' };
    const badge = `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${bg};color:${color}">${r.campo}</span>`;
    return `<tr style="background:${i % 2 === 0 ? 'var(--blanco)' : 'var(--gris)'}">
      <td style="padding:8px 12px;font-size:13px">${fmtFecha(r.fecha)}</td>
      <td style="padding:8px 12px">${badge}</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:700;color:${color}">${fmtNum(r.mm, 1)} mm</td>
      <td style="padding:8px 12px;font-size:13px;color:var(--texto-suave)">${campaniaLluvia(r.fecha)}</td>
      <td style="padding:8px 12px;font-size:13px;color:var(--texto-suave)">${r.observacion || '—'}</td>
      <td style="padding:8px 12px;text-align:center">
        <button onclick="eliminarLluvia('${r.id}')" style="background:none;border:none;cursor:pointer;color:var(--tierra);font-size:14px" title="Eliminar">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

async function eliminarLluvia(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  await sb('DELETE', 'lluvias', null, `?id=eq.${id}`);
  lluviasTodas = lluviasTodas.filter(r => r.id !== id);
  toast('Registro eliminado', 'var(--tierra)');
  renderLluvias();
}

// ── COMPARACIÓN ENTRE CAMPAÑAS — BARRAS ──────────────────────────────────────

function _renderComparacion() {
  const el = document.getElementById('lluvia-comparacion');
  if (!el) return;

  const camps = [...new Set(lluviasTodas.map(r => campaniaLluvia(r.fecha)))].sort().reverse().slice(0, 3);
  if (camps.length < 1) {
    el.innerHTML = '<div style="color:var(--texto-suave);font-size:13px">Sin datos suficientes para comparar</div>';
    return;
  }

  // Total anual por campo y campaña
  const totales = {};
  CAMPOS_LLUVIA.forEach(c => {
    totales[c] = {};
    camps.forEach(camp => { totales[c][camp] = 0; });
  });
  lluviasTodas.forEach(r => {
    if (totales[r.campo] && camps.includes(campaniaLluvia(r.fecha)))
      totales[r.campo][campaniaLluvia(r.fecha)] += r.mm || 0;
  });

  const maxVal = Math.max(...CAMPOS_LLUVIA.flatMap(c => camps.map(camp => totales[c][camp])), 1);
  const BAR_MAX_H = 120; // px

  // Leyenda de campañas
  const campColors = ['var(--bordo)', 'var(--cielo)', 'var(--tierra)'];
  const leyendaHtml = camps.map((camp, i) =>
    `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;font-size:12px">
      <span style="width:12px;height:12px;border-radius:3px;background:${campColors[i]};display:inline-block"></span>${camp}
    </span>`
  ).join('');

  // Grupos de barras: un grupo por campo
  const gruposHtml = CAMPOS_LLUVIA.map(campo => {
    const { color } = CAMPO_COLOR[campo];
    const barrasHtml = camps.map((camp, ci) => {
      const val = totales[campo][camp];
      const h = val > 0 ? Math.max(4, Math.round((val / maxVal) * BAR_MAX_H)) : 0;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="font-size:11px;font-weight:600;color:${campColors[ci]}">${val > 0 ? fmtNum(val, 0) : '—'}</div>
        <div style="width:28px;height:${BAR_MAX_H}px;display:flex;align-items:flex-end">
          <div style="width:100%;height:${h}px;background:${campColors[ci]};border-radius:4px 4px 0 0"></div>
        </div>
      </div>`;
    }).join('');

    return `<div style="flex:1;min-width:120px;display:flex;flex-direction:column;align-items:center;gap:8px">
      <div style="display:flex;gap:6px;align-items:flex-end">${barrasHtml}</div>
      <div style="font-size:11px;font-weight:700;color:${color};text-align:center;max-width:100px">${campo}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="margin-bottom:12px">${leyendaHtml}</div>
    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-end;padding:8px 0">${gruposHtml}</div>`;
}

// ── FILTROS ───────────────────────────────────────────────────────────────────

function _poblarFiltrosCampania() {
  const sel = document.getElementById('lluvia-f-camp');
  if (!sel) return;
  const camps = [...new Set(lluviasTodas.map(r => campaniaLluvia(r.fecha)))].sort().reverse();
  const prev = sel.value;
  sel.innerHTML = '<option value="">Todas las campañas</option>' +
    camps.map(c => `<option value="${c}" ${c === prev ? 'selected' : ''}>${c}</option>`).join('');
}

function aplicarFiltrosLluvias() {
  lluviaCampFiltro  = document.getElementById('lluvia-f-camp')?.value  || '';
  lluviaCampoFiltro = document.getElementById('lluvia-f-campo')?.value || '';
  renderLluvias();
}
