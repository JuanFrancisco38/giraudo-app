let preciosActuales = {};

const productosCat = {
  granos: ['Soja','Maíz','Trigo','Girasol'],
  hacienda: ['Ternero invernada','Ternera invernada','Novillo','Vaca preñada','Vaquillona invernada'],
  insumos: ['Gasoil','Glifosato 48%','Semilla soja RR','Semilla maíz','Urea','Ivomec Gold']
};

function actualizarProductos() {
  const cat = document.getElementById('pm-cat').value;
  const sel = document.getElementById('pm-producto');
  sel.innerHTML = productosCat[cat].map(p => `<option>${p}</option>`).join('');
  const unidades = {granos:'$/tn', hacienda:'$/kg', insumos:'$/lt'};
  document.getElementById('pm-unidad').value = unidades[cat] || '$/unidad';
}

async function actualizarPreciosIA() {
  const btn = document.querySelector('button[onclick="actualizarPreciosIA()"]');
  btn.disabled = true; btn.textContent = '⏳ Consultando precios...';
  toast('🤖 Buscando precios de mercado...');

  try {
    const hoyStr = new Date().toLocaleDateString('es-AR');
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `Sos un asistente agropecuario argentino. Buscá los precios actuales de mercado en Argentina para: soja, maíz, trigo, girasol (pizarra Rosario en $/tn), ternero invernada, novillo, vaca preñada (Rosgan/Liniers en $/kg o $/cabeza), gasoil ($/lt), glifosato 48% ($/lt), urea ($/tn). Devolvé SOLO JSON sin backticks:
{"fecha":"${hoyStr}","precios":[{"categoria":"granos|hacienda|insumos","producto":"string","precio":0,"unidad":"$/tn|$/kg|$/lt|$/cab","fuente":"string"}]}`,
        messages: [{ role: 'user', content: `Buscá los precios agropecuarios actuales en Argentina para hoy ${hoyStr}.` }]
      })
    });

    const json = await res.json();
    const fullText = json.content?.filter(c => c.type === 'text').map(c => c.text).join('') || '{}';
    const match = fullText.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const datos = JSON.parse(match[0]);

    if (datos.precios?.length) {
      for (const p of datos.precios) {
        await guardarPrecioEnDB(p.producto, p.precio, p.unidad, p.fuente || 'IA web search');
        preciosActuales[p.producto] = p.precio;
        actualizarTarjeta(p.producto, p.precio, p.unidad, datos.fecha);
      }
      calcularRelaciones();
      document.getElementById('precios-ultima-act').textContent = `Última actualización: ${datos.fecha} — IA web search`;
      await cargarHistorialPrecios();
      toast('✅ Precios actualizados');
    }
  } catch(e) {
    console.error(e);
    toast('❌ Error al buscar precios', 'var(--rojo)');
  }
  btn.disabled = false; btn.textContent = '🤖 Actualizar con IA';
}

async function guardarPrecioEnDB(producto, precio, unidad, fuente) {
  await sb('POST', 'precios', {
    fecha: new Date().toISOString().split('T')[0],
    producto,
    precio,
    unidad,
    fuente
  });
}

async function guardarPrecioManual() {
  const cat = document.getElementById('pm-cat').value;
  const producto = document.getElementById('pm-producto').value;
  const precio = parseFloat(document.getElementById('pm-precio').value);
  const unidad = document.getElementById('pm-unidad').value;
  const fuente = document.getElementById('pm-fuente').value || 'Manual';
  const fecha = document.getElementById('pm-fecha').value;
  if (!precio) { toast('Ingresá el precio', 'var(--tierra)'); return; }

  await sb('POST', 'precios', { fecha, producto, precio, unidad, fuente });
  preciosActuales[producto] = precio;
  actualizarTarjeta(producto, precio, unidad, fecha);
  calcularRelaciones();
  await cargarHistorialPrecios();
  toggleForm('form-precio-manual');
  toast('✅ Precio guardado');
}

function actualizarTarjeta(producto, precio, unidad, fecha) {
  document.querySelectorAll('.precio-card').forEach(card => {
    if (card.dataset.producto === producto) {
      card.querySelector('.pc-precio').textContent = '$' + Math.round(precio).toLocaleString();
      card.querySelector('.pc-unidad').textContent = unidad;
      card.querySelector('.pc-fecha').textContent = fecha || '—';
    }
  });
}

function calcularRelaciones() {
  const p = preciosActuales;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val && isFinite(val)) el.textContent = val;
  };
  if (p['Soja'] && p['Gasoil']) set('rel-soja-gasoil', (p['Soja'] / p['Gasoil']).toFixed(0) + ' lt/tn');
  if (p['Ternero invernada'] && p['Maíz']) set('rel-ternero-maiz', (p['Ternero invernada'] / (p['Maíz']/1000)).toFixed(1) + ' kg maíz/kg');
  if (p['Novillo'] && p['Soja']) set('rel-novillo-soja', (p['Novillo'] / (p['Soja']/1000)).toFixed(1) + ' kg soja/kg');
  if (p['Maíz'] && p['Gasoil']) set('rel-maiz-gasoil', (p['Maíz'] / p['Gasoil']).toFixed(0) + ' lt/tn');
  if (p['Soja'] && p['Urea']) set('rel-soja-urea', (p['Soja'] / p['Urea']).toFixed(2) + ' tn urea/tn soja');
  if (p['Ternero invernada'] && p['Soja']) set('rel-ternero-soja', (p['Ternero invernada'] / (p['Soja']/1000)).toFixed(1) + ' kg soja/kg');
}

async function cargarHistorialPrecios() {
  const rows = await sb('GET', 'precios', '', '?order=created_at.desc&limit=50');
  const tbody = document.getElementById('tabla-precios');
  if (!rows || !rows.length) return;
  const catColors = { granos:'green', hacienda:'bordo', insumos:'tierra' };
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.fecha || '—'}</td>
      <td><span class="badge badge-gray">${r.fuente || '—'}</span></td>
      <td><strong>${r.producto}</strong></td>
      <td>$${Math.round(r.precio).toLocaleString()}</td>
      <td>${r.unidad}</td>
      <td style="font-size:12px;color:var(--texto-suave)">${r.fuente || '—'}</td>
    </tr>`).join('');
}
