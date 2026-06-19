const NOTA_CFG = {
  nota_credito: { pref: 'nc', signo: -1, label: 'nota de crédito' },
  nota_debito:  { pref: 'nd', signo:  1, label: 'nota de débito' }
};

async function procesarNotaDoc(input, tipo) {
  const file = input.files[0];
  if (!file) return;
  const cfg = NOTA_CFG[tipo];
  const status = document.getElementById(`${cfg.pref}-doc-status`);
  status.textContent = `📄 Leyendo ${file.name}...`;
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable agropecuario argentino. Analizá esta ${cfg.label.toUpperCase()} recibida y extraé los datos. Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"fecha":"DD/MM/YYYY","numero":"string (N° comprobante)","proveedor":"string","cuit_proveedor":"string","factura_asociada":"string (N° de factura que ajusta)","descripcion":"string (motivo)","moneda":"ARS|USD","subtotal":0,"iva":0,"total":0}
Detectá la moneda: si los importes están en dólares (U$D, USD, US$) poné "USD", si están en pesos poné "ARS". Los montos en números positivos sin símbolos ni puntos de miles. Si un dato no está, poné 0 o "".`,
      `Extraé los datos de esta ${cfg.label}.`);

    const g = id => document.getElementById(`${cfg.pref}-${id}`);
    if (datos.fecha) g('fecha').value = parseFechaIA(datos.fecha);
    if (datos.numero) g('num').value = datos.numero;
    if (datos.proveedor) g('prov').value = datos.proveedor;
    if (datos.cuit_proveedor) g('cuit').value = datos.cuit_proveedor;
    if (datos.factura_asociada) g('fact').value = datos.factura_asociada;
    if (datos.moneda) g('moneda').value = datos.moneda;
    if (datos.descripcion) g('desc').value = datos.descripcion;
    if (datos.subtotal) g('sub').value = datos.subtotal;
    if (datos.iva) g('iva').value = datos.iva;
    if (datos.total) g('total').value = datos.total;

    status.textContent = `✅ ${file.name} leída — revisá los campos y guardá`;
    toast('✅ Documento leído — revisá y guardá');
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

async function guardarNota(tipo) {
  const cfg = NOTA_CFG[tipo];
  const g = id => document.getElementById(`${cfg.pref}-${id}`);
  const total = parseFloat(g('total').value) || 0;
  const fecha = g('fecha').value;
  if (!fecha || !total) { toast('Completá al menos fecha y total', 'var(--tierra)'); return; }

  const data = {
    fecha,
    proveedor: g('prov').value,
    concepto: g('desc').value,
    monto: cfg.signo * total,
    categoria: cfg.label,
    observaciones: JSON.stringify({
      tipo_factura: tipo,
      cuit_proveedor: g('cuit').value,
      numero_comprobante: g('num').value,
      factura_asociada: g('fact').value,
      moneda: g('moneda').value,
      subtotal: parseFloat(g('sub').value) || 0,
      iva: parseFloat(g('iva').value) || 0
    })
  };

  const numero = g('num').value;
  if (numero) {
    const todas = await sb('GET', 'boletas', '', '?order=fecha.desc');
    const dup = (todas || []).some(b => {
      try { const e = JSON.parse(b.observaciones || '{}'); return e.tipo_factura === tipo && e.numero_comprobante === numero; } catch(err) { return false; }
    });
    if (dup && !confirm(`⚠️ Ya existe una ${cfg.label} con el N° "${numero}". ¿Querés guardarla igual?`)) {
      toast('Guardado cancelado — posible duplicado', 'var(--tierra)');
      return;
    }
  }
  const r = await sb('POST', 'boletas', data);
  if (r) {
    toast(`✅ ${cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)} registrada`);
    toggleForm(`form-${cfg.pref}`);
    document.getElementById(`${cfg.pref}-doc-status`).textContent = '';
    g('archivo').value = '';
    cargarNotas(tipo);
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

async function cargarNotas(tipo) {
  const cfg = NOTA_CFG[tipo];
  const rows = await sb('GET', 'boletas', '', '?order=fecha.desc');
  const tbody = document.getElementById(`tabla-${cfg.pref}`);
  if (!tbody) return;
  const notas = (rows || []).filter(r => {
    try { return JSON.parse(r.observaciones || '{}').tipo_factura === tipo; } catch(e) { return false; }
  });

  if (!notas.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">📝</div><h3>Sin ${cfg.label}s</h3></div></td></tr>`;
    document.getElementById(`${cfg.pref}-total-sum`).textContent = fmtMonto(0, 'ARS');
    document.getElementById(`${cfg.pref}-cant`).textContent = '0 notas';
    return;
  }

  const tot = { ARS: 0, USD: 0 };
  notas.forEach(r => {
    const m = (JSON.parse(r.observaciones || '{}').moneda === 'USD') ? 'USD' : 'ARS';
    tot[m] += r.monto || 0;
  });
  const partes = [];
  if (tot.ARS) partes.push(fmtMonto(tot.ARS, 'ARS'));
  if (tot.USD) partes.push(fmtMonto(tot.USD, 'USD'));
  document.getElementById(`${cfg.pref}-total-sum`).textContent = partes.length ? partes.join(' · ') : '$ 0';
  document.getElementById(`${cfg.pref}-cant`).textContent = notas.length + ' nota' + (notas.length !== 1 ? 's' : '');

  tbody.innerHTML = notas.map(r => {
    const e = JSON.parse(r.observaciones || '{}');
    const mon = e.moneda || 'ARS';
    return `<tr>
      <td>${fmtFecha(r.fecha)}</td>
      <td><strong>${r.proveedor || '—'}</strong></td>
      <td style="font-size:11px">${e.numero_comprobante || '—'}</td>
      <td style="font-size:11px">${e.factura_asociada || '—'}</td>
      <td>${r.concepto || '—'}</td>
      <td>${fmtMonto(e.subtotal, mon)}</td>
      <td>${fmtMonto(e.iva, mon)}</td>
      <td><strong>${fmtMonto(r.monto, mon)}</strong></td>
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarNota('${r.id}','${tipo}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

async function borrarNota(id, tipo) {
  if (!confirm('¿Borrar esta nota?')) return;
  await sb('DELETE', 'boletas', '', `?id=eq.${id}`);
  toast('🗑️ Nota borrada');
  cargarNotas(tipo);
}
