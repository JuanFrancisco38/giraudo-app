function getDolar() {
  const v = parseFloat(localStorage.getItem('dolar_cotiz'));
  return v > 0 ? v : null;
}

async function cargarResumenGranos() {
  const [liqs, certs] = await Promise.all([
    sb('GET', 'liquidaciones_granos', '', '?campania=eq.25/26'),
    sb('GET', 'certificaciones', '', '?tipo=eq.deposito')
  ]);
  const ventas = liqs || [];
  const depositos = (certs || []).map(parseCert).filter(c => c.campania === '25/26');

  const norm = g => (g || 'Sin especificar').trim();

  // Agrupar ventas por grano
  const porGrano = {};
  const get = g => {
    const k = norm(g);
    if (!porGrano[k]) porGrano[k] = { kgVendido: 0, monto: 0, kgDepositado: 0, ubicaciones: {} };
    return porGrano[k];
  };

  ventas.forEach(l => {
    const g = get(l.cultivo);
    g.kgVendido += parseFloat(l.kg) || 0;
    const monto = parseFloat(l.subtotal) || ((parseFloat(l.kg) || 0) * (parseFloat(l.precio) || 0));
    g.monto += monto;
  });

  depositos.forEach(c => {
    const g = get(c.grano);
    const kg = parseFloat(c.kg_neto) || 0;
    g.kgDepositado += kg;
    const ub = (c.depositario || 'Sin ubicación').trim();
    g.ubicaciones[ub] = (g.ubicaciones[ub] || 0) + kg;
  });

  const dolar = getDolar();
  const cultColors = {soja:'green',maiz:'yellow',trigo:'tierra',girasol:'amarillo'};
  const tbody = document.getElementById('tabla-resumen-granos');
  const granos = Object.keys(porGrano);

  if (!granos.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">📊</div><h3>Sin datos</h3></div></td></tr>';
  } else {
    tbody.innerHTML = granos.map(nombre => {
      const d = porGrano[nombre];
      const stock = d.kgDepositado - d.kgVendido;
      const ubics = Object.entries(d.ubicaciones)
        .filter(([, kg]) => kg > 0)
        .map(([u, kg]) => `${u}: ${fmtKg(kg)}`)
        .join('<br>') || '—';
      const usd = dolar ? fmtMonto(d.monto / dolar, 'USD') : '—';
      return `<tr>
        <td><span class="badge badge-${cultColors[nombre.toLowerCase()] || 'gray'}">${nombre}</span></td>
        <td>${fmtKg(d.kgVendido)}</td>
        <td><strong>${fmtKg(stock)}</strong></td>
        <td style="font-size:12px">${ubics}</td>
        <td>${fmtMonto(d.monto, 'ARS')}</td>
        <td>${usd}</td>
      </tr>`;
    }).join('');
  }

  // Totales generales
  const sum = campo => ventas.reduce((s, l) => s + (parseFloat(l[campo]) || 0), 0);
  const fmt = n => n ? fmtMonto(n, 'ARS') : '—';
  document.getElementById('rg-retiva').textContent = fmt(sum('ret_iva'));
  document.getElementById('rg-retgan').textContent = fmt(sum('ret_ganancias'));
  document.getElementById('rg-rg4310').textContent = fmt(sum('ret_iva_rg4310'));
  document.getElementById('rg-comision').textContent = fmt(sum('comision'));
  document.getElementById('rg-flete').textContent = fmt(sum('flete'));
  document.getElementById('rg-neto').textContent = fmt(sum('total_neto'));

  const info = document.getElementById('dolar-info');
  if (dolar) info.textContent = `${localStorage.getItem('dolar_fuente') || 'Dólar'}: ${fmtMonto(dolar, 'ARS')} (${localStorage.getItem('dolar_fecha') || ''})`;
}

async function actualizarDolarIA() {
  const btn = document.getElementById('btn-dolar');
  btn.disabled = true; btn.textContent = '⏳ Buscando...';
  try {
    const hoyStr = new Date().toLocaleDateString('es-AR');
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `Sos un asistente financiero argentino. Buscá la cotización del DÓLAR DIVISA del Banco de la Nación Argentina (BNA), específicamente el tipo de cambio DIVISA VENDEDOR (no el billete). La fuente oficial es el sitio del Banco Nación (bna.com.ar) o portales que publiquen la cotización "Divisa" del BNA. Devolvé SOLO JSON sin backticks: {"dolar":0,"fecha":"${hoyStr}","fuente":"string"}. En "dolar" poné el valor vendedor de la divisa BNA y en "fuente" aclará "BNA Divisa (vendedor)".`,
        messages: [{ role: 'user', content: `¿Cuál es la cotización del dólar DIVISA vendedor del Banco Nación (BNA) hoy ${hoyStr}?` }]
      })
    });
    const json = await res.json();
    const fullText = json.content?.filter(c => c.type === 'text').map(c => c.text).join('') || '{}';
    const match = fullText.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const datos = JSON.parse(match[0]);
    if (datos.dolar > 0) {
      localStorage.setItem('dolar_cotiz', datos.dolar);
      localStorage.setItem('dolar_fecha', datos.fecha || hoyStr);
      localStorage.setItem('dolar_fuente', datos.fuente || 'BNA Divisa (vendedor)');
      toast(`✅ Dólar BNA Divisa: ${fmtMonto(datos.dolar, 'ARS')}`);
      cargarResumenGranos();
    } else throw new Error('Sin valor');
  } catch(e) {
    console.error(e);
    toast('❌ No se pudo obtener la cotización', 'var(--rojo)');
  }
  btn.disabled = false; btn.textContent = '🤖 Actualizar dólar';
}
