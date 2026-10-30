// Módulo de ciclos reproductivos — solo lectura, sin HTML.
// Requiere que serviciosAnimal, animalesRodeo, criasInactivas y campanias sean globales (manga.js).

const DIAS_GESTACION = 270;

// ── Helper de fechas locales (evita desfase UTC en strings YYYY-MM-DD) ────────

function fechaLocal(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const parts = s.split('-');
  if (parts.length === 3) return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  return new Date(s);
}

// ── Helpers de madre/cría ─────────────────────────────────────────────────────

function madreDe(cria) {
  if (!cria) return null;
  if (cria.madre_id) return animalesRodeo.find(a => a.id === cria.madre_id) || null;
  const ref = cria.caravana_madre;
  if (!ref) return null;
  return animalesRodeo.find(a => a.caravana_interna === ref || a.caravana_electronica === ref) || null;
}

function criasDe(animal) {
  if (!animal) return [];
  // Activas: por id directo
  const porId = animalesRodeo.filter(a => a.madre_id === animal.id);
  // Activas: por caravana
  const ref = animal.caravana_interna || animal.caravana_electronica;
  const porCaravana = ref ? animalesRodeo.filter(a => a.caravana_madre === ref) : [];
  // Inactivas: por caravana (solo las que tienen caravana_madre, sin madre_id aún)
  const inactPorCaravana = ref
    ? (typeof criasInactivas !== 'undefined' ? criasInactivas : []).filter(a => a.caravana_madre === ref)
    : [];
  // Unión sin repetidos
  const ids = new Set(porId.map(a => a.id));
  const union = [...porId];
  for (const a of [...porCaravana, ...inactPorCaravana]) {
    if (!ids.has(a.id)) { ids.add(a.id); union.push(a); }
  }
  return union;
}

// ── Crías actualmente lactantes ───────────────────────────────────────────────

function criasLactantes(animal) {
  const ciclos = ciclosDeAnimal(animal.id);
  const criaIdsEnLactancia = new Set(
    ciclos.filter(c => c.fase === 'lactancia' && c.cria)
          .map(c => c.cria.id)
  );
  return criasDe(animal).filter(c =>
    c.activo !== false &&
    (c.categoria === 'Ternero' || c.categoria === 'Ternera') &&
    criaIdsEnLactancia.has(c.id)
  );
}

// ── Campaña de un servicio (filtra por rodeo del animal) ─────────────────────

function campaniaDeServicio(fechaServicio, rodeoId) {
  if (!fechaServicio) return null;
  const fSrv = fechaLocal(fechaServicio);
  const candidatas = campanias
    .filter(c => {
      if (!c.fecha_inicio_servicio) return false;
      if (rodeoId && c.rodeo_id && c.rodeo_id !== rodeoId) return false;
      return fechaLocal(c.fecha_inicio_servicio) <= fSrv;
    })
    .sort((a, b) => fechaLocal(b.fecha_inicio_servicio) - fechaLocal(a.fecha_inicio_servicio));
  return candidatas[0] || null;
}

// ── Ciclos de un animal ───────────────────────────────────────────────────────

