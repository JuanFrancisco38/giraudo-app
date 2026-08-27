// Exportación genérica a Excel usando SheetJS
// Uso: exportarXlsx([{ nombre, filas }], 'nombre_archivo')
// donde filas = [[col1, col2, ...], [val1, val2, ...], ...]

function exportarXlsx(hojas, nombreArchivo) {
  if (typeof XLSX === 'undefined') {
    toast('La librería de exportación no está disponible', 'var(--rojo)');
    return;
  }
  const wb = XLSX.utils.book_new();
  hojas.forEach(({ nombre, filas }) => {
    const ws = XLSX.utils.aoa_to_sheet(filas);
    // Ancho automático por columna
    const anchos = filas[0]?.map((_, ci) =>
      ({ wch: Math.min(50, Math.max(10, ...filas.map(f => String(f[ci] ?? '').length))) })
    ) || [];
    ws['!cols'] = anchos;
    XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));
  });
  XLSX.writeFile(wb, nombreArchivo + '.xlsx');
}

function slugFiltro(...partes) {
  return partes.filter(Boolean).map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_')).join('_');
}

// ── FACTURAS RECIBIDAS (boletas) ─────────────────────────────────────────────
function exportarBoletas() {
  const fFirma   = document.getElementById('bol-filtro-firma')?.value  || '';
  const fCamp    = document.getElementById('bol-filtro-campania')?.value || '';
  const fRubro   = document.getElementById('bol-filtro-rubro')?.value  || '';
  const fProv    = document.getElementById('bol-filtro-prov')?.value   || '';
  const fPago    = document.getElementById('bol-filtro-pago')?.value   || '';
  const fBusca   = (document.getElementById('bol-filtro-busca')?.value || '').trim().toLowerCase();
  const fFecha   = (document.getElementById('bol-filtro-fecha')?.value || '').trim().toLowerCase();
  const fNum     = (document.getElementById('bol-filtro-num')?.value || '').trim().toLowerCase();

  const rows = boletasTodas.filter(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(_) {}
    if (fFirma  && r.firma       !== fFirma)  return false;
    if (fCamp   && e.campania    !== fCamp)   return false;
    if (fRubro  && r.categoria   !== fRubro)  return false;
    if (fProv   && r.proveedor   !== fProv)   return false;
    if (fPago   && !!r.fecha_pago !== (fPago === 'Paga')) return false;
    if (fNum    && !(r.numero || '').toLowerCase().includes(fNum))   return false;
    if (fFecha  && !(r.fecha || '').includes(fFecha))  return false;
    if (fBusca  && !`${r.proveedor||''} ${r.numero||''} ${r.categoria||''}`.toLowerCase().includes(fBusca)) return false;
    if (bolRubroFiltro && r.categoria !== bolRubroFiltro) return false;
    return true;
  });

  const cabecera = ['Fecha','N° Factura','Proveedor','Categoría','Campaña','Firma','Total $','Fecha Pago'];
  const filas = rows.map(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(_) {}
    return [r.fecha, r.numero, r.proveedor, r.categoria, e.campania, r.firma, r.monto_total, r.fecha_pago || ''];
  });

  const nombre = slugFiltro('facturas_recibidas', fProv, fRubro, fCamp, fFirma) || 'facturas_recibidas';
  exportarXlsx([{ nombre: 'Facturas Recibidas', filas: [cabecera, ...filas] }], nombre);
}

// ── FACTURAS EMITIDAS ────────────────────────────────────────────────────────
function exportarFacturasEmitidas() {
  const fFirma = document.getElementById('fe-filtro-firma')?.value || '';
  const fCamp  = document.getElementById('fe-filtro-campania')?.value || '';
  const fBusca = (document.getElementById('fe-filtro-busca')?.value || '').trim().toLowerCase();

  const rows = femitTodas.filter(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(_) {}
    if (fFirma && r.firma !== fFirma) return false;
    if (fCamp  && e.campania !== fCamp) return false;
    if (fBusca) {
      const texto = `${r.proveedor||''} ${r.numero||''} ${e.campania||''} ${r.firma||''} ${e.cliente||''}`.toLowerCase();
      if (!texto.includes(fBusca)) return false;
    }
    return true;
  });

  const cabecera = ['Fecha','N° Factura','Cliente','Firma','Campaña','Total $'];
  const filas = rows.map(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(_) {}
    return [r.fecha, r.numero, e.cliente || r.proveedor, r.firma, e.campania, r.monto_total];
  });

  const nombre = slugFiltro('facturas_emitidas', fCamp, fFirma) || 'facturas_emitidas';
  exportarXlsx([{ nombre: 'Facturas Emitidas', filas: [cabecera, ...filas] }], nombre);
}

