let _credGastos = []; // otros gastos en edición

async function cargarCreditos() {
  const cont = document.getElementById('creditos-contenido');
  if (!cont) return;
  cont.innerHTML = '<div style="text-align:center;padding:40px;color:var(--texto-suave)">Cargando...</div>';

  const rows = await sb('GET', 'creditos', '', '?order=created_at.desc') || [];

  if (!rows.length) {
    cont.innerHTML = '<div style="text-align:center;padding:48px;color:var(--texto-suave)">No hay créditos cargados.<br>Usá <strong>+ Nuevo crédito</strong> para agregar uno.</div>';
    return;
  }

  const totalARS = rows.filter(r=>r.activo && r.moneda==='ARS').reduce((s,r)=>s+_saldoCredito(r),0);
  const totalUSD = rows.filter(r=>r.activo && r.moneda==='USD').reduce((s,r)=>s+_saldoCredito(r),0);

  const resumen = `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
    <div style="background:#f5e6e9;border-radius:10px;padding:14px 20px;min-width:160px">
      <div style="font-size:11px;font-weight:600;color:#8B1A2F;text-transform:uppercase;margin-bottom:2px">Saldo total ARS</div>
      <div style="font-size:22px;font-weight:800;color:#8B1A2F">${fmtMonto(totalARS,'ARS')}</div>
    </div>
    ${totalUSD ? `<div style="background:#e4eff8;border-radius:10px;padding:14px 20px;min-width:160px">
      <div style="font-size:11px;font-weight:600;color:#1a3a5c;text-transform:uppercase;margin-bottom:2px">Saldo total USD</div>
      <div style="font-size:22px;font-weight:800;color:#1a3a5c">${fmtMonto(totalUSD,'USD')}</div>
    </div>` : ''}
  </div>`;

  const FREC = { mensual:'mensual', trimestral:'trimestral', semestral:'semestral', anual:'anual' };

  const filas = rows.map(r => {
    const saldo   = _saldoCredito(r);
    const pct     = r.cuotas_total ? Math.round((r.cuotas_pagadas||0) / r.cuotas_total * 100) : 0;
    const vencidas = _cuotasVencidas(r);
    let gastos = [];
    try { gastos = JSON.parse(r.otros_gastos || '[]'); } catch(e) {}
    const totalGastos = gastos.reduce((s,g) => s+(g.monto||0), 0);

    return `<div style="border:1px solid ${r.activo?'#e0e0dc':'#f0f0f0'};border-radius:12px;padding:16px 18px;margin-bottom:12px;background:${r.activo?'#fff':'#fafafa'}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:700;font-size:15px">${r.banco}</span>
            <span style="background:#f0f0f0;border-radius:20px;padding:2px 10px;font-size:11px;color:#555">${r.titular}</span>
            ${!r.activo?'<span style="background:#eee;border-radius:20px;padding:2px 8px;font-size:10px;color:#999">Cancelado</span>':''}
            ${vencidas>0?`<span style="background:#fdecea;color:#c0392b;border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700">⚠ ${vencidas} cuota${vencidas>1?'s':''} vencida${vencidas>1?'s':''}</span>`:''}
          </div>
          ${r.motivo?`<div style="font-size:12px;color:var(--texto-suave);margin-bottom:6px">${r.motivo}</div>`:''}
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#555">
            ${r.fecha_inicio?`<span>📅 Inicio: ${fmtFecha(r.fecha_inicio)}</span>`:''}
            ${r.tasa_interes?`<span>📊 ${r.tasa_interes}% ${r.tipo_tasa||''}</span>`:''}
            ${r.cuotas_total?`<span>📋 ${r.cuotas_pagadas||0}/${r.cuotas_total} cuotas ${r.frecuencia_cuota||'mensual'}es</span>`:''}
            ${r.monto_cuota?`<span>💵 ${fmtMonto(r.monto_cuota,r.moneda)} / cuota</span>`:''}
          </div>
          ${(r.cuotas_pagadas>0 && r.monto_cuota && r.cuotas_total) ? (() => {
            const totalPagado    = r.cuotas_pagadas * r.monto_cuota;
            const capitalPagado  = (r.cuotas_pagadas / r.cuotas_total) * r.monto_total;
            const interesPagado  = Math.max(totalPagado - capitalPagado, 0);
            return `<div style="margin-top:8px;display:flex;gap:14px;flex-wrap:wrap;font-size:12px;background:#fef8e4;border-radius:8px;padding:7px 10px">
              <span>💰 Total pagado: <strong>${fmtMonto(totalPagado,r.moneda)}</strong></span>
              <span>🏦 Capital: <strong>${fmtMonto(capitalPagado,r.moneda)}</strong></span>
              <span style="color:#c0392b">📈 Interés pagado: <strong>${fmtMonto(interesPagado,r.moneda)}</strong></span>
            </div>`;
          })() : ''}
          ${r.cuotas_total ? `<div style="margin-top:8px">
            <div style="background:#eee;border-radius:20px;height:6px;overflow:hidden">
              <div style="background:${pct>=100?'#27ae60':'#8B1A2F'};height:100%;width:${pct}%;border-radius:20px"></div>
            </div>
            <div style="font-size:10px;color:var(--texto-suave);margin-top:2px">${pct}% pagado</div>
          </div>` : ''}
          ${gastos.length ? `<div style="margin-top:8px;font-size:11px;color:#777">
            <span style="font-weight:600">Otros gastos:</span>
            ${gastos.map(g=>`${g.descripcion} ${fmtMonto(g.monto,r.moneda)}`).join(' · ')}
            ${totalGastos ? `<span style="font-weight:700;color:#555"> = ${fmtMonto(totalGastos,r.moneda)}</span>` : ''}
          </div>` : ''}
        </div>
        <div style="text-align:right;min-width:140px">
          <div style="font-size:11px;color:var(--texto-suave)">Saldo pendiente</div>
          <div style="font-size:20px;font-weight:800;color:${r.activo?'#8B1A2F':'#999'}">${fmtMonto(saldo,r.moneda)}</div>
          <div style="font-size:11px;color:var(--texto-suave);margin-top:1px">de ${fmtMonto(r.monto_total,r.moneda)}</div>
          <div style="display:flex;gap:6px;margin-top:10px;justify-content:flex-end;flex-wrap:wrap">
            ${r.cuotas_total && (r.cuotas_pagadas||0) < r.cuotas_total ? `<button class="btn btn-secondary" style="font-size:11px;padding:4px 10px" onclick="registrarPagoCuota('${r.id}',${r.cuotas_pagadas||0},${r.cuotas_total})">✓ Pagar cuota</button>` : ''}
            <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px" onclick="abrirModalCredito('${r.id}')">✏ Editar</button>
            <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;color:#c0392b" onclick="toggleActivoCredito('${r.id}',${r.activo})">${r.activo?'🗑 Cancelar':'↩ Reactivar'}</button>
            <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;color:#c0392b;border-color:#c0392b" onclick="eliminarCredito('${r.id}')">🗑 Eliminar</button>
          </div>
        </div>
      </div>
      ${r.fecha_inicio && r.cuotas_total && r.monto_cuota ? _htmlCronograma(r) : ''}
      ${r.observaciones?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0;font-size:11px;color:var(--texto-suave)">📝 ${r.observaciones}</div>`:''}
    </div>`;
  }).join('');

  cont.innerHTML = resumen + filas;
}

function _saldoCredito(r) {
  if (!r.cuotas_total || !r.monto_cuota) return r.monto_total || 0;
  return Math.max((r.cuotas_total) - (r.cuotas_pagadas||0), 0) * r.monto_cuota;
}

function _cuotasVencidas(r) {
  if (!r.fecha_inicio || !r.cuotas_total || !r.monto_cuota) return 0;
  const DIAS_FREC = { mensual:30.5, trimestral:91.5, semestral:182.5, anual:365 };
  const dias = DIAS_FREC[r.frecuencia_cuota||'mensual'];
  const inicio = new Date(r.fecha_inicio + 'T12:00:00');
  const hoy    = new Date(); hoy.setHours(0,0,0,0);
  const periodos = Math.floor((hoy - inicio) / (1000*60*60*24*dias));
  return Math.max(Math.min(periodos, r.cuotas_total) - (r.cuotas_pagadas||0), 0);
}

// ── MODAL ────────────────────────────────────────────────────

async function abrirModalCredito(id) {
  _credGastos = [];
  document.getElementById('modal-credito').style.display = 'flex';
  document.getElementById('cred-id').value            = '';
  document.getElementById('cred-banco').value         = '';
  document.getElementById('cred-titular').value       = 'Giraudo SH';
  document.getElementById('cred-motivo').value        = '';
  document.getElementById('cred-monto').value         = '';
  document.getElementById('cred-fecha').value         = new Date().toISOString().split('T')[0];
  document.getElementById('cred-moneda').value        = 'ARS';
  document.getElementById('cred-cuotas').value        = '';
  document.getElementById('cred-frecuencia').value    = 'mensual';
  document.getElementById('cred-monto-cuota').value   = '';
  document.getElementById('cred-cuotas-pagadas').value= '0';
  document.getElementById('cred-tasa').value          = '';
  document.getElementById('cred-tipo-tasa').value     = 'TNA';
  document.getElementById('cred-sistema').value       = 'frances';
  document.getElementById('cred-obs').value           = '';
  document.getElementById('cred-gasto-desc').value    = '';
  document.getElementById('cred-gasto-monto').value   = '';
  document.getElementById('modal-credito-titulo').textContent = '🏦 Nuevo crédito';
  document.getElementById('cred-resumen').style.display = 'none';
  document.getElementById('cred-sim-panel').style.display = 'none';
  document.getElementById('cred-btn-simular').style.display = '';
  document.getElementById('cred-btn-volver').style.display = 'none';
  document.getElementById('cred-btn-guardar').style.display = 'none';
  document.querySelectorAll('#modal-credito .overflow-y-auto').forEach(el => el.style.display = '');
  _renderGastosCredito();

  if (id) {
    const rows = await sb('GET', 'creditos', '', `?id=eq.${id}`) || [];
    const r = rows[0]; if (!r) return;
    document.getElementById('modal-credito-titulo').textContent = '✏ Editar crédito';
    document.getElementById('cred-id').value            = r.id;
    document.getElementById('cred-banco').value         = r.banco||'';
    document.getElementById('cred-titular').value       = r.titular||'Giraudo SH';
    document.getElementById('cred-motivo').value        = r.motivo||'';
    document.getElementById('cred-monto').value         = r.monto_total||'';
    document.getElementById('cred-fecha').value         = r.fecha_inicio||'';
    document.getElementById('cred-moneda').value        = r.moneda||'ARS';
    document.getElementById('cred-cuotas').value        = r.cuotas_total||'';
    document.getElementById('cred-frecuencia').value    = r.frecuencia_cuota||'mensual';
    document.getElementById('cred-monto-cuota').value   = r.monto_cuota||'';
    document.getElementById('cred-cuotas-pagadas').value= r.cuotas_pagadas||0;
    document.getElementById('cred-tasa').value          = r.tasa_interes||'';
    document.getElementById('cred-tipo-tasa').value     = r.tipo_tasa||'TNA';
    document.getElementById('cred-sistema').value       = r.sistema||'frances';
    document.getElementById('cred-obs').value           = r.observaciones||'';
    try { _credGastos = JSON.parse(r.otros_gastos||'[]'); } catch(e) { _credGastos = []; }
    _renderGastosCredito();
    calcCuotaCredito();
  }
}

function cerrarModalCredito() {
  document.getElementById('modal-credito').style.display = 'none';
}

function calcCuotaCredito() {
  const monto  = parseFloat(document.getElementById('cred-monto').value) || 0;
  const cuotas = parseInt(document.getElementById('cred-cuotas').value) || 0;
  const cuotaV = parseFloat(document.getElementById('cred-monto-cuota').value) || 0;
  const moneda = document.getElementById('cred-moneda').value;
  const res    = document.getElementById('cred-resumen');

  if (monto && cuotas && !cuotaV)
    document.getElementById('cred-monto-cuota').placeholder = fmtMonto(monto/cuotas, moneda);

  if (!monto || !cuotas) { res.style.display = 'none'; return; }
  const montoCuota   = cuotaV || monto/cuotas;
  const totalAPagar  = montoCuota * cuotas;
  const interesTotal = totalAPagar - monto;

  res.style.display = 'flex';
  res.innerHTML = `
    <div><div style="font-size:10px;color:#888">Cuota estimada</div><div style="font-weight:700">${fmtMonto(montoCuota,moneda)}</div></div>
    <div><div style="font-size:10px;color:#888">Total a pagar</div><div style="font-weight:700">${fmtMonto(totalAPagar,moneda)}</div></div>
    <div><div style="font-size:10px;color:#888">Interés total</div><div style="font-weight:700;color:${interesTotal>0?'#c0392b':'#27ae60'}">${fmtMonto(Math.abs(interesTotal),moneda)}</div></div>
  `;
}

// ── OTROS GASTOS ─────────────────────────────────────────────

function agregarGastoCredito() {
  const desc  = document.getElementById('cred-gasto-desc').value.trim();
  const monto = parseFloat(document.getElementById('cred-gasto-monto').value);
  if (!desc || !monto) { toast('Completá descripción y monto del gasto'); return; }
  _credGastos.push({ descripcion: desc, monto });
  document.getElementById('cred-gasto-desc').value  = '';
  document.getElementById('cred-gasto-monto').value = '';
  _renderGastosCredito();
}

function eliminarGastoCredito(idx) {
  _credGastos.splice(idx, 1);
  _renderGastosCredito();
}

function _renderGastosCredito() {
  const lista  = document.getElementById('cred-gastos-lista');
  const moneda = document.getElementById('cred-moneda')?.value || 'ARS';
  if (!_credGastos.length) { lista.innerHTML = ''; return; }
  lista.innerHTML = _credGastos.map((g,i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;background:#f8f8f8;border-radius:7px;padding:7px 10px;font-size:12px">
      <span>${g.descripcion}</span>
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-weight:700">${fmtMonto(g.monto,moneda)}</span>
        <button type="button" onclick="eliminarGastoCredito(${i})" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:15px;line-height:1">×</button>
      </div>
    </div>`).join('');
}