function ciclosDeAnimal(animalId) {
  const animal = animalesRodeo.find(a => a.id === animalId);
  if (!animal) return [];

  const srvs = serviciosAnimal
    .filter(s => s.animal_id === animalId)
    .slice()
    .sort((a, b) => {
      const da = fechaLocal(a.fecha), db = fechaLocal(b.fecha);
      if (da - db !== 0) return da - db;
      return (a.created_at || '') < (b.created_at || '') ? -1 : 1;
    });

  // Agrupar: cada no-Tacto abre ciclo; Tacto se adhiere al anterior
  const ciclos = [];
  for (const s of srvs) {
    const esTacto = (s.metodo || '').toLowerCase() === 'tacto';
    if (!esTacto || !ciclos.length) {
      const nuevo = { srv: s, tactos: [], filas: [s] };
      if (esTacto) nuevo.tactos.push(s);
      ciclos.push(nuevo);
    } else {
      ciclos[ciclos.length - 1].tactos.push(s);
      ciclos[ciclos.length - 1].filas.push(s);
    }
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const todasCrias = criasDe(animal);

  // ── Pre-asignación de crías: cada cría va al ciclo más apropiado ──────────
  // Solo ciclos cuyo resultado permite parto (Preñada o Pendiente o sin tacto)
  const puedeSerParto = c => {
    const ultimoTacto = c.tactos.length ? c.tactos[c.tactos.length - 1] : null;
    const res = ultimoTacto?.resultado || c.srv.resultado || 'Pendiente';
    return res === 'Preñada' || res === 'Pendiente';
  };

  // Mapa cria.id → ciclo asignado (índice en ciclos[])
  const criaAsignada = new Map(); // cria.id → índice

  for (const cria of todasCrias) {
    if (!cria.fecha_nacimiento) continue;
    const fNac = fechaLocal(cria.fecha_nacimiento);
    // Candidatos: ciclos que pueden ser parto y cuya ventana incluye la fecha
    const candidatos = ciclos
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => {
        if (!puedeSerParto(c) || !c.srv.fecha) return false;
        // Si ya hay cria_id guardado en alguna fila de este ciclo, no inferir
        if (c.filas.some(f => f.cria_id)) return false;
        const fSrv = fechaLocal(c.srv.fecha);
        const dias = (fNac - fSrv) / 86400000;
        return dias >= 180 && dias <= 340;
      });
    if (!candidatos.length) continue;
    // Si solo hay uno, asignar directo
    // Si hay varios, preferir el que tenga resultado Preñada; si empatan, el más nuevo (mayor índice)
    let elegido = candidatos[0];
    if (candidatos.length > 1) {
      const preñados = candidatos.filter(({ c }) => {
        const ut = c.tactos.length ? c.tactos[c.tactos.length - 1] : null;
        return (ut?.resultado || c.srv.resultado) === 'Preñada';
      });
      if (preñados.length) {
        elegido = preñados[preñados.length - 1]; // más nuevo entre los Preñada
      } else {
        elegido = candidatos[candidatos.length - 1]; // más nuevo en general
      }
    }
    criaAsignada.set(cria.id, elegido.i);
  }

  return ciclos.map((c, idx) => {
    const ultimoTacto = c.tactos.length ? c.tactos[c.tactos.length - 1] : null;
    const resultado = ultimoTacto?.resultado || c.srv.resultado || 'Pendiente';

    const filaConParto = c.filas.find(f => f.fecha_parto);
    const fechaParto = filaConParto?.fecha_parto || null;

    const filaConCria = c.filas.find(f => f.cria_id);
    const criaById = filaConCria
      ? (animalesRodeo.find(a => a.id === filaConCria.cria_id) ||
         (typeof criasInactivas !== 'undefined' ? criasInactivas.find(a => a.id === filaConCria.cria_id) : null))
      : null;

    // Cría inferida: solo si este ciclo tiene parto posible y se le asignó una
    let criaInferida = null;
    let partoInferido = false;
    if (!fechaParto && !filaConCria && puedeSerParto(c)) {
      const criaPre = todasCrias.find(cr => criaAsignada.get(cr.id) === idx) || null;
      if (criaPre) { criaInferida = criaPre; partoInferido = true; }
    }

    const cria = criaById || criaInferida;
    const fechaPartoEfectiva = fechaParto ||
      (partoInferido && cria?.fecha_nacimiento ? cria.fecha_nacimiento : null);

    // Estado
    let estado;
    if (fechaPartoEfectiva || partoInferido) estado = 'parto';
    else if (resultado === 'Abortó')          estado = 'aborto';
    else if (resultado === 'Vacía' || resultado === 'Repetidora') estado = 'vacia';
    else if (resultado === 'Preñada')         estado = 'preñada';
    else                                      estado = 'pendiente';

    const enGestacion = estado === 'preñada' || estado === 'pendiente';

    // Cierre
    let fechaCierre = c.srv.fecha_cierre || null;
    let motivoCierre = c.srv.motivo_cierre || null;
    let cierreInferido = false;

    if (estado === 'aborto') {
      const fTacto = ultimoTacto?.fecha_tacto || ultimoTacto?.fecha || c.srv.fecha_tacto || c.srv.fecha;
      fechaCierre = fechaCierre || fTacto;
      motivoCierre = motivoCierre || 'Aborto';
    } else if (estado === 'vacia') {
      const fTacto = ultimoTacto?.fecha_tacto || ultimoTacto?.fecha || c.srv.fecha_tacto || c.srv.fecha;
      fechaCierre = fechaCierre || fTacto;
      motivoCierre = motivoCierre || 'Vacía';
    } else if (estado === 'parto' && !fechaCierre) {
      if (cria) {
        const criaSigueAlPie = cria.activo !== false && (cria.categoria === 'Ternero' || cria.categoria === 'Ternera');
        if (!criaSigueAlPie) {
          cierreInferido = true;
          motivoCierre = cria.activo === false ? 'Cría muerta o vendida' : 'Destete';
        }
      }
    }

    const fase = enGestacion ? 'gestacion'
      : (estado === 'parto' && !fechaCierre && !cierreInferido) ? 'lactancia'
      : 'cerrado';

    // fpp
    let fpp = null;
    if (c.srv.fecha && !(c.srv.metodo === 'Toro suelto' && c.srv.meses_gestacion_tacto == null)) {
      const fSrv = fechaLocal(c.srv.fecha);
      fpp = new Date(fSrv.getTime() + DIAS_GESTACION * 86400000);
    }

    const diasGest   = c.srv.fecha ? Math.floor((hoy - fechaLocal(c.srv.fecha)) / 86400000) : null;
    const diasParaParto = fpp ? Math.floor((fpp - hoy) / 86400000) : null;

    const campObj = c.srv.campania_id
      ? campanias.find(ca => ca.id === c.srv.campania_id)
      : campaniaDeServicio(c.srv.fecha, animal.rodeo_id);

    return {
      id:            c.srv.id,
      srv:           c.srv,
      tactos:        c.tactos,
      filas:         c.filas,
      fechaServicio: c.srv.fecha,
      resultado,
      fechaParto,
      fechaPartoEfectiva,
      cria,
      partoInferido,
      estado,
      enGestacion,
      fase,
      fechaCierre,
      motivoCierre,
      cierreInferido,
      fpp,
      diasGest,
      diasParaParto,
      campaniaId: campObj?.id || null,
    };
  });
}

