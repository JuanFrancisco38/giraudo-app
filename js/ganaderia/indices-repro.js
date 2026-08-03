async function cargarIndicesRepro() {
  const cont = document.getElementById('repro-contenido');
  if (!cont) return;
  cont.innerHTML = '<div style="text-align:center;padding:40px;color:var(--texto-suave)">Cargando...</div>';

  // Traer eventos reproductivos
  const eventos = await sb('GET', 'eventos_ganaderos', '',
    '?tipo=in.(Servicio / IATF,Tacto / Preñez,Nacimiento,Destete)&order=fecha.desc') || [];

  // Agrupar por campaña + campo + lote
  const grupos = {};
  eventos.forEach(ev => {
    const key = `${ev.campania||'Sin campaña'}||${ev.campo||''}||${ev.lote||''}`;
    if (!grupos[key]) grupos[key] = { campania: ev.campania||'Sin campaña', campo: ev.campo||'—', lote: ev.lote||'—', eventos: [] };
    grupos[key].eventos.push(ev);
  });

  // Convertir a filas con índices calculados
  const rows = Object.values(grupos).map(g => {
    const evServicio = g.eventos.find(e => e.tipo === 'Servicio / IATF');
    const evTacto    = g.eventos.find(e => e.tipo === 'Tacto / Preñez');
    const evNac      = g.eventos.find(e => e.tipo === 'Nacimiento');
    const evDest     = g.eventos.find(e => e.tipo === 'Destete');
    return {
      campania:        g.campania,
      campo:           g.campo,
      nombre_lote:     g.lote,
      madres_servicio: evServicio?.detalle?.madres || evServicio?.cantidad_animales || null,
      toros:           evServicio?.detalle?.toros  || null,
      preñadas:        evTacto?.detalle?.prenadas  || null,
      vacias:          evTacto?.detalle?.vacias    || null,
      nacidos_vivos:   evNac?.detalle?.nacidos_vivos || evNac?.cantidad_animales || null,
      nacidos_muertos: evNac?.detalle?.nacidos_muertos || null,
      destetados:      evDest?.detalle?.destetados || evDest?.cantidad_animales || null,
      peso_promedio_destete: evDest?.detalle?.peso_promedio || null,
      _manual: false,
    };
  });

  // También agregar los rodeos cargados manualmente
  const manuales = await sb('GET', 'rodeos', '', '?order=campania.desc,campo.asc') || [];
  manuales.forEach(r => { r._manual = true; rows.push(r); });

  // Poblar filtros
  const campanias = [...new Set(rows.map(r => r.campania).filter(Boolean))].sort().reverse();
  const campos    = [...new Set(rows.map(r => r.campo).filter(Boolean))].sort();
  const selCamp   = document.getElementById('repro-filtro-campania');
  const selCampo  = document.getElementById('repro-filtro-campo');
  const curCamp   = selCamp.value;
  const curCampo  = selCampo.value;
  selCamp.innerHTML  = '<option value="">Todas las campañas</option>' + campanias.map(c=>`<option value="${c}" ${c===curCamp?'selected':''}>${c}</option>`).join('');
  selCampo.innerHTML = '<option value="">Todos los campos</option>'   + campos.map(c=>`<option value="${c}" ${c===curCampo?'selected':''}>${c}</option>`).join('');

  // Filtrar
  let filtrados = rows;
  if (curCamp)  filtrados = filtrados.filter(r => r.campania === curCamp);
  if (curCampo) filtrados = filtrados.filter(r => r.campo === curCampo);

  if (!filtrados.length) {
    cont.innerHTML = '<div style="text-align:center;padding:48px;color:var(--texto-suave)">No hay rodeos cargados.<br>Usá <strong>+ Nuevo rodeo</strong> para agregar uno.</div>';
    return;
  }

  // Totales para resumen general
  const tot = filtrados.reduce((a,r) => ({
    madres:   a.madres   + (r.madres_servicio||0),
    prenadas: a.prenadas + (r.preñadas||0),
    vivos:    a.vivos    + (r.nacidos_vivos||0),
    destet:   a.destet   + (r.destetados||0),
  }), { madres:0, prenadas:0, vivos:0, destet:0 });

  const pPrenez   = tot.madres   ? (tot.prenadas/tot.madres*100).toFixed(1)   : '—';
  const pParicion = tot.prenadas ? (tot.vivos/tot.prenadas*100).toFixed(1)    : '—';
  const pDestete  = tot.madres   ? (tot.destet/tot.madres*100).toFixed(1)     : '—';

  const resumen = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
    ${_statRepro('Madres en servicio', tot.madres, '#1a3a5c', '🐄')}
    ${_statRepro('% Preñez', pPrenez+'%', '#1a5f8b', '🔬')}
    ${_statRepro('% Parición', pParicion+'%', '#27ae60', '🐄')}
    ${_statRepro('% Destete', pDestete+'%', '#d4a017', '🐂')}
  </div>`;

  // Tabla de rodeos
  const filas = filtrados.map(r => {
    const iPrenez   = r.madres_servicio && r.preñadas ? (r.preñadas/r.madres_servicio*100).toFixed(1) : '—';
    const iParicion = r.preñadas && r.nacidos_vivos   ? (r.nacidos_vivos/r.preñadas*100).toFixed(1)   : '—';
    const iDestete  = r.madres_servicio && r.destetados  ? (r.destetados/r.madres_servicio*100).toFixed(1)    : '—';
    return `<tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:10px 12px;font-weight:600">${r.campania||'—'}</td>
      <td style="padding:10px 12px">${r.campo||'—'}</td>
      <td style="padding:10px 12px">${r.nombre_lote||'—'}</td>
      <td style="padding:10px 12px;text-align:center">${r.madres_servicio||'—'}</td>
      <td style="padding:10px 12px;text-align:center">${r.preñadas??'—'} / ${r.vacias??'—'}</td>
      <td style="padding:10px 12px;text-align:center;font-weight:700;color:${_colorIndice(iPrenez)}">${iPrenez}${iPrenez!=='—'?'%':''}</td>
      <td style="padding:10px 12px;text-align:center">${r.nacidos_vivos??'—'}</td>
      <td style="padding:10px 12px;text-align:center;font-weight:700;color:${_colorIndice(iParicion)}">${iParicion}${iParicion!=='—'?'%':''}</td>
      <td style="padding:10px 12px;text-align:center">${r.destetados??'—'}</td>
      <td style="padding:10px 12px;text-align:center;font-weight:700;color:${_colorIndice(iDestete)}">${iDestete}${iDestete!=='—'?'%':''}</td>
      ${r.peso_promedio_destete?`<td style="padding:10px 12px;text-align:center">${r.peso_promedio_destete} kg</td>`:'<td style="padding:10px 12px;text-align:center;color:#bbb">—</td>'}
      <td style="padding:10px 12px;text-align:right">
        <button class="btn btn-secondary" style="font-size:11px;padding:3px 8px" onclick="abrirModalRodeoRepro('${r.id}')">✏</button>
        <button class="btn btn-secondary" style="font-size:11px;padding:3px 8px;color:#c0392b" onclick="eliminarRodeoRepro('${r.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('');

  cont.innerHTML = resumen + `<div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:900px">
      <thead>
        <tr style="background:#f4f4f2;border-bottom:2px solid #e0e0dc;text-align:center">
          <th style="padding:10px 12px;text-align:left">Campaña</th>
          <th style="padding:10px 12px;text-align:left">Campo</th>
          <th style="padding:10px 12px;text-align:left">Lote/Grupo</th>
          <th style="padding:10px 12px">Madres</th>
          <th style="padding:10px 12px">Preñ. / Vacías</th>
          <th style="padding:10px 12px;color:#1a5f8b">% Preñez</th>
          <th style="padding:10px 12px">Nac. vivos</th>
          <th style="padding:10px 12px;color:#27ae60">% Parición</th>
          <th style="padding:10px 12px">Destetados</th>
          <th style="padding:10px 12px;color:#d4a017">% Destete</th>
          <th style="padding:10px 12px">Peso dest.</th>
          <th style="padding:10px 12px"></th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  </div>`;
}

