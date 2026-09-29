// Generador de reporte PDF — Liquidaciones de Granos

const CAMPOS_REP_LIQGR = [
  { id: 'firma',               label: 'Firma',              def: true  },
  { id: 'razon_social',        label: 'Razón social',       def: true  },
  { id: 'fecha',               label: 'Fecha',              def: true  },
  { id: 'grano',               label: 'Grano',              def: true  },
  { id: 'numero',              label: 'N°',                 def: true  },
  { id: 'observacion',         label: 'Observación',        def: false },
  { id: 'campania',            label: 'Campaña',            def: true  },
  { id: 'kg',                  label: 'Kg',                 def: true  },
  { id: 'precio_tt',           label: 'Precio/TT',          def: true  },
  { id: 'subtotal',            label: 'Subtotal',           def: false },
  { id: 'total_retencion_afip',label: 'Total ret. AFIP',    def: true  },
  { id: 'total_deducciones',   label: 'Total deducciones',  def: true  },
  { id: 'neto_cobrar',         label: 'Neto a cobrar',      def: true  },
];

function _liqgrGetFiltered() {
  const fBusca = (document.getElementById('liqgr-filtro-busca')?.value || '').trim().toLowerCase();
  const fFirma = document.getElementById('liqgr-f-firma')?.value || '';
  const fRazon = document.getElementById('liqgr-f-razon')?.value || '';
  const fFecha = document.getElementById('liqgr-f-fecha')?.value || '';
  const fGrano = document.getElementById('liqgr-f-grano')?.value || '';
  const fNum   = (document.getElementById('liqgr-f-num')?.value  || '').trim().toLowerCase();
  const fObs   = document.getElementById('liqgr-f-obs')?.value   || '';
  const fCamp  = document.getElementById('liqgr-f-camp')?.value  || '';

  return liqgrTodas.filter(l => {
    if (fBusca && !`${l.razon_social||''} ${l.numero||''} ${l.grano||''}`.toLowerCase().includes(fBusca)) return false;
    if (fFirma && l.firma        !== fFirma) return false;
    if (fRazon && l.razon_social !== fRazon) return false;
    if (fFecha && l.fecha        !== fFecha) return false;
    if (fGrano && l.grano        !== fGrano) return false;
    if (fNum   && !(l.numero||'').toLowerCase().includes(fNum)) return false;
    if (fObs   && l.observacion  !== fObs)   return false;
    if (fCamp  && l.campania     !== fCamp)  return false;
    return true;
  });
}

function _liqgrFiltroDesc() {
  const p = [];
  const fFirma = document.getElementById('liqgr-f-firma')?.value || '';
  const fRazon = document.getElementById('liqgr-f-razon')?.value || '';
  const fGrano = document.getElementById('liqgr-f-grano')?.value || '';
  const fCamp  = document.getElementById('liqgr-f-camp')?.value  || '';
  const fBusca = (document.getElementById('liqgr-filtro-busca')?.value || '').trim();
  if (fFirma) p.push('Firma: '      + fFirma);
  if (fRazon) p.push('Razón social: '+ fRazon);
  if (fGrano) p.push('Grano: '      + fGrano);
  if (fCamp)  p.push('Campaña: '    + fCamp);
  if (fBusca) p.push('Búsqueda: "'  + fBusca + '"');
  return p.length ? p.join(' · ') : 'Sin filtros aplicados';
}

