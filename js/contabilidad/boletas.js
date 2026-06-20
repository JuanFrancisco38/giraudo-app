const RUBROS_BOLETA = ['Agroquímicos','Semillas','Arrendamientos','Combustibles y Lubricantes','Repuestos','Insumos Varios','Servicios Profesionales','Servicios Rurales','Servicios Energéticos','Ponedoras','Insumos Veterinarios','Inmuebles','Reparaciones'];

let bolItemSeq = 0;
let bolArchivoActual = null;

function abrirFormBoleta() {
  const form = document.getElementById('form-boleta');
  const abriendo = form.style.display === 'none' || !form.style.display;
  toggleForm('form-boleta');
  if (abriendo && !document.querySelector('#bol-items .bol-item')) agregarItemBoleta();
}

function rubroOptions(sel) {
  return RUBROS_BOLETA.map(r => `<option${r === sel ? ' selected' : ''}>${r}</option>`).join('');
}

function agregarItemBoleta(d = {}) {
  const i = ++bolItemSeq;
  const cont = document.getElementById('bol-items');
  const div = document.createElement('div');
  div.className = 'bol-item';
  div.id = `bol-item-${i}`;
  div.style.cssText = 'border:1px solid var(--gris-borde);border-radius:8px;padding:12px;margin-bottom:10px;background:var(--bordo-claro)';
  const unidades = ['','kg','lts','tt','unidad'];
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:12px;font-weight:600;color:var(--bordo)">Ítem</span>
      <button type="button" class="btn btn-secondary" style="padding:2px 8px;font-size:12px" onclick="document.getElementById('bol-item-${i}').remove()">✕ Quitar</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Rubro</label><select class="bi-rubro">${rubroOptions(d.rubro)}</select></div>
      <div class="form-group full"><label>Descripción A — Concepto / producto (con concentración)</label><input type="text" class="bi-desc" value="${(d.descripcion_a||'').replace(/"/g,'&quot;')}" placeholder="Ej: Glifosato 75%"></div>
      <div class="form-group"><label>Descripción B — Cantidad</label><input type="number" step="any" class="bi-cant" value="${d.cantidad||''}" placeholder="Ej: 200"></div>
      <div class="form-group"><label>Unidad</label><select class="bi-unidad">${unidades.map(u => `<option value="${u}"${u===(d.unidad||'')?' selected':''}>${u||'—'}</option>`).join('')}</select></div>
      <div class="form-group"><label>Descripción C — Costo unitario</label><input type="number" step="any" class="bi-costou" value="${d.costo_unitario||''}" placeholder="Ej: 8.50"></div>
      <div class="form-group"><label>Moneda costo unit.</label><select class="bi-mcu"><option value="ARS"${(d.moneda_costo||'ARS')==='ARS'?' selected':''}>Pesos ($)</option><option value="USD"${d.moneda_costo==='USD'?' selected':''}>Dólares (U$D)</option></select></div>
      <div class="form-group full"><label>Descripción D — Destino (cultivo / lote / actividad)</label><input type="text" class="bi-destino" value="${(d.destino||'').replace(/"/g,'&quot;')}" placeholder="Lo completás vos"></div>
      <div class="form-group"><label>Subtotal (en pesos)</label><input type="number" step="any" class="bi-sub" value="${d.subtotal||''}" oninput="calcIvaItem(this)"></div>
      <div class="form-group"><label>% IVA</label><select class="bi-pctiva" onchange="calcIvaItem(this)">
        <option value="21"${Number(d.pct_iva)===21||d.pct_iva==null?' selected':''}>21%</option>
        <option value="10.5"${Number(d.pct_iva)===10.5?' selected':''}>10,5%</option>
        <option value="0"${Number(d.pct_iva)===0?' selected':''}>Exento</option>
      </select></div>
      <div class="form-group"><label>IVA</label><input type="number" step="any" class="bi-iva" value="${d.iva||''}"></div>
      <div class="form-group"><label>Total</label><input type="number" step="any" class="bi-total" value="${d.total||''}" style="font-weight:600"></div>
    </div>`;
  cont.appendChild(div);
  return div;
}

function calcIvaItem(el) {
  const item = el.closest('.bol-item');
  const sub = parseFloat(item.querySelector('.bi-sub').value) || 0;
  const pct = parseFloat(item.querySelector('.bi-pctiva').value) || 0;
  if (sub) {
    const iva = Math.round(sub * pct / 100 * 100) / 100;
    item.querySelector('.bi-iva').value = iva;
    item.querySelector('.bi-total').value = Math.round((sub + iva) * 100) / 100;
  }
}

function leerItemsBoleta() {
  return [...document.querySelectorAll('#bol-items .bol-item')].map(item => ({
    rubro: item.querySelector('.bi-rubro').value,
    descripcion_a: item.querySelector('.bi-desc').value,
    cantidad: parseFloat(item.querySelector('.bi-cant').value) || 0,
    unidad: item.querySelector('.bi-unidad').value,
    costo_unitario: parseFloat(item.querySelector('.bi-costou').value) || 0,
    moneda_costo: item.querySelector('.bi-mcu').value,
    destino: item.querySelector('.bi-destino').value,
    subtotal: parseFloat(item.querySelector('.bi-sub').value) || 0,
    pct_iva: parseFloat(item.querySelector('.bi-pctiva').value) || 0,
    iva: parseFloat(item.querySelector('.bi-iva').value) || 0,
    total: parseFloat(item.querySelector('.bi-total').value) || 0
  }));
}

async function procesarBoleta(input) {
  const file = input.files[0];
  if (!file) return;
  bolArchivoActual = file;
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
MUY IMPORTANTE: la factura puede tener VARIOS productos/renglones. Tenés que devolver UN ítem por cada producto/línea de la factura en el array "items". NO los juntes en uno solo.
Para cada ítem:
- "rubro": clasificá eligiendo EXACTAMENTE una de: ${RUBROS_BOLETA.join(', ')}.
- "descripcion_a": el detalle del producto identificándolo por producto y concentración (ej: "Glifosato 75%", "Doracur x500ml").
- "cantidad" y "unidad" (kg, lts, tt, unidad).
- "costo_unitario" y "moneda_costo" (ARS o USD; los agroquímicos suelen estar en USD).
- "subtotal", "pct_iva" (21, 10.5 o 0 si exento como arrendamientos), "iva", "total" de ESE renglón, todos en pesos.
Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"firma":"Francisco J. Giraudo o Giraudo SH","fecha":"DD/MM/YYYY","vencimiento":"DD/MM/YYYY","numero_factura":"string","razon_social":"string","cuit_proveedor":"string","tipo_cambio":0,"items":[{"rubro":"","descripcion_a":"","cantidad":0,"unidad":"kg|lts|tt|unidad","costo_unitario":0,"moneda_costo":"ARS|USD","subtotal":0,"pct_iva":21,"iva":0,"total":0}]}
Montos en números sin símbolos ni puntos de miles. Si un dato no está, poné 0 o "".`,
      'Extraé todos los datos de esta boleta/factura recibida, un ítem por cada producto.');

    if (datos.firma)   document.getElementById('bol-firma').value = datos.firma;
    if (datos.fecha)   document.getElementById('bol-fecha').value = parseFechaIA(datos.fecha);
    if (datos.vencimiento) document.getElementById('bol-vto').value = parseFechaIA(datos.vencimiento);
    if (datos.numero_factura) document.getElementById('bol-num').value = datos.numero_factura;
    if (datos.razon_social) document.getElementById('bol-prov').value = datos.razon_social;
    if (datos.cuit_proveedor) document.getElementById('bol-cuit').value = datos.cuit_proveedor;
    if (datos.tipo_cambio) document.getElementById('bol-tc').value = datos.tipo_cambio;

    document.getElementById('bol-items').innerHTML = '';
    bolItemSeq = 0;
    const items = Array.isArray(datos.items) && datos.items.length ? datos.items : [{}];
    items.forEach(it => agregarItemBoleta(it));

    const totGlobal = items.reduce((a, it) => a + (Number(it.total) || 0), 0);
    preview.textContent = `✅ ${file.name} — leída correctamente`;
    result.style.display = 'block';
    result.innerHTML = `<strong>Datos extraídos:</strong><br>
      🏢 ${datos.firma || '—'} | 📅 ${fmtFecha(parseFechaIA(datos.fecha))} | N° ${datos.numero_factura || '—'}<br>
      🏪 ${datos.razon_social || '—'} (${datos.cuit_proveedor || '—'})<br>
      🛒 <strong>${items.length}</strong> ítem(s) detectado(s) | Total factura: <strong>${fmtMonto(totGlobal, 'ARS')}</strong><br>
      <span style="color:var(--texto-suave);font-size:12px">Revisá cada renglón, completá los Destinos y la Campaña, y guardá.</span>`;
    status.textContent = '';
    toast(`✅ Boleta leída — ${items.length} ítem(s)`);
  } catch(e) {
    preview.textContent = '❌ ' + e.message;
    status.textContent = '';
    console.error(e);
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

async function guardarBoleta() {
  const fecha = document.getElementById('bol-fecha').value;
  const items = leerItemsBoleta();
  if (!fecha) { toast('Completá la fecha', 'var(--tierra)'); return; }
  if (!items.length || !items.some(it => it.total || it.subtotal)) { toast('Agregá al menos un ítem con monto', 'var(--tierra)'); return; }

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

  const cab = {
    fecha,
    firma: document.getElementById('bol-firma').value,
    proveedor: document.getElementById('bol-prov').value,
    cuit_proveedor: document.getElementById('bol-cuit').value,
    numero_comprobante: numero,
    vencimiento: document.getElementById('bol-vto').value,
    tipo_cambio: parseFloat(document.getElementById('bol-tc').value) || 0,
    campania: document.getElementById('bol-campania').value,
    pago: document.getElementById('bol-pago').value,
    campo: document.getElementById('bol-campo').value
  };

  let archivoUrl = null;
  if (bolArchivoActual) {
    toast('⏳ Subiendo documento...');
    archivoUrl = await subirArchivo(bolArchivoActual);
    if (!archivoUrl) toast('⚠️ No se pudo subir el documento (se guarda igual)', 'var(--tierra)');
  }

  let ok = 0;
  for (const it of items) {
    const data = {
      fecha: cab.fecha,
      proveedor: cab.proveedor,
      concepto: it.descripcion_a,
      campo: cab.campo,
      monto: it.total,
      categoria: it.rubro,
      archivo_url: archivoUrl,
      observaciones: JSON.stringify({
        tipo_factura: 'recibida',
        firma: cab.firma,
        vencimiento: cab.vencimiento,
        cuit_proveedor: cab.cuit_proveedor,
        numero_comprobante: cab.numero_comprobante,
        tipo_cambio: cab.tipo_cambio,
        campania: cab.campania,
        pago: cab.pago,
        cantidad: it.cantidad,
        unidad: it.unidad,
        costo_unitario: it.costo_unitario,
        moneda_costo: it.moneda_costo,
        destino: it.destino,
        subtotal: it.subtotal,
        pct_iva: it.pct_iva,
        iva: it.iva
      })
    };
    const r = await sb('POST', 'boletas', data);
    if (r) ok++;
  }

  if (ok) {
    toast(`✅ Factura registrada — ${ok} ítem(s)`);
    toggleForm('form-boleta');
    document.getElementById('bol-result').style.display = 'none';
    document.getElementById('bol-preview').style.display = 'none';
    document.getElementById('bol-archivo').value = '';
    bolArchivoActual = null;
    ['bol-num','bol-prov','bol-cuit','bol-tc','bol-campania'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('bol-items').innerHTML = '';
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
    ['bol-total-pagado','bol-total-adeudado'].forEach(id => document.getElementById(id).textContent = fmtMonto(0, 'ARS'));
    ['bol-cant-pagado','bol-cant-adeudado'].forEach(id => document.getElementById(id).textContent = '0 ítems');
    return;
  }

  const acc = { FJ: { ARS: 0, USD: 0, cant: 0 }, SH: { ARS: 0, USD: 0, cant: 0 } };
  const pago = { pagado: 0, pagadoCant: 0, adeudado: 0, adeudadoCant: 0 };
  rows.forEach(r => {
    const extra = r.observaciones ? JSON.parse(r.observaciones) : {};
    const firma = extra.firma || '';
    const m = extra.moneda === 'USD' ? 'USD' : 'ARS';
    const k = firma === 'Francisco J. Giraudo' ? 'FJ' : (firma === 'Giraudo SH' ? 'SH' : null);
    if (k) { acc[k][m] += r.monto || 0; acc[k].cant++; }
    if (extra.pago === 'Paga') { pago.pagado += r.monto || 0; pago.pagadoCant++; }
    else { pago.adeudado += r.monto || 0; pago.adeudadoCant++; }
  });
  document.getElementById('bol-total-pagado').textContent = fmtMonto(pago.pagado, 'ARS');
  document.getElementById('bol-cant-pagado').textContent = pago.pagadoCant + ' ítem' + (pago.pagadoCant !== 1 ? 's' : '');
  document.getElementById('bol-total-adeudado').textContent = fmtMonto(pago.adeudado, 'ARS');
  document.getElementById('bol-cant-adeudado').textContent = pago.adeudadoCant + ' ítem' + (pago.adeudadoCant !== 1 ? 's' : '');
  const linea = k => {
    const partes = [];
    if (acc[k].ARS) partes.push(fmtMonto(acc[k].ARS, 'ARS'));
    if (acc[k].USD) partes.push(fmtMonto(acc[k].USD, 'USD'));
    return partes.length ? partes.join(' · ') : '$ 0';
  };
  document.getElementById('total-firma-fj').textContent = linea('FJ');
  document.getElementById('total-firma-sh').textContent = linea('SH');
  document.getElementById('cant-firma-fj').textContent = acc.FJ.cant + ' ítem' + (acc.FJ.cant !== 1 ? 's' : '');
  document.getElementById('cant-firma-sh').textContent = acc.SH.cant + ' ítem' + (acc.SH.cant !== 1 ? 's' : '');

  tbody.innerHTML = rows.map(r => {
    const e = r.observaciones ? JSON.parse(r.observaciones) : {};
    const mc = e.moneda_costo || 'ARS';
    const firmaCorta = e.firma === 'Francisco J. Giraudo' ? 'FJG' : (e.firma === 'Giraudo SH' ? 'SH' : (e.firma || '—'));
    const pctIva = (e.pct_iva === 0 || e.pct_iva === '0') ? 'Exento' : (fmtNum(e.pct_iva, (Number(e.pct_iva) % 1) ? 1 : 0) + '%');
    const pagoBadge = `<button class="badge ${e.pago === 'Paga' ? 'badge-green' : 'badge-tierra'}" style="border:none;cursor:pointer" onclick="togglePagoBoleta('${r.id}', this)">${e.pago === 'Paga' ? 'Paga' : 'Impaga'}</button>`;
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
      <td><input type="text" value="${(e.destino||'').replace(/"/g,'&quot;')}" placeholder="—" onchange="editarDestinoBoleta('${r.id}', this.value)" style="width:120px;font-size:12px;padding:3px 5px;border:1px solid var(--gris-borde);border-radius:4px"></td>
      <td style="font-size:11px;color:var(--texto-suave)">${fmtFecha(e.vencimiento)}</td>
      <td style="font-size:11px">${e.tipo_cambio ? fmtNum(e.tipo_cambio, 2) : '—'}</td>
      <td>${fmtMonto(e.subtotal, 'ARS')}</td>
      <td style="font-size:11px">${pctIva}</td>
      <td>${fmtMonto(e.iva, 'ARS')}</td>
      <td><strong>${fmtMonto(r.monto, 'ARS')}</strong></td>
      <td style="font-size:11px">${e.campania || '—'}</td>
      <td>${pagoBadge}</td>
      <td style="white-space:nowrap">${r.archivo_url ? `<a class="btn btn-secondary" style="padding:4px 8px;font-size:12px;text-decoration:none" href="${r.archivo_url}" target="_blank" rel="noopener" title="Ver documento">👁️</a> ` : ''}<button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarBoleta('${r.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

async function patchObsBoleta(id, cambios) {
  const r = await sb('GET', 'boletas', null, `?id=eq.${id}&select=observaciones`);
  if (!r || !r[0]) return false;
  const e = JSON.parse(r[0].observaciones || '{}');
  Object.assign(e, cambios);
  const res = await sb('PATCH', 'boletas', { observaciones: JSON.stringify(e) }, `?id=eq.${id}`);
  return res !== null;
}

async function editarDestinoBoleta(id, valor) {
  const ok = await patchObsBoleta(id, { destino: valor });
  if (ok) toast('✅ Destino guardado'); else toast('❌ No se pudo guardar', 'var(--rojo)');
}

async function togglePagoBoleta(id, btn) {
  const r = await sb('GET', 'boletas', null, `?id=eq.${id}&select=observaciones`);
  if (!r || !r[0]) return;
  const e = JSON.parse(r[0].observaciones || '{}');
  const nuevo = e.pago === 'Paga' ? 'Impaga' : 'Paga';
  const ok = await patchObsBoleta(id, { pago: nuevo });
  if (ok) {
    toast(`✅ Marcada como ${nuevo}`);
    if (btn) {
      btn.textContent = nuevo;
      btn.classList.toggle('badge-green', nuevo === 'Paga');
      btn.classList.toggle('badge-tierra', nuevo === 'Impaga');
    }
    actualizarResumenPagoBoletas();
  } else toast('❌ No se pudo cambiar', 'var(--rojo)');
}

async function actualizarResumenPagoBoletas() {
  const todas = await sb('GET', 'boletas', '', '?order=fecha.desc');
  const rows = (todas || []).filter(r => {
    try { const t = JSON.parse(r.observaciones || '{}').tipo_factura; return !t || t === 'recibida'; } catch(e) { return true; }
  });
  const p = { pagado: 0, pagadoCant: 0, adeudado: 0, adeudadoCant: 0 };
  rows.forEach(r => {
    const e = r.observaciones ? JSON.parse(r.observaciones) : {};
    if (e.pago === 'Paga') { p.pagado += r.monto || 0; p.pagadoCant++; }
    else { p.adeudado += r.monto || 0; p.adeudadoCant++; }
  });
  document.getElementById('bol-total-pagado').textContent = fmtMonto(p.pagado, 'ARS');
  document.getElementById('bol-cant-pagado').textContent = p.pagadoCant + ' ítem' + (p.pagadoCant !== 1 ? 's' : '');
  document.getElementById('bol-total-adeudado').textContent = fmtMonto(p.adeudado, 'ARS');
  document.getElementById('bol-cant-adeudado').textContent = p.adeudadoCant + ' ítem' + (p.adeudadoCant !== 1 ? 's' : '');
}

async function borrarBoleta(id) {
  if (!confirm('¿Borrar este ítem de la factura?')) return;
  await sb('DELETE', 'boletas', '', `?id=eq.${id}`);
  toast('🗑️ Ítem borrado');
  cargarBoletas();
}

function filtrarBoletas() {
  const filtro = document.getElementById('bol-filtro-firma').value.toLowerCase();
  document.querySelectorAll('#tabla-boletas tr').forEach(tr => {
    if (!filtro) { tr.style.display = ''; return; }
    tr.style.display = tr.textContent.toLowerCase().includes(filtro) ? '' : 'none';
  });
}
