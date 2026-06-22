const CHEQUE_CFG = {
  recibido: { pref: 'chr', tabId: 'tab-chr', label: 'cheque recibido', contraLabel: 'librador' },
  emitido:  { pref: 'che', tabId: 'tab-che', label: 'cheque emitido', contraLabel: 'beneficiario' }
};

const chequeState = {
  recibido: { todas: [], pagina: 1, archivo: null, mesFiltro: null },
  emitido:  { todas: [], pagina: 1, archivo: null, mesFiltro: null }
};

function nombreMesCheque(ym) {
  const [y, m] = ym.split('-');
  const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${nombres[parseInt(m) - 1]} ${y}`;
}

function filtrarMesCheque(tipo, ym) {
  const st = chequeState[tipo];
  st.mesFiltro = (st.mesFiltro === ym) ? null : ym;
  st.pagina = 1;
  renderCheques(tipo);
}

async function procesarChequeDoc(input, tipo) {
  const file = input.files[0];
  if (!file) return;
  const cfg = CHEQUE_CFG[tipo];
  chequeState[tipo].archivo = file;
  const status = document.getElementById(`${cfg.pref}-doc-status`);
  status.textContent = `📷 Leyendo ${file.name}...`;
  try {
    const datos = await extraerDocIA(file,
      `Sos un asistente contable argentino. Analizá esta FOTO o PDF de un CHEQUE bancario y extraé los datos que figuren impresos o escritos en él. Devolvé SOLO este JSON válido sin backticks ni texto adicional:
{"numero":"string (N° de cheque, generalmente arriba a la derecha)","banco":"string (nombre del banco emisor)","fecha_emision":"DD/MM/YYYY (fecha que figura en el cheque)","monto":0}
El monto en números sin símbolos ni puntos de miles (tomalo del recuadro numérico, no del texto escrito a mano si difieren, salvo que el numérico no se entienda). Si algún dato no se puede leer con claridad, poné "" o 0. NO inventes datos que no estén en la imagen.`,
      'Extraé los datos visibles de este cheque: número, banco, fecha y monto.');

    const g = id => document.getElementById(`${cfg.pref}-${id}`);
    if (datos.numero) g('num').value = datos.numero;
    if (datos.banco) g('banco').value = datos.banco;
    if (datos.fecha_emision) g('fecha').value = parseFechaIA(datos.fecha_emision);
    if (datos.monto) g('monto').value = datos.monto;

    status.textContent = `✅ ${file.name} leída — completá ${tipo === 'recibido' ? 'Librador' : 'Beneficiario'} y Detalle, y revisá los demás datos`;
    toast('✅ Cheque leído — revisá y completá los datos faltantes');
  } catch(e) {
    console.error(e);
    status.textContent = '❌ ' + e.message;
    toast('❌ Error al leer la imagen', 'var(--rojo)');
  }
}

async function guardarCheque(tipo) {
  const cfg = CHEQUE_CFG[tipo];
  const g = id => document.getElementById(`${cfg.pref}-${id}`);
  const fecha = g('fecha').value;
  const monto = parseFloat(g('monto').value) || 0;
  if (!fecha || !monto) { toast('Completá al menos fecha y monto', 'var(--tierra)'); return; }

  const numero = g('num').value;
  if (numero) {
    const todos = await sb('GET', 'cheques', '', `?tipo=eq.${tipo}&numero=eq.${encodeURIComponent(numero)}`);
    if (todos && todos.length && !confirm(`⚠️ Ya existe un ${cfg.label} con el N° "${numero}". ¿Querés guardarlo igual?`)) {
      toast('Guardado cancelado — posible duplicado', 'var(--tierra)');
      return;
    }
  }

  const data = {
    tipo,
    fecha_emision: fecha,
    numero,
    banco: g('banco').value,
    contraparte: g('libr').value,
    cuit_contraparte: g('cuit').value,
    detalle: g('detalle').value,
    firma: g('firma').value,
    fecha_cobro: g('fcobro').value || null,
    monto,
    estado: g('estado').value,
    registro: g('registro').value,
    observaciones: g('obs').value
  };
  if (tipo === 'recibido') {
    data.cuenta = g('cuenta').value;
    data.factura_origen = g('fac-origen').value;
    data.destino = g('destino').value;
    data.factura_destino = g('fac-destino').value;
    data.rubro_destino = g('rubro').value;
  }

  const r = await sb('POST', 'cheques', data);
  if (r) {
    toast(`✅ ${cfg.label.charAt(0).toUpperCase() + cfg.label.slice(1)} registrado`);
    toggleForm(`form-${cfg.pref}`);
    ['num','banco','libr','cuit','detalle','fcobro','monto','obs'].forEach(id => g(id).value = '');
    if (tipo === 'recibido') { ['cuenta','fac-origen','destino','fac-destino','rubro'].forEach(id => g(id).value = ''); }
    g('estado').value = 'cartera';
    g('registro').value = 'blanco';
    g('archivo').value = '';
    document.getElementById(`${cfg.pref}-doc-status`).textContent = '';
    chequeState[tipo].archivo = null;
    cargarCheques(tipo);
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

function filtrarChequeReset(tipo) { chequeState[tipo].pagina = 1; renderCheques(tipo); }
function irPaginaCheque_chr(p) { chequeState.recibido.pagina = p; renderCheques('recibido'); window.scrollTo({ top: document.getElementById('section-cheques').offsetTop, behavior: 'smooth' }); }
function irPaginaCheque_che(p) { chequeState.emitido.pagina = p; renderCheques('emitido'); window.scrollTo({ top: document.getElementById('section-cheques').offsetTop, behavior: 'smooth' }); }

async function cargarCheques(tipo) {
  const rows = await sb('GET', 'cheques', '', `?tipo=eq.${tipo}&order=fecha_emision.desc`);
  chequeState[tipo].todas = rows || [];
  renderCheques(tipo);
}

async function cargarTodosCheques() {
  await Promise.all([cargarCheques('recibido'), cargarCheques('emitido')]);
}

const ESTADO_BADGE = { cartera: 'badge-bordo', efectivizado: 'badge-green', rechazado: 'badge-red' };

function renderCheques(tipo) {
  const cfg = CHEQUE_CFG[tipo];
  const st = chequeState[tipo];
  const tbody = document.getElementById(`tabla-${cfg.pref}`);
  if (!tbody) return;

  const fBusca = (document.getElementById(`${cfg.pref}-filtro-busca`)?.value || '').trim().toLowerCase();
  const fEstado = document.getElementById(`${cfg.pref}-filtro-estado`)?.value || '';
  const rows = st.todas.filter(c => {
    if (fEstado && c.estado !== fEstado) return false;
    if (fBusca && !`${c.contraparte || ''} ${c.numero || ''} ${c.detalle || ''} ${c.destino || ''} ${c.factura_origen || ''} ${c.factura_destino || ''}`.toLowerCase().includes(fBusca)) return false;
    if (st.mesFiltro && (c.fecha_cobro || '').slice(0, 7) !== st.mesFiltro) return false;
    return true;
  });

  // Tarjetas resumen (sobre TODOS, no solo filtrados, para tener panorama real)
  const acc = { cartera: { tot: 0, cant: 0 }, efectivizado: { tot: 0, cant: 0 }, rechazado: { tot: 0, cant: 0 } };
  st.todas.forEach(c => {
    const e = acc[c.estado] || acc.cartera;
    e.tot += c.monto || 0;
    e.cant++;
  });
  ['cartera','efectivizado','rechazado'].forEach(e => {
    const elTot = document.getElementById(`${cfg.pref}-tot-${e}`);
    const elCant = document.getElementById(`${cfg.pref}-cant-${e}`);
    if (elTot) elTot.textContent = fmtMonto(acc[e].tot, 'ARS');
    if (elCant) elCant.textContent = acc[e].cant + ' cheque' + (acc[e].cant !== 1 ? 's' : '');
  });

  // Proyección por mes (cheques en cartera agrupados por fecha de cobro/pago) — muestra todos los meses del año en curso, aunque estén en $0
  const contProy = document.getElementById(`${cfg.pref}-proyeccion`);
  if (contProy) {
    const porMes = {};
    st.todas.filter(c => c.estado === 'cartera' && c.fecha_cobro).forEach(c => {
      const mes = c.fecha_cobro.slice(0, 7); // YYYY-MM
      if (!porMes[mes]) porMes[mes] = { total: 0, cant: 0 };
      porMes[mes].total += c.monto || 0;
      porMes[mes].cant++;
    });
    const anioActual = new Date().getFullYear();
    const meses = new Set();
    for (let m = 1; m <= 12; m++) meses.add(`${anioActual}-${String(m).padStart(2,'0')}`);
    Object.keys(porMes).forEach(ym => meses.add(ym));
    const nombreMes = nombreMesCheque;
    contProy.innerHTML = [...meses].sort().map(ym => {
      const v = porMes[ym] || { total: 0, cant: 0 };
      const tieneMonto = v.total > 0;
      const activo = st.mesFiltro === ym;
      const borde = activo ? 'var(--bordo)' : (tieneMonto ? 'var(--bordo-suave)' : 'var(--gris-borde)');
      return `<div onclick="filtrarMesCheque('${tipo}','${ym}')" style="cursor:pointer;background:${activo ? 'var(--bordo-claro)' : (tieneMonto ? '#fff' : '#fafafa')};border:${activo ? '2px' : '1px'} solid ${borde};border-radius:8px;padding:10px;text-align:center;min-height:78px;display:flex;flex-direction:column;justify-content:center;gap:2px">
        <div style="font-size:11px;color:var(--texto-suave);font-weight:600">${nombreMes(ym)}</div>
        <div style="font-size:15px;font-weight:700;color:${tieneMonto ? 'var(--bordo)' : 'var(--texto-suave)'}">${fmtMonto(v.total, 'ARS')}</div>
        <div style="font-size:11px;color:var(--texto-suave)">${v.cant} cheque${v.cant !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('');
  }

  const indicador = document.getElementById(`${cfg.pref}-mes-indicador`);
  if (indicador) {
    if (st.mesFiltro) {
      indicador.style.display = '';
      indicador.innerHTML = `📌 Mostrando cheques de <strong>${nombreMesCheque(st.mesFiltro)}</strong> — <a href="#" onclick="filtrarMesCheque('${tipo}','${st.mesFiltro}');return false" style="color:var(--bordo);text-decoration:underline">ver todos</a>`;
    } else {
      indicador.style.display = 'none';
    }
  }

  const colspan = tipo === 'recibido' ? 15 : 10;
  if (!rows.length) {
    const hayFiltro = fBusca || fEstado || st.mesFiltro;
    tbody.innerHTML = `<tr><td colspan="${colspan}"><div class="empty-state"><div class="icon">💳</div><h3>${hayFiltro ? 'Sin resultados para el filtro' : `Sin ${cfg.label}s`}</h3></div></td></tr>`;
    document.getElementById(`${cfg.pref}-paginador`).innerHTML = '';
    return;
  }

  const totalPag = Math.ceil(rows.length / FILAS_POR_PAGINA) || 1;
  if (st.pagina > totalPag) st.pagina = totalPag;
  const pagina = rows.slice((st.pagina - 1) * FILAS_POR_PAGINA, st.pagina * FILAS_POR_PAGINA);
  document.getElementById(`${cfg.pref}-paginador`).innerHTML = htmlPaginador(st.pagina, rows.length, tipo === 'recibido' ? 'irPaginaCheque_chr' : 'irPaginaCheque_che');

  const estadoLabel = tipo === 'recibido'
    ? { cartera: 'En cartera', efectivizado: 'Cobrado', rechazado: 'Rechazado' }
    : { cartera: 'En cartera', efectivizado: 'Pagado', rechazado: 'Rechazado' };

  tbody.innerHTML = pagina.map(c => {
    const badge = `<button class="badge ${ESTADO_BADGE[c.estado] || 'badge-bordo'}" style="border:none;cursor:pointer" onclick="cicloEstadoCheque('${c.id}','${tipo}', this)">${estadoLabel[c.estado] || c.estado}</button>`;
    const registroBadge = `<button class="badge ${c.registro === 'negro' ? 'badge-gray' : 'badge-blue'}" style="border:none;cursor:pointer" onclick="toggleRegistroCheque('${c.id}','${tipo}', this)">${c.registro === 'negro' ? 'Negro' : 'Blanco'}</button>`;
    const firmaCorta = c.firma === 'Francisco J. Giraudo' ? 'FJG' : (c.firma === 'Giraudo SH' ? 'SH' : (c.firma || '—'));
    const filas = tipo === 'recibido' ? `
      <td>${fmtFecha(c.fecha_emision)}</td>
      <td><strong>${c.contraparte || '—'}</strong></td>
      <td style="font-size:12px">${c.detalle || '—'}</td>
      <td style="font-size:11px">${c.factura_origen || '—'}</td>
      <td>${registroBadge}</td>
      <td>${c.banco || '—'}</td>
      <td style="font-size:11px">${c.cuenta || '—'}</td>
      <td style="font-size:11px">${c.numero || '—'}</td>
      <td style="font-size:11px;color:var(--texto-suave)">${fmtFecha(c.fecha_cobro)}</td>
      <td><strong>${fmtMonto(c.monto, 'ARS')}</strong></td>
      <td>${badge}</td>
      <td style="font-size:12px">${c.destino || '—'}</td>
      <td style="font-size:11px">${c.factura_destino || '—'}</td>
      <td><span class="badge badge-gray" style="font-size:10px">${c.rubro_destino || '—'}</span></td>
    ` : `
      <td>${fmtFecha(c.fecha_emision)}</td>
      <td style="font-size:11px">${c.numero || '—'}</td>
      <td>${c.banco || '—'}</td>
      <td><strong>${c.contraparte || '—'}</strong></td>
      <td style="font-size:12px">${c.detalle || '—'}</td>
      <td><span class="badge badge-bordo" style="font-size:10px">${firmaCorta}</span></td>
      <td style="font-size:11px;color:var(--texto-suave)">${fmtFecha(c.fecha_cobro)}</td>
      <td><strong>${fmtMonto(c.monto, 'ARS')}</strong></td>
      <td>${badge}</td>
      <td>${registroBadge}</td>
    `;
    return `<tr>${filas}<td><button class="btn btn-secondary" style="padding:4px 8px;font-size:12px" onclick="borrarCheque('${c.id}','${tipo}')">🗑️</button></td></tr>`;
  }).join('');
}

