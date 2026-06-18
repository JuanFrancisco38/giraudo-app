async function guardarMaquina() {
  const data = {
    nombre: document.getElementById('maq-nombre').value,
    marca: document.getElementById('maq-marca').value,
    anio: parseInt(document.getElementById('maq-anio').value) || null,
    horas_uso: parseFloat(document.getElementById('maq-horas').value) || null
  };
  const r = await sb('POST', 'maquinaria', data);
  if (r) { toast('✅ Máquina registrada'); toggleForm('form-maq'); }
  else toast('❌ Error', 'var(--rojo)');
}

async function guardarMantenimiento() {
  const data = {
    fecha: document.getElementById('mant-fecha').value,
    descripcion: `${document.getElementById('mant-maq').value}: ${document.getElementById('mant-desc').value}`,
    horas_maquina: parseFloat(document.getElementById('mant-horas').value) || null,
    costo: parseFloat(document.getElementById('mant-costo').value) || null
  };
  const r = await sb('POST', 'mantenimiento', data);
  if (r) {
    toast('✅ Mantenimiento registrado');
    const tbody = document.getElementById('tabla-mant');
    const wasEmpty = tbody.innerHTML.includes('empty-state');
    const row = `<tr>
      <td>${data.fecha}</td>
      <td>${document.getElementById('mant-maq').value}</td>
      <td>${data.horas_maquina || '—'}</td>
      <td>${document.getElementById('mant-desc').value}</td>
      <td>${data.costo ? '$' + Math.round(data.costo).toLocaleString() : '—'}</td>
    </tr>`;
    tbody.innerHTML = wasEmpty ? row : row + tbody.innerHTML;
    toggleForm('form-mant');
  } else toast('❌ Error', 'var(--rojo)');
}
