// Generador de reportes de Trabajos — PDF (print) y Excel (SheetJS)

function _trabCeldaTexto(t, key) {
  const tl = t.tipo_labor || '';
  const tarifaHa = t.tarifa_ha
    || (tarifasTrabajos || []).find(r => normTipoTrab(r.tipo) === normTipoTrab(tl))?.tarifa_ha
    || 0;
  switch (key) {
    case 'fecha':         return t.fecha || '—';
    case 'tipo_labor':    return TIPO_LABEL_TRAB[tl] || tl || '—';
    case 'propietario':   return t.lotes?.partes?.nombre || '—';
    case 'campo':         return t.lotes?.campo || '—';
    case 'lote':          return t.lotes?.lote || '—';
    case 'hectareas':     return t.hectareas != null ? String(t.hectareas) : '—';
    case 'cultivo':       return t.cultivo || '—';
    case 'campania':      return t.campania || '—';
    case 'contratista':   return t.trabajo_contratista?.[0]?.partes?.nombre || 'Propio';
    case 'tarifa_ha':     return tarifaHa ? '$' + fmtNum(tarifaHa) : '—';
    case 'tarifa_total': {
      const v = tarifaHa && t.hectareas ? Math.round(tarifaHa * t.hectareas) : null;
      return v ? '$' + fmtNum(v) : '—';
    }
    case 'insumos': {
      const insList = t.trabajo_insumos || [];
      return insList.map(i => i.insumo || '').filter(Boolean).join(', ') || '—';
    }
    case 'dosis_ha': {
      const insList = t.trabajo_insumos || [];
      return insList.map(i => i.dosis_ha || i.dosis || '').filter(Boolean).join(', ') || '—';
    }
    case 'dosis_total': {
      const insList = t.trabajo_insumos || [];
      return insList.map(i => i.cantidad || '').filter(Boolean).join(', ') || '—';
    }
    case 'costo_ha': {
      const insList = t.trabajo_insumos || [];
      const costoIns = insList.reduce((s, i) => s + (i.costo_total || 0), 0);
      const contCosto = t.trabajo_contratista?.[0]?.costo || 0;
      const tarifa = contCosto || (tarifaHa && t.hectareas ? tarifaHa * t.hectareas : 0);
      const total = costoIns + tarifa;
      const v = total && t.hectareas ? Math.round(total / t.hectareas) : null;
      return v ? '$' + fmtNum(v) : '—';
    }
    case 'total': {
      const insList = t.trabajo_insumos || [];
      const costoIns = insList.reduce((s, i) => s + (i.costo_total || 0), 0);
      const contCosto = t.trabajo_contratista?.[0]?.costo || 0;
      const tarifa = contCosto || (tarifaHa && t.hectareas ? tarifaHa * t.hectareas : 0);
      const total = costoIns + tarifa;
      return total ? '$' + fmtNum(total) : '—';
    }
    case 'rendimiento_ha': {
      const v = t.rendimiento && t.hectareas ? Math.round(t.rendimiento / t.hectareas) : null;
      return v ? fmtNum(v) + ' kg/ha' : '—';
    }
    case 'cantidad_rollos': return t.cantidad_rollos != null ? String(t.cantidad_rollos) : '—';
    case 'rendimiento':     return t.rendimiento != null ? fmtNum(t.rendimiento) + ' kg' : '—';
    case 'operario':        return t.trabajo_maquinaria?.[0]?.empleados?.nombre || '—';
    case 'porcentaje':      return t.porcentaje != null ? t.porcentaje + '%' : '—';
    default: return String(t[key] ?? '—');
  }
}

function _trabGetFiltered() {
  const fBusca = (document.getElementById('trab-filtro-busca')?.value || '').trim().toLowerCase();
  const fTipo  = normTipoTrab(document.getElementById('trab-filtro-tipo')?.value || '');
  const colFilters = {};
  document.querySelectorAll('[data-col-filter]').forEach(el => {
    const v = el.value.trim();
    if (v) colFilters[el.dataset.colFilter] = v.toLowerCase();
  });

  return trabajosTodos.filter(t => {
    const tl = normTipoTrab(t.tipo_labor);
    if (fTipo && tl !== fTipo) return false;
    const lote  = t.lotes?.lote || '';
    const campo = t.lotes?.campo || '';
    const cultivo = t.cultivo || '';
    const cont  = t.trabajo_contratista?.[0]?.partes?.nombre || 'Propio';
    if (fBusca && !`${campo} ${lote} ${cultivo} ${cont} ${t.campania || ''}`.toLowerCase().includes(fBusca)) return false;
    for (const [k, q] of Object.entries(colFilters)) {
      const col = TRAB_COLS_ALL.find(c => c.key === k);
      const v = _trabCeldaTexto(t, k);
      if (col?.filterType === 'select') { if (v !== q && v.toLowerCase() !== q) return false; }
      else                              { if (!v.toLowerCase().includes(q)) return false; }
    }
    return true;
  });
}

