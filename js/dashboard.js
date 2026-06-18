async function cargarDashboard() {
  const [animales, hotel, eventosHoy] = await Promise.all([
    sb('GET', 'animales', '', '?activo=eq.true&propietario=eq.propio'),
    sb('GET', 'hoteleria', '', '?activo=eq.true'),
    sb('GET', 'eventos_ganaderos', '', '?order=fecha.desc&limit=5')
  ]);

  const totalAnimales = animales?.length ?? '—';
  const totalHotel = hotel?.reduce((s, h) => s + (h.cantidad || 0), 0) ?? '—';

  document.getElementById('st-animales').textContent = totalAnimales;
  document.getElementById('st-hotel').textContent = totalHotel;

  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();
  const eventosMes = await sb('GET', 'eventos_ganaderos', '', `?fecha=gte.${anioActual}-${String(mesActual).padStart(2,'0')}-01&fecha=lte.${anioActual}-${String(mesActual).padStart(2,'0')}-31`);
  document.getElementById('st-eventos').textContent = eventosMes?.length ?? '—';

  const liqGranos = await sb('GET', 'liquidaciones_granos', '', '?campania=eq.25/26');
  document.getElementById('st-liqgranos').textContent = liqGranos?.length ?? '—';

  const divEventos = document.getElementById('ultimos-eventos');
  if (eventosHoy && eventosHoy.length) {
    divEventos.innerHTML = eventosHoy.map(e =>
      `<div class="alert alert-bordo">📋 ${e.titulo || e.tipo} — ${e.campo || ''} ${e.fecha || ''}</div>`
    ).join('');
  }
}

document.addEventListener('DOMContentLoaded', cargarDashboard);
