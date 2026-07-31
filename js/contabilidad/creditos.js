async function cargarCreditos() {
  const cont = document.getElementById('creditos-contenido');
  if (!cont) return;
  cont.innerHTML = '<div style="text-align:center;padding:40px;color:var(--texto-suave)">Cargando...</div>';

  const rows = await sb('GET', 'creditos', '', '?order=created_at.desc') || [];

  if (!rows.length) {
    cont.innerHTML = '<div style="text-align:center;padding:48px;color:var(--texto-suave)">No hay créditos cargados.<br>Usá <strong>+ Nuevo crédito</strong> para agregar uno.</div>';
    return;
  }

  // Tarjetas resumen
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

  const filas = rows.map(r => {
    const saldo = _saldoCredito(r);
    const pct   = r.cuotas_total ? Math.round((r.cuotas_pagadas||0) / r.cuotas_total * 100) : 0;
    const vencidas = _cuotasVencidas(r);
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
            ${r.cuotas_total?`<span>📋 Cuota ${r.cuotas_pagadas||0}/${r.cuotas_total}</span>`:''}
            ${r.monto_cuota?`<span>💵 ${fmtMonto(r.monto_cuota, r.moneda)} / cuota</span>`:''}
          </div>
          ${r.cuotas_total ? `<div style="margin-top:8px">
            <div style="background:#eee;border-radius:20px;height:6px;overflow:hidden">
              <div style="background:${pct>=100?'#27ae60':'#8B1A2F'};height:100%;width:${pct}%;transition:width .3s;border-radius:20px"></div>
            </div>
            <div style="font-size:10px;color:var(--texto-suave);margin-top:2px">${pct}% pagado</div>
          </div>` : ''}
        </div>
        <div style="text-align:right;min-width:140px">
          <div style="font-size:11px;color:var(--texto-suave)">Saldo pendiente</div>
          <div style="font-size:20px;font-weight:800;color:${r.activo?'#8B1A2F':'#999'}">${fmtMonto(saldo, r.moneda)}</div>
          <div style="font-size:11px;color:var(--texto-suave);margin-top:1px">de ${fmtMonto(r.monto_total, r.moneda)}</div>
          <div style="display:flex;gap:6px;margin-top:10px;justify-content:flex-end;flex-wrap:wrap">
            ${r.cuotas_total && (r.cuotas_pagadas||0) < r.cuotas_total ? `<button class="btn btn-secondary" style="font-size:11px;padding:4px 10px" onclick="registrarPagoCuota('${r.id}',${r.cuotas_pagadas||0},${r.cuotas_total})">✓ Pagar cuota</button>` : ''}
            <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px" onclick="abrirModalCredito('${r.id}')">✏ Editar</button>
            <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;color:#c0392b" onclick="toggleActivoCredito('${r.id}',${r.activo})">${r.activo?'🗑 Cancelar':'↩ Reactivar'}</button>
          </div>
        </div>
      </div>
      ${r.observaciones?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0;font-size:11px;color:var(--texto-suave)">📝 ${r.observaciones}</div>`:''}
    </div>`;
  }).join('');

  cont.innerHTML = resumen + filas;
}

function _saldoCredito(r) {
  if (!r.cuotas_total || !r.monto_cuota) {
    // Sin cuotas: mostrar monto total
    return r.monto_total || 0;
  }
  const restantes = Math.max((r.cuotas_total) - (r.cuotas_pagadas||0), 0);
  return restantes * r.monto_cuota;
}

function _cuotasVencidas(r) {
  if (!r.fecha_inicio || !r.cuotas_total || !r.monto_cuota) return 0;
  const inicio = new Date(r.fecha_inicio + 'T12:00:00');
  const hoy    = new Date(); hoy.setHours(0,0,0,0);
  const mesesTranscurridos = Math.floor((hoy - inicio) / (1000*60*60*24*30.5));
  const deberiaPagar = Math.min(mesesTranscurridos, r.cuotas_total);
  return Math.max(deberiaPagar - (r.cuotas_pagadas||0), 0);
}

// ── MODAL ────────────────────────────────────────────────────

async function abrirModalCredito(id) {
  document.getElementById('modal-credito').style.display = 'flex';
  document.getElementById('cred-id').value = '';
  document.getElementById('cred-banco').value = '';
  document.getElementById('cred-titular').value = 'Giraudo SH';
  document.getElementById('cred-motivo').value = '';
  document.getElementById('cred-monto').value = '';
  document.getElementById('cred-fecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('cred-moneda').value = 'ARS';
  document.getElementById('cred-cuotas').value = '';
  document.getElementById('cred-monto-cuota').value = '';
  document.getElementById('cred-cuotas-pagadas').value = '0';
  document.getElementById('cred-tasa').value = '';
  document.getElementById('cred-tipo-tasa').value = 'TNA';
  document.getElementById('cred-obs').value = '';
  document.getElementById('modal-credito-titulo').textContent = '🏦 Nuevo crédito';
  document.getElementById('cred-resumen').style.display = 'none';

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
    document.getElementById('cred-monto-cuota').value   = r.monto_cuota||'';
    document.getElementById('cred-cuotas-pagadas').value= r.cuotas_pagadas||0;
    document.getElementById('cred-tasa').value          = r.tasa_interes||'';
    document.getElementById('cred-tipo-tasa').value     = r.tipo_tasa||'TNA';
    document.getElementById('cred-obs').value           = r.observaciones||'';
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

  // Si hay monto y cuotas pero no monto_cuota, calcular cuota simple
  if (monto && cuotas && !cuotaV) {
    document.getElementById('cred-monto-cuota').placeholder = fmtMonto(monto/cuotas, moneda);
  }

  if (!monto || !cuotas) { res.style.display = 'none'; return; }
  const montoCuota = cuotaV || monto/cuotas;
  const totalAPagar = montoCuota * cuotas;
  const interesTotal = totalAPagar - monto;

  res.style.display = 'flex';
  res.innerHTML = `
    <div><div style="font-size:10px;color:#888">Cuota estimada</div><div style="font-weight:700">${fmtMonto(montoCuota,moneda)}</div></div>
    <div><div style="font-size:10px;color:#888">Total a pagar</div><div style="font-weight:700">${fmtMonto(totalAPagar,moneda)}</div></div>
    <div><div style="font-size:10px;color:#888">Interés total</div><div style="font-weight:700;color:${interesTotal>0?'#c0392b':'#27ae60'}">${fmtMonto(Math.abs(interesTotal),moneda)}</div></div>
  `;
}

async function guardarCredito() {
  const banco  = document.getElementById('cred-banco').value.trim();
  const monto  = parseFloat(document.getElementById('cred-monto').value);
  const titular= document.getElementById('cred-titular').value;
  if (!banco || !monto || !titular) { toast('Completá banco, titular y monto'); return; }

  const cuotaInput = parseFloat(document.getElementById('cred-monto-cuota').value);
  const cuotas     = parseInt(document.getElementById('cred-cuotas').value) || null;
  const montoCuota = cuotaInput || (cuotas ? monto/cuotas : null);

  const data = {
    banco,
    titular,
    motivo:          document.getElementById('cred-motivo').value.trim() || null,
    monto_total:     monto,
    moneda:          document.getElementById('cred-moneda').value,
    fecha_inicio:    document.getElementById('cred-fecha').value || null,
    cuotas_total:    cuotas,
    monto_cuota:     montoCuota || null,
    cuotas_pagadas:  parseInt(document.getElementById('cred-cuotas-pagadas').value) || 0,
    tasa_interes:    parseFloat(document.getElementById('cred-tasa').value) || null,
    tipo_tasa:       document.getElementById('cred-tipo-tasa').value,
    observaciones:   document.getElementById('cred-obs').value.trim() || null,
    activo:          true,
  };

  const id = document.getElementById('cred-id').value;
  let ok;
  if (id) {
    ok = await sb('PATCH', 'creditos', data, `?id=eq.${id}`);
  } else {
    ok = await sb('POST', 'creditos', data);
  }
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

async function toggleActivoCredito(id, activo) {
  const msg = activo ? '¿Marcar este crédito como cancelado?' : '¿Reactivar este crédito?';
  if (!confirm(msg)) return;
  await sb('PATCH', 'creditos', { activo: !activo }, `?id=eq.${id}`);
  toast(activo ? 'Crédito cancelado' : 'Crédito reactivado');
  cargarCreditos();
}
