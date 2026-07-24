let rodeos = [];
let trabajosManga = [];
let animalesRodeo = [];
let novedadesGanaderas = [];
let serviciosAnimal = [];
let sanidadAnimal = [];

const TIPOS_REPRODUCTIVO = ['Inseminación (IATF)', 'Servicio'];
const TIPOS_SANIDAD = ['Vacunación', 'Desparasitación', 'Tratamiento', 'Caravana electrónica', 'Tacto / Preñez', 'Otro'];
let rodeoSeleccionado = null;
let animalSeleccionado = null;
let tabRodeoActiva = 'novedades';
let tabAnimalActiva = 'datos';
let paginaManga = 1;

const COLORES_RODEO = {
  'Vacas': 'bordo', 'Vaquillonas': 'tierra',
  'Terneros': 'verde', 'Terneras': 'verde', 'Toros': 'cielo'
};

async function cargarManga() {
  [rodeos, trabajosManga, animalesRodeo, novedadesGanaderas, serviciosAnimal, sanidadAnimal] = await Promise.all([
    sb('GET', 'rodeos', null, '?order=created_at.asc&activo=eq.true'),
    sb('GET', 'trabajos_manga', null, '?order=fecha.desc'),
    sb('GET', 'animales_rodeo', null, '?activo=eq.true&order=caravana.asc'),
    sb('GET', 'novedades_ganaderas', null, '?order=fecha.desc'),
    sb('GET', 'servicios_animal', null, '?order=fecha.desc'),
    sb('GET', 'sanidad_animal', null, '?order=fecha.desc')
  ]);
  rodeos = rodeos || [];
  trabajosManga = trabajosManga || [];
  animalesRodeo = animalesRodeo || [];
  novedadesGanaderas = novedadesGanaderas || [];
  serviciosAnimal = serviciosAnimal || [];
  sanidadAnimal = sanidadAnimal || [];

  _poblarSelectsRodeo();
  renderEstadisticasManga();
  renderRodeosManga();
}

