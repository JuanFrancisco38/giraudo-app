// Generador de reporte PDF — Lluvias

const CAMPOS_REP_LLUVIAS = [
  { id: 'fecha',       label: 'Fecha',      def: true  },
  { id: 'campo',       label: 'Campo',      def: true  },
  { id: 'mm',          label: 'mm',         def: true  },
  { id: 'campania',    label: 'Campaña',    def: true  },
  { id: 'observacion', label: 'Obs.',       def: false },
];

function generarReporteLluvias() {
  const rows = _lluviasGetFiltered();
  if (!rows.length) { toast('No hay registros con los filtros actuales', 'var(--tierra)'); return; }

  const camposHtml = CAMPOS_REP_LLUVIAS.map(c =>
    `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
      <input type="checkbox" class="replluvia-campo" data-id="${c.id}" ${c.def ? 'checked' : ''}>
      ${c.label}
    </label>`
  ).join('');

  const html = `<div id="modal-reporte-lluvias" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)document.getElementById('modal-reporte-lluvias').remove()">
    <div style="background:var(--blanco);border-radius:14px;padding:24px;max-width:380px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:17px">📄 Reporte — Lluvias</h3>
        <button onclick="document.getElementById('modal-reporte-lluvias').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--texto-suave)">✕</button>
      </div>
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--texto-suave);margin-bottom:8px;letter-spacing:.5px">Campos a incluir (${rows.length} registros)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:16px">${camposHtml}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--gris-borde);padding-top:16px">
        <button class="btn btn-secondary" onclick="document.getElementById('modal-reporte-lluvias').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="_ejecutarReporteLluvias()">📄 PDF</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function _ejecutarReporteLluvias() {
  const campos = [...document.querySelectorAll('.replluvia-campo:checked')].map(c => c.dataset.id);
  if (!campos.length) { toast('Seleccioná al menos un campo', 'var(--tierra)'); return; }
  document.getElementById('modal-reporte-lluvias')?.remove();

  const rows = _lluviasGetFiltered();
  const cols = CAMPOS_REP_LLUVIAS.filter(c => campos.includes(c.id));

  // Totales por campo
  const totPorCampo = {};
  CAMPOS_LLUVIA.forEach(c => { totPorCampo[c] = 0; });
  rows.forEach(r => { totPorCampo[r.campo] = (totPorCampo[r.campo] || 0) + (r.mm || 0); });
  const totResumenHtml = CAMPOS_LLUVIA
    .filter(c => totPorCampo[c] > 0)
    .map(c => `<span style="margin-right:14px">📍 ${c}: <strong>${fmtNum(totPorCampo[c], 1)} mm</strong></span>`)
    .join('');

  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const campLabel = lluviaCampFiltro ? `Campaña ${lluviaCampFiltro}` : 'Todas las campañas';
  const campoLabel = lluviaCampoFiltro || 'Todos los campos';

  const tablaCols = cols.map(c =>
    `<th style="background:#1565c0;color:#fff;padding:7px 10px;font-size:12px;text-align:left;white-space:nowrap">${c.label}</th>`
  ).join('');
  const tablaFilas = rows.map((r, i) => {
    const map = {
      fecha:       fmtFecha(r.fecha) || '—',
      campo:       r.campo,
      mm:          fmtNum(r.mm, 1) + ' mm',
      campania:    campaniaLluvia(r.fecha),
      observacion: r.observacion || '—',
    };
    return `<tr style="background:${i % 2 === 0 ? '#fff' : '#eff6ff'}">
      ${cols.map(c => `<td style="padding:6px 10px;font-size:12px;border-bottom:1px solid #eee">${map[c.id] ?? '—'}</td>`).join('')}
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Lluvias</title>
  <style>
    @media print { @page { margin:15mm 12mm; } .no-print { display:none; } }
    body { font-family:Arial,sans-serif; color:#222; margin:0; padding:20px; }
    h1 { font-size:20px; color:#1565c0; margin:0 0 4px; }
    .sub { font-size:13px; color:#666; margin-bottom:4px; }
    .resumen { background:#eff6ff; border-left:4px solid #1565c0; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0; font-size:14px; }
    table { width:100%; border-collapse:collapse; margin-top:16px; }
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>🌧️ Lluvias</h1>
      <div class="sub">Reporte · ${hoy}</div>
      <div class="sub" style="color:#1565c0">${campLabel} · ${campoLabel}</div>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:8px 18px;background:#1565c0;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimir / PDF</button>
  </div>
  <div class="resumen">
    <div style="font-weight:700;margin-bottom:6px">Resumen · ${rows.length} registro${rows.length !== 1 ? 's' : ''}</div>
    <div style="font-size:13px">${totResumenHtml || '—'}</div>
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
