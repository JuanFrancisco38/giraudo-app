function buildImportSystem(campo, fecha) {
  return `Sos el asistente del Grupo Giraudo, empresa agropecuaria de Córdoba, Argentina. Analizá el contenido y extraé TODOS los datos. Devolvé SOLO JSON válido sin backticks:
{"eventos":[{"tipo":"Vacunación|Desparasitación|Tratamiento|Destete|Nacimiento|Mortandad|Caravana electrónica|Tacto / Preñez|Servicio / IATF|Otro","titulo":"string","fecha":"${fecha||new Date().toISOString().split('T')[0]}","campo":"${campo}","lote":"string","cantidad_animales":null,"detalle":{"producto":"","dosis":"","observaciones":""}}],
"pesadas":[{"fecha":"string","campo":"${campo}","lote":"string","cantidad_animales":null,"peso_promedio":null,"observaciones":""}],
"trabajos":[{"tipo":"Siembra|Pulverización|Fertilización|Cosecha|Henificación|Enrollado|Labranza|Otro","fecha":"string","campo":"${campo}","lote":"string","hectareas":null,"cultivo":"string","contratista":"string","descripcion":"string"}],
"mantenimiento":[{"fecha":"string","maquina":"string","descripcion":"string","horas_km":"string","costo":null}],
"hoteleria":[{"propietario":"string","categoria":"string","cantidad":null,"raza":"string","peso_promedio":null}],
"animales":[{"caravana":"string","categoria":"string","raza":"string","sexo":"string","lote":"string","peso_inicial":null}]}
Separar hacienda propia de hotelería. Incluir trabajos agrícolas Y mantenimiento de maquinaria si los hay.`;
}

async function procesarDatosImportados(p, fecha, resultEl) {
  let summary = [], errors = [];

  for (const e of (p.eventos || [])) {
    const r = await sb('POST','eventos_ganaderos',{tipo:e.tipo,titulo:e.titulo,fecha:e.fecha||fecha,campo:e.campo,lote:e.lote,cantidad_animales:e.cantidad_animales,detalle:e.detalle});
    if (r) summary.push(`✅ Evento: ${e.titulo||e.tipo}`); else errors.push('❌ Error evento');
  }
  for (const ps of (p.pesadas || [])) {
    if (ps.peso_promedio) {
      const r = await sb('POST','pesadas',ps);
      if (r) summary.push(`✅ Pesada: ${ps.lote} — ${ps.peso_promedio}kg`);
    }
  }
  for (const t of (p.trabajos || [])) {
    const r = await sb('POST','trabajos_agricolas',{tipo:t.tipo,fecha:t.fecha||fecha,campo:t.campo,lote:t.lote,hectareas:t.hectareas,cultivo:t.cultivo,contratista:t.contratista,descripcion:t.descripcion});
    if (r) summary.push(`✅ Trabajo: ${t.tipo} ${t.cultivo||''} ${t.lote||''}`); else errors.push('❌ Error trabajo');
  }
  for (const m of (p.mantenimiento || [])) {
    const r = await sb('POST','mantenimiento',{fecha:m.fecha||fecha,descripcion:`${m.maquina}: ${m.descripcion}`,horas_maquina:m.horas_km||null,costo:m.costo||null});
    if (r) summary.push(`✅ Mantenimiento: ${m.maquina}`);
  }
  for (const h of (p.hoteleria || [])) {
    const r = await sb('POST','hoteleria',{...h,activo:true});
    if (r) summary.push(`✅ Hotelería: ${h.cantidad} ${h.categoria} de ${h.propietario}`);
  }
  for (const a of (p.animales || [])) {
    const r = await sb('POST','animales',{...a,propietario:'propio'});
    if (r) summary.push(`✅ Animal: caravana ${a.caravana}`);
  }

  resultEl.innerHTML = [...summary, ...errors].join('<br>') || 'No se encontraron datos.';
  if (summary.length) toast(`✅ ${summary.length} registros cargados`);
}

async function importarJornada() {
  const texto = document.getElementById('imp-texto').value.trim();
  const fecha = document.getElementById('imp-fecha').value;
  const campo = document.getElementById('imp-campo').value;
  if (!texto) { toast('Describí el trabajo del día', 'var(--tierra)'); return; }
  const btn = document.getElementById('btn-importar');
  btn.disabled = true; btn.textContent = '⏳ Procesando...';
  document.getElementById('imp-status').textContent = 'La IA está interpretando la jornada...';
  const result = document.getElementById('import-result');
  result.style.display = 'block'; result.innerHTML = 'Analizando...';
  try {
    const res = await fetch('/api/claude', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-5',max_tokens:2000,system:buildImportSystem(campo,fecha),messages:[{role:'user',content:texto}]})});
    const json = await res.json();
    let raw = json.content?.[0]?.text || '{}';
    raw = raw.replace(/```json|```/g,'').trim();
    await procesarDatosImportados(JSON.parse(raw), fecha, result);
  } catch(e) { result.innerHTML = '❌ Error al procesar.'; console.error(e); }
  btn.disabled = false; btn.textContent = '🤖 Interpretar y cargar con IA';
  document.getElementById('imp-status').textContent = '';
}

function previewImagen(input) {
  const file = input.files[0];
  if (!file) return;
  const preview = document.getElementById('imp-img-preview');
  const thumb = document.getElementById('imp-img-thumb');
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => { thumb.src = e.target.result; preview.style.display = 'block'; };
    reader.readAsDataURL(file);
  } else {
    preview.style.display = 'block';
    thumb.style.display = 'none';
  }
  document.getElementById('imp-img-nombre').textContent = `📄 ${file.name}`;
}

async function importarJornadaImagen() {
  const file = document.getElementById('imp-archivo').files[0];
  const fecha = document.getElementById('imp-fecha-img').value;
  const campo = document.getElementById('imp-campo-img').value;
  if (!file) { toast('Subí una imagen primero', 'var(--tierra)'); return; }
  const btn = document.getElementById('btn-importar-img');
  btn.disabled = true; btn.textContent = '⏳ Leyendo imagen...';
  document.getElementById('imp-status-img').textContent = 'La IA está analizando la imagen...';
  const result = document.getElementById('import-result');
  result.style.display = 'block'; result.innerHTML = 'Procesando imagen...';
  try {
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = () => rej(new Error('Error'));
      r.readAsDataURL(file);
    });
    const isPdf = file.type === 'application/pdf';
    const content = isPdf ? [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
      { type: 'text', text: 'Extraé todos los datos de este documento de campo y cargalos.' }
    ] : [
      { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
      { type: 'text', text: 'Extraé todos los datos de esta imagen de campo y cargalos.' }
    ];
    const res = await fetch('/api/claude', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-5',max_tokens:2000,system:buildImportSystem(campo,fecha),messages:[{role:'user',content}]})});
    const json = await res.json();
    let raw = json.content?.[0]?.text || '{}';
    raw = raw.replace(/```json|```/g,'').trim();
    await procesarDatosImportados(JSON.parse(raw), fecha, result);
  } catch(e) { result.innerHTML = '❌ Error al procesar la imagen.'; console.error(e); }
  btn.disabled = false; btn.textContent = '🤖 Leer imagen y cargar con IA';
  document.getElementById('imp-status-img').textContent = '';
}
