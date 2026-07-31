async function cargarProyecciones() {
  const cont = document.getElementById('proy-contenido');
  if (!cont) return;
  cont.innerHTML = '<div style="text-align:center;padding:40px;color:var(--texto-suave)">Cargando...</div>';

  const rows = await sb('GET', 'boletas', '', '?order=fecha.desc') || [];

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const limite = new Date(hoy); limite.setFullYear(limite.getFullYear() + 1);

  // Extraer facturas impagas con vencimiento en los próximos 12 meses
  const vencimientos = [];
  rows.forEach(r => {
    let obs = {};
    try { obs = JSON.parse(r.observaciones || '{}'); } catch(e) {}
    if (obs.pago === 'Paga') return;
    if (!obs.vencimiento) return;
    const vto = new Date(obs.vencimiento); vto.setHours(0,0,0,0);
    if (vto < hoy || vto > limite) return;
    vencimientos.push({
      fecha: vto,
      proveedor: r.proveedor || '—',
      concepto: obs.descripcion_a || r.concepto || '—',
      categoria: obs.rubro || r.categoria || '—',
      monto: r.monto || 0,
      vencido: vto < hoy,
    });
  });

  vencimientos.sort((a, b) => a.fecha - b.fecha);

  if (!vencimientos.length) {
    cont.innerHTML = '<div style="text-align:center;padding:48px;color:var(--texto-suave)"><div style="font-size:48px">✅</div><p>Sin vencimientos pendientes en los próximos 12 meses</p></div>';
    return;
  }

  // Agrupar por mes
  const porMes = {};
  vencimientos.forEach(v => {
    const key = `${v.fecha.getFullYear()}-${String(v.fecha.getMonth()+1).padStart(2,'0')}`;
    if (!porMes[key]) porMes[key] = { total: 0, items: [] };
    porMes[key].total += v.monto;
    porMes[key].items.push(v);
  });

  const meses = Object.keys(porMes).sort();
  const totalGeneral = vencimientos.reduce((s, v) => s + v.monto, 0);
  const maxMes = Math.max(...meses.map(m => porMes[m].total));

  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Línea de tiempo
  const timelineHTML = meses.map(key => {
    const [anio, mes] = key.split('-');
    const data = porMes[key];
    const pct = Math.round((data.total / maxMes) * 100);
    const estesMes = key === `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
    const pasado = key < `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;

    const itemsHTML = data.items.map(v => {
      const diasRestantes = Math.round((v.fecha - hoy) / 86400000);
      const urgente = diasRestantes <= 7;
      const label = diasRestantes === 0 ? 'Hoy' : diasRestantes < 0 ? `Venció hace ${Math.abs(diasRestantes)}d` : `En ${diasRestantes}d`;
      return `<div style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            <div style="font-weight:600;color:#222">${v.proveedor}</div>
            <div style="color:#777;margin-top:1px">${v.concepto}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:700;color:#8B1A2F">${fmtMonto(v.monto,'ARS')}</div>
            <div style="font-size:11px;color:${urgente?'#c0392b':'#888'};font-weight:${urgente?'700':'400'}">${fmtFecha(v.fecha.toISOString())} · ${label}</div>
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <div style="font-weight:700;font-size:14px;min-width:130px;${estesMes?'color:#8B1A2F':'color:#333'}">
          ${estesMes ? '▶ ' : ''}${MESES_ES[parseInt(mes)-1]} ${anio}
        </div>
        <div style="flex:1;background:#f0f0f0;border-radius:4px;height:10px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${pasado?'#e0a0a0':estesMes?'#8B1A2F':'#c0785c'};border-radius:4px;transition:width 0.4s"></div>
        </div>
        <div style="font-weight:700;font-size:13px;min-width:120px;text-align:right;color:#8B1A2F">${fmtMonto(data.total,'ARS')}</div>
        <div style="font-size:11px;color:#888;min-width:60px;text-align:right">${data.items.length} fact.</div>
      </div>
      <div style="margin-left:142px;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;background:#fff">
        ${itemsHTML}
      </div>
    </div>`;
  }).join('');

  cont.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px">
      <div class="stat-card" style="flex:1;min-width:180px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--texto-suave);margin-bottom:4px">Total pendiente</div>
        <div style="font-size:24px;font-weight:700;color:#8B1A2F">${fmtMonto(totalGeneral,'ARS')}</div>
        <div style="font-size:12px;color:var(--texto-suave)">${vencimientos.length} facturas</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:180px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--texto-suave);margin-bottom:4px">Próximo vencimiento</div>
        <div style="font-size:18px;font-weight:700">${fmtFecha(vencimientos[0].fecha.toISOString())}</div>
        <div style="font-size:12px;color:var(--texto-suave)">${vencimientos[0].proveedor}</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:180px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--texto-suave);margin-bottom:4px">Meses con vencimientos</div>
        <div style="font-size:24px;font-weight:700">${meses.length}</div>
        <div style="font-size:12px;color:var(--texto-suave)">próximos 12 meses</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--texto-suave);margin-bottom:16px">
      La barra muestra el peso relativo de cada mes respecto al mes de mayor gasto.
    </div>
    ${timelineHTML}
  `;
}
