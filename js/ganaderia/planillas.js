const _sortCaravana = (a, b) => {
  const av = a.caravana_interna || a.caravana_electronica;
  const bv = b.caravana_interna || b.caravana_electronica;
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  const an = Number(av); const bn = Number(bv);
  if (!isNaN(an) && !isNaN(bn)) return an - bn;
  return String(av).localeCompare(String(bv), 'es', { numeric: true });
};

function abrirModalPlanilla() {
  // Crear overlay sólido separado
  let ov = document.getElementById('planilla-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'planilla-overlay';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#111;z-index:9998;';
    document.body.appendChild(ov);
  }
  ov.style.display = 'block';

  const modal = document.getElementById('modal-planilla');
  if (modal.parentElement !== document.body) document.body.appendChild(modal);
  modal.style.display = 'flex';

  // Poblar rodeos
  const sel = document.getElementById('pl-rodeo');
  sel.innerHTML = '<option value="">— Seleccioná un rodeo —</option><option value="__general__">📋 General / Sin rodeo (planilla en blanco)</option>';
  rodeos.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.nombre;
    sel.appendChild(opt);
  });
}

function cerrarModalPlanilla() {
  document.getElementById('modal-planilla').style.display = 'none';
  const ov = document.getElementById('planilla-overlay');
  if (ov) ov.style.display = 'none';
}

function cargarAnimalesPlanilla() {
  const rodeoId = document.getElementById('pl-rodeo').value;
  const cont = document.getElementById('pl-animales');
  const cant = document.getElementById('pl-cant');
  const filasRow = document.getElementById('pl-filas-row');

  if (!rodeoId) {
    cont.innerHTML = '<span style="color:var(--texto-suave)">Seleccioná un rodeo primero</span>';
    cant.textContent = '';
    if (filasRow) filasRow.style.display = 'none';
    return;
  }

  if (rodeoId === '__general__') {
    cont.innerHTML = '<span style="color:var(--texto-suave)">Planilla en blanco — ingresá la cantidad de filas</span>';
    cant.textContent = '';
    if (filasRow) filasRow.style.display = '';
    return;
  }

  if (filasRow) filasRow.style.display = 'none';
  const animales = animalesRodeo.filter(a => a.rodeo_id === rodeoId).sort(_sortCaravana);

  if (!animales.length) {
    cont.innerHTML = '<span style="color:var(--texto-suave)">Sin animales en este rodeo</span>';
    cant.textContent = '';
    return;
  }

  cont.innerHTML = animales.map(a => {
    const label = caravanaDisplay(a) + (a.categoria ? ` — ${a.categoria}` : '');
    return `<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer">
      <input type="checkbox" class="pl-check" data-id="${a.id}" checked style="accent-color:var(--bordo);width:15px;height:15px" onchange="actualizarCantPlanilla()">
      <span>${label}</span>
    </label>`;
  }).join('');

  actualizarCantPlanilla();
}

function selTodosAnimalesPlanilla(val) {
  document.querySelectorAll('.pl-check').forEach(c => c.checked = val);
  actualizarCantPlanilla();
}

function actualizarCantPlanilla() {
  const total = document.querySelectorAll('.pl-check').length;
  const sel = document.querySelectorAll('.pl-check:checked').length;
  document.getElementById('pl-cant').textContent = `${sel} de ${total} animales seleccionados`;
}

function generarPlanillaPDF() {
  const rodeoId = document.getElementById('pl-rodeo').value;
  if (!rodeoId) { toast('Seleccioná un rodeo', 'var(--tierra)'); return; }

  const tipo = document.getElementById('pl-tipo').value;
  let ids, nombreRodeo;

  if (rodeoId === '__general__') {
    const filas = parseInt(document.getElementById('pl-filas-cant')?.value) || 50;
    ids = Array(filas).fill('');
    nombreRodeo = '';
  } else {
    const rodeo = rodeos.find(r => r.id === rodeoId);
    const idsSeleccionados = new Set([...document.querySelectorAll('.pl-check:checked')].map(c => c.dataset.id));
    const animales = animalesRodeo
      .filter(a => a.rodeo_id === rodeoId && idsSeleccionados.has(a.id))
      .sort(_sortCaravana);
    if (!animales.length) { toast('Seleccioná al menos un animal', 'var(--tierra)'); return; }
    ids = animales.map(a => caravanaDisplay(a));
    nombreRodeo = rodeo?.nombre || '';
  }
  let html = '';

  if (tipo === 'tacto') html = htmlPlanillaTacto(ids, nombreRodeo);
  else if (tipo === 'inseminacion') html = htmlPlanillaInseminacion(ids, nombreRodeo);
  else if (tipo === 'vacunacion') html = htmlPlanillaVacunacion(ids, nombreRodeo);
  else if (tipo === 'pariciones') html = htmlPlanillaPariciones(ids, nombreRodeo);

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
  cerrarModalPlanilla();
}

