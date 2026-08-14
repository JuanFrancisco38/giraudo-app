let maquinas = [], mantenimientos = [], trabajosMaq = [];
let maquinaSeleccionada = null, tabMaqActiva = 'datos', catFiltroActiva = null;

const BADGE_CAT = {
  'Tractor': 'badge-bordo', 'Cosecha': 'badge-yellow', 'Siembra': 'badge-green',
  'Acondicionamiento de suelo': 'badge-tierra', 'Movimiento de granos': 'badge-yellow',
  'Movimiento de suelos': 'badge-tierra', 'Fumigacion': 'badge-blue',
  'Forraje': 'badge-tierra',
  'Movilidad': 'badge-blue', 'Otro': 'badge-gris'
};
const ICON_CAT = {
  'Tractor': '🚜', 'Cosecha': '🌾', 'Siembra': '🌱',
  'Acondicionamiento de suelo': '🪚', 'Movimiento de granos': '🚛',
  'Movimiento de suelos': '🪚', 'Fumigacion': '💦',
  'Forraje': '🌿',
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
    const trabsMaq = trabajosMaq.filter(t => t.maquina_id === m.id);
    const hasTotal = trabsMaq.length ? trabsMaq.reduce((s, t) => s + (t.hectareas || 0), 0) : null;
    const uso = hasTotal != null && m.unidad_uso === 'has'
      ? `${fmtNum(hasTotal)} has`
      : m.horas_actuales != null ? `${fmtNum(m.horas_actuales)} ${m.unidad_uso || 'hs'}` : '—';
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
              ${['Tractor','Cosecha','Siembra','Acondicionamiento de suelo','Movimiento de granos','Movimiento de suelos','Fumigacion','Forraje','Movilidad','Otro'].map(c => `<option${m.categoria===c?' selected':''}>${c}</option>`).join('')}
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
    const todosRegistros = trabajosMaq.filter(t => t.maquina_id === m.id);
    const cat = m.categoria;
    const $n = v => v != null ? fmtNum(v) : '—';
    const $p = v => v != null ? '$' + fmtNum(v) : '—';
    const $u = v => v != null ? 'U$D ' + fmtNum(v) : '—';

    // Campaña: 1/7 al 30/6
    function campania(fecha) {
      if (!fecha) return '—';
      const d = new Date(fecha);
      const y = d.getFullYear(), mo = d.getMonth() + 1;
      const desde = mo >= 7 ? y : y - 1;
      return `${String(desde).slice(2)}/${String(desde + 1).slice(2)}`;
    }

    // Campañas disponibles
    const campanias = [...new Set(todosRegistros.map(t => campania(t.fecha)))].sort();

    // Estado de filtros (persistido en el DOM para no perder al redibujar)
    const prevCamp = document.getElementById('trab-f-camp')?.value || '';
    const prevProp = document.getElementById('trab-f-prop')?.value?.toLowerCase() || '';
    const prevEstab = document.getElementById('trab-f-estab')?.value?.toLowerCase() || '';
    const prevCult = document.getElementById('trab-f-cult')?.value?.toLowerCase() || '';
    const prevOp = document.getElementById('trab-f-op')?.value?.toLowerCase() || '';
    const PAGE_SIZE = 30;
    const prevPage = parseInt(document.getElementById('trab-page-cur')?.value || '0');

    function filtrar(regs, camp, prop, estab, cult, op) {
      return regs.filter(t => {
        if (camp && campania(t.fecha) !== camp) return false;
        if (prop && !(t.propietario||'').toLowerCase().includes(prop)) return false;
        if (estab && !(t.establecimiento||'').toLowerCase().includes(estab)) return false;
        if (cult && !(t.cultivo||'').toLowerCase().includes(cult)) return false;
        if (op && !(t.operario||'').toLowerCase().includes(op)) return false;
        return true;
      });
    }

    const filtrados = filtrar(todosRegistros, prevCamp, prevProp, prevEstab, prevCult, prevOp);
    const totalPags = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
    const pagActual = Math.min(prevPage, totalPags - 1);
    const registros = filtrados.slice(pagActual * PAGE_SIZE, (pagActual + 1) * PAGE_SIZE);

    const esEnrolladora = m.nombre && (m.nombre.toLowerCase().includes('enrolladora') || m.nombre.toLowerCase().includes('rb4'));
    let thead = '', rowFn;

    if (esEnrolladora) {
      thead = `<tr>
        <th>Fecha</th><th>Propietario</th><th>Establecimiento</th><th>Lote</th>
        <th>Has</th><th>Cultivo</th><th>Rollos</th><th>Rdto</th><th>Tipo Rollo</th>
        <th>Tarifa (lts/rollo)</th><th>Tot.Gas(lts)</th><th>$Gasoil</th>
        <th>Total $</th><th>TC</th><th>Total U$D</th>
        <th>Cons/Rollo</th><th>Cons.Total</th><th>Costo Gas.</th>
        <th>Operario</th><th>% Op.</th><th>Red/Hilo</th><th>Tot.Red/Hilo</th>
        <th>Costo Total</th><th>C/Rollo</th><th>Gan/Rollo</th><th>Mrg/Rollo</th><th>Mrg Total</th>
      </tr>`;
      rowFn = t => {
        const e = t.extras || {};
        return `<tr>
          <td>${fmtFecha(t.fecha)}</td><td>${t.propietario||'—'}</td><td>${t.establecimiento||'—'}</td><td>${t.lote||'—'}</td>
          <td>${$n(t.hectareas)}</td><td>${t.cultivo||'—'}</td><td>${$n(e.rollos)}</td><td>${$n(e.rendimiento)}</td><td>${e.tipo_rollo||'—'}</td>
          <td>${$n(t.tarifa_gasoil)}</td><td>${$n(t.total_gasoil_lts)}</td><td>${$p(t.costo_gasoil)}</td>
          <td>${$p(t.total_pesos)}</td><td>${$n(t.tipo_cambio)}</td><td>${$u(t.total_usd)}</td>
          <td>${$n(e.consumo_por_rollo)}</td><td>${$n(e.consumo_total_lts)}</td><td>${$p(e.costo_gasoil_pesos)}</td>
          <td>${t.operario||'—'}</td><td>${$n(t.porcentaje_operario)}%</td><td>${$n(e.consumo_red)}</td><td>${$p(e.costo_red_hilo)}</td>
          <td>${$p(t.costo_total)}</td><td>${$p(e.costo_por_rollo)}</td><td>${$p(e.ganancia_por_rollo)}</td><td>${$p(e.margen_por_rollo)}</td><td>${$p(t.margen_total)}</td>
        </tr>`;
      };
    } else if (cat === 'Forraje' || cat === 'Cosecha' || cat === 'Siembra') {
      thead = `<tr>
        <th>Fecha</th><th>Propietario</th><th>Establecimiento</th><th>Lote</th>
        <th>Has</th><th>Cultivo</th>
        <th>Tarifa (lts/ha)</th><th>Tot.Gas(lts)</th><th>$Gasoil</th>
        <th>Total $</th><th>TC</th><th>Total U$D</th>
        <th>Cons/Ha</th><th>Cons.Total</th><th>Costo Gas.</th>
        <th>Operario</th><th>Costo Op.</th>
        <th>Costo Total</th><th>C/Ha</th><th>Gan/Ha</th><th>Mrg/Ha</th><th>Mrg Total</th>
      </tr>`;
      rowFn = t => {
        const e = t.extras || {};
        return `<tr>
          <td>${fmtFecha(t.fecha)}</td><td>${t.propietario||'—'}</td><td>${t.establecimiento||'—'}</td><td>${t.lote||'—'}</td>
          <td>${$n(t.hectareas)}</td><td>${t.cultivo||'—'}</td>
          <td>${$n(t.tarifa_gasoil)}</td><td>${$n(t.total_gasoil_lts)}</td><td>${$p(t.costo_gasoil)}</td>
          <td>${$p(t.total_pesos)}</td><td>${$n(t.tipo_cambio)}</td><td>${$u(t.total_usd)}</td>
          <td>${$n(e.consumo_por_ha)}</td><td>${$n(e.consumo_total_lts)}</td><td>${$p(e.costo_gasoil_pesos)}</td>
          <td>${t.operario||'—'}</td><td>${$p(e.costo_operario)}</td>
          <td>${$p(t.costo_total)}</td><td>${$p(e.costo_por_ha)}</td><td>${$p(e.ganancia_por_ha)}</td><td>${$p(e.margen_por_ha)}</td><td>${$p(t.margen_total)}</td>
        </tr>`;
      };
    } else {
      thead = `<tr><th>Fecha</th><th>Propietario</th><th>Establecimiento</th><th>Lote</th><th>Has</th><th>Cultivo</th><th>Total $</th><th>Total U$D</th><th>Margen Total</th></tr>`;
      rowFn = t => `<tr>
        <td>${fmtFecha(t.fecha)}</td><td>${t.propietario||'—'}</td><td>${t.establecimiento||'—'}</td><td>${t.lote||'—'}</td>
        <td>${$n(t.hectareas)}</td><td>${t.cultivo||'—'}</td><td>${$p(t.total_pesos)}</td><td>${$u(t.total_usd)}</td><td>${$p(t.margen_total)}</td>
      </tr>`;
    }

    // ── Resumen sobre filtrados ──
    const porRollo = esEnrolladora;
    const unidadTot = porRollo
      ? filtrados.reduce((s, t) => s + ((t.extras||{}).rollos || 0), 0)
      : filtrados.reduce((s, t) => s + (t.hectareas || 0), 0);
    const unidadLabel = porRollo ? 'rollos' : 'ha';
    const unidadTitulo = porRollo ? 'Rollos confeccionados' : 'HAS totales';
    const gasoilTot = filtrados.reduce((s, t) => { const e = t.extras||{}; return s + (e.consumo_total_lts || t.total_gasoil_lts || 0); }, 0);
    const costoOpTot = filtrados.reduce((s, t) => { const e = t.extras||{}; return s + (e.costo_operario || 0); }, 0);
    const consProm = unidadTot > 0 && gasoilTot > 0 ? gasoilTot / unidadTot : null;

    // COSTO TOTAL — de extras.costo_total
    const costoTotPesos  = filtrados.reduce((s, t) => s + ((t.extras||{}).costo_total || 0), 0);
    const costoTotUsd    = filtrados.reduce((s, t) => { const e = t.extras||{}; return s + (e.costo_total && t.tipo_cambio ? e.costo_total / t.tipo_cambio : 0); }, 0);
    const costoPromPesos = unidadTot > 0 && costoTotPesos > 0 ? costoTotPesos / unidadTot : null;

    // MARGEN TOTAL — de margen_total
    const margenTotPesos  = filtrados.reduce((s, t) => s + (t.margen_total || 0), 0);
    const margenTotUsd    = filtrados.reduce((s, t) => s + (t.margen_total && t.tipo_cambio ? t.margen_total / t.tipo_cambio : 0), 0);
    const margenPromPesos = unidadTot > 0 ? margenTotPesos / unidadTot : null;

    // GANANCIA TOTAL — de ganancia_por_rollo*rollos (enrolladora) o ganancia_por_ha*ha (resto)
    const ganTotPesos = filtrados.reduce((s, t) => {
      const e = t.extras||{};
      return s + (porRollo ? (e.ganancia_por_rollo||0) * (e.rollos||0) : (e.ganancia_por_ha||0) * (t.hectareas||0));
    }, 0);
    const ganTotUsd    = filtrados.reduce((s, t) => {
      const e = t.extras||{};
      const g = porRollo ? (e.ganancia_por_rollo||0) * (e.rollos||0) : (e.ganancia_por_ha||0) * (t.hectareas||0);
      return s + (t.tipo_cambio ? g / t.tipo_cambio : 0);
    }, 0);
    const ganPromPesos = unidadTot > 0 ? ganTotPesos / unidadTot : null;

    // Operarios desglosados
    const opMap = {};
    filtrados.forEach(t => {
      const op = t.operario || '—';
      const val = porRollo ? ((t.extras||{}).rollos || 0) : (t.hectareas || 0);
      opMap[op] = (opMap[op] || 0) + val;
    });
    const opEntries = Object.entries(opMap).filter(([k]) => k !== '—');
    const opHtml = opEntries.length
      ? opEntries.map(([op, v]) => `<span style="display:block;font-size:11px">${op}: <b>${fmtNum(v)} ${unidadLabel}</b></span>`).join('')
      : '<span style="font-size:11px;color:var(--text-muted)">—</span>';

    // Cultivos desglosados
    const cultMap = {};
    filtrados.forEach(t => {
      if (t.cultivo) {
        const val = porRollo ? ((t.extras||{}).rollos || 0) : (t.hectareas || 0);
        cultMap[t.cultivo] = (cultMap[t.cultivo] || 0) + val;
      }
    });
    const cultHtml = Object.entries(cultMap).length
      ? Object.entries(cultMap).map(([c, v]) => `<span style="display:block;font-size:11px">${c}: <b>${fmtNum(v)} ${unidadLabel}</b></span>`).join('')
      : '<span style="font-size:11px;color:var(--text-muted)">—</span>';

    function kard(titulo, valor, usd = null, unitPesos = null, unitLts = null) {
      return `<div style="background:var(--card-bg,var(--bg-secondary));border:1px solid var(--border-color);border-radius:8px;padding:10px 14px;min-width:150px;flex:1">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">${titulo}</div>
        <div style="font-size:18px;font-weight:700;color:var(--text-primary)">${valor}</div>
        ${usd != null ? `<div style="font-size:12px;color:var(--text-muted);margin-top:1px">${usd}</div>` : ''}
        ${unitPesos != null ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;border-top:1px solid var(--border-color);padding-top:4px">${unitPesos}</div>` : ''}
        ${unitLts != null ? `<div style="font-size:11px;color:var(--text-muted)">${unitLts}</div>` : ''}
      </div>`;
    }

    const resumen = filtrados.length === 0 ? '' : `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        ${kard(unidadTitulo, fmtNum(unidadTot) + ' ' + unidadLabel, null, `${filtrados.length} trabajo${filtrados.length!==1?'s':''}`)}
        <div style="background:var(--card-bg,var(--bg-secondary));border:1px solid var(--border-color);border-radius:8px;padding:10px 14px;min-width:130px;flex:1">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Operario(s)</div>
          ${opHtml}
          ${costoOpTot > 0 ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Costo op.: <b>$${fmtNum(costoOpTot)}</b></div>` : ''}
        </div>
        <div style="background:var(--card-bg,var(--bg-secondary));border:1px solid var(--border-color);border-radius:8px;padding:10px 14px;min-width:130px;flex:1">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Cultivos</div>
          ${cultHtml}
        </div>
        ${costoTotPesos > 0 ? kard('Costo total',
            '$' + fmtNum(costoTotPesos),
            costoTotUsd > 0 ? 'U$D ' + fmtNum(costoTotUsd) : null,
            costoPromPesos != null ? '$' + fmtNum(costoPromPesos) + '/' + unidadLabel : null,
            consProm != null ? fmtNum(consProm) + ' lts/' + unidadLabel : null) : ''}
        ${kard('Margen total',
            '$' + fmtNum(margenTotPesos),
            margenTotUsd !== 0 ? 'U$D ' + fmtNum(margenTotUsd) : null,
            margenPromPesos != null ? '$' + fmtNum(margenPromPesos) + '/' + unidadLabel : null,
            consProm != null ? fmtNum(consProm) + ' lts/' + unidadLabel : null)}
        ${kard('Ganancia total',
            '$' + fmtNum(ganTotPesos),
            ganTotUsd !== 0 ? 'U$D ' + fmtNum(ganTotUsd) : null,
            ganPromPesos != null ? '$' + fmtNum(ganPromPesos) + '/' + unidadLabel : null,
            consProm != null ? fmtNum(consProm) + ' lts/' + unidadLabel : null)}
        ${gasoilTot > 0 ? kard('Gasoil total', fmtNum(gasoilTot) + ' lts', null, consProm != null ? fmtNum(consProm) + ' lts/' + unidadLabel : null) : ''}
      </div>`;

    const rows = registros.length
      ? registros.map(rowFn).join('')
      : `<tr><td colspan="25"><div class="empty-state"><div class="icon">🌾</div><h3>Sin trabajos</h3></div></td></tr>`;

    const paginador = totalPags > 1 ? `
      <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-top:10px">
        <button class="btn btn-sm" onclick="trabPaginar(-1)" ${pagActual===0?'disabled':''}>&#8592;</button>
        <span style="font-size:13px">Pág. ${pagActual+1} / ${totalPags} (${filtrados.length} registros)</span>
        <button class="btn btn-sm" onclick="trabPaginar(1)" ${pagActual>=totalPags-1?'disabled':''}>&#8594;</button>
        <input type="hidden" id="trab-page-cur" value="${pagActual}">
      </div>` : `<div style="font-size:12px;color:var(--text-muted);margin-top:6px;text-align:right">${filtrados.length} registros</div>`;

    cont.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px">
        <select id="trab-f-camp" class="form-control" style="width:110px;font-size:12px" onchange="renderContenidoFichaMaq('trabajos')">
          <option value="">Todas las campañas</option>
          ${campanias.map(c => `<option value="${c}"${prevCamp===c?' selected':''}>${c}</option>`).join('')}
        </select>
        <input id="trab-f-prop" class="form-control" style="width:140px;font-size:12px" placeholder="Propietario" value="${prevProp}" oninput="trabFiltrar()">
        <input id="trab-f-estab" class="form-control" style="width:140px;font-size:12px" placeholder="Establecimiento" value="${prevEstab}" oninput="trabFiltrar()">
        <input id="trab-f-cult" class="form-control" style="width:110px;font-size:12px" placeholder="Cultivo" value="${prevCult}" oninput="trabFiltrar()">
        <input id="trab-f-op" class="form-control" style="width:110px;font-size:12px" placeholder="Operario" value="${prevOp}" oninput="trabFiltrar()">
        <button class="btn btn-sm" onclick="trabLimpiarFiltros()">✕ Limpiar</button>
        <button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="abrirModalTrabajo()">+ Agregar trabajo</button>
      </div>
      ${resumen}
      <div class="table-wrap" style="overflow-x:auto"><table>
        <thead>${thead}</thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${paginador}`;
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

function trabFiltrar() {
  // Debounce ligero para inputs de texto
  clearTimeout(window._trabFiltrarTimer);
  window._trabFiltrarTimer = setTimeout(() => {
    // Resetear página al filtrar
    const pg = document.getElementById('trab-page-cur');
    if (pg) pg.value = '0';
    renderContenidoFichaMaq('trabajos');
  }, 300);
}

function trabPaginar(delta) {
  const pg = document.getElementById('trab-page-cur');
  if (!pg) return;
  pg.value = Math.max(0, parseInt(pg.value || '0') + delta);
  renderContenidoFichaMaq('trabajos');
}

function trabLimpiarFiltros() {
  ['trab-f-camp','trab-f-prop','trab-f-estab','trab-f-cult','trab-f-op'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const pg = document.getElementById('trab-page-cur');
  if (pg) pg.value = '0';
  renderContenidoFichaMaq('trabajos');
}

function abrirModalTrabajo() {
  const m = maquinaSeleccionada;
  const cat = m.categoria;
  const esEnrolladora = m.nombre && (m.nombre.toLowerCase().includes('enrolladora') || m.nombre.toLowerCase().includes('rb4'));
  const porRollo = esEnrolladora;

  const camposExtras = porRollo ? `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="form-group"><label>Rollos</label><input type="number" id="trab-rollos"></div>
      <div class="form-group"><label>Rendimiento</label><input type="number" id="trab-rendimiento"></div>
      <div class="form-group"><label>Tipo Rollo</label><input type="text" id="trab-tipo-rollo"></div>
      <div class="form-group"><label>Cons/Rollo (lts)</label><input type="number" id="trab-cons-rollo"></div>
      <div class="form-group"><label>Consumo Red</label><input type="number" id="trab-cons-red"></div>
      <div class="form-group"><label>Costo Red/Hilo $</label><input type="number" id="trab-costo-red"></div>
      <div class="form-group"><label>Costo/Rollo $</label><input type="number" id="trab-costo-rollo"></div>
      <div class="form-group"><label>Ganancia/Rollo $</label><input type="number" id="trab-gan-rollo"></div>
      <div class="form-group"><label>Margen/Rollo $</label><input type="number" id="trab-mrg-rollo"></div>
    </div>` : `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="form-group"><label>Cons/Ha (lts)</label><input type="number" id="trab-cons-ha"></div>
      <div class="form-group"><label>Costo/Ha $</label><input type="number" id="trab-costo-ha"></div>
      <div class="form-group"><label>Ganancia/Ha $</label><input type="number" id="trab-gan-ha"></div>
      <div class="form-group"><label>Margen/Ha $</label><input type="number" id="trab-mrg-ha"></div>
    </div>`;

  const html = `<div id="modal-trabajo" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;overflow-y:auto">
    <div style="background:var(--card);padding:24px;border-radius:12px;width:min(900px,96vw);max-height:90vh;overflow-y:auto">
      <h3 style="margin-bottom:16px">Nuevo trabajo — ${m.nombre}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="form-group"><label>Fecha</label><input type="date" id="trab-fecha"></div>
        <div class="form-group"><label>Propietario</label><input type="text" id="trab-propietario"></div>
        <div class="form-group"><label>Establecimiento</label><input type="text" id="trab-estab"></div>
        <div class="form-group"><label>Lote</label><input type="text" id="trab-lote"></div>
        <div class="form-group"><label>Hectáreas</label><input type="number" id="trab-has"></div>
        <div class="form-group"><label>Cultivo</label><input type="text" id="trab-cultivo"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
        <div class="form-group"><label>Tarifa Gasoil $</label><input type="number" id="trab-tarifa-gas"></div>
        <div class="form-group"><label>Total Gasoil (lts)</label><input type="number" id="trab-tot-gas"></div>
        <div class="form-group"><label>$ Gasoil</label><input type="number" id="trab-costo-gas"></div>
        <div class="form-group"><label>Total en $</label><input type="number" id="trab-total-pesos"></div>
        <div class="form-group"><label>Tipo de Cambio</label><input type="number" id="trab-tc"></div>
        <div class="form-group"><label>Total en U$D</label><input type="number" id="trab-total-usd"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <div class="form-group"><label>Operario</label><input type="text" id="trab-operario"></div>
        <div class="form-group"><label>% Operario</label><input type="number" id="trab-pct-op"></div>
        <div class="form-group"><label>Costo Total $</label><input type="number" id="trab-costo-total"></div>
        <div class="form-group"><label>Margen Total $</label><input type="number" id="trab-margen-total"></div>
      </div>
      <div style="margin-top:8px">${camposExtras}</div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button class="btn" onclick="document.getElementById('modal-trabajo').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarTrabajo(${porRollo})">Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

async function guardarTrabajo(porRollo) {
  const v = id => { const el = document.getElementById(id); return el ? el.value : null; };
  const n = id => { const el = document.getElementById(id); return el && el.value ? parseFloat(el.value) : null; };

  const extras = porRollo ? {
    rollos: n('trab-rollos'), rendimiento: n('trab-rendimiento'), tipo_rollo: v('trab-tipo-rollo'),
    consumo_por_rollo: n('trab-cons-rollo'), consumo_total_lts: n('trab-cons-rollo') && n('trab-rollos') ? n('trab-cons-rollo') * n('trab-rollos') : null,
    consumo_red: n('trab-cons-red'), costo_red_hilo: n('trab-costo-red'),
    costo_por_rollo: n('trab-costo-rollo'), ganancia_por_rollo: n('trab-gan-rollo'), margen_por_rollo: n('trab-mrg-rollo')
  } : {
    consumo_por_ha: n('trab-cons-ha'), consumo_total_lts: n('trab-cons-ha') && n('trab-has') ? n('trab-cons-ha') * parseFloat(document.getElementById('trab-has').value||0) : null,
    costo_por_ha: n('trab-costo-ha'), ganancia_por_ha: n('trab-gan-ha'), margen_por_ha: n('trab-mrg-ha')
  };

  const data = {
    maquina_id: maquinaSeleccionada.id,
    fecha: v('trab-fecha'), propietario: v('trab-propietario'), establecimiento: v('trab-estab'),
    lote: v('trab-lote'), hectareas: n('trab-has'), cultivo: v('trab-cultivo'),
    tarifa_gasoil: n('trab-tarifa-gas'), total_gasoil_lts: n('trab-tot-gas'), costo_gasoil: n('trab-costo-gas'),
    total_pesos: n('trab-total-pesos'), tipo_cambio: n('trab-tc'), total_usd: n('trab-total-usd'),
    operario: v('trab-operario'), porcentaje_operario: n('trab-pct-op'),
    costo_total: n('trab-costo-total'), margen_total: n('trab-margen-total'),
    extras
  };

  if (!data.fecha) { toast('Ingresá una fecha', 'var(--rojo)'); return; }
  const r = await sb('POST', 'trabajos_agricolas', data);
  if (r) {
    toast('✅ Trabajo guardado');
    document.getElementById('modal-trabajo').remove();
    await cargarMaquinaria();
    renderContenidoFichaMaq('trabajos');
  } else toast('❌ Error al guardar', 'var(--rojo)');
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
