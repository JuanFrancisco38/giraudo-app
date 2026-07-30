const RUBROS_PRECIOS = ['Agroquímicos','Semillas','Fertilizantes','Combustibles y Lubricantes','Fletes','Insumos Varios','Reparaciones','Repuestos','Servicios Rurales','Servicios Varios','Insumos Veterinarios','Otro'];
const UNIDADES_PRECIOS = ['','kg','lts','tt','unidad','bolsa','tn'];

function normCamp(c) {
  return (c || '').split('/').map(p => p.trim().replace(/^20(\d\d)$/, '$1')).join('/');
}

let tablaPreciosTodos = [];
let tablaPreciosCampania = '';
let tipoCambioHoy = 0;
try { tipoCambioHoy = parseFloat(localStorage.getItem('tc_dolar') || '0') || 0; } catch(e) {}

async function fetchTipoCambio() {
  const btn = document.getElementById('btn-tp-tc');
  try {
    btn.textContent = '⏳';
    const res = await fetch('https://dolarapi.com/v1/dolares/oficial');
    const data = await res.json();
    const tc = data.venta || data.promedio || 0;
    if (tc) {
      tipoCambioHoy = tc;
      try { localStorage.setItem('tc_dolar', tc); } catch(e) {}
      document.getElementById('tp-tc').value = tc;
      renderTablaPrecios();
      toast(`✅ TC actualizado: $${tc}`);
    }
  } catch(e) {
    toast('No se pudo obtener el TC automático', 'var(--tierra)');
  }
  btn.textContent = '🔄';
}

function actualizarTC() {
  tipoCambioHoy = parseFloat(document.getElementById('tp-tc').value) || 0;
  try { localStorage.setItem('tc_dolar', tipoCambioHoy); } catch(e) {}
  renderTablaPrecios();
}

async function cargarTablaPrecios() {
  // Restaurar TC guardado
  try {
    const tcGuardado = parseFloat(localStorage.getItem('tc_dolar') || '0') || 0;
    if (tcGuardado) tipoCambioHoy = tcGuardado;
  } catch(e) {}
  if (tipoCambioHoy) document.getElementById('tp-tc').value = tipoCambioHoy;
  const rows = await sb('GET', 'tabla_precios', '', '?order=rubro,producto');
  tablaPreciosTodos = rows || [];
  const camps = [...new Set(tablaPreciosTodos.map(r => normCamp(r.campania)).filter(Boolean))].sort();
  const sel = document.getElementById('tp-filtro-campania');
  const actual = sel.value;
  sel.innerHTML = '<option value="">Todas las campañas</option>' + camps.map(c => `<option${c===actual?' selected':''}>${c}</option>`).join('');
  if (!actual && camps.length) sel.value = camps[camps.length - 1]; // más reciente por defecto
  tablaPreciosCampania = sel.value;
  renderTablaPrecios();
}