// ─── Estilos comunes ───────────────────────────────────────────────
const CSS_BASE = `
  <style>
  @page { size: A4 portrait; margin: 10mm 11mm; }
  html, body { width: 210mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; font-family: system-ui, sans-serif; }
  .enc { display:flex; align-items:flex-end; justify-content:space-between; border-bottom:2.5px solid #2D5016; padding-bottom:5px; margin-bottom:5px; }
  .rotulo { font-family:Georgia,serif; font-size:17pt; font-weight:700; color:#2D5016; letter-spacing:3px; text-transform:uppercase; }
  .enc-campos { display:flex; gap:14px; align-items:flex-end; }
  .campo { display:flex; align-items:flex-end; gap:5px; font-size:7.5pt; font-weight:700; color:#2D5016; text-transform:uppercase; letter-spacing:.5px; }
  .campo .linea { border-bottom:1.5px solid #1A1A18; width:70px; height:13px; }
  .campo .linea-c { border-bottom:1.5px solid #1A1A18; width:44px; height:13px; }
  .campo .linea-l { border-bottom:1.5px solid #1A1A18; width:100px; height:13px; }
  .tabla-wrap { border:1.5px solid #2D5016; border-radius:3px; overflow:hidden; flex:1; }
  table { width:100%; height:100%; border-collapse:collapse; font-size:7.5pt; table-layout:fixed; font-variant-numeric:tabular-nums; }
  thead th { background:#2D5016; color:#fff; padding:4px 3px; font-size:7pt; font-weight:700; text-transform:uppercase; text-align:center; border-right:1px solid rgba(255,255,255,0.2); white-space:nowrap; }
  thead th:last-child { border-right:none; }
  thead th.sep { border-left:3px solid rgba(255,255,255,0.55) !important; }
  tbody tr:nth-child(even) { background:#E0E0E0; }
  tbody tr:nth-child(odd)  { background:#FFFFFF; }
  tbody td { border-right:1px solid #B8C8AD; border-bottom:1px solid #B8C8AD; padding:0; }
  tbody td:last-child { border-right:none; }
  tbody td.sep { border-left:2.5px solid #7A9A68 !important; }
  td.num { font-size:6pt; color:#999; text-align:center; vertical-align:middle; font-family:'Courier New',monospace; }
  td.idc { font-family:'Courier New',monospace; font-size:7pt; padding:0 3px; vertical-align:middle; }
  .pie { display:flex; justify-content:space-between; font-size:6.5pt; color:#555; margin-top:3px; }
  .page { width:100%; height:277mm; display:flex; flex-direction:column; gap:6px; page-break-after:always; overflow:hidden; }
  .page:last-child { page-break-after:auto; }
  </style>`;

