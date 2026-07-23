let rodeos = [];
let trabajosManga = [];
let animalesRodeo = [];
let novedadesGanaderas = [];
let serviciosAnimal = [];
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
  [rodeos, trabajosManga, animalesRodeo, novedadesGanaderas, serviciosAnimal] = await Promise.all([
    sb('GET', 'rodeos', null, '?order=created_at.asc&activo=eq.true'),
    sb('GET', 'trabajos_manga', null, '?order=fecha.desc'),
    sb('GET', 'animales_rodeo', null, '?order=caravana.asc'),
    sb('GET', 'novedades_ganaderas', null, '?order=fecha.desc'),
    sb('GET', 'servicios_animal', null, '?order=fecha.desc')
  ]);
  rodeos = rodeos || [];
  trabajosManga = trabajosManga || [];
  animalesRodeo = animalesRodeo || [];
  novedadesGanaderas = novedadesGanaderas || [];
  serviciosAnimal = serviciosAnimal || [];

  const sel = document.getElementById('tm-rodeo');
  if (sel) sel.innerHTML = '<option value="">— Seleccionar rodeo —</option>' +
    rodeos.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');

  renderEstadisticasManga();
  renderRodeosManga();
}

// ── Stats ─────────────────────────────────────────────────

function renderEstadisticasManga() {
  const el = document.getElementById('manga-stats');
  if (!el) return;
  const total = rodeos.reduce((s, r) => s + (r.cantidad || 0), 0);
  const porCat = {};
  rodeos.forEach(r => { const c = r.categoria || 'Otro'; porCat[c] = (porCat[c] || 0) + (r.cantidad || 0); });
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
      const nTrab = trabajosManga.filter(t => t.rodeo_id === r.id).length;
      const nNov = novedadesGanaderas.filter(n => n.rodeo_id === r.id).length;
      const sel = rodeoSeleccionado === r.id;
      return `<div class="lote-card${sel ? ' selected' : ''}" onclick="seleccionarRodeoManga('${r.id}')" style="cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <span class="badge badge-${color}">${r.categoria || 'Sin cat.'}</span>
          <span style="font-size:11px;color:var(--texto-suave)">${r.campo || ''}</span>
        </div>
        <div style="font-size:15px;font-weight:600;margin-bottom:4px">${r.nombre}</div>
        ${r.ubicacion ? `<div style="font-size:12px;color:var(--texto-suave);margin-bottom:6px">📍 ${r.ubicacion}</div>` : ''}
        <div style="display:flex;gap:12px;font-size:13px;margin-top:auto;flex-wrap:wrap">
          <span><strong>${r.cantidad ?? '—'}</strong> animales</span>
          <span style="color:var(--texto-suave)">${nTrab} trabajo${nTrab !== 1 ? 's' : ''}</span>
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
  if (!rodeoSeleccionado) { renderTablaManga(trabajosManga); return; }

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
        <button class="btn btn-secondary" style="font-size:12px" onclick="editarRodeo('${rodeo.id}')">✏️ Editar rodeo</button>
      </div>
      <div class="tabs" style="border-bottom:1px solid var(--borde)">
        <div class="tab${tabRodeoActiva === 'novedades' ? ' active' : ''}" onclick="switchTabRodeo('novedades')">Novedades <span style="font-size:11px;color:var(--texto-suave)">(${novedades.length})</span></div>
        <div class="tab${tabRodeoActiva === 'trabajos' ? ' active' : ''}" onclick="switchTabRodeo('trabajos')">Trabajos <span style="font-size:11px;color:var(--texto-suave)">(${trabajos.length})</span></div>
        <div class="tab${tabRodeoActiva === 'animales' ? ' active' : ''}" onclick="switchTabRodeo('animales')">Animales <span style="font-size:11px;color:var(--texto-suave)">(${animales.length})</span></div>
      </div>

      ${tabRodeoActiva === 'novedades' ? renderTabNovedades(rodeo.id, novedades) : ''}
      ${tabRodeoActiva === 'trabajos' ? renderTabTrabajos(trabajos) : ''}
      ${tabRodeoActiva === 'animales' ? renderTabAnimales(rodeo.id, animales) : ''}
    </div>
    ${animalSeleccionado ? renderFichaAnimal(animalSeleccionado) : ''}`;
}

// ── Tab Novedades ─────────────────────────────────────────

