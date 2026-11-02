// Tests para madrePorTexto, madreDe y criasDe (fix caravanas repetidas)
const fs = require('fs');
eval(fs.readFileSync(__dirname + '/../js/ganaderia/ciclos.js', 'utf8'));

let passed = 0, failed = 0;
function assert(label, got, expected) {
  if (got === expected) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label} — esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`); failed++; }
}

// ─── Setup base ──────────────────────────────────────────────────────────────
criasInactivas = []; campanias = []; serviciosAnimal = [];

// ─── Caso 1: caravana única → resuelve normalmente ────────────────────────────
console.log('\nCaso 1: caravana única → resuelve normalmente');
animalesRodeo = [
  { id: 'v1', sexo: 'Hembra', categoria: 'Vaca', rodeo_id: 'r1', caravana_interna: '100', caravana_electronica: null }
];
_rebuildMadreIdx();
const cria1 = { id: 'c1', caravana_madre: '100', madre_id: null, rodeo_id: 'r1' };
assert('madrePorTexto resuelve', madrePorTexto(cria1)?.id, 'v1');
assert('madreDe resuelve', madreDe(cria1)?.id, 'v1');

// ─── Caso 2: macho con misma caravana → no cuenta ────────────────────────────
console.log('\nCaso 2: macho con misma caravana → no cuenta como madre');
animalesRodeo = [
  { id: 't1', sexo: 'Macho', categoria: 'Toro', rodeo_id: 'r1', caravana_interna: '101', caravana_electronica: null },
  { id: 'v2', sexo: 'Hembra', categoria: 'Vaca', rodeo_id: 'r2', caravana_interna: '101', caravana_electronica: null }
];
_rebuildMadreIdx();
const cria2 = { id: 'c2', caravana_madre: '101', madre_id: null, rodeo_id: 'r2' };
assert('madrePorTexto solo hembra', madrePorTexto(cria2)?.id, 'v2');
assert('madreDe solo hembra', madreDe(cria2)?.id, 'v2');

// ─── Caso 3: dos hembras con misma caravana, cría en r1 → prefiere r1 ────────
console.log('\nCaso 3: dos hembras misma caravana, cría en r1 → prefiere r1');
animalesRodeo = [
  { id: 'vA', sexo: 'Hembra', categoria: 'Vaca', rodeo_id: 'r1', caravana_interna: '200', caravana_electronica: null },
  { id: 'vB', sexo: 'Hembra', categoria: 'Vaca', rodeo_id: 'r2', caravana_interna: '200', caravana_electronica: null }
];
_rebuildMadreIdx();
const criaR1 = { id: 'c3', caravana_madre: '200', madre_id: null, rodeo_id: 'r1' };
assert('mismo rodeo gana', madrePorTexto(criaR1)?.id, 'vA');

// ─── Caso 4: dos hembras misma caravana, cría sin rodeo coincidente → null ───
console.log('\nCaso 4: dos hembras misma caravana, cría en r3 → null (ambigua)');
const criaR3 = { id: 'c4', caravana_madre: '200', madre_id: null, rodeo_id: 'r3' };
assert('ambigua devuelve null', madrePorTexto(criaR3), null);

// ─── Caso 5: criasDe no incluye cría de toro con misma caravana ───────────────
console.log('\nCaso 5: criasDe excluye cría que pertenece al toro con misma caravana');
animalesRodeo = [
  { id: 't5', sexo: 'Macho', categoria: 'Toro', rodeo_id: 'r1', caravana_interna: '101', caravana_electronica: null },
  { id: 'v5', sexo: 'Hembra', categoria: 'Vaca', rodeo_id: 'r2', caravana_interna: '101', caravana_electronica: null },
  { id: 'c5', sexo: 'Hembra', categoria: 'Ternera', activo: true, rodeo_id: 'r2',
    madre_id: null, caravana_madre: '101' }
];
_rebuildMadreIdx();
const criasDeToro = criasDe(animalesRodeo.find(a => a.id === 't5'));
const criasDeVaca = criasDe(animalesRodeo.find(a => a.id === 'v5'));
assert('toro no tiene crías', criasDeToro.length, 0);
assert('vaca tiene la cría', criasDeVaca.length, 1);
assert('cría correcta', criasDeVaca[0]?.id, 'c5');

// ─── Caso 6: madre_id directo siempre prevalece ──────────────────────────────
console.log('\nCaso 6: madre_id directo prevalece sobre texto');
animalesRodeo = [
  { id: 'v6', sexo: 'Hembra', categoria: 'Vaca', rodeo_id: 'r1', caravana_interna: '300', caravana_electronica: null }
];
_rebuildMadreIdx();
const criaConId = { id: 'c6', caravana_madre: '999', madre_id: 'v6', rodeo_id: 'r1' };
assert('madreDe usa madre_id', madreDe(criaConId)?.id, 'v6');
assert('madrePorTexto es null (tiene madre_id)', madrePorTexto(criaConId), null);

// ─── Resultado ───────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} pruebas: ${passed} ✅  ${failed} ❌`);
process.exit(failed ? 1 : 0);
