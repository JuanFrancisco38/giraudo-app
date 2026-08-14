let maquinas = [], mantenimientos = [], trabajosMaq = [];
let maquinaSeleccionada = null, tabMaqActiva = 'datos', catFiltroActiva = null;

const BADGE_CAT = {
  'Tractor': 'badge-bordo', 'Cosecha': 'badge-yellow', 'Siembra': 'badge-green',
  'Acondicionamiento de suelo': 'badge-tierra', 'Movimiento de granos': 'badge-yellow',
  'Movimiento de suelos': 'badge-tierra', 'Fumigacion': 'badge-blue',
  'Henificacion': 'badge-green', 'Forraje': 'badge-tierra',
  'Movilidad': 'badge-blue', 'Otro': 'badge-gris'
};
const ICON_CAT = {
  'Tractor': '🚜', 'Cosecha': '🌾', 'Siembra': '🌱',
  'Acondicionamiento de suelo': '🪚', 'Movimiento de granos': '🚛',
  'Movimiento de suelos': '🪚', 'Fumigacion': '💦',
  'Henificacion': '🌀', 'Forraje': '🌿',
  'Movilidad': '🚗', 'Otro': '⚙️'
};

async function cargarMaquinaria() {
  const [maq, mant, trab] = await Promise.all([
    sb('GET', 'maquinaria', null, '?order=categoria,nombre'),
    sb('GET', 'mantenimiento', null, '?order=fecha.desc'),
    sb('GET', 'trabajos_agricolas', null, '?order=fecha.desc')
  ]);
  maquinas = maq || [];
  mantenimientos = mant || [];
  trabajosMaq = trab || [];
  renderTarjetasCat();
  renderListaMaquinas();
  if (maquinaSeleccionada) {
    const actualizada = maquinas.find(m => m.id === maquinaSeleccionada.id);
    if (actualizada) seleccionarMaquina(actualizada);
  } else {
    document.getElementById('maq-ficha-wrap').style.display = 'none';
    document.getElementById('maq-empty').style.display = '';
  }
}

