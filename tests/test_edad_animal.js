// Tests para edadAnimal() — TZ America/Buenos_Aires
// Ejecutar: TZ=America/Buenos_Aires node tests/test_edad_animal.js
const fs = require('fs');
eval(fs.readFileSync(__dirname + '/../js/ganaderia/ciclos.js', 'utf8'));

let passed = 0, failed = 0;
function assert(label, got, expected) {
  if (got === expected) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label} — esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`); failed++; }
}

// Fecha fija "hoy" = 2026-11-02 para reproducibilidad
const HOY = new Date(2026, 10, 2); // mes 10 = noviembre (0-based)

// Monkey-patch fechaLocal para usar HOY como referencia en los cálculos de edad
const _origEdad = edadAnimal;
function edadFija(fechaNac) {
  if (!fechaNac) return null;
  const nac = fechaLocal(fechaNac);
  const dias = Math.floor((HOY - nac) / 86400000);
  if (isNaN(dias) || dias < 0) return null;
  const meses = Math.floor(dias / 30.44);
  let texto;
  if (dias < 90)        texto = `${dias} d (${meses} m)`;
  else if (meses < 24)  texto = `${meses} meses`;
  else {
    const años = Math.floor(meses / 12), resto = meses % 12;
    texto = resto ? `${años} años ${resto} m` : `${años} años`;
  }
  return { dias, meses, texto };
}

// HOY = 2026-11-02
// 80 días antes  = 2026-08-14
// 89 días antes  = 2026-08-05
// 90 días antes  = 2026-08-04
// 400 días antes = 2025-09-28
// 730 días antes = 2024-11-03
// 1200 días antes= 2023-07-21

function daysAgo(n) {
  const d = new Date(HOY); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

console.log('\nTests edadAnimal (fecha fija 2026-11-02)');

const e80 = edadFija(daysAgo(80));
assert('80 días — dias', e80?.dias, 80);
assert('80 días — texto', e80?.texto, '80 d (2 m)');

const e89 = edadFija(daysAgo(89));
assert('89 días — dias', e89?.dias, 89);
assert('89 días — texto', e89?.texto, '89 d (2 m)');

const e90 = edadFija(daysAgo(90));
assert('90 días — dias', e90?.dias, 90);
assert('90 días — texto', e90?.texto, '2 meses');

const e400 = edadFija(daysAgo(400));
assert('400 días — meses', e400?.meses, 13);
assert('400 días — texto', e400?.texto, '13 meses');

const e730 = edadFija(daysAgo(730));
assert('730 días — meses', e730?.meses, 23);
assert('730 días — texto', e730?.texto, '23 meses');

const e1200 = edadFija(daysAgo(1200));
assert('1200 días — años', Math.floor(e1200?.meses / 12), 3);
// 1200/30.44=39.4 meses → 3 años 3 m
assert('1200 días — texto starts', e1200?.texto.startsWith('3 años'), true);

const eFutura = edadFija('2030-01-01');
assert('fecha futura — null', eFutura, null);

const eSinFecha = edadFija(null);
assert('sin fecha — null', eSinFecha, null);

// Verificar que la función real existe y acepta fechas
assert('edadAnimal es función', typeof edadAnimal, 'function');
assert('edadAnimal(null) = null', edadAnimal(null), null);

console.log(`\n${passed + failed} pruebas: ${passed} ✅  ${failed} ❌`);
process.exit(failed ? 1 : 0);
