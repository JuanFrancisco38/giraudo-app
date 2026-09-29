// Generador de reporte PDF — Facturas Recibidas

const CAMPOS_REP_BOLETAS = [
  { id: 'fecha',      label: 'Fecha',          def: true  },
  { id: 'numero',     label: 'N° Factura',     def: true  },
  { id: 'firma',      label: 'Firma',          def: true  },
  { id: 'proveedor',  label: 'Proveedor',      def: true  },
  { id: 'rubro',      label: 'Rubro',          def: true  },
  { id: 'descripcion',label: 'Descripción',    def: true  },
  { id: 'cantidad',   label: 'Cantidad',       def: true  },
  { id: 'destino',    label: 'Destino',        def: false },
  { id: 'campania',   label: 'Campaña',        def: true  },
  { id: 'pago',       label: 'Estado de pago', def: true  },
  { id: 'subtotal',   label: 'Subtotal',       def: false },
  { id: 'pct_iva',    label: '% IVA',          def: false },
  { id: 'iva',        label: 'IVA $',          def: false },
  { id: 'total',      label: 'Total $',        def: true  },
];

function _boletasGetFiltered() {
  const fFirma  = document.getElementById('bol-filtro-firma')?.value   || '';
  const fCamp   = document.getElementById('bol-filtro-campania')?.value || '';
  const fRubro  = document.getElementById('bol-filtro-rubro')?.value   || '';
  const fProv   = document.getElementById('bol-filtro-prov')?.value    || '';
  const fDestino= document.getElementById('bol-filtro-destino')?.value || '';
  const fPago   = document.getElementById('bol-filtro-pago')?.value    || '';
  const fBusca  = (document.getElementById('bol-filtro-busca')?.value  || '').trim().toLowerCase();
  const fFecha  = (document.getElementById('bol-filtro-fecha')?.value  || '').trim().toLowerCase();
  const fNum    = (document.getElementById('bol-filtro-num')?.value    || '').trim().toLowerCase();

  const rows = boletasTodas.filter(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(_) {}
    if (fFirma   && (e.firma       || '') !== fFirma)   return false;
    if (fCamp    && (e.campania    || '') !== fCamp)    return false;
    if (fRubro   && (r.categoria   || '') !== fRubro)   return false;
    if (fProv    && (r.proveedor   || '') !== fProv)    return false;
    if (fDestino && (e.destino     || '') !== fDestino) return false;
    if (fPago    && (e.pago || 'Impaga')  !== fPago)    return false;
    if (fFecha   && !fmtFecha(r.fecha).toLowerCase().includes(fFecha)) return false;
    if (fNum     && !(e.numero_comprobante || '').toLowerCase().includes(fNum)) return false;
    if (fBusca) {
      const texto = `${r.proveedor || ''} ${e.numero_comprobante || ''} ${r.concepto || ''}`.toLowerCase();
      if (!texto.includes(fBusca)) return false;
    }
    return true;
  });
  return bolRubroFiltro ? rows.filter(r => (r.categoria || 'Sin rubro') === bolRubroFiltro) : rows;
}

function _boletasFiltroDesc() {
  const p = [];
  const fFirma  = document.getElementById('bol-filtro-firma')?.value   || '';
  const fCamp   = document.getElementById('bol-filtro-campania')?.value || '';
  const fRubro  = document.getElementById('bol-filtro-rubro')?.value   || '';
  const fProv   = document.getElementById('bol-filtro-prov')?.value    || '';
  const fPago   = document.getElementById('bol-filtro-pago')?.value    || '';
  const fBusca  = (document.getElementById('bol-filtro-busca')?.value  || '').trim();
  if (fFirma)  p.push('Firma: '    + fFirma);
  if (fCamp)   p.push('Campaña: '  + fCamp);
  if (fRubro)  p.push('Rubro: '    + fRubro);
  if (fProv)   p.push('Proveedor: '+ fProv);
  if (fPago)   p.push('Pago: '     + fPago);
  if (bolRubroFiltro) p.push('Rubro (pin): ' + bolRubroFiltro);
  if (fBusca)  p.push('Búsqueda: "' + fBusca + '"');
  return p.length ? p.join(' · ') : 'Sin filtros aplicados';
}

