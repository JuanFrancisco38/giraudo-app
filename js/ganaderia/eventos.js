function toggleCamposEvento() {
  const tipo = document.getElementById('ev-tipo').value;
  const esServicio  = tipo === 'Servicio / IATF';
  const esTacto     = tipo === 'Tacto / Preñez';
  const esNacimient = tipo === 'Nacimiento';
  const esDestete   = tipo === 'Destete';
  const esSanidad   = !esServicio && !esTacto && !esNacimient && !esDestete;

  document.getElementById('ev-extra-servicio').style.display  = esServicio  ? '' : 'none';
  document.getElementById('ev-extra-tacto').style.display     = esTacto     ? '' : 'none';
  document.getElementById('ev-extra-nacimiento').style.display= esNacimient ? '' : 'none';
  document.getElementById('ev-extra-destete').style.display   = esDestete   ? '' : 'none';
  document.getElementById('ev-campo-producto').style.display  = esSanidad   ? '' : 'none';
  document.getElementById('ev-campo-dosis').style.display     = esSanidad   ? '' : 'none';

  // Auto-calcular % preñez cuando cambian los campos
  if (esTacto) {
    ['ev-prenadas','ev-vacias','ev-dudosas'].forEach(id => {
      document.getElementById(id).oninput = calcPctPrenez;
    });
  }
}

function calcPctPrenez() {
  const prenadas = parseInt(document.getElementById('ev-prenadas').value) || 0;
  const vacias   = parseInt(document.getElementById('ev-vacias').value)   || 0;
  const dudosas  = parseInt(document.getElementById('ev-dudosas').value)  || 0;
  const total    = prenadas + vacias + dudosas;
  document.getElementById('ev-pct-prenez').value = total ? (prenadas/total*100).toFixed(1)+'%' : '';
  // También actualizar ev-cant
  if (total) document.getElementById('ev-cant').value = total;
}

async function guardarEvento() {
  const tipo = document.getElementById('ev-tipo').value;

  const detalle = {
    categoria:  document.getElementById('ev-cat').value,
    producto:   document.getElementById('ev-producto').value,
    dosis:      document.getElementById('ev-dosis').value,
    observaciones: document.getElementById('ev-obs').value,
  };

  // Agregar datos específicos según tipo
  if (tipo === 'Servicio / IATF') {
    detalle.madres       = parseInt(document.getElementById('ev-madres').value) || null;
    detalle.toros        = parseInt(document.getElementById('ev-toros').value)  || null;
    detalle.serv_fin     = document.getElementById('ev-serv-fin').value || null;
    detalle.tipo_servicio= document.getElementById('ev-tipo-serv').value;
  }
  if (tipo === 'Tacto / Preñez') {
    detalle.prenadas = parseInt(document.getElementById('ev-prenadas').value) || null;
    detalle.vacias   = parseInt(document.getElementById('ev-vacias').value)   || null;
    detalle.dudosas  = parseInt(document.getElementById('ev-dudosas').value)  || null;
  }
  if (tipo === 'Nacimiento') {
    detalle.nacidos_vivos    = parseInt(document.getElementById('ev-nacidos-vivos').value)    || null;
    detalle.nacidos_muertos  = parseInt(document.getElementById('ev-nacidos-muertos').value)  || null;
    detalle.muertes_maternas = parseInt(document.getElementById('ev-muertes-maternas').value) || null;
  }
  if (tipo === 'Destete') {
    detalle.destetados        = parseInt(document.getElementById('ev-destetados').value)    || null;
    detalle.peso_promedio     = parseFloat(document.getElementById('ev-peso-destete').value) || null;
  }

  const data = {
    tipo,
    fecha:             document.getElementById('ev-fecha').value,
    campania:          document.getElementById('ev-campania').value || null,
    campo:             document.getElementById('ev-campo').value,
    lote:              document.getElementById('ev-lote').value,
    titulo:            `${tipo}: ${detalle.producto || detalle.categoria || ''}`,
    cantidad_animales: parseInt(document.getElementById('ev-cant').value) || null,
    detalle,
  };

  const r = await sb('POST', 'eventos_ganaderos', data);
  if (r) { toast('Evento registrado'); } else { toast('Error al guardar', 'var(--rojo)'); }
}

async function cargarEventos() {
  const rows = await sb('GET', 'eventos_ganaderos', '', '?order=fecha.desc');
  const tbody = document.getElementById('tabla-eventos');
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">📋</div><h3>Sin eventos</h3></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(e => `
    <tr>
      <td>${fmtFecha(e.fecha)}</td>
      <td><span class="badge badge-bordo">${e.tipo}</span></td>
      <td>${e.campania||'—'}</td>
      <td>${e.campo || '—'}</td>
      <td>${e.lote || '—'}</td>
      <td>${e.detalle?.categoria || '—'}</td>
      <td>${e.cantidad_animales || '—'}</td>
      <td>${_resumenDetalle(e)}</td>
    </tr>`).join('');
}

function _resumenDetalle(e) {
  const d = e.detalle || {};
  if (e.tipo === 'Tacto / Preñez' && d.prenadas != null)
    return `Preñ: ${d.prenadas} / Vac: ${d.vacias||0} (${d.prenadas+d.vacias+d.dudosas||0?((d.prenadas/(d.prenadas+(d.vacias||0)+(d.dudosas||0)))*100).toFixed(0)+'%':'—'})`;
  if (e.tipo === 'Servicio / IATF' && d.madres)
    return `${d.madres} madres · ${d.toros||'—'} toros · ${d.tipo_servicio||''}`;
  if (e.tipo === 'Nacimiento' && d.nacidos_vivos != null)
    return `Vivos: ${d.nacidos_vivos} / Muertos: ${d.nacidos_muertos||0}`;
  if (e.tipo === 'Destete' && d.destetados)
    return `${d.destetados} terneros${d.peso_promedio?' · '+d.peso_promedio+' kg':''}`;
  return d.producto || d.observaciones || '—';
}
