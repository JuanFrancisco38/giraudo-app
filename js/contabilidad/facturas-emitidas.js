const CONCEPTOS_FEMIT = ['Venta de granos','Venta de hacienda','Servicios','Arrendamiento','Otro'];

let feItemSeq = 0;
let feArchivoActual = null;

function abrirFormFemit() {
  const form = document.getElementById('form-femit');
  const abriendo = form.style.display === 'none' || !form.style.display;
  toggleForm('form-femit');
  if (abriendo && !document.querySelector('#fe-items .fe-item')) agregarItemFemit();
}

function conceptoOptionsFemit(sel) {
  return CONCEPTOS_FEMIT.map(r => `<option${r === sel ? ' selected' : ''}>${r}</option>`).join('');
}

function agregarItemFemit(d = {}) {
  const i = ++feItemSeq;
  const cont = document.getElementById('fe-items');
  const div = document.createElement('div');
  div.className = 'fe-item';
  div.id = `fe-item-${i}`;
  div.style.cssText = 'border:1px solid var(--gris-borde);border-radius:8px;padding:12px;margin-bottom:10px;background:var(--bordo-claro)';
  const unidades = ['','kg','lts','tt','unidad'];
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:12px;font-weight:600;color:var(--bordo)">Ítem</span>
      <button type="button" class="btn btn-secondary" style="padding:2px 8px;font-size:12px" onclick="document.getElementById('fe-item-${i}').remove()">✕ Quitar</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Concepto</label><select class="fi-rubro">${conceptoOptionsFemit(d.concepto)}</select></div>
      <div class="form-group full"><label>Descripción A — Detalle del producto</label><input type="text" class="fi-desc" value="${(d.descripcion_a||'').replace(/"/g,'&quot;')}" placeholder="Ej: Soja zafra 24/25"></div>
      <div class="form-group"><label>Descripción B — Cantidad</label><input type="number" step="any" class="fi-cant" value="${d.cantidad||''}" placeholder="Ej: 100000"></div>
      <div class="form-group"><label>Unidad</label><select class="fi-unidad">${unidades.map(u => `<option value="${u}"${u===(d.unidad||'')?' selected':''}>${u||'—'}</option>`).join('')}</select></div>
      <div class="form-group"><label>Descripción C — Precio unitario</label><input type="number" step="any" class="fi-costou" value="${d.costo_unitario||''}" placeholder="Ej: 350000"></div>
      <div class="form-group"><label>Moneda precio unit.</label><select class="fi-mcu"><option value="ARS"${(d.moneda_costo||'ARS')==='ARS'?' selected':''}>Pesos ($)</option><option value="USD"${d.moneda_costo==='USD'?' selected':''}>Dólares (U$D)</option></select></div>
      <div class="form-group full"><label>Descripción D — Destino / detalle</label><input type="text" class="fi-destino" value="${(d.destino||'').replace(/"/g,'&quot;')}" placeholder="Lo completás vos"></div>
      <div class="form-group"><label>Subtotal (en pesos)</label><input type="number" step="any" class="fi-sub" value="${d.subtotal||''}" oninput="calcIvaItemFe(this)"></div>
      <div class="form-group"><label>% IVA</label><select class="fi-pctiva" onchange="calcIvaItemFe(this)">
        <option value="21"${Number(d.pct_iva)===21||d.pct_iva==null?' selected':''}>21%</option>
        <option value="10.5"${Number(d.pct_iva)===10.5?' selected':''}>10,5%</option>
        <option value="0"${Number(d.pct_iva)===0?' selected':''}>Exento</option>
      </select></div>
      <div class="form-group"><label>IVA</label><input type="number" step="any" class="fi-iva" value="${d.iva||''}"></div>
      <div class="form-group"><label>Total</label><input type="number" step="any" class="fi-total" value="${d.total||''}" style="font-weight:600"></div>
    </div>`;
  cont.appendChild(div);
  return div;
}

function calcIvaItemFe(el) {
  const item = el.closest('.fe-item');
  const sub = parseFloat(item.querySelector('.fi-sub').value) || 0;
  const pct = parseFloat(item.querySelector('.fi-pctiva').value) || 0;
  if (sub) {
    const iva = Math.round(sub * pct / 100 * 100) / 100;
    item.querySelector('.fi-iva').value = iva;
    item.querySelector('.fi-total').value = Math.round((sub + iva) * 100) / 100;
  }
}

function leerItemsFemit() {
  return [...document.querySelectorAll('#fe-items .fe-item')].map(item => ({
    concepto: item.querySelector('.fi-rubro').value,
    descripcion_a: item.querySelector('.fi-desc').value,
    cantidad: parseFloat(item.querySelector('.fi-cant').value) || 0,
    unidad: item.querySelector('.fi-unidad').value,
    costo_unitario: parseFloat(item.querySelector('.fi-costou').value) || 0,
    moneda_costo: item.querySelector('.fi-mcu').value,
    destino: item.querySelector('.fi-destino').value,
    subtotal: parseFloat(item.querySelector('.fi-sub').value) || 0,
    pct_iva: parseFloat(item.querySelector('.fi-pctiva').value) || 0,
    iva: parseFloat(item.querySelector('.fi-iva').value) || 0,
    total: parseFloat(item.querySelector('.fi-total').value) || 0
  }));
}

async function procesarFacturaEmitida(input) {
  const file = input.files[0];
  if (!file) return;
  feArchivoActual = file;
  const status = document.getElementById('fe-doc-status');
  const result = document.getElementById('fe-result');
  status.textContent = `📄 Leyendo ${file.name}...`;
  result.style.display = 'none';
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable agropecuario argentino. Analizá esta factura EMITIDA (de venta) del Grupo Giraudo y extraé los datos. La firma emisora es Giraudo SH (CUIT 30-71599118-3) o Francisco J. Giraudo (CUIT 20-16226904-7).
MUY IMPORTANTE: la factura puede tener VARIOS productos/renglones. Devolvé UN ítem por cada producto/línea en el array "items". NO los juntes en uno solo.
Para cada ítem:
- "concepto": elegí EXACTAMENTE uno de: ${CONCEPTOS_FEMIT.join(', ')}.
- "descripcion_a": detalle del producto vendido.
- "cantidad" y "unidad" (kg, lts, tt, unidad).
- "costo_unitario" (precio unitario) y "moneda_costo" (ARS o USD).
- "subtotal", "pct_iva" (21, 10.5 o 0 exento), "iva", "total" de ESE renglón, en pesos.
Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"firma":"Giraudo SH|Francisco J. Giraudo","fecha":"DD/MM/YYYY","vencimiento":"DD/MM/YYYY","numero_factura":"string","cliente":"string","cuit_cliente":"string","tipo_cambio":0,"items":[{"concepto":"","descripcion_a":"","cantidad":0,"unidad":"kg|lts|tt|unidad","costo_unitario":0,"moneda_costo":"ARS|USD","subtotal":0,"pct_iva":21,"iva":0,"total":0}]}
Montos en números sin símbolos ni puntos de miles. Si un dato no está, poné 0 o "".`,
      'Extraé todos los datos de esta factura emitida, un ítem por cada producto.');

    if (datos.firma) document.getElementById('fe-firma').value = datos.firma;
    if (datos.fecha) document.getElementById('fe-fecha').value = parseFechaIA(datos.fecha);
    if (datos.vencimiento) document.getElementById('fe-vto').value = parseFechaIA(datos.vencimiento);
    if (datos.numero_factura) document.getElementById('fe-num').value = datos.numero_factura;
    if (datos.cliente) document.getElementById('fe-cliente').value = datos.cliente;
    if (datos.cuit_cliente) document.getElementById('fe-cuit').value = datos.cuit_cliente;
    if (datos.tipo_cambio) document.getElementById('fe-tc').value = datos.tipo_cambio;

    document.getElementById('fe-items').innerHTML = '';
    feItemSeq = 0;
    const items = Array.isArray(datos.items) && datos.items.length ? datos.items : [{}];
    items.forEach(it => agregarItemFemit(it));

    const totGlobal = items.reduce((a, it) => a + (Number(it.total) || 0), 0);
    status.textContent = `✅ ${file.name} leída`;
    result.style.display = 'block';
    result.innerHTML = `<strong>Datos extraídos:</strong><br>
      🏢 ${datos.firma || '—'} | 📅 ${fmtFecha(parseFechaIA(datos.fecha))} | N° ${datos.numero_factura || '—'}<br>
      👤 ${datos.cliente || '—'} (${datos.cuit_cliente || '—'})<br>
      🛒 <strong>${items.length}</strong> ítem(s) | Total factura: <strong>${fmtMonto(totGlobal, 'ARS')}</strong><br>
      <span style="color:var(--texto-suave);font-size:12px">Revisá cada renglón, completá Campaña y Estado de cobro, y guardá.</span>`;
    toast(`✅ Factura leída — ${items.length} ítem(s)`);
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