function generarReporteBoletas(formato) {
  const rows = _boletasGetFiltered();
  if (!rows.length) { toast('No hay facturas con los filtros actuales', 'var(--tierra)'); return; }

  // Abrir modal de campos
  const camposHtml = CAMPOS_REP_BOLETAS.map(c =>
    `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
      <input type="checkbox" class="repbol-campo" data-id="${c.id}" ${c.def ? 'checked' : ''}>
      ${c.label}
    </label>`
  ).join('');

  const html = `<div id="modal-reporte-boletas" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)document.getElementById('modal-reporte-boletas').remove()">
    <div style="background:var(--blanco);border-radius:14px;padding:24px;max-width:420px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:17px">📄 Reporte — Facturas Recibidas</h3>
        <button onclick="document.getElementById('modal-reporte-boletas').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--texto-suave)">✕</button>
      </div>
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--texto-suave);margin-bottom:8px;letter-spacing:.5px">Campos a incluir (${rows.length} facturas)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:16px">${camposHtml}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--gris-borde);padding-top:16px">
        <button class="btn btn-secondary" onclick="document.getElementById('modal-reporte-boletas').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="_ejecutarReporteBoletas()">📄 PDF</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function _ejecutarReporteBoletas() {
  const campos = [...document.querySelectorAll('.repbol-campo:checked')].map(c => c.dataset.id);
  if (!campos.length) { toast('Seleccioná al menos un campo', 'var(--tierra)'); return; }
  document.getElementById('modal-reporte-boletas')?.remove();

  const rows = _boletasGetFiltered();
  const cols  = CAMPOS_REP_BOLETAS.filter(c => campos.includes(c.id));

  // Totales
  const totCant  = rows.reduce((s, r) => { try { return s + (JSON.parse(r.observaciones || '{}').cantidad || 0); } catch(_) { return s; } }, 0);
  const totTotal = rows.reduce((s, r) => s + (r.monto || 0), 0);
  let pagado = 0, adeudado = 0;
  rows.forEach(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(_) {}
    if (e.pago === 'Paga') pagado += r.monto || 0; else adeudado += r.monto || 0;
  });

  const cabecera = cols.map(c => c.label);
  const filas = rows.map(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(_) {}
    const pctIva = e.pct_iva === 0 || e.pct_iva === '0' ? 'Exento' : (e.pct_iva ? e.pct_iva + '%' : '—');
    const map = {
      fecha:       fmtFecha(r.fecha) || '—',
      numero:      e.numero_comprobante || '—',
      firma:       e.firma || r.firma || '—',
      proveedor:   r.proveedor || '—',
      rubro:       r.categoria || '—',
      descripcion: r.concepto || e.descripcion || '—',
      cantidad:    e.cantidad != null ? String(e.cantidad) : '—',
      destino:     e.destino || '—',
      campania:    e.campania || '—',
      pago:        e.pago || 'Impaga',
      subtotal:    e.subtotal != null ? fmtMonto(e.subtotal, 'ARS') : '—',
      pct_iva:     pctIva,
      iva:         e.iva_monto != null ? fmtMonto(e.iva_monto, 'ARS') : '—',
      total:       r.monto != null ? fmtMonto(r.monto, 'ARS') : '—',
    };
    return cols.map(c => map[c.id] ?? '—');
  });

  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const filtroDesc = _boletasFiltroDesc();

  const tablaCols = cols.map(c =>
    `<th style="background:#8B1A2F;color:#fff;padding:7px 10px;font-size:12px;text-align:left;white-space:nowrap">${c.label}</th>`
  ).join('');
  const tablaFilas = filas.map((f, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#fdf4f4'}">
      ${f.map(v => `<td style="padding:6px 10px;font-size:12px;border-bottom:1px solid #eee">${v}</td>`).join('')}
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Facturas Recibidas</title>
  <style>
    @media print { @page { margin:15mm 12mm; } .no-print { display:none; } }
    body { font-family:Arial,sans-serif; color:#222; margin:0; padding:20px; }
    h1 { font-size:20px; color:#8B1A2F; margin:0 0 4px; }
    .sub { font-size:13px; color:#666; margin-bottom:4px; }
    .resumen { background:#fdf4f4; border-left:4px solid #8B1A2F; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0; font-size:14px; }
    table { width:100%; border-collapse:collapse; margin-top:16px; }
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>🧾 Facturas Recibidas</h1>
      <div class="sub">Reporte · ${hoy}</div>
      <div class="sub" style="color:#8B1A2F">${filtroDesc}</div>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:8px 18px;background:#8B1A2F;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimir / PDF</button>
  </div>
  <div class="resumen">
    <div style="font-weight:700;margin-bottom:6px">Resumen · ${rows.length} ítem${rows.length !== 1 ? 's' : ''}</div>
    <div>
      ${totCant ? `<span style="margin-right:16px">📦 Cantidad total: <strong>${fmtNum(totCant, 2)}</strong></span>` : ''}
      <span style="margin-right:16px">💲 Total: <strong>${fmtMonto(totTotal, 'ARS')}</strong></span>
      <span style="margin-right:16px;color:#1a7a3a">✅ Pagado: <strong>${fmtMonto(pagado, 'ARS')}</strong></span>
      <span style="color:#b32b2b">⏳ Adeudado: <strong>${fmtMonto(adeudado, 'ARS')}</strong></span>
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
