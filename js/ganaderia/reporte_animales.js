// Generador de reportes de animales — PDF (print) y Excel (SheetJS)

const CAMPOS_REPORTE = [
  { id: 'caravana',      label: 'Caravana',             def: true  },
  { id: 'categoria',     label: 'Categoría',            def: true  },
  { id: 'sexo',          label: 'Sexo',                 def: false },
  { id: 'raza',          label: 'Raza',                 def: true  },
  { id: 'fecha_nac',     label: 'Fecha nacimiento',     def: false },
  { id: 'madre',         label: 'Madre',                def: true  },
  { id: 'padre',         label: 'Padre',                def: false },
  { id: 'renspa',        label: 'RENSPA',               def: false },
  { id: 'estado_reprod', label: 'Estado reproductivo',  def: true  },
  { id: 'fecha_parto',   label: 'Parto / Parto probable', def: true },
  { id: 'ultimo_peso',   label: 'Último peso (kg)',     def: true  },
  { id: 'gdp',           label: 'GDP (kg/día)',         def: false },
  { id: 'ultimo_sanit',  label: 'Último evento sanitario', def: false },
];

let _reporteState = null;

function abrirModalReporteAnimales(rodeoId) {
  const rodeo = rodeos.find(r => r.id === rodeoId);
  const animalesFiltrados = _getAnimalesFiltrados(rodeoId);

  const camposHtml = CAMPOS_REPORTE.map(c =>
    `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
      <input type="checkbox" class="rep-campo" data-id="${c.id}" ${c.def ? 'checked' : ''}>
      ${c.label}
    </label>`
  ).join('');

  const animalesHtml = animalesFiltrados.map(a =>
    `<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:2px 0">
      <input type="checkbox" class="rep-animal" data-id="${a.id}" checked>
      <span style="font-weight:600">#${caravanaDisplay(a)}</span>
      <span style="color:var(--texto-suave)">${a.categoria || ''} ${a.raza ? '· ' + a.raza : ''}</span>
    </label>`
  ).join('');

  const html = `<div id="modal-reporte-animales" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)cerrarModalReporte()">
    <div style="background:var(--blanco);border-radius:14px;padding:24px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:17px">📄 Reporte de animales — ${rodeo?.nombre || ''}</h3>
        <button onclick="cerrarModalReporte()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--texto-suave)">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- columna izquierda: campos -->
        <div>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--texto-suave);margin-bottom:8px;letter-spacing:.5px">Campos a incluir</div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${camposHtml}
          </div>
          <div style="margin-top:10px;display:flex;gap:8px">
            <button class="btn btn-secondary" style="font-size:11px;padding:3px 8px" onclick="_repSelCampos(true)">Todos</button>
            <button class="btn btn-secondary" style="font-size:11px;padding:3px 8px" onclick="_repSelCampos(false)">Ninguno</button>
          </div>
        </div>
        <!-- columna derecha: animales -->
        <div>
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--texto-suave);margin-bottom:8px;letter-spacing:.5px">Animales (${animalesFiltrados.length})</div>
          <div style="max-height:280px;overflow-y:auto;border:1px solid var(--gris-borde);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:1px">
            ${animalesHtml || '<div style="font-size:12px;color:var(--texto-suave)">Sin animales con los filtros actuales</div>'}
          </div>
          <div style="margin-top:10px;display:flex;gap:8px">
            <button class="btn btn-secondary" style="font-size:11px;padding:3px 8px" onclick="_repSelAnimales(true)">Todos</button>
            <button class="btn btn-secondary" style="font-size:11px;padding:3px 8px" onclick="_repSelAnimales(false)">Ninguno</button>
          </div>
        </div>
      </div>

      <div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--gris-borde);padding-top:16px">
        <button class="btn btn-secondary" onclick="cerrarModalReporte()">Cancelar</button>
        <button class="btn btn-secondary" onclick="_ejecutarReporteAnimales('${rodeoId}','excel')">📊 Excel</button>
        <button class="btn btn-primary" onclick="_ejecutarReporteAnimales('${rodeoId}','pdf')">📄 PDF</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

function cerrarModalReporte() {
  document.getElementById('modal-reporte-animales')?.remove();
}

function _repSelCampos(val) {
  document.querySelectorAll('.rep-campo').forEach(c => c.checked = val);
}
function _repSelAnimales(val) {
  document.querySelectorAll('.rep-animal').forEach(c => c.checked = val);
}

function _getAnimalesFiltrados(rodeoId) {
  // Replica los mismos filtros que aplica renderTabAnimales
  const fCar       = (document.getElementById(`f-caravana-${rodeoId}`)?.value || '').toLowerCase();
  const fSexo      = document.getElementById(`f-sexo-${rodeoId}`)?.value || '';
  const fCat       = document.getElementById(`f-cat-${rodeoId}`)?.value || '';
  const fRep       = document.getElementById(`f-rep-${rodeoId}`)?.value || '';
  const fFechaDesde = document.getElementById(`f-fecha-desde-${rodeoId}`)?.value || '';
  const fFechaHasta = document.getElementById(`f-fecha-hasta-${rodeoId}`)?.value || '';
  const fRenspa    = document.getElementById(`f-renspa-${rodeoId}`)?.value || '';

  let lista = animalesRodeo.filter(a => a.rodeo_id === rodeoId);
  if (fCar) lista = lista.filter(a =>
    (a.caravana_interna || '').toLowerCase().includes(fCar) ||
    (a.caravana_electronica || '').toLowerCase().includes(fCar));
  if (fSexo) lista = lista.filter(a => a.sexo === fSexo);
  if (fCat)  lista = lista.filter(a => a.categoria === fCat);
  if (fRep)  lista = lista.filter(a => estadoReprodAnimal(a.id) === fRep);
  if (fFechaDesde) lista = lista.filter(a => a.fecha_nacimiento >= fFechaDesde);
  if (fFechaHasta) lista = lista.filter(a => a.fecha_nacimiento <= fFechaHasta);
  if (fRenspa) lista = lista.filter(a => a.renspa_id === fRenspa);
  return lista;
}

function _ejecutarReporteAnimales(rodeoId, formato) {
  const camposSelec = [...document.querySelectorAll('.rep-campo:checked')].map(c => c.dataset.id);
  const animalesSelec = new Set([...document.querySelectorAll('.rep-animal:checked')].map(c => c.dataset.id));

  if (!camposSelec.length) { toast('Seleccioná al menos un campo', 'var(--tierra)'); return; }
  if (!animalesSelec.size)  { toast('Seleccioná al menos un animal', 'var(--tierra)'); return; }

  const rodeo = rodeos.find(r => r.id === rodeoId);
  const animales = _getAnimalesFiltrados(rodeoId).filter(a => animalesSelec.has(a.id));

  // Construir filas de datos
  const cols = CAMPOS_REPORTE.filter(c => camposSelec.includes(c.id));
  const cabecera = cols.map(c => c.label);

  const filas = animales.map(a => {
    const srvs = serviciosAnimal.filter(s => s.animal_id === a.id).sort((x,y) => new Date(y.fecha)-new Date(x.fecha));
    const ultSrv = srvs[0];
    const estReprod = estadoReprodAnimal(a.id);

    // Fecha parto / probable
    let fechaPartoCelda = '—';
    if (estReprod === 'Preñada' && ultSrv?.fecha) {
      const fp = new Date(ultSrv.fecha); fp.setDate(fp.getDate() + 270);
      fechaPartoCelda = 'Probable: ' + _fmtF(fp);
    } else if (estReprod === 'Vacía' && ultSrv?.fecha_parto) {
      fechaPartoCelda = 'Real: ' + ultSrv.fecha_parto;
    }

    // Último peso y GDP
    const pesadas = pesadasAnimal.filter(p => p.animal_id === a.id).sort((x,y) => new Date(x.fecha)-new Date(y.fecha));
    const ultPes = pesadas.length ? pesadas[pesadas.length-1] : null;
    let gdp = '—';
    if (pesadas.length >= 2) {
      const d = Math.floor((new Date(ultPes.fecha)-new Date(pesadas[0].fecha))/86400000);
      if (d > 0) gdp = ((ultPes.peso_kg - pesadas[0].peso_kg) / d).toFixed(2);
    } else if (ultPes && a.fecha_nacimiento) {
      const d = Math.floor((new Date(ultPes.fecha)-new Date(a.fecha_nacimiento))/86400000);
      if (d > 0) gdp = (ultPes.peso_kg / d).toFixed(2);
    }

    // Último sanitario
    const ultSanit = sanidadAnimal.filter(s => s.animal_id === a.id).sort((x,y) => new Date(y.fecha)-new Date(x.fecha))[0];
    const ultSanitCelda = ultSanit ? `${ultSanit.fecha} · ${ultSanit.tipo || ''}` : '—';

    const map = {
      caravana:      caravanaDisplay(a),
      categoria:     a.categoria || '—',
      sexo:          a.sexo || '—',
      raza:          a.raza || '—',
      fecha_nac:     a.fecha_nacimiento || '—',
      madre:         a.caravana_madre || '—',
      padre:         a.caravana_padre || '—',
      renspa:        renspaLabel(a.renspa_id) || '—',
      estado_reprod: estReprod || '—',
      fecha_parto:   fechaPartoCelda,
      ultimo_peso:   ultPes ? ultPes.peso_kg + ' kg' : '—',
      gdp:           gdp !== '—' ? gdp + ' kg/día' : '—',
      ultimo_sanit:  ultSanitCelda,
    };
    return cols.map(c => map[c.id] ?? '—');
  });

  if (formato === 'excel') {
    cerrarModalReporte();
    _exportarAnimalesXlsx(rodeo, cabecera, filas, animales);
  } else {
    cerrarModalReporte();
    _abrirPdfAnimales(rodeo, rodeoId, cabecera, filas, animales, camposSelec);
  }
}

function _exportarAnimalesXlsx(rodeo, cabecera, filas, animales) {
  exportarXlsx([{
    nombre: rodeo?.nombre || 'Animales',
    filas: [cabecera, ...filas]
  }], `animales_${(rodeo?.nombre || 'rodeo').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`);
}

function _abrirPdfAnimales(rodeo, rodeoId, cabecera, filas, animales, camposSelec) {
  // Resumen de totales
  const cats = {};
  animales.forEach(a => { cats[a.categoria || 'Sin cat.'] = (cats[a.categoria || 'Sin cat.'] || 0) + 1; });
  const catHtml = Object.entries(cats).sort((a,b)=>b[1]-a[1])
    .map(([k,v]) => `<span style="margin-right:12px"><strong>${v}</strong> ${k}</span>`).join('');

  // Parición (si hay campaña activa y hay vacas)
  const idsAnimales = new Set(animales.filter(a => a.categoria === 'Vaca').map(a => a.id));
  const srvsPreñadas = serviciosAnimal.filter(s => idsAnimales.has(s.animal_id) && s.resultado === 'Preñada');
  let paricionHtml = '';
  if (srvsPreñadas.length) {
    const parieron = srvsPreñadas.filter(s => s.fecha_parto).length;
    const faltan   = srvsPreñadas.filter(s => !s.fecha_parto).length;
    paricionHtml = `<div style="margin-top:8px;font-size:13px">
      🐄 Parición: <strong style="color:#1a7a3a">${parieron} parieron</strong> · <strong style="color:#7a5a00">${faltan} faltan parir</strong>
    </div>`;
  }

  const tablaCols = cabecera.map(h => `<th style="background:#8B1A2F;color:#fff;padding:7px 10px;font-size:12px;text-align:left;white-space:nowrap">${h}</th>`).join('');
  const tablaFilas = filas.map((f, i) =>
    `<tr style="background:${i%2===0?'#fff':'#f7f4f4'}">
      ${f.map(v => `<td style="padding:6px 10px;font-size:12px;border-bottom:1px solid #eee">${v}</td>`).join('')}
    </tr>`
  ).join('');

  const hoy = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' });

  // Descripción del filtro activo
  const filtros = [];
  const fCat  = document.getElementById(`f-cat-${rodeoId}`)?.value;
  const fSexo = document.getElementById(`f-sexo-${rodeoId}`)?.value;
  const fRep  = document.getElementById(`f-rep-${rodeoId}`)?.value;
  if (fCat)  filtros.push(`Categoría: ${fCat}`);
  if (fSexo) filtros.push(`Sexo: ${fSexo}`);
  if (fRep)  filtros.push(`Estado reprod.: ${fRep}`);
  const filtroDesc = filtros.length ? filtros.join(' · ') : 'Sin filtros aplicados';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Animales — ${rodeo?.nombre || ''}</title>
  <style>
    @media print { @page { margin: 15mm 12mm; } .no-print { display:none; } }
    body { font-family: Arial, sans-serif; color: #222; margin: 0; padding: 20px; }
    h1 { font-size: 20px; color: #8B1A2F; margin: 0 0 4px; }
    .subtitulo { font-size: 13px; color: #666; margin-bottom: 4px; }
    .resumen { background: #f7f4f4; border-left: 4px solid #8B1A2F; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #8B1A2F; color: #fff; }
    tr:hover { background: #fff8f8; }
  </style>
  </head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>🐄 ${rodeo?.nombre || 'Rodeo'}</h1>
      <div class="subtitulo">Reporte de animales · ${hoy}</div>
      <div class="subtitulo" style="color:#8B1A2F">${filtroDesc}</div>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:8px 18px;background:#8B1A2F;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimir / PDF</button>
  </div>

  <div class="resumen">
    <div style="font-size:14px;font-weight:700;margin-bottom:6px">Resumen · ${animales.length} animales</div>
    <div style="font-size:13px">${catHtml}</div>
    ${paricionHtml}
  </div>

  <table>
    <thead><tr>${tablaCols}</tr></thead>
    <tbody>${tablaFilas}</tbody>
  </table>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

function _fmtF(d) {
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear().toString().slice(-2);
}
