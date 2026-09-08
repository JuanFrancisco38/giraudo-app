// ── SUELDOS ──────────────────────────────────────────────────────────────────
let sueldosEmpleados = [];
let sueldosEmpSel    = null;
let sueldosMes       = null; // { anio, mes }
let sueldosFichaItems = [];
let sueldosEntregas   = [];
let sueldosComision   = 0;
let sueldosPrestamos  = [];

// ── Init ─────────────────────────────────────────────────────────────────────

async function sueldosInit() {
  const now = new Date();
  sueldosMes = { anio: now.getFullYear(), mes: now.getMonth() + 1 };
  await cargarEmpleadosSueldos();
}

async function cargarEmpleadosSueldos() {
  sueldosEmpleados = await sb('GET', 'empleados', '', '?order=nombre') || [];
  renderListaEmpleadosSueldos();
  if (sueldosEmpSel) {
    sueldosEmpSel = sueldosEmpleados.find(e => e.id === sueldosEmpSel.id) || null;
    if (sueldosEmpSel) await cargarFichaMensual();
  }
}

// ── Empleado: lista y alta ────────────────────────────────────────────────────

function renderListaEmpleadosSueldos() {
  const el = document.getElementById('sueldos-lista');
  if (!el) return;
  if (!sueldosEmpleados.length) {
    el.innerHTML = '<div style="padding:16px;color:var(--texto-suave);font-size:13px;text-align:center">Sin empleados registrados</div>';
    return;
  }
  el.innerHTML = sueldosEmpleados.map(e => `
    <div onclick="selEmpleadoSueldo('${e.id}')"
      style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--gris-borde);display:flex;align-items:center;gap:10px;
             ${sueldosEmpSel?.id === e.id ? 'background:var(--bordo);color:#fff' : 'background:transparent'}">
      <div style="width:34px;height:34px;border-radius:50%;background:${sueldosEmpSel?.id === e.id ? 'rgba(255,255,255,.25)' : 'var(--bordo)'};
                  color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">
        ${e.nombre.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style="font-weight:600;font-size:13px">${e.nombre}</div>
        <div style="font-size:11px;opacity:.7">${e.rol || 'Empleado'}</div>
      </div>
    </div>`).join('');
}

async function guardarEmpleadoSueldo() {
  const nombre = document.getElementById('sd-emp-nombre').value.trim();
  const rol    = document.getElementById('sd-emp-rol').value.trim();
  if (!nombre) { toast('Ingresá el nombre', 'var(--rojo)'); return; }
  const r = await sb('POST', 'empleados', { nombre, rol });
  if (r) {
    toast('✅ Empleado agregado');
    toggleForm('form-sd-emp-nuevo');
    document.getElementById('sd-emp-nombre').value = '';
    document.getElementById('sd-emp-rol').value = '';
    await cargarEmpleadosSueldos();
  } else toast('❌ Error al guardar', 'var(--rojo)');
}

async function selEmpleadoSueldo(id) {
  sueldosEmpSel = sueldosEmpleados.find(e => e.id === id);
  renderListaEmpleadosSueldos();
  document.getElementById('sueldos-empty').style.display = 'none';
  document.getElementById('sueldos-ficha').style.display = 'block';
  await cargarFichaMensual();
}

// ── Navegación de mes ─────────────────────────────────────────────────────────