async function guardarFacturaEmitida() {
  const fecha = document.getElementById('fe-fecha').value;
  const items = leerItemsFemit();
  if (!fecha) { toast('Completá la fecha', 'var(--tierra)'); return; }
  if (!items.length || !items.some(it => it.total || it.subtotal)) { toast('Agregá al menos un ítem con monto', 'var(--tierra)'); return; }

  const numero = document.getElementById('fe-num').value;
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

  const cab = {
    fecha,
    firma: document.getElementById('fe-firma').value,
    cliente: document.getElementById('fe-cliente').value,
    cuit_cliente: document.getElementById('fe-cuit').value,
    numero_comprobante: numero,
    vencimiento: document.getElementById('fe-vto').value,
    tipo_cambio: parseFloat(document.getElementById('fe-tc').value) || 0,
    campania: document.getElementById('fe-campania').value,
    cobro: document.getElementById('fe-cobro').value,
    campo: document.getElementById('fe-campo').value
  };

  let archivoUrl = null;
  if (feArchivoActual) {
    toast('⏳ Subiendo documento...');
    archivoUrl = await subirArchivo(feArchivoActual);
    if (!archivoUrl) toast('⚠️ No se pudo subir el documento (se guarda igual)', 'var(--tierra)');
  }

  let ok = 0;
  for (const it of items) {
    const data = {
      fecha: cab.fecha,
      proveedor: cab.cliente,
      concepto: it.descripcion_a,
      campo: cab.campo,
      monto: it.total,
      categoria: it.concepto,
      archivo_url: archivoUrl,
      observaciones: JSON.stringify({
        tipo_factura: 'emitida',
        firma: cab.firma,
        vencimiento: cab.vencimiento,
        cuit_cliente: cab.cuit_cliente,
        numero_comprobante: cab.numero_comprobante,
        tipo_cambio: cab.tipo_cambio,
        campania: cab.campania,
        cobro: cab.cobro,
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
    toggleForm('form-femit');
    document.getElementById('fe-result').style.display = 'none';
    document.getElementById('fe-doc-status').textContent = '';
    document.getElementById('fe-archivo').value = '';
    feArchivoActual = null;
    ['fe-num','fe-cliente','fe-cuit','fe-tc','fe-campania'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('fe-items').innerHTML = '';
    cargarFacturasEmitidas();
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

let femitTodas = [];

async function cargarFacturasEmitidas() {
  const rows = await sb('GET', 'boletas', '', '?order=fecha.desc');
  femitTodas = (rows || []).filter(r => {
    try { return JSON.parse(r.observaciones || '{}').tipo_factura === 'emitida'; } catch(e) { return false; }
  });

  const selCamp = document.getElementById('fe-filtro-campania');
  if (selCamp) {
    const actual = selCamp.value;
    const camps = [...new Set(femitTodas.map(r => { try { return JSON.parse(r.observaciones || '{}').campania; } catch(e) { return ''; } }).filter(c => c))].sort();
    selCamp.innerHTML = '<option value="">Todas las campañas</option>' + camps.map(c => `<option${c === actual ? ' selected' : ''}>${c}</option>`).join('');
  }
  renderFacturasEmitidas();
}

function renderFacturasEmitidas() {
  const tbody = document.getElementById('tabla-femit');
  if (!tbody) return;
  const fFirma = document.getElementById('fe-filtro-firma')?.value || '';
  const fCamp = document.getElementById('fe-filtro-campania')?.value || '';
  const emitidas = femitTodas.filter(r => {
    let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(err) {}
    if (fFirma && e.firma !== fFirma) return false;
    if (fCamp && (e.campania || '') !== fCamp) return false;
    return true;
  });

  if (!emitidas.length) {
    const hayFiltro = fFirma || fCamp;
    tbody.innerHTML = `<tr><td colspan="18"><div class="empty-state"><div class="icon">🧾</div><h3>${hayFiltro ? 'Sin resultados para el filtro' : 'Sin facturas emitidas'}</h3><p>${hayFiltro ? 'Probá con otra firma o campaña' : 'Subí un PDF o foto de la factura'}</p></div></td></tr>`;
    ['fe-total-facturado','fe-total-cobrado','fe-total-pendiente','fe-total-iva'].forEach(id => document.getElementById(id).textContent = fmtMonto(0, 'ARS'));
    ['fe-cant','fe-cant-cobrado','fe-cant-pendiente'].forEach(id => document.getElementById(id).textContent = '0 ítems');
    const cr = document.getElementById('fe-resumen-concepto');
    if (cr) cr.innerHTML = '<p style="font-size:13px;color:var(--texto-suave)">Sin datos.</p>';
    return;
  }

  const tot = { fact: 0, iva: 0, cobrado: 0, cobradoCant: 0, pendiente: 0, pendienteCant: 0 };
  emitidas.forEach(r => {
    const e = JSON.parse(r.observaciones || '{}');
    tot.fact += r.monto || 0;
    tot.iva += e.iva || 0;
    if (e.cobro === 'Cobrada') { tot.cobrado += r.monto || 0; tot.cobradoCant++; }
    else { tot.pendiente += r.monto || 0; tot.pendienteCant++; }
  });
  document.getElementById('fe-total-facturado').textContent = fmtMonto(tot.fact, 'ARS');
  document.getElementById('fe-total-iva').textContent = fmtMonto(tot.iva, 'ARS');
  document.getElementById('fe-total-cobrado').textContent = fmtMonto(tot.cobrado, 'ARS');
  document.getElementById('fe-total-pendiente').textContent = fmtMonto(tot.pendiente, 'ARS');
  document.getElementById('fe-cant').textContent = emitidas.length + ' ítem' + (emitidas.length !== 1 ? 's' : '');
  document.getElementById('fe-cant-cobrado').textContent = tot.cobradoCant + ' ítem' + (tot.cobradoCant !== 1 ? 's' : '');
  document.getElementById('fe-cant-pendiente').textContent = tot.pendienteCant + ' ítem' + (tot.pendienteCant !== 1 ? 's' : '');

  const porConcepto = {};
  emitidas.forEach(r => {
    const c = r.categoria || 'Sin concepto';
    if (!porConcepto[c]) porConcepto[c] = { total: 0, cant: 0 };
    porConcepto[c].total += r.monto || 0;
    porConcepto[c].cant++;
  });
  const cont = document.getElementById('fe-resumen-concepto');
  if (cont) {
    const filas = Object.entries(porConcepto).sort((a, b) => b[1].total - a[1].total).map(([c, v]) => {
      const pct = tot.fact ? Math.round(v.total / tot.fact * 100) : 0;
      return `<tr>
        <td><span class="badge badge-gray">${c}</span></td>
        <td style="text-align:right">${v.cant}</td>
        <td style="text-align:right"><strong>${fmtMonto(v.total, 'ARS')}</strong></td>
        <td style="text-align:right;color:var(--texto-suave)">${pct}%</td>
      </tr>`;
    }).join('');
    cont.innerHTML = `<table style="width:100%;font-size:13px">
      <thead><tr><th style="text-align:left">Concepto</th><th style="text-align:right">Ítems</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr style="border-top:2px solid var(--gris-borde)"><td><strong>Total</strong></td><td style="text-align:right"><strong>${emitidas.length}</strong></td><td style="text-align:right"><strong>${fmtMonto(tot.fact, 'ARS')}</strong></td><td></td></tr></tfoot>
    </table>`;
  }

  tbody.innerHTML = emitidas.map(r => {
    const e = JSON.parse(r.observaciones || '{}');
    const mc = e.moneda_costo || 'ARS';
    const firmaCorta = e.firma === 'Francisco J. Giraudo' ? 'FJG' : (e.firma === 'Giraudo SH' ? 'SH' : (e.firma || '—'));
    const pctIva = (e.pct_iva === 0 || e.pct_iva === '0') ? 'Exento' : (fmtNum(e.pct_iva, (Number(e.pct_iva) % 1) ? 1 : 0) + '%');
    const cobroBadge = `<button class="badge ${e.cobro === 'Cobrada' ? 'badge-green' : 'badge-tierra'}" style="border:none;cursor:pointer" onclick="toggleCobroFemit('${r.id}', this)">${e.cobro === 'Cobrada' ? 'Cobrada' : 'Pendiente'}</button>`;
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
      <td><input type="text" value="${(e.destino||'').replace(/"/g,'&quot;')}" placeholder="—" onchange="editarDestinoFemit('${r.id}', this.value)" style="width:120px;font-size:12px;padding:3px 5px;border:1px solid var(--gris-borde);border-radius:4px"></td>
      <td style="font-size:11px;color:var(--texto-suave)">${fmtFecha(e.vencimiento)}</td>
      <td style="font-size:11px">${e.tipo_cambio ? fmtNum(e.tipo_cambio, 2) : '—'}</td>
      <td>${fmtMonto(e.subtotal, 'ARS')}</td>
      <td style="font-size:11px">${pctIva}</td>
      <td>${fmtMonto(e.iva, 'ARS')}</td>
      <td><strong>${fmtMonto(r.monto, 'ARS')}</strong></td>
      <td><input type="text" value="${(e.campania||'').replace(/"/g,'&quot;')}" placeholder="—" list="campanias-list" onchange="editarCampaniaFemit('${r.id}', this.value)" style="width:80px;font-size:12px;padding:3px 5px;border:1px solid var(--gris-borde);border-radius:4px"></td>
      <td>${cobroBadge}</td>
      <td style="white-space:nowrap">${r.archivo_url ? `<a class="btn btn-secondary" style="padding:4px 8px;font-size:12px;text-decoration:none" href="${r.archivo_url}" target="_blank" rel="noopener" title="Ver documento">👁️</a> ` : ''}<button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarFacturaEmitida('${r.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

async function patchObsFemit(id, cambios) {
  const r = await sb('GET', 'boletas', null, `?id=eq.${id}&select=observaciones`);
  if (!r || !r[0]) return false;
  const e = JSON.parse(r[0].observaciones || '{}');
  Object.assign(e, cambios);
  const res = await sb('PATCH', 'boletas', { observaciones: JSON.stringify(e) }, `?id=eq.${id}`);
  return res !== null;
}

async function editarDestinoFemit(id, valor) {
  const ok = await patchObsFemit(id, { destino: valor });
  if (ok) {
    const row = femitTodas.find(b => b.id === id);
    if (row) { const obs = JSON.parse(row.observaciones || '{}'); obs.destino = valor; row.observaciones = JSON.stringify(obs); }
    toast('✅ Destino guardado');
  } else toast('❌ No se pudo guardar', 'var(--rojo)');
}

async function editarCampaniaFemit(id, valor) {
  const ok = await patchObsFemit(id, { campania: valor });
  if (ok) {
    const row = femitTodas.find(b => b.id === id);
    if (row) { const obs = JSON.parse(row.observaciones || '{}'); obs.campania = valor; row.observaciones = JSON.stringify(obs); }
    const selCamp = document.getElementById('fe-filtro-campania');
    if (selCamp) {
      const actual = selCamp.value;
      const camps = [...new Set(femitTodas.map(b => { try { return JSON.parse(b.observaciones || '{}').campania; } catch(e) { return ''; } }).filter(c => c))].sort();
      selCamp.innerHTML = '<option value="">Todas las campañas</option>' + camps.map(c => `<option${c === actual ? ' selected' : ''}>${c}</option>`).join('');
    }
    toast('✅ Campaña guardada');
    renderFacturasEmitidas();
  } else toast('❌ No se pudo guardar', 'var(--rojo)');
}

async function toggleCobroFemit(id, btn) {
  const r = await sb('GET', 'boletas', null, `?id=eq.${id}&select=observaciones`);
  if (!r || !r[0]) return;
  const e = JSON.parse(r[0].observaciones || '{}');
  const nuevo = e.cobro === 'Cobrada' ? 'Pendiente' : 'Cobrada';
  const ok = await patchObsFemit(id, { cobro: nuevo });
  if (ok) {
    toast(`✅ Marcada como ${nuevo}`);
    if (btn) {
      btn.textContent = nuevo;
      btn.classList.toggle('badge-green', nuevo === 'Cobrada');
      btn.classList.toggle('badge-tierra', nuevo === 'Pendiente');
    }
    const row = femitTodas.find(b => b.id === id);
    if (row) { const obs = JSON.parse(row.observaciones || '{}'); obs.cobro = nuevo; row.observaciones = JSON.stringify(obs); }
    renderFacturasEmitidas();
  } else toast('❌ No se pudo cambiar', 'var(--rojo)');
}

async function borrarFacturaEmitida(id) {
  if (!confirm('¿Borrar este ítem de la factura emitida?')) return;
  await sb('DELETE', 'boletas', '', `?id=eq.${id}`);
  toast('🗑️ Ítem borrado');
  cargarFacturasEmitidas();
}