function renderTarjetasCat() {
  const cats = {};
  maquinas.forEach(m => {
    const c = m.categoria || 'Otro';
    cats[c] = (cats[c] || 0) + 1;
  });
  const cont = document.getElementById('maq-tarjetas');
  cont.innerHTML = Object.entries(cats).map(([cat, n]) => {
    const activa = catFiltroActiva === cat;
    return `<div class="stat-card${activa ? ' activa' : ''}" onclick="toggleCatFiltro('${cat}')" style="cursor:pointer;min-width:140px;flex:1">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:28px;line-height:1">${ICON_CAT[cat] || '⚙️'}</div>
        <div>
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--texto-suave)">${cat}</div>
          <div style="font-size:28px;font-weight:700;line-height:1">${n}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleCatFiltro(cat) {
  catFiltroActiva = catFiltroActiva === cat ? null : cat;
  renderTarjetasCat();
  renderListaMaquinas();
}

function renderListaMaquinas() {
  const cont = document.getElementById('maq-lista');
  const lista = catFiltroActiva ? maquinas.filter(m => m.categoria === catFiltroActiva) : maquinas;

  if (!lista.length) {
    cont.innerHTML = '<div style="padding:24px;text-align:center;color:var(--texto-suave);font-size:13px">Sin máquinas</div>';
    return;
  }

  cont.innerHTML = lista.map(m => {
    const activa = maquinaSeleccionada?.id === m.id;
    const uso = m.horas_actuales ? `${fmtNum(m.horas_actuales)} ${m.unidad_uso || 'hs'}` : '—';
    const valor = m.valor_compra ? `${m.moneda_compra || 'USD'} ${fmtNum(m.valor_compra)}` : '—';
    return `<div class="maq-item${activa ? ' activa' : ''}" onclick="seleccionarMaquina(${JSON.stringify(m).replace(/"/g, '&quot;')})">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-weight:600;font-size:13px">${m.nombre}</div>
        <span class="badge ${BADGE_CAT[m.categoria] || 'badge-gris'}" style="font-size:10px">${m.categoria || '—'}</span>
      </div>
      <div style="font-size:11px;color:var(--texto-suave);margin-top:3px">${m.anio || '—'} · ${uso} · ${valor}</div>
    </div>`;
  }).join('');
}

function seleccionarMaquina(m) {
  maquinaSeleccionada = m;
  tabMaqActiva = 'datos';
  renderListaMaquinas();
  document.getElementById('maq-empty').style.display = 'none';
  document.getElementById('maq-ficha-wrap').style.display = '';
  renderFichaMaquina();
}

function renderFichaMaquina() {
  const m = maquinaSeleccionada;
  document.getElementById('maq-ficha-titulo').textContent = m.nombre;
  document.getElementById('maq-ficha-sub').innerHTML = `<span class="badge ${BADGE_CAT[m.categoria] || 'badge-gris'}">${m.categoria || '—'}</span> &nbsp; ${m.anio || '—'}`;
  ['datos','mantenimiento','trabajos'].forEach(t => {
    document.getElementById(`maq-tab-${t}`).classList.toggle('active', t === tabMaqActiva);
  });
  renderContenidoFichaMaq(tabMaqActiva);
}

function switchTabMaq(tab) {
  tabMaqActiva = tab;
  renderFichaMaquina();
}

function renderContenidoFichaMaq(tab) {
  const m = maquinaSeleccionada;
  const cont = document.getElementById('maq-ficha-contenido');

  if (tab === 'datos') {
    const uso = m.horas_actuales != null ? `${fmtNum(m.horas_actuales)} ${m.unidad_uso || 'hs'}` : '—';
    const valor = m.valor_compra ? `${m.moneda_compra || 'USD'} ${fmtNum(m.valor_compra)}` : '—';
    cont.innerHTML = `
      <div id="maq-datos-view">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;padding:16px">
          <div class="ficha-dato"><span class="ficha-label">Nombre</span><span class="ficha-val">${m.nombre}</span></div>
          <div class="ficha-dato"><span class="ficha-label">Categoría</span><span class="ficha-val">${m.categoria || '—'}</span></div>
          <div class="ficha-dato"><span class="ficha-label">Año</span><span class="ficha-val">${m.anio || '—'}</span></div>
          <div class="ficha-dato"><span class="ficha-label">Valor de compra</span><span class="ficha-val">${valor}</span></div>
          <div class="ficha-dato"><span class="ficha-label">${labelUso(m.unidad_uso)} actuales</span><span class="ficha-val">${uso}</span></div>
          <div class="ficha-dato"><span class="ficha-label">Observaciones</span><span class="ficha-val">${m.observaciones || '—'}</span></div>
        </div>
        <div style="padding:0 16px 16px">
          <button class="btn btn-secondary" style="font-size:12px" onclick="toggleEditarMaquina()">✏️ Editar</button>
        </div>
      </div>
      <div id="maq-datos-edit" style="display:none;padding:16px">
        <div class="form-grid">
          <div class="form-group"><label>Nombre</label><input type="text" id="medit-nombre" value="${m.nombre || ''}"></div>
          <div class="form-group"><label>Categoría</label>
            <select id="medit-cat">
              ${['Tractor','Cosecha','Siembra','Acondicionamiento de suelo','Movimiento de granos','Movimiento de suelos','Fumigacion','Henificacion','Forraje','Movilidad','Otro'].map(c => `<option${m.categoria===c?' selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Año</label><input type="number" id="medit-anio" value="${m.anio || ''}"></div>
          <div class="form-group"><label>Valor compra</label><input type="number" id="medit-valor" value="${m.valor_compra || ''}"></div>
          <div class="form-group"><label>Moneda</label>
            <select id="medit-moneda">
              <option${m.moneda_compra==='USD'?' selected':''}>USD</option>
              <option${m.moneda_compra==='ARS'?' selected':''}>ARS</option>
            </select>
          </div>
          <div class="form-group"><label>${labelUso(m.unidad_uso)} actuales</label><input type="number" id="medit-horas" value="${m.horas_actuales || ''}"></div>
          <div class="form-group"><label>Unidad de uso</label>
            <select id="medit-unidad">
              ${['hs','km','has','rollos'].map(u => `<option${m.unidad_uso===u?' selected':''}>${u}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full"><label>Observaciones</label><textarea id="medit-obs">${m.observaciones || ''}</textarea></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="guardarEdicionMaquina()">Guardar</button>
          <button class="btn btn-secondary" onclick="toggleEditarMaquina()">Cancelar</button>
        </div>
      </div>`;

  } else if (tab === 'mantenimiento') {
    const registros = mantenimientos.filter(r => r.maquina_id === m.id);
    const totalCosto = registros.reduce((s, r) => s + (r.costo || 0), 0);
    const rows = registros.length
      ? registros.map(r => `<tr>
          <td>${fmtFecha(r.fecha)}</td>
          <td>${r.tipo || '—'}</td>
          <td>${r.horas_maquina ? fmtNum(r.horas_maquina) + ' ' + (m.unidad_uso||'hs') : '—'}</td>
          <td>${r.descripcion || '—'}</td>
          <td>${r.costo ? '$ ' + fmtNum(r.costo) : '—'}</td>
          <td><button class="btn btn-secondary" style="padding:2px 8px;font-size:11px" onclick="borrarMantenimiento('${r.id}')">🗑️</button></td>
        </tr>`).join('')
      : '<tr><td colspan="6"><div class="empty-state"><div class="icon">🔧</div><h3>Sin registros</h3></div></td></tr>';

    cont.innerHTML = `
      <div style="padding:12px 16px;border-bottom:1px solid var(--gris-borde);display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:12px;color:var(--texto-suave)">${registros.length} registro${registros.length!==1?'s':''} · Total: $ ${fmtNum(totalCosto)}</span>
        <button class="btn btn-primary" style="font-size:12px" onclick="toggleFormMant()">+ Registrar</button>
      </div>
      <div id="form-mant-ficha" style="display:none;padding:16px;border-bottom:1px solid var(--gris-borde)">
        <div class="form-grid">
          <div class="form-group"><label>Fecha</label><input type="date" id="mant-fecha" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="form-group"><label>Tipo</label>
            <select id="mant-tipo">
              <option>Cambio de aceite</option><option>Filtros</option><option>Neumáticos</option>
              <option>Reparación</option><option>Revisión general</option><option>Repuestos</option><option>Otro</option>
            </select>
          </div>
          <div class="form-group"><label>${labelUso(m.unidad_uso)} al momento</label><input type="number" id="mant-horas" placeholder="Ej: 4500"></div>
          <div class="form-group"><label>Costo $</label><input type="number" id="mant-costo" placeholder="Ej: 150000"></div>
          <div class="form-group full"><label>Descripción</label><textarea id="mant-desc" placeholder="Detalle del mantenimiento..."></textarea></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="guardarMantenimientoFicha()">Guardar</button>
          <button class="btn btn-secondary" onclick="toggleFormMant()">Cancelar</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>${labelUso(m.unidad_uso)}</th><th>Descripción</th><th>Costo</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;

  } else if (tab === 'trabajos') {
    const registros = trabajosMaq.filter(t => t.maquina_id === m.id);
    const rows = registros.length
      ? registros.map(t => `<tr>
          <td>${fmtFecha(t.fecha)}</td>
          <td>${t.tipo || '—'}</td>
          <td>${t.campo || '—'}</td>
          <td>${t.lote || '—'}</td>
          <td>${t.hectareas ? fmtNum(t.hectareas) + ' has' : '—'}</td>
          <td>${t.cultivo || '—'}</td>
        </tr>`).join('')
      : '<tr><td colspan="6"><div class="empty-state"><div class="icon">🌾</div><h3>Sin trabajos registrados</h3></div></td></tr>';

    cont.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Campo</th><th>Lote</th><th>Has</th><th>Cultivo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }
}