function _statRepro(label, valor, color, icon) {
  return `<div style="background:#fff;border:1px solid #e0e0dc;border-radius:10px;padding:14px 18px;min-width:130px;flex:1">
    <div style="font-size:11px;font-weight:600;color:var(--texto-suave);text-transform:uppercase;margin-bottom:4px">${icon} ${label}</div>
    <div style="font-size:24px;font-weight:800;color:${color}">${valor}</div>
  </div>`;
}

function _colorIndice(v) {
  if (v === '—') return '#bbb';
  const n = parseFloat(v);
  if (n >= 85) return '#27ae60';
  if (n >= 70) return '#d4a017';
  return '#c0392b';
}

// ── MODAL ────────────────────────────────────────────────────

function _rrClear() {
  ['rr-id','rr-campania','rr-campo','rr-lote','rr-madres','rr-toros','rr-serv-inicio','rr-serv-fin',
   'rr-prenadas','rr-vacias','rr-dudosas','rr-nacidos-vivos','rr-nacidos-muertos','rr-muertes-maternas',
   'rr-destetados','rr-peso-destete','rr-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('rr-resumen').style.display = 'none';
}

async function abrirModalRodeoRepro(id) {
  _rrClear();
  document.getElementById('modal-rodeo-repro').style.display = 'flex';
  document.getElementById('modal-rodeo-repro-titulo').textContent = '📋 Nuevo rodeo';
  if (id) {
    const rows = await sb('GET', 'rodeos', '', `?id=eq.${id}`) || [];
    const r = rows[0]; if (!r) return;
    document.getElementById('modal-rodeo-repro-titulo').textContent = '✏ Editar rodeo';
    document.getElementById('rr-id').value              = r.id;
    document.getElementById('rr-campania').value        = r.campania||'';
    document.getElementById('rr-campo').value           = r.campo||'';
    document.getElementById('rr-lote').value            = r.nombre_lote||'';
    document.getElementById('rr-madres').value          = r.madres_servicio||'';
    document.getElementById('rr-toros').value           = r.toros||'';
    document.getElementById('rr-serv-inicio').value     = r.fecha_servicio_inicio||'';
    document.getElementById('rr-serv-fin').value        = r.fecha_servicio_fin||'';
    document.getElementById('rr-prenadas').value        = r.preñadas??'';
    document.getElementById('rr-vacias').value          = r.vacias??'';
    document.getElementById('rr-dudosas').value         = r.dudosas??'';
    document.getElementById('rr-nacidos-vivos').value   = r.nacidos_vivos??'';
    document.getElementById('rr-nacidos-muertos').value = r.nacidos_muertos??'';
    document.getElementById('rr-muertes-maternas').value= r.muertes_maternas??'';
    document.getElementById('rr-destetados').value      = r.destetados??'';
    document.getElementById('rr-peso-destete').value    = r.peso_promedio_destete||'';
    document.getElementById('rr-obs').value             = r.observaciones||'';
    calcIndicesRepro();
  }
}

function cerrarModalRodeoRepro() {
  document.getElementById('modal-rodeo-repro').style.display = 'none';
}

function calcIndicesRepro() {
  const madres   = parseInt(document.getElementById('rr-madres').value)       || 0;
  const prenadas = parseInt(document.getElementById('rr-prenadas').value)      || 0;
  const vivos    = parseInt(document.getElementById('rr-nacidos-vivos').value) || 0;
  const destet   = parseInt(document.getElementById('rr-destetados').value)    || 0;
  const res      = document.getElementById('rr-resumen');
  if (!madres) { res.style.display = 'none'; return; }

  const pPrenez   = prenadas ? (prenadas/madres*100).toFixed(1)   : '—';
  const pParicion = (prenadas && vivos) ? (vivos/prenadas*100).toFixed(1) : '—';
  const pDestete  = destet   ? (destet/madres*100).toFixed(1)     : '—';

  res.style.display = 'flex';
  res.innerHTML = [
    ['% Preñez',   pPrenez,   '#1a5f8b'],
    ['% Parición', pParicion, '#27ae60'],
    ['% Destete',  pDestete,  '#d4a017'],
  ].map(([l,v,c]) => `<div style="flex:1;text-align:center">
    <div style="font-size:10px;color:#888;font-weight:600">${l}</div>
    <div style="font-size:22px;font-weight:800;color:${c}">${v}${v!=='—'?'%':''}</div>
  </div>`).join('');
}

async function guardarRodeoRepro() {
  const campania = document.getElementById('rr-campania').value.trim();
  if (!campania) { toast('Completá la campaña'); return; }

  const data = {
    campania,
    campo:                 document.getElementById('rr-campo').value.trim()||null,
    nombre_lote:           document.getElementById('rr-lote').value.trim()||null,
    madres_servicio:       parseInt(document.getElementById('rr-madres').value)||null,
    toros:                 parseInt(document.getElementById('rr-toros').value)||null,
    fecha_servicio_inicio: document.getElementById('rr-serv-inicio').value||null,
    fecha_servicio_fin:    document.getElementById('rr-serv-fin').value||null,
    'preñadas':       parseInt(document.getElementById('rr-prenadas').value)??null,
    vacias:                parseInt(document.getElementById('rr-vacias').value)??null,
    dudosas:               parseInt(document.getElementById('rr-dudosas').value)??null,
    nacidos_vivos:         parseInt(document.getElementById('rr-nacidos-vivos').value)??null,
    nacidos_muertos:       parseInt(document.getElementById('rr-nacidos-muertos').value)??null,
    muertes_maternas:      parseInt(document.getElementById('rr-muertes-maternas').value)??null,
    destetados:            parseInt(document.getElementById('rr-destetados').value)??null,
    peso_promedio_destete: parseFloat(document.getElementById('rr-peso-destete').value)||null,
    observaciones:         document.getElementById('rr-obs').value.trim()||null,
  };

  const id = document.getElementById('rr-id').value;
  const ok = id
    ? await sb('PATCH', 'rodeos', data, `?id=eq.${id}`)
    : await sb('POST',  'rodeos', data);

  if (!ok) { toast('Error al guardar'); return; }
  toast(id ? 'Rodeo actualizado' : 'Rodeo guardado');
  cerrarModalRodeoRepro();
  cargarIndicesRepro();
}

async function eliminarRodeoRepro(id) {
  if (!confirm('¿Eliminar este rodeo?')) return;
  await sb('DELETE', 'rodeos', null, `?id=eq.${id}`);
  toast('Eliminado');
  cargarIndicesRepro();
}
