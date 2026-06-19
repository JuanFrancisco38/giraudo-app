async function procesarFacturaEmitida(input) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('fe-doc-status');
  status.textContent = `📄 Leyendo ${file.name}...`;
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable agropecuario argentino. Analizá esta factura EMITIDA (de venta) del Grupo Giraudo y extraé los datos. La firma emisora es Giraudo SH (CUIT 30-71599118-3) o Francisco J. Giraudo (CUIT 20-16226904-7). Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"firma":"Giraudo SH|Francisco J. Giraudo","fecha":"DD/MM/YYYY","numero":"string (N° comprobante)","cliente":"string (a quién se le factura)","cuit_cliente":"string","concepto":"Venta de granos|Venta de hacienda|Servicios|Arrendamiento|Otro","descripcion":"string","moneda":"ARS|USD","subtotal":0,"iva":0,"total":0}
Detectá la moneda: si los importes están en dólares (U$D, USD, US$) poné "USD", si están en pesos poné "ARS". Los montos en números sin símbolos ni puntos de miles. Si un dato no está, poné 0 o "".`,
      'Extraé los datos de esta factura emitida.');

    if (datos.firma) document.getElementById('fe-firma').value = datos.firma;
    if (datos.fecha) document.getElementById('fe-fecha').value = parseFechaIA(datos.fecha);
    if (datos.numero) document.getElementById('fe-num').value = datos.numero;
    if (datos.cliente) document.getElementById('fe-cliente').value = datos.cliente;
    if (datos.cuit_cliente) document.getElementById('fe-cuit').value = datos.cuit_cliente;
    if (datos.concepto) document.getElementById('fe-cat').value = datos.concepto;
    if (datos.moneda) document.getElementById('fe-moneda').value = datos.moneda;
    if (datos.descripcion) document.getElementById('fe-desc').value = datos.descripcion;
    if (datos.subtotal) document.getElementById('fe-sub').value = datos.subtotal;
    if (datos.iva) document.getElementById('fe-iva').value = datos.iva;
    if (datos.total) document.getElementById('fe-total').value = datos.total;

    status.textContent = `✅ ${file.name} leída — revisá los campos y guardá`;
    toast('✅ Documento leído — revisá y guardá');
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

async function guardarFacturaEmitida() {
  const total = parseFloat(document.getElementById('fe-total').value) || 0;
  const fecha = document.getElementById('fe-fecha').value;
  if (!fecha || !total) { toast('Completá al menos fecha y total', 'var(--tierra)'); return; }

  const numero = document.getElementById('fe-num').value;
  const data = {
    fecha,
    proveedor: document.getElementById('fe-cliente').value,
    concepto: document.getElementById('fe-desc').value,
    campo: document.getElementById('fe-campo').value,
    monto: total,
    categoria: document.getElementById('fe-cat').value,
    observaciones: JSON.stringify({
      tipo_factura: 'emitida',
      firma: document.getElementById('fe-firma').value,
      cuit_cliente: document.getElementById('fe-cuit').value,
      numero_comprobante: numero,
      moneda: document.getElementById('fe-moneda').value,
      subtotal: parseFloat(document.getElementById('fe-sub').value) || 0,
      iva: parseFloat(document.getElementById('fe-iva').value) || 0
    })
  };

  if (numero) {
    const todas = await sb('GET', 'boletas', '', '?order=fecha.desc');
    const dup = (todas || []).some(b => {
      try { const e = JSON.parse(b.observaciones || '{}'); return e.tipo_factura === 'emitida' && e.numero_comprobante === numero; } catch(err) { return false; }
    });
    if (dup && !confirm(`⚠️ Ya existe una factura emitida con el N° "${numero}". ¿Querés guardarla igual?`)) {
      toast('Guardado cancelado — posible duplicado', 'var(--tierra)');
      return;
    }
  }
  const r = await sb('POST', 'boletas', data);
  if (r) {
    toast('✅ Factura emitida registrada');
    toggleForm('form-femit');
    document.getElementById('fe-doc-status').textContent = '';
    document.getElementById('fe-archivo').value = '';
    cargarFacturasEmitidas();
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

async function cargarFacturasEmitidas() {
  const rows = await sb('GET', 'boletas', '', '?order=fecha.desc');
  const tbody = document.getElementById('tabla-femit');
  if (!tbody) return;
  const emitidas = (rows || []).filter(r => {
    try { return JSON.parse(r.observaciones || '{}').tipo_factura === 'emitida'; } catch(e) { return false; }
  });

  if (!emitidas.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="icon">🧾</div><h3>Sin facturas emitidas</h3><p>Subí un PDF o foto de la factura</p></div></td></tr>';
    document.getElementById('fe-total-facturado').textContent = fmtMonto(0, 'ARS');
    document.getElementById('fe-total-iva').textContent = fmtMonto(0, 'ARS');
    document.getElementById('fe-cant').textContent = '0 facturas';
    return;
  }

  const tot = { ARS: { fact: 0, iva: 0 }, USD: { fact: 0, iva: 0 } };
  emitidas.forEach(r => {
    const e = JSON.parse(r.observaciones || '{}');
    const m = e.moneda === 'USD' ? 'USD' : 'ARS';
    tot[m].fact += r.monto || 0;
    tot[m].iva += e.iva || 0;
  });
  const linea = campo => {
    const partes = [];
    if (tot.ARS[campo]) partes.push(fmtMonto(tot.ARS[campo], 'ARS'));
    if (tot.USD[campo]) partes.push(fmtMonto(tot.USD[campo], 'USD'));
    return partes.length ? partes.join(' · ') : '$ 0';
  };
  document.getElementById('fe-total-facturado').textContent = linea('fact');
  document.getElementById('fe-total-iva').textContent = linea('iva');
  document.getElementById('fe-cant').textContent = emitidas.length + ' factura' + (emitidas.length !== 1 ? 's' : '');

  tbody.innerHTML = emitidas.map(r => {
    const e = JSON.parse(r.observaciones || '{}');
    const mon = e.moneda || 'ARS';
    return `<tr>
      <td>${fmtFecha(r.fecha)}</td>
      <td><span class="badge badge-bordo" style="font-size:10px">${e.firma || '—'}</span></td>
      <td><strong>${r.proveedor || '—'}</strong></td>
      <td style="font-size:11px">${e.numero_comprobante || '—'}</td>
      <td><span class="badge badge-gray">${r.categoria || '—'}</span></td>
      <td>${fmtMonto(e.subtotal, mon)}</td>
      <td>${fmtMonto(e.iva, mon)}</td>
      <td><strong>${fmtMonto(r.monto, mon)}</strong></td>
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarFacturaEmitida('${r.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

async function borrarFacturaEmitida(id) {
  if (!confirm('¿Borrar esta factura emitida?')) return;
  await sb('DELETE', 'boletas', '', `?id=eq.${id}`);
  toast('🗑️ Factura borrada');
  cargarFacturasEmitidas();
}