function labelUso(unidad) {
  if (unidad === 'km') return 'Kilómetros';
  if (unidad === 'has') return 'Hectáreas';
  if (unidad === 'rollos') return 'Rollos';
  return 'Horas';
}

function toggleEditarMaquina() {
  const view = document.getElementById('maq-datos-view');
  const edit = document.getElementById('maq-datos-edit');
  const showEdit = view.style.display !== 'none';
  view.style.display = showEdit ? 'none' : '';
  edit.style.display = showEdit ? '' : 'none';
}

async function guardarEdicionMaquina() {
  const data = {
    nombre: document.getElementById('medit-nombre').value,
    categoria: document.getElementById('medit-cat').value,
    anio: parseInt(document.getElementById('medit-anio').value) || null,
    valor_compra: parseFloat(document.getElementById('medit-valor').value) || null,
    moneda_compra: document.getElementById('medit-moneda').value,
    horas_actuales: parseFloat(document.getElementById('medit-horas').value) || null,
    unidad_uso: document.getElementById('medit-unidad').value,
    observaciones: document.getElementById('medit-obs').value || null
  };
  const r = await sb('PATCH', 'maquinaria', data, `?id=eq.${maquinaSeleccionada.id}`);
  if (r) {
    toast('✅ Máquina actualizada');
    await cargarMaquinaria();
  } else toast('❌ Error', 'var(--rojo)');
}

function toggleFormMant() {
  const f = document.getElementById('form-mant-ficha');
  f.style.display = f.style.display === 'none' ? '' : 'none';
}

async function guardarMantenimientoFicha() {
  const data = {
    maquina_id: maquinaSeleccionada.id,
    fecha: document.getElementById('mant-fecha').value,
    tipo: document.getElementById('mant-tipo').value,
    horas_maquina: parseFloat(document.getElementById('mant-horas').value) || null,
    costo: parseFloat(document.getElementById('mant-costo').value) || null,
    descripcion: document.getElementById('mant-desc').value || null
  };
  const r = await sb('POST', 'mantenimiento', data);
  if (r) {
    toast('✅ Mantenimiento registrado');
    await cargarMaquinaria();
  } else toast('❌ Error', 'var(--rojo)');
}

async function borrarMantenimiento(id) {
  if (!confirm('¿Eliminar este registro de mantenimiento?')) return;
  await sb('DELETE', 'mantenimiento', null, `?id=eq.${id}`);
  await cargarMaquinaria();
}

async function guardarMaquina() {
  const data = {
    nombre: document.getElementById('maq-nombre').value,
    categoria: document.getElementById('maq-cat').value,
    anio: parseInt(document.getElementById('maq-anio').value) || null,
    valor_compra: parseFloat(document.getElementById('maq-valor').value) || null,
    moneda_compra: document.getElementById('maq-moneda').value || 'USD',
    horas_actuales: parseFloat(document.getElementById('maq-horas').value) || null,
    unidad_uso: document.getElementById('maq-unidad').value || 'hs'
  };
  if (!data.nombre) { toast('Ingresá un nombre', 'var(--rojo)'); return; }
  const r = await sb('POST', 'maquinaria', data);
  if (r) {
    toast('✅ Máquina agregada');
    toggleForm('form-maq-nuevo');
    await cargarMaquinaria();
  } else toast('❌ Error', 'var(--rojo)');
}
