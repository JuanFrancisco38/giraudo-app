const RUBROS_BOLETA = ['Agroquímicos','Semillas','Arrendamientos','Combustibles y Lubricantes','Repuestos','Insumos Varios','Servicios Profesionales','Servicios Rurales','Servicios Energéticos','Ponedoras','Insumos Veterinarios','Inmuebles','Reparaciones'];

function calcularIvaBoleta() {
  const sub = parseFloat(document.getElementById('bol-sub').value) || 0;
  const pct = parseFloat(document.getElementById('bol-pctiva').value) || 0;
  if (sub) {
    const iva = Math.round(sub * pct / 100 * 100) / 100;
    document.getElementById('bol-iva').value = iva;
    document.getElementById('bol-total').value = Math.round((sub + iva) * 100) / 100;
  }
}

async function procesarBoleta(input) {
  const file = input.files[0];
  if (!file) return;
  const preview = document.getElementById('bol-preview');
  const status = document.getElementById('bol-status');
  const result = document.getElementById('bol-result');
  preview.style.display = 'block';
  preview.textContent = `📄 Procesando: ${file.name}...`;
  status.textContent = 'La IA está leyendo la boleta...';
  result.style.display = 'none';

  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable del Grupo Giraudo, Argentina. Analizá la boleta/factura recibida y extraé los datos.
Identificá la firma receptora (a quién le facturaron): si el destinatario tiene CUIT 20-16226904-7 o dice "Francisco J. Giraudo" (sin Juan) es "Francisco J. Giraudo". Si tiene CUIT 30-71599118-3 o dice "Giraudo Francisco J. y Giraudo Juan F. SH" es "Giraudo SH".
Clasificá el RUBRO eligiendo EXACTAMENTE una de estas opciones: ${RUBROS_BOLETA.join(', ')}.
En "descripcion_a" poné el concepto / detalle del producto identificándolo por producto y concentración (ej: en agroquímicos "Glifosato 75%", "Glifosato 62%").
En "cantidad" la cantidad comprada en números y en "unidad" elegí entre kg, lts, tt, unidad.
En "costo_unitario" el precio por unidad y en "moneda_costo" si ese costo está en USD o ARS (los agroquímicos suelen estar en USD).
Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"firma":"Francisco J. Giraudo o Giraudo SH","fecha":"DD/MM/YYYY","vencimiento":"DD/MM/YYYY","numero_factura":"string","razon_social":"string","cuit_proveedor":"string","rubro":"uno de los rubros listados","descripcion_a":"string","cantidad":0,"unidad":"kg|lts|tt|unidad","costo_unitario":0,"moneda_costo":"ARS|USD","tipo_cambio":0,"subtotal":0,"pct_iva":21,"iva":0,"total":0}
El subtotal, iva y total en pesos. pct_iva: 21, 10.5 o 0 (exento, ej. arrendamientos). tipo_cambio: si la factura lo aclara, sino 0. Montos en números sin símbolos ni puntos de miles. Si un dato no está, poné 0 o "".`,
      'Extraé todos los datos de esta boleta/factura recibida.');

    const set = (id, val) => { if (val !== undefined && val !== null && val !== '' && val !== 0) document.getElementById(id).value = val; };
    if (datos.firma)   document.getElementById('bol-firma').value = datos.firma;
    if (datos.fecha)   document.getElementById('bol-fecha').value = parseFechaIA(datos.fecha);
    if (datos.vencimiento) document.getElementById('bol-vto').value = parseFechaIA(datos.vencimiento);
    set('bol-num', datos.numero_factura);
    set('bol-prov', datos.razon_social);
    set('bol-cuit', datos.cuit_proveedor);
    if (datos.rubro && RUBROS_BOLETA.includes(datos.rubro)) document.getElementById('bol-cat').value = datos.rubro;
    set('bol-desc', datos.descripcion_a);
    set('bol-cant', datos.cantidad);
    if (datos.unidad) document.getElementById('bol-unidad').value = datos.unidad;
    set('bol-costou', datos.costo_unitario);
    if (datos.moneda_costo) document.getElementById('bol-moneda-cu').value = datos.moneda_costo;
    set('bol-tc', datos.tipo_cambio);
    set('bol-sub', datos.subtotal);
    if (datos.pct_iva !== undefined) document.getElementById('bol-pctiva').value = [21,10.5,0].includes(Number(datos.pct_iva)) ? datos.pct_iva : 21;
    set('bol-iva', datos.iva);
    set('bol-total', datos.total);

    const mc = datos.moneda_costo || 'ARS';
    preview.textContent = `✅ ${file.name} — leída correctamente`;
    result.style.display = 'block';
    result.innerHTML = `<strong>Datos extraídos:</strong><br>
      🏢 Firma: <strong>${datos.firma || '—'}</strong> | 📅 ${fmtFecha(parseFechaIA(datos.fecha))} | Vto: ${fmtFecha(parseFechaIA(datos.vencimiento))}<br>
      🏪 ${datos.razon_social || '—'} (${datos.cuit_proveedor || '—'})<br>
      🏷️ Rubro: <strong>${datos.rubro || '—'}</strong><br>
      📋 ${datos.descripcion_a || '—'} — ${fmtNum(datos.cantidad)} ${datos.unidad || ''} × ${fmtMonto(datos.costo_unitario, mc)}<br>
      💰 Subtotal: ${fmtMonto(datos.subtotal, 'ARS')} | IVA ${datos.pct_iva || 0}%: ${fmtMonto(datos.iva, 'ARS')} | <strong>Total: ${fmtMonto(datos.total, 'ARS')}</strong><br>
      <span style="color:var(--texto-suave);font-size:12px">Completá Destino, Campaña y Estado de pago, revisá y guardá.</span>`;
    status.textContent = '';
    toast('✅ Boleta leída — revisá y guardá');
  } catch(e) {
    preview.textContent = '❌ ' + e.message;
    status.textContent = '';
    console.error(e);
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

async function guardarBoleta() {
  const fecha = document.getElementById('bol-fecha').value;
  const total = parseFloat(document.getElementById('bol-total').value) || 0;
  if (!fecha || !total) { toast('Completá al menos fecha y total', 'var(--tierra)'); return; }

  const data = {
    fecha,
    proveedor: document.getElementById('bol-prov').value,
    concepto: document.getElementById('bol-desc').value,
    campo: document.getElementById('bol-campo').value,
    monto: total,
    categoria: document.getElementById('bol-cat').value,
    observaciones: JSON.stringify({
      tipo_factura: 'recibida',
      firma: document.getElementById('bol-firma').value,
      vencimiento: document.getElementById('bol-vto').value,
      cuit_proveedor: document.getElementById('bol-cuit').value,
      numero_comprobante: document.getElementById('bol-num').value,
      cantidad: parseFloat(document.getElementById('bol-cant').value) || 0,
      unidad: document.getElementById('bol-unidad').value,
      costo_unitario: parseFloat(document.getElementById('bol-costou').value) || 0,
      moneda_costo: document.getElementById('bol-moneda-cu').value,
      destino: document.getElementById('bol-destino').value,
      tipo_cambio: parseFloat(document.getElementById('bol-tc').value) || 0,
      subtotal: parseFloat(document.getElementById('bol-sub').value) || 0,
      pct_iva: parseFloat(document.getElementById('bol-pctiva').value) || 0,
      iva: parseFloat(document.getElementById('bol-iva').value) || 0,
      campania: document.getElementById('bol-campania').value,
      pago: document.getElementById('bol-pago').value
    })
  };

  const numero = document.getElementById('bol-num').value;
  if (numero) {
    const todas = await sb('GET', 'boletas', '', '?order=fecha.desc');
    const dup = (todas || []).some(b => {
      try { const e = JSON.parse(b.observaciones || '{}'); return (!e.tipo_factura || e.tipo_factura === 'recibida') && e.numero_comprobante === numero; } catch(err) { return false; }
    });
    if (dup && !confirm(`⚠️ Ya existe una factura recibida con el N° "${numero}". ¿Querés guardarla igual?`)) {
      toast('Guardado cancelado — posible duplicado', 'var(--tierra)');
      return;
    }
  }
  const r = await sb('POST', 'boletas', data);
  if (r) {
    toast('✅ Boleta registrada');
    toggleForm('form-boleta');
    document.getElementById('bol-result').style.display = 'none';
    document.getElementById('bol-preview').style.display = 'none';
    document.getElementById('bol-archivo').value = '';
    ['bol-num','bol-prov','bol-cuit','bol-desc','bol-cant','bol-costou','bol-destino','bol-tc','bol-sub','bol-iva','bol-total','bol-campania'].forEach(id => document.getElementById(id).value = '');
    cargarBoletas();
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

async function cargarBoletas() {
  const todas = await sb('GET', 'boletas', '', '?order=fecha.desc');
  const rows = (todas || []).filter(r => {
    try { const t = JSON.parse(r.observaciones || '{}').tipo_factura; return !t || t === 'recibida'; } catch(e) { return true; }
  });
  const tbody = document.getElementById('tabla-boletas');
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="18"><div class="empty-state"><div class="icon">🧾</div><h3>Sin boletas cargadas</h3><p>Subí una foto o PDF de la boleta</p></div></td></tr>';
    document.getElementById('total-firma-fj').textContent = fmtMonto(0, 'ARS');
    document.getElementById('total-firma-sh').textContent = fmtMonto(0, 'ARS');
    document.getElementById('cant-firma-fj').textContent = '0 boletas';
    document.getElementById('cant-firma-sh').textContent = '0 boletas';
    return;
  }

  const acc = { FJ: { ARS: 0, USD: 0, cant: 0 }, SH: { ARS: 0, USD: 0, cant: 0 } };
  rows.forEach(r => {
    const extra = r.observaciones ? JSON.parse(r.observaciones) : {};
    const firma = extra.firma || '';
    const m = extra.moneda === 'USD' ? 'USD' : 'ARS';
    const k = firma === 'Francisco J. Giraudo' ? 'FJ' : (firma === 'Giraudo SH' ? 'SH' : null);
    if (k) { acc[k][m] += r.monto || 0; acc[k].cant++; }
  });
  const linea = k => {
    const partes = [];
    if (acc[k].ARS) partes.push(fmtMonto(acc[k].ARS, 'ARS'));
    if (acc[k].USD) partes.push(fmtMonto(acc[k].USD, 'USD'));
    return partes.length ? partes.join(' · ') : '$ 0';
  };
  document.getElementById('total-firma-fj').textContent = linea('FJ');
  document.getElementById('total-firma-sh').textContent = linea('SH');
  document.getElementById('cant-firma-fj').textContent = acc.FJ.cant + ' boleta' + (acc.FJ.cant !== 1 ? 's' : '');
  document.getElementById('cant-firma-sh').textContent = acc.SH.cant + ' boleta' + (acc.SH.cant !== 1 ? 's' : '');

  tbody.innerHTML = rows.map(r => {
    const e = r.observaciones ? JSON.parse(r.observaciones) : {};
    const mc = e.moneda_costo || 'ARS';
    const firmaCorta = e.firma === 'Francisco J. Giraudo' ? 'FJG' : (e.firma === 'Giraudo SH' ? 'SH' : (e.firma || '—'));
    const pctIva = (e.pct_iva === 0 || e.pct_iva === '0') ? 'Exento' : (fmtNum(e.pct_iva, (Number(e.pct_iva) % 1) ? 1 : 0) + '%');
    const pagoBadge = e.pago === 'Paga'
      ? '<span class="badge badge-green">Paga</span>'
      : '<span class="badge badge-tierra">Impaga</span>';
    const cant = e.cantidad ? `${fmtNum(e.cantidad)} ${e.unidad || ''}`.trim() : '—';
    return `<tr>
      <td>${fmtFecha(r.fecha)}</td>
      <td style="font-size:11px">${e.numero_comprobante || '—'}</td>
      <td><span class="badge badge-bordo" style="font-size:10px">${firmaCorta}</span></td>
      <td><strong>${r.proveedor || '—'}</strong></td>
      <td><span class="badge badge-gray">${r.categoria || '—'}</span></td>
      <td style="font-size:12px">${r.concepto || '—'}</td>
      <td style="font-size:12px">${cant}</td>
      <td style="font-size:12px">${e.costo_unitario ? fmtMonto(e.costo_unitario, mc) : '—'}</td>
      <td style="font-size:12px">${e.destino || '—'}</td>
      <td style="font-size:11px;color:var(--texto-suave)">${fmtFecha(e.vencimiento)}</td>
      <td style="font-size:11px">${e.tipo_cambio ? fmtNum(e.tipo_cambio, 2) : '—'}</td>
      <td>${fmtMonto(e.subtotal, 'ARS')}</td>
      <td style="font-size:11px">${pctIva}</td>
      <td>${fmtMonto(e.iva, 'ARS')}</td>
      <td><strong>${fmtMonto(r.monto, 'ARS')}</strong></td>
      <td style="font-size:11px">${e.campania || '—'}</td>
      <td>${pagoBadge}</td>
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarBoleta('${r.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

async function borrarBoleta(id) {
  if (!confirm('¿Borrar esta factura recibida?')) return;
  await sb('DELETE', 'boletas', '', `?id=eq.${id}`);
  toast('🗑️ Factura borrada');
  cargarBoletas();
}

function filtrarBoletas() {
  const filtro = document.getElementById('bol-filtro-firma').value.toLowerCase();
  document.querySelectorAll('#tabla-boletas tr').forEach(tr => {
    if (!filtro) { tr.style.display = ''; return; }
    tr.style.display = tr.textContent.toLowerCase().includes(filtro) ? '' : 'none';
  });
}
