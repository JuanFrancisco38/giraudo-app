const CATEGORIAS_HACIENDA = ['Terneros invernada','Terneras invernada','Vacas invernada','Vacas preñadas','Vaquillonas invernada','Novillos','Toros'];

let lhArchivoActual = null;
let liqhacTodas = [];
let liqhacPagina = 1;
let lhItemSeq = 0;

function irPaginaLiqHac(p) { liqhacPagina = p; renderLiqHacienda(); window.scrollTo({ top: document.getElementById('section-liq_hacienda').offsetTop, behavior: 'smooth' }); }

function abrirFormLiqHac() {
  const form = document.getElementById('form-liqhac');
  const abriendo = form.style.display === 'none' || !form.style.display;
  toggleForm('form-liqhac');
  if (abriendo && !document.querySelector('#lh-items .lh-item')) agregarItemLiqHac();
}

function catOptionsHac(sel) {
  return CATEGORIAS_HACIENDA.map(c => `<option${c === sel ? ' selected' : ''}>${c}</option>`).join('');
}

function agregarItemLiqHac(d = {}) {
  const i = ++lhItemSeq;
  const cont = document.getElementById('lh-items');
  const div = document.createElement('div');
  div.className = 'lh-item';
  div.id = `lh-item-${i}`;
  div.style.cssText = 'border:1px solid var(--gris-borde);border-radius:8px;padding:12px;margin-bottom:10px;background:var(--bordo-claro)';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:12px;font-weight:600;color:var(--bordo)">Categoría</span>
      <button type="button" class="btn btn-secondary" style="padding:2px 8px;font-size:12px" onclick="document.getElementById('lh-item-${i}').remove()">✕ Quitar</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Categoría</label><select class="li-cat">${catOptionsHac(d.categoria)}</select></div>
      <div class="form-group"><label>Cabezas</label><input type="number" class="li-cab" value="${d.cabezas||''}"></div>
      <div class="form-group"><label>Kg totales</label><input type="number" step="any" class="li-kg" value="${d.kg_totales||''}"></div>
      <div class="form-group"><label>Precio ($/kg o $/cab)</label><input type="number" step="any" class="li-precio" value="${d.precio||''}"></div>
      <div class="form-group"><label>Importe $</label><input type="number" step="any" class="li-sub" value="${d.subtotal||''}"></div>
      <div class="form-group"><label>Comisión $</label><input type="number" step="any" class="li-com" value="${d.comision||''}"></div>
      <div class="form-group"><label>IVA $</label><input type="number" step="any" class="li-iva" value="${d.iva||''}"></div>
      <div class="form-group"><label>Retención $</label><input type="number" step="any" class="li-gan" value="${d.ret_ganancias||''}"></div>
      <div class="form-group"><label>Total a cobrar $</label><input type="number" step="any" class="li-neto" value="${d.total_neto||''}" style="font-weight:600"></div>
    </div>`;
  cont.appendChild(div);
  return div;
}

function leerItemsLiqHac() {
  return [...document.querySelectorAll('#lh-items .lh-item')].map(item => ({
    categoria: item.querySelector('.li-cat').value,
    cabezas: parseInt(item.querySelector('.li-cab').value) || null,
    kg_totales: parseFloat(item.querySelector('.li-kg').value) || null,
    precio: parseFloat(item.querySelector('.li-precio').value) || null,
    subtotal: parseFloat(item.querySelector('.li-sub').value) || null,
    comision: parseFloat(item.querySelector('.li-com').value) || null,
    iva: parseFloat(item.querySelector('.li-iva').value) || null,
    ret_ganancias: parseFloat(item.querySelector('.li-gan').value) || null,
    total_neto: parseFloat(item.querySelector('.li-neto').value) || null
  }));
}

async function procesarLiqHaciendaDoc(input) {
  const file = input.files[0];
  if (!file) return;
  lhArchivoActual = file;
  const status = document.getElementById('lh-doc-status');
  status.textContent = `📄 Leyendo ${file.name}...`;
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable agropecuario argentino experto en liquidaciones de venta de hacienda (consignatarios como Ferialvarez, Gananor Pujol, Central Ganadera, etc.). Leé TODO el documento y extraé cada dato.
MUY IMPORTANTE: una liquidación puede tener VARIAS categorías de animales (terneros, vacas, vaquillonas, etc.). Devolvé UN ítem por cada categoría en el array "items". NO las mezcles ni las sumes en una sola.
Para cada ítem (categoría):
- "categoria": elegí la que corresponda (ej: Terneros invernada, Vacas preñadas, Vaquillonas invernada, Novillos, Toros, etc.).
- "cabezas": cantidad de animales de esa categoría.
- "kg_totales": kilos totales de esa categoría.
- "precio": precio unitario ($/kg o $/cabeza).
- "subtotal": IMPORTE bruto de esa categoría antes de deducciones.
- "comision", "iva", "ret_ganancias" (retención): si la liquidación los discrimina por categoría usá ese valor; si son globales, prorratealos o ponelos en el ítem principal.
- "total_neto": total a cobrar de esa categoría.
Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"fecha":"DD/MM/YYYY","numero":"string (N° de liquidación)","consignatario":"string","items":[{"categoria":"","cabezas":0,"kg_totales":0,"precio":0,"subtotal":0,"comision":0,"iva":0,"ret_ganancias":0,"total_neto":0}]}
Montos como número sin símbolos ni puntos de miles. Si un dato no está, poné 0 o "".`,
      'Extraé los datos de esta liquidación de hacienda, un ítem por cada categoría de animales.');

    if (datos.fecha) document.getElementById('lh-fecha').value = parseFechaIA(datos.fecha);
    if (datos.numero) document.getElementById('lh-num').value = datos.numero;
    if (datos.consignatario) document.getElementById('lh-cons').value = datos.consignatario;

    document.getElementById('lh-items').innerHTML = '';
    lhItemSeq = 0;
    const items = Array.isArray(datos.items) && datos.items.length ? datos.items : [{}];
    items.forEach(it => agregarItemLiqHac(it));

    status.textContent = `✅ ${file.name} leída — ${items.length} categoría(s). Revisá y guardá`;
    toast(`✅ Documento leído — ${items.length} categoría(s)`);
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    toast('❌ Error al leer el documento', 'var(--rojo)');
  }
}

