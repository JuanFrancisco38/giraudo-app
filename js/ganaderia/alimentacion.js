async function guardarAlimentacion() {
  const data = {
    tipo: 'alimentacion',
    fecha: document.getElementById('ali-fecha').value,
    campo: document.getElementById('ali-campo').value,
    lote: document.getElementById('ali-lote').value,
    descripcion: document.getElementById('ali-base').value,
    detalle: {
      cantidad_animales: document.getElementById('ali-cant').value,
      suplemento: document.getElementById('ali-sup').value,
      kg_animal_dia: document.getElementById('ali-kg').value,
      observaciones: document.getElementById('ali-obs').value
    }
  };
  const r = await sb('POST', 'trabajos_agricolas', data);
  if (r) { toast('✅ Dieta registrada'); toggleForm('form-ali'); }
  else toast('❌ Error', 'var(--rojo)');
}
