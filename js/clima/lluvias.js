// Módulo Clima — Lluvias

const CAMPOS_LLUVIA = ['Doña Vica', 'Sant-Yago', 'Don Alfredo (Azcona)'];

let lluviasTodas = [];
let lluviaCampFiltro = '';
let lluviaCampoFiltro = '';

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
  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById('lluvia-fecha').value = hoy;
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
  const campAct = campaniaActualLluvia();
  const filtered = _lluviasGetFiltered();
  const campUsada = lluviaCampFiltro || campAct;
  const enCamp = filtered.filter(r => campaniaLluvia(r.fecha) === campUsada);

  // Totales por campo
  const totPorCampo = {};
  CAMPOS_LLUVIA.forEach(c => { totPorCampo[c] = 0; });
  enCamp.forEach(r => { totPorCampo[r.campo] = (totPorCampo[r.campo] || 0) + (r.mm || 0); });

  const tarjetas = CAMPOS_LLUVIA.map(c => `
    <div style="background:var(--blanco);border-radius:12px;padding:16px;flex:1;min-width:140px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
      <div style="font-size:11px;color:var(--texto-suave);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${c}</div>
      <div style="font-size:28px;font-weight:700;color:#1565c0">${fmtNum(totPorCampo[c], 1)} <span style="font-size:14px;font-weight:400;color:var(--texto-suave)">mm</span></div>
    </div>`).join('');

  // Días sin lluvia (desde último registro en cualquier campo de la campaña activa)
  const hoy = new Date();
  let diasSinLluvia = '—';
  const ultimos = {};
  enCamp.forEach(r => {
    if (!ultimos[r.campo] || r.fecha > ultimos[r.campo]) ultimos[r.campo] = r.fecha;
  });
  const diasPorCampo = CAMPOS_LLUVIA.map(c => {
    if (!ultimos[c]) return null;
    return Math.floor((hoy - new Date(ultimos[c])) / 86400000);
  }).filter(d => d !== null);

  const diasHtml = diasPorCampo.length ? CAMPOS_LLUVIA.map((c, i) => {
    if (!ultimos[c]) return '';
    const d = Math.floor((hoy - new Date(ultimos[c])) / 86400000);
    const color = d >= 20 ? '#b32b2b' : d >= 10 ? '#e07000' : '#1a7a3a';
    return `<span style="margin-right:12px;color:${color}"><strong>${c.split(' ')[0]}</strong>: ${d}d sin lluvia</span>`;
  }).join('') : '<span style="color:var(--texto-suave)">Sin registros</span>';

  const el = document.getElementById('lluvia-totales');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">${tarjetas}</div>
    <div style="font-size:13px;padding:8px 0">${diasHtml}</div>`;
}

// ── PANORAMA CALENDARIO ───────────────────────────────────────────────────────

function _renderCalendario() {
  const el = document.getElementById('lluvia-calendario');
  if (!el) return;

  const campUsada = lluviaCampFiltro || campaniaActualLluvia();
  const [desde, hasta] = _campaniaMeses(campUsada);
  const filtered = _lluviasGetFiltered().filter(r => campaniaLluvia(r.fecha) === campUsada);

  // Agrupar por mes/campo
  const byMesCampo = {};
  filtered.forEach(r => {
    const mes = r.fecha.slice(0, 7);
    if (!byMesCampo[mes]) byMesCampo[mes] = {};
    byMesCampo[mes][r.campo] = (byMesCampo[mes][r.campo] || 0) + (r.mm || 0);
  });

  const meses = _mesesCampania(desde, hasta);

  const thCampos = CAMPOS_LLUVIA.map(c =>
    `<th style="padding:7px 10px;font-size:11px;text-align:center;background:#1565c0;color:#fff;white-space:nowrap">${c}</th>`
  ).join('');

  const filas = meses.map(mes => {
    const label = new Date(mes + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
    const celdas = CAMPOS_LLUVIA.map(c => {
      const val = byMesCampo[mes]?.[c] || 0;
      const bg  = val === 0 ? '' : val < 30 ? 'background:#dbeafe' : val < 80 ? 'background:#93c5fd' : 'background:#1565c0;color:#fff';
      return `<td style="padding:6px 10px;text-align:center;font-size:13px;${bg}">${val > 0 ? fmtNum(val, 1) : '—'}</td>`;
    }).join('');
    const total = CAMPOS_LLUVIA.reduce((s, c) => s + (byMesCampo[mes]?.[c] || 0), 0) / CAMPOS_LLUVIA.length;
    return `<tr><td style="padding:6px 10px;font-size:13px;font-weight:600">${label}</td>${celdas}<td style="padding:6px 10px;text-align:center;font-size:13px;color:var(--texto-suave)">${total > 0 ? fmtNum(total, 1) : '—'}</td></tr>`;
  }).join('');

  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-family:inherit">
      <thead>
        <tr>
          <th style="padding:7px 10px;font-size:11px;text-align:left;background:#1565c0;color:#fff">Mes</th>
          ${thCampos}
          <th style="padding:7px 10px;font-size:11px;text-align:center;background:#1565c0;color:#fff">Prom.</th>
        </tr>
      </thead>
      <tbody>${filas || '<tr><td colspan="${CAMPOS_LLUVIA.length + 2}" style="padding:20px;text-align:center;color:var(--texto-suave)">Sin datos para esta campaña</td></tr>'}</tbody>
    </table>`;
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
    el.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--texto-suave)">Sin registros</td></tr>';
    return;
  }

  el.innerHTML = rows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? 'var(--blanco)' : 'var(--fondo)'}">
      <td style="padding:8px 12px;font-size:13px">${fmtFecha(r.fecha)}</td>
      <td style="padding:8px 12px;font-size:13px">${r.campo}</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1565c0">${fmtNum(r.mm, 1)} mm</td>
      <td style="padding:8px 12px;font-size:13px;color:var(--texto-suave)">${campaniaLluvia(r.fecha)}</td>
      <td style="padding:8px 12px;font-size:13px;color:var(--texto-suave)">${r.observacion || '—'}</td>
      <td style="padding:8px 12px;text-align:center">
        <button onclick="eliminarLluvia('${r.id}')" style="background:none;border:none;cursor:pointer;color:var(--tierra);font-size:14px" title="Eliminar">🗑️</button>
      </td>
    </tr>`).join('');
}

async function eliminarLluvia(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  await sb('DELETE', 'lluvias', null, `?id=eq.${id}`);
  lluviasTodas = lluviasTodas.filter(r => r.id !== id);
  toast('Registro eliminado', 'var(--tierra)');
  renderLluvias();
}

// ── COMPARACIÓN ENTRE CAMPAÑAS ────────────────────────────────────────────────

function _renderComparacion() {
  const el = document.getElementById('lluvia-comparacion');
  if (!el) return;

  const camps = [...new Set(lluviasTodas.map(r => campaniaLluvia(r.fecha)))].sort().reverse().slice(0, 5);
  if (camps.length < 1) { el.innerHTML = '<div style="color:var(--texto-suave);font-size:13px">Sin datos suficientes para comparar</div>'; return; }

  const meses = ['Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May','Jun'];
  const mesNums = [7,8,9,10,11,12,1,2,3,4,5,6];

  // Acumular por mes de campaña y campo
  const campData = {};
  camps.forEach(camp => {
    campData[camp] = {};
    CAMPOS_LLUVIA.forEach(c => { campData[camp][c] = new Array(12).fill(0); });
    const [desdeY] = _campaniaMeses(camp)[0].split('-').map(Number);
    const hasY = desdeY + 1;
    lluviasTodas.filter(r => campaniaLluvia(r.fecha) === camp).forEach(r => {
      const d = new Date(r.fecha);
      const mo = d.getMonth() + 1;
      const idx = mesNums.indexOf(mo);
      if (idx >= 0) campData[camp][r.campo][idx] += r.mm || 0;
    });
  });

  // Tabla de totales anuales por campo y campaña
  const thCamps = camps.map(c => `<th style="padding:7px 10px;font-size:11px;background:#1565c0;color:#fff;text-align:center">${c}</th>`).join('');
  const filas = CAMPOS_LLUVIA.map(campo => {
    const celdas = camps.map(camp => {
      const tot = campData[camp][campo].reduce((a, b) => a + b, 0);
      return `<td style="padding:6px 10px;text-align:center;font-size:13px">${tot > 0 ? fmtNum(tot, 0) + ' mm' : '—'}</td>`;
    }).join('');
    return `<tr><td style="padding:6px 10px;font-size:13px;font-weight:600">${campo}</td>${celdas}</tr>`;
  }).join('');

  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-family:inherit">
      <thead>
        <tr>
          <th style="padding:7px 10px;font-size:11px;text-align:left;background:#1565c0;color:#fff">Campo</th>
          ${thCamps}
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>`;
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
