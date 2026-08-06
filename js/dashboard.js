async function cargarDashboard() {
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();
  const ultimoDia = new Date(anioActual, mesActual, 0).getDate();
  const mesStr = String(mesActual).padStart(2,'0');

  const [animales, hotel, novedadesRecientes, novedadesMes, liqGranos] = await Promise.all([
    sb('GET', 'animales_rodeo', '', '?activo=eq.true'),
    sb('GET', 'hoteleria', '', '?activo=eq.true'),
    sb('GET', 'novedades_ganaderas', '', '?order=fecha.desc&limit=5'),
    sb('GET', 'novedades_ganaderas', '', `?fecha=gte.${anioActual}-${mesStr}-01&fecha=lte.${anioActual}-${mesStr}-${ultimoDia}`),
    sb('GET', 'liquidaciones_granos', '', '?order=fecha.desc')
  ]);

  const totalAnimales = animales?.length ?? '—';
  const totalHotel = hotel?.reduce((s, h) => s + (h.cantidad || 0), 0) ?? '—';

  document.getElementById('st-animales').textContent = totalAnimales;
  document.getElementById('st-hotel').textContent = totalHotel;
  document.getElementById('st-eventos').textContent = novedadesMes?.length ?? '—';

  // Campaña más reciente para liquidaciones
  const campActual = liqGranos?.length ? liqGranos[0].campania : '—';
  const liqCampActual = liqGranos?.filter(l => l.campania === campActual) || [];
  document.getElementById('st-liqgranos').textContent = liqCampActual.length;

  const divEventos = document.getElementById('ultimos-eventos');
  if (novedadesRecientes && novedadesRecientes.length) {
    divEventos.innerHTML = novedadesRecientes.map(e =>
      `<div class="alert alert-bordo">📋 ${e.tipo}${e.subtipo ? ' — '+e.subtipo : ''} ${fmtFecha(e.fecha)}</div>`
    ).join('');
  } else {
    divEventos.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Sin novedades aún</p><p>Cargá tu primer evento</p></div>';
  }
}

document.addEventListener('DOMContentLoaded', cargarDashboard);
