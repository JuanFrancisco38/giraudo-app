function filaInsumoTrabajoHTML() {
  return `<div class="insumo-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-end">
    <div class="form-group" style="flex:2;margin:0"><label style="font-size:11px">Insumo / Producto</label><input type="text" class="ins-desc"></div>
    <div class="form-group" style="flex:1;margin:0"><label style="font-size:11px">Dosis</label><input type="text" class="ins-dosis" placeholder="Ej: 3 lt/ha"></div>
    <div class="form-group" style="flex:1;margin:0"><label style="font-size:11px">Consumo total</label><input type="text" class="ins-consumo" placeholder="Ej: 270 lts"></div>
    <button type="button" class="btn btn-secondary" style="padding:6px 10px;font-size:12px" onclick="this.closest('.insumo-row').remove()">🗑️</button>
  </div>`;
}

function agregarInsumoTrabajo() {
  document.getElementById('tr-insumos-list').insertAdjacentHTML('beforeend', filaInsumoTrabajoHTML());
}

async function guardarTrabajo() {
  const header = {
    tipo: document.getElementById('tr-tipo').value,
    fecha: document.getElementById('tr-fecha').value,
    campo: document.getElementById('tr-campo').value,
    lote: document.getElementById('tr-lote').value,
    hectareas: parseFloat(document.getElementById('tr-has').value) || null,
    cultivo: document.getElementById('tr-cultivo').value,
    contratista: document.getElementById('tr-cont').value || 'Propio',
    campania: document.getElementById('tr-campania').value,
    rendimiento: parseFloat(document.getElementById('tr-rend').value) || null,
    rendimiento_unidad: document.getElementById('tr-rendunidad').value,
    precio_rendimiento: parseFloat(document.getElementById('tr-rendprecio').value) || null
  };
  const filas = [...document.querySelectorAll('#tr-insumos-list .insumo-row')];
  const insumos = filas.map(f => ({
    descripcion: f.querySelector('.ins-desc').value,
    dosis: f.querySelector('.ins-dosis').value,
    consumo_total: f.querySelector('.ins-consumo').value
  })).filter(i => i.descripcion || i.dosis || i.consumo_total);

  const registros = insumos.length ? insumos.map(i => ({ ...header, ...i })) : [{ ...header, descripcion: '', dosis: '', consumo_total: '' }];

  let ok = 0;
  for (const data of registros) {
    const r = await sb('POST', 'trabajos_agricolas', data);
    if (r) ok++;
  }
  if (ok) {
    toast(`✅ ${ok > 1 ? ok + ' renglones registrados' : 'Trabajo registrado'}`);
    toggleForm('form-trab');
    document.getElementById('tr-insumos-list').innerHTML = '';
    agregarInsumoTrabajo();
    cargarTrabajos();
  } else toast('❌ Error', 'var(--rojo)');
}

let trabajosTodos = [];
let trabajosPagina = 1;

function filtrarTrabajosReset() { trabajosPagina = 1; renderTrabajos(); }
function irPaginaTrabajos(p) { trabajosPagina = p; renderTrabajos(); window.scrollTo({ top: document.getElementById('section-trabajos_agri').offsetTop, behavior: 'smooth' }); }

async function cargarTrabajos() {
  const [rows] = await Promise.all([
    sb('GET', 'trabajos_agricolas', '', '?tipo=neq.alimentacion&order=fecha.desc'),
    cargarDatosCostosInsumos()
  ]);
  trabajosTodos = rows || [];
  renderTrabajos();
}

