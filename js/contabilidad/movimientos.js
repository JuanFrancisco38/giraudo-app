async function guardarMovimiento() {
  const data = {
    fecha: document.getElementById('mov-fecha').value,
    tipo: document.getElementById('mov-tipo').value,
    concepto: document.getElementById('mov-concepto').value,
    campo: document.getElementById('mov-campo')?.value || null,
    categoria: document.getElementById('mov-cat').value,
    monto: parseFloat(document.getElementById('mov-importe').value) || null,
    medio_pago: document.getElementById('mov-comp').value,
    observaciones: document.getElementById('mov-prov').value
  };
  const r = await sb('POST', 'movimientos', data);
  if (r) {
    toast('✅ Movimiento registrado');
    toggleForm('form-mov');
    const tbody = document.getElementById('tabla-movimientos');
    const color = data.tipo === 'Ingreso' ? 'green' : 'red';
    const wasEmpty = tbody.innerHTML.includes('empty-state');
    const row = `<tr>
      <td>${fmtFecha(data.fecha)}</td>
      <td><span class="badge badge-${color}">${data.tipo}</span></td>
      <td>${data.categoria}</td>
      <td>${data.observaciones || '—'}</td>
      <td>${data.medio_pago || '—'}</td>
      <td style="font-weight:600;color:var(--${color === 'green' ? 'verde' : 'rojo'})">${data.tipo === 'Ingreso' ? '+' : '−'}${fmtMonto(data.monto, 'ARS')}</td>
    </tr>`;
    tbody.innerHTML = wasEmpty ? row : row + tbody.innerHTML;
  } else toast('❌ Error', 'var(--rojo)');
}