// ─── TACTO ─────────────────────────────────────────────────────────
function htmlPlanillaTacto(ids, rodeo) {
  const FILAS = 34;
  const paginas = [];
  for (let p = 0; p * FILAS * 2 < ids.length || p === 0; p++) {
    const base = p * FILAS * 2;
    const izq = ids.slice(base, base + FILAS);
    const der = ids.slice(base + FILAS, base + FILAS * 2);
    let filas = '';
    for (let i = 0; i < FILAS; i++) {
      filas += `<tr>
        <td class="num">${base + i + 1}</td><td class="idc">${izq[i] || ''}</td><td></td><td></td><td></td><td></td>
        <td class="num sep">${base + FILAS + i + 1}</td><td class="idc">${der[i] || ''}</td><td></td><td></td><td></td><td></td>
      </tr>`;
    }
    paginas.push(`<div class="page">
      <div class="enc">
        <div class="rotulo">Tacto Rectal</div>
        <div class="enc-campos">
          <div class="campo">Rodeo: <div class="linea" style="min-width:80px">${rodeo}</div></div>
          <div class="campo">Fecha: <div class="linea-c"></div></div>
          <div class="campo">Resp.: <div class="linea"></div></div>
        </div>
      </div>
      <div class="tabla-wrap"><table>
        <thead><tr>
          <th style="width:4%">#</th><th style="width:12%">N° ID</th><th style="width:7%">P/V</th><th style="width:9%">DCC</th><th style="width:6%">CC</th><th style="width:12%">Obs</th>
          <th class="sep" style="width:4%">#</th><th style="width:12%">N° ID</th><th style="width:7%">P/V</th><th style="width:9%">DCC</th><th style="width:6%">CC</th><th style="width:12%">Obs</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
      <div class="pie"><span>Grupo Giraudo</span><span>${ids.length} animales · Pág ${p+1}</span></div>
    </div>`);
    if (base + FILAS * 2 >= ids.length) break;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tacto — ${rodeo}</title>${CSS_BASE}</head><body>${paginas.join('')}</body></html>`;
}

// ─── INSEMINACIÓN ──────────────────────────────────────────────────
function htmlPlanillaInseminacion(ids, rodeo) {
  const FILAS = 34;
  const paginas = [];
  for (let p = 0; p * FILAS * 2 < ids.length || p === 0; p++) {
    const base = p * FILAS * 2;
    const izq = ids.slice(base, base + FILAS);
    const der = ids.slice(base + FILAS, base + FILAS * 2);
    let filas = '';
    for (let i = 0; i < FILAS; i++) {
      filas += `<tr>
        <td class="num">${base + i + 1}</td><td class="idc">${izq[i] || ''}</td><td></td><td></td><td></td>
        <td class="num sep">${base + FILAS + i + 1}</td><td class="idc">${der[i] || ''}</td><td></td><td></td><td></td>
      </tr>`;
    }
    paginas.push(`<div class="page">
      <div class="enc">
        <div class="rotulo">Inseminación</div>
        <div class="enc-campos">
          <div class="campo">Rodeo: <div class="linea" style="min-width:80px">${rodeo}</div></div>
          <div class="campo">Fecha: <div class="linea-c"></div></div>
          <div class="campo">Resp.: <div class="linea"></div></div>
        </div>
      </div>
      <div class="tabla-wrap"><table>
        <thead><tr>
          <th style="width:4%">#</th><th style="width:12%">N° ID</th><th style="width:6%">CC</th><th style="width:15%">Toro / Semen</th><th style="width:13%">Observación</th>
          <th class="sep" style="width:4%">#</th><th style="width:12%">N° ID</th><th style="width:6%">CC</th><th style="width:15%">Toro / Semen</th><th style="width:13%">Observación</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
      <div class="pie"><span>Grupo Giraudo</span><span>${ids.length} animales · Pág ${p+1}</span></div>
    </div>`);
    if (base + FILAS * 2 >= ids.length) break;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Inseminación — ${rodeo}</title>${CSS_BASE}</head><body>${paginas.join('')}</body></html>`;
}

// ─── VACUNACIÓN ────────────────────────────────────────────────────
function htmlPlanillaVacunacion(ids, rodeo) {
  const FILAS = 34;
  const CSS_VAC = CSS_BASE.replace('</style>', `
  .grilla { flex:1; display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px; }
  .bloque { display:flex; flex-direction:column; border:1.5px solid #2D5016; border-radius:3px; overflow:hidden; }
  .bloque table { height:100%; }
  </style>`);
  const paginas = [];
  for (let p = 0; p * FILAS * 3 < ids.length || p === 0; p++) {
    const base = p * FILAS * 3;
    const bloques = [0,1,2].map(b => {
      const chunk = ids.slice(base + b * FILAS, base + (b+1) * FILAS);
      let filas = '';
      for (let i = 0; i < FILAS; i++) {
        filas += `<tr><td class="num">${base + b * FILAS + i + 1}</td><td class="idc">${chunk[i] || ''}</td><td></td></tr>`;
      }
      return `<div class="bloque"><table>
        <thead><tr><th style="width:14%">#</th><th style="width:30%">N° ID</th><th>Observación</th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>`;
    }).join('');
    paginas.push(`<div class="page">
      <div class="enc">
        <div class="rotulo">Vacunación</div>
        <div class="enc-campos">
          <div class="campo">Vacuna: <div class="linea-l"></div></div>
          <div class="campo">Rodeo: <div class="linea" style="min-width:70px">${rodeo}</div></div>
          <div class="campo">Fecha: <div class="linea-c"></div></div>
        </div>
      </div>
      <div class="grilla">${bloques}</div>
      <div class="pie"><span>Grupo Giraudo</span><span>${ids.length} animales · Pág ${p+1}</span></div>
    </div>`);
    if (base + FILAS * 3 >= ids.length) break;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vacunación — ${rodeo}</title>${CSS_VAC}</head><body>${paginas.join('')}</body></html>`;
}

// ─── PARICIONES ────────────────────────────────────────────────────
function htmlPlanillaPariciones(ids, rodeo) {
  const FILAS = 38;
  const paginas = [];
  for (let p = 0; p * FILAS < ids.length || p === 0; p++) {
    const base = p * FILAS;
    const chunk = ids.slice(base, base + FILAS);
    let filas = '';
    for (let i = 0; i < FILAS; i++) {
      filas += `<tr><td class="num">${base + i + 1}</td><td class="idc">${chunk[i] || ''}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }
    paginas.push(`<div class="page">
      <div class="enc">
        <div class="rotulo">Pariciones</div>
        <div class="enc-campos">
          <div class="campo">Rodeo: <div class="linea" style="min-width:80px">${rodeo}</div></div>
          <div class="campo">Año: <div class="linea-c"></div></div>
          <div class="campo">Resp.: <div class="linea"></div></div>
        </div>
      </div>
      <div class="tabla-wrap"><table>
        <thead><tr>
          <th style="width:4%">#</th>
          <th style="width:10%">N° Madre</th>
          <th style="width:12%">Toro / IATF</th>
          <th style="width:13%">F. Prob. Parto</th>
          <th style="width:11%">F. Parto</th>
          <th style="width:20%">Observaciones</th>
          <th style="width:10%">Estado</th>
          <th style="width:8%">Sexo</th>
          <th style="width:12%">N° Cría</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
      <div class="pie"><span>Grupo Giraudo</span><span>${ids.length} animales · Pág ${p+1}</span></div>
    </div>`);
    if (base + FILAS >= ids.length) break;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pariciones — ${rodeo}</title>${CSS_BASE}</head><body>${paginas.join('')}</body></html>`;
}
