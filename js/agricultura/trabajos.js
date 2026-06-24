async function guardarTrabajo() {
  const data = {
    tipo: document.getElementById('tr-tipo').value,
    fecha: document.getElementById('tr-fecha').value,
    campo: document.getElementById('tr-campo').value,
    lote: document.getElementById('tr-lote').value,
    hectareas: parseFloat(document.getElementById('tr-has').value) || null,
    cultivo: document.getElementById('tr-cultivo').value,
    contratista: document.getElementById('tr-cont').value || 'Propio',
    dosis: document.getElementById('tr-dosis').value,
    consumo_total: document.getElementById('tr-consumo').value,
    campania: document.getElementById('tr-campania').value,
    descripcion: document.getElementById('tr-desc').value
  };
  const r = await sb('POST', 'trabajos_agricolas', data);
  if (r) { toast('✅ Trabajo registrado'); toggleForm('form-trab'); cargarTrabajos(); }
  else toast('❌ Error', 'var(--rojo)');
}

let trabajosTodos = [];
let trabajosPagina = 1;

function filtrarTrabajosReset() { trabajosPagina = 1; renderTrabajos(); }
function irPaginaTrabajos(p) { trabajosPagina = p; renderTrabajos(); window.scrollTo({ top: document.getElementById('section-trabajos_agri').offsetTop, behavior: 'smooth' }); }

async function cargarTrabajos() {
  const rows = await sb('GET', 'trabajos_agricolas', '', '?tipo=neq.alimentacion&order=fecha.desc');
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
  tbody.innerHTML = pagina.map(t => `
    <tr>
      <td>${fmtFecha(t.fecha)}</td>
      <td><span class="badge badge-${colors[t.tipo] || 'gray'}">${t.tipo}</span></td>
      <td>${t.campo || '—'}</td>
      <td>${t.lote || '—'}</td>
      <td>${t.hectareas ? t.hectareas + ' has' : '—'}</td>
      <td>${t.cultivo || '—'}</td>
      <td>${t.contratista || '—'}</td>
      <td style="font-size:12px">${t.descripcion || '—'}</td>
      <td>${t.dosis || '—'}</td>
      <td>${t.consumo_total || '—'}</td>
      <td><input type="text" value="${t.campania || ''}" placeholder="Ej: 25/26" style="width:70px;border:1px solid var(--gris-borde);border-radius:4px;padding:3px 5px;font-size:12px" onchange="editarCampaniaTrabajo('${t.id}', this.value)"></td>
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarTrabajo('${t.id}')">🗑️</button></td>
    </tr>`).join('');
}

async function editarCampaniaTrabajo(id, valor) {
  const t = trabajosTodos.find(x => x.id === id);
  if (t) t.campania = valor;
  const r = await sb('PATCH', 'trabajos_agricolas', { campania: valor }, `?id=eq.${id}`);
  if (r) toast('✅ Campaña actualizada');
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
Campo por defecto si no se aclara: "${campo}". Fecha por defecto si no se aclara: "${fecha ? fecha.split('-').reverse().join('/') : ''}". Si hay varios trabajos anotados, devolvé un objeto por cada uno. Si un dato no está, poné "" o 0. Si NO se menciona contratista (es decir, si la planilla no aclara que el trabajo lo hizo un tercero/contratista), poné "Propio" en ese campo, asumiendo que lo hizo el Grupo Giraudo con maquinaria/personal propio.`,
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
        system: `Sos un asistente agropecuario del Grupo Giraudo, Argentina. El usuario describe trabajos de campo. Extraé cada trabajo y devolvé SOLO JSON válido sin backticks:
{"trabajos":[{"tipo":"Siembra|Pulverización|Fertilización|Cosecha|Henificación|Enrollado|Labranza|Otro","fecha":"YYYY-MM-DD","campo":"string","lote":"string","hectareas":null,"cultivo":"string","contratista":"string","dosis":"string (ej: 3 lt/ha)","consumo_total":"string (ej: 270 lts)","campania":"string (ej: 25/26)","descripcion":"string","detalle":{}}]}
Campo por defecto: "${campo}". Fecha por defecto: "${fecha || new Date().toISOString().split('T')[0]}". Si hay varios trabajos en el texto, creá un objeto por cada uno. Si NO se menciona contratista (no se aclara que lo hizo un tercero), poné "Propio" en ese campo, asumiendo que lo hizo el Grupo Giraudo con maquinaria/personal propio.`,
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