function sueldosMesLabel() {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${MESES[sueldosMes.mes - 1]} ${sueldosMes.anio}`;
}

async function sueldosCambiarMes(delta) {
  let { anio, mes } = sueldosMes;
  mes += delta;
  if (mes < 1)  { mes = 12; anio--; }
  if (mes > 12) { mes = 1;  anio++; }
  sueldosMes = { anio, mes };
  await cargarFichaMensual();
}

// ── Carga de datos del mes ────────────────────────────────────────────────────

async function cargarFichaMensual() {
  if (!sueldosEmpSel) return;
  const { anio, mes } = sueldosMes;
  const empId  = sueldosEmpSel.id;
  const mesStr = String(mes).padStart(2, '0');
  const anioSig = mes === 12 ? anio + 1 : anio;
  const mesSig  = mes === 12 ? '01' : String(mes + 1).padStart(2, '0');

  document.getElementById('sueldos-ficha-nombre').textContent = sueldosEmpSel.nombre;
  document.getElementById('sueldos-mes-label').textContent = sueldosMesLabel();

  const [items, entregas, prestamos, trabajosRaw, comisiones] = await Promise.all([
    sb('GET', 'empleado_ficha_item', '', `?empleado_id=eq.${empId}&anio=eq.${anio}&mes=eq.${mes}&order=created_at`),
    sb('GET', 'empleado_entrega',    '', `?empleado_id=eq.${empId}&fecha=gte.${anio}-${mesStr}-01&fecha=lt.${anioSig}-${mesSig}-01&order=fecha`),
    sb('GET', 'empleado_prestamo',   '', `?empleado_id=eq.${empId}&order=fecha.desc`),
    sb('GET', 'trabajos',            '', `?select=id,tipo_labor,fecha,trabajo_maquinaria(costo,operario_id)&fecha=gte.${anio}-${mesStr}-01&fecha=lt.${anioSig}-${mesSig}-01`),
    sb('GET', 'comision_tipo_labor', '', ''),
  ]);

  sueldosFichaItems = items || [];
  sueldosEntregas   = entregas || [];
  sueldosPrestamos  = prestamos || [];

  // Calcular comisión automática
  const pctMap = {};
  (comisiones || []).forEach(c => { pctMap[c.tipo_labor] = c.porcentaje; });
  sueldosComision = 0;
  (trabajosRaw || []).forEach(t => {
    const pct = pctMap[t.tipo_labor];
    if (!pct) return;
    (t.trabajo_maquinaria || []).forEach(tm => {
      if (tm.operario_id === empId && tm.costo) {
        sueldosComision += (tm.costo * pct) / 100;
      }
    });
  });

  renderFichaMensual();
}

// ── Render de la ficha ────────────────────────────────────────────────────────

function renderFichaMensual() {
  const itemsDev = sueldosFichaItems.filter(i => i.bloque === 'devengado');
  const itemsRec = sueldosFichaItems.filter(i => i.bloque === 'recibido');

  const sueldo    = itemsDev.find(i => i.concepto === '__sueldo__');
  const aguinaldo = itemsDev.find(i => i.concepto === '__aguinaldo__');
  const libresdev = itemsDev.filter(i => !['__sueldo__','__aguinaldo__'].includes(i.concepto));
  const libresrec = itemsRec.filter(i => true);

  const totDev = (sueldo?.monto || 0) + (aguinaldo?.monto || 0) + sueldosComision
    + libresdev.reduce((s,i) => s + (i.monto||0), 0);
  const totEntregas = sueldosEntregas.reduce((s,e) => s + (e.monto||0), 0);
  const totRecibido = totEntregas + libresrec.reduce((s,i) => s + (i.monto||0), 0);
  const aEntregar   = totDev - totRecibido;

  const el = document.getElementById('sueldos-ficha-body');
  el.innerHTML = `
    <!-- DEVENGADO -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="padding:14px 20px">
        <h3 style="font-size:14px;color:var(--bordo)">📥 Devengado</h3>
        <span style="font-size:16px;font-weight:700;color:var(--bordo)">${fmtMonto(totDev,'ARS')}</span>
      </div>
      <div style="padding:16px 20px">

        <!-- Sueldo -->
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gris-borde)">
          <span style="flex:1;font-size:13px;font-weight:600">Sueldo</span>
          <input type="number" value="${sueldo?.monto || ''}" placeholder="0"
            onchange="guardarItemFijo('__sueldo__','devengado',this.value,'${sueldo?.id||''}')"
            style="width:140px;text-align:right;padding:5px 8px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
        </div>

        <!-- Medio Aguinaldo -->
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gris-borde)">
          <span style="flex:1;font-size:13px;font-weight:600">Medio Aguinaldo</span>
          <input type="number" value="${aguinaldo?.monto || ''}" placeholder="0"
            onchange="guardarItemFijo('__aguinaldo__','devengado',this.value,'${aguinaldo?.id||''}')"
            style="width:140px;text-align:right;padding:5px 8px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
        </div>

        <!-- Comisión automática -->
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gris-borde);${sueldosComision===0?'opacity:.5':''}">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">Comisión Enrollado/Segado</div>
            <div style="font-size:11px;color:var(--texto-suave)">8% sobre trabajos del mes — calculado automáticamente</div>
          </div>
          <span style="font-size:13px;font-weight:600;color:var(--verde)">${fmtMonto(sueldosComision,'ARS')}</span>
        </div>

        <!-- Ítems libres devengado -->
        ${libresdev.map(i => renderItemLibre(i, 'devengado')).join('')}

        <!-- Agregar ítem libre devengado -->
        <div id="form-sd-item-dev" style="display:none;margin-top:8px;background:var(--gris-fondo);border-radius:8px;padding:12px;gap:8px;display:none;flex-direction:column">
          <div style="display:flex;gap:8px">
            <input type="text" id="sd-item-dev-concepto" placeholder="Concepto (Ej: Gallinero, Bono)"
              style="flex:2;padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
            <input type="number" id="sd-item-dev-monto" placeholder="Monto"
              style="flex:1;padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="font-size:12px" onclick="agregarItemLibre('devengado')">Guardar</button>
            <button class="btn btn-secondary" style="font-size:12px" onclick="document.getElementById('form-sd-item-dev').style.display='none'">Cancelar</button>
          </div>
        </div>
        <button class="btn btn-secondary" style="font-size:12px;margin-top:10px"
          onclick="document.getElementById('form-sd-item-dev').style.display='flex'">+ Agregar ítem</button>

      </div>
    </div>

    <!-- RECIBIDO -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="padding:14px 20px">
        <h3 style="font-size:14px;color:var(--verde-oscuro,#2a6b2a)">📤 Recibido</h3>
        <span style="font-size:16px;font-weight:700;color:var(--verde-oscuro,#2a6b2a)">${fmtMonto(totRecibido,'ARS')}</span>
      </div>
      <div style="padding:16px 20px">

        <!-- Entregas del mes -->
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:12px;font-weight:600;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.5px">Entregas del mes</span>
            <span style="font-size:13px;font-weight:600">${fmtMonto(totEntregas,'ARS')}</span>
          </div>
          ${sueldosEntregas.length ? sueldosEntregas.map(e => `
            <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--gris-borde)">
              <span style="font-size:11px;color:var(--texto-suave);min-width:72px">${fmtFecha(e.fecha)}</span>
              <span style="flex:1;font-size:13px">${e.descripcion || '—'}</span>
              <span style="font-size:13px;font-weight:600">${fmtMonto(e.monto,'ARS')}</span>
              ${e.prestamo_id ? '<span style="font-size:10px;color:#888;margin-left:4px">cuota</span>' : `<button onclick="borrarEntrega('${e.id}')" style="background:none;border:none;cursor:pointer;color:var(--rojo);font-size:16px;line-height:1;padding:0 4px">×</button>`}
            </div>`).join('') : '<div style="font-size:12px;color:var(--texto-suave);padding:4px 0">Sin entregas este mes</div>'}

          <!-- Agregar entrega -->
          <div id="form-sd-entrega" style="display:none;margin-top:8px;background:var(--gris-fondo);border-radius:8px;padding:12px">
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <input type="date" id="sd-entrega-fecha" style="flex:1;padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
              <input type="text" id="sd-entrega-desc" placeholder="Descripción"
                style="flex:2;padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
              <input type="number" id="sd-entrega-monto" placeholder="Monto"
                style="flex:1;padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" style="font-size:12px" onclick="agregarEntrega()">Guardar</button>
              <button class="btn btn-secondary" style="font-size:12px" onclick="document.getElementById('form-sd-entrega').style.display='none'">Cancelar</button>
            </div>
          </div>
          <button class="btn btn-secondary" style="font-size:12px;margin-top:8px"
            onclick="abrirFormEntrega()">+ Agregar entrega</button>
        </div>

        <!-- Ítems libres recibido -->
        ${libresrec.length ? `<div style="border-top:1px solid var(--gris-borde);padding-top:10px;margin-top:4px">${libresrec.map(i => renderItemLibre(i, 'recibido')).join('')}</div>` : ''}

        <!-- Agregar ítem libre recibido -->
        <div id="form-sd-item-rec" style="display:none;margin-top:8px;background:var(--gris-fondo);border-radius:8px;padding:12px;flex-direction:column;gap:8px">
          <div style="display:flex;gap:8px">
            <input type="text" id="sd-item-rec-concepto" placeholder="Concepto (Ej: Internet, Electricidad)"
              style="flex:2;padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
            <input type="number" id="sd-item-rec-monto" placeholder="Monto"
              style="flex:1;padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="font-size:12px" onclick="agregarItemLibre('recibido')">Guardar</button>
            <button class="btn btn-secondary" style="font-size:12px" onclick="document.getElementById('form-sd-item-rec').style.display='none'">Cancelar</button>
          </div>
        </div>
        <button class="btn btn-secondary" style="font-size:12px;margin-top:10px"
          onclick="document.getElementById('form-sd-item-rec').style.display='flex'">+ Agregar ítem</button>

      </div>
    </div>

    <!-- ENTREGA FINAL -->
    <div class="card" style="padding:20px;background:${aEntregar > 0 ? '#fff8e1' : aEntregar < 0 ? '#fce8e8' : '#f0faf0'};border:2px solid ${aEntregar > 0 ? '#f59e0b' : aEntregar < 0 ? 'var(--rojo)' : 'var(--verde)'}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--texto)">A entregar este mes</div>
          <div style="font-size:12px;color:var(--texto-suave);margin-top:2px">Devengado − Recibido</div>
        </div>
        <div style="font-size:24px;font-weight:700;color:${aEntregar > 0 ? '#92400e' : aEntregar < 0 ? 'var(--rojo)' : 'var(--verde)'}">${fmtMonto(aEntregar,'ARS')}</div>
      </div>
    </div>

    <!-- PRÉSTAMOS -->
    <div class="card" style="margin-top:16px">
      <div class="card-header" style="padding:14px 20px">
        <h3 style="font-size:14px">🏦 Préstamos</h3>
        <button class="btn btn-secondary" style="font-size:12px" onclick="toggleForm('form-sd-prestamo')">+ Nuevo préstamo</button>
      </div>
      <div id="form-sd-prestamo" style="display:none;padding:14px 20px;border-bottom:1px solid var(--gris-borde)">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <div class="form-group" style="flex:1;min-width:130px"><label>Fecha</label>
            <input type="date" id="sd-prest-fecha" class="form-control"></div>
          <div class="form-group" style="flex:2;min-width:180px"><label>Descripción</label>
            <input type="text" id="sd-prest-desc" placeholder="Ej: Préstamo compra auto" class="form-control"></div>
          <div class="form-group" style="flex:1;min-width:130px"><label>Monto total</label>
            <input type="number" id="sd-prest-monto" placeholder="0" class="form-control"></div>
          <div class="form-group" style="flex:1;min-width:100px"><label>Cuotas</label>
            <input type="number" id="sd-prest-cuotas" placeholder="1" min="1" class="form-control" value="1"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" style="font-size:12px" onclick="guardarPrestamo()">Guardar y generar cuotas</button>
          <button class="btn btn-secondary" style="font-size:12px" onclick="toggleForm('form-sd-prestamo')">Cancelar</button>
        </div>
      </div>
      <div style="padding:14px 20px">
        ${sueldosPrestamos.length ? sueldosPrestamos.map(p => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gris-borde)">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${p.descripcion || 'Préstamo'}</div>
              <div style="font-size:11px;color:var(--texto-suave)">${fmtFecha(p.fecha)} · ${p.cantidad_cuotas} cuota${p.cantidad_cuotas!==1?'s':''} de ${fmtMonto(p.monto_total/p.cantidad_cuotas,'ARS')}</div>
            </div>
            <span style="font-size:13px;font-weight:600">${fmtMonto(p.monto_total,'ARS')}</span>
          </div>`).join('') : '<div style="font-size:12px;color:var(--texto-suave)">Sin préstamos registrados</div>'}
      </div>
    </div>
  `;
}

