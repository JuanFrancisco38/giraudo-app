async function guardarHoteleria() {
  const data = {
    propietario: document.getElementById('hot-dueno').value,
    fecha_ingreso: document.getElementById('hot-fecha').value,
    categoria: document.getElementById('hot-cat').value,
    cantidad: parseInt(document.getElementById('hot-cant').value) || null,
    raza: document.getElementById('hot-raza').value,
    peso_promedio: parseFloat(document.getElementById('hot-peso').value) || null,
    observaciones: document.getElementById('hot-obs').value,
    activo: true
  };
  const r = await sb('POST', 'hoteleria', data);
  if (r) { toast('✅ Guardado'); toggleForm('form-hotel'); cargarHoteleria(); }
  else toast('❌ Error', 'var(--rojo)');
}

async function cargarHoteleria() {
  const rows = await sb('GET', 'hoteleria', '', '?order=fecha_ingreso.desc');
  const tbody = document.getElementById('tabla-hotel');
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="icon">🏨</div><h3>Sin hacienda en hotelería</h3></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(h => `
    <tr>
      <td><strong>${h.propietario}</strong></td>
      <td>${h.categoria}</td>
      <td>${h.raza || '—'}</td>
      <td>${h.cantidad || '—'}</td>
      <td>${h.peso_promedio ? h.peso_promedio + ' kg' : '—'}</td>
      <td>${h.fecha_ingreso || '—'}</td>
      <td><span class="badge badge-${h.activo ? 'green' : 'gray'}">${h.activo ? 'Activo' : 'Egresado'}</span></td>
    </tr>`).join('');
}

// Carga inicial de hotelería al entrar a la sección
document.addEventListener('DOMContentLoaded', async () => {
  const existing = await sb('GET', 'hoteleria', '', '?limit=1');
  if (existing && existing.length === 0) {
    await sb('POST', 'hoteleria', {propietario:'Santiagueños',fecha_ingreso:'2026-05-06',categoria:'Vacas',cantidad:9,raza:'Santiagueña',peso_promedio:334,lote:'Corral',observaciones:'Glipondin 4 - 5cc.',activo:true});
    await sb('POST', 'hoteleria', {propietario:'Santiagueños',fecha_ingreso:'2026-05-06',categoria:'Terneros/as',cantidad:10,raza:'Santiagueño',peso_promedio:141,lote:'Corral',observaciones:'Glipondin 4 1cc + Ivomec Gold 2cc.',activo:true});
  }
});
