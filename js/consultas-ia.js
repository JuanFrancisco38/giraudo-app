function preguntaRapida(txt) {
  document.getElementById('chat-input').value = txt;
  enviarConsulta();
}

async function enviarConsulta() {
  const input = document.getElementById('chat-input');
  const pregunta = input.value.trim();
  if (!pregunta) return;
  input.value = '';
  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML += `<div class="msg msg-user">${pregunta}</div><div class="msg msg-ai" id="msg-loading">⏳ Consultando...</div>`;
  msgs.scrollTop = msgs.scrollHeight;

  const [rodeos, animales, hotel, novedades, pesadas, trabajos, liqGranos, liqHac, maquinaria, mantenimiento, boletas, cheques] = await Promise.all([
    sb('GET','rodeos','','?activo=eq.true&order=nombre.asc'),
    sb('GET','animales_rodeo','','?activo=eq.true&order=categoria.asc'),
    sb('GET','hoteleria','','?activo=eq.true'),
    sb('GET','novedades_ganaderas','','?order=fecha.desc&limit=40'),
    sb('GET','pesadas_animal','','?order=fecha.desc&limit=30'),
    sb('GET','trabajos_agricolas','','?order=fecha.desc&limit=20'),
    sb('GET','liquidaciones_granos','','?order=fecha.desc&limit=30'),
    sb('GET','liquidaciones_hacienda','','?order=fecha.desc&limit=20'),
    sb('GET','maquinaria','','?order=nombre.asc'),
    sb('GET','mantenimiento','','?order=fecha.desc&limit=20'),
    sb('GET','boletas','','?order=fecha.desc&limit=20'),
    sb('GET','cheques_recibidos','','?order=fecha.desc&limit=20'),
  ]);

  // Armar resumen de stock por rodeo
  const stockResumen = (rodeos||[]).map(r => {
    const anim = (animales||[]).filter(a => a.rodeo_id === r.id);
    const cats = {};
    anim.forEach(a => { cats[a.categoria] = (cats[a.categoria]||0)+1; });
    return { rodeo: r.nombre, categoria: r.categoria, ubicacion: r.ubicacion, total: anim.length, desglose: cats };
  });

  const contexto = `GRUPO GIRAUDO — Pozo del Molle, Córdoba, Argentina.
Campos: Don Alfredo/Azcona (257 has ganadería, alquilado), Doña Vica (210 has agricultura), Sant-Yago (280 has agricultura).
Raza: Aberdeen Angus colorado x Limousin. Parición julio-septiembre. Destete 6 meses.
STOCK GANADERO ACTUAL (rodeos activos): ${JSON.stringify(stockResumen)}
Hotelería activa (animales de terceros): ${JSON.stringify(hotel||[])}
Novedades ganaderas recientes: ${JSON.stringify((novedades||[]).slice(0,25))}
Pesadas recientes: ${JSON.stringify((pesadas||[]).slice(0,20))}
Trabajos agrícolas recientes: ${JSON.stringify((trabajos||[]).slice(0,10))}
Liquidaciones granos recientes: ${JSON.stringify((liqGranos||[]).slice(0,15))}
Liquidaciones hacienda recientes: ${JSON.stringify((liqHac||[]).slice(0,10))}
Facturas recibidas recientes: ${JSON.stringify((boletas||[]).slice(0,10))}
Cheques recibidos recientes: ${JSON.stringify((cheques||[]).slice(0,10))}
Maquinaria (inventario): ${JSON.stringify(maquinaria||[])}
Mantenimientos: ${JSON.stringify((mantenimiento||[]).slice(0,10))}`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: 'Sos el asistente inteligente del Grupo Giraudo, empresa agropecuaria de Córdoba, Argentina. Respondé en español, claro y directo. Usá los datos disponibles. Diferenciá hacienda propia de hotelería. Sé conciso pero completo.',
        messages: [{ role: 'user', content: `${contexto}\n\nConsulta: ${pregunta}` }]
      })
    });
    const json = await res.json();
    const respuesta = json.content?.[0]?.text || 'No pude procesar.';
    document.getElementById('msg-loading').outerHTML = `<div class="msg msg-ai">${respuesta.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>`;
  } catch(e) {
    document.getElementById('msg-loading').outerHTML = `<div class="msg msg-ai">❌ Error de conexión.</div>`;
  }
  msgs.scrollTop = msgs.scrollHeight;
}