function renderTrabajos() {
  const tbody = document.getElementById('tabla-trabajos');
  if (!tbody) return;
  const fBusca = (document.getElementById('trab-filtro-busca')?.value || '').trim().toLowerCase();
  const fTipo = document.getElementById('trab-filtro-tipo')?.value || '';
  const rows = trabajosTodos.filter(t => {
    if (fTipo && t.tipo !== fTipo) return false;
    if (fBusca && !`${t.lote || ''} ${t.cultivo || ''} ${t.contratista || ''}`.toLowerCase().includes(fBusca)) return false;
    return true;
  });

  const pag = document.getElementById('trab-paginador');
  if (!rows.length) {
    const hayFiltro = fBusca || fTipo;
    tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><div class="icon">🌾</div><h3>${hayFiltro ? 'Sin resultados para el filtro' : 'Sin trabajos'}</h3></div></td></tr>`;
    if (pag) pag.innerHTML = '';
    return;
  }

  const totalPag = Math.ceil(rows.length / FILAS_POR_PAGINA) || 1;
  if (trabajosPagina > totalPag) trabajosPagina = totalPag;
  const pagina = rows.slice((trabajosPagina - 1) * FILAS_POR_PAGINA, trabajosPagina * FILAS_POR_PAGINA);
  if (pag) pag.innerHTML = htmlPaginador(trabajosPagina, rows.length, 'irPaginaTrabajos');

  const colors = {Siembra:'green',Pulverización:'blue',Fertilización:'yellow',Cosecha:'tierra',Henificación:'bordo'};
  tbody.innerHTML = pagina.map(t => {
    let precioUnit = t.precio_unitario;
    let cantidad = parseNumeroDeTexto(t.consumo_total) || parseNumeroDeTexto(t.dosis) * (t.hectareas || 0);
    if (precioUnit == null && t.descripcion) {
      const unidadTrabajo = parseUnidadDeTexto(t.consumo_total) || parseUnidadDeTexto(t.dosis);
      const r = buscarCostoUnitarioInsumo(t.descripcion, t.campania);
      if (r) {
        if (unidadTrabajo && r.unidad) cantidad = convertirCantidad(cantidad, unidadTrabajo, r.unidad);
        precioUnit = r.precio;
      }
    }
    const costoTotal = precioUnit != null && cantidad ? precioUnit * cantidad : null;
    return `
    <tr>
      <td>${fmtFecha(t.fecha)}</td>
      <td><span class="badge badge-${colors[t.tipo] || 'gray'}">${t.tipo}</span></td>
      <td>${t.campo || '—'}</td>
      <td>${inputEditableTrabajo(t.id, 'lote', t.lote, 50)}</td>
      <td>${t.hectareas ? t.hectareas + ' has' : '—'}</td>
      <td>${inputEditableTrabajo(t.id, 'cultivo', t.cultivo, 70)}</td>
      <td>${inputEditableTrabajo(t.id, 'contratista', t.contratista, 80)}</td>
      <td>${inputEditableTrabajo(t.id, 'descripcion', t.descripcion, 160)}</td>
      <td>${inputEditableTrabajo(t.id, 'dosis', t.dosis, 70, 'Ej: 3 lt/ha')}</td>
      <td>${inputEditableTrabajo(t.id, 'consumo_total', t.consumo_total, 80, 'Ej: 270 lts')}</td>
      <td>${inputEditableTrabajoNum(t.id, 'precio_unitario', precioUnit, 80)}</td>
      <td>${costoTotal ? fmtMonto(costoTotal, 'ARS') : '—'}</td>
      <td>${inputEditableTrabajo(t.id, 'campania', t.campania, 70, 'Ej: 25/26')}</td>
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarTrabajo('${t.id}')">🗑️</button></td>
    </tr>`;
  }).join('');
}

function inputEditableTrabajo(id, campo, valor, ancho, placeholder) {
  return `<input type="text" value="${valor || ''}" placeholder="${placeholder || ''}" style="width:${ancho}px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 5px;font-size:12px" onchange="editarCampoTrabajo('${id}', '${campo}', this.value)">`;
}

function inputEditableTrabajoNum(id, campo, valor, ancho) {
  const v = valor != null ? Math.round(valor * 100) / 100 : '';
  return `<span style="display:inline-flex;align-items:center;gap:3px"><span style="font-size:12px;color:var(--texto-suave)">$</span><input type="number" value="${v}" style="width:${ancho}px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 5px;font-size:12px" onchange="editarCampoTrabajo('${id}', '${campo}', parseFloat(this.value)||null)"></span>`;
}

async function editarCampoTrabajo(id, campo, valor) {
  const t = trabajosTodos.find(x => x.id === id);
  if (t) t[campo] = valor;
  const r = await sb('PATCH', 'trabajos_agricolas', { [campo]: valor }, `?id=eq.${id}`);
  if (r) toast('✅ Actualizado');
  else toast('❌ Error al actualizar', 'var(--rojo)');
}

async function borrarTrabajo(id) {
  if (!confirm('¿Borrar este trabajo? Esta acción no se puede deshacer.')) return;
  await sb('DELETE', 'trabajos_agricolas', '', `?id=eq.${id}`);
  toast('🗑️ Trabajo borrado');
  cargarTrabajos();
}

async function procesarTrabajoImagen(input) {
  const file = input.files[0];
  if (!file) return;
  const campo = document.getElementById('trt-campo').value;
  const fecha = document.getElementById('trt-fecha').value;
  const status = document.getElementById('trt-img-status');
  const result = document.getElementById('trt-result');
  status.textContent = `📷 Leyendo ${file.name}...`;
  result.style.display = 'block'; result.innerHTML = 'Analizando...';

  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente agropecuario del Grupo Giraudo, Argentina. Analizá esta foto o PDF de una planilla / cuaderno de campo con trabajos agrícolas anotados (a mano o impresos) y extraé cada trabajo. Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"trabajos":[{"tipo":"Siembra|Pulverización|Fertilización|Cosecha|Henificación|Enrollado|Labranza|Otro","fecha":"DD/MM/YYYY","campo":"string","lote":"string","hectareas":0,"cultivo":"string","contratista":"string","dosis":"string (ej: 3 lt/ha)","consumo_total":"string (ej: 270 lts)","campania":"string (ej: 25/26)","descripcion":"string"}]}
Campo por defecto si no se aclara: "${campo}". Fecha por defecto si no se aclara: "${fecha ? fecha.split('-').reverse().join('/') : ''}". Si hay varios trabajos anotados, devolvé un objeto por cada uno. Si un dato no está, poné "" o 0. Si NO se menciona contratista (es decir, si la planilla no aclara que el trabajo lo hizo un tercero/contratista), poné "Propio" en ese campo, asumiendo que lo hizo el Grupo Giraudo con maquinaria/personal propio.

EQUIVALENCIAS DE CAMPO: "AZ" o "Azcona" = "Don Alfredo (Azcona)". "DV", "Vica" o "Doña Vica" = "Doña Vica". "SY", "Sant-Yago" o "Santiago" = "Sant-Yago". Usá siempre el nombre completo del campo tal como figura en estas equivalencias.

LOTE: los lotes de Grupo Giraudo son SIEMPRE numéricos, sin letras. Si en la planilla aparece como "LT6", "Lote 6", "L6" o similar, extraé solo el número: "6". Nunca incluyas "LT", "L" ni "Lote" en el campo "lote".

REGLA OBLIGATORIA SOBRE PRODUCTOS MÚLTIPLES: nunca pongas más de un producto/insumo en el campo "descripcion", y nunca sumes o concatenes dosis de distintos productos en "dosis" ni "consumo_total". Si un mismo trabajo (misma fecha/campo/lote/tipo) usó VARIOS productos (ej: una pulverización con dos herbicidas, o una siembra con semilla + fertilizante), tenés que devolver UN OBJETO POR CADA PRODUCTO, repitiendo fecha/campo/lote/hectareas/cultivo/contratista/campania en cada uno, y usando "descripcion" para el nombre de ESE producto puntual con su propia "dosis" y "consumo_total". Ejemplo: "Pulverización lote 1, 78has, glifosato 2lt/ha (160lts), 2,4-D 0.8lt/ha (60lts) y Finesse 1050gr" → TRES objetos (mismo lote/fecha/has): uno con descripcion "Glifosato", dosis "2 lt/ha", consumo_total "160 lts"; otro con descripcion "2,4-D", dosis "0.8 lt/ha", consumo_total "60 lts"; otro con descripcion "Finesse", dosis "1050 gr", consumo_total "1050 gr". NUNCA un solo objeto con todos los productos mezclados.`,
      'Extraé todos los trabajos de campo que figuren en esta imagen/PDF.');

    let ok = 0, fail = 0;
    for (const t of (datos.trabajos || [])) {
      const r = await sb('POST', 'trabajos_agricolas', {
        tipo: t.tipo, fecha: parseFechaIA(t.fecha) || fecha, campo: t.campo || campo,
        lote: t.lote, hectareas: t.hectareas || null, cultivo: t.cultivo,
        contratista: t.contratista, dosis: t.dosis, consumo_total: t.consumo_total, campania: t.campania, descripcion: t.descripcion
      });
      if (r) ok++; else fail++;
    }

    result.innerHTML = ok ? `✅ ${ok} trabajo${ok > 1 ? 's' : ''} registrado${ok > 1 ? 's' : ''}` + (fail ? `<br>❌ ${fail} con error` : '') : '❌ No se encontraron trabajos en la imagen.';
    status.textContent = ok ? `✅ ${file.name} leída` : '';
    if (ok) { toast(`✅ ${ok} trabajo${ok > 1 ? 's' : ''} registrado${ok > 1 ? 's' : ''}`); input.value = ''; cargarTrabajos(); }
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    result.innerHTML = '❌ Error al procesar la imagen.';
    toast('❌ Error al leer la imagen', 'var(--rojo)');
  }
}

