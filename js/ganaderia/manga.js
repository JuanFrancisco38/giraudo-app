let rodeos = [];
let trabajosManga = [];
let animalesRodeo = [];
let rodeoSeleccionado = null;
let paginaManga = 1;

const COLORES_RODEO = {
  'Vacas': 'bordo', 'Vaquillonas': 'tierra',
  'Terneros': 'verde', 'Terneras': 'verde', 'Toros': 'cielo'
};

async function cargarManga() {
  [rodeos, trabajosManga, animalesRodeo] = await Promise.all([
    sb('GET', 'rodeos', null, '?order=created_at.asc&activo=eq.true'),
    sb('GET', 'trabajos_manga', null, '?order=fecha.desc'),
    sb('GET', 'animales_rodeo', null, '?order=caravana.asc')
  ]);
  rodeos = rodeos || [];
  trabajosManga = trabajosManga || [];
  animalesRodeo = animalesRodeo || [];
  const sel = document.getElementById('tm-rodeo');
  if (sel) sel.innerHTML = '<option value="">— Seleccionar rodeo —</option>' +
    rodeos.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
  renderRodeosManga();
}

function renderRodeosManga() {
  const container = document.getElementById('manga-rodeos-cards');
  if (!container) return;
  if (!rodeos.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🐄</div><h3>Sin rodeos cargados</h3><p>Usá "Nuevo rodeo" para agregar uno</p></div>';
  } else {
    container.innerHTML = rodeos.map(r => {
      const color = COLORES_RODEO[r.categoria] || 'gray';
      const nTrab = trabajosManga.filter(t => t.rodeo_id === r.id).length;
      const sel = rodeoSeleccionado === r.id;
      return `<div class="lote-card${sel ? ' selected' : ''}" onclick="seleccionarRodeoManga('${r.id}')" style="cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <span class="badge badge-${color}">${r.categoria || 'Sin cat.'}</span>
          <span style="font-size:11px;color:var(--texto-suave)">${r.campo || ''}</span>
        </div>
        <div style="font-size:15px;font-weight:600;margin-bottom:4px">${r.nombre}</div>
        ${r.ubicacion ? `<div style="font-size:12px;color:var(--texto-suave);margin-bottom:6px">📍 ${r.ubicacion}</div>` : ''}
        <div style="display:flex;gap:16px;font-size:13px;margin-top:auto">
          <span><strong>${r.cantidad ?? '—'}</strong> animales</span>
          <span style="color:var(--texto-suave)">${nTrab} trabajo${nTrab !== 1 ? 's' : ''}</span>
        </div>
      </div>`;
    }).join('');
  }
  renderDetalleManga();
}

