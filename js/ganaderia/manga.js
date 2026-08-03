let rodeos = [];
let trabajosManga = [];
let animalesRodeo = [];
let novedadesGanaderas = [];
let serviciosAnimal = [];
let sanidadAnimal = [];
let renspas = [];
let pesadasAnimal = [];

const TIPOS_REPRODUCTIVO = ['Inseminación (IATF)', 'Servicio'];
const TIPOS_SANIDAD = ['Vacunación', 'Desparasitación', 'Tratamiento', 'Caravana electrónica', 'Tacto / Preñez', 'Otro'];
let rodeoSeleccionado = null;
let animalSeleccionado = null;
let tabRodeoActiva = 'novedades';
let tabAnimalActiva = 'datos';
let paginaManga = 1;
let statFiltroActivo = null;

const CATS_MACHO = ['Ternero', 'Novillito', 'Novillo', 'Torito', 'Toro'];
const CATS_HEMBRA = ['Ternera', 'Vaquillona', 'Vaca'];

function caravanaDisplay(a) {
  return a.caravana_interna || a.caravana_electronica || 'S/N';
}

function catsPorSexo(sexo) {
  return sexo === 'Macho' ? CATS_MACHO : CATS_HEMBRA;
}

function actualizarCats(sexoId, catId) {
  const sexo = document.getElementById(sexoId)?.value;
  const catEl = document.getElementById(catId);
  if (!catEl) return;
  const cats = catsPorSexo(sexo);
  catEl.innerHTML = cats.map(c => `<option>${c}</option>`).join('');
}

const COLORES_RODEO = {
  'Vacas': 'bordo', 'Vaquillonas': 'tierra',
  'Terneros': 'verde', 'Terneras': 'verde', 'Toros': 'cielo'
};

async function cargarManga() {
  let indicesCampania;
  [rodeos, trabajosManga, animalesRodeo, novedadesGanaderas, serviciosAnimal, sanidadAnimal, renspas, pesadasAnimal, indicesCampania] = await Promise.all([
    sb('GET', 'rodeos', null, '?order=created_at.asc&activo=eq.true'),
    sb('GET', 'trabajos_manga', null, '?order=fecha.desc'),
    sb('GET', 'animales_rodeo', null, '?activo=eq.true&order=caravana_interna.asc.nullslast'),
    sb('GET', 'novedades_ganaderas', null, '?order=fecha.desc'),
    sb('GET', 'servicios_animal', null, '?order=fecha.desc'),
    sb('GET', 'sanidad_animal', null, '?order=fecha.desc'),
    sb('GET', 'renspas', null, '?order=propietario.asc'),
    sb('GET', 'pesadas_animal', null, '?order=fecha.asc'),
    sb('GET', 'indices_campania', null, '?order=campania.desc')
  ]);
  rodeos = rodeos || [];
  trabajosManga = trabajosManga || [];
  window._indicesCampania = indicesCampania || [];
  animalesRodeo = animalesRodeo || [];
  novedadesGanaderas = novedadesGanaderas || [];
  serviciosAnimal = serviciosAnimal || [];
  window._allServicios = serviciosAnimal;
  sanidadAnimal = sanidadAnimal || [];
  renspas = renspas || [];
  pesadasAnimal = pesadasAnimal || [];

  _poblarSelectsRodeo();
  _poblarSelectsRenspa();
  renderEstadisticasManga();
  renderRodeosManga();
}

function _poblarSelectsRenspa() {
  const opciones = '<option value="">— Propio —</option>' +
    renspas.map(r => `<option value="${r.id}">${r.propietario} · ${r.numero}</option>`).join('');
  ['ing-renspa', 'an-renspa', 'edit-renspa', 'f-renspa'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { const prev = el.value; el.innerHTML = opciones; if (prev) el.value = prev; }
  });
}

function renspaLabel(renspaId) {
  if (!renspaId) return null;
  const r = renspas.find(x => x.id === renspaId);
  return r ? `${r.propietario} · ${r.numero}` : null;
}

function toggleFormRenspas() {
  const f = document.getElementById('form-renspas-wrap');
  f.style.display = f.style.display === 'none' ? '' : 'none';
  if (f.style.display !== 'none') renderListaRenspas();
}

function renderListaRenspas() {
  const el = document.getElementById('renspa-lista');
  if (!el) return;
  if (!renspas.length) { el.innerHTML = '<div style="font-size:13px;color:var(--texto-suave)">Sin RENSPAs cargados</div>'; return; }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>RENSPA</th><th>Propietario / Firma</th><th>Observaciones</th><th>Animales</th><th></th></tr></thead>
    <tbody>${renspas.map(r => {
      const nAnim = animalesRodeo.filter(a => a.renspa_id === r.id).length;
      return `<tr>
        <td><strong>${r.numero}</strong></td>
        <td>${r.propietario}</td>
        <td>${r.observaciones || '—'}</td>
        <td>${nAnim}</td>
        <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarRenspa('${r.id}')">🗑️</button></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

async function guardarRenspa() {
  const data = {
    numero: document.getElementById('renspa-numero').value.trim(),
    propietario: document.getElementById('renspa-propietario').value.trim(),
    observaciones: document.getElementById('renspa-obs').value.trim() || null
  };
  if (!data.numero || !data.propietario) { toast('Completá número y propietario', 'var(--rojo)'); return; }
  const r = await sb('POST', 'renspas', data);
  if (r) {
    toast('✅ RENSPA guardado');
    document.getElementById('renspa-numero').value = '';
    document.getElementById('renspa-propietario').value = '';
    document.getElementById('renspa-obs').value = '';
    await cargarManga();
    renderListaRenspas();
  } else toast('❌ Error', 'var(--rojo)');
}

async function borrarRenspa(id) {
  if (!confirm('¿Borrar este RENSPA? Los animales vinculados quedarán sin RENSPA asignado.')) return;
  await sb('DELETE', 'renspas', null, `?id=eq.${id}`);
  renspas = renspas.filter(r => r.id !== id);
  _poblarSelectsRenspa();
  renderListaRenspas();
}

function _poblarSelectsRodeo() {
  const opciones = '<option value="">— Seleccionar —</option>' +
    rodeos.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
  ['nov-rodeo-main', 'traslado-rodeo-destino', 'cat-rodeo-destino', 'destete-rodeo-destino', 'rt-rodeo-destino'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const prev = el.value;
      el.innerHTML = id === 'cat-rodeo-destino'
        ? '<option value="">— Mismo rodeo —</option>' + rodeos.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('')
        : opciones;
      if (prev) el.value = prev;
    }
  });
}

// ── Stats ─────────────────────────────────────────────────

function renderEstadisticasManga() {
  const el = document.getElementById('manga-stats');
  if (!el) return;

  // Último servicio por animal
  const ultimoSrvPorAnimal = {};
  serviciosAnimal.forEach(s => {
    const prev = ultimoSrvPorAnimal[s.animal_id];
    if (!prev || new Date(s.fecha) > new Date(prev.fecha)) ultimoSrvPorAnimal[s.animal_id] = s;
  });

  // Conteo por categoría de animal (no de rodeo)
  const porCat = {};
  animalesRodeo.forEach(a => { porCat[a.categoria] = (porCat[a.categoria] || 0) + 1; });

  const vacasPreñadas = animalesRodeo.filter(a => a.categoria === 'Vaca' && ultimoSrvPorAnimal[a.id]?.resultado === 'Preñada').length;
  const vacasVacias = animalesRodeo.filter(a => a.categoria === 'Vaca' && ultimoSrvPorAnimal[a.id]?.resultado === 'Vacía').length;

  // Sub-texto RENSPA para un grupo de animales
  function subRenspa(lista) {
    if (!renspas.length) return `${lista.length} animal${lista.length !== 1 ? 'es' : ''}`;
    const porRenspa = {};
    lista.forEach(a => {
      const key = a.renspa_id ? (renspas.find(r => r.id === a.renspa_id)?.propietario || 'Otro') : 'Propio';
      porRenspa[key] = (porRenspa[key] || 0) + 1;
    });
    return Object.entries(porRenspa).map(([k, v]) => `${v} ${k}`).join(' · ');
  }

  const refsPorAnimal = {};
  animalesRodeo.forEach(a => { const r = a.caravana_interna || a.caravana_electronica; if (r) refsPorAnimal[r] = a.id; });
  const tieneCria = id => animalesRodeo.some(x => x.caravana_madre && (x.caravana_madre === animalesRodeo.find(a=>a.id===id)?.caravana_interna || x.caravana_madre === animalesRodeo.find(a=>a.id===id)?.caravana_electronica));

  const ORDEN_CATS = [
    { label: 'Vacas preñadas',    filtro: a => a.categoria === 'Vaca' && ultimoSrvPorAnimal[a.id]?.resultado === 'Preñada', color: 'verde' },
    { label: 'Vacas vacías',      filtro: a => a.categoria === 'Vaca' && ultimoSrvPorAnimal[a.id]?.resultado !== 'Preñada', color: 'rojo' },
    { label: 'Vacas en lactancia',filtro: a => a.categoria === 'Vaca' && tieneCria(a.id), color: 'cielo' },
    { label: 'Vaquillonas', filtro: a => a.categoria === 'Vaquillona', color: 'tierra' },
    { label: 'Terneras', filtro: a => a.categoria === 'Ternera', color: 'verde' },
    { label: 'Terneros', filtro: a => a.categoria === 'Ternero', color: 'verde' },
    { label: 'Novillitos', filtro: a => a.categoria === 'Novillito', color: 'cielo' },
    { label: 'Novillos', filtro: a => a.categoria === 'Novillo', color: 'cielo' },
    { label: 'Toritos', filtro: a => a.categoria === 'Torito', color: 'cielo' },
    { label: 'Toros', filtro: a => a.categoria === 'Toro', color: 'cielo' },
  ];

  const cardStyle = 'cursor:pointer;transition:box-shadow .15s;user-select:none';
  const selStyle = 'box-shadow:0 0 0 2px var(--bordo)';

  const cards = ORDEN_CATS.map(({ label, filtro, color }) => {
    const lista = animalesRodeo.filter(filtro);
    if (!lista.length) return '';
    const sel = statFiltroActivo === label;
    return `<div class="stat-card" style="min-width:120px;${cardStyle}${sel ? ';' + selStyle : ''}" onclick="toggleStatFiltro('${label}')">
      <div class="label">${label}</div>
      <div class="value" style="color:var(--${color})">${lista.length}</div>
      <div class="sub" style="font-size:10px;line-height:1.4">${subRenspa(lista)}</div>
    </div>`;
  }).join('');

  const selTotal = statFiltroActivo === 'total';
  el.innerHTML = `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
    <div class="stat-card" style="min-width:120px;${cardStyle}${selTotal ? ';' + selStyle : ''}" onclick="toggleStatFiltro('total')">
      <div class="label">Total hacienda</div>
      <div class="value" style="color:var(--bordo)">${animalesRodeo.length}</div>
      <div class="sub" style="font-size:10px;line-height:1.4">${subRenspa(animalesRodeo)}</div>
    </div>
    ${cards}
  </div>
  <div id="manga-stat-lista"></div>`;

  if (statFiltroActivo) renderListaStatAnimales(statFiltroActivo, ultimoSrvPorAnimal);
}

// ── Rodeos ────────────────────────────────────────────────

function toggleStatFiltro(label) {
  statFiltroActivo = statFiltroActivo === label ? null : label;
  renderEstadisticasManga();
}

function renderListaStatAnimales(label, ultimoSrvPorAnimal) {
  const el = document.getElementById('manga-stat-lista');
  if (!el) return;

  const FILTROS = {
    'total': a => true,
    'Vacas preñadas': a => a.categoria === 'Vaca' && ultimoSrvPorAnimal[a.id]?.resultado === 'Preñada',
    'Vacas vacías': a => a.categoria === 'Vaca' && ultimoSrvPorAnimal[a.id]?.resultado !== 'Preñada',
    'Vacas en lactancia': a => a.categoria === 'Vaca' && animalesRodeo.some(x => x.caravana_madre && (x.caravana_madre === a.caravana_interna || x.caravana_madre === a.caravana_electronica)),
    'Vaquillonas': a => a.categoria === 'Vaquillona',
    'Terneras': a => a.categoria === 'Ternera',
    'Terneros': a => a.categoria === 'Ternero',
    'Novillitos': a => a.categoria === 'Novillito',
    'Novillos': a => a.categoria === 'Novillo',
    'Toritos': a => a.categoria === 'Torito',
    'Toros': a => a.categoria === 'Toro',
  };

  const animales = animalesRodeo.filter(FILTROS[label] || (() => false));
  const cardStyle = 'background:var(--fondo);border:1px solid var(--borde);border-radius:10px;padding:12px;cursor:pointer;transition:box-shadow .15s';

  el.innerHTML = `<div class="card" style="margin-bottom:16px">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
      <h3>${label === 'total' ? 'Total hacienda' : label} <span style="font-size:13px;font-weight:400;color:var(--texto-suave)">(${animales.length})</span></h3>
      <button class="btn btn-secondary" style="font-size:12px" onclick="toggleStatFiltro('${label}')">✕ Cerrar</button>
    </div>
    <div class="card-body">
      ${animales.length ? `<div class="lotes-grid">${animales.map(a => {
        const color = a.sexo === 'Hembra' ? 'bordo' : 'cielo';
        const rodeo = rodeos.find(r => r.id === a.rodeo_id);
        const srv = ultimoSrvPorAnimal[a.id];
        const colRes = { 'Preñada':'verde','Vacía':'rojo','Repetidora':'tierra','Pendiente':'gray','Abortó':'tierra' };
        return `<div style="${cardStyle}" onclick="seleccionarAnimalGlobal('${a.id}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
            <span class="badge badge-${color}" style="font-size:10px">${a.categoria || a.sexo}</span>
            <span style="font-size:10px;color:var(--texto-suave)">${rodeo?.nombre || ''}</span>
          </div>
          <div style="font-size:17px;font-weight:700;color:var(--${color})">#${caravanaDisplay(a)}</div>
          <div style="font-size:11px;color:var(--texto-suave)">${a.raza || ''}</div>
          ${srv ? `<div style="margin-top:4px"><span class="badge badge-${colRes[srv.resultado]||'gray'}" style="font-size:10px">${srv.resultado}</span></div>` : ''}
          ${a.renspa_id ? `<div style="font-size:10px;color:var(--cielo);margin-top:2px">🏷️ ${renspaLabel(a.renspa_id)}</div>` : ''}
        </div>`;
      }).join('')}</div>`
      : `<div class="empty-state" style="padding:24px"><p>Sin animales en esta categoría</p></div>`}
    </div>
  </div>`;

  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function seleccionarAnimalGlobal(animalId) {
  const a = animalesRodeo.find(x => x.id === animalId);
  if (!a) return;
  // Navegar al rodeo y abrir la ficha
  rodeoSeleccionado = a.rodeo_id;
  tabRodeoActiva = 'animales';
  animalSeleccionado = animalId;
  tabAnimalActiva = 'datos';
  statFiltroActivo = null;
  renderEstadisticasManga();
  renderRodeosManga();
  setTimeout(() => document.getElementById('ficha-animal')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function renderRodeosManga() {
  const container = document.getElementById('manga-rodeos-cards');
  if (!container) return;
  if (!rodeos.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🐄</div><h3>Sin rodeos cargados</h3><p>Usá "Nuevo rodeo" para agregar uno</p></div>';
  } else {
    container.innerHTML = rodeos.map(r => {
      const color = COLORES_RODEO[r.categoria] || 'gray';
      const nNov = novedadesGanaderas.filter(n => n.rodeo_id === r.id).length;
      const animalesDelRodeo = animalesRodeo.filter(a => a.rodeo_id === r.id);
      const nAnimales = animalesDelRodeo.length;
      const sel = rodeoSeleccionado === r.id;

      // Desglose por categoría
      const cats = {};
      animalesDelRodeo.forEach(a => { if (a.categoria) cats[a.categoria] = (cats[a.categoria] || 0) + 1; });
      const catHtml = Object.entries(cats).length
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
            ${Object.entries(cats).map(([cat, n]) => `<span style="font-size:11px;color:var(--texto-suave);background:var(--gris-fondo);border-radius:4px;padding:1px 6px">${cat}: <strong>${n}</strong></span>`).join('')}
           </div>`
        : '';

      return `<div onclick="seleccionarRodeoManga('${r.id}')" style="cursor:pointer;background:var(--fondo);border:2px solid ${sel ? 'var(--bordo)' : 'var(--gris-borde)'};border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:4px;box-shadow:${sel ? '0 2px 8px rgba(128,0,32,0.15)' : '0 1px 3px rgba(0,0,0,0.05)'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <span class="badge badge-${color}">${r.categoria || 'Sin cat.'}</span>
          <span style="font-size:11px;color:var(--texto-suave)">${r.campo || ''}</span>
        </div>
        <div style="font-size:15px;font-weight:700;margin-top:4px">${r.nombre}</div>
        ${r.ubicacion ? `<div style="font-size:11px;color:var(--texto-suave)">📍 ${r.ubicacion}</div>` : ''}
        <div style="display:flex;gap:12px;font-size:13px;margin-top:6px;border-top:1px solid var(--gris-borde);padding-top:8px">
          <span><strong>${nAnimales}</strong> identificados</span>
          <span style="color:var(--texto-suave)">${nNov} novedad${nNov !== 1 ? 'es' : ''}</span>
        </div>
        ${catHtml}
      </div>`;
    }).join('');
  }
  renderDetalleManga();
}