async function guardarLiqHacienda() {
  const fecha = document.getElementById('lh-fecha').value;
  const numero = document.getElementById('lh-num').value;
  const consignatario = document.getElementById('lh-cons').value;
  const items = leerItemsLiqHac();
  if (!fecha) { toast('Completá la fecha', 'var(--tierra)'); return; }
  if (!items.length || !items.some(it => it.total_neto || it.subtotal)) { toast('Agregá al menos una categoría con monto', 'var(--tierra)'); return; }

  if (numero) {
    const existentes = await sb('GET', 'liquidaciones_hacienda', '', `?numero=eq.${encodeURIComponent(numero)}`);
    if (existentes && existentes.length && !confirm(`⚠️ Ya existe una liquidación con el N° "${numero}". ¿Querés guardarla igual?`)) {
      toast('Guardado cancelado — posible duplicado', 'var(--tierra)');
      return;
    }
  }

  let archivoUrl = null;
  if (lhArchivoActual) {
    toast('⏳ Subiendo documento...');
    archivoUrl = await subirArchivo(lhArchivoActual);
    if (!archivoUrl) toast('⚠️ No se pudo subir el documento (se guarda igual)', 'var(--tierra)');
  }

  let ok = 0;
  for (const it of items) {
    const data = { fecha, numero, consignatario, archivo_url: archivoUrl, ...it };
    const r = await sb('POST', 'liquidaciones_hacienda', data);
    if (r) ok++;
  }

  if (ok) {
    toast(`✅ Liquidación registrada — ${ok} categoría(s)`);
    toggleForm('form-liqhac');
    document.getElementById('lh-archivo').value = '';
    document.getElementById('lh-doc-status').textContent = '';
    lhArchivoActual = null;
    ['lh-num','lh-cons'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('lh-items').innerHTML = '';
    cargarLiqHacienda();
  } else toast('❌ Error', 'var(--rojo)');
}

async function cargarLiqHacienda() {
  liqhacTodas = await sb('GET', 'liquidaciones_hacienda', '', '?order=fecha.desc') || [];
  renderLiqHacienda();
}

function renderLiqHacienda() {
  const rows = liqhacTodas;
  const tbody = document.getElementById('tabla-liqhac');
  if (!tbody) return;

  // Resumen dinámico
  const porCat = {};
  const res = (rows || []).reduce((a, l) => {
    a.cabezas += l.cabezas || 0;
    a.neto += l.total_neto || 0;
    a.gan += l.ret_ganancias || 0;
    a.importe += l.subtotal || 0;
    a.kg += l.kg_totales || 0;
    if (l.consignatario) a.cons.add(l.consignatario);
    const cat = l.categoria || 'Sin categoría';
    if (!porCat[cat]) porCat[cat] = { cabezas: 0, kg: 0, importe: 0 };
    porCat[cat].cabezas += l.cabezas || 0;
    porCat[cat].kg += l.kg_totales || 0;
    porCat[cat].importe += l.subtotal || 0;
    return a;
  }, { cabezas: 0, neto: 0, gan: 0, importe: 0, kg: 0, cons: new Set() });
  document.getElementById('lh-res-cabezas').textContent = fmtNum(res.cabezas);
  document.getElementById('lh-res-neto').textContent = fmtMonto(res.neto, 'ARS');
  document.getElementById('lh-res-gan').textContent = fmtMonto(res.gan, 'ARS');
  document.getElementById('lh-res-precio').textContent = res.kg ? fmtMonto(res.importe / res.kg, 'ARS') + '/kg' : '$0/kg';
  document.getElementById('lh-res-cons').textContent = res.cons.size ? [...res.cons].join(' / ') : '—';

  const contCat = document.getElementById('lh-res-categorias');
  if (contCat) {
    const cats = Object.entries(porCat).sort((a, b) => b[1].cabezas - a[1].cabezas);
    contCat.innerHTML = cats.length ? cats.map(([cat, v]) => {
      const precioProm = v.kg ? fmtMonto(v.importe / v.kg, 'ARS') + '/kg' : '—';
      return `<div style="background:#fff;border:1px solid var(--bordo-suave);border-radius:8px;padding:10px">
        <div style="font-size:12px;color:var(--bordo);font-weight:600;margin-bottom:4px">${cat}</div>
        <div style="font-size:15px;font-weight:700;color:var(--bordo)">${fmtNum(v.cabezas)} cab.</div>
        <div style="font-size:12px;color:var(--texto-suave);margin-top:2px">${fmtKg(v.kg)} · ${precioProm}</div>
      </div>`;
    }).join('') : '<div style="font-size:12px;color:var(--texto-suave)">Sin datos.</div>';
  }

  const pag = document.getElementById('liqhac-paginador');
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="14"><div class="empty-state"><div class="icon">📄</div><h3>Sin liquidaciones</h3></div></td></tr>';
    if (pag) pag.innerHTML = '';
    return;
  }
  const totalPag = Math.ceil(rows.length / FILAS_POR_PAGINA) || 1;
  if (liqhacPagina > totalPag) liqhacPagina = totalPag;
  const pagina = rows.slice((liqhacPagina - 1) * FILAS_POR_PAGINA, liqhacPagina * FILAS_POR_PAGINA);
  if (pag) pag.innerHTML = htmlPaginador(liqhacPagina, rows.length, 'irPaginaLiqHac');
  tbody.innerHTML = pagina.map(l => {
    const kgAnimal = (l.kg_totales && l.cabezas) ? l.kg_totales / l.cabezas : null;
    return `
    <tr>
      <td>${fmtFecha(l.fecha)}</td>
      <td>${l.numero || '—'}</td>
      <td><input type="text" value="${(l.consignatario||'').replace(/"/g,'&quot;')}" placeholder="—" list="consignatarios-list" onchange="editarConsignatario('${l.id}', this.value)" style="width:150px;font-size:12px;padding:3px 5px;border:1px solid var(--gris-borde);border-radius:4px"></td>
      <td>${l.cabezas || '—'}</td>
      <td><span class="badge badge-bordo">${l.categoria || '—'}</span></td>
      <td>${l.kg_totales ? fmtKg(l.kg_totales) : '—'}</td>
      <td>${kgAnimal ? fmtKg(Math.round(kgAnimal)) : '—'}</td>
      <td>${l.precio ? fmtMonto(l.precio, 'ARS') : '—'}</td>
      <td>${l.subtotal ? fmtMonto(l.subtotal, 'ARS') : '—'}</td>
      <td>${l.comision ? fmtMonto(l.comision, 'ARS') : '—'}</td>
      <td>${l.iva ? fmtMonto(l.iva, 'ARS') : '—'}</td>
      <td>${l.ret_ganancias ? fmtMonto(l.ret_ganancias, 'ARS') : '—'}</td>
      <td><strong>${l.total_neto ? fmtMonto(l.total_neto, 'ARS') : '—'}</strong></td>
      <td style="white-space:nowrap">${l.archivo_url ? `<a class="btn btn-secondary" style="padding:4px 8px;font-size:12px;text-decoration:none" href="${l.archivo_url}" target="_blank" rel="noopener" title="Ver documento">👁️</a> ` : ''}<button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarLiqHacienda('${l.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

async function editarConsignatario(id, valor) {
  const r = await sb('PATCH', 'liquidaciones_hacienda', { consignatario: valor }, `?id=eq.${id}`);
  if (r !== null) {
    const row = liqhacTodas.find(l => l.id === id);
    if (row) row.consignatario = valor;
    renderLiqHacienda();
    toast('✅ Consignatario guardado');
  } else toast('❌ No se pudo guardar', 'var(--rojo)');
}

async function borrarLiqHacienda(id) {
  if (!confirm('¿Borrar esta liquidación? Esta acción no se puede deshacer.')) return;
  await sb('DELETE', 'liquidaciones_hacienda', '', `?id=eq.${id}`);
  toast('🗑️ Liquidación borrada');
  cargarLiqHacienda();
}