function _trabTotales(rows) {
  const has = rows.reduce((s, t) => s + (t.hectareas || 0), 0);
  let costoTotal = 0;
  rows.forEach(t => {
    const tl = t.tipo_labor || '';
    const tarifaHa = t.tarifa_ha
      || (tarifasTrabajos || []).find(r => normTipoTrab(r.tipo) === normTipoTrab(tl))?.tarifa_ha
      || 0;
    const insList  = t.trabajo_insumos || [];
    const costoIns = insList.reduce((s, i) => s + (i.costo_total || 0), 0);
    const contCosto = t.trabajo_contratista?.[0]?.costo || 0;
    const tarifa = contCosto || (tarifaHa && t.hectareas ? tarifaHa * t.hectareas : 0);
    costoTotal += costoIns + tarifa;
  });
  return { cantidad: rows.length, has, costoTotal };
}

function _trabFiltroDesc() {
  const partes = [];
  const fBusca = (document.getElementById('trab-filtro-busca')?.value || '').trim();
  const fTipo  = document.getElementById('trab-filtro-tipo')?.value || '';
  if (fTipo)  partes.push('Tipo: ' + fTipo);
  if (fBusca) partes.push('Búsqueda: "' + fBusca + '"');
  document.querySelectorAll('[data-col-filter]').forEach(el => {
    const v = el.value.trim();
    if (v) {
      const col = TRAB_COLS_ALL.find(c => c.key === el.dataset.colFilter);
      partes.push((col?.label || el.dataset.colFilter) + ': ' + v);
    }
  });
  return partes.length ? partes.join(' · ') : 'Sin filtros aplicados';
}

function generarReporteTrabajos(formato) {
  const rows  = _trabGetFiltered();
  const cols  = _trabColsActivas.map(k => TRAB_COLS_ALL.find(c => c.key === k)).filter(Boolean);
  const totales = _trabTotales(rows);

  if (!rows.length) { toast('No hay trabajos con los filtros actuales', 'var(--tierra)'); return; }

  const cabecera = cols.map(c => c.label);
  const filas    = rows.map(t => cols.map(c => _trabCeldaTexto(t, c.key)));

  if (formato === 'excel') {
    exportarXlsx([{ nombre: 'Trabajos', filas: [cabecera, ...filas] }],
      'trabajos_' + new Date().toISOString().split('T')[0]);
    return;
  }

  // PDF
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const filtroDesc = _trabFiltroDesc();

  const tablaCols = cols.map(c =>
    `<th style="background:#2E5496;color:#fff;padding:7px 10px;font-size:12px;text-align:left;white-space:nowrap">${c.label}</th>`
  ).join('');
  const tablaFilas = filas.map((f, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#f4f6fb'}">
      ${f.map(v => `<td style="padding:6px 10px;font-size:12px;border-bottom:1px solid #eee">${v}</td>`).join('')}
    </tr>`
  ).join('');

  const resumenHtml = `
    <span style="margin-right:16px">🌾 <strong>${totales.cantidad}</strong> trabajo${totales.cantidad !== 1 ? 's' : ''}</span>
    <span style="margin-right:16px">📐 <strong>${fmtNum(totales.has, 2)}</strong> ha</span>
    ${totales.costoTotal ? `<span>💲 <strong>$${fmtNum(totales.costoTotal)}</strong></span>` : ''}
  `;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Trabajos agrícolas</title>
  <style>
    @media print { @page { margin: 15mm 12mm; } .no-print { display:none; } }
    body { font-family: Arial, sans-serif; color: #222; margin: 0; padding: 20px; }
    h1 { font-size: 20px; color: #2E5496; margin: 0 0 4px; }
    .subtitulo { font-size: 13px; color: #666; margin-bottom: 4px; }
    .resumen { background: #f0f4fb; border-left: 4px solid #2E5496; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #2E5496; color: #fff; }
    tr:hover { background: #eef2fb; }
  </style>
  </head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>🌾 Trabajos agrícolas</h1>
      <div class="subtitulo">Reporte · ${hoy}</div>
      <div class="subtitulo" style="color:#2E5496">${filtroDesc}</div>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:8px 18px;background:#2E5496;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimir / PDF</button>
  </div>
  <div class="resumen">
    <div style="font-weight:700;margin-bottom:6px">Resumen</div>
    <div>${resumenHtml}</div>
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