function seleccionarRodeoManga(id) {
  if (rodeoSeleccionado === id) { rodeoSeleccionado = null; animalSeleccionado = null; }
  else { rodeoSeleccionado = id; animalSeleccionado = null; tabRodeoActiva = 'novedades'; }
  renderRodeosManga();
  if (rodeoSeleccionado) setTimeout(() => document.getElementById('manga-detalle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function switchTabRodeo(tab) {
  tabRodeoActiva = tab;
  animalSeleccionado = null;
  renderDetalleManga();
}

// ── Detalle rodeo ─────────────────────────────────────────

function renderDetalleManga() {
  const detalle = document.getElementById('manga-detalle');
  if (!detalle) return;
  if (!rodeoSeleccionado) { renderVistaGlobal(); return; }

  const rodeo = rodeos.find(r => r.id === rodeoSeleccionado);
  const color = COLORES_RODEO[rodeo?.categoria] || 'bordo';
  const trabajos = trabajosManga.filter(t => t.rodeo_id === rodeoSeleccionado);
  const animales = animalesRodeo.filter(a => a.rodeo_id === rodeoSeleccionado);
  const novedades = novedadesGanaderas.filter(n => n.rodeo_id === rodeoSeleccionado);

  detalle.innerHTML = `
    <div class="card" style="margin-top:16px;border-top:3px solid var(--${color})">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h3>${rodeo?.nombre || ''} <span class="badge badge-${color}" style="font-size:12px">${rodeo?.categoria || ''}</span>
          ${rodeo?.ubicacion ? `<span style="font-size:12px;font-weight:400;color:var(--texto-suave);margin-left:8px">📍 ${rodeo.ubicacion}</span>` : ''}
        </h3>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" style="font-size:12px" onclick="abrirNuevoNovedad('${rodeo.id}')">+ Novedad</button>
          <button class="btn btn-secondary" style="font-size:12px" onclick="editarRodeo('${rodeo.id}')">✏️ Editar</button>
        </div>
      </div>
      <div class="tabs" style="border-bottom:1px solid var(--borde)">
        <div class="tab${tabRodeoActiva === 'novedades' ? ' active' : ''}" onclick="switchTabRodeo('novedades')">Novedades <span style="font-size:11px;color:var(--texto-suave)">(${novedades.length})</span></div>
        <div class="tab${tabRodeoActiva === 'trabajos' ? ' active' : ''}" onclick="switchTabRodeo('trabajos')">Trabajos anteriores <span style="font-size:11px;color:var(--texto-suave)">(${trabajos.length})</span></div>
        <div class="tab${tabRodeoActiva === 'animales' ? ' active' : ''}" onclick="switchTabRodeo('animales')">Animales <span style="font-size:11px;color:var(--texto-suave)">(${animales.length})</span></div>
        <div class="tab${tabRodeoActiva === 'indices' ? ' active' : ''}" onclick="switchTabRodeo('indices')">📋 Índices</div>
      </div>

      ${tabRodeoActiva === 'novedades' ? renderTabNovedades(novedades) : ''}
      ${tabRodeoActiva === 'trabajos' ? renderTabTrabajos(trabajos) : ''}
      ${tabRodeoActiva === 'animales' ? renderTabAnimales(rodeo.id, animales) : ''}
      ${tabRodeoActiva === 'indices' ? renderTabIndices(rodeo.id, novedades) : ''}
    </div>
    ${animalSeleccionado ? renderFichaAnimal(animalSeleccionado) : ''}`;
}

// ── Tab Novedades ─────────────────────────────────────────

const ICONOS_NOV = {
  'Trabajo de manga': '💉', 'Nacimiento': '🐣', 'Ingreso': '⬇️',
  'Destete': '🐂', 'Aborto': '⚠️', 'Muerte': '💀',
  'Entrada de toros': '🐂', 'Retiro de toros': '🔙', 'Venta / Salida': '🚛', 'Traslado': '🔄',
  'Cambio de categoría': '🔀', 'Pesada': '⚖️'
};

function renderTabIndices(rodeoId, novedades) {
  // Datos desde novedades del rodeo
  const novRodeo = novedades.filter(n => n.rodeo_id === rodeoId);

  // Servicios desde servicios_animal (animales individuales)
  const srvRodeo = (window._allServicios || []).filter(s => s.rodeo_id === rodeoId);
  const inseminadasSrv = srvRodeo.filter(s => s.metodo === 'IATF' || s.metodo === 'Toro').length;

  // Inseminadas desde novedades de manga (Trabajo de manga - IATF o Inseminación)
  const inseminadasNov = novRodeo
    .filter(n => n.tipo === 'Trabajo de manga' && n.subtipo && (n.subtipo.includes('IATF') || n.subtipo.includes('Inseminación') || n.subtipo.includes('Servicio')))
    .reduce((s, n) => s + (n.cantidad || 0), 0);
  const inseminadas = inseminadasSrv || inseminadasNov;

  // Preñadas desde servicios_animal
  const prenadasSrv = srvRodeo.filter(s => s.metodo === 'Tacto' && s.resultado === 'Preñada').length;
  // Preñadas desde novedades de manga (Trabajo de manga - Tacto)
  const tactoNov = novRodeo.find(n => n.tipo === 'Trabajo de manga' && n.subtipo && n.subtipo.includes('Tacto'));
  const prenNov  = tactoNov?.detalle?.prenadas || (tactoNov?.cantidad || 0);
  const totalPren = prenadasSrv || prenNov;

  // Nacimientos
  const nacimientos = novRodeo.filter(n => n.tipo === 'Nacimiento').reduce((s,n) => s + (n.cantidad||1), 0);

  // Abortos
  const abortos = novRodeo.filter(n => n.tipo === 'Aborto').reduce((s,n) => s + (n.cantidad||1), 0);

  // Muertes terneros
  const muertesTerneros = novRodeo.filter(n => n.tipo === 'Muerte' && (n.categoria==='Terneros'||n.categoria==='Terneras')).reduce((s,n) => s + (n.cantidad||1), 0);

  // Destetes
  const destetes = novRodeo.filter(n => n.tipo === 'Destete').reduce((s,n) => s + (n.cantidad||1), 0);

  const base = inseminadas || totalPren || nacimientos || 1;

  function idx(num, den) {
    if (!den || !num) return null;
    return (num / den * 100).toFixed(1);
  }

  function cardIndice(label, valor, num, den, color, icon, desc) {
    const pct = valor !== null ? valor + '%' : '—';
    const c = valor === null ? '#bbb' : parseFloat(valor) >= 85 ? '#27ae60' : parseFloat(valor) >= 70 ? '#d4a017' : '#c0392b';
    return `<div style="background:#fff;border:1px solid #e0e0dc;border-radius:12px;padding:16px 18px;min-width:160px;flex:1">
      <div style="font-size:20px;margin-bottom:4px">${icon}</div>
      <div style="font-size:11px;font-weight:600;color:var(--texto-suave);text-transform:uppercase;margin-bottom:6px">${label}</div>
      <div style="font-size:30px;font-weight:800;color:${c}">${pct}</div>
      <div style="font-size:11px;color:#888;margin-top:4px">${num ?? '—'} de ${den ?? '—'}</div>
      ${desc ? `<div style="font-size:10px;color:#aaa;margin-top:2px">${desc}</div>` : ''}
    </div>`;
  }

  const iPrenez   = idx(totalPren, inseminadas);
  const iParicion = idx(nacimientos, totalPren || inseminadas);
  const iAborto   = idx(abortos, totalPren || inseminadas);
  const iMuerte   = idx(muertesTerneros, nacimientos);
  const iDestete  = idx(destetes, inseminadas || totalPren);

  // Historial de campañas cerradas
  const historial = (window._indicesCampania || []).filter(h => h.rodeo_id === rodeoId)
    .sort((a,b) => (b.campania||'').localeCompare(a.campania||''));

  const histHTML = historial.length ? `
    <div style="margin-top:20px">
      <div style="font-size:12px;font-weight:700;color:var(--texto-suave);text-transform:uppercase;margin-bottom:10px">📁 Historial por campaña</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f4f4f2;border-bottom:2px solid #e0e0dc">
            <th style="padding:8px 10px;text-align:left">Campaña</th>
            <th style="padding:8px 10px;text-align:center">Inseminadas</th>
            <th style="padding:8px 10px;text-align:center;color:#1a5f8b">% Preñez</th>
            <th style="padding:8px 10px;text-align:center;color:#27ae60">% Parición</th>
            <th style="padding:8px 10px;text-align:center;color:#e67e22">% Abortos</th>
            <th style="padding:8px 10px;text-align:center;color:#c0392b">% Mort.</th>
            <th style="padding:8px 10px;text-align:center;color:#8B1A2F">% Destete</th>
            <th style="padding:8px 10px;text-align:left">Obs.</th>
            <th style="padding:8px 10px"></th>
          </tr></thead>
          <tbody>${historial.map(h => {
            function col(v) { return v==null?'#bbb':v>=85?'#27ae60':v>=70?'#d4a017':'#c0392b'; }
            function fmt(v) { return v!=null ? `<span style="font-weight:700;color:${col(v)}">${v}%</span>` : '—'; }
            return `<tr style="border-bottom:1px solid #f0f0f0">
              <td style="padding:8px 10px;font-weight:700">${h.campania}</td>
              <td style="padding:8px 10px;text-align:center">${h.inseminadas??'—'}</td>
              <td style="padding:8px 10px;text-align:center">${fmt(h.pct_prenez)}</td>
              <td style="padding:8px 10px;text-align:center">${fmt(h.pct_paricion)}</td>
              <td style="padding:8px 10px;text-align:center">${fmt(h.pct_abortos)}</td>
              <td style="padding:8px 10px;text-align:center">${fmt(h.pct_mort_terneros)}</td>
              <td style="padding:8px 10px;text-align:center">${fmt(h.pct_destete)}</td>
              <td style="padding:8px 10px;font-size:11px;color:#888">${h.observaciones||'—'}</td>
              <td style="padding:8px 10px"><button onclick="eliminarIndiceCampania('${h.id}')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:14px">🗑</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>` : `<div style="margin-top:16px;font-size:12px;color:#bbb;text-align:center">Sin campañas cerradas todavía.</div>`;

  return `<div class="card-body" style="padding:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:12px;color:var(--texto-suave)">Calculado desde las novedades del rodeo. Se actualiza solo.</div>
      <button class="btn btn-primary" style="font-size:12px;padding:6px 14px" onclick="cerrarCampaniaIndices('${rodeoId}',${inseminadas},${totalPren},${nacimientos},${abortos},${muertesTerneros},${destetes},'${iPrenez||''}','${iParicion||''}','${iAborto||''}','${iMuerte||''}','${iDestete||''}')">
        📁 Cerrar campaña y guardar
      </button>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      ${cardIndice('Inseminadas', null, inseminadas, '—', '', '🐂', 'Entradas al servicio')}
      ${cardIndice('% Preñez', iPrenez, totalPren, inseminadas, '', '🔬', 'Preñadas / Inseminadas')}
      ${cardIndice('% Parición', iParicion, nacimientos, totalPren||inseminadas, '', '🐄', 'Nacidos / Preñadas')}
      ${cardIndice('% Abortos', iAborto, abortos, totalPren||inseminadas, '', '⚠️', 'Abortos / Preñadas')}
      ${cardIndice('% Mort. terneros', iMuerte, muertesTerneros, nacimientos, '', '💀', 'Muertes / Nacidos')}
      ${cardIndice('% Destete', iDestete, destetes, inseminadas||totalPren, '', '🐂', 'Destetados / Inseminadas')}
    </div>
    ${histHTML}
  </div>`;
}

function renderTabNovedades(novedades) {
  return `<div class="card-body" style="padding-top:12px">
    ${novedades.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Cant.</th><th></th></tr></thead>
      <tbody>${novedades.map(n => {
        const ico = ICONOS_NOV[n.tipo] || '📝';
        const det = n.subtipo ? `<span class="badge badge-gray" style="font-size:11px">${n.subtipo}</span> ` : '';
        return `<tr>
          <td>${fmtFecha(n.fecha)}</td>
          <td>${ico} <strong>${n.tipo || '—'}</strong></td>
          <td>${det}${n.descripcion || '—'}</td>
          <td>${n.cantidad ?? '—'}</td>
          <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarNovedadManga('${n.id}')">🗑️</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`
    : `<div class="empty-state" style="padding:24px"><div class="icon">📋</div><p>Sin novedades. Usá el botón "Novedad" para registrar.</p></div>`}
  </div>`;
}

// ── Tab Trabajos (histórico) ──────────────────────────────

function renderTabTrabajos(trabajos) {
  return `<div class="card-body" style="padding-top:12px">
    <div style="font-size:12px;color:var(--texto-suave);margin-bottom:8px">Trabajos de manga registrados antes de la actualización del sistema.</div>
    ${trabajos.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Dosis</th><th>Cant.</th><th>Veterinario</th><th>Obs.</th><th></th></tr></thead>
      <tbody>${trabajos.map(t => `<tr>
        <td>${fmtFecha(t.fecha)}</td>
        <td><span class="badge badge-bordo">${t.tipo || '—'}</span></td>
        <td>${t.producto || '—'}</td><td>${t.dosis || '—'}</td>
        <td>${t.cantidad_animales || '—'}</td><td>${t.veterinario || '—'}</td>
        <td>${t.observaciones || '—'}</td>
        <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarTrabajoManga('${t.id}')">🗑️</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`
    : `<div class="empty-state" style="padding:24px"><div class="icon">📋</div><p>Sin trabajos anteriores</p></div>`}
  </div>`;
}

// ── Tab Animales (cards) ──────────────────────────────────

function filtrarAnimales(rodeoId) {
  renderDetalleManga();
}

function renderTabAnimales(rodeoId, animales) {
  const cardStyle = 'border:1.5px solid #ccc;border-radius:10px;padding:12px;cursor:pointer;transition:box-shadow .15s,border-color .15s';

  // Leer filtros activos
  const fCar = (document.getElementById(`f-caravana-${rodeoId}`)?.value || '').toLowerCase().trim();
  const fSexo = document.getElementById(`f-sexo-${rodeoId}`)?.value || '';
  const fCat = document.getElementById(`f-cat-${rodeoId}`)?.value || '';
  const fRep = document.getElementById(`f-rep-${rodeoId}`)?.value || '';
  const fFechaDesde = document.getElementById(`f-fecha-desde-${rodeoId}`)?.value || '';
  const fFechaHasta = document.getElementById(`f-fecha-hasta-${rodeoId}`)?.value || '';
  const fRenspa = document.getElementById(`f-renspa-${rodeoId}`)?.value || '';

  let animalesFiltrados = animales;
  if (fCar) animalesFiltrados = animalesFiltrados.filter(a =>
    (a.caravana_interna || '').toLowerCase().includes(fCar) ||
    (a.caravana_electronica || '').toLowerCase().includes(fCar));
  if (fSexo) animalesFiltrados = animalesFiltrados.filter(a => a.sexo === fSexo);
  if (fCat) animalesFiltrados = animalesFiltrados.filter(a => a.categoria === fCat);
  if (fRep) animalesFiltrados = animalesFiltrados.filter(a => {
    const ultimo = serviciosAnimal.filter(s => s.animal_id === a.id).sort((x,y) => new Date(y.fecha)-new Date(x.fecha))[0];
    return (ultimo?.resultado || 'Sin registro') === fRep;
  });
  if (fFechaDesde) animalesFiltrados = animalesFiltrados.filter(a => a.fecha_nacimiento >= fFechaDesde);
  if (fFechaHasta) animalesFiltrados = animalesFiltrados.filter(a => a.fecha_nacimiento <= fFechaHasta);
  if (fRenspa) animalesFiltrados = animalesFiltrados.filter(a => a.renspa_id === fRenspa);

  const cats = [...new Set(animales.map(a => a.categoria).filter(Boolean))].sort();

  return `<div class="card-body" style="padding-top:12px">
    <button class="btn btn-secondary" style="font-size:12px;margin-bottom:12px" onclick="toggleFormAnimalManga('${rodeoId}')">+ Agregar animal</button>
    <div id="form-animal-${rodeoId}" style="display:none;background:var(--fondo);border-radius:8px;padding:12px;margin-bottom:16px">
      <div class="form-grid">
        <div class="form-group"><label>Caravana interna</label><input type="text" id="an-caravana-interna" placeholder="Ej: 12"></div>
        <div class="form-group"><label>Caravana electrónica</label><input type="text" id="an-caravana-electronica" placeholder="Ej: 982000123456789"></div>
        <div class="form-group"><label>Sexo</label><select id="an-sexo" onchange="actualizarCats('an-sexo','an-cat')"><option>Hembra</option><option>Macho</option></select></div>
        <div class="form-group"><label>Categoría</label><select id="an-cat">
          <option>Ternera</option><option>Vaquillona</option><option>Vaca</option>
        </select></div>
        <div class="form-group"><label>Raza</label><input type="text" id="an-raza" placeholder="Ej: Angus, Hereford"></div>
        <div class="form-group"><label>Fecha nac.</label><input type="date" id="an-nacimiento"></div>
        <div class="form-group"><label>Caravana madre</label><input type="text" id="an-madre" placeholder="Ej: 456"></div>
        <div class="form-group"><label>Padre (toro/semen)</label><input type="text" id="an-padre" placeholder="Ej: Tornado, ABS-1234"></div>
        <div class="form-group"><label>RENSPA / Propietario</label><select id="an-renspa"><option value="">— Propio —</option></select></div>
        <div class="form-group"><label>Observaciones</label><input type="text" id="an-obs" placeholder="Opcional"></div>
      </div>
      <button class="btn btn-primary" style="font-size:13px" onclick="guardarAnimalManga('${rodeoId}')">Guardar</button>
      <button class="btn btn-secondary" style="font-size:13px;margin-left:8px" onclick="toggleFormAnimalManga('${rodeoId}')">Cancelar</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding:10px;background:var(--fondo);border-radius:8px;border:1px solid var(--borde)">
      <input type="text" id="f-caravana-${rodeoId}" value="${fCar}" placeholder="🔍 Caravana" style="width:120px;font-size:13px;padding:5px 8px" oninput="renderDetalleManga()">
      <select id="f-sexo-${rodeoId}" style="font-size:13px;padding:5px 8px" onchange="renderDetalleManga()">
        <option value="" ${!fSexo?'selected':''}>Todos los sexos</option>
        <option ${fSexo==='Hembra'?'selected':''}>Hembra</option>
        <option ${fSexo==='Macho'?'selected':''}>Macho</option>
      </select>
      <select id="f-cat-${rodeoId}" style="font-size:13px;padding:5px 8px" onchange="renderDetalleManga()">
        <option value="" ${!fCat?'selected':''}>Todas las categorías</option>${cats.map(c => `<option ${fCat===c?'selected':''}>${c}</option>`).join('')}
      </select>
      <select id="f-rep-${rodeoId}" style="font-size:13px;padding:5px 8px" onchange="renderDetalleManga()">
        <option value="" ${!fRep?'selected':''}>Estado reproductivo</option>
        ${['Preñada','Vacía','Pendiente','Repetidora','Abortó','Sin registro'].map(v=>`<option ${fRep===v?'selected':''}>${v}</option>`).join('')}
      </select>
      <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--texto-suave)">
        Nac. desde <input type="date" id="f-fecha-desde-${rodeoId}" value="${fFechaDesde}" style="font-size:12px;padding:4px 6px" onchange="renderDetalleManga()">
        hasta <input type="date" id="f-fecha-hasta-${rodeoId}" value="${fFechaHasta}" style="font-size:12px;padding:4px 6px" onchange="renderDetalleManga()">
      </div>
      ${renspas.length ? `<select id="f-renspa-${rodeoId}" style="font-size:13px;padding:5px 8px" onchange="renderDetalleManga()">
        <option value="" ${!fRenspa?'selected':''}>Todos los RENSPA</option>
        <option value="__propio__" ${fRenspa==='__propio__'?'selected':''}>— Propio —</option>
        ${renspas.map(r => `<option value="${r.id}" ${fRenspa===r.id?'selected':''}>${r.propietario}</option>`).join('')}
      </select>` : ''}
      <span style="font-size:12px;color:var(--texto-suave);align-self:center">${animalesFiltrados.length} de ${animales.length}</span>
    </div>
    ${(() => {
      const porCat = {};
      animalesFiltrados.forEach(a => { if (a.categoria) porCat[a.categoria] = (porCat[a.categoria] || 0) + 1; });
      const entries = Object.entries(porCat);
      if (!entries.length) return '';
      return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;font-size:12px">
        ${entries.map(([cat, n]) => `<span style="background:var(--fondo);border:1px solid var(--gris-borde);border-radius:6px;padding:3px 10px;color:var(--texto-suave)"><strong style="color:var(--texto)">${n}</strong> ${cat}</span>`).join('')}
      </div>`;
    })()}
    ${animalesFiltrados.length
      ? `<div class="lotes-grid">${animalesFiltrados.map(a => {
          const color = a.sexo === 'Hembra' ? 'bordo' : 'cielo';
          const servicios = serviciosAnimal.filter(s => s.animal_id === a.id);
          const ultimoSrv = servicios[0];
          const _ref = a.caravana_interna || a.caravana_electronica;
          const crias = _ref ? animalesRodeo.filter(x => x.caravana_madre === _ref).length : 0;
          const esHembraCard = a.sexo === 'Hembra';

          // Estado reproductivo
          const resUlt = ultimoSrv?.resultado || '';
          const estadoReprod = resUlt || (esHembraCard ? 'Sin datos' : '');
          const colReprod = resUlt === 'Preñada' ? '#1a7a3a' : resUlt === 'Vacía' ? '#b32b2b' : resUlt === 'Pendiente' ? '#7a5a00' : resUlt === 'Abortó' ? '#7a2020' : '#666';
          const bgReprod  = resUlt === 'Preñada' ? '#d4edda' : resUlt === 'Vacía' ? '#fce8e8' : resUlt === 'Pendiente' ? '#fff3cd' : resUlt === 'Abortó' ? '#fce8e8' : '#f0f0f0';

          // Estado fisiológico
          let estadoFisio = '', colFisio = '', bgFisio = '';
          if (esHembraCard) {
            if (crias > 0) { estadoFisio = 'En lactancia'; colFisio = '#1a5f8a'; bgFisio = '#d0eaf8'; }
            else           { estadoFisio = 'Seca';         colFisio = '#5a4a1a'; bgFisio = '#f5ecd5'; }
          }

          // Fecha probable de parto
          let fppHtml = '';
          if (resUlt === 'Preñada' && ultimoSrv?.fecha) {
            const fSrv = new Date(ultimoSrv.fecha);
            const fParto = new Date(fSrv); fParto.setDate(fParto.getDate() + 270);
            const hoyCard = new Date(); hoyCard.setHours(0,0,0,0);
            const diasG = Math.floor((hoyCard - fSrv) / 86400000);
            const diasR = Math.floor((fParto - hoyCard) / 86400000);
            const fmtFP = d => { const dd=String(d.getDate()).padStart(2,'0'),mm=String(d.getMonth()+1).padStart(2,'0'),aa=String(d.getFullYear()).slice(-2); return `${dd}/${mm}/${aa}`; };
            fppHtml = `<div style="margin-top:6px;text-align:center">
              <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px">Parto probable</div>
              <div style="font-size:14px;font-weight:700;color:#1a7a3a">${fmtFP(fParto)}</div>
              <div style="font-size:11px;color:#555">${diasG} días gest. · ${diasR > 0 ? diasR + ' días' : '¡Vencida!'}</div>
            </div>`;
          }

          // Datos de pesadas para la tarjeta
          const pesadasCard = pesadasAnimal.filter(p => p.animal_id === a.id).sort((x,y) => new Date(x.fecha)-new Date(y.fecha));
          const ultPesCard = pesadasCard.length ? pesadasCard[pesadasCard.length-1] : null;
          const pesadasCardHtml = (() => {
            if (!ultPesCard) return '';
            const hoyC = new Date(); hoyC.setHours(0,0,0,0);
            const nacC = a.fecha_nacimiento ? new Date(a.fecha_nacimiento) : null;
            const diasEdad = nacC ? Math.floor((hoyC - nacC) / 86400000) : null;
            const mesesEdad = diasEdad != null ? Math.floor(diasEdad / 30.44) : null;
            let gdpCard = '—';
            if (pesadasCard.length >= 2) {
              const primera = pesadasCard[0];
              const d = Math.floor((new Date(ultPesCard.fecha)-new Date(primera.fecha))/86400000);
              if (d > 0) gdpCard = ((ultPesCard.peso_kg - primera.peso_kg) / d).toFixed(2) + ' kg/día';
            } else if (nacC) {
              const d = Math.floor((new Date(ultPesCard.fecha) - nacC) / 86400000);
              if (d > 0) gdpCard = (ultPesCard.peso_kg / d).toFixed(2) + ' kg/día';
            }
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:110px">
              ${diasEdad != null ? `<div style="text-align:center"><div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px">Edad</div><div style="font-size:15px;font-weight:800;color:var(--cielo)">${diasEdad} d <span style="font-size:12px;font-weight:500">(${mesesEdad}m)</span></div></div>` : ''}
              <div style="text-align:center"><div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px">Último peso</div><div style="font-size:18px;font-weight:800;color:var(--verde)">${ultPesCard.peso_kg} kg</div></div>
              <div style="text-align:center"><div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.5px">GDP</div><div style="font-size:13px;font-weight:700;color:var(--tierra)">${gdpCard}</div></div>
            </div>`;
          })();

          const catAmarilla = ['Ternero','Novillito','Novillo'].includes(a.categoria);
          const catNaranja  = ['Ternera','Vaquillona'].includes(a.categoria);
          const bgCard = resUlt === 'Pre' + '\u00f1' + 'ada' ? '#f0faf3'
            : resUlt === 'Vac' + '\u00ed' + 'a' ? '#fdf3f3'
            : resUlt === 'Abort' + '\u00f3' ? '#fdf3f3'
            : resUlt === 'Pendiente' ? '#fdfaf0'
            : crias > 0 ? '#eef5fb'
            : catAmarilla ? '#fdfbe8'
            : catNaranja  ? '#fdf3e8'
            : '#fafafa';
          const borderCard = resUlt === 'Pre' + '\u00f1' + 'ada' ? '#7dc89a'
            : resUlt === 'Vac' + '\u00ed' + 'a' ? '#e8a0a0'
            : resUlt === 'Abort' + '\u00f3' ? '#e8a0a0'
            : resUlt === 'Pendiente' ? '#d4c060'
            : crias > 0 ? '#7ab0d8'
            : catAmarilla ? '#d4c840'
            : catNaranja  ? '#d4904a'
            : '#ccc';

          return `<div style="${cardStyle};background:${bgCard};border-color:${borderCard};display:flex;justify-content:space-between;align-items:center;gap:10px;position:relative" onclick="seleccionarAnimal('${a.id}')">
            <button class="btn btn-danger" style="position:absolute;top:8px;right:8px;padding:2px 7px;font-size:12px;z-index:1" onclick="event.stopPropagation();borrarAnimalManga('${a.id}')">🗑️</button>
            <div style="flex:1;min-width:0">
              <div style="margin-bottom:6px">
                <span class="badge badge-${color}" style="font-size:13px;padding:4px 10px">${a.categoria || a.sexo || '—'}</span>
              </div>
              <div style="font-size:22px;font-weight:800;color:var(--${color});margin-bottom:3px">#${caravanaDisplay(a)}</div>
              ${a.caravana_interna && a.caravana_electronica ? `<div style="font-size:12px;color:var(--texto-suave)">E: ${a.caravana_electronica}</div>` : ''}
              <div style="font-size:13px;color:var(--texto-suave)">${a.raza || ''}</div>
              ${a.caravana_madre ? `<div style="font-size:12px;color:var(--texto-suave);margin-top:3px">Madre: ${a.caravana_madre}</div>` : ''}
              ${a.renspa_id ? `<div style="font-size:12px;color:var(--cielo);margin-top:3px">🏷️ ${renspaLabel(a.renspa_id) || ''}</div>` : ''}
              ${crias ? `<div style="font-size:12px;color:var(--verde);margin-top:3px">🐣 ${crias} cría${crias !== 1 ? 's' : ''}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;flex:1;text-align:center">
              ${esHembraCard && ultimoSrv && estadoReprod ? `<div style="background:${bgReprod};color:${colReprod};border-radius:8px;padding:7px 12px;font-size:17px;font-weight:800;text-align:center;width:100%;box-sizing:border-box">${estadoReprod}</div>` : ''}
              ${esHembraCard && ultimoSrv && estadoFisio ? `<div style="background:${bgFisio};color:${colFisio};border-radius:8px;padding:6px 12px;font-size:14px;font-weight:700;text-align:center;width:100%;box-sizing:border-box">${estadoFisio}</div>` : ''}
              ${fppHtml}
              ${pesadasCardHtml}
            </div>
          </div>`;
        }).join('')}</div>
        <div style="font-size:12px;color:var(--texto-suave);margin-top:8px">Tocá una tarjeta para ver la ficha del animal</div>`
      : `<div class="empty-state" style="padding:24px"><div class="icon">🐄</div><p>${animales.length ? 'Ningún animal coincide con los filtros' : 'Sin animales identificados en este rodeo.<br>Registrá un "Ingreso" o "Nacimiento" para cargarlos.'}</p></div>`}
  </div>`;
}

// ── Vista global (sin rodeo seleccionado) ─────────────────

function renderVistaGlobal() {
  const detalle = document.getElementById('manga-detalle');
  if (!detalle) return;
  const rows = novedadesGanaderas;
  if (!rows.length) {
    detalle.innerHTML = '<div class="card" style="margin-top:16px"><div class="card-body"><div class="empty-state"><div class="icon">📋</div><h3>Sin novedades registradas</h3><p>Tocá una tarjeta de rodeo para ver sus datos, o usá "+ Registrar novedad"</p></div></div></div>';
    return;
  }
  const desde = (paginaManga - 1) * FILAS_POR_PAGINA;
  const pag = rows.slice(desde, desde + FILAS_POR_PAGINA);
  const getNombre = id => (rodeos.find(r => r.id === id) || {}).nombre || '—';
  detalle.innerHTML = `<div class="card" style="margin-top:16px">
    <div class="card-header"><h3>Todas las novedades</h3></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Rodeo</th><th>Tipo</th><th>Detalle</th><th>Cant.</th><th></th></tr></thead>
      <tbody>${pag.map(n => {
        const ico = ICONOS_NOV[n.tipo] || '📝';
        const det = n.subtipo ? `<span class="badge badge-gray" style="font-size:11px">${n.subtipo}</span> ` : '';
        return `<tr>
          <td>${fmtFecha(n.fecha)}</td><td>${getNombre(n.rodeo_id)}</td>
          <td>${ico} ${n.tipo || '—'}</td>
          <td>${det}${n.descripcion || '—'}</td>
          <td>${n.cantidad ?? '—'}</td>
          <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarNovedadManga('${n.id}')">🗑️</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
    ${htmlPaginador(paginaManga, rows.length, 'cambiarPaginaManga')}
  </div>`;
}

function cambiarPaginaManga(p) { paginaManga = p; renderVistaGlobal(); }

// ── Ficha animal ──────────────────────────────────────────

function seleccionarAnimal(id) {
  animalSeleccionado = animalSeleccionado === id ? null : id;
  tabAnimalActiva = 'datos';
  renderDetalleManga();
  if (animalSeleccionado) setTimeout(() => document.getElementById('ficha-animal')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function switchTabAnimal(tab) {
  tabAnimalActiva = tab;
  document.getElementById('ficha-animal-body').innerHTML = renderContenidoFicha(tab);
}

function renderFichaAnimal(animalId) {
  const a = animalesRodeo.find(x => x.id === animalId);
  if (!a) return '';
  const esHembra = a.sexo === 'Hembra';
  const madre = animalesRodeo.find(x => x.caravana === a.caravana_madre);
  const cria_ref = a.caravana_interna || a.caravana_electronica;
  const crias = cria_ref ? animalesRodeo.filter(x => x.caravana_madre === cria_ref) : [];
  const servicios = serviciosAnimal.filter(s => s.animal_id === animalId);
  const sanidadDelAnimal = sanidadAnimal.filter(s => s.animal_id === animalId);
  const pesadasDelAnimal = pesadasAnimal.filter(p => p.animal_id === animalId).sort((x,y) => new Date(x.fecha)-new Date(y.fecha));

  window._fichaAnimal = { a, madre, crias, servicios, sanidadDelAnimal, esHembra, pesadasDelAnimal };

  return `<div id="ficha-animal" class="card" style="margin-top:12px;border-top:3px solid var(--cielo)">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h3>🐄 #${caravanaDisplay(a)} <span class="badge badge-${a.sexo === 'Hembra' ? 'bordo' : 'cielo'}" style="font-size:12px">${a.categoria || a.sexo || ''}</span></h3>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" style="font-size:12px" onclick="toggleEditarAnimal('${a.id}')">✏️ Editar</button>
        <button class="btn btn-secondary" style="font-size:12px" onclick="animalSeleccionado=null;renderDetalleManga()">✕ Cerrar</button>
      </div>
    </div>
    <div class="tabs" style="border-bottom:1px solid var(--borde)">
      <div class="tab${tabAnimalActiva === 'datos' ? ' active' : ''}" onclick="switchTabAnimal('datos')">Datos</div>
      ${esHembra ? `<div class="tab${tabAnimalActiva === 'reproductivo' ? ' active' : ''}" onclick="switchTabAnimal('reproductivo')">Reproductivo <span style="font-size:11px;color:var(--texto-suave)">(${servicios.length})</span></div>` : ''}
      ${!esHembra && a.categoria === 'Toro' || a.categoria === 'Torito' ? `<div class="tab${tabAnimalActiva === 'servicios-toro' ? ' active' : ''}" onclick="switchTabAnimal('servicios-toro')">Servicios realizados</div>` : ''}
      <div class="tab${tabAnimalActiva === 'pesadas' ? ' active' : ''}" onclick="switchTabAnimal('pesadas')">Pesadas <span style="font-size:11px;color:var(--texto-suave)">(${pesadasDelAnimal.length})</span></div>
      <div class="tab${tabAnimalActiva === 'medico' ? ' active' : ''}" onclick="switchTabAnimal('medico')">Historial médico <span style="font-size:11px;color:var(--texto-suave)">(${sanidadDelAnimal.length})</span></div>
    </div>
    <div id="ficha-animal-body">${renderContenidoFicha(tabAnimalActiva)}</div>
  </div>`;
}

function renderContenidoFicha(tab) {
  const { a, madre, crias, servicios, sanidadDelAnimal, esHembra, pesadasDelAnimal } = window._fichaAnimal || {};
  if (!a) return '';

  if (tab === 'datos') {
    return `<div class="card-body">
      <div id="ficha-editar-${a.id}" style="display:none;background:var(--fondo);border-radius:8px;padding:12px;margin-bottom:16px">
        <div class="form-grid">
          <div class="form-group"><label>Caravana interna</label><input type="text" id="edit-caravana-interna" value="${a.caravana_interna || ''}"></div>
          <div class="form-group"><label>Caravana electrónica</label><input type="text" id="edit-caravana-electronica" value="${a.caravana_electronica || ''}"></div>
          <div class="form-group"><label>Sexo</label><select id="edit-sexo" onchange="actualizarCats('edit-sexo','edit-cat')">
            <option${a.sexo === 'Hembra' ? ' selected' : ''}>Hembra</option>
            <option${a.sexo === 'Macho' ? ' selected' : ''}>Macho</option>
          </select></div>
          <div class="form-group"><label>Categoría</label><select id="edit-cat">
            ${catsPorSexo(a.sexo || 'Hembra').map(c => `<option${a.categoria === c ? ' selected' : ''}>${c}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Raza</label><input type="text" id="edit-raza" value="${a.raza || ''}"></div>
          <div class="form-group"><label>Fecha nac.</label><input type="date" id="edit-nacimiento" value="${a.fecha_nacimiento || ''}"></div>
          <div class="form-group"><label>Caravana madre</label><input type="text" id="edit-madre" value="${a.caravana_madre || ''}"></div>
          <div class="form-group"><label>Padre (toro/semen)</label><input type="text" id="edit-padre" value="${a.caravana_padre || ''}"></div>
          <div class="form-group"><label>RENSPA / Propietario</label><select id="edit-renspa">
            <option value=""${!a.renspa_id ? ' selected' : ''}>— Propio —</option>
            ${renspas.map(r => `<option value="${r.id}"${a.renspa_id === r.id ? ' selected' : ''}>${r.propietario} · ${r.numero}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Observaciones</label><input type="text" id="edit-obs" value="${a.observaciones || ''}"></div>
        </div>
        <button class="btn btn-primary" style="font-size:13px" onclick="guardarEdicionAnimal('${a.id}')">Guardar cambios</button>
        <button class="btn btn-secondary" style="font-size:13px;margin-left:8px" onclick="toggleEditarAnimal('${a.id}')">Cancelar</button>
      </div>
      <div class="form-grid">
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Caravana interna</label><div style="font-weight:600;font-size:15px">${a.caravana_interna || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Caravana electrónica</label><div>${a.caravana_electronica || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Sexo</label><div>${a.sexo || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Categoría</label><div>${a.categoria || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Raza</label><div>${a.raza || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Fecha de nacimiento</label><div>${fmtFecha(a.fecha_nacimiento)}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Madre</label>
          <div>${a.caravana_madre ? `<strong>${a.caravana_madre}</strong>${madre ? ` · ${madre.raza || ''}` : ''}` : '—'}</div>
        </div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Padre (toro/semen)</label><div>${a.caravana_padre || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">RENSPA / Propietario</label><div>${renspaLabel(a.renspa_id) || '— Propio —'}</div></div>
        ${a.observaciones ? `<div class="form-group full"><label style="font-size:11px;color:var(--texto-suave)">Observaciones</label><div>${a.observaciones}</div></div>` : ''}
      </div>
      ${crias.length ? `<div style="margin-top:16px">
        <div style="font-size:12px;font-weight:600;color:var(--texto-suave);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Crías (${crias.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${crias.map(c => `<span class="badge badge-${c.sexo === 'Hembra' ? 'tierra' : 'cielo'}" style="cursor:pointer" onclick="seleccionarAnimal('${c.id}')">${caravanaDisplay(c)} ${c.sexo === 'Hembra' ? '♀' : '♂'} ${fmtFecha(c.fecha_nacimiento)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>`;
  }

  if (tab === 'reproductivo' && esHembra) {
    const ref = a.caravana_interna || a.caravana_electronica;

    // ── Armar ciclos reproductivos ──────────────────────────
    // Ordenar servicios cronológicamente (más antiguo primero)
    const srvOrdenados = [...servicios].sort((x, y) => new Date(x.fecha) - new Date(y.fecha));

    // Agrupar: cada IATF/Toro abre un nuevo ciclo; Tacto se adhiere al ciclo anterior
    const ciclos = [];
    srvOrdenados.forEach(s => {
      const esTacto = (s.metodo || '').toLowerCase() === 'tacto';
      if (!esTacto || !ciclos.length) {
        ciclos.push({ srv: s, tactos: esTacto ? [] : [], srvId: s.id });
        if (esTacto) ciclos[ciclos.length - 1].tactos.push(s);
      } else {
        ciclos[ciclos.length - 1].tactos.push(s);
      }
    });

    // Para cada ciclo buscar parición entre las crías de este animal
    const refMadre = a.caravana_interna || a.caravana_electronica;
    const criasAnimal = animalesRodeo.filter(x => x.caravana_madre && refMadre &&
      (x.caravana_madre === a.caravana_interna || x.caravana_madre === a.caravana_electronica));

    function paricionDeCiclo(ciclo) {
      if (!ciclo.srv.fecha) return null;
      const fSrv = new Date(ciclo.srv.fecha);
      // Buscar cría nacida entre 180 y 340 días después del servicio
      return criasAnimal.find(c => {
        if (!c.fecha_nacimiento) return false;
        const dias = (new Date(c.fecha_nacimiento) - fSrv) / 86400000;
        return dias >= 180 && dias <= 340;
      }) || null;
    }

    // Banner de gestación activa (ciclo más reciente con Preñada/Pendiente)
    const cicloActivo = [...ciclos].reverse().find(c => {
      const resUlt = c.tactos.length
        ? c.tactos[c.tactos.length - 1].resultado
        : c.srv.resultado;
      return resUlt === 'Preñada' || resUlt === 'Pendiente';
    });
    const bannerHtml = (() => {
      if (!cicloActivo || !cicloActivo.srv.fecha) return '';
      const fSrv = new Date(cicloActivo.srv.fecha);
      const fParto = new Date(fSrv); fParto.setDate(fParto.getDate() + 270);
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const diasG = Math.floor((hoy - fSrv) / 86400000);
      const diasR = Math.floor((fParto - hoy) / 86400000);
      const fmtD = d => d.toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'});
      const badge = diasG >= 270
        ? `<span class="badge badge-bordo" style="font-size:13px">¡Parto vencido!</span>`
        : diasR <= 30
          ? `<span class="badge badge-tierra" style="font-size:13px">Próxima al parto (${diasR} días)</span>`
          : `<span class="badge badge-verde" style="font-size:13px">En gestación</span>`;
      return `<div style="background:var(--fondo);border:1px solid var(--gris-borde);border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:16px;align-items:center">
        ${badge}
        <div style="display:flex;flex-wrap:wrap;gap:20px">
          <div style="text-align:center"><div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.5px">Servicio</div><div style="font-size:15px;font-weight:700">${fmtD(fSrv)}</div></div>
          <div style="text-align:center"><div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.5px">Días gestantes</div><div style="font-size:22px;font-weight:800;color:${diasG>=270?'var(--bordo)':'var(--verde)'}">${diasG}</div></div>
          <div style="text-align:center"><div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.5px">Parto probable</div><div style="font-size:15px;font-weight:700">${fmtD(fParto)}</div></div>
        </div>
      </div>`;
    })();

    // Tabla de ciclos
    const colRes = { 'Preñada':'verde','Vacía':'rojo','Repetidora':'tierra','Pendiente':'gray','Abortó':'bordo' };
    const ciclosHtml = ciclos.length ? `<div class="table-wrap"><table>
      <thead><tr>
        <th style="width:28px">#</th>
        <th>Inseminación</th><th>Método</th><th>Toro / Semen</th>
        <th>Fecha tacto</th><th>Resultado</th>
        <th>Parto probable</th><th>Parición</th><th>Cría</th>
        <th>Obs.</th><th></th>
      </tr></thead>
      <tbody>${[...ciclos].reverse().map((c, i) => {
        const num = ciclos.length - i;
        // Resultado final: último tacto o el del propio servicio
        const ultimoTacto = c.tactos.length ? c.tactos[c.tactos.length - 1] : null;
        const resultado = ultimoTacto?.resultado || c.srv.resultado || '—';
        const fechaTacto = ultimoTacto?.fecha_tacto || ultimoTacto?.fecha || c.srv.fecha_tacto;
        const paricion = paricionDeCiclo(c);
        const bgRow = resultado === 'Preñada' ? 'background:#f6fdf8'
          : resultado === 'Vacía' ? 'background:#fdf6f6'
          : resultado === 'Abortó' ? 'background:#fdf3f0'
          : '';
        // Tactos adicionales (puede haber más de uno)
        const tactoExtra = c.tactos.length > 1
          ? c.tactos.slice(0, -1).map(t => `<div style="font-size:11px;color:var(--texto-suave);margin-top:2px">${fmtFecha(t.fecha_tacto || t.fecha)} → <span class="badge badge-${colRes[t.resultado]||'gray'}" style="font-size:9px">${t.resultado}</span></div>`).join('')
          : '';
        return `<tr style="${bgRow}">
          <td style="font-weight:700;color:var(--texto-suave);font-size:13px">${num}</td>
          <td style="font-weight:600">${fmtFecha(c.srv.fecha)}</td>
          <td><span class="badge badge-cielo" style="font-size:11px">${c.srv.metodo || '—'}</span></td>
          <td>${c.srv.toro || '—'}</td>
          <td>${fmtFecha(fechaTacto)}${tactoExtra}</td>
          <td><span class="badge badge-${colRes[resultado]||'gray'}">${resultado}</span></td>
          <td style="font-weight:600;color:var(--verde)">${c.srv.fecha ? fmtFecha(new Date(new Date(c.srv.fecha).setDate(new Date(c.srv.fecha).getDate()+270))) : '—'}</td>
          <td style="font-weight:${paricion?'600':'400'};color:${paricion?'var(--verde)':'var(--texto-suave)'}">${paricion ? fmtFecha(paricion.fecha_nacimiento) : (resultado === 'Preñada' ? '<span style="color:var(--verde);font-size:11px">Pendiente</span>' : '—')}</td>
          <td>${paricion ? `<span class="badge badge-${paricion.sexo==='Hembra'?'bordo':'cielo'}" style="font-size:11px;cursor:pointer" onclick="seleccionarAnimal('${paricion.id}')">#${caravanaDisplay(paricion)}</span>` : '—'}</td>
          <td style="font-size:12px;color:var(--texto-suave)">${c.srv.observaciones || '—'}</td>
          <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarServicio('${c.srv.id}')">🗑️</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`
    : `<div class="empty-state" style="padding:24px"><div class="icon">🐄</div><p>Sin ciclos reproductivos registrados</p></div>`;

    return `<div class="card-body" style="padding-top:12px">
      <button class="btn btn-secondary" style="font-size:12px;margin-bottom:12px" onclick="toggleFormServicio()">+ Registrar servicio / tacto</button>
      <div id="form-servicio" style="display:none;background:var(--fondo);border-radius:8px;padding:12px;margin-bottom:16px">
        <div class="form-grid">
          <div class="form-group"><label>Fecha servicio</label><input type="date" id="srv-fecha"></div>
          <div class="form-group"><label>Método</label><select id="srv-metodo"><option>IATF</option><option>Toro</option><option>Tacto</option></select></div>
          <div class="form-group"><label>Toro / Semen</label><input type="text" id="srv-toro" placeholder="Ej: Tornado, ABS-1234"></div>
          <div class="form-group"><label>Resultado tacto</label><select id="srv-resultado">
            <option>Pendiente</option><option>Preñada</option><option>Vacía</option><option>Repetidora</option><option>Abortó</option>
          </select></div>
          <div class="form-group"><label>Fecha tacto</label><input type="date" id="srv-fecha-tacto"></div>
          <div class="form-group"><label>Observaciones</label><input type="text" id="srv-obs" placeholder="Opcional"></div>
        </div>
        <button class="btn btn-primary" style="font-size:13px" onclick="guardarServicio('${a.id}')">Guardar</button>
        <button class="btn btn-secondary" style="font-size:13px;margin-left:8px" onclick="toggleFormServicio()">Cancelar</button>
      </div>
      ${bannerHtml}
      ${ciclosHtml}
    </div>`;
  }

  if (tab === 'servicios-toro') {
    const carRef = a.caravana_interna || a.caravana_electronica;
    const historial = novedadesGanaderas.filter(n =>
      (n.tipo === 'Entrada de toros' || n.tipo === 'Retiro de toros') &&
      n.detalle?.toros?.includes(carRef)
    ).sort((x, y) => new Date(y.fecha) - new Date(x.fecha));

    return `<div class="card-body" style="padding-top:12px">
      ${historial.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Evento</th><th>Rodeo</th><th>Detalle</th></tr></thead>
        <tbody>${historial.map(n => {
          const rodeo = rodeos.find(r => r.id === n.rodeo_id);
          const ico = n.tipo === 'Entrada de toros' ? '🐂 Entrada' : '🔙 Retiro';
          const extra = n.tipo === 'Entrada de toros' && n.detalle?.fecha_retiro_estimada
            ? `Retiro est.: ${fmtFecha(n.detalle.fecha_retiro_estimada)}` : '';
          return `<tr>
            <td>${fmtFecha(n.fecha)}</td>
            <td><strong>${ico}</strong></td>
            <td>${rodeo?.nombre || '—'}</td>
            <td style="font-size:12px;color:var(--texto-suave)">${extra}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`
      : `<div class="empty-state" style="padding:24px"><div class="icon">🐂</div><p>Sin historial de servicios registrado</p></div>`}
    </div>`;
  }

  if (tab === 'pesadas') {
    const pesadas = pesadasDelAnimal || [];
    // Edad del animal
    const edadHtml = (() => {
      if (!a.fecha_nacimiento) return '';
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const nac = new Date(a.fecha_nacimiento);
      const dias = Math.floor((hoy - nac) / 86400000);
      const meses = Math.floor(dias / 30.44);
      return `<div style="display:inline-flex;gap:16px;background:var(--fondo);border:1px solid var(--gris-borde);border-radius:8px;padding:10px 16px;margin-bottom:14px;align-items:center">
        <div style="text-align:center"><div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.5px">Edad</div><div style="font-size:20px;font-weight:800;color:var(--cielo)">${dias} días <span style="font-size:14px;font-weight:500;color:var(--texto-suave)">(${meses} meses)</span></div></div>
        ${pesadas.length ? (() => {
          const ult = pesadas[pesadas.length-1];
          const primera = pesadas[0];
          const nac = a.fecha_nacimiento ? new Date(a.fecha_nacimiento) : null;
          // GDP: entre pesadas si hay más de una; si hay solo una, desde nacimiento
          let gdpTotal = '—';
          let gdpLabel = 'GDP promedio';
          if (pesadas.length >= 2) {
            const diasTotal = Math.floor((new Date(ult.fecha) - new Date(primera.fecha)) / 86400000);
            if (diasTotal > 0) gdpTotal = ((ult.peso_kg - primera.peso_kg) / diasTotal).toFixed(2);
          } else if (nac) {
            const diasDesdeNac = Math.floor((new Date(ult.fecha) - nac) / 86400000);
            if (diasDesdeNac > 0) { gdpTotal = (ult.peso_kg / diasDesdeNac).toFixed(2); gdpLabel = 'GDP desde nac.'; }
          }
          return `<div style="text-align:center"><div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.5px">Último peso</div><div style="font-size:20px;font-weight:800;color:var(--verde)">${ult.peso_kg} kg</div><div style="font-size:11px;color:var(--texto-suave)">${fmtFecha(ult.fecha)}</div></div>
          <div style="text-align:center"><div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.5px">${gdpLabel}</div><div style="font-size:20px;font-weight:800;color:var(--tierra)">${gdpTotal !== '—' ? gdpTotal + ' kg/día' : '—'}</div></div>`;
        })() : ''}
      </div>`;
    })();

    const tablaPesadas = pesadas.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Peso (kg)</th><th>Días desde anterior</th><th>Ganancia</th><th>GDP</th><th>Obs.</th><th></th></tr></thead>
      <tbody>${pesadas.map((p, i) => {
        const prev = i > 0 ? pesadas[i-1] : null;
        const nacDate = a.fecha_nacimiento ? new Date(a.fecha_nacimiento) : null;
        // Primera pesada: calcular desde nacimiento si hay fecha
        const diasDesdeNac = !prev && nacDate ? Math.floor((new Date(p.fecha)-nacDate)/86400000) : null;
        const dias = prev ? Math.floor((new Date(p.fecha)-new Date(prev.fecha))/86400000) : (diasDesdeNac != null ? diasDesdeNac : '—');
        const gan = prev ? (p.peso_kg - prev.peso_kg).toFixed(1) : '—';
        const gdp = prev && dias > 0 ? ((p.peso_kg - prev.peso_kg) / dias).toFixed(2)
          : (!prev && diasDesdeNac > 0 ? (p.peso_kg / diasDesdeNac).toFixed(2) : '—');
        const gdpLabel = !prev && diasDesdeNac != null ? 'desde nac.' : 'kg/día';
        const colGan = prev ? (p.peso_kg >= prev.peso_kg ? 'color:var(--verde)' : 'color:var(--rojo)') : '';
        return `<tr>
          <td>${fmtFecha(p.fecha)}</td>
          <td style="font-weight:700">${p.peso_kg} kg</td>
          <td style="color:var(--texto-suave)">${dias}</td>
          <td style="${colGan};font-weight:600">${gan !== '—' ? (p.peso_kg >= (prev?.peso_kg||0) ? '+' : '') + gan + ' kg' : '—'}</td>
          <td style="font-weight:600">${gdp !== '—' ? gdp + ' ' + gdpLabel : '—'}</td>
          <td style="font-size:12px;color:var(--texto-suave)">${p.observaciones || '—'}</td>
          <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarPesadaAnimal('${p.id}','${a.id}')">🗑️</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`
    : `<div class="empty-state" style="padding:24px"><div class="icon">⚖️</div><p>Sin pesadas registradas</p></div>`;

    return `<div class="card-body" style="padding-top:12px">
      ${edadHtml}
      ${tablaPesadas}
    </div>`;
  }

  if (tab === 'medico') {
    return `<div class="card-body" style="padding-top:12px">
      ${sanidadDelAnimal.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Dosis</th><th>Veterinario</th><th>Obs.</th><th></th></tr></thead>
        <tbody>${sanidadDelAnimal.map(s => `<tr>
          <td>${fmtFecha(s.fecha)}</td>
          <td><span class="badge badge-bordo">${s.tipo || '—'}</span></td>
          <td>${s.producto || '—'}</td><td>${s.dosis || '—'}</td>
          <td>${s.veterinario || '—'}</td><td>${s.observaciones || '—'}</td>
          <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarSanidadAnimal('${s.id}')">🗑️</button></td>
        </tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty-state" style="padding:24px"><div class="icon">💉</div><p>Sin tratamientos registrados</p></div>`}
    </div>`;
  }
  return '';
}

// ── Form novedad unificado ────────────────────────────────

function toggleFormNovedad() {
  const f = document.getElementById('form-novedad-wrap');
  const abriendo = f.style.display === 'none';
  f.style.display = abriendo ? '' : 'none';
  if (abriendo) {
    const fd = document.getElementById('nov-fecha-main');
    if (fd && !fd.value) fd.value = new Date().toISOString().split('T')[0];
    onChangeTipoNovedad();
    f.scrollIntoView({ behavior: 'smooth' });
  }
}

function abrirNuevoNovedad(rodeoId) {
  const f = document.getElementById('form-novedad-wrap');
  f.style.display = '';
  const fd = document.getElementById('nov-fecha-main');
  if (fd && !fd.value) fd.value = new Date().toISOString().split('T')[0];
  const sr = document.getElementById('nov-rodeo-main');
  if (sr) sr.value = rodeoId;
  onChangeTipoNovedad();
  f.scrollIntoView({ behavior: 'smooth' });
}

function onChangeTipoNovedad() {
  const tipo = document.getElementById('nov-tipo-main')?.value;
  const panels = ['nov-panel-trabajo', 'nov-panel-nacimiento', 'nov-panel-ingreso', 'nov-panel-destete', 'nov-panel-aborto', 'nov-panel-baja', 'nov-panel-traslado', 'nov-panel-categoria', 'nov-panel-entrada-toros', 'nov-panel-retiro-toros', 'nov-panel-pesada'];
  const mapa = {
    'Trabajo de manga': 'nov-panel-trabajo',
    'Nacimiento': 'nov-panel-nacimiento',
    'Ingreso': 'nov-panel-ingreso',
    'Destete': 'nov-panel-destete',
    'Aborto': 'nov-panel-aborto',
    'Muerte': 'nov-panel-baja',
    'Venta / Salida': 'nov-panel-baja',
    'Traslado': 'nov-panel-traslado',
    'Cambio de categoría': 'nov-panel-categoria',
    'Entrada de toros': 'nov-panel-entrada-toros',
    'Retiro de toros': 'nov-panel-retiro-toros',
    'Pesada': 'nov-panel-pesada'
  };
  panels.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = mapa[tipo];
  if (target) {
    const el = document.getElementById(target);
    if (el) el.style.display = '';
  }
  if (tipo === 'Trabajo de manga') onChangeSubtipoNovedad();
  if (tipo === 'Pesada') {
    const rodeoId = document.getElementById('nov-rodeo-main')?.value;
    if (rodeoId) renderListaPesadaNov(rodeoId);
  }
}

function renderListaPesadaNov(rodeoId) {
  const lista = document.getElementById('nov-pesada-lista');
  if (!lista) return;
  const animales = animalesRodeo.filter(a => a.rodeo_id === rodeoId)
    .sort((a,b) => (a.caravana_interna||'').localeCompare(b.caravana_interna||'', undefined, {numeric:true}));
  if (!animales.length) { lista.innerHTML = '<div style="color:var(--texto-suave)">Sin animales identificados en este rodeo.</div>'; return; }
  lista.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Caravana</th><th>Categoría</th><th>Último peso</th><th>Peso hoy (kg)</th></tr></thead>
    <tbody>${animales.map(a => {
      const ultPes = pesadasAnimal.filter(p => p.animal_id === a.id).sort((x,y) => new Date(y.fecha)-new Date(x.fecha))[0];
      return `<tr>
        <td style="font-weight:700">#${caravanaDisplay(a)}</td>
        <td><span class="badge badge-${a.sexo==='Hembra'?'bordo':'cielo'}" style="font-size:11px">${a.categoria||a.sexo}</span></td>
        <td style="color:var(--texto-suave)">${ultPes ? ultPes.peso_kg + ' kg · ' + fmtFecha(ultPes.fecha) : '—'}</td>
        <td><input type="number" step="0.1" min="0" placeholder="kg" data-animal-id="${a.id}" class="pes-nov-input" style="width:90px;border:1px solid var(--gris-borde);border-radius:4px;padding:4px 6px;font-size:13px"></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function onChangeSubtipoNovedad() {
  const subtipo = document.getElementById('nov-subtipo')?.value;
  const esTacto = subtipo === 'Tacto / Preñez';
  const esInseminacion = subtipo === 'Inseminación (IATF)' || subtipo === 'Servicio';
  const pp = document.getElementById('nov-panel-productos');
  const pt = document.getElementById('nov-panel-tacto');
  const pi = document.getElementById('nov-panel-inseminacion');
  if (pp) pp.style.display = (esTacto || esInseminacion) ? 'none' : '';
  if (pt) pt.style.display = esTacto ? '' : 'none';
  if (pi) pi.style.display = esInseminacion ? '' : 'none';
  const rodeoId = document.getElementById('nov-rodeo-main')?.value;
  if (esTacto && rodeoId) renderListaTactoNov(rodeoId);
  if (esInseminacion && rodeoId) renderListaInseminacion(rodeoId, subtipo);
}

function renderListaInseminacion(rodeoId, subtipo) {
  const lista = document.getElementById('nov-inseminacion-lista');
  if (!lista) return;
  const hembras = animalesRodeo.filter(a => a.rodeo_id === rodeoId && a.sexo === 'Hembra');
  if (!hembras.length) {
    lista.innerHTML = '<div style="color:var(--texto-suave);font-size:13px">No hay hembras identificadas en este rodeo.</div>';
    return;
  }
  const metodo = subtipo === 'Inseminación (IATF)' ? 'IATF' : 'Toro';
  lista.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Caravana</th><th>Categoría</th><th>Último servicio</th><th>Incluir</th><th>Toro / Semen</th><th>Observaciones</th></tr></thead>
    <tbody>${hembras.map(a => {
      const ultimoSrv = serviciosAnimal.filter(s => s.animal_id === a.id).sort((x,y) => new Date(y.fecha)-new Date(x.fecha))[0];
      return `<tr>
        <td><strong>${caravanaDisplay(a)}</strong></td>
        <td>${a.categoria || '—'}</td>
        <td>${ultimoSrv ? fmtFecha(ultimoSrv.fecha) + ' · ' + (ultimoSrv.resultado || '—') : '—'}</td>
        <td><input type="checkbox" class="ins-check" data-animal-id="${a.id}" checked style="width:18px;height:18px;cursor:pointer"></td>
        <td><input type="text" class="ins-toro" data-animal-id="${a.id}" placeholder="Ej: Tornado, ABS-123" style="font-size:12px;padding:4px 6px;width:140px"></td>
        <td><input type="text" class="ins-obs" data-animal-id="${a.id}" placeholder="Opcional" style="font-size:12px;padding:4px 6px;width:140px"></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>
  <div style="margin-top:8px;font-size:12px;color:var(--texto-suave)">Podés completar un toro/semen global arriba en "Observaciones" y sobreescribir individualmente acá. Destildá las que no fueron inseminadas.</div>`;
}

function onChangeRodeoNovedad() {
  ['sel-trab','sel-destete','sel-aborto','sel-et','sel-rt','sel-baja','sel-traslado','sel-cat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = ''; el.style.display = 'none'; }
  });
  onChangeTipoNovedad();
  const tipo = document.getElementById('nov-tipo-main')?.value;
  if (tipo === 'Pesada') {
    const rodeoId = document.getElementById('nov-rodeo-main')?.value;
    if (rodeoId) renderListaPesadaNov(rodeoId);
  }
}

// ── Selector de animales para novedades ───────────────────

function toggleSelectorAnimalesNov(containerId, filtroSexo, filtroCategoria) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  const isHidden = cont.style.display === 'none';
  cont.style.display = isHidden ? '' : 'none';
  if (isHidden) {
    const rodeoId = document.getElementById('nov-rodeo-main')?.value;
    if (rodeoId) renderSelectorAnimalesNov(containerId, rodeoId, filtroSexo, filtroCategoria);
  }
}

function renderSelectorAnimalesNov(containerId, rodeoId, filtroSexo, filtroCategoria) {
  const cont = document.getElementById(containerId);
  if (!cont) return;

  // Para entrada de toros: mostrar todos los animales de TODOS los rodeos con categoría toro
  let lista;
  if (filtroCategoria && containerId === 'sel-et') {
    lista = animalesRodeo.filter(a => filtroCategoria.includes(a.categoria) && a.activo !== false);
  } else {
    lista = animalesRodeo.filter(a => a.rodeo_id === rodeoId && a.activo !== false);
    if (filtroSexo) lista = lista.filter(a => a.sexo === filtroSexo);
    if (filtroCategoria) lista = lista.filter(a => filtroCategoria.includes(a.categoria));
  }

  if (!lista.length) {
    cont.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--texto-suave)">Sin animales en este rodeo con ese criterio</div>';
    return;
  }

  cont.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <button type="button" class="btn btn-secondary" style="font-size:11px;padding:3px 10px" onclick="seleccionarTodosNov('${containerId}',true)">Todos</button>
      <button type="button" class="btn btn-secondary" style="font-size:11px;padding:3px 10px" onclick="seleccionarTodosNov('${containerId}',false)">Ninguno</button>
      <span id="${containerId}-resumen" style="font-size:12px;color:var(--texto-suave);align-self:center"></span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;max-height:220px;overflow-y:auto;padding:8px;border:1px solid var(--gris-borde);border-radius:6px;background:var(--fondo)">
      ${lista.map(a => {
        const car = caravanaDisplay(a);
        return `<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:4px 6px;border-radius:4px;background:var(--blanco,#fff)">
          <input type="checkbox" class="nov-animal-check" data-id="${a.id}" data-caravana="${car}" checked onchange="actualizarResumenSelector('${containerId}')">
          <span><strong>${car}</strong> <span style="color:var(--texto-suave);font-size:11px">${a.categoria || ''}</span></span>
        </label>`;
      }).join('')}
    </div>`;
  actualizarResumenSelector(containerId);
}

function seleccionarTodosNov(containerId, checked) {
  document.querySelectorAll(`#${containerId} .nov-animal-check`).forEach(cb => { cb.checked = checked; });
  actualizarResumenSelector(containerId);
}

function actualizarResumenSelector(containerId) {
  const total = document.querySelectorAll(`#${containerId} .nov-animal-check`).length;
  const sel = document.querySelectorAll(`#${containerId} .nov-animal-check:checked`).length;
  const res = document.getElementById(`${containerId}-resumen`);
  if (res) res.textContent = `${sel} de ${total} seleccionados`;
}

function getIdsSeleccionadosNov(containerId) {
  const cont = document.getElementById(containerId);
  if (!cont || cont.style.display === 'none') return []; // no abierto = todos
  const checks = [...document.querySelectorAll(`#${containerId} .nov-animal-check:checked`)];
  const total = document.querySelectorAll(`#${containerId} .nov-animal-check`).length;
  if (checks.length === total) return []; // todos = vacío
  return checks.map(cb => cb.dataset.id);
}

function getAnimalesPorSelector(containerId, rodeoId, filtroFn) {
  const ids = getIdsSeleccionadosNov(containerId);
  let base = animalesRodeo.filter(a => a.rodeo_id === rodeoId);
  if (filtroFn) base = base.filter(filtroFn);
  if (!ids.length) return base; // todos
  return base.filter(a => ids.includes(a.id));
}

function getCaravanaResumen(animales) {
  return animales.map(a => caravanaDisplay(a)).join(', ');
}

function renderListaTactoNov(rodeoId) {
  const lista = document.getElementById('nov-tacto-lista');
  if (!lista) return;
  const hembras = animalesRodeo.filter(a => a.rodeo_id === rodeoId && a.sexo === 'Hembra');
  if (!hembras.length) {
    lista.innerHTML = '<div style="color:var(--texto-suave);font-size:13px">No hay hembras identificadas en este rodeo. Cargalas primero desde la pestaña Animales.</div>';
    return;
  }
  lista.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Caravana</th><th>Categoría</th><th>Último servicio</th><th>Resultado</th><th>Fecha tacto</th></tr></thead>
    <tbody>${hembras.map(a => {
      const ultimoSrv = serviciosAnimal.filter(s => s.animal_id === a.id).sort((x, y) => new Date(y.fecha) - new Date(x.fecha))[0];
      return `<tr>
        <td><strong>${caravanaDisplay(a)}</strong></td>
        <td>${a.categoria || '—'}</td>
        <td>${ultimoSrv ? fmtFecha(ultimoSrv.fecha) + ' · ' + (ultimoSrv.toro || '—') : '—'}</td>
        <td><select data-animal-id="${a.id}" data-srv-id="${ultimoSrv?.id || ''}" class="tacto-resultado-nov" style="font-size:13px;padding:4px 8px">
          <option value="Pendiente">— Sin cambio —</option>
          <option value="Preñada">Preñada</option>
          <option value="Vacía">Vacía</option>
          <option value="Repetidora">Repetidora</option>
        </select></td>
        <td><input type="date" class="tacto-fecha-nov" data-animal-id="${a.id}" style="font-size:13px;padding:4px 8px"></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

async function guardarTactoNov(cabecera, novedadId = null) {
  const filas = document.querySelectorAll('.tacto-resultado-nov');
  let actualizados = 0;
  for (const sel of filas) {
    const resultado = sel.value;
    if (resultado === 'Pendiente') continue;
    const srvId = sel.dataset.srvId;
    const animalId = sel.dataset.animalId;
    const fechaTacto = document.querySelector(`.tacto-fecha-nov[data-animal-id="${animalId}"]`)?.value || cabecera.fecha;
    if (srvId) {
      await sb('PATCH', 'servicios_animal', { resultado, fecha_tacto: fechaTacto }, `?id=eq.${srvId}`);
    } else {
      await sb('POST', 'servicios_animal', {
        animal_id: animalId, fecha: cabecera.fecha,
        metodo: 'Tacto', toro: '', resultado, fecha_tacto: fechaTacto,
        observaciones: cabecera.observaciones || '', novedad_id: novedadId
      });
    }
    actualizados++;
  }
  return actualizados;
}

function agregarInsumoManga() {
  const list = document.getElementById('nov-insumos-list') || document.getElementById('tm-insumos-list');
  if (!list) return;
  const div = document.createElement('div');
  div.className = 'insumo-row';
  div.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px';
  div.innerHTML = `
    <div class="form-group" style="margin:0"><label>Producto / Vacuna</label><input type="text" class="tm-producto" placeholder="Ej: Glipondin 4"></div>
    <div class="form-group" style="margin:0"><label>Dosis</label><input type="text" class="tm-dosis" placeholder="Ej: 5cc/animal"></div>
    <div class="form-group" style="margin:0"><label>Consumo total</label><input type="text" class="tm-consumo" placeholder="Ej: 250cc"></div>
    <button type="button" onclick="this.closest('.insumo-row').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--rojo);padding-bottom:6px;line-height:1">✕</button>`;
  list.appendChild(div);
}

function agregarNacimientoRow() {
  const list = document.getElementById('nov-nacimientos-list');
  if (!list) return;
  const div = document.createElement('div');
  div.className = 'nacimiento-row';
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px;background:var(--fondo);padding:8px;border-radius:6px';
  div.innerHTML = `
    <div class="form-group" style="margin:0"><label>Sexo</label><select class="nac-sexo" onchange="this.closest('.nacimiento-row').querySelector('.nac-cat').innerHTML=catsPorSexo(this.value).map(c=>'<option>'+c+'</option>').join('')"><option>Macho</option><option>Hembra</option></select></div>
    <div class="form-group" style="margin:0"><label>Categoría</label><select class="nac-cat">${CATS_MACHO.map(c=>`<option>${c}</option>`).join('')}</select></div>
    <div class="form-group" style="margin:0"><label>Caravana (opc.)</label><input type="text" class="nac-caravana" placeholder="Ej: 06"></div>
    <div class="form-group" style="margin:0"><label>Caravana madre</label><input type="text" class="nac-madre" placeholder="Ej: 01"></div>
    <div class="form-group" style="margin:0"><label>Padre (opc.)</label><input type="text" class="nac-padre" placeholder="Se infiere del servicio"></div>
    <button type="button" onclick="this.closest('.nacimiento-row').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--rojo);padding-bottom:6px;line-height:1">✕</button>`;
  list.appendChild(div);
}

function resetFormNovedad() {
  document.getElementById('nov-fecha-main').value = '';
  document.getElementById('nov-rodeo-main').value = '';
  document.getElementById('nov-tipo-main').value = 'Trabajo de manga';
  ['sel-trab','sel-destete','sel-aborto','sel-et','sel-rt','sel-baja','sel-traslado','sel-cat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = ''; el.style.display = 'none'; }
  });
  ['nov-subtipo','nov-vet','nov-campania','nov-obs-trab',
   'ing-cantidad','ing-raza','ing-procedencia','ing-caravanas',
   'baja-motivo',
   'destete-cantidad','aborto-obs',
   'et-fecha-retiro','et-obs','rt-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const nl = document.getElementById('nov-insumos-list');
  if (nl) nl.innerHTML = '';
  const nacl = document.getElementById('nov-nacimientos-list');
  if (nacl) nacl.innerHTML = '';
  onChangeTipoNovedad();
}

// ── Dispatcher guardarNovedad ─────────────────────────────

async function guardarNovedad() {
  const tipo = document.getElementById('nov-tipo-main').value;
  const rodeoId = document.getElementById('nov-rodeo-main').value;
  const fecha = document.getElementById('nov-fecha-main').value;

  if (!rodeoId) { toast('Seleccioná un rodeo', 'var(--rojo)'); return; }
  if (!fecha) { toast('Ingresá la fecha', 'var(--rojo)'); return; }

  if (tipo === 'Trabajo de manga') await procesarNovTrabajoManga(rodeoId, fecha);
  else if (tipo === 'Nacimiento') await procesarNovNacimientos(rodeoId, fecha);
  else if (tipo === 'Ingreso') await procesarNovIngreso(rodeoId, fecha);
  else if (tipo === 'Destete') await procesarNovDestete(rodeoId, fecha);
  else if (tipo === 'Aborto') await procesarNovAborto(rodeoId, fecha);
  else if (tipo === 'Muerte' || tipo === 'Venta / Salida') await procesarNovBaja(rodeoId, fecha, tipo);
  else if (tipo === 'Traslado') await procesarNovTraslado(rodeoId, fecha);
  else if (tipo === 'Cambio de categoría') await procesarNovCambioCategoria(rodeoId, fecha);
  else if (tipo === 'Entrada de toros') await procesarNovEntradaToros(rodeoId, fecha);
  else if (tipo === 'Retiro de toros') await procesarNovRetiroToros(rodeoId, fecha);
  else if (tipo === 'Pesada') await procesarNovPesada(rodeoId, fecha);
}

function aplicarPesoPromedioATodos() {
  const val = document.getElementById('pes-promedio-global')?.value;
  if (!val || parseFloat(val) <= 0) { toast('Ingresá un peso promedio válido', 'var(--tierra)'); return; }
  document.querySelectorAll('.pes-nov-input').forEach(inp => inp.value = val);
}

async function procesarNovPesada(rodeoId, fecha) {
  const inputs = document.querySelectorAll('.pes-nov-input');
  const registros = [];
  inputs.forEach(inp => {
    const peso = parseFloat(inp.value);
    if (peso > 0) registros.push({ animal_id: inp.dataset.animalId, fecha, peso_kg: peso });
  });
  if (!registros.length) { toast('Ingresá al menos un peso', 'var(--tierra)'); return; }

  // Guardar novedad resumen
  const novRes = await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo: 'Pesada',
    cantidad: registros.length,
    descripcion: `${registros.length} animal${registros.length !== 1 ? 'es' : ''} pesados`
  });

  // Guardar pesadas individuales
  let ok = 0;
  for (const r of registros) {
    const res = await sb('POST', 'pesadas_animal', r);
    if (res) { pesadasAnimal.push(...(Array.isArray(res) ? res : [res])); ok++; }
  }

  toast(`✅ Pesada registrada · ${ok} animal${ok !== 1 ? 'es' : ''}`);
  resetFormNovedad();
  document.getElementById('form-novedad-wrap').style.display = 'none';
  tabRodeoActiva = 'novedades';
  await cargarManga();
}

// ── Procesadores por tipo ─────────────────────────────────

async function procesarNovTrabajoManga(rodeoId, fecha) {
  const subtipo = document.getElementById('nov-subtipo').value;
  const veterinario = document.getElementById('nov-vet').value.trim();
  const cant = parseInt(document.getElementById('nov-cant-trab').value) || null;
  const campania = document.getElementById('nov-campania').value.trim();
  const observaciones = document.getElementById('nov-obs-trab').value.trim();
  const esTacto = subtipo === 'Tacto / Preñez';

  // Guardar novedades_ganaderas
  const novData = {
    rodeo_id: rodeoId, fecha, tipo: 'Trabajo de manga', subtipo,
    cantidad: cant, descripcion: [veterinario, campania, observaciones].filter(Boolean).join(' · ') || null
  };

  if (esTacto) {
    const novRes = await sb('POST', 'novedades_ganaderas', { ...novData });
    const novedadId = novRes?.[0]?.id || null;
    const actualizados = await guardarTactoNov({ fecha, observaciones }, novedadId);
    if (novedadId) await sb('PATCH', 'novedades_ganaderas', { cantidad: actualizados }, `?id=eq.${novedadId}`);
    const r = novRes;
    if (r) {
      toast(`✅ Tacto registrado · ${actualizados} animal${actualizados !== 1 ? 'es' : ''} actualizado${actualizados !== 1 ? 's' : ''}`);
      resetFormNovedad();
      document.getElementById('form-novedad-wrap').style.display = 'none';
      tabRodeoActiva = 'novedades';
      await cargarManga();
    } else toast('❌ Error', 'var(--rojo)');
    return;
  }

  // Productos
  const filas = document.querySelectorAll('#nov-insumos-list .insumo-row');
  let items = Array.from(filas).map(row => ({
    producto: row.querySelector('.tm-producto')?.value.trim() || '',
    dosis: row.querySelector('.tm-dosis')?.value.trim() || '',
    consumo_total: row.querySelector('.tm-consumo')?.value.trim() || ''
  })).filter(i => i.producto);
  if (!items.length) items = [{ producto: '', dosis: '', consumo_total: '' }];

  const idsSelTrab = getIdsSeleccionadosNov('sel-trab');
  const caravanasFiltro = idsSelTrab.length
    ? animalesRodeo.filter(a => idsSelTrab.includes(a.id)).map(a => a.caravana_interna || a.caravana_electronica).filter(Boolean)
    : [];

  // Si no se especificó cantidad, calcularla automáticamente
  let cantFinal = cant;
  if (!cantFinal) {
    let animalesDelRodeo = animalesRodeo.filter(a => a.rodeo_id === rodeoId);
    if (caravanasFiltro.length) animalesDelRodeo = animalesDelRodeo.filter(a =>
      caravanasFiltro.includes(a.caravana_interna) || caravanasFiltro.includes(a.caravana_electronica));
    cantFinal = animalesDelRodeo.length || null;
  }

  const cabecera = { fecha, rodeo_id: rodeoId, tipo: subtipo, veterinario, cantidad_animales: cantFinal, campania, observaciones,
    campo: (rodeos.find(r => r.id === rodeoId) || {}).campo || null };

  let ok = true;
  const trabajosGuardados = [];
  for (const item of items) {
    const r = await sb('POST', 'trabajos_manga', { ...cabecera, ...item });
    if (r && r[0]) trabajosGuardados.push({ ...r[0], ...item });
    else ok = false;
  }

  const esInseminacion = subtipo === 'Inseminación (IATF)' || subtipo === 'Servicio';

  const desc = items.map(i => i.producto).filter(Boolean).join(', ') || observaciones || subtipo;
  const novRes = await sb('POST', 'novedades_ganaderas', { ...novData, descripcion: desc });
  const novedadId = novRes?.[0]?.id || null;

  if (ok && esInseminacion) {
    await guardarInseminacion(cabecera, novedadId, subtipo);
  } else if (ok && trabajosGuardados.length) {
    await distribuirTrabajoAAnimales(cabecera, trabajosGuardados, rodeoId, caravanasFiltro, novedadId);
  }

  if (ok) {
    toast(esInseminacion ? '✅ Inseminación registrada en las fichas seleccionadas' : '✅ Trabajo registrado y distribuido');
    resetFormNovedad();
    document.getElementById('form-novedad-wrap').style.display = 'none';
    tabRodeoActiva = 'novedades';
    await cargarManga();
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

async function procesarNovNacimientos(rodeoId, fecha) {
  const filas = document.querySelectorAll('.nacimiento-row');
  if (!filas.length) { toast('Agregá al menos un nacimiento', 'var(--tierra)'); return; }

  const rodeo = rodeos.find(r => r.id === rodeoId);
  const nacimientos = [];
  let errores = 0;

  for (const fila of filas) {
    const sexo = fila.querySelector('.nac-sexo').value;
    const caravana = fila.querySelector('.nac-caravana').value.trim();
    const caravana_madre = fila.querySelector('.nac-madre').value.trim();
    let caravana_padre = fila.querySelector('.nac-padre').value.trim();

    // Inferir padre del último servicio de la madre
    if (!caravana_padre && caravana_madre) {
      const madre = animalesRodeo.find(a =>
        a.caravana_interna === caravana_madre || a.caravana_electronica === caravana_madre
      );
      if (madre) {
        const ultimoSrv = serviciosAnimal.filter(s => s.animal_id === madre.id && s.resultado === 'Preñada')
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
        if (ultimoSrv) caravana_padre = ultimoSrv.toro || '';
      }
    }

    const categoria = fila.querySelector('.nac-cat')?.value || (sexo === 'Macho' ? 'Ternero' : 'Ternera');
    nacimientos.push({ sexo, caravana, caravana_madre, caravana_padre, categoria });

    // Heredar renspa de la madre
    const madre = animalesRodeo.find(a =>
      a.caravana_interna === caravana_madre || a.caravana_electronica === caravana_madre
    );
    const renspa_id = madre?.renspa_id || null;

    const animalRes = await sb('POST', 'animales_rodeo', {
      rodeo_id: rodeoId, caravana_electronica: caravana || null, sexo, categoria,
      raza: rodeo?.raza || null, fecha_nacimiento: fecha,
      caravana_madre: caravana_madre || null, caravana_padre: caravana_padre || null,
      renspa_id, activo: true
    });
    if (!animalRes) errores++;
  }

  if (errores > 0) {
    toast(`❌ Error al crear ${errores} animal(es). Revisá la consola.`, 'var(--rojo)');
    return;
  }

  const desc = nacimientos.map(n => `${n.sexo === 'Macho' ? '♂' : '♀'}${n.caravana ? ' #' + n.caravana : ''}${n.caravana_madre ? ' (m:' + n.caravana_madre + ')' : ''}`).join(', ');
  const r = await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo: 'Nacimiento', cantidad: filas.length, descripcion: desc,
    detalle: { nacimientos }
  });

  if (r) {
    toast(`✅ ${filas.length} nacimiento${filas.length !== 1 ? 's' : ''} registrado${filas.length !== 1 ? 's' : ''}`);
    resetFormNovedad();
    document.getElementById('form-novedad-wrap').style.display = 'none';
    tabRodeoActiva = 'novedades';
    await cargarManga();
  } else toast('❌ Error', 'var(--rojo)');
}

async function procesarNovIngreso(rodeoId, fecha) {
  const cantidad = parseInt(document.getElementById('ing-cantidad').value) || 1;
  const categoria = document.getElementById('ing-categoria').value;
  const sexo = document.getElementById('ing-sexo').value;
  const raza = document.getElementById('ing-raza').value.trim();
  const procedencia = document.getElementById('ing-procedencia').value.trim();
  const caravanasRaw = document.getElementById('ing-caravanas').value.trim();
  const caravanas = caravanasRaw ? caravanasRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  let ok = true;
  const n = caravanas.length || cantidad;
  for (let i = 0; i < n; i++) {
    const renspa_id = document.getElementById('ing-renspa')?.value || null;
    const r = await sb('POST', 'animales_rodeo', {
      rodeo_id: rodeoId, fecha_nacimiento: null,
      caravana_electronica: caravanas[i] || null, sexo, categoria, raza: raza || null, activo: true,
      renspa_id: renspa_id || null
    });
    if (!r) ok = false;
  }

  const desc = `${n} ${categoria.toLowerCase()}${n !== 1 ? 's' : ''}${procedencia ? ' de ' + procedencia : ''}${caravanasRaw ? ' · caravanas: ' + caravanasRaw : ''}`;
  await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo: 'Ingreso', cantidad: n, descripcion: desc
  });

  if (ok) {
    toast(`✅ ${n} animal${n !== 1 ? 'es' : ''} ingresado${n !== 1 ? 's' : ''}`);
    resetFormNovedad();
    document.getElementById('form-novedad-wrap').style.display = 'none';
    tabRodeoActiva = 'novedades';
    await cargarManga();
  } else toast('❌ Algunos animales no se pudieron guardar', 'var(--rojo)');
}

async function procesarNovEntradaToros(rodeoId, fecha) {
  const fechaRetiro = document.getElementById('et-fecha-retiro').value;
  const observaciones = document.getElementById('et-obs').value.trim();

  const idsSelEt = getIdsSeleccionadosNov('sel-et');
  if (!idsSelEt.length && document.getElementById('sel-et')?.style.display !== 'none') {
    toast('Seleccioná al menos un toro de la lista', 'var(--rojo)'); return;
  }
  const toros = idsSelEt.length
    ? animalesRodeo.filter(a => idsSelEt.includes(a.id))
    : animalesRodeo.filter(a => ['Toro','Torito'].includes(a.categoria));
  if (!toros.length) { toast('No se encontraron toros', 'var(--rojo)'); return; }

  const rodeoOrigenId = toros[0]?.rodeo_id || null;
  const torosCaravanas = toros.map(t => caravanaDisplay(t));

  for (const t of toros) {
    await sb('PATCH', 'animales_rodeo', { rodeo_id: rodeoId }, `?id=eq.${t.id}`);
  }

  const desc = `${toros.length} toro${toros.length !== 1 ? 's' : ''}: ${torosCaravanas.join(', ')}${fechaRetiro ? ' · retiro estimado: ' + fmtFecha(fechaRetiro) : ''}`;
  await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo: 'Entrada de toros',
    cantidad: toros.length, descripcion: desc,
    detalle: { toros: torosCaravanas, rodeo_origen_id: rodeoOrigenId, fecha_retiro_estimada: fechaRetiro || null, observaciones }
  });

  toast(`✅ Entrada de toros registrada · ${caravanas.length} toro${caravanas.length !== 1 ? 's' : ''} movidos al rodeo`);
  resetFormNovedad();
  document.getElementById('form-novedad-wrap').style.display = 'none';
  tabRodeoActiva = 'novedades';
  await cargarManga();
}

async function procesarNovRetiroToros(rodeoId, fecha) {
  const destinoId = document.getElementById('rt-rodeo-destino').value;
  const observaciones = document.getElementById('rt-obs').value.trim();
  if (!destinoId) { toast('Seleccioná el rodeo de destino', 'var(--rojo)'); return; }

  const toros = getAnimalesPorSelector('sel-rt', rodeoId, a => ['Toro','Torito'].includes(a.categoria));

  if (!toros.length) { toast('No se encontraron toros en este rodeo', 'var(--tierra)'); return; }

  for (const t of toros) {
    await sb('PATCH', 'animales_rodeo', { rodeo_id: destinoId }, `?id=eq.${t.id}`);
  }

  const destino = rodeos.find(r => r.id === destinoId);
  const torosCaravanas = toros.map(t => caravanaDisplay(t)).join(', ');
  const desc = `${toros.length} toro${toros.length !== 1 ? 's' : ''} → ${destino?.nombre || ''}: ${torosCaravanas}`;
  await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo: 'Retiro de toros',
    cantidad: toros.length, descripcion: desc,
    detalle: { toros: toros.map(t => caravanaDisplay(t)), rodeo_destino_id: destinoId, observaciones }
  });

  toast(`✅ Retiro registrado · ${toros.length} toro${toros.length !== 1 ? 's' : ''} devueltos`);
  resetFormNovedad();
  document.getElementById('form-novedad-wrap').style.display = 'none';
  tabRodeoActiva = 'novedades';
  await cargarManga();
}

async function procesarNovAborto(rodeoId, fecha) {
  const observaciones = document.getElementById('aborto-obs').value.trim();
  const madres = getAnimalesPorSelector('sel-aborto', rodeoId, a => a.sexo === 'Hembra');

  for (const madre of madres) {
    const ultimoSrv = serviciosAnimal
      .filter(s => s.animal_id === madre.id && s.resultado !== 'Vacía')
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
    if (ultimoSrv) {
      await sb('PATCH', 'servicios_animal', { resultado: 'Abortó', fecha_tacto: fecha, observaciones }, `?id=eq.${ultimoSrv.id}`);
    }
  }

  const madresResumen = getCaravanaResumen(madres);
  const desc = `${madres.length} aborto${madres.length !== 1 ? 's' : ''}${madresResumen ? ' · madres: ' + madresResumen : ''}${observaciones ? ' · ' + observaciones : ''}`;
  const r = await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo: 'Aborto', cantidad: madres.length || null, descripcion: desc
  });

  if (r) {
    toast(`✅ Aborto registrado${madres.length ? ' · historial reproductivo actualizado' : ''}`);
    resetFormNovedad();
    document.getElementById('form-novedad-wrap').style.display = 'none';
    tabRodeoActiva = 'novedades';
    await cargarManga();
  } else toast('❌ Error', 'var(--rojo)');
}

async function procesarNovDestete(rodeoId, fecha) {
  const destinoId = document.getElementById('destete-rodeo-destino').value;
  const nuevaCat = document.getElementById('destete-categoria').value;
  if (!destinoId) { toast('Seleccioná el rodeo destino', 'var(--rojo)'); return; }

  const terneros = getAnimalesPorSelector('sel-destete', rodeoId,
    a => ['Ternero','Ternera','Terneros','Terneras'].includes(a.categoria));

  if (!terneros.length) { toast('No se encontraron terneros en este rodeo', 'var(--tierra)'); return; }

  const patch = { rodeo_id: destinoId };
  if (nuevaCat) patch.categoria = nuevaCat;

  for (const a of terneros) {
    await sb('PATCH', 'animales_rodeo', patch, `?id=eq.${a.id}`);
  }

  const destino = rodeos.find(r => r.id === destinoId);
  const desc = `${terneros.length} ternero${terneros.length !== 1 ? 's' : ''} → ${destino?.nombre || destinoId}${nuevaCat ? ' como ' + nuevaCat : ''} · ${getCaravanaResumen(terneros)}`;
  await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo: 'Destete', cantidad: cantIngresada, descripcion: desc
  });

  toast(`✅ Destete registrado · ${terneros.length} ternero${terneros.length !== 1 ? 's' : ''} trasladados`);
  resetFormNovedad();
  document.getElementById('form-novedad-wrap').style.display = 'none';
  tabRodeoActiva = 'novedades';
  await cargarManga();
}

async function procesarNovBaja(rodeoId, fecha, tipo) {
  const motivo = document.getElementById('baja-motivo').value.trim();
  const animalesAfectados = getAnimalesPorSelector('sel-baja', rodeoId);
  if (!animalesAfectados.length) { toast('Seleccioná al menos un animal', 'var(--tierra)'); return; }

  for (const a of animalesAfectados) {
    await sb('PATCH', 'animales_rodeo', { activo: false, fecha_baja: fecha, motivo_baja: motivo || tipo }, `?id=eq.${a.id}`);
  }

  const desc = `${animalesAfectados.length} animal${animalesAfectados.length !== 1 ? 'es' : ''}${motivo ? ': ' + motivo : ''} · ${getCaravanaResumen(animalesAfectados)}`;
  await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo, cantidad: animalesAfectados.length, descripcion: desc
  });

  toast(`✅ ${tipo} registrada · ${animalesAfectados.length} animal${animalesAfectados.length !== 1 ? 'es' : ''}`);
  resetFormNovedad();
  document.getElementById('form-novedad-wrap').style.display = 'none';
  tabRodeoActiva = 'novedades';
  await cargarManga();
}

async function procesarNovTraslado(rodeoId, fecha) {
  const destinoId = document.getElementById('traslado-rodeo-destino').value;
  if (!destinoId) { toast('Seleccioná el rodeo destino', 'var(--rojo)'); return; }

  const animalesAfectados = getAnimalesPorSelector('sel-traslado', rodeoId);
  if (!animalesAfectados.length) { toast('No se encontraron animales', 'var(--tierra)'); return; }

  for (const a of animalesAfectados) {
    await sb('PATCH', 'animales_rodeo', { rodeo_id: destinoId }, `?id=eq.${a.id}`);
  }

  const destino = rodeos.find(r => r.id === destinoId);
  const desc = `${animalesAfectados.length} animal${animalesAfectados.length !== 1 ? 'es' : ''} → ${destino?.nombre || destinoId} · ${getCaravanaResumen(animalesAfectados)}`;
  await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo: 'Traslado', cantidad: animalesAfectados.length, descripcion: desc
  });

  toast(`✅ ${animalesAfectados.length} animal${animalesAfectados.length !== 1 ? 'es' : ''} trasladado${animalesAfectados.length !== 1 ? 's' : ''}`);
  resetFormNovedad();
  document.getElementById('form-novedad-wrap').style.display = 'none';
  tabRodeoActiva = 'novedades';
  await cargarManga();
}

async function procesarNovCambioCategoria(rodeoId, fecha) {
  const nuevaCat = document.getElementById('cat-nueva').value;
  const destinoId = document.getElementById('cat-rodeo-destino').value;

  const animalesAfectados = getAnimalesPorSelector('sel-cat', rodeoId);
  if (!animalesAfectados.length) { toast('No se encontraron animales', 'var(--tierra)'); return; }

  const patch = { categoria: nuevaCat };
  if (destinoId) patch.rodeo_id = destinoId;

  for (const a of animalesAfectados) {
    await sb('PATCH', 'animales_rodeo', patch, `?id=eq.${a.id}`);
  }

  const destino = destinoId ? rodeos.find(r => r.id === destinoId) : null;
  const desc = `${animalesAfectados.length} animal${animalesAfectados.length !== 1 ? 'es' : ''} → ${nuevaCat}${destino ? ' · rodeo: ' + destino.nombre : ''} · ${getCaravanaResumen(animalesAfectados)}`;
  await sb('POST', 'novedades_ganaderas', {
    rodeo_id: rodeoId, fecha, tipo: 'Cambio de categoría', cantidad: animalesAfectados.length, descripcion: desc
  });

  toast(`✅ Categoría actualizada para ${animalesAfectados.length} animal${animalesAfectados.length !== 1 ? 'es' : ''}`);
  resetFormNovedad();
  document.getElementById('form-novedad-wrap').style.display = 'none';
  tabRodeoActiva = 'novedades';
  await cargarManga();
}

// ── Formularios toggle ────────────────────────────────────

function toggleFormRodeo() {
  const f = document.getElementById('form-rodeo-wrap');
  const abriendo = f.style.display === 'none';
  f.style.display = abriendo ? '' : 'none';
  if (abriendo) {
    document.getElementById('rodeo-form-titulo').textContent = 'Nuevo rodeo';
    document.getElementById('rodeo-id-edit').value = '';
    ['rodeo-nombre', 'rodeo-ubi', 'rodeo-obs'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
}

function toggleFormAnimalManga(rodeoId) {
  const f = document.getElementById('form-animal-' + rodeoId);
  if (f) f.style.display = f.style.display === 'none' ? '' : 'none';
}

function toggleFormServicio() {
  const f = document.getElementById('form-servicio');
  if (!f) return;
  f.style.display = f.style.display === 'none' ? '' : 'none';
  const fd = document.getElementById('srv-fecha');
  if (fd && !fd.value) fd.value = new Date().toISOString().split('T')[0];
}

// ── Guardar rodeo ─────────────────────────────────────────

function editarRodeo(id) {
  const r = rodeos.find(x => x.id === id);
  if (!r) return;
  document.getElementById('rodeo-form-titulo').textContent = 'Editar rodeo';
  document.getElementById('rodeo-id-edit').value = r.id;
  document.getElementById('rodeo-nombre').value = r.nombre || '';
  document.getElementById('rodeo-cat').value = r.categoria || 'Vacas';
  document.getElementById('rodeo-campo').value = r.campo || 'Don Alfredo (Azcona)';
  document.getElementById('rodeo-ubi').value = r.ubicacion || '';
  document.getElementById('rodeo-obs').value = r.observaciones || '';
  document.getElementById('form-rodeo-wrap').style.display = '';
  document.getElementById('form-rodeo-wrap').scrollIntoView({ behavior: 'smooth' });
}

async function guardarRodeo() {
  const id = document.getElementById('rodeo-id-edit').value;
  const data = {
    nombre: document.getElementById('rodeo-nombre').value.trim(),
    categoria: document.getElementById('rodeo-cat').value,
    campo: document.getElementById('rodeo-campo').value,
    ubicacion: document.getElementById('rodeo-ubi').value.trim(),
    observaciones: document.getElementById('rodeo-obs').value.trim()
  };
  if (!data.nombre) { toast('Ingresá un nombre para el rodeo', 'var(--rojo)'); return; }
  const r = id ? await sb('PATCH', 'rodeos', data, `?id=eq.${id}`) : await sb('POST', 'rodeos', { ...data, activo: true });
  if (r) { toast('✅ Rodeo guardado'); toggleFormRodeo(); await cargarManga(); }
  else toast('❌ Error', 'var(--rojo)');
}

// ── Borrar ────────────────────────────────────────────────

async function borrarNovedadManga(id) {
  if (!confirm('¿Borrar esta novedad? Se eliminarán también los registros en las fichas de los animales afectados.')) return;
  // Borrar registros en fichas individuales vinculados a esta novedad
  await Promise.all([
    sb('DELETE', 'servicios_animal', null, `?novedad_id=eq.${id}`),
    sb('DELETE', 'sanidad_animal', null, `?novedad_id=eq.${id}`)
  ]);
  await sb('DELETE', 'novedades_ganaderas', null, `?id=eq.${id}`);
  novedadesGanaderas = novedadesGanaderas.filter(n => n.id !== id);
  serviciosAnimal = serviciosAnimal.filter(s => s.novedad_id !== id);
  sanidadAnimal = sanidadAnimal.filter(s => s.novedad_id !== id);
  if (rodeoSeleccionado) renderDetalleManga(); else renderVistaGlobal();
}

async function borrarTrabajoManga(id) {
  if (!confirm('¿Borrar este trabajo?')) return;
  await sb('DELETE', 'trabajos_manga', null, `?id=eq.${id}`);
  trabajosManga = trabajosManga.filter(t => t.id !== id);
  if (rodeoSeleccionado) renderDetalleManga(); else renderVistaGlobal();
}

async function guardarAnimalManga(rodeoId) {
  const data = {
    rodeo_id: rodeoId, activo: true,
    caravana_interna: document.getElementById('an-caravana-interna').value.trim() || null,
    caravana_electronica: document.getElementById('an-caravana-electronica').value.trim() || null,
    sexo: document.getElementById('an-sexo').value,
    categoria: document.getElementById('an-cat').value,
    raza: document.getElementById('an-raza').value.trim() || null,
    fecha_nacimiento: document.getElementById('an-nacimiento').value || null,
    caravana_madre: document.getElementById('an-madre').value.trim() || null,
    caravana_padre: document.getElementById('an-padre').value.trim() || null,
    observaciones: document.getElementById('an-obs').value.trim() || null,
    renspa_id: document.getElementById('an-renspa').value || null
  };
  const r = await sb('POST', 'animales_rodeo', data);
  if (r) { toast('✅ Animal registrado'); await cargarManga(); }
  else toast('❌ Error', 'var(--rojo)');
}

function toggleEditarAnimal(id) {
  const f = document.getElementById('ficha-editar-' + id);
  if (f) f.style.display = f.style.display === 'none' ? '' : 'none';
}

async function guardarEdicionAnimal(id) {
  const data = {
    caravana_interna: document.getElementById('edit-caravana-interna').value.trim() || null,
    caravana_electronica: document.getElementById('edit-caravana-electronica').value.trim() || null,
    sexo: document.getElementById('edit-sexo').value,
    categoria: document.getElementById('edit-cat').value,
    raza: document.getElementById('edit-raza').value.trim() || null,
    fecha_nacimiento: document.getElementById('edit-nacimiento').value || null,
    caravana_madre: document.getElementById('edit-madre').value.trim() || null,
    caravana_padre: document.getElementById('edit-padre').value.trim() || null,
    observaciones: document.getElementById('edit-obs').value.trim() || null,
    renspa_id: document.getElementById('edit-renspa').value || null
  };
  const r = await sb('PATCH', 'animales_rodeo', data, `?id=eq.${id}`);
  if (r) { toast('✅ Animal actualizado'); await cargarManga(); }
  else toast('❌ Error', 'var(--rojo)');
}

async function borrarAnimalManga(id) {
  if (!confirm('¿Borrar este animal?')) return;
  await sb('DELETE', 'animales_rodeo', null, `?id=eq.${id}`);
  animalesRodeo = animalesRodeo.filter(a => a.id !== id);
  if (animalSeleccionado === id) animalSeleccionado = null;
  renderDetalleManga();
}

async function guardarServicio(animalId) {
  const data = {
    animal_id: animalId,
    fecha: document.getElementById('srv-fecha').value,
    metodo: document.getElementById('srv-metodo').value,
    toro: document.getElementById('srv-toro').value.trim(),
    resultado: document.getElementById('srv-resultado').value,
    fecha_tacto: document.getElementById('srv-fecha-tacto').value || null,
    observaciones: document.getElementById('srv-obs').value.trim()
  };
  const r = await sb('POST', 'servicios_animal', data);
  if (r) { toast('✅ Servicio registrado'); await cargarManga(); }
  else toast('❌ Error', 'var(--rojo)');
}

// ── Índices por campaña ───────────────────────────────────

async function cerrarCampaniaIndices(rodeoId, inseminadas, totalPren, nacimientos, abortos, muertesTerneros, destetes, iPrenez, iParicion, iAborto, iMuerte, iDestete) {
  const rodeo = rodeos.find(r => r.id === rodeoId);
  const campania = prompt('¿Qué campaña cerrar? (ej: 2024/2025)', rodeo?.campania || '');
  if (!campania) return;
  if (!confirm(`Guardar índices de campaña "${campania}" para el rodeo "${rodeo?.nombre}"?`)) return;

  const data = {
    rodeo_id: rodeoId,
    campania,
    inseminadas: inseminadas || null,
    prenadas: totalPren || null,
    nacimientos: nacimientos || null,
    abortos: abortos || null,
    muertes_terneros: muertesTerneros || null,
    destetes: destetes || null,
    pct_prenez:         iPrenez   ? parseFloat(iPrenez)   : null,
    pct_paricion:       iParicion ? parseFloat(iParicion) : null,
    pct_abortos:        iAborto   ? parseFloat(iAborto)   : null,
    pct_mort_terneros:  iMuerte   ? parseFloat(iMuerte)   : null,
    pct_destete:        iDestete  ? parseFloat(iDestete)  : null,
  };

  const r = await sb('POST', 'indices_campania', data);
  if (r) { toast('✅ Campaña guardada en historial'); await cargarManga(); }
  else toast('❌ Error al guardar', 'var(--rojo)');
}

async function eliminarIndiceCampania(id) {
  if (!confirm('¿Eliminar este registro histórico?')) return;
  await sb('DELETE', 'indices_campania', null, `?id=eq.${id}`);
  toast('Eliminado');
  await cargarManga();
}

async function borrarSanidadAnimal(id) {
  if (!confirm('¿Borrar este registro?')) return;
  await sb('DELETE', 'sanidad_animal', null, `?id=eq.${id}`);
  sanidadAnimal = sanidadAnimal.filter(s => s.id !== id);
  renderDetalleManga();
}

async function borrarServicio(id) {
  if (!confirm('¿Borrar este servicio?')) return;
  await sb('DELETE', 'servicios_animal', null, `?id=eq.${id}`);
  serviciosAnimal = serviciosAnimal.filter(s => s.id !== id);
  renderDetalleManga();
}

// ── Pesadas por animal ────────────────────────────────────

function toggleFormPesada() {
  const f = document.getElementById('form-pesada');
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function guardarPesadaAnimal(animalId) {
  const fecha = document.getElementById('pes-fecha').value;
  const peso = parseFloat(document.getElementById('pes-peso').value);
  const obs = document.getElementById('pes-obs').value.trim();
  if (!fecha || !peso) { toast('Completá fecha y peso', 'var(--tierra)'); return; }
  const r = await sb('POST', 'pesadas_animal', { animal_id: animalId, fecha, peso_kg: peso, observaciones: obs || null });
  if (r) {
    pesadasAnimal.push(...(Array.isArray(r) ? r : [r]));
    pesadasAnimal.sort((a,b) => new Date(a.fecha)-new Date(b.fecha));
    window._fichaAnimal.pesadasDelAnimal = pesadasAnimal.filter(p => p.animal_id === animalId).sort((a,b) => new Date(a.fecha)-new Date(b.fecha));
    toast('✅ Pesada registrada');
    document.getElementById('ficha-animal-body').innerHTML = renderContenidoFicha('pesadas');
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

async function borrarPesadaAnimal(id, animalId) {
  if (!confirm('¿Borrar esta pesada?')) return;
  await sb('DELETE', 'pesadas_animal', null, `?id=eq.${id}`);
  pesadasAnimal = pesadasAnimal.filter(p => p.id !== id);
  window._fichaAnimal.pesadasDelAnimal = pesadasAnimal.filter(p => p.animal_id === animalId).sort((a,b) => new Date(a.fecha)-new Date(b.fecha));
  document.getElementById('ficha-animal-body').innerHTML = renderContenidoFicha('pesadas');
}

// ── Distribuir trabajo a animales ─────────────────────────

async function guardarInseminacion(cabecera, novedadId, subtipo) {
  const checks = document.querySelectorAll('.ins-check');
  const metodo = subtipo === 'Inseminación (IATF)' ? 'IATF' : 'Toro';
  let guardados = 0;
  for (const chk of checks) {
    if (!chk.checked) continue;
    const animalId = chk.dataset.animalId;
    const toro = document.querySelector(`.ins-toro[data-animal-id="${animalId}"]`)?.value.trim() || cabecera.observaciones || '';
    const obs = document.querySelector(`.ins-obs[data-animal-id="${animalId}"]`)?.value.trim() || '';
    await sb('POST', 'servicios_animal', {
      animal_id: animalId, fecha: cabecera.fecha,
      metodo, toro, resultado: 'Pendiente',
      observaciones: obs, novedad_id: novedadId
    });
    guardados++;
  }
  return guardados;
}

async function distribuirTrabajoAAnimales(cabecera, trabajosGuardados, rodeoId, caravanasFiltro = [], novedadId = null) {
  let animalesDelRodeo = animalesRodeo.filter(a => a.rodeo_id === rodeoId);
  if (caravanasFiltro.length) {
    animalesDelRodeo = animalesDelRodeo.filter(a =>
      caravanasFiltro.includes(a.caravana_interna) || caravanasFiltro.includes(a.caravana_electronica));
  }
  if (!animalesDelRodeo.length) return;
  const esReproductivo = TIPOS_REPRODUCTIVO.includes(cabecera.tipo);
  const esSanidad = TIPOS_SANIDAD.includes(cabecera.tipo);
  for (const animal of animalesDelRodeo) {
    if (esReproductivo && animal.sexo === 'Hembra') {
      const toro = trabajosGuardados[0]?.producto || '';
      await sb('POST', 'servicios_animal', {
        animal_id: animal.id, fecha: cabecera.fecha,
        metodo: cabecera.tipo === 'Inseminación (IATF)' ? 'IATF' : 'Toro',
        toro, resultado: 'Pendiente', observaciones: cabecera.observaciones || '',
        novedad_id: novedadId
      });
    }
    if (esSanidad) {
      for (const trab of trabajosGuardados) {
        await sb('POST', 'sanidad_animal', {
          animal_id: animal.id, trabajo_manga_id: trab.id,
          fecha: cabecera.fecha, tipo: cabecera.tipo,
          producto: trab.producto || '', dosis: trab.dosis || '',
          veterinario: cabecera.veterinario || '', observaciones: cabecera.observaciones || '',
          novedad_id: novedadId
        });
      }
    }
  }
}

// ── Importar desde imagen / texto ─────────────────────────

function toggleImportarManga() {
  const f = document.getElementById('form-importar-manga');
  f.style.display = f.style.display === 'none' ? '' : 'none';
}

function switchTabImportarManga(tabEl, targetId) {
  tabEl.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  ['manga-imp-imagen', 'manga-imp-texto'].forEach(id => {
    document.getElementById(id).style.display = id === targetId ? '' : 'none';
  });
}

function onDropManga(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file) procesarImagenManga(file);
}

async function procesarImagenManga(file) {
  if (!file) return;
  const status = document.getElementById('manga-ia-status');
  const dropzone = document.getElementById('manga-dropzone');
  status.style.display = '';
  status.textContent = '🔍 Analizando...';
  dropzone.style.opacity = '0.5';

  const rodesNombres = rodeos.map(r => r.nombre).join(', ');

  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente ganadero. Extraés datos de planillas de campo. Devolvés SOLO JSON válido.
Rodeos disponibles: ${rodesNombres || 'no hay rodeos cargados'}.`,
      `Extraé los datos y devolvé este JSON exacto:
{
  "fecha": "DD/MM/AAAA o vacío",
  "rodeo": "nombre del rodeo o vacío",
  "subtipo": "Vacunación | Desparasitación | Inseminación (IATF) | Tacto / Preñez | Tratamiento | Servicio | Otro",
  "veterinario": "nombre o vacío",
  "cantidad_animales": número o null,
  "campania": "campaña o vacío",
  "observaciones": "observaciones o vacío",
  "productos": [{ "producto": "nombre", "dosis": "dosis", "consumo_total": "total" }]
}`
    );

    status.textContent = '✅ Listo — revisá los datos y confirmá';
    status.style.color = 'var(--verde)';
    document.getElementById('form-importar-manga').style.display = 'none';

    // Abrir form novedad en modo Trabajo de manga
    document.getElementById('form-novedad-wrap').style.display = '';
    document.getElementById('nov-tipo-main').value = 'Trabajo de manga';
    onChangeTipoNovedad();

    if (datos.fecha) document.getElementById('nov-fecha-main').value = parseFechaIA(datos.fecha);
    if (datos.subtipo) document.getElementById('nov-subtipo').value = datos.subtipo;
    if (datos.veterinario) document.getElementById('nov-vet').value = datos.veterinario;
    if (datos.cantidad_animales) document.getElementById('nov-cant-trab').value = datos.cantidad_animales;
    if (datos.campania) document.getElementById('nov-campania').value = datos.campania;
    if (datos.observaciones) document.getElementById('nov-obs-trab').value = datos.observaciones;
    if (datos.rodeo) {
      const r = rodeos.find(x => x.nombre.toLowerCase().includes(datos.rodeo.toLowerCase()) || datos.rodeo.toLowerCase().includes(x.nombre.toLowerCase()));
      if (r) document.getElementById('nov-rodeo-main').value = r.id;
    }

    const lista = document.getElementById('nov-insumos-list');
    lista.innerHTML = '';
    const prods = datos.productos?.length ? datos.productos : [{}];
    prods.forEach(p => {
      agregarInsumoManga();
      const filas = lista.querySelectorAll('.insumo-row');
      const ultima = filas[filas.length - 1];
      if (ultima) {
        ultima.querySelector('.tm-producto').value = p.producto || '';
        ultima.querySelector('.tm-dosis').value = p.dosis || '';
        ultima.querySelector('.tm-consumo').value = p.consumo_total || '';
      }
    });
    onChangeSubtipoNovedad();
    document.getElementById('form-novedad-wrap').scrollIntoView({ behavior: 'smooth' });

  } catch (e) {
    status.textContent = '❌ Error: ' + e.message;
    status.style.color = 'var(--rojo)';
  } finally {
    dropzone.style.opacity = '1';
    document.getElementById('manga-file-input').value = '';
  }
}

async function procesarTextoManga() {
  const texto = document.getElementById('manga-texto-ia').value.trim();
  if (!texto) { toast('Ingresá el texto primero', 'var(--tierra)'); return; }

  const btn = document.getElementById('btn-manga-texto');
  const status = document.getElementById('manga-texto-status');
  btn.disabled = true; btn.textContent = '⏳ Interpretando...';
  status.style.display = ''; status.textContent = 'Analizando el texto...';

  const rodesNombres = rodeos.map(r => r.nombre).join(', ');

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        temperature: 0,
        system: `Asistente ganadero Grupo Giraudo, Argentina. Extraés datos de WhatsApp o texto. Devolvés SOLO JSON.
Rodeos disponibles: ${rodesNombres || 'no hay rodeos cargados'}.`,
        messages: [{ role: 'user', content: `Extraé los datos y devolvé este JSON:
{
  "fecha": "YYYY-MM-DD o vacío",
  "rodeo": "nombre del rodeo o vacío",
  "subtipo": "Vacunación | Desparasitación | Inseminación (IATF) | Tacto / Preñez | Tratamiento | Servicio | Otro",
  "veterinario": "nombre o vacío",
  "cantidad_animales": número o null,
  "campania": "campaña o vacío",
  "observaciones": "observaciones o vacío",
  "productos": [{ "producto": "nombre", "dosis": "dosis", "consumo_total": "total" }]
}
Texto: ${texto}` }]
      })
    });

    const json = await res.json();
    let raw = json.content?.[0]?.text || '{}';
    raw = raw.replace(/```json|```/g, '').trim();
    const datos = JSON.parse(raw);

    document.getElementById('form-importar-manga').style.display = 'none';
    document.getElementById('form-novedad-wrap').style.display = '';
    document.getElementById('nov-tipo-main').value = 'Trabajo de manga';
    onChangeTipoNovedad();

    if (datos.fecha) document.getElementById('nov-fecha-main').value = datos.fecha;
    if (datos.subtipo) document.getElementById('nov-subtipo').value = datos.subtipo;
    if (datos.veterinario) document.getElementById('nov-vet').value = datos.veterinario;
    if (datos.cantidad_animales) document.getElementById('nov-cant-trab').value = datos.cantidad_animales;
    if (datos.campania) document.getElementById('nov-campania').value = datos.campania;
    if (datos.observaciones) document.getElementById('nov-obs-trab').value = datos.observaciones;
    if (datos.rodeo) {
      const r = rodeos.find(x => x.nombre.toLowerCase().includes(datos.rodeo.toLowerCase()) || datos.rodeo.toLowerCase().includes(x.nombre.toLowerCase()));
      if (r) document.getElementById('nov-rodeo-main').value = r.id;
    }

    const lista = document.getElementById('nov-insumos-list');
    lista.innerHTML = '';
    const prods = datos.productos?.length ? datos.productos : [{}];
    prods.forEach(p => {
      agregarInsumoManga();
      const filas = lista.querySelectorAll('.insumo-row');
      const ultima = filas[filas.length - 1];
      if (ultima) {
        ultima.querySelector('.tm-producto').value = p.producto || '';
        ultima.querySelector('.tm-dosis').value = p.dosis || '';
        ultima.querySelector('.tm-consumo').value = p.consumo_total || '';
      }
    });
    onChangeSubtipoNovedad();
    document.getElementById('form-novedad-wrap').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('manga-texto-ia').value = '';
    toast('✅ Datos extraídos — revisá y confirmá');

  } catch (e) {
    status.textContent = '❌ Error: ' + e.message;
    status.style.color = 'var(--rojo)';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Interpretar con IA';
  }
}
