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
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = () => rej(new Error('Error al leer'));
      r.readAsDataURL(file);
    });

    const isPdf = file.type === 'application/pdf';
    const messages = isPdf ? [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: 'Extraé todos los datos de esta boleta/factura y devolvé SOLO JSON sin backticks.' }
      ]
    }] : [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
        { type: 'text', text: 'Extraé todos los datos de esta boleta/factura y devolvé SOLO JSON sin backticks.' }
      ]
    }];

    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: `Sos un asistente contable del Grupo Giraudo, Argentina. Analizá la boleta/factura y extraé los datos.
Identificá la firma receptora: si el destinatario tiene CUIT 20-16226904-7 o dice "Francisco J. Giraudo" (sin Juan) es "Francisco J. Giraudo". Si tiene CUIT 30-71599118-3 o dice "Giraudo Francisco J. y Giraudo Juan F. SH" es "Giraudo SH".
Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"firma":"Francisco J. Giraudo o Giraudo SH","fecha":"DD/MM/YYYY","vencimiento":"DD/MM/YYYY","numero_comprobante":"string","proveedor":"string","cuit_proveedor":"string","categoria":"Insumos agrícolas|Veterinaria|Combustible|Arrendamiento|Maquinaria / Repuestos|Mano de obra|Servicios|Semillas|Agroquímicos|Fertilizantes|Otro","descripcion":"string","moneda":"ARS|USD","subtotal":0,"iva":0,"total":0,"tipo_iva":"21%|10.5%|0%"}
Detectá la moneda: si los importes están en dólares (U$D, USD, US$) poné "USD", si están en pesos poné "ARS".`,
        messages
      })
    });

    const json = await res.json();
    let raw = json.content?.[0]?.text || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    const datos = JSON.parse(raw);

    const parseDate = str => {
      const parts = (str || '').split('/');
      return parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}` : '';
    };

    if (datos.firma)   document.getElementById('bol-firma').value = datos.firma;
    if (datos.fecha)   document.getElementById('bol-fecha').value = parseDate(datos.fecha);
    if (datos.vencimiento) document.getElementById('bol-vto').value = parseDate(datos.vencimiento);
    if (datos.numero_comprobante) document.getElementById('bol-num').value = datos.numero_comprobante;
    if (datos.proveedor) document.getElementById('bol-prov').value = datos.proveedor;
    if (datos.cuit_proveedor) document.getElementById('bol-cuit').value = datos.cuit_proveedor;
    if (datos.categoria) document.getElementById('bol-cat').value = datos.categoria;
    if (datos.moneda) document.getElementById('bol-moneda').value = datos.moneda;
    if (datos.descripcion) document.getElementById('bol-desc').value = datos.descripcion;
    if (datos.subtotal) document.getElementById('bol-sub').value = datos.subtotal;
    if (datos.iva)     document.getElementById('bol-iva').value = datos.iva;
    if (datos.total)   document.getElementById('bol-total').value = datos.total;

    preview.textContent = `✅ ${file.name} — leída correctamente`;
    result.style.display = 'block';
    result.innerHTML = `<strong>Datos extraídos:</strong><br>
      🏢 Firma: <strong>${datos.firma || '—'}</strong><br>
      📅 Fecha: ${fmtFecha(datos.fecha)} | Vto: ${fmtFecha(datos.vencimiento)}<br>
      🏪 Proveedor: ${datos.proveedor || '—'} (${datos.cuit_proveedor || '—'})<br>
      📋 ${datos.descripcion || '—'}<br>
      💰 Subtotal: $${(datos.subtotal || 0).toLocaleString()} | IVA ${datos.tipo_iva || ''}: $${(datos.iva || 0).toLocaleString()} | <strong>Total: $${(datos.total || 0).toLocaleString()}</strong><br>
      <span style="color:var(--texto-suave);font-size:12px">Revisá los datos y hacé click en "Guardar boleta"</span>`;
    status.textContent = '';
    toast('✅ Boleta leída — revisá y guardá');
  } catch(e) {
    preview.textContent = '❌ Error al procesar el archivo';
    status.textContent = '';
    console.error(e);
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
      firma: document.getElementById('bol-firma').value,
      vencimiento: document.getElementById('bol-vto').value,
      cuit_proveedor: document.getElementById('bol-cuit').value,
      numero_comprobante: document.getElementById('bol-num').value,
      moneda: document.getElementById('bol-moneda').value,
      subtotal: parseFloat(document.getElementById('bol-sub').value) || 0,
      iva: parseFloat(document.getElementById('bol-iva').value) || 0
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
    tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state"><div class="icon">🧾</div><h3>Sin boletas cargadas</h3><p>Subí una foto o PDF de la boleta</p></div></td></tr>';
    document.getElementById('total-firma-fj').textContent = '$0';
    document.getElementById('total-firma-sh').textContent = '$0';
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
    const extra = r.observaciones ? JSON.parse(r.observaciones) : {};
    const mon = extra.moneda || 'ARS';
    return `<tr>
      <td>${fmtFecha(r.fecha)}</td>
      <td><span class="badge badge-bordo" style="font-size:10px">${extra.firma || '—'}</span></td>
      <td><strong>${r.proveedor || '—'}</strong></td>
      <td style="font-size:11px">${extra.numero_comprobante || '—'}</td>
      <td><span class="badge badge-gray">${r.categoria || '—'}</span></td>
      <td>${r.campo || '—'}</td>
      <td>${fmtMonto(extra.subtotal, mon)}</td>
      <td>${fmtMonto(extra.iva, mon)}</td>
      <td><strong>${fmtMonto(r.monto, mon)}</strong></td>
      <td style="font-size:11px;color:var(--texto-suave)">${extra.vencimiento || '—'}</td>
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
