// Módulo de ciclos reproductivos — solo lectura, sin HTML.
// Requiere que serviciosAnimal, animalesRodeo y campanias sean globales (manga.js).

const DIAS_GESTACION = 270;

// ── Helpers de madre/cría ─────────────────────────────────────────────────────

function madreDe(cria) {
  if (!cria) return null;
  // Primero por id directo (columna nueva)
  if (cria.madre_id) return animalesRodeo.find(a => a.id === cria.madre_id) || null;
  // Fallback por texto de caravana
  const ref = cria.caravana_madre;
  if (!ref) return null;
  return animalesRodeo.find(a => a.caravana_interna === ref || a.caravana_electronica === ref) || null;
}

function criasDe(animal) {
  if (!animal) return [];
  // Por id directo
  const porId = animalesRodeo.filter(a => a.madre_id === animal.id);
  if (porId.length) return porId;
  // Fallback por texto
  const ref = animal.caravana_interna || animal.caravana_electronica;
  if (!ref) return [];
  return animalesRodeo.filter(a => a.caravana_madre === ref);
}

// ── Crías actualmente lactantes ───────────────────────────────────────────────

function criasLactantes(animal) {
  return criasDe(animal).filter(c =>
    c.activo !== false &&
    (c.categoria === 'Ternero' || c.categoria === 'Ternera')
  );
}

// ── Campaña de un servicio ────────────────────────────────────────────────────

function campaniaDeServicio(fechaServicio) {
  if (!fechaServicio) return null;
  const fSrv = new Date(fechaServicio);
  // Campaña más reciente cuyo fecha_inicio_servicio <= fecha del servicio
  const candidatas = campanias
    .filter(c => c.fecha_inicio_servicio && new Date(c.fecha_inicio_servicio) <= fSrv)
    .sort((a, b) => new Date(b.fecha_inicio_servicio) - new Date(a.fecha_inicio_servicio));
  return candidatas[0] || null;
}

// ── Ciclos de un animal ───────────────────────────────────────────────────────

function ciclosDeAnimal(animalId) {
  const animal = animalesRodeo.find(a => a.id === animalId);
  if (!animal) return [];

  // Ordenar cronológicamente (más antiguo primero)
  const srvs = serviciosAnimal
    .filter(s => s.animal_id === animalId)
    .slice()
    .sort((a, b) => {
      const da = new Date(a.fecha), db = new Date(b.fecha);
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

  return ciclos.map(c => {
    const ultimoTacto = c.tactos.length ? c.tactos[c.tactos.length - 1] : null;
    const resultado = ultimoTacto?.resultado || c.srv.resultado || 'Pendiente';

    // fecha_parto: puede estar en cualquier fila del ciclo
    const filaConParto = c.filas.find(f => f.fecha_parto);
    const fechaParto = filaConParto?.fecha_parto || null;

    // cria_id guardado
    const filaConCria = c.filas.find(f => f.cria_id);
    const criaById = filaConCria ? animalesRodeo.find(a => a.id === filaConCria.cria_id) : null;

    // Inferir cría por ventana de fechas (180-340 días del servicio)
    let criaInferida = null;
    let partoInferido = false;
    if (!fechaParto && c.srv.fecha) {
      const fSrv = new Date(c.srv.fecha);
      criaInferida = todasCrias.find(cria => {
        if (!cria.fecha_nacimiento) return false;
        const dias = (new Date(cria.fecha_nacimiento) - fSrv) / 86400000;
        return dias >= 180 && dias <= 340;
      }) || null;
      if (criaInferida) partoInferido = true;
    }

    const cria = criaById || criaInferida;
    const fechaPartoEfectiva = fechaParto || (partoInferido && cria?.fecha_nacimiento ? cria.fecha_nacimiento : null);

    // Estado de gestación
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
      // Inferir cierre: si la cría ya no es ternero/ternera activo → considerarla destetada
      if (cria) {
        const criaSigueAlPie = cria.activo !== false && (cria.categoria === 'Ternero' || cria.categoria === 'Ternera');
        if (!criaSigueAlPie) {
          cierreInferido = true;
          motivoCierre = cria.activo === false ? 'Cría muerta o vendida' : 'Destete';
        }
      }
      // Si no hay cría vinculada: no inferir cierre, el ciclo sigue en lactancia
    }

    const fase = enGestacion ? 'gestacion'
      : (estado === 'parto' && !fechaCierre && !cierreInferido) ? 'lactancia'
      : 'cerrado';

    // fpp
    let fpp = null;
    if (c.srv.fecha && !(c.srv.metodo === 'Toro suelto' && c.srv.meses_gestacion_tacto == null)) {
      const fSrv = new Date(c.srv.fecha);
      fpp = new Date(fSrv.getTime() + DIAS_GESTACION * 86400000);
    }

    const diasGest   = c.srv.fecha ? Math.floor((hoy - new Date(c.srv.fecha)) / 86400000) : null;
    const diasParaParto = fpp ? Math.floor((fpp - hoy) / 86400000) : null;

    // Campaña
    const campObj = c.srv.campania_id
      ? campanias.find(ca => ca.id === c.srv.campania_id)
      : campaniaDeServicio(c.srv.fecha);

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

  // El ciclo más nuevo = el último en orden cronológico
  const ciclo = ciclos[ciclos.length - 1];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const fmtD = f => {
    if (!f) return '—';
    const d = new Date(f);
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + String(d.getFullYear()).slice(-2);
  };

  switch (ciclo.estado) {
    case 'parto': {
      const diasDesde = ciclo.fechaPartoEfectiva ? Math.floor((hoy - new Date(ciclo.fechaPartoEfectiva)) / 86400000) : null;
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