async function toggleRegistroCheque(id, tipo, btn) {
  const st = chequeState[tipo];
  const cheque = st.todas.find(c => c.id === id);
  if (!cheque) return;
  const nuevo = cheque.registro === 'negro' ? 'blanco' : 'negro';
  const r = await sb('PATCH', 'cheques', { registro: nuevo }, `?id=eq.${id}`);
  if (r !== null) {
    cheque.registro = nuevo;
    renderCheques(tipo);
    toast('✅ Actualizado');
  } else toast('❌ No se pudo cambiar', 'var(--rojo)');
}

async function cicloEstadoCheque(id, tipo, btn) {
  const orden = ['cartera', 'efectivizado', 'rechazado'];
  const st = chequeState[tipo];
  const cheque = st.todas.find(c => c.id === id);
  if (!cheque) return;
  const nuevo = orden[(orden.indexOf(cheque.estado) + 1) % orden.length];
  const r = await sb('PATCH', 'cheques', { estado: nuevo }, `?id=eq.${id}`);
  if (r !== null) {
    cheque.estado = nuevo;
    renderCheques(tipo);
    toast('✅ Estado actualizado');
  } else toast('❌ No se pudo cambiar', 'var(--rojo)');
}

async function borrarCheque(id, tipo) {
  if (!confirm('¿Borrar este cheque?')) return;
  await sb('DELETE', 'cheques', '', `?id=eq.${id}`);
  toast('🗑️ Cheque borrado');
  cargarCheques(tipo);
}
