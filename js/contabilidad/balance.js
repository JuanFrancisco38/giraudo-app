async function generarBalance() {
  const mes = document.getElementById('bal-mes').value;
  const anio = document.getElementById('bal-anio').value;
  const meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('balance-content').innerHTML = '<div style="text-align:center;padding:40px;color:var(--texto-suave)">⏳ Generando balance con IA...</div>';

  const [eventos, pesadas, movimientos, trabajos, hotel, boletas, liqHac, liqGranos] = await Promise.all([
    sb('GET','eventos_ganaderos','','?order=fecha.desc&limit=50'),
    sb('GET','pesadas','','?order=fecha.desc&limit=20'),
    sb('GET','movimientos','','?order=fecha.desc&limit=50'),
    sb('GET','trabajos_agricolas','','?order=fecha.desc&limit=30'),
    sb('GET','hoteleria','','?activo=eq.true'),
    sb('GET','boletas','','?order=fecha.desc&limit=30'),
    sb('GET','liquidaciones_hacienda','','?order=fecha.desc&limit=20'),
    sb('GET','liquidaciones_granos','','?order=fecha.desc&limit=20')
  ]);

  const contexto = `Balance ${meses[mes]} ${anio} — Grupo Giraudo:
Eventos: ${JSON.stringify(eventos || [])}
Pesadas: ${JSON.stringify(pesadas || [])}
Movimientos: ${JSON.stringify(movimientos || [])}
Trabajos: ${JSON.stringify(trabajos || [])}
Hotelería: ${JSON.stringify(hotel || [])}
Boletas: ${JSON.stringify(boletas || [])}
Liquidaciones hacienda: ${JSON.stringify(liqHac || [])}
Liquidaciones granos: ${JSON.stringify(liqGranos || [])}`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        system: `Sos el asesor del Grupo Giraudo. Generá resumen ejecutivo de ${meses[mes]} ${anio} en HTML limpio con secciones: Resumen ejecutivo, Ganadería, Agricultura, Contabilidad, Alertas próximo mes. Usá <h3> para títulos, <p> para texto, <strong> para destacados. Color principal: bordo #5c0a1a.`,
        messages: [{ role: 'user', content: contexto }]
      })
    });
    const json = await res.json();
    const html = json.content?.[0]?.text || 'No se pudo generar.';
    document.getElementById('balance-content').innerHTML = `
      <div style="line-height:1.8;font-size:14px">${html}</div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--gris-borde);display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="window.print()">🖨️ Imprimir</button>
      </div>`;
  } catch(e) {
    document.getElementById('balance-content').innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Error de conexión</h3></div>';
  }
}