function seleccionarRodeoManga(id) {
  rodeoSeleccionado = rodeoSeleccionado === id ? null : id;
  renderRodeosManga();
  if (rodeoSeleccionado) {
    setTimeout(() => document.getElementById('manga-detalle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
}

function renderDetalleManga() {
  const detalle = document.getElementById('manga-detalle');
  if (!detalle) return;
  if (!rodeoSeleccionado) { renderTablaManga(trabajosManga); return; }

  const rodeo = rodeos.find(r => r.id === rodeoSeleccionado);
  const trabajos = trabajosManga.filter(t => t.rodeo_id === rodeoSeleccionado);
  const animales = animalesRodeo.filter(a => a.rodeo_id === rodeoSeleccionado);
  const color = COLORES_RODEO[rodeo?.categoria] || 'bordo';

  detalle.innerHTML = `
    <div class="card" style="margin-top:16px;border-top:3px solid var(--${color})">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h3>${rodeo?.nombre || ''} <span class="badge badge-${color}" style="font-size:12px">${rodeo?.categoria || ''}</span></h3>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" style="font-size:12px" onclick="toggleFormAnimalManga('${rodeo.id}')">+ Animal</button>
          <button class="btn btn-secondary" style="font-size:12px" onclick="editarRodeo('${rodeo.id}')">✏️ Editar rodeo</button>
        </div>
      </div>
      <div class="card-body">

        <!-- Form animal oculto -->
        <div id="form-animal-${rodeo.id}" style="display:none;background:var(--fondo);border-radius:8px;padding:12px;margin-bottom:16px">
          <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
            <div class="form-group"><label>Caravana</label><input type="text" id="an-caravana" placeholder="Ej: 1234"></div>
            <div class="form-group"><label>Sexo</label><select id="an-sexo"><option>Hembra</option><option>Macho</option></select></div>
            <div class="form-group"><label>Fecha nac.</label><input type="date" id="an-nacimiento"></div>
            <div class="form-group"><label>Observaciones</label><input type="text" id="an-obs" placeholder="Ej: madre 456"></div>
          </div>
          <button class="btn btn-primary" style="font-size:13px" onclick="guardarAnimalManga('${rodeo.id}')">Guardar</button>
          <button class="btn btn-secondary" style="font-size:13px;margin-left:8px" onclick="toggleFormAnimalManga('${rodeo.id}')">Cancelar</button>
        </div>

        <!-- Animales identificados -->
        ${animales.length ? `
          <div style="margin-bottom:20px">
            <div style="font-size:12px;font-weight:600;color:var(--texto-suave);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Animales identificados (${animales.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${animales.map(a => `<span class="badge badge-gray" title="${a.observaciones || ''}" style="font-size:12px">${a.caravana || 'S/N'}${a.fecha_nacimiento ? ' · ' + fmtFecha(a.fecha_nacimiento) : ''}</span>`).join('')}
            </div>
          </div>` : `<div style="margin-bottom:16px;font-size:13px;color:var(--texto-suave)">Sin animales identificados individualmente.</div>`}

        <!-- Trabajos del rodeo -->
        <div style="font-size:12px;font-weight:600;color:var(--texto-suave);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Trabajos (${trabajos.length})</div>
        ${trabajos.length ? `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Dosis</th><th>Cant. tratados</th><th>Veterinario</th><th>$ Unitario</th><th>$ Total</th><th>Obs.</th><th></th></tr></thead>
              <tbody>
                ${trabajos.map(t => `<tr>
                  <td>${fmtFecha(t.fecha)}</td>
                  <td><span class="badge badge-bordo">${t.tipo || '—'}</span></td>
                  <td>${t.producto || '—'}</td>
                  <td>${t.dosis || '—'}</td>
                  <td>${t.cantidad_animales || '—'}</td>
                  <td>${t.veterinario || '—'}</td>
                  <td>${t.precio_unitario != null ? '$ ' + fmtNum(t.precio_unitario, 2) : '—'}</td>
                  <td>${t.costo_total != null ? fmtMonto(t.costo_total, 'ARS') : '—'}</td>
                  <td>${t.observaciones || '—'}</td>
                  <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarTrabajoManga('${t.id}')">🗑️</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div class="empty-state" style="padding:24px"><div class="icon">📋</div><p>Sin trabajos para este rodeo</p></div>`}
      </div>
    </div>`;
}

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
  detalle.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>Todos los trabajos de manga</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Rodeo</th><th>Tipo</th><th>Producto</th><th>Dosis</th><th>Cant.</th><th>Veterinario</th><th>$ Unitario</th><th>$ Total</th><th>Obs.</th><th></th></tr></thead>
          <tbody>
            ${pag.map(t => `<tr>
              <td>${fmtFecha(t.fecha)}</td>
              <td>${getNombre(t.rodeo_id)}</td>
              <td><span class="badge badge-bordo">${t.tipo || '—'}</span></td>
              <td>${t.producto || '—'}</td>
              <td>${t.dosis || '—'}</td>
              <td>${t.cantidad_animales || '—'}</td>
              <td>${t.veterinario || '—'}</td>
              <td>${t.precio_unitario != null ? '$ ' + fmtNum(t.precio_unitario, 2) : '—'}</td>
              <td>${t.costo_total != null ? fmtMonto(t.costo_total, 'ARS') : '—'}</td>
              <td>${t.observaciones || '—'}</td>
              <td><button class="btn btn-danger" style="padding:2px 8px;font-size:11px" onclick="borrarTrabajoManga('${t.id}')">🗑️</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${htmlPaginador(paginaManga, total, 'cambiarPaginaManga')}
    </div>`;
}

function cambiarPaginaManga(p) { paginaManga = p; renderTablaManga(trabajosManga); }

function toggleFormManga() {
  const f = document.getElementById('form-manga-wrap');
  f.style.display = f.style.display === 'none' ? '' : 'none';
  if (f.style.display !== 'none') agregarInsumoManga();
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

function toggleFormAnimalManga(rodeoId) {
  const f = document.getElementById('form-animal-' + rodeoId);
  if (f) f.style.display = f.style.display === 'none' ? '' : 'none';
}

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
  const r = id
    ? await sb('PATCH', 'rodeos', data, `?id=eq.${id}`)
    : await sb('POST', 'rodeos', data);
  if (r) { toast('✅ Rodeo guardado'); toggleFormRodeo(); await cargarManga(); }
  else toast('❌ Error', 'var(--rojo)');
}

async function guardarAnimalManga(rodeoId) {
  const data = {
    rodeo_id: rodeoId,
    caravana: document.getElementById('an-caravana').value.trim(),
    sexo: document.getElementById('an-sexo').value,
    fecha_nacimiento: document.getElementById('an-nacimiento').value || null,
    observaciones: document.getElementById('an-obs').value.trim()
  };
  const r = await sb('POST', 'animales_rodeo', data);
  if (r) { toast('✅ Animal registrado'); await cargarManga(); }
  else toast('❌ Error', 'var(--rojo)');
}

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
