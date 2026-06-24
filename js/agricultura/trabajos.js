async function guardarTrabajo() {
  const data = {
    tipo: document.getElementById('tr-tipo').value,
    fecha: document.getElementById('tr-fecha').value,
    campo: document.getElementById('tr-campo').value,
    lote: document.getElementById('tr-lote').value,
    hectareas: parseFloat(document.getElementById('tr-has').value) || null,
    cultivo: document.getElementById('tr-cultivo').value,
    contratista: document.getElementById('tr-cont').value,
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
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="icon">🌾</div><h3>${hayFiltro ? 'Sin resultados para el filtro' : 'Sin trabajos'}</h3></div></td></tr>`;
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
      <td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarTrabajo('${t.id}')">🗑️</button></td>
    </tr>`).join('');
}

async function borrarTrabajo(id) {
  if (!confirm('¿Borrar este trabajo? Esta acción no se puede deshacer.')) return;
  await sb('DELETE', 'trabajos_agricolas', '', `?id=eq.${id}`);
  toast('🗑️ Trabajo borrado');
  cargarTrabajos();
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
{"trabajos":[{"tipo":"Siembra|Pulverización|Fertilización|Cosecha|Henificación|Enrollado|Labranza|Otro","fecha":"YYYY-MM-DD","campo":"string","lote":"string","hectareas":null,"cultivo":"string","contratista":"string","descripcion":"string","detalle":{}}]}
Campo por defecto: "${campo}". Fecha por defecto: "${fecha || new Date().toISOString().split('T')[0]}". Si hay varios trabajos en el texto, creá un objeto por cada uno.`,
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
        contratista: t.contratista, descripcion: t.descripcion, detalle: t.detalle || {}
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