function _poblarSelectsRodeo() {
  const opciones = '<option value="">— Seleccionar —</option>' +
    rodeos.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
  ['nov-rodeo-main', 'traslado-rodeo-destino', 'cat-rodeo-destino'].forEach(id => {
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
  const total = animalesRodeo.length;
  const porCat = {};
  animalesRodeo.forEach(a => {
    const rodeo = rodeos.find(r => r.id === a.rodeo_id);
    const c = rodeo?.categoria || 'Otro';
    porCat[c] = (porCat[c] || 0) + 1;
  });
  const orden = ['Vacas', 'Vaquillonas', 'Terneros', 'Terneras', 'Toros'];
  const cats = [...orden, ...Object.keys(porCat).filter(k => !orden.includes(k))].filter(k => porCat[k]);
  el.innerHTML = `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
    <div class="stat-card" style="min-width:110px">
      <div class="label">Total hacienda</div>
      <div class="value" style="color:var(--bordo)">${total}</div>
      <div class="sub">animales</div>
    </div>
    ${cats.map(c => `<div class="stat-card" style="min-width:110px">
      <div class="label">${c}</div>
      <div class="value" style="color:var(--${COLORES_RODEO[c] || 'texto-suave'})">${porCat[c]}</div>
      <div class="sub">${rodeos.filter(r => r.categoria === c).length} rodeo${rodeos.filter(r => r.categoria === c).length !== 1 ? 's' : ''}</div>
    </div>`).join('')}
  </div>`;
}

// ── Rodeos ────────────────────────────────────────────────

function renderRodeosManga() {
  const container = document.getElementById('manga-rodeos-cards');
  if (!container) return;
  if (!rodeos.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🐄</div><h3>Sin rodeos cargados</h3><p>Usá "Nuevo rodeo" para agregar uno</p></div>';
  } else {
    container.innerHTML = rodeos.map(r => {
      const color = COLORES_RODEO[r.categoria] || 'gray';
      const nNov = novedadesGanaderas.filter(n => n.rodeo_id === r.id).length;
      const nAnimales = animalesRodeo.filter(a => a.rodeo_id === r.id).length;
      const sel = rodeoSeleccionado === r.id;
      return `<div class="lote-card${sel ? ' selected' : ''}" onclick="seleccionarRodeoManga('${r.id}')" style="cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <span class="badge badge-${color}">${r.categoria || 'Sin cat.'}</span>
          <span style="font-size:11px;color:var(--texto-suave)">${r.campo || ''}</span>
        </div>
        <div style="font-size:15px;font-weight:600;margin-bottom:4px">${r.nombre}</div>
        ${r.ubicacion ? `<div style="font-size:12px;color:var(--texto-suave);margin-bottom:6px">📍 ${r.ubicacion}</div>` : ''}
        <div style="display:flex;gap:12px;font-size:13px;margin-top:auto;flex-wrap:wrap">
          <span><strong>${nAnimales}</strong> identificados</span>
          <span style="color:var(--texto-suave)">${nNov} novedad${nNov !== 1 ? 'es' : ''}</span>
        </div>
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
      </div>

      ${tabRodeoActiva === 'novedades' ? renderTabNovedades(novedades) : ''}
      ${tabRodeoActiva === 'trabajos' ? renderTabTrabajos(trabajos) : ''}
      ${tabRodeoActiva === 'animales' ? renderTabAnimales(rodeo.id, animales) : ''}
    </div>
    ${animalSeleccionado ? renderFichaAnimal(animalSeleccionado) : ''}`;
}

// ── Tab Novedades ─────────────────────────────────────────

const ICONOS_NOV = {
  'Trabajo de manga': '💉', 'Nacimiento': '🐣', 'Ingreso': '⬇️',
  'Muerte': '💀', 'Venta / Salida': '🚛', 'Traslado': '🔄',
  'Cambio de categoría': '🔀'
};

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

function renderTabAnimales(rodeoId, animales) {
  const cardStyle = 'background:var(--fondo);border:1px solid var(--borde);border-radius:10px;padding:12px;cursor:pointer;transition:box-shadow .15s';
  return `<div class="card-body" style="padding-top:12px">
    <button class="btn btn-secondary" style="font-size:12px;margin-bottom:12px" onclick="toggleFormAnimalManga('${rodeoId}')">+ Agregar animal</button>
    <div id="form-animal-${rodeoId}" style="display:none;background:var(--fondo);border-radius:8px;padding:12px;margin-bottom:16px">
      <div class="form-grid">
        <div class="form-group"><label>Caravana</label><input type="text" id="an-caravana" placeholder="Ej: 1234"></div>
        <div class="form-group"><label>Sexo</label><select id="an-sexo"><option>Hembra</option><option>Macho</option></select></div>
        <div class="form-group"><label>Categoría</label><select id="an-cat">
          <option>Ternera</option><option>Ternero</option><option>Vaquillona</option>
          <option>Vaca</option><option>Toro</option><option>Novillo</option>
        </select></div>
        <div class="form-group"><label>Raza</label><input type="text" id="an-raza" placeholder="Ej: Angus, Hereford"></div>
        <div class="form-group"><label>Fecha nac.</label><input type="date" id="an-nacimiento"></div>
        <div class="form-group"><label>Caravana madre</label><input type="text" id="an-madre" placeholder="Ej: 456"></div>
        <div class="form-group"><label>Padre (toro/semen)</label><input type="text" id="an-padre" placeholder="Ej: Tornado, ABS-1234"></div>
        <div class="form-group"><label>Observaciones</label><input type="text" id="an-obs" placeholder="Opcional"></div>
      </div>
      <button class="btn btn-primary" style="font-size:13px" onclick="guardarAnimalManga('${rodeoId}')">Guardar</button>
      <button class="btn btn-secondary" style="font-size:13px;margin-left:8px" onclick="toggleFormAnimalManga('${rodeoId}')">Cancelar</button>
    </div>
    ${animales.length
      ? `<div class="lotes-grid">${animales.map(a => {
          const color = a.sexo === 'Hembra' ? 'bordo' : 'cielo';
          const servicios = serviciosAnimal.filter(s => s.animal_id === a.id);
          const ultimoSrv = servicios[0];
          const crias = animalesRodeo.filter(x => x.caravana_madre === a.caravana && a.caravana).length;
          return `<div style="${cardStyle}" onclick="seleccionarAnimal('${a.id}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
              <span class="badge badge-${color}">${a.categoria || a.sexo || '—'}</span>
              <button class="btn btn-danger" style="padding:1px 6px;font-size:11px" onclick="event.stopPropagation();borrarAnimalManga('${a.id}')">🗑️</button>
            </div>
            <div style="font-size:18px;font-weight:700;color:var(--${color});margin-bottom:2px">${a.caravana ? '#' + a.caravana : 'S/N'}</div>
            <div style="font-size:12px;color:var(--texto-suave)">${a.raza || ''}</div>
            ${a.caravana_madre ? `<div style="font-size:11px;color:var(--texto-suave);margin-top:4px">Madre: ${a.caravana_madre}</div>` : ''}
            ${ultimoSrv ? `<div style="font-size:11px;margin-top:4px">
              <span class="badge badge-${ultimoSrv.resultado === 'Preñada' ? 'verde' : ultimoSrv.resultado === 'Vacía' ? 'rojo' : 'gray'}" style="font-size:10px">${ultimoSrv.resultado || 'Pendiente'}</span>
            </div>` : ''}
            ${crias ? `<div style="font-size:11px;color:var(--verde);margin-top:4px">🐣 ${crias} cría${crias !== 1 ? 's' : ''}</div>` : ''}
          </div>`;
        }).join('')}</div>
        <div style="font-size:12px;color:var(--texto-suave);margin-top:8px">Tocá una tarjeta para ver la ficha del animal</div>`
      : `<div class="empty-state" style="padding:24px"><div class="icon">🐄</div><p>Sin animales identificados en este rodeo.<br>Registrá un "Ingreso" o "Nacimiento" para cargarlos.</p></div>`}
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
  const crias = animalesRodeo.filter(x => x.caravana_madre === a.caravana && a.caravana);
  const servicios = serviciosAnimal.filter(s => s.animal_id === animalId);
  const sanidadDelAnimal = sanidadAnimal.filter(s => s.animal_id === animalId);

  window._fichaAnimal = { a, madre, crias, servicios, sanidadDelAnimal, esHembra };

  return `<div id="ficha-animal" class="card" style="margin-top:12px;border-top:3px solid var(--cielo)">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h3>🐄 ${a.caravana ? '#' + a.caravana : 'Sin caravana'} <span class="badge badge-${a.sexo === 'Hembra' ? 'bordo' : 'cielo'}" style="font-size:12px">${a.categoria || a.sexo || ''}</span></h3>
      <button class="btn btn-secondary" style="font-size:12px" onclick="animalSeleccionado=null;renderDetalleManga()">✕ Cerrar</button>
    </div>
    <div class="tabs" style="border-bottom:1px solid var(--borde)">
      <div class="tab${tabAnimalActiva === 'datos' ? ' active' : ''}" onclick="switchTabAnimal('datos')">Datos</div>
      ${esHembra ? `<div class="tab${tabAnimalActiva === 'reproductivo' ? ' active' : ''}" onclick="switchTabAnimal('reproductivo')">Reproductivo <span style="font-size:11px;color:var(--texto-suave)">(${servicios.length})</span></div>` : ''}
      <div class="tab${tabAnimalActiva === 'medico' ? ' active' : ''}" onclick="switchTabAnimal('medico')">Historial médico <span style="font-size:11px;color:var(--texto-suave)">(${sanidadDelAnimal.length})</span></div>
    </div>
    <div id="ficha-animal-body">${renderContenidoFicha(tabAnimalActiva)}</div>
  </div>`;
}

function renderContenidoFicha(tab) {
  const { a, madre, crias, servicios, sanidadDelAnimal, esHembra } = window._fichaAnimal || {};
  if (!a) return '';

  if (tab === 'datos') {
    return `<div class="card-body">
      <div class="form-grid">
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Caravana</label><div style="font-weight:600;font-size:15px">${a.caravana || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Sexo</label><div>${a.sexo || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Categoría</label><div>${a.categoria || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Raza</label><div>${a.raza || '—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Fecha de nacimiento</label><div>${fmtFecha(a.fecha_nacimiento)}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Madre</label>
          <div>${a.caravana_madre ? `<strong>${a.caravana_madre}</strong>${madre ? ` · ${madre.raza || ''}` : ''}` : '—'}</div>
        </div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Padre (toro/semen)</label><div>${a.caravana_padre || '—'}</div></div>
        ${a.observaciones ? `<div class="form-group full"><label style="font-size:11px;color:var(--texto-suave)">Observaciones</label><div>${a.observaciones}</div></div>` : ''}
      </div>
      ${crias.length ? `<div style="margin-top:16px">
        <div style="font-size:12px;font-weight:600;color:var(--texto-suave);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Crías (${crias.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${crias.map(c => `<span class="badge badge-${c.sexo === 'Hembra' ? 'tierra' : 'cielo'}" style="cursor:pointer" onclick="seleccionarAnimal('${c.id}')">${c.caravana || 'S/N'} ${c.sexo === 'Hembra' ? '♀' : '♂'} ${fmtFecha(c.fecha_nacimiento)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>`;
  }

  if (tab === 'reproductivo' && esHembra) {
    return `<div class="card-body" style="padding-top:12px">
      <button class="btn btn-secondary" style="font-size:12px;margin-bottom:12px" onclick="toggleFormServicio()">+ Registrar servicio</button>
      <div id="form-servicio" style="display:none;background:var(--fondo);border-radius:8px;padding:12px;margin-bottom:16px">
        <div class="form-grid">
          <div class="form-group"><label>Fecha servicio</label><input type="date" id="srv-fecha"></div>
          <div class="form-group"><label>Método</label><select id="srv-metodo"><option>IATF</option><option>Toro</option></select></div>
          <div class="form-group"><label>Toro / Semen</label><input type="text" id="srv-toro" placeholder="Ej: Tornado, ABS-1234"></div>
          <div class="form-group"><label>Resultado tacto</label><select id="srv-resultado">
            <option>Pendiente</option><option>Preñada</option><option>Vacía</option><option>Repetidora</option>
          </select></div>
          <div class="form-group"><label>Fecha tacto</label><input type="date" id="srv-fecha-tacto"></div>
          <div class="form-group"><label>Observaciones</label><input type="text" id="srv-obs" placeholder="Opcional"></div>
        </div>
        <button class="btn btn-primary" style="font-size:13px" onclick="guardarServicio('${a.id}')">Guardar</button>
        <button class="btn btn-secondary" style="font-size:13px;margin-left:8px" onclick="toggleFormServicio()">Cancelar</button>
      </div>
      ${servicios.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Método</th><th>Toro / Semen</th><th>Resultado</th><th>Fecha tacto</th><th>Obs.</th><th></th></tr></thead>
        <tbody>${servicios.map(s => {
          const colRes = { 'Preñada': 'verde', 'Vacía': 'rojo', 'Repetidora': 'tierra', 'Pendiente': 'gray' };
          return `<tr>
            <td>${fmtFecha(s.fecha)}</td>
            <td><span class="badge badge-cielo">${s.metodo || '—'}</span></td>
            <td>${s.toro || '—'}</td>
            <td><span class="badge badge-${colRes[s.resultado] || 'gray'}">${s.resultado || '—'}</span></td>
            <td>${fmtFecha(s.fecha_tacto)}</td>
            <td>${s.observaciones || '—'}</td>
            <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarServicio('${s.id}')">🗑️</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : `<div class="empty-state" style="padding:24px"><div class="icon">🐄</div><p>Sin servicios registrados</p></div>`}
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
  const panels = ['nov-panel-trabajo', 'nov-panel-nacimiento', 'nov-panel-ingreso', 'nov-panel-baja', 'nov-panel-traslado', 'nov-panel-categoria'];
  const mapa = {
    'Trabajo de manga': 'nov-panel-trabajo',
    'Nacimiento': 'nov-panel-nacimiento',
    'Ingreso': 'nov-panel-ingreso',
    'Muerte': 'nov-panel-baja',
    'Venta / Salida': 'nov-panel-baja',
    'Traslado': 'nov-panel-traslado',
    'Cambio de categoría': 'nov-panel-categoria'
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
}

function onChangeSubtipoNovedad() {
  const subtipo = document.getElementById('nov-subtipo')?.value;
  const esTacto = subtipo === 'Tacto / Preñez';
  const pp = document.getElementById('nov-panel-productos');
  const pt = document.getElementById('nov-panel-tacto');
  if (pp) pp.style.display = esTacto ? 'none' : '';
  if (pt) pt.style.display = esTacto ? '' : 'none';
  if (esTacto) {
    const rodeoId = document.getElementById('nov-rodeo-main')?.value;
    if (rodeoId) renderListaTactoNov(rodeoId);
  }
}

function onChangeRodeoNovedad() {
  onChangeTipoNovedad();
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
        <td><strong>${a.caravana || 'S/N'}</strong></td>
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

async function guardarTactoNov(cabecera) {
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
        observaciones: cabecera.observaciones || ''
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
    <div class="form-group" style="margin:0"><label>Sexo</label><select class="nac-sexo"><option>Macho</option><option>Hembra</option></select></div>
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
  ['nov-subtipo','nov-vet','nov-campania','nov-obs-trab',
   'ing-cantidad','ing-raza','ing-procedencia','ing-caravanas',
   'baja-caravanas','baja-motivo','traslado-caravanas','cat-caravanas'].forEach(id => {
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
  else if (tipo === 'Muerte' || tipo === 'Venta / Salida') await procesarNovBaja(rodeoId, fecha, tipo);
  else if (tipo === 'Traslado') await procesarNovTraslado(rodeoId, fecha);
  else if (tipo === 'Cambio de categoría') await procesarNovCambioCategoria(rodeoId, fecha);
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
    const actualizados = await guardarTactoNov({ fecha, observaciones });
    const r = await sb('POST', 'novedades_ganaderas', { ...novData, cantidad: actualizados });
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

  const cabecera = { fecha, rodeo_id: rodeoId, tipo: subtipo, veterinario, cantidad_animales: cant, campania, observaciones,
    campo: (rodeos.find(r => r.id === rodeoId) || {}).campo || null };

  let ok = true;
  const trabajosGuardados = [];
  for (const item of items) {
    const r = await sb('POST', 'trabajos_manga', { ...cabecera, ...item });
    if (r && r[0]) trabajosGuardados.push({ ...r[0], ...item });
    else ok = false;
  }

  if (ok && trabajosGuardados.length) {
    await distribuirTrabajoAAnimales(cabecera, trabajosGuardados, rodeoId);
  }

  const desc = items.map(i => i.producto).filter(Boolean).join(', ') || observaciones || subtipo;
  await sb('POST', 'novedades_ganaderas', { ...novData, descripcion: desc });

  if (ok) {
    toast('✅ Trabajo registrado y distribuido');
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
  for (const fila of filas) {
    const sexo = fila.querySelector('.nac-sexo').value;
    const caravana = fila.querySelector('.nac-caravana').value.trim();
    const caravana_madre = fila.querySelector('.nac-madre').value.trim();
    let caravana_padre = fila.querySelector('.nac-padre').value.trim();

    // Inferir padre del último servicio de la madre
    if (!caravana_padre && caravana_madre) {
      const madre = animalesRodeo.find(a => a.caravana === caravana_madre);
      if (madre) {
        const ultimoSrv = serviciosAnimal.filter(s => s.animal_id === madre.id && s.resultado === 'Preñada')
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
        if (ultimoSrv) caravana_padre = ultimoSrv.toro || '';
      }
    }

    const categoria = sexo === 'Macho' ? 'Ternero' : 'Ternera';
    nacimientos.push({ sexo, caravana, caravana_madre, caravana_padre, categoria });

    await sb('POST', 'animales_rodeo', {
      rodeo_id: rodeoId, caravana: caravana || null, sexo, categoria,
      raza: rodeo?.raza || null, fecha_nacimiento: fecha,
      caravana_madre: caravana_madre || null, caravana_padre: caravana_padre || null,
      activo: true
    });
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
    const r = await sb('POST', 'animales_rodeo', {
      rodeo_id: rodeoId, fecha_nacimiento: null,
      caravana: caravanas[i] || null, sexo, categoria, raza: raza || null, activo: true
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

async function procesarNovBaja(rodeoId, fecha, tipo) {
  const caravanasRaw = document.getElementById('baja-caravanas').value.trim();
  const motivo = document.getElementById('baja-motivo').value.trim();
  const caravanas = caravanasRaw.split(',').map(s => s.trim()).filter(Boolean);

  let animalesAfectados = animalesRodeo.filter(a => a.rodeo_id === rodeoId);
  if (caravanas.length) animalesAfectados = animalesAfectados.filter(a => caravanas.includes(a.caravana));

  if (!animalesAfectados.length) { toast('No se encontraron animales con esas caravanas', 'var(--tierra)'); return; }

  for (const a of animalesAfectados) {
    await sb('PATCH', 'animales_rodeo', { activo: false, fecha_baja: fecha, motivo_baja: motivo || tipo }, `?id=eq.${a.id}`);
  }

  const desc = `${animalesAfectados.length} animal${animalesAfectados.length !== 1 ? 'es' : ''}${motivo ? ': ' + motivo : ''}${caravanasRaw ? ' · ' + caravanasRaw : ''}`;
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
  const caravanasRaw = document.getElementById('traslado-caravanas').value.trim();
  const destinoId = document.getElementById('traslado-rodeo-destino').value;
  if (!destinoId) { toast('Seleccioná el rodeo destino', 'var(--rojo)'); return; }

  const caravanas = caravanasRaw.split(',').map(s => s.trim()).filter(Boolean);
  let animalesAfectados = animalesRodeo.filter(a => a.rodeo_id === rodeoId);
  if (caravanas.length) animalesAfectados = animalesAfectados.filter(a => caravanas.includes(a.caravana));

  if (!animalesAfectados.length) { toast('No se encontraron animales', 'var(--tierra)'); return; }

  for (const a of animalesAfectados) {
    await sb('PATCH', 'animales_rodeo', { rodeo_id: destinoId }, `?id=eq.${a.id}`);
  }

  const destino = rodeos.find(r => r.id === destinoId);
  const desc = `${animalesAfectados.length} animal${animalesAfectados.length !== 1 ? 'es' : ''} → ${destino?.nombre || destinoId}${caravanasRaw ? ' · ' + caravanasRaw : ''}`;
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
  const caravanasRaw = document.getElementById('cat-caravanas').value.trim();
  const nuevaCat = document.getElementById('cat-nueva').value;
  const destinoId = document.getElementById('cat-rodeo-destino').value;

  const caravanas = caravanasRaw.split(',').map(s => s.trim()).filter(Boolean);
  let animalesAfectados = animalesRodeo.filter(a => a.rodeo_id === rodeoId);
  if (caravanas.length) animalesAfectados = animalesAfectados.filter(a => caravanas.includes(a.caravana));

  if (!animalesAfectados.length) { toast('No se encontraron animales', 'var(--tierra)'); return; }

  const patch = { categoria: nuevaCat };
  if (destinoId) patch.rodeo_id = destinoId;

  for (const a of animalesAfectados) {
    await sb('PATCH', 'animales_rodeo', patch, `?id=eq.${a.id}`);
  }

  const destino = destinoId ? rodeos.find(r => r.id === destinoId) : null;
  const desc = `${animalesAfectados.length} animal${animalesAfectados.length !== 1 ? 'es' : ''} → ${nuevaCat}${destino ? ' · rodeo: ' + destino.nombre : ''}${caravanasRaw ? ' · ' + caravanasRaw : ''}`;
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
  if (!confirm('¿Borrar esta novedad?')) return;
  await sb('DELETE', 'novedades_ganaderas', null, `?id=eq.${id}`);
  novedadesGanaderas = novedadesGanaderas.filter(n => n.id !== id);
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
    caravana: document.getElementById('an-caravana').value.trim() || null,
    sexo: document.getElementById('an-sexo').value,
    categoria: document.getElementById('an-cat').value,
    raza: document.getElementById('an-raza').value.trim() || null,
    fecha_nacimiento: document.getElementById('an-nacimiento').value || null,
    caravana_madre: document.getElementById('an-madre').value.trim() || null,
    caravana_padre: document.getElementById('an-padre').value.trim() || null,
    observaciones: document.getElementById('an-obs').value.trim() || null
  };
  const r = await sb('POST', 'animales_rodeo', data);
  if (r) { toast('✅ Animal registrado'); await cargarManga(); }
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

// ── Distribuir trabajo a animales ─────────────────────────

async function distribuirTrabajoAAnimales(cabecera, trabajosGuardados, rodeoId) {
  const animalesDelRodeo = animalesRodeo.filter(a => a.rodeo_id === rodeoId);
  if (!animalesDelRodeo.length) return;
  const esReproductivo = TIPOS_REPRODUCTIVO.includes(cabecera.tipo);
  const esSanidad = TIPOS_SANIDAD.includes(cabecera.tipo);
  for (const animal of animalesDelRodeo) {
    if (esReproductivo && animal.sexo === 'Hembra') {
      const toro = trabajosGuardados[0]?.producto || '';
      await sb('POST', 'servicios_animal', {
        animal_id: animal.id, fecha: cabecera.fecha,
        metodo: cabecera.tipo === 'Inseminación (IATF)' ? 'IATF' : 'Toro',
        toro, resultado: 'Pendiente', observaciones: cabecera.observaciones || ''
      });
    }
    if (esSanidad) {
      for (const trab of trabajosGuardados) {
        await sb('POST', 'sanidad_animal', {
          animal_id: animal.id, trabajo_manga_id: trab.id,
          fecha: cabecera.fecha, tipo: cabecera.tipo,
          producto: trab.producto || '', dosis: trab.dosis || '',
          veterinario: cabecera.veterinario || '', observaciones: cabecera.observaciones || ''
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