function generarReporteLiqGranos(formato) {
  const rows = _liqgrGetFiltered();
  if (!rows.length) { toast('No hay liquidaciones con los filtros actuales', 'var(--tierra)'); return; }

  const camposHtml = CAMPOS_REP_LIQGR.map(c =>
    `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
      <input type="checkbox" class="repliqgr-campo" data-id="${c.id}" ${c.def ? 'checked' : ''}>
      ${c.label}
    </label>`
  ).join('');

  const html = `<div id="modal-reporte-liqgr" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)document.getElementById('modal-reporte-liqgr').remove()">
    <div style="background:var(--blanco);border-radius:14px;padding:24px;max-width:420px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:17px">📄 Reporte — Liquidaciones de Granos</h3>
        <button onclick="document.getElementById('modal-reporte-liqgr').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--texto-suave)">✕</button>
      </div>
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--texto-suave);margin-bottom:8px;letter-spacing:.5px">Campos a incluir (${rows.length} liquidaciones)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:16px">${camposHtml}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--gris-borde);padding-top:16px">
        <button class="btn btn-secondary" onclick="document.getElementById('modal-reporte-liqgr').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="_ejecutarReporteLiqGranos()">📄 PDF</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function _ejecutarReporteLiqGranos() {
  const campos = [...document.querySelectorAll('.repliqgr-campo:checked')].map(c => c.dataset.id);
  if (!campos.length) { toast('Seleccioná al menos un campo', 'var(--tierra)'); return; }
  document.getElementById('modal-reporte-liqgr')?.remove();

  const rows = _liqgrGetFiltered();
  const cols = CAMPOS_REP_LIQGR.filter(c => campos.includes(c.id));

  // Totales sobre filas filtradas
  const totKg      = rows.reduce((s, l) => s + (l.kg || 0), 0);
  const totNeto    = rows.reduce((s, l) => s + (l.neto_cobrar || 0), 0);
  const totRetAFIP = rows.reduce((s, l) => s + (l.total_retencion_afip || 0), 0);
  const totDeduc   = rows.reduce((s, l) => s + (l.total_deducciones || 0), 0);

  const cabecera = cols.map(c => c.label);
  const filas = rows.map(l => {
    const map = {
      firma:               l.firma || '—',
      razon_social:        l.razon_social || '—',
      fecha:               fmtFecha(l.fecha) || '—',
      grano:               l.grano || '—',
      numero:              l.numero || '—',
      observacion:         l.observacion || '—',
      campania:            l.campania || '—',
      kg:                  l.kg ? fmtKg(l.kg) : '—',
      precio_tt:           l.precio_tt ? fmtMonto(l.precio_tt, 'ARS') : '—',
      subtotal:            l.subtotal ? fmtMonto(l.subtotal, 'ARS') : '—',
      total_retencion_afip:l.total_retencion_afip ? fmtMonto(l.total_retencion_afip, 'ARS') : '—',
      total_deducciones:   l.total_deducciones ? fmtMonto(l.total_deducciones, 'ARS') : '—',
      neto_cobrar:         l.neto_cobrar ? fmtMonto(l.neto_cobrar, 'ARS') : '—',
    };
    return cols.map(c => map[c.id] ?? '—');
  });

  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const filtroDesc = _liqgrFiltroDesc();

  const tablaCols = cols.map(c =>
    `<th style="background:#166534;color:#fff;padding:7px 10px;font-size:12px;text-align:left;white-space:nowrap">${c.label}</th>`
  ).join('');
  const tablaFilas = filas.map((f, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#f0faf4'}">
      ${f.map(v => `<td style="padding:6px 10px;font-size:12px;border-bottom:1px solid #eee">${v}</td>`).join('')}
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Liquidaciones de Granos</title>
  <style>
    @media print { @page { margin:15mm 12mm; } .no-print { display:none; } }
    body { font-family:Arial,sans-serif; color:#222; margin:0; padding:20px; }
    h1 { font-size:20px; color:#166534; margin:0 0 4px; }
    .sub { font-size:13px; color:#666; margin-bottom:4px; }
    .resumen { background:#f0faf4; border-left:4px solid #166534; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0; font-size:14px; }
    table { width:100%; border-collapse:collapse; margin-top:16px; }
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>📄 Liquidaciones de Granos</h1>
      <div class="sub">Reporte · ${hoy}</div>
      <div class="sub" style="color:#166534">${filtroDesc}</div>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:8px 18px;background:#166534;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimir / PDF</button>
  </div>
  <div class="resumen">
    <div style="font-weight:700;margin-bottom:6px">Resumen · ${rows.length} liquidación${rows.length !== 1 ? 'es' : ''}</div>
    <div style="display:flex;flex-wrap:wrap;gap:16px">
      <span>⚖️ Kg totales: <strong>${fmtKg(totKg)}</strong></span>
      <span style="color:#166534">💲 Neto a cobrar: <strong>${fmtMonto(totNeto, 'ARS')}</strong></span>
      <span style="color:#b32b2b">🏛️ Ret. AFIP: <strong>${fmtMonto(totRetAFIP, 'ARS')}</strong></span>
      <span style="color:#7a5a00">📉 Deducciones: <strong>${fmtMonto(totDeduc, 'ARS')}</strong></span>
    </div>
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