// ── SIMULACIÓN ───────────────────────────────────────────────

function simularCredito() {
  const banco    = document.getElementById('cred-banco').value.trim();
  const monto    = parseFloat(document.getElementById('cred-monto').value);
  const cuotas   = parseInt(document.getElementById('cred-cuotas').value);
  const moneda   = document.getElementById('cred-moneda').value;
  const frecuencia = document.getElementById('cred-frecuencia').value;
  const cuotaInput = parseFloat(document.getElementById('cred-monto-cuota').value);
  const fecha    = document.getElementById('cred-fecha').value;
  const tasa     = parseFloat(document.getElementById('cred-tasa').value) || 0;
  const tipoTasa = document.getElementById('cred-tipo-tasa').value;

  if (!banco || !monto) { toast('Completá al menos banco y monto'); return; }
  if (!cuotas || !fecha) { toast('Completá fecha de inicio y cantidad de cuotas para simular'); return; }

  const MESES_FREC = { mensual:1, trimestral:3, semestral:6, anual:12 };
  const mesesSalto = MESES_FREC[frecuencia] || 1;
  const FREC_LABEL = { mensual:'Mensual', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual' };
  const inicio = new Date(fecha + 'T12:00:00');
  const sistema = document.getElementById('cred-sistema')?.value || 'frances';

  // Tasa por período según tipo
  let tasaPeriodo = 0;
  if (tasa) {
    if (tipoTasa === 'TEA') {
      tasaPeriodo = Math.pow(1 + tasa / 100, mesesSalto / 12) - 1;
    } else if (tipoTasa === 'TEM') {
      tasaPeriodo = Math.pow(1 + tasa / 100, mesesSalto) - 1;
    } else {
      // TNA, TNAV, CFT → nominal, dividir proporcional
      tasaPeriodo = (tasa / 100) * (mesesSalto / 12);
    }
  }

  // Generar cronograma
  const filas = [];
  let saldo = monto;

  if (sistema === 'aleman') {
    // Sistema alemán: capital fijo por cuota, interés sobre saldo
    const capitalFijo = monto / cuotas;
    for (let i = 0; i < cuotas; i++) {
      const fechaCuota = new Date(inicio.getFullYear(), inicio.getMonth() + i * mesesSalto, inicio.getDate());
      const interesCuota = tasaPeriodo ? saldo * tasaPeriodo : 0;
      const cuotaTotal = capitalFijo + interesCuota;
      saldo = Math.max(saldo - capitalFijo, 0);
      filas.push({ num: i+1, fecha: fechaCuota, cuota: cuotaTotal, interes: interesCuota, capital: capitalFijo, saldo });
    }
  } else {
    // Sistema francés: cuota fija
    let montoCuotaFrances = cuotaInput;
    if (!montoCuotaFrances) {
      if (tasaPeriodo) {
        // Fórmula cuota francesa
        montoCuotaFrances = monto * tasaPeriodo / (1 - Math.pow(1 + tasaPeriodo, -cuotas));
      } else {
        montoCuotaFrances = monto / cuotas;
      }
    }
    for (let i = 0; i < cuotas; i++) {
      const fechaCuota = new Date(inicio.getFullYear(), inicio.getMonth() + i * mesesSalto, inicio.getDate());
      const interesCuota = tasaPeriodo ? saldo * tasaPeriodo : 0;
      const capitalCuota = montoCuotaFrances - interesCuota;
      saldo = Math.max(saldo - capitalCuota, 0);
      filas.push({ num: i+1, fecha: fechaCuota, cuota: montoCuotaFrances, interes: interesCuota, capital: capitalCuota, saldo });
    }
  }

  const montoCuota = filas.length ? filas[0].cuota : (cuotaInput || monto / cuotas);
  const totalAPagar = filas.reduce((s, f) => s + f.cuota, 0);
  const interesTotal = totalAPagar - monto;

  const filaHTML = filas.map((f,i) => `
    <tr style="border-bottom:1px solid #f0f0f0;${i===0?'background:#fef8e4;font-weight:600':''}">
      <td style="padding:7px 10px;text-align:center;color:#888">${f.num}</td>
      <td style="padding:7px 10px">${f.fecha.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'})}</td>
      <td style="padding:7px 10px;text-align:right;font-weight:600">${fmtMonto(f.cuota,moneda)}</td>
      <td style="padding:7px 10px;text-align:right;color:#27ae60">${fmtMonto(f.capital,moneda)}</td>
      <td style="padding:7px 10px;text-align:right;color:#c0392b">${fmtMonto(f.interes,moneda)}</td>
      <td style="padding:7px 10px;text-align:right;color:#555">${fmtMonto(f.saldo,moneda)}</td>
    </tr>`).join('');

  document.getElementById('cred-sim-contenido').innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      <div style="background:#f5e6e9;border-radius:9px;padding:10px 16px;flex:1;min-width:120px">
        <div style="font-size:10px;color:#8B1A2F;font-weight:600;text-transform:uppercase">Monto del crédito</div>
        <div style="font-size:18px;font-weight:800;color:#8B1A2F">${fmtMonto(monto,moneda)}</div>
      </div>
      <div style="background:#f8f8f8;border-radius:9px;padding:10px 16px;flex:1;min-width:120px">
        <div style="font-size:10px;color:#555;font-weight:600;text-transform:uppercase">Total a pagar</div>
        <div style="font-size:18px;font-weight:800">${fmtMonto(totalAPagar,moneda)}</div>
      </div>
      <div style="background:#fdecea;border-radius:9px;padding:10px 16px;flex:1;min-width:120px">
        <div style="font-size:10px;color:#c0392b;font-weight:600;text-transform:uppercase">Interés total</div>
        <div style="font-size:18px;font-weight:800;color:#c0392b">${fmtMonto(interesTotal,moneda)}</div>
      </div>
      <div style="background:#e8f5e0;border-radius:9px;padding:10px 16px;flex:1;min-width:120px">
        <div style="font-size:10px;color:#27ae60;font-weight:600;text-transform:uppercase">Cuota ${FREC_LABEL[frecuencia]}</div>
        <div style="font-size:18px;font-weight:800;color:#27ae60">${fmtMonto(montoCuota,moneda)}</div>
      </div>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f4f4f2;border-bottom:2px solid #e0e0dc">
            <th style="padding:8px 10px;text-align:center">#</th>
            <th style="padding:8px 10px;text-align:left">Fecha de pago</th>
            <th style="padding:8px 10px;text-align:right">Cuota</th>
            <th style="padding:8px 10px;text-align:right">Capital</th>
            <th style="padding:8px 10px;text-align:right">Interés</th>
            <th style="padding:8px 10px;text-align:right">Saldo</th>
          </tr>
        </thead>
        <tbody>${filaHTML}</tbody>
        <tfoot>
          <tr style="background:#f4f4f2;font-weight:700;border-top:2px solid #e0e0dc">
            <td colspan="2" style="padding:8px 10px">TOTALES</td>
            <td style="padding:8px 10px;text-align:right">${fmtMonto(totalAPagar,moneda)}</td>
            <td style="padding:8px 10px;text-align:right;color:#27ae60">${fmtMonto(monto,moneda)}</td>
            <td style="padding:8px 10px;text-align:right;color:#c0392b">${fmtMonto(interesTotal,moneda)}</td>
            <td style="padding:8px 10px;text-align:right">—</td>
          </tr>
        </tfoot>
      </table>
    </div>`;

  // Mostrar panel simulación, ocultar form
  document.querySelector('#modal-credito .overflow-y-auto, #modal-credito > div > div:nth-child(2)');
  document.getElementById('cred-sim-panel').style.display = '';
  // Ocultar el panel del form
  document.querySelectorAll('#modal-credito .overflow-y-auto').forEach(el => el.style.display = 'none');
  document.getElementById('cred-sim-panel').style.display = 'flex';
  document.getElementById('cred-sim-panel').style.flexDirection = 'column';
  document.getElementById('cred-btn-simular').style.display = 'none';
  document.getElementById('cred-btn-volver').style.display = '';
  document.getElementById('cred-btn-guardar').style.display = '';
}

function volverFormCredito() {
  document.getElementById('cred-sim-panel').style.display = 'none';
  document.querySelectorAll('#modal-credito .overflow-y-auto').forEach(el => el.style.display = '');
  document.getElementById('cred-btn-simular').style.display = '';
  document.getElementById('cred-btn-volver').style.display = 'none';
  document.getElementById('cred-btn-guardar').style.display = 'none';
}

// ── GUARDAR ──────────────────────────────────────────────────

async function guardarCredito() {
  const banco   = document.getElementById('cred-banco').value.trim();
  const monto   = parseFloat(document.getElementById('cred-monto').value);
  const titular = document.getElementById('cred-titular').value;
  if (!banco || !monto || !titular) { toast('Completá banco, titular y monto'); return; }

  const cuotaInput = parseFloat(document.getElementById('cred-monto-cuota').value);
  const cuotas     = parseInt(document.getElementById('cred-cuotas').value) || null;
  const montoCuota = cuotaInput || (cuotas ? monto/cuotas : null);

  const data = {
    banco,
    titular,
    motivo:           document.getElementById('cred-motivo').value.trim() || null,
    monto_total:      monto,
    moneda:           document.getElementById('cred-moneda').value,
    fecha_inicio:     document.getElementById('cred-fecha').value || null,
    cuotas_total:     cuotas,
    frecuencia_cuota: document.getElementById('cred-frecuencia').value,
    monto_cuota:      montoCuota || null,
    cuotas_pagadas:   parseInt(document.getElementById('cred-cuotas-pagadas').value) || 0,
    tasa_interes:     parseFloat(document.getElementById('cred-tasa').value) || null,
    tipo_tasa:        document.getElementById('cred-tipo-tasa').value,
    sistema:          document.getElementById('cred-sistema').value || 'frances',
    observaciones:    document.getElementById('cred-obs').value.trim() || null,
    otros_gastos:     JSON.stringify(_credGastos),
    activo:           true,
  };

  const id = document.getElementById('cred-id').value;
  const ok = id
    ? await sb('PATCH', 'creditos', data, `?id=eq.${id}`)
    : await sb('POST',  'creditos', data);

  if (!ok) { toast('Error al guardar'); return; }
  toast(id ? 'Crédito actualizado' : 'Crédito guardado');
  cerrarModalCredito();
  cargarCreditos();
}

async function registrarPagoCuota(id, pagadas, total) {
  const nuevas = pagadas + 1;
  if (!confirm(`¿Registrar pago de cuota ${nuevas}/${total}?`)) return;
  await sb('PATCH', 'creditos', { cuotas_pagadas: nuevas }, `?id=eq.${id}`);
  toast(`Cuota ${nuevas} registrada`);
  cargarCreditos();
}

function _htmlCronograma(r) {
  const MESES_FREC = { mensual:1, trimestral:3, semestral:6, anual:12 };
  const mesesSalto = MESES_FREC[r.frecuencia_cuota||'mensual'];
  const inicio     = new Date(r.fecha_inicio + 'T12:00:00');
  const hoy        = new Date(); hoy.setHours(0,0,0,0);
  const pagadas    = r.cuotas_pagadas || 0;

  const cuotas = [];
  for (let i = 0; i < r.cuotas_total; i++) {
    const fecha = new Date(inicio.getFullYear(), inicio.getMonth() + i * mesesSalto, inicio.getDate());
    const vencida  = fecha < hoy && i >= pagadas;
    const pagada   = i < pagadas;
    const proxima  = i === pagadas;
    cuotas.push({ num: i+1, fecha, pagada, vencida, proxima });
  }

  const items = cuotas.map(c => {
    const bg    = c.pagada  ? '#e8f5e0' : c.vencida ? '#fdecea' : c.proxima ? '#fef8e4' : '#f4f4f2';
    const color = c.pagada  ? '#27ae60' : c.vencida ? '#c0392b' : c.proxima ? '#d4a017' : '#888';
    const icon  = c.pagada  ? '✓' : c.vencida ? '!' : c.proxima ? '→' : '○';
    const label = c.pagada  ? 'Pagada' : c.vencida ? 'Vencida' : c.proxima ? 'Próxima' : '';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:100px">
      <div style="background:${bg};border:2px solid ${color};border-radius:8px;padding:10px 10px;text-align:center;width:100%">
        <div style="font-size:14px;font-weight:700;color:${color}">${icon} ${c.num}</div>
        <div style="font-size:12px;color:#555;margin-top:3px">${c.fecha.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'})}</div>
        ${label?`<div style="font-size:11px;color:${color};font-weight:600;margin-top:2px">${label}</div>`:''}
      </div>
      <div style="font-size:12px;color:#555;font-weight:600">${fmtMonto(r.monto_cuota,r.moneda)}</div>
    </div>`;
  }).join('');

  return `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #f0f0f0">
    <div style="font-size:11px;font-weight:600;color:var(--texto-suave);margin-bottom:8px">CRONOGRAMA DE CUOTAS</div>
    <div style="overflow-x:auto;padding-bottom:4px">
      <div style="display:flex;gap:6px;min-width:max-content">${items}</div>
    </div>
  </div>`;
}

async function eliminarCredito(id) {
  if (!confirm('¿Eliminar este crédito definitivamente? Esta acción no se puede deshacer.')) return;
  await sb('DELETE', 'creditos', null, `?id=eq.${id}`);
  toast('Crédito eliminado');
  cargarCreditos();
}

async function toggleActivoCredito(id, activo) {
  if (!confirm(activo ? '¿Marcar como cancelado?' : '¿Reactivar este crédito?')) return;
  await sb('PATCH', 'creditos', { activo: !activo }, `?id=eq.${id}`);
  toast(activo ? 'Crédito cancelado' : 'Crédito reactivado');
  cargarCreditos();
}
