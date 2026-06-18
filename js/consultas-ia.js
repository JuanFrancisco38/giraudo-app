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

  const [animales, hotel, eventos, pesadas, trabajos, liqGranos, liqHac] = await Promise.all([
    sb('GET','animales','','?limit=50'),
    sb('GET','hoteleria','','?activo=eq.true'),
    sb('GET','eventos_ganaderos','','?order=fecha.desc&limit=30'),
    sb('GET','pesadas','','?order=fecha.desc&limit=20'),
    sb('GET','trabajos_agricolas','','?order=fecha.desc&limit=20'),
    sb('GET','liquidaciones_granos','','?campania=eq.25/26'),
    sb('GET','liquidaciones_hacienda','','?order=fecha.desc&limit=20')
  ]);

  const contexto = `GRUPO GIRAUDO — Pozo del Molle, Córdoba, Argentina.
Campos: Don Alfredo/Azcona (257 has ganadería, alquilado), Doña Vica (210 has agricultura), Sant-Yago (280 has agricultura).
Raza: Aberdeen Angus colorado x Limousin. Parición julio-septiembre. Destete 6 meses.
Animales propios: ${JSON.stringify(animales?.slice(0,20)||[])}
Hotelería activa: ${JSON.stringify(hotel||[])}
Eventos: ${JSON.stringify(eventos?.slice(0,15)||[])}
Pesadas: ${JSON.stringify(pesadas?.slice(0,10)||[])}
Trabajos: ${JSON.stringify(trabajos?.slice(0,10)||[])}
Liquidaciones granos 25/26: ${JSON.stringify(liqGranos||[])}
Liquidaciones hacienda: ${JSON.stringify(liqHac?.slice(0,10)||[])}`;

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