function renderTablaPrecios() {
  tablaPreciosCampania = document.getElementById('tp-filtro-campania').value;
  const fBusca = (document.getElementById('tp-filtro-busca')?.value || '').toLowerCase();
  const fRubro = document.getElementById('tp-filtro-rubro')?.value || '';
  const rows = tablaPreciosTodos.filter(r => {
    if (tablaPreciosCampania && normCamp(r.campania) !== tablaPreciosCampania) return false;
    if (fRubro && r.rubro !== fRubro) return false;
    if (fBusca && !(r.producto || '').toLowerCase().includes(fBusca)) return false;
    return true;
  });

  const tbody = document.getElementById('tabla-precios-body');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">💰</div><h3>Sin precios para esta campaña</h3><p>Sincronizá desde facturas o agregá uno manualmente</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const precio = r.precio != null ? Number(r.precio) : null;
    const moneda = r.moneda || 'ARS';
    const tc = tipoCambioHoy;
    let precioARS = null, precioUSD = null;
    if (precio != null) {
      if (moneda === 'ARS') { precioARS = precio; precioUSD = tc ? precio / tc : null; }
      else                  { precioUSD = precio; precioARS = tc ? precio * tc : null; }
    }
    const fmtARS = v => v != null ? '$ ' + v.toLocaleString('es-AR', {minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
    const fmtUSD = v => v != null ? 'U$D ' + v.toLocaleString('es-AR', {minimumFractionDigits:2,maximumFractionDigits:2}) : (tc ? '—' : 'sin TC');
    const origenBadge = r.origen === 'factura'
      ? '<span class="badge badge-blue" style="font-size:10px">Factura</span>'
      : '<span class="badge badge-gris" style="font-size:10px">Manual</span>';
    return `<tr>
      <td>${inputTP(r.id,'producto',r.producto,160)}</td>
      <td>${selectTP(r.id,'rubro',r.rubro)}</td>
      <td>${selectTPUnidad(r.id,'unidad',r.unidad)}</td>
      <td style="text-align:right">${inputTPNum(r.id,'precio',precio,90)}</td>
      <td>${selectTPMoneda(r.id,'moneda',moneda)}</td>
      <td style="text-align:right;color:var(--verde);font-weight:600;font-size:13px">${fmtARS(precioARS)}</td>
      <td style="text-align:right;color:#1a6abf;font-weight:600;font-size:13px">${fmtUSD(precioUSD)}</td>
      <td>${inputTP(r.id,'campania',r.campania,70)}</td>
      <td style="text-align:center">${origenBadge}</td>
      <td><button class="btn btn-secondary" style="padding:3px 8px;font-size:12px" onclick="borrarPrecio('${r.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

function inputTP(id, campo, valor, ancho) {
  return `<input type="text" value="${(valor||'').replace(/"/g,'&quot;')}" style="width:${ancho}px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 5px;font-size:12px" onchange="editarPrecio('${id}','${campo}',this.value)">`;
}
function inputTPNum(id, campo, valor, ancho) {
  const v = valor != null ? valor : '';
  return `<input type="number" value="${v}" step="any" style="width:${ancho}px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 5px;font-size:12px;text-align:right" onchange="editarPrecio('${id}','${campo}',parseFloat(this.value)||null)">`;
}
function selectTP(id, campo, valor) {
  const opts = RUBROS_PRECIOS.map(r => `<option${r===valor?' selected':''}>${r}</option>`).join('');
  return `<select style="font-size:12px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 4px" onchange="editarPrecio('${id}','${campo}',this.value)">${opts}</select>`;
}
function selectTPUnidad(id, campo, valor) {
  const opts = UNIDADES_PRECIOS.map(u => `<option value="${u}"${u===(valor||'')?' selected':''}>${u||'—'}</option>`).join('');
  return `<select style="font-size:12px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 4px" onchange="editarPrecio('${id}','${campo}',this.value)">${opts}</select>`;
}
function selectTPMoneda(id, campo, valor) {
  return `<select style="font-size:12px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 4px" onchange="editarPrecio('${id}','${campo}',this.value)">
    <option${valor==='ARS'?' selected':''}>ARS</option>
    <option${valor==='USD'?' selected':''}>USD</option>
  </select>`;
}

async function editarPrecio(id, campo, valor) {
  const r = await sb('PATCH', 'tabla_precios', { [campo]: valor }, `?id=eq.${id}`);
  if (r) {
    const row = tablaPreciosTodos.find(x => x.id === id);
    if (row) row[campo] = valor;
    toast('✅ Actualizado');
  } else toast('❌ Error', 'var(--rojo)');
}

async function borrarPrecio(id) {
  if (!confirm('¿Borrar este precio?')) return;
  await sb('DELETE', 'tabla_precios', '', `?id=eq.${id}`);
  toast('🗑️ Borrado');
  cargarTablaPrecios();
}

function abrirFormNuevoPrecio() {
  const f = document.getElementById('tp-form-nuevo');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (f.style.display === 'block') {
    document.getElementById('tp-nuevo-campania').value = tablaPreciosCampania || '';
  }
}

