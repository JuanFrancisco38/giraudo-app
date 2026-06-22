const NOTA_CFG = {
  nota_credito: { pref: 'nc', signo: -1, label: 'nota de crédito' },
  nota_debito:  { pref: 'nd', signo:  1, label: 'nota de débito' }
};

const notaState = {
  nota_credito: { todas: [], pagina: 1, archivo: null, itemSeq: 0 },
  nota_debito:  { todas: [], pagina: 1, archivo: null, itemSeq: 0 }
};

function abrirFormNota(tipo) {
  const cfg = NOTA_CFG[tipo];
  const form = document.getElementById(`form-${cfg.pref}`);
  const abriendo = form.style.display === 'none' || !form.style.display;
  toggleForm(`form-${cfg.pref}`);
  if (abriendo && !document.querySelector(`#${cfg.pref}-items .nota-item`)) agregarItemNota(tipo);
}

function agregarItemNota(tipo, d = {}) {
  const cfg = NOTA_CFG[tipo];
  const st = notaState[tipo];
  const i = ++st.itemSeq;
  const cont = document.getElementById(`${cfg.pref}-items`);
  const div = document.createElement('div');
  div.className = 'nota-item';
  div.id = `${cfg.pref}-item-${i}`;
  div.style.cssText = 'border:1px solid var(--gris-borde);border-radius:8px;padding:12px;margin-bottom:10px;background:var(--bordo-claro)';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:12px;font-weight:600;color:var(--bordo)">Ítem</span>
      <button type="button" class="btn btn-secondary" style="padding:2px 8px;font-size:12px" onclick="document.getElementById('${cfg.pref}-item-${i}').remove()">✕ Quitar</button>
    </div>
    <div class="form-grid">
      <div class="form-group full"><label>Descripción / Motivo</label><input type="text" class="ni-desc" value="${(d.descripcion||'').replace(/"/g,'&quot;')}" placeholder="Ej: Descuento por flete no realizado"></div>
      <div class="form-group"><label>Moneda</label><select class="ni-moneda"><option value="ARS"${(d.moneda||'ARS')==='ARS'?' selected':''}>Pesos ($)</option><option value="USD"${d.moneda==='USD'?' selected':''}>Dólares (U$D)</option></select></div>
      <div class="form-group"><label>Subtotal</label><input type="number" step="any" class="ni-sub" value="${d.subtotal||''}" oninput="calcIvaItemNota(this)"></div>
      <div class="form-group"><label>% IVA</label><select class="ni-pctiva" onchange="calcIvaItemNota(this)">
        <option value="21"${Number(d.pct_iva)===21||d.pct_iva==null?' selected':''}>21%</option>
        <option value="10.5"${Number(d.pct_iva)===10.5?' selected':''}>10,5%</option>
        <option value="0"${Number(d.pct_iva)===0?' selected':''}>Exento</option>
      </select></div>
      <div class="form-group"><label>IVA</label><input type="number" step="any" class="ni-iva" value="${d.iva||''}"></div>
      <div class="form-group"><label>Total</label><input type="number" step="any" class="ni-total" value="${d.total||''}" style="font-weight:600"></div>
    </div>`;
  cont.appendChild(div);
  return div;
}

function calcIvaItemNota(el) {
  const item = el.closest('.nota-item');
  const sub = parseFloat(item.querySelector('.ni-sub').value) || 0;
  const pct = parseFloat(item.querySelector('.ni-pctiva').value) || 0;
  if (sub) {
    const iva = Math.round(sub * pct / 100 * 100) / 100;
    item.querySelector('.ni-iva').value = iva;
    item.querySelector('.ni-total').value = Math.round((sub + iva) * 100) / 100;
  }
}

function leerItemsNota(tipo) {
  const cfg = NOTA_CFG[tipo];
  return [...document.querySelectorAll(`#${cfg.pref}-items .nota-item`)].map(item => ({
    descripcion: item.querySelector('.ni-desc').value,
    moneda: item.querySelector('.ni-moneda').value,
    subtotal: parseFloat(item.querySelector('.ni-sub').value) || 0,
    pct_iva: parseFloat(item.querySelector('.ni-pctiva').value) || 0,
    iva: parseFloat(item.querySelector('.ni-iva').value) || 0,
    total: parseFloat(item.querySelector('.ni-total').value) || 0
  }));
}

