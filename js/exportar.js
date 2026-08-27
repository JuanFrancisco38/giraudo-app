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
    if (fNum    && !(e.numero_comprobante || '').toLowerCase().includes(fNum)) return false;
    if (fFecha  && !(r.fecha || '').includes(fFecha))  return false;
    if (fBusca  && !`${r.proveedor||''} ${e.numero_comprobante||''} ${r.categoria||''}`.toLowerCase().includes(fBusca)) return false;
    if (bolRubroFiltro && r.categoria !== bolRubroFiltro) return false;
    return true;
  });

  const cabecera = ['Fecha','N° Comprobante','Firma','Proveedor','Rubro','Descripción','Cant.','Unidad','C. Unit.','Moneda C.U.','Destino','Vto.','T.C.','Subtotal','%IVA','IVA $','Total $','Campaña','Estado pago'];
  const filas = rows.map(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(_) {}
    const pctIva = (e.pct_iva === 0 || e.pct_iva === '0') ? 'Exento' : (e.pct_iva ? e.pct_iva + '%' : '');
    return [
      r.fecha,
      e.numero_comprobante || '',
      e.firma || r.firma || '',
      r.proveedor || '',
      r.categoria || '',
      r.concepto || '',
      e.cantidad || '',
      e.unidad || '',
      e.costo_unitario || '',
      e.moneda_costo || 'ARS',
      e.destino || '',
      e.vencimiento || '',
      e.tipo_cambio || '',
      e.subtotal || '',
      pctIva,
      e.iva || '',
      r.monto || '',
      e.campania || '',
      e.pago || ''
    ];
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
    if (fFirma && e.firma !== fFirma) return false;
    if (fCamp  && e.campania !== fCamp) return false;
    if (fBusca) {
      const texto = `${r.proveedor||''} ${e.numero_comprobante||''} ${e.campania||''} ${e.firma||''} ${r.concepto||''}`.toLowerCase();
      if (!texto.includes(fBusca)) return false;
    }
    return true;
  });

  const cabecera = ['Fecha','N° Comprobante','Firma','Cliente','Rubro','Descripción','Cant.','Unidad','C. Unit.','Moneda C.U.','Destino','Vto.','T.C.','Subtotal','%IVA','IVA $','Total $','Campaña','Estado cobro'];
  const filas = rows.map(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(_) {}
    const pctIva = (e.pct_iva === 0 || e.pct_iva === '0') ? 'Exento' : (e.pct_iva ? e.pct_iva + '%' : '');
    return [
      r.fecha,
      e.numero_comprobante || '',
      e.firma || r.firma || '',
      r.proveedor || '',
      r.categoria || '',
      r.concepto || '',
      e.cantidad || '',
      e.unidad || '',
      e.costo_unitario || '',
      e.moneda_costo || 'ARS',
      e.destino || '',
      e.vencimiento || '',
      e.tipo_cambio || '',
      e.subtotal || '',
      pctIva,
      e.iva || '',
      r.monto || '',
      e.campania || '',
      e.cobro || ''
    ];
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

  const cabecera = ['Firma','Razón Social','Fecha','Grano','N° Liquidación','Campaña','Kg','Precio TT','Subtotal','IVA','Op. c/IVA','Comisión c/IVA','Derecho Registro','Sellados Cba.','Flete Puerto c/IVA','Ganancias','IVA 5,8%','Total Ret. AFIP','Total Deducciones','IVA RG2300','Neto a Cobrar'];
  const filas = rows.map(l => [
    l.firma, l.razon_social, l.fecha, l.grano, l.numero, l.campania,
    l.kg, l.precio_tt, l.subtotal, l.importe_iva, l.operacion_civa,
    l.comision_civa, l.derecho_registro, l.sellados_cordoba, l.flete_puerto_civa,
    l.ganancias, l.iva_5_8, l.total_retencion_afip, l.total_deducciones,
    l.iva_rg2300, l.neto_cobrar
  ]);

  const nombre = slugFiltro('liq_granos', fRazon, fCamp, fFirma) || 'liquidaciones_granos';
  exportarXlsx([{ nombre: 'Liquidaciones Granos', filas: [cabecera, ...filas] }], nombre);
}

// ── CERTIFICACIONES DE GRANOS ────────────────────────────────────────────────
function exportarCertificaciones() {
  const fBusca = (document.getElementById('cert-filtro-busca')?.value || '').trim().toLowerCase();
  const rows = fBusca
    ? certTodas.filter(row => { const c = parseCert(row); return `${c.depositario||''} ${c.coe||''} ${c.grano||''}`.toLowerCase().includes(fBusca); })
    : certTodas;

  const cabecera = ['Fecha','COE','CTGS','Grano','Kg Bruto','Merma','Kg Neto','Depositario','Estado'];
  const filas = rows.map(row => {
    const c = parseCert(row);
    return [c.fecha || row.fecha, c.coe || '', c.ctgs || '', c.grano || '', c.kg_bruto || '', c.merma || '', c.kg_neto || '', c.depositario || '', row.estado || ''];
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

  const cabecera = ['Fecha','N° Liquidación','Consignatario','Cabezas','Categoría','Kg Totales','Kg/Animal','Precio $','Subtotal','Comisión','IVA','Ret. Ganancias','Total Neto'];
  const filas = rows.map(l => {
    const kgAnimal = l.cabezas && l.kg_totales ? l.kg_totales / l.cabezas : '';
    return [
      l.fecha, l.numero, l.consignatario, l.cabezas, l.categoria,
      l.kg_totales, kgAnimal ? Math.round(kgAnimal) : '', l.precio,
      l.subtotal, l.comision, l.iva, l.ret_ganancias, l.total_neto
    ];
  });

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
