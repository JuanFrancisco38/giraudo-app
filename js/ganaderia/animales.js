async function guardarAnimal() {
  const data = {
    caravana: document.getElementById('ani-caravana').value,
    categoria: document.getElementById('ani-cat').value,
    sexo: document.getElementById('ani-sexo').value,
    raza: document.getElementById('ani-raza').value,
    fecha_nacimiento: document.getElementById('ani-fnac').value || null,
    lote: document.getElementById('ani-lote').value,
    peso_inicial: parseFloat(document.getElementById('ani-peso').value) || null,
    campo: document.getElementById('ani-campo').value,
    propietario: document.getElementById('ani-prop').value,
    observaciones: document.getElementById('ani-obs').value
  };
  const r = await sb('POST', 'animales', data);
  if (r) toast('✅ Animal registrado'); else toast('❌ Error', 'var(--rojo)');
}

async function cargarAnimales() {
  const rows = await sb('GET', 'animales', '', '?order=created_at.desc');
  const tbody = document.getElementById('tabla-animales');
  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">🐄</div><h3>Sin animales registrados</h3></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(a => `
    <tr>
      <td><strong>${a.caravana || '—'}</strong></td>
      <td>${a.categoria}</td>
      <td>${a.raza || '—'}</td>
      <td>${a.lote || '—'}</td>
      <td>${a.peso_inicial ? a.peso_inicial + ' kg' : '—'}</td>
      <td><span class="badge badge-${a.propietario === 'propio' ? 'bordo' : 'blue'}">${a.propietario}</span></td>
    </tr>`).join('');
}

function filtrarAnimales(q) {
  document.querySelectorAll('#tabla-animales tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}