function renderTabNovedades(rodeoId, novedades) {
  return `<div class="card-body" style="padding-top:12px">
    <button class="btn btn-secondary" style="font-size:12px;margin-bottom:12px" onclick="toggleFormNovedadManga('${rodeoId}')">+ Registrar novedad</button>
    <div id="form-novedad-${rodeoId}" style="display:none;background:var(--fondo);border-radius:8px;padding:12px;margin-bottom:16px">
      <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
        <div class="form-group"><label>Fecha</label><input type="date" id="nov-fecha-${rodeoId}"></div>
        <div class="form-group"><label>Tipo</label><select id="nov-tipo-${rodeoId}">
          <option>Nacimiento</option><option>Muerte</option><option>Traslado</option>
          <option>Tratamiento individual</option><option>Pérdida / Robo</option><option>Otro</option>
        </select></div>
        <div class="form-group"><label>Cantidad</label><input type="number" id="nov-cant-${rodeoId}" placeholder="Ej: 2"></div>
        <div class="form-group"><label>Descripción</label><input type="text" id="nov-desc-${rodeoId}" placeholder="Ej: ternero Angus, madre 123"></div>
      </div>
      <button class="btn btn-primary" style="font-size:13px" onclick="guardarNovedadManga('${rodeoId}')">Guardar</button>
      <button class="btn btn-secondary" style="font-size:13px;margin-left:8px" onclick="toggleFormNovedadManga('${rodeoId}')">Cancelar</button>
    </div>
    ${novedades.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Cant.</th><th>Descripción</th><th></th></tr></thead>
      <tbody>${novedades.map(n => {
        const ico = { 'Nacimiento':'🐣','Muerte':'💀','Traslado':'🔄','Tratamiento individual':'💉','Pérdida / Robo':'⚠️' };
        return `<tr><td>${fmtFecha(n.fecha)}</td><td>${ico[n.tipo]||'📝'} ${n.tipo||'—'}</td><td>${n.cantidad??'—'}</td><td>${n.descripcion||'—'}</td>
          <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarNovedadManga('${n.id}')">🗑️</button></td></tr>`;
      }).join('')}</tbody>
    </table></div>` : `<div class="empty-state" style="padding:24px"><div class="icon">📋</div><p>Sin novedades registradas</p></div>`}
  </div>`;
}

// ── Tab Trabajos ──────────────────────────────────────────

function renderTabTrabajos(trabajos) {
  return `<div class="card-body" style="padding-top:12px">
    ${trabajos.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Dosis</th><th>Cant. tratados</th><th>Veterinario</th><th>$ Unitario</th><th>$ Total</th><th>Obs.</th><th></th></tr></thead>
      <tbody>${trabajos.map(t => `<tr>
        <td>${fmtFecha(t.fecha)}</td>
        <td><span class="badge badge-bordo">${t.tipo||'—'}</span></td>
        <td>${t.producto||'—'}</td><td>${t.dosis||'—'}</td>
        <td>${t.cantidad_animales||'—'}</td><td>${t.veterinario||'—'}</td>
        <td>${t.precio_unitario!=null?'$ '+fmtNum(t.precio_unitario,2):'—'}</td>
        <td>${t.costo_total!=null?fmtMonto(t.costo_total,'ARS'):'—'}</td>
        <td>${t.observaciones||'—'}</td>
        <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarTrabajoManga('${t.id}')">🗑️</button></td>
      </tr>`).join('')}</tbody>
    </table></div>` : `<div class="empty-state" style="padding:24px"><div class="icon">📋</div><p>Sin trabajos para este rodeo</p></div>`}
  </div>`;
}

// ── Tab Animales ──────────────────────────────────────────

function renderTabAnimales(rodeoId, animales) {
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
    ${animales.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Caravana</th><th>Sexo</th><th>Categoría</th><th>Raza</th><th>Fecha nac.</th><th>Madre</th><th>Padre</th><th></th></tr></thead>
      <tbody>${animales.map(a => `<tr style="cursor:pointer" onclick="seleccionarAnimal('${a.id}')">
        <td><strong style="color:var(--bordo)">${a.caravana||'S/N'}</strong></td>
        <td>${a.sexo||'—'}</td><td>${a.categoria||'—'}</td><td>${a.raza||'—'}</td>
        <td>${fmtFecha(a.fecha_nacimiento)}</td>
        <td>${a.caravana_madre||'—'}</td><td>${a.caravana_padre||'—'}</td>
        <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="event.stopPropagation();borrarAnimalManga('${a.id}')">🗑️</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div style="font-size:12px;color:var(--texto-suave);margin-top:8px">Tocá una fila para ver la ficha del animal</div>`
    : `<div class="empty-state" style="padding:24px"><div class="icon">🐄</div><p>Sin animales identificados individualmente</p></div>`}
  </div>`;
}

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
  const crias = animalesRodeo.filter(x => x.caravana_madre === a.caravana);
  const servicios = serviciosAnimal.filter(s => s.animal_id === animalId);
  const trabajosAnimal = trabajosManga.filter(t => t.rodeo_id === a.rodeo_id);

  window._fichaAnimal = { a, madre, crias, servicios, trabajosAnimal, esHembra };

  return `<div id="ficha-animal" class="card" style="margin-top:12px;border-top:3px solid var(--cielo)">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h3>🐄 Caravana ${a.caravana||'S/N'} <span class="badge badge-${a.sexo==='Hembra'?'bordo':'cielo'}" style="font-size:12px">${a.categoria||a.sexo||''}</span></h3>
      <button class="btn btn-secondary" style="font-size:12px" onclick="animalSeleccionado=null;renderDetalleManga()">✕ Cerrar</button>
    </div>
    <div class="tabs" style="border-bottom:1px solid var(--borde)">
      <div class="tab${tabAnimalActiva==='datos'?' active':''}" onclick="switchTabAnimal('datos')">Datos</div>
      ${esHembra ? `<div class="tab${tabAnimalActiva==='reproductivo'?' active':''}" onclick="switchTabAnimal('reproductivo')">Reproductivo <span style="font-size:11px;color:var(--texto-suave)">(${servicios.length})</span></div>` : ''}
      <div class="tab${tabAnimalActiva==='medico'?' active':''}" onclick="switchTabAnimal('medico')">Historial médico <span style="font-size:11px;color:var(--texto-suave)">(${trabajosAnimal.length})</span></div>
    </div>
    <div id="ficha-animal-body">${renderContenidoFicha(tabAnimalActiva)}</div>
  </div>`;
}