async function guardarNuevoPrecio() {
  const data = {
    producto: document.getElementById('tp-nuevo-producto').value.trim(),
    rubro: document.getElementById('tp-nuevo-rubro').value,
    unidad: document.getElementById('tp-nuevo-unidad').value,
    precio: parseFloat(document.getElementById('tp-nuevo-precio').value) || null,
    moneda: document.getElementById('tp-nuevo-moneda').value,
    campania: document.getElementById('tp-nuevo-campania').value.trim(),
    origen: 'manual',
  };
  if (!data.producto) { toast('Ingresá el nombre del producto', 'var(--tierra)'); return; }
  const r = await sb('POST', 'tabla_precios', data);
  if (r) {
    toast('✅ Precio agregado');
    document.getElementById('tp-form-nuevo').style.display = 'none';
    ['tp-nuevo-producto','tp-nuevo-precio','tp-nuevo-campania'].forEach(id => document.getElementById(id).value = '');
    cargarTablaPrecios();
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

async function sincronizarDesdeFacturas() {
  const campania = document.getElementById('tp-filtro-campania').value;
  const btn = document.getElementById('btn-tp-sincronizar');
  btn.disabled = true; btn.textContent = '⏳ Sincronizando...';

  // Leer todas las boletas recibidas
  const boletas = await sb('GET', 'boletas', '', '');
  const recibidas = (boletas || []).filter(b => {
    try {
      const e = JSON.parse(b.observaciones || '{}');
      const tipOk = !e.tipo_factura || e.tipo_factura === 'recibida';
      if (!tipOk) return false;
      if (!campania) return true; // sin filtro de campaña → todas
      const campNorm = (e.campania || '').replace(/20(\d\d)/g,'$1').trim();
      const filtNorm = campania.replace(/20(\d\d)/g,'$1').trim();
      return campNorm === filtNorm;
    } catch(e) { return false; }
  });

  // Agrupar por producto+rubro+unidad+campaña → promedio de precios
  const grupos = {};
  recibidas.forEach(b => {
    if (!b.concepto) return;
    let obs = {};
    try { obs = JSON.parse(b.observaciones || '{}'); } catch(e) {}
    const camp = normCamp(obs.campania || '');
    const conceptoNorm = (b.concepto||'').trim().toLowerCase().replace(/\s+/g,' ');
    const clave = `${conceptoNorm}||${b.categoria||''}||${obs.unidad||''}||${camp}`;
    if (!grupos[clave]) grupos[clave] = {
      producto: (b.concepto||'').trim(), rubro: b.categoria||'',
      unidad: obs.unidad||'', moneda: obs.moneda_costo||'ARS',
      campania: camp, precios: []
    };
    // precio unitario: usar costo_unitario si existe, si no calcular de monto/cantidad
    let pu = Number(obs.costo_unitario) || 0;
    if (!pu && b.monto && obs.cantidad) pu = Number(b.monto) / Number(obs.cantidad);
    if (pu > 0) grupos[clave].precios.push(pu);
  });

  // Borrar registros anteriores de origen 'factura' para evitar duplicados
  const queryBorrar = campania ? `?origen=eq.factura&campania=eq.${encodeURIComponent(campania)}` : '?origen=eq.factura';
  await sb('DELETE', 'tabla_precios', null, queryBorrar);

  let ok = 0;
  for (const g of Object.values(grupos)) {
    const promedio = g.precios.length ? g.precios.reduce((a,b) => a+b, 0) / g.precios.length : null;
    const r = await sb('POST', 'tabla_precios', {
      producto: g.producto, rubro: g.rubro, unidad: g.unidad,
      precio: promedio != null ? Math.round(promedio * 100) / 100 : null,
      moneda: g.moneda, campania: g.campania, origen: 'factura'
    });
    if (r) ok++;
  }

  toast(ok ? `✅ ${ok} productos sincronizados desde facturas` : '❌ Error al guardar');
  btn.disabled = false; btn.textContent = '🔄 Sincronizar desde facturas';
  cargarTablaPrecios();
}
