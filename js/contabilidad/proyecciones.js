let _proyMesActivo = null;
let _proyDatos = null;

async function cargarProyecciones() {
  const cont = document.getElementById('proy-contenido');
  if (!cont) return;
  cont.innerHTML = '<div style="text-align:center;padding:40px;color:var(--texto-suave)">Cargando...</div>';

  const rows = await sb('GET', 'boletas', '', '?order=fecha.desc') || [];
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const limite = new Date(hoy); limite.setFullYear(limite.getFullYear() + 1);

  const vencimientos = [];
  rows.forEach(r => {
    let obs = {};
    try { obs = JSON.parse(r.observaciones || '{}'); } catch(e) {}
    if (obs.pago === 'Paga') return;
    if (!obs.vencimiento) return;
    const vto = new Date(obs.vencimiento); vto.setHours(0,0,0,0);
    if (vto < hoy || vto > limite) return;
    vencimientos.push({ fecha: vto, proveedor: r.proveedor || '—', concepto: obs.descripcion_a || r.concepto || '—', categoria: obs.rubro || r.categoria || '—', monto: r.monto || 0 });
  });
  vencimientos.sort((a, b) => a.fecha - b.fecha);

  if (!vencimientos.length) {
    cont.innerHTML = '<div style="text-align:center;padding:48px;color:var(--texto-suave)"><div style="font-size:48px">✅</div><p>Sin vencimientos pendientes en los próximos 12 meses</p></div>';
    return;
  }

  const porMes = {};
  vencimientos.forEach(v => {
    const key = `${v.fecha.getFullYear()}-${String(v.fecha.getMonth()+1).padStart(2,'0')}`;
    if (!porMes[key]) porMes[key] = { total: 0, items: [] };
    porMes[key].total += v.monto;
    porMes[key].items.push(v);
  });

  _proyDatos = porMes;
  const meses = Object.keys(porMes).sort();
  const totalGeneral = vencimientos.reduce((s, v) => s + v.monto, 0);
  const maxMes = Math.max(...meses.map(m => porMes[m].total));
  const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const HOY_KEY = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
  if (!_proyMesActivo || !porMes[_proyMesActivo]) _proyMesActivo = meses[0];

  // Ticks del eje Y
  const nTicks = 5;
  const tickStep = Math.ceil(maxMes / nTicks / 1000000) * 1000000 || Math.ceil(maxMes / nTicks / 100000) * 100000 || 1;
  const yMax = tickStep * nTicks;
  const ticks = Array.from({length: nTicks + 1}, (_, i) => i * tickStep).reverse();

  const ticksHTML = ticks.map(t => `
    <div style="display:flex;align-items:center;gap:6px;height:${100/(nTicks)}%;box-sizing:border-box">
      <span style="font-size:10px;color:#aaa;white-space:nowrap;min-width:60px;text-align:right">${t >= 1000000 ? (t/1000000).toFixed(1)+'M' : t >= 1000 ? (t/1000).toFixed(0)+'k' : t}</span>
      <div style="flex:1;border-top:1px dashed #eee"></div>
    </div>`).join('');

  const barsHTML = meses.map(key => {
    const [, mes] = key.split('-');
    const data = porMes[key];
    const pct = (data.total / yMax) * 100;
    const activo = key === _proyMesActivo;
    const esHoy = key === HOY_KEY;
    const color = activo ? '#8B1A2F' : esHoy ? '#c0785c' : '#dba090';
    return `<div onclick="seleccionarMesProy('${key}')" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;cursor:pointer;gap:4px;padding:0 2px" title="${fmtMonto(data.total,'ARS')}">
      <div style="font-size:10px;font-weight:700;color:${activo?'#8B1A2F':'#888'}">${fmtMonto(data.total,'ARS').replace('$ ','$')}</div>
      <div style="width:100%;background:${color};border-radius:5px 5px 0 0;height:${pct}%;min-height:3px;transition:all 0.25s;box-shadow:${activo?'0 2px 8px rgba(139,26,47,0.3)':'none'}"></div>
    </div>`;
  }).join('');

  const labelsHTML = meses.map(key => {
    const [anio, mes] = key.split('-');
    const activo = key === _proyMesActivo;
    const esHoy = key === HOY_KEY;
    return `<div style="flex:1;text-align:center;font-size:10px;font-weight:${activo?'700':'400'};color:${esHoy?'#8B1A2F':activo?'#333':'#999'};padding-top:4px">
      ${MESES_ES[parseInt(mes)-1]}<br>${esHoy?'<span style="background:#8B1A2F;color:#fff;border-radius:8px;padding:0 4px;font-size:9px">HOY</span>':anio.slice(2)}
    </div>`;
  }).join('');

  cont.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
      <div class="stat-card" style="flex:1;min-width:160px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--texto-suave);margin-bottom:4px">Total pendiente</div>
        <div style="font-size:22px;font-weight:700;color:#8B1A2F">${fmtMonto(totalGeneral,'ARS')}</div>
        <div style="font-size:12px;color:var(--texto-suave)">${vencimientos.length} facturas · ${meses.length} meses</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:160px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--texto-suave);margin-bottom:4px">Próximo vencimiento</div>
        <div style="font-size:16px;font-weight:700">${fmtFecha(vencimientos[0].fecha.toISOString())}</div>
        <div style="font-size:12px;color:var(--texto-suave)">${vencimientos[0].proveedor}</div>
      </div>
    </div>

    <!-- GRÁFICO -->
    <div style="overflow-x:auto">
      <div style="min-width:500px">
        <div style="display:flex;gap:0;height:220px;align-items:stretch">
          <!-- Eje Y -->
          <div style="display:flex;flex-direction:column;justify-content:space-between;padding-right:8px;height:100%">
            ${ticks.map(t => `<span style="font-size:10px;color:#aaa;white-space:nowrap;line-height:1">${t >= 1000000 ? (t/1000000).toFixed(1)+'M' : t >= 1000 ? (t/1000).toFixed(0)+'k' : t === 0 ? '0' : t}</span>`).join('')}
          </div>
          <!-- Barras sobre grilla -->
          <div style="flex:1;position:relative">
            <!-- Grilla horizontal -->
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none">
              ${ticks.map(() => `<div style="border-top:1px dashed #eee;width:100%"></div>`).join('')}
            </div>
            <!-- Barras -->
            <div style="position:absolute;inset:0;display:flex;align-items:flex-end;gap:6px;padding:0 4px">
              ${barsHTML}
            </div>
          </div>
        </div>
        <!-- Eje X -->
        <div style="display:flex;margin-left:52px;border-top:2px solid #ccc;padding-top:4px">
          ${labelsHTML}
        </div>
      </div>
    </div>

    <!-- DETALLE MES -->
    <div id="proy-detalle" style="margin-top:20px"></div>
  `;

  renderDetalleMesProy(hoy);
}

function renderDetalleMesProy(hoy) {
  if (!hoy) hoy = new Date(); hoy.setHours && hoy.setHours(0,0,0,0);
  const det = document.getElementById('proy-detalle');
  if (!det || !_proyDatos || !_proyMesActivo) return;
  const data = _proyDatos[_proyMesActivo];
  if (!data) return;
  const [anio, mes] = _proyMesActivo.split('-');
  const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const filas = data.items.map(v => {
    const dias = Math.round((v.fecha - hoy) / 86400000);
    const urgente = dias <= 7;
    const label = dias === 0 ? 'Hoy' : dias < 0 ? `Vencido` : `En ${dias}d`;
    return `<tr>
      <td>${fmtFecha(v.fecha.toISOString())}</td>
      <td style="font-weight:600">${v.proveedor}</td>
      <td>${v.concepto}</td>
      <td style="color:#888">${v.categoria}</td>
      <td style="font-weight:700;color:#8B1A2F;text-align:right">${fmtMonto(v.monto,'ARS')}</td>
      <td style="color:${urgente?'#c0392b':'#888'};font-weight:${urgente?'700':'400'};text-align:center">${label}</td>
    </tr>`;
  }).join('');
  det.innerHTML = `
    <div style="border-top:2px solid #8B1A2F;padding-top:14px">
      <div style="font-weight:700;font-size:14px;margin-bottom:10px;color:#8B1A2F">${MESES_FULL[parseInt(mes)-1]} ${anio} — ${fmtMonto(data.total,'ARS')}</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Vencimiento</th><th>Proveedor</th><th>Concepto</th><th>Categoría</th><th style="text-align:right">Monto</th><th style="text-align:center">Plazo</th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
    </div>`;
}

function seleccionarMesProy(key) {
  _proyMesActivo = key;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  cargarProyecciones();
}
