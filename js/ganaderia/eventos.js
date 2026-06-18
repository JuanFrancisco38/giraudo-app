async function guardarEvento() {
  const data = {
    tipo: document.getElementById('ev-tipo').value,
    fecha: document.getElementById('ev-fecha').value,
    campo: document.getElementById('ev-campo').value,
    lote: document.getElementById('ev-lote').value,
    titulo: `${document.getElementById('ev-tipo').value}: ${document.getElementById('ev-producto').value || ''}`,
    cantidad_animales: parseInt(document.getElementById('ev-cant').value) || null,
    detalle: {
      categoria: document.getElementById('ev-cat').value,
      producto: document.getElementById('ev-producto').value,
      dosis: document.getElementById('ev-dosis').value,
      observaciones: document.getElementById('ev-obs').value
    }
  };
  const r = await sb('POST', 'eventos_ganaderos', data);
  if (r) toast('✅ Evento registrado'); else toast('❌ Error', 'var(--rojo)');
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
      <td>${e.fecha || '—'}</td>
      <td><span class="badge badge-bordo">${e.tipo}</span></td>
      <td>${e.campo || '—'}</td>
      <td>${e.lote || '—'}</td>
      <td>${e.detalle?.categoria || '—'}</td>
      <td>${e.cantidad_animales || '—'}</td>
      <td>${e.detalle?.producto || '—'}</td>
      <td>${e.detalle?.dosis || '—'}</td>
    </tr>`).join('');
}