function renderItemLibre(item, bloque) {
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gris-borde)">
      <span style="flex:1;font-size:13px">${item.concepto}</span>
      <span style="font-size:13px;font-weight:600">${fmtMonto(item.monto,'ARS')}</span>
      <button onclick="borrarItemLibre('${item.id}')" style="background:none;border:none;cursor:pointer;color:var(--rojo);font-size:16px;line-height:1;padding:0 4px">×</button>
    </div>`;
}

// ── Guardar ítems fijos (sueldo, aguinaldo) ───────────────────────────────────

async function guardarItemFijo(concepto, bloque, valor, existeId) {
  const monto = parseFloat(valor) || 0;
  const { anio, mes } = sueldosMes;
  const empId = sueldosEmpSel.id;

  let ok;
  if (existeId) {
    ok = await sb('PATCH', 'empleado_ficha_item', { monto }, `?id=eq.${existeId}`);
  } else {
    ok = await sb('POST', 'empleado_ficha_item', { empleado_id: empId, anio, mes, bloque, concepto, monto });
  }
  if (ok !== null) await cargarFichaMensual();
  else toast('❌ Error al guardar', 'var(--rojo)');
}

// ── Ítems libres (devengado y recibido) ───────────────────────────────────────

async function agregarItemLibre(bloque) {
  const concepto = document.getElementById(`sd-item-${bloque==='devengado'?'dev':'rec'}-concepto`).value.trim();
  const monto    = parseFloat(document.getElementById(`sd-item-${bloque==='devengado'?'dev':'rec'}-monto`).value) || 0;
  if (!concepto) { toast('Ingresá el concepto', 'var(--rojo)'); return; }
  const { anio, mes } = sueldosMes;
  const r = await sb('POST', 'empleado_ficha_item', { empleado_id: sueldosEmpSel.id, anio, mes, bloque, concepto, monto });
  if (r) {
    document.getElementById(`form-sd-item-${bloque==='devengado'?'dev':'rec'}`).style.display = 'none';
    await cargarFichaMensual();
  } else toast('❌ Error', 'var(--rojo)');
}

async function borrarItemLibre(id) {
  if (!confirm('¿Borrar este ítem?')) return;
  const r = await sb('DELETE', 'empleado_ficha_item', null, `?id=eq.${id}`);
  if (r !== null) await cargarFichaMensual();
  else toast('❌ Error', 'var(--rojo)');
}

// ── Entregas ──────────────────────────────────────────────────────────────────

function abrirFormEntrega() {
  const hoy = new Date().toISOString().slice(0,10);
  const el = document.getElementById('sd-entrega-fecha');
  if (el && !el.value) el.value = hoy;
  document.getElementById('form-sd-entrega').style.display = 'block';
}

async function agregarEntrega() {
  const fecha = document.getElementById('sd-entrega-fecha').value;
  const desc  = document.getElementById('sd-entrega-desc').value.trim();
  const monto = parseFloat(document.getElementById('sd-entrega-monto').value) || 0;
  if (!fecha) { toast('Ingresá la fecha', 'var(--rojo)'); return; }
  if (!monto) { toast('Ingresá el monto', 'var(--rojo)'); return; }
  const r = await sb('POST', 'empleado_entrega', { empleado_id: sueldosEmpSel.id, fecha, descripcion: desc, monto });
  if (r) {
    document.getElementById('form-sd-entrega').style.display = 'none';
    document.getElementById('sd-entrega-fecha').value = '';
    document.getElementById('sd-entrega-desc').value  = '';
    document.getElementById('sd-entrega-monto').value = '';
    await cargarFichaMensual();
  } else toast('❌ Error', 'var(--rojo)');
}

async function borrarEntrega(id) {
  if (!confirm('¿Borrar esta entrega?')) return;
  const r = await sb('DELETE', 'empleado_entrega', null, `?id=eq.${id}`);
  if (r !== null) await cargarFichaMensual();
  else toast('❌ Error', 'var(--rojo)');
}

// ── Préstamos ─────────────────────────────────────────────────────────────────

async function guardarPrestamo() {
  const fecha   = document.getElementById('sd-prest-fecha').value;
  const desc    = document.getElementById('sd-prest-desc').value.trim();
  const monto   = parseFloat(document.getElementById('sd-prest-monto').value);
  const cuotas  = parseInt(document.getElementById('sd-prest-cuotas').value) || 1;
  if (!fecha)   { toast('Ingresá la fecha', 'var(--rojo)'); return; }
  if (!monto)   { toast('Ingresá el monto', 'var(--rojo)'); return; }

  // 1. Crear préstamo
  const prest = await sb('POST', 'empleado_prestamo', {
    empleado_id: sueldosEmpSel.id, fecha, descripcion: desc, monto_total: monto, cantidad_cuotas: cuotas
  });
  if (!prest) { toast('❌ Error al guardar', 'var(--rojo)'); return; }

  // 2. Generar cuotas en empleado_entrega (una por mes futuro desde la fecha del préstamo)
  const montoCuota = +(monto / cuotas).toFixed(2);
  const [anioBase, mesBase] = fecha.split('-').map(Number);
  const entregas = [];
  for (let i = 0; i < cuotas; i++) {
    let m = mesBase + i;
    let a = anioBase;
    while (m > 12) { m -= 12; a++; }
    const fechaCuota = `${a}-${String(m).padStart(2,'0')}-${fecha.slice(8)}`;
    entregas.push({
      empleado_id: sueldosEmpSel.id,
      fecha: fechaCuota,
      descripcion: `Cuota ${i+1}/${cuotas} — ${desc || 'Préstamo'}`,
      monto: montoCuota,
      prestamo_id: prest.id
    });
  }

  let errores = 0;
  for (const e of entregas) {
    const r = await sb('POST', 'empleado_entrega', e);
    if (!r) errores++;
  }

  if (errores === 0) {
    toast(`✅ Préstamo creado — ${cuotas} cuota${cuotas!==1?'s':''} generada${cuotas!==1?'s':''}`);
  } else {
    toast(`⚠️ Préstamo creado pero ${errores} cuota${errores!==1?'s':''} fallaron`, 'var(--naranja,orange)');
  }

  toggleForm('form-sd-prestamo');
  document.getElementById('sd-prest-fecha').value  = '';
  document.getElementById('sd-prest-desc').value   = '';
  document.getElementById('sd-prest-monto').value  = '';
  document.getElementById('sd-prest-cuotas').value = '1';
  await cargarFichaMensual();
}