async function procesarNotaDoc(input, tipo) {
  const file = input.files[0];
  if (!file) return;
  const cfg = NOTA_CFG[tipo];
  const st = notaState[tipo];
  st.archivo = file;
  const status = document.getElementById(`${cfg.pref}-doc-status`);
  status.textContent = `📄 Leyendo ${file.name}...`;
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable agropecuario argentino. Analizá esta ${cfg.label.toUpperCase()} recibida y extraé los datos.
MUY IMPORTANTE: la nota puede tener VARIOS conceptos/renglones. Devolvé UN ítem por cada concepto en el array "items". NO los juntes en uno solo.
Para cada ítem: "descripcion" (motivo del ajuste), "moneda" (ARS o USD; detectá si dice U$D/USD/US$), "subtotal", "pct_iva" (21, 10.5 o 0 exento), "iva", "total" de ese renglón.
Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"fecha":"DD/MM/YYYY","numero":"string (N° comprobante)","proveedor":"string","cuit_proveedor":"string","factura_asociada":"string (N° de factura que ajusta)","items":[{"descripcion":"","moneda":"ARS|USD","subtotal":0,"pct_iva":21,"iva":0,"total":0}]}
Los montos en números positivos sin símbolos ni puntos de miles. Si un dato no está, poné 0 o "".`,
      `Extraé los datos de esta ${cfg.label}, un ítem por cada concepto.`);

    const g = id => document.getElementById(`${cfg.pref}-${id}`);
    if (datos.fecha) g('fecha').value = parseFechaIA(datos.fecha);
    if (datos.numero) g('num').value = datos.numero;
    if (datos.proveedor) g('prov').value = datos.proveedor;
    if (datos.cuit_proveedor) g('cuit').value = datos.cuit_proveedor;
    if (datos.factura_asociada) g('fact').value = datos.factura_asociada;

    document.getElementById(`${cfg.pref}-items`).innerHTML = '';
    st.itemSeq = 0;
    const items = Array.isArray(datos.items) && datos.items.length ? datos.items : [{}];
    items.forEach(it => agregarItemNota(tipo, it));

    status.textContent = `✅ ${file.name} leída — ${items.length} ítem(s). Revisá y guardá`;
    toast(`✅ Documento leído — ${items.length} ítem(s)`);
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

async function guardarNota(tipo) {
  const cfg = NOTA_CFG[tipo];
  const st = notaState[tipo];
  const g = id => document.getElementById(`${cfg.pref}-${id}`);
  const fecha = g('fecha').value;
  const items = leerItemsNota(tipo);
  if (!fecha) { toast('Completá la fecha', 'var(--tierra)'); return; }
  if (!items.length || !items.some(it => it.total || it.subtotal)) { toast('Agregá al menos un ítem con monto', 'var(--tierra)'); return; }

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

  let archivoUrl = null;
  if (st.archivo) {
    toast('⏳ Subiendo documento...');
    archivoUrl = await subirArchivo(st.archivo);
    if (!archivoUrl) toast('⚠️ No se pudo subir el documento (se guarda igual)', 'var(--tierra)');
  }

  const cab = {
    fecha,
    proveedor: g('prov').value,
    cuit_proveedor: g('cuit').value,
    numero_comprobante: numero,
    factura_asociada: g('fact').value
  };

  let ok = 0;
  for (const it of items) {
    const data = {
      fecha: cab.fecha,
      proveedor: cab.proveedor,
      concepto: it.descripcion,
      monto: cfg.signo * it.total,
      categoria: cfg.label,
      archivo_url: archivoUrl,
      observaciones: JSON.stringify({
        tipo_factura: tipo,
        cuit_proveedor: cab.cuit_proveedor,
        numero_comprobante: cab.numero_comprobante,
        factura_asociada: cab.factura_asociada,
        moneda: it.moneda,
        subtotal: it.subtotal,
        pct_iva: it.pct_iva,
        iva: it.iva
      })
    };
    const r = await sb('POST', 'boletas', data);
    if (r) ok++;
  }

  if (ok) {
    toast(`✅ ${cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)} registrada — ${ok} ítem(s)`);
    toggleForm(`form-${cfg.pref}`);
    document.getElementById(`${cfg.pref}-result`).style.display = 'none';
    document.getElementById(`${cfg.pref}-doc-status`).textContent = '';
    g('archivo').value = '';
    st.archivo = null;
    ['num','prov','cuit','fact'].forEach(id => g(id).value = '');
    document.getElementById(`${cfg.pref}-items`).innerHTML = '';
    cargarNotas(tipo);
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

function filtrarNotaReset(tipo) { notaState[tipo].pagina = 1; renderNotas(tipo); }
function irPaginaNota(tipo, p) { notaState[tipo].pagina = p; renderNotas(tipo); window.scrollTo({ top: document.getElementById(`section-${tipo === 'nota_credito' ? 'notas_credito' : 'notas_debito'}`).offsetTop, behavior: 'smooth' }); }
function irPaginaNota_nc(p) { irPaginaNota('nota_credito', p); }
function irPaginaNota_nd(p) { irPaginaNota('nota_debito', p); }

async function cargarNotas(tipo) {
  const rows = await sb('GET', 'boletas', '', '?order=fecha.desc');
  notaState[tipo].todas = (rows || []).filter(r => {
    try { return JSON.parse(r.observaciones || '{}').tipo_factura === tipo; } catch(e) { return false; }
  });
  renderNotas(tipo);
}

function renderNotas(tipo) {
  const cfg = NOTA_CFG[tipo];
  const st = notaState[tipo];
  const tbody = document.getElementById(`tabla-${cfg.pref}`);
  if (!tbody) return;

  const fBusca = (document.getElementById(`${cfg.pref}-filtro-busca`)?.value || '').trim().toLowerCase();
  const notas = fBusca
    ? st.todas.filter(r => { let e = {}; try { e = JSON.parse(r.observaciones || '{}'); } catch(err) {} return `${r.proveedor || ''} ${e.numero_comprobante || ''}`.toLowerCase().includes(fBusca); })
    : st.todas;

  if (!notas.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="icon">📝</div><h3>${fBusca ? 'Sin resultados para la búsqueda' : `Sin ${cfg.label}s`}</h3></div></td></tr>`;
    document.getElementById(`${cfg.pref}-total-sum`).textContent = fmtMonto(0, 'ARS');
    document.getElementById(`${cfg.pref}-cant`).textContent = '0 ítems';
    document.getElementById(`${cfg.pref}-paginador`).innerHTML = '';
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
  document.getElementById(`${cfg.pref}-cant`).textContent = notas.length + ' ítem' + (notas.length !== 1 ? 's' : '');

  const totalPag = Math.ceil(notas.length / FILAS_POR_PAGINA) || 1;
  if (st.pagina > totalPag) st.pagina = totalPag;
  const pagina = notas.slice((st.pagina - 1) * FILAS_POR_PAGINA, st.pagina * FILAS_POR_PAGINA);
  document.getElementById(`${cfg.pref}-paginador`).innerHTML = htmlPaginador(st.pagina, notas.length, tipo === 'nota_credito' ? 'irPaginaNota_nc' : 'irPaginaNota_nd');

  tbody.innerHTML = pagina.map(r => {
    const e = JSON.parse(r.observaciones || '{}');
    const mon = e.moneda || 'ARS';
    const pctIva = (e.pct_iva === 0 || e.pct_iva === '0') ? 'Exento' : (e.pct_iva ? fmtNum(e.pct_iva, (Number(e.pct_iva) % 1) ? 1 : 0) + '%' : '—');
    return `<tr>
      <td>${fmtFecha(r.fecha)}</td>
      <td><strong>${r.proveedor || '—'}</strong></td>
      <td style="font-size:11px">${e.numero_comprobante || '—'}</td>
      <td style="font-size:11px">${e.factura_asociada || '—'}</td>
      <td>${r.concepto || '—'}</td>
      <td style="font-size:11px">${mon}</td>
      <td>${fmtMonto(e.subtotal, mon)}</td>
      <td style="font-size:11px">${pctIva}</td>
      <td>${fmtMonto(e.iva, mon)}</td>
      <td><strong>${fmtMonto(Math.abs(r.monto), mon)}</strong></td>
      <td style="white-space:nowrap">${r.archivo_url ? `<a class="btn btn-secondary" style="padding:4px 8px;font-size:12px;text-decoration:none" href="${r.archivo_url}" target="_blank" rel="noopener" title="Ver documento">👁️</a> ` : ''}<button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarNota('${r.id}','${tipo}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

async function borrarNota(id, tipo) {
  if (!confirm('¿Borrar este ítem de la nota?')) return;
  await sb('DELETE', 'boletas', '', `?id=eq.${id}`);
  toast('🗑️ Ítem borrado');
  cargarNotas(tipo);
}