function renderContenidoFicha(tab) {
  const { a, madre, crias, servicios, trabajosAnimal, esHembra } = window._fichaAnimal || {};
  if (!a) return '';

  if (tab === 'datos') {
    return `<div class="card-body">
      <div class="form-grid">
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Caravana</label><div style="font-weight:600;font-size:15px">${a.caravana||'—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Sexo</label><div>${a.sexo||'—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Categoría</label><div>${a.categoria||'—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Raza</label><div>${a.raza||'—'}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Fecha de nacimiento</label><div>${fmtFecha(a.fecha_nacimiento)}</div></div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Madre</label>
          <div>${a.caravana_madre ? `<strong>${a.caravana_madre}</strong>${madre ? ` · ${madre.raza||''}` : ''}` : '—'}</div>
        </div>
        <div class="form-group"><label style="font-size:11px;color:var(--texto-suave)">Padre (toro/semen)</label><div>${a.caravana_padre||'—'}</div></div>
        ${a.observaciones ? `<div class="form-group full"><label style="font-size:11px;color:var(--texto-suave)">Observaciones</label><div>${a.observaciones}</div></div>` : ''}
      </div>
      ${crias.length ? `<div style="margin-top:16px">
        <div style="font-size:12px;font-weight:600;color:var(--texto-suave);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Crías (${crias.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${crias.map(c => `<span class="badge badge-${c.sexo==='Hembra'?'tierra':'cielo'}" style="cursor:pointer" onclick="seleccionarAnimal('${c.id}')">${c.caravana||'S/N'} ${c.sexo==='Hembra'?'♀':'♂'} ${fmtFecha(c.fecha_nacimiento)}</span>`).join('')}
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
          const colRes = { 'Preñada':'verde', 'Vacía':'rojo', 'Repetidora':'tierra', 'Pendiente':'gray' };
          return `<tr>
            <td>${fmtFecha(s.fecha)}</td>
            <td><span class="badge badge-cielo">${s.metodo||'—'}</span></td>
            <td>${s.toro||'—'}</td>
            <td><span class="badge badge-${colRes[s.resultado]||'gray'}">${s.resultado||'—'}</span></td>
            <td>${fmtFecha(s.fecha_tacto)}</td>
            <td>${s.observaciones||'—'}</td>
            <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarServicio('${s.id}')">🗑️</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : `<div class="empty-state" style="padding:24px"><div class="icon">🐄</div><p>Sin servicios registrados</p></div>`}
    </div>`;
  }

  if (tab === 'medico') {
    return `<div class="card-body" style="padding-top:12px">
      <div style="font-size:12px;color:var(--texto-suave);margin-bottom:12px">Trabajos realizados en el rodeo de este animal</div>
      ${trabajosAnimal.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Dosis</th><th>Veterinario</th><th>Obs.</th></tr></thead>
        <tbody>${trabajosAnimal.map(t => `<tr>
          <td>${fmtFecha(t.fecha)}</td>
          <td><span class="badge badge-bordo">${t.tipo||'—'}</span></td>
          <td>${t.producto||'—'}</td><td>${t.dosis||'—'}</td>
          <td>${t.veterinario||'—'}</td><td>${t.observaciones||'—'}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty-state" style="padding:24px"><div class="icon">💉</div><p>Sin tratamientos registrados</p></div>`}
    </div>`;
  }
  return '';
}

// ── Tabla general ─────────────────────────────────────────

function renderTablaManga(rows) {
  const detalle = document.getElementById('manga-detalle');
  if (!detalle) return;
  if (!rows.length) {
    detalle.innerHTML = '<div class="card" style="margin-top:16px"><div class="card-body"><div class="empty-state"><div class="icon">📋</div><h3>Sin trabajos registrados</h3></div></div></div>';
    return;
  }
  const total = rows.length;
  const desde = (paginaManga - 1) * FILAS_POR_PAGINA;
  const pag = rows.slice(desde, desde + FILAS_POR_PAGINA);
  const getNombre = id => (rodeos.find(r => r.id === id) || {}).nombre || '—';
  detalle.innerHTML = `<div class="card" style="margin-top:16px">
    <div class="card-header"><h3>Todos los trabajos de manga</h3></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Rodeo</th><th>Tipo</th><th>Producto</th><th>Dosis</th><th>Cant.</th><th>Veterinario</th><th>$ Unitario</th><th>$ Total</th><th>Obs.</th><th></th></tr></thead>
      <tbody>${pag.map(t => `<tr>
        <td>${fmtFecha(t.fecha)}</td><td>${getNombre(t.rodeo_id)}</td>
        <td><span class="badge badge-bordo">${t.tipo||'—'}</span></td>
        <td>${t.producto||'—'}</td><td>${t.dosis||'—'}</td>
        <td>${t.cantidad_animales||'—'}</td><td>${t.veterinario||'—'}</td>
        <td>${t.precio_unitario!=null?'$ '+fmtNum(t.precio_unitario,2):'—'}</td>
        <td>${t.costo_total!=null?fmtMonto(t.costo_total,'ARS'):'—'}</td>
        <td>${t.observaciones||'—'}</td>
        <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarTrabajoManga('${t.id}')">🗑️</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
    ${htmlPaginador(paginaManga, total, 'cambiarPaginaManga')}
  </div>`;
}

function cambiarPaginaManga(p) { paginaManga = p; renderTablaManga(trabajosManga); }

// ── Formularios toggle ────────────────────────────────────

function toggleFormManga() {
  const f = document.getElementById('form-manga-wrap');
  const abriendo = f.style.display === 'none';
  f.style.display = abriendo ? '' : 'none';
  if (abriendo && !document.querySelector('#tm-insumos-list .insumo-row')) agregarInsumoManga();
}

function toggleFormRodeo() {
  const f = document.getElementById('form-rodeo-wrap');
  const abriendo = f.style.display === 'none';
  f.style.display = abriendo ? '' : 'none';
  if (abriendo) {
    document.getElementById('rodeo-form-titulo').textContent = 'Nuevo rodeo';
    document.getElementById('rodeo-id-edit').value = '';
    ['rodeo-nombre','rodeo-ubi','rodeo-cant','rodeo-obs'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
}

function toggleFormNovedadManga(rodeoId) {
  const f = document.getElementById('form-novedad-' + rodeoId);
  if (!f) return;
  f.style.display = f.style.display === 'none' ? '' : 'none';
  const fd = document.getElementById('nov-fecha-' + rodeoId);
  if (fd && !fd.value) fd.value = new Date().toISOString().split('T')[0];
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
  document.getElementById('rodeo-cant').value = r.cantidad || '';
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
    cantidad: parseInt(document.getElementById('rodeo-cant').value) || null,
    observaciones: document.getElementById('rodeo-obs').value.trim()
  };
  if (!data.nombre) { toast('Ingresá un nombre para el rodeo', 'var(--rojo)'); return; }
  const r = id ? await sb('PATCH', 'rodeos', data, `?id=eq.${id}`) : await sb('POST', 'rodeos', data);
  if (r) { toast('✅ Rodeo guardado'); toggleFormRodeo(); await cargarManga(); }
  else toast('❌ Error', 'var(--rojo)');
}

// ── Guardar novedades ─────────────────────────────────────

async function guardarNovedadManga(rodeoId) {
  const data = {
    rodeo_id: rodeoId,
    fecha: document.getElementById('nov-fecha-' + rodeoId).value,
    tipo: document.getElementById('nov-tipo-' + rodeoId).value,
    cantidad: parseInt(document.getElementById('nov-cant-' + rodeoId).value) || null,
    descripcion: document.getElementById('nov-desc-' + rodeoId).value.trim()
  };
  const r = await sb('POST', 'novedades_ganaderas', data);
  if (r) { toast('✅ Novedad registrada'); await cargarManga(); }
  else toast('❌ Error', 'var(--rojo)');
}

async function borrarNovedadManga(id) {
  if (!confirm('¿Borrar esta novedad?')) return;
  await sb('DELETE', 'novedades_ganaderas', null, `?id=eq.${id}`);
  novedadesGanaderas = novedadesGanaderas.filter(n => n.id !== id);
  renderDetalleManga();
}

// ── Guardar animales ──────────────────────────────────────

async function guardarAnimalManga(rodeoId) {
  const data = {
    rodeo_id: rodeoId,
    caravana: document.getElementById('an-caravana').value.trim(),
    sexo: document.getElementById('an-sexo').value,
    categoria: document.getElementById('an-cat').value,
    raza: document.getElementById('an-raza').value.trim(),
    fecha_nacimiento: document.getElementById('an-nacimiento').value || null,
    caravana_madre: document.getElementById('an-madre').value.trim(),
    caravana_padre: document.getElementById('an-padre').value.trim(),
    observaciones: document.getElementById('an-obs').value.trim()
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

// ── Guardar servicios ─────────────────────────────────────

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

async function borrarServicio(id) {
  if (!confirm('¿Borrar este servicio?')) return;
  await sb('DELETE', 'servicios_animal', null, `?id=eq.${id}`);
  serviciosAnimal = serviciosAnimal.filter(s => s.id !== id);
  renderDetalleManga();
}

// ── Trabajos manga ────────────────────────────────────────

function agregarInsumoManga() {
  const list = document.getElementById('tm-insumos-list');
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

async function guardarTrabajoManga() {
  const rodeoId = document.getElementById('tm-rodeo').value;
  if (!rodeoId) { toast('Seleccioná un rodeo', 'var(--rojo)'); return; }
  const cabecera = {
    fecha: document.getElementById('tm-fecha').value,
    rodeo_id: rodeoId,
    tipo: document.getElementById('tm-tipo').value,
    veterinario: document.getElementById('tm-vet').value.trim(),
    cantidad_animales: parseInt(document.getElementById('tm-cant').value) || null,
    campo: (rodeos.find(r => r.id === rodeoId) || {}).campo || null,
    campania: document.getElementById('tm-campania').value.trim(),
    observaciones: document.getElementById('tm-obs-trab').value.trim()
  };
  const filas = document.querySelectorAll('#tm-insumos-list .insumo-row');
  let items = Array.from(filas).map(row => ({
    producto: row.querySelector('.tm-producto')?.value.trim() || '',
    dosis: row.querySelector('.tm-dosis')?.value.trim() || '',
    consumo_total: row.querySelector('.tm-consumo')?.value.trim() || ''
  })).filter(i => i.producto);
  if (!items.length) items = [{ producto: '', dosis: '', consumo_total: '' }];

  let ok = true;
  for (const item of items) {
    const r = await sb('POST', 'trabajos_manga', { ...cabecera, ...item });
    if (!r) ok = false;
  }
  if (ok) {
    toast('✅ Trabajo registrado');
    document.getElementById('tm-obs-trab').value = '';
    document.getElementById('tm-cant').value = '';
    document.getElementById('tm-vet').value = '';
    document.getElementById('tm-insumos-list').innerHTML = '';
    document.getElementById('form-manga-wrap').style.display = 'none';
    tabRodeoActiva = 'trabajos';
    await cargarManga();
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

async function borrarTrabajoManga(id) {
  if (!confirm('¿Borrar este trabajo?')) return;
  await sb('DELETE', 'trabajos_manga', null, `?id=eq.${id}`);
  trabajosManga = trabajosManga.filter(t => t.id !== id);
  if (rodeoSeleccionado) renderDetalleManga();
  else renderTablaManga(trabajosManga);
}