// ── LIQUIDACIONES DE GRANOS ──────────────────────────────────────────────────
function exportarLiqGranos() {
  const fBusca = (document.getElementById('liqgr-filtro-busca')?.value || '').trim().toLowerCase();
  const fFirma = document.getElementById('liqgr-f-firma')?.value || '';
  const fRazon = document.getElementById('liqgr-f-razon')?.value || '';
  const fCamp  = document.getElementById('liqgr-f-camp')?.value || '';

  const rows = liqgrTodas.filter(l => {
    if (fFirma && l.firma        !== fFirma) return false;
    if (fRazon && l.razon_social !== fRazon) return false;
    if (fCamp  && l.campania     !== fCamp)  return false;
    if (fBusca && !`${l.razon_social||''} ${l.numero||''} ${l.grano||''}`.toLowerCase().includes(fBusca)) return false;
    return true;
  });

  const cabecera = ['Fecha','N° Liquidación','Razón Social','Grano','Toneladas','Precio','Total $','Campaña','Firma'];
  const filas = rows.map(l => [l.fecha, l.numero, l.razon_social, l.grano, l.toneladas, l.precio, l.total_pesos, l.campania, l.firma]);

  const nombre = slugFiltro('liq_granos', fRazon, fGrano, fCamp, fFirma) || 'liquidaciones_granos';
  exportarXlsx([{ nombre: 'Liquidaciones Granos', filas: [cabecera, ...filas] }], nombre);
}

// ── CERTIFICACIONES DE GRANOS ────────────────────────────────────────────────
function exportarCertificaciones() {
  const fBusca = (document.getElementById('cert-filtro-busca')?.value || '').trim().toLowerCase();
  const rows = fBusca
    ? certTodas.filter(row => { const c = parseCert(row); return `${c.depositario||''} ${c.coe||''} ${c.grano||''}`.toLowerCase().includes(fBusca); })
    : certTodas;

  const cabecera = ['Fecha','COE','Depositario','Grano','Cantidad','Calidad','Estado'];
  const filas = rows.map(r => {
    const c = parseCert(r);
    return [r.fecha, c.coe, c.depositario, c.grano, c.cantidad, c.calidad, r.estado || ''];
  });

  const nombre = slugFiltro('certificaciones', fBusca) || 'certificaciones_granos';
  exportarXlsx([{ nombre: 'Certificaciones', filas: [cabecera, ...filas] }], nombre);
}

// ── LIQUIDACIONES DE HACIENDA ────────────────────────────────────────────────
function exportarLiqHacienda() {
  const fAnio  = document.getElementById('lh-filtro-anio')?.value || '';
  const fBusca = (document.getElementById('liqhac-filtro-busca')?.value || '').trim().toLowerCase();
  const rows = (fAnio ? liqhacTodas.filter(l => (l.fecha||'').startsWith(fAnio)) : liqhacTodas)
    .filter(l => !fBusca || `${l.consignatario||''} ${l.numero||''}`.toLowerCase().includes(fBusca));

  const cabecera = ['Fecha','N° Liquidación','Consignatario','Cabezas','Kilos','Precio/kg','Total $'];
  const filas = rows.map(l => [l.fecha, l.numero, l.consignatario, l.cabezas, l.kilos, l.precio_kg, l.total_pesos]);

  const nombre = slugFiltro('liq_hacienda', fAnio) || 'liquidaciones_hacienda';
  exportarXlsx([{ nombre: 'Liq. Hacienda', filas: [cabecera, ...filas] }], nombre);
}