async function importarTrabajoTexto() {
  const texto = document.getElementById('trt-texto').value.trim();
  const campo = document.getElementById('trt-campo').value;
  const fecha = document.getElementById('trt-fecha').value;
  if (!texto) { toast('Describí el trabajo primero', 'var(--tierra)'); return; }

  const btn = document.getElementById('btn-trab-texto');
  btn.disabled = true; btn.textContent = '⏳ Procesando...';
  document.getElementById('trt-status').textContent = 'La IA está interpretando...';
  const result = document.getElementById('trt-result');
  result.style.display = 'block'; result.innerHTML = 'Analizando...';

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        temperature: 0,
        system: `Sos un asistente agropecuario del Grupo Giraudo, Argentina. El usuario describe trabajos de campo. Extraé cada trabajo y devolvé SOLO JSON válido sin backticks:
{"trabajos":[{"tipo":"Siembra|Pulverización|Fertilización|Cosecha|Henificación|Enrollado|Labranza|Otro","fecha":"YYYY-MM-DD","campo":"string","lote":"string","hectareas":null,"cultivo":"string","contratista":"string","dosis":"string (ej: 3 lt/ha)","consumo_total":"string (ej: 270 lts)","campania":"string (ej: 25/26)","descripcion":"string","detalle":{}}]}
Campo por defecto: "${campo}". Fecha por defecto: "${fecha || new Date().toISOString().split('T')[0]}". Si hay varios trabajos en el texto, creá un objeto por cada uno. Si NO se menciona contratista (no se aclara que lo hizo un tercero), poné "Propio" en ese campo, asumiendo que lo hizo el Grupo Giraudo con maquinaria/personal propio.

EQUIVALENCIAS DE CAMPO: "AZ" o "Azcona" = "Don Alfredo (Azcona)". "DV", "Vica" o "Doña Vica" = "Doña Vica". "SY", "Sant-Yago" o "Santiago" = "Sant-Yago". Usá siempre el nombre completo del campo tal como figura en estas equivalencias.

LOTE: los lotes de Grupo Giraudo son SIEMPRE numéricos, sin letras. Si en la planilla aparece como "LT6", "Lote 6", "L6" o similar, extraé solo el número: "6". Nunca incluyas "LT", "L" ni "Lote" en el campo "lote".

REGLA OBLIGATORIA SOBRE PRODUCTOS MÚLTIPLES: nunca pongas más de un producto/insumo en el campo "descripcion", y nunca sumes o concatenes dosis de distintos productos en "dosis" ni "consumo_total". Si un mismo trabajo (misma fecha/campo/lote/tipo) menciona VARIOS productos, tenés que devolver UN OBJETO JSON POR CADA PRODUCTO, repitiendo fecha/campo/lote/hectareas/cultivo/contratista/campania en cada uno, y usando "descripcion" para el nombre de ESE producto puntual con su propia "dosis" y "consumo_total".
Ejemplo: si el texto dice "Pulverización lote 1, 78has, glifosato 2lt/ha (160lts), 2,4-D 0.8lt/ha (60lts) y Finesse 1050gr" tenés que devolver TRES objetos de trabajos (mismo lote/fecha/has), cada uno con su propio producto en "descripcion": uno con descripcion "Glifosato", dosis "2 lt/ha", consumo_total "160 lts"; otro con descripcion "2,4-D", dosis "0.8 lt/ha", consumo_total "60 lts"; otro con descripcion "Finesse", dosis "1050 gr", consumo_total "1050 gr". NUNCA un solo objeto con todos los productos mezclados.`,
        messages: [{ role: 'user', content: texto }]
      })
    });

    const json = await res.json();
    let raw = json.content?.[0]?.text || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    const p = JSON.parse(raw);

    let summary = [], errors = [];
    for (const t of (p.trabajos || [])) {
      const r = await sb('POST', 'trabajos_agricolas', {
        tipo: t.tipo, fecha: t.fecha, campo: t.campo || campo,
        lote: t.lote, hectareas: t.hectareas, cultivo: t.cultivo,
        contratista: t.contratista, dosis: t.dosis, consumo_total: t.consumo_total, campania: t.campania, descripcion: t.descripcion, detalle: t.detalle || {}
      });
      if (r) summary.push(`✅ ${t.tipo} — ${t.cultivo || ''} ${t.lote || ''}`);
      else errors.push(`❌ Error: ${t.tipo}`);
    }

    result.innerHTML = [...summary, ...errors].join('<br>') || 'No se encontraron datos.';
    if (summary.length) {
      toast(`✅ ${summary.length} trabajo${summary.length > 1 ? 's' : ''} registrado${summary.length > 1 ? 's' : ''}`);
      document.getElementById('trt-texto').value = '';
      cargarTrabajos();
    }
  } catch(e) {
    result.innerHTML = '❌ Error al procesar. Verificá tu conexión.';
    console.error(e);
  }
  btn.disabled = false; btn.textContent = '🤖 Interpretar y cargar con IA';
  document.getElementById('trt-status').textContent = '';
}