// ── Estado reproductivo de la vaca (solo del ciclo más nuevo) ─────────────────

function estadoReproductivo(animalId) {
  const ciclos = ciclosDeAnimal(animalId);
  if (!ciclos.length) return { etiqueta: 'Sin registro', ciclo: null, vencida: false, detalle: '' };

  const ciclo = ciclos[ciclos.length - 1];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const fmtD = f => {
    if (!f) return '—';
    const d = fechaLocal(f);
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + String(d.getFullYear()).slice(-2);
  };

  switch (ciclo.estado) {
    case 'parto': {
      const diasDesde = ciclo.fechaPartoEfectiva ? Math.floor((hoy - fechaLocal(ciclo.fechaPartoEfectiva)) / 86400000) : null;
      const detalle = ciclo.fechaPartoEfectiva
        ? `Parió ${fmtD(ciclo.fechaPartoEfectiva)} · hace ${diasDesde} días${ciclo.partoInferido ? ' · sin confirmar' : ''}`
        : '';
      return { etiqueta: 'Vacía', ciclo, vencida: false, detalle, partoSinConfirmar: ciclo.partoInferido };
    }
    case 'aborto':
      return { etiqueta: 'Abortó', ciclo, vencida: false, detalle: '' };
    case 'vacia':
      return { etiqueta: 'Vacía', ciclo, vencida: false, detalle: '' };
    case 'preñada': {
      const vencida = ciclo.fpp ? (hoy > ciclo.fpp) : false;
      return { etiqueta: 'Preñada', ciclo, vencida, detalle: '' };
    }
    case 'pendiente':
      return { etiqueta: 'Pendiente', ciclo, vencida: false, detalle: '' };
    default:
      return { etiqueta: 'Sin registro', ciclo, vencida: false, detalle: '' };
  }
}

// Compatibilidad: reemplaza la función vieja en manga.js
function estadoReprodAnimal(animalId) {
  return estadoReproductivo(animalId).etiqueta;
}