// ── CHEQUES ──────────────────────────────────────────────────────────────────
function exportarCheques(tipo) {
  const cfg = CHEQUE_CFG[tipo];
  const st  = chequeState[tipo];
  const fBusca  = (document.getElementById(`${cfg.pref}-filtro-busca`)?.value || '').trim().toLowerCase();
  const fEstado = document.getElementById(`${cfg.pref}-filtro-estado`)?.value || '';

  const estadoLabel = tipo === 'recibido'
    ? { cartera: 'En cartera', efectivizado: 'Cobrado', rechazado: 'Rechazado', endosado: 'Endosado' }
    : { cartera: 'En cartera', efectivizado: 'Pagado',  rechazado: 'Rechazado' };

  const rows = st.todas.filter(c => {
    if (fEstado && c.estado !== fEstado) return false;
    if (st.mesFiltro && (c.fecha_cobro || '').slice(0, 7) !== st.mesFiltro) return false;
    if (fBusca && !`${c.contraparte||''} ${c.numero||''} ${c.detalle||''} ${c.destino||''}`.toLowerCase().includes(fBusca)) return false;
    return true;
  });

  const cabecera = tipo === 'recibido'
    ? ['Fecha Emisión','Librador','N° Cheque','Banco','Vto.','Monto $','Estado','Fecha Cobro/Endoso','Destino','Rubro']
    : ['Fecha Emisión','Beneficiario','N° Cheque','Banco','Vto.','Monto $','Estado','Detalle'];

  const filas = rows.map(c => tipo === 'recibido'
    ? [c.fecha_emision, c.contraparte, c.numero, c.banco, c.fecha_cobro, c.monto, estadoLabel[c.estado]||c.estado, c.fecha_endoso, c.destino, c.rubro_destino]
    : [c.fecha_emision, c.contraparte, c.numero, c.banco, c.fecha_cobro, c.monto, estadoLabel[c.estado]||c.estado, c.detalle]
  );

  const prefNombre = tipo === 'recibido' ? 'cheques_recibidos' : 'cheques_emitidos';
  const nombre = slugFiltro(prefNombre, fEstado, st.mesFiltro) || prefNombre;
  exportarXlsx([{ nombre: tipo === 'recibido' ? 'Cheques Recibidos' : 'Cheques Emitidos', filas: [cabecera, ...filas] }], nombre);
}

// ── TRABAJOS (2 hojas) ───────────────────────────────────────────────────────
function exportarTrabajos() {
  const fBusca = (document.getElementById('trab-filtro-busca')?.value || '').trim().toLowerCase();
  const fTipo  = normTipoTrab(document.getElementById('trab-filtro-tipo')?.value || '');

  const rows = trabajosTodos.filter(t => {
    if (fTipo && normTipoTrab(t.tipo_labor) !== fTipo) return false;
    const lote = t.lotes?.lote || '';
    const cultivo = t.cultivo || '';
    const cont = t.trabajo_contratista?.[0]?.partes?.nombre || 'Propio';
    if (fBusca && !`${lote} ${cultivo} ${cont}`.toLowerCase().includes(fBusca)) return false;
    return true;
  });

  const cabTrab = ['ID','Fecha','Tipo Labor','Establecimiento','Lote','Hectáreas','Cultivo','Cantidad Rollos','Rendimiento (kg)','Modalidad','Máquina','Operario','Costo Total'];
  const filasTrab = rows.map(t => {
    const maq  = t.trabajo_maquinaria?.[0];
    const cont = t.trabajo_contratista?.[0];
    const costoIns  = (t.trabajo_insumos || []).reduce((s, i) => s + (i.costo_total || 0), 0);
    const costoMaq  = maq?.costo || 0;
    const costoCont = cont?.costo || 0;
    return [
      t.id, t.fecha, t.tipo_labor, t.lotes?.campo || '', t.lotes?.lote || '',
      t.hectareas, t.cultivo, t.cantidad_rollos || '', t.rendimiento || '',
      cont ? `Contratista (${cont.partes?.nombre || ''})` : 'Propio',
      maq?.maquinaria?.nombre || '', maq?.empleados?.nombre || '',
      costoIns + costoMaq + costoCont || ''
    ];
  });

  // Hoja 2: insumos de trabajos siembra/pulverizacion/fertilizacion
  const tiposConInsumos = new Set(['siembra','pulverizacion','fertilizacion']);
  const cabIns = ['Trabajo ID','Fecha','Establecimiento','Lote','Tipo Labor','Insumo','Cantidad','Costo Total'];
  const filasIns = rows
    .filter(t => tiposConInsumos.has(t.tipo_labor) && t.trabajo_insumos?.length)
    .flatMap(t => (t.trabajo_insumos || []).map(i => [
      t.id, t.fecha, t.lotes?.campo || '', t.lotes?.lote || '', t.tipo_labor,
      i.insumo, i.cantidad, i.costo_total
    ]));

  const nombre = slugFiltro('trabajos', fTipo) || 'trabajos';
  exportarXlsx([
    { nombre: 'Trabajos',  filas: [cabTrab, ...filasTrab] },
    { nombre: 'Insumos',   filas: [cabIns,  ...filasIns]  }
  ], nombre);
}
