// ── SUELDOS ──────────────────────────────────────────────────────────────────
let sueldosEmpleados = [];
let sueldosEmpSel    = null;
let sueldosMes       = null; // { anio, mes }
let sueldosFichaItems  = [];
let sueldosEntregas    = [];
let sueldosComision    = 0;
let sueldosPrestamos   = [];
let sueldosMesData     = null; // fila de empleado_mes actual
let sueldosMesCerrado  = false;

// ── Init ─────────────────────────────────────────────────────────────────────

async function sueldosInit() {
  const now = new Date();
  sueldosMes = { anio: now.getFullYear(), mes: now.getMonth() + 1 };
  await cargarEmpleadosSueldos();
}

async function cargarEmpleadosSueldos() {
  sueldosEmpleados = await sb('GET', 'empleados', '', '?activo=eq.true&order=nombre') || [];
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

  const [items, entregas, prestamos, trabajosRaw, comisiones, mesRows] = await Promise.all([
    sb('GET', 'empleado_ficha_item', '', `?empleado_id=eq.${empId}&anio=eq.${anio}&mes=eq.${mes}&order=created_at`),
    sb('GET', 'empleado_entrega',    '', `?empleado_id=eq.${empId}&mes_correspondiente=gte.${anio}-${mesStr}-01&mes_correspondiente=lt.${anioSig}-${mesSig}-01&order=fecha`),
    sb('GET', 'empleado_prestamo',   '', `?empleado_id=eq.${empId}&order=fecha.desc`),
    sb('GET', 'trabajos',            '', `?select=id,tipo_labor,fecha,trabajo_maquinaria(costo,operario_id)&fecha=gte.${anio}-${mesStr}-01&fecha=lt.${anioSig}-${mesSig}-01`),
    sb('GET', 'comision_tipo_labor', '', ''),
    sb('GET', 'empleado_mes',        '', `?empleado_id=eq.${empId}&anio=eq.${anio}&mes=eq.${mes}&limit=1`),
  ]);

  sueldosFichaItems = items || [];
  sueldosEntregas   = entregas || [];
  sueldosPrestamos  = prestamos || [];
  sueldosMesData    = (mesRows || [])[0] || null;
  sueldosMesCerrado = sueldosMesData?.cerrado === true;

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

  const esOperario = sueldosEmpSel?.rol === 'operario';
  const totDev = (sueldo?.monto || 0) + (aguinaldo?.monto || 0)
    + (esOperario ? sueldosComision : 0)
    + libresdev.reduce((s,i) => s + (i.monto||0), 0);
  const totEntregas = sueldosEntregas.reduce((s,e) => s + (e.monto||0), 0);
  const totRecibido = totEntregas + libresrec.reduce((s,i) => s + (i.monto||0), 0);
  const aEntregar   = totDev - totRecibido;

  const cerrado = sueldosMesCerrado;
  const rdonly  = cerrado ? 'disabled style="width:140px;text-align:right;padding:5px 8px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px;background:var(--gris-fondo);color:var(--texto-suave)"'
                           : 'style="width:140px;text-align:right;padding:5px 8px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px"';

  const el = document.getElementById('sueldos-ficha-body');
  el.innerHTML = `
    ${cerrado ? `<div style="background:#fff8e1;border:1px solid #f0c040;border-radius:8px;padding:10px 16px;margin-bottom:14px;font-size:13px;display:flex;justify-content:space-between;align-items:center">
      <span>🔒 <strong>Mes cerrado.</strong> Reabrir para editar.</span>
      <div style="display:flex;gap:8px">
        <button onclick="reabrirMes()" class="btn btn-secondary" style="font-size:12px">Reabrir este mes</button>
        <button onclick="reabrirTodos()" class="btn btn-secondary" style="font-size:12px;color:var(--bordo)">Reabrir todos</button>
      </div>
    </div>` : ''}

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
            ${rdonly}>
        </div>

        <!-- Medio Aguinaldo -->
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gris-borde)">
          <span style="flex:1;font-size:13px;font-weight:600">Medio Aguinaldo</span>
          <input type="number" value="${aguinaldo?.monto || ''}" placeholder="0"
            onchange="guardarItemFijo('__aguinaldo__','devengado',this.value,'${aguinaldo?.id||''}')"
            ${rdonly}>
        </div>

        <!-- Comisión automática — solo para operarios de maquinaria -->
        ${sueldosEmpSel?.rol === 'operario' ? `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gris-borde);${sueldosComision===0?'opacity:.5':''}">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">Comisión Enrollado/Segado</div>
            <div style="font-size:11px;color:var(--texto-suave)">8% sobre trabajos del mes — calculado automáticamente</div>
          </div>
          <span style="font-size:13px;font-weight:600;color:var(--verde)">${fmtMonto(sueldosComision,'ARS')}</span>
        </div>` : ''}

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
        ${cerrado ? '' : `<button class="btn btn-secondary" style="font-size:12px;margin-top:10px"
          onclick="document.getElementById('form-sd-item-dev').style.display='flex'">+ Agregar ítem</button>`}

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
          ${sueldosEntregas.length ? sueldosEntregas.map(e => {
            const mesDifiere = e.mes_correspondiente && e.fecha && e.mes_correspondiente.slice(0,7) !== e.fecha.slice(0,7);
            return `
            <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--gris-borde)">
              <div style="min-width:72px">
                <div style="font-size:11px;color:var(--texto-suave)">${fmtFecha(e.fecha)}</div>
                ${mesDifiere ? `<div style="font-size:10px;color:var(--bordo);white-space:nowrap">↳ imputado ${e.mes_correspondiente.slice(0,7)}</div>` : ''}
              </div>
              <span style="flex:1;font-size:13px">${e.descripcion || '—'}</span>
              <span style="font-size:13px;font-weight:600">${fmtMonto(e.monto,'ARS')}</span>
              ${e.prestamo_id ? '<span style="font-size:10px;color:#888;margin-left:4px">cuota</span>' : `<button onclick="borrarEntrega('${e.id}')" style="background:none;border:none;cursor:pointer;color:var(--rojo);font-size:16px;line-height:1;padding:0 4px">×</button>`}
            </div>`;
          }).join('') : '<div style="font-size:12px;color:var(--texto-suave);padding:4px 0">Sin entregas este mes</div>'}

          <!-- Agregar entrega -->
          <div id="form-sd-entrega" style="display:none;margin-top:8px;background:var(--gris-fondo);border-radius:8px;padding:12px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
              <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:120px">
                <label style="font-size:11px;color:var(--texto-suave)">Fecha real</label>
                <input type="date" id="sd-entrega-fecha" style="padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
              </div>
              <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:120px">
                <label style="font-size:11px;color:var(--texto-suave)">Mes que corresponde</label>
                <input type="month" id="sd-entrega-mes" style="padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
              </div>
              <input type="text" id="sd-entrega-desc" placeholder="Descripción"
                style="flex:2;min-width:140px;padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
              <input type="number" id="sd-entrega-monto" placeholder="Monto"
                style="flex:1;min-width:100px;padding:7px 10px;border:1px solid var(--gris-borde);border-radius:6px;font-size:13px">
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" style="font-size:12px" onclick="agregarEntrega()">Guardar</button>
              <button class="btn btn-secondary" style="font-size:12px" onclick="document.getElementById('form-sd-entrega').style.display='none'">Cancelar</button>
            </div>
          </div>
          ${cerrado ? '' : `<button class="btn btn-secondary" style="font-size:12px;margin-top:8px"
            onclick="abrirFormEntrega()">+ Agregar entrega</button>`}
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
        ${cerrado ? '' : `<button class="btn btn-secondary" style="font-size:12px;margin-top:10px"
          onclick="document.getElementById('form-sd-item-rec').style.display='flex'">+ Agregar ítem</button>`}

      </div>
    </div>

    <!-- ENTREGA FINAL -->
    <div class="card" style="padding:20px;background:${aEntregar > 0 ? '#fff8e1' : aEntregar < 0 ? '#fce8e8' : '#f0faf0'};border:2px solid ${aEntregar > 0 ? '#f59e0b' : aEntregar < 0 ? 'var(--rojo)' : 'var(--verde)'}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--texto)">A entregar este mes</div>
          <div style="font-size:12px;color:var(--texto-suave);margin-top:2px">Devengado − Recibido</div>
        </div>
        <div style="display:flex;align-items:center;gap:16px">
          <div style="font-size:24px;font-weight:700;color:${aEntregar > 0 ? '#92400e' : aEntregar < 0 ? 'var(--rojo)' : 'var(--verde)'}">${fmtMonto(aEntregar,'ARS')}</div>
          ${cerrado
            ? `<div style="display:flex;gap:8px">
                <button onclick="generarPdfMes()" class="btn btn-primary" style="font-size:12px;white-space:nowrap;background:#1a5276">📄 Generar PDF</button>
                <button onclick="reabrirMes()" class="btn btn-secondary" style="font-size:12px;white-space:nowrap">🔓 Reabrir mes</button>
               </div>`
            : `<button onclick="cerrarMes()" class="btn btn-primary" style="font-size:12px;white-space:nowrap;background:var(--bordo)">🔒 Cerrar mes</button>`}
        </div>
      </div>
    </div>

    <!-- PRÉSTAMOS -->
    <div class="card" style="margin-top:16px">
      <div class="card-header" style="padding:14px 20px">
        <h3 style="font-size:14px">🏦 Préstamos</h3>
        ${cerrado ? '' : `<button class="btn btn-secondary" style="font-size:12px" onclick="toggleForm('form-sd-prestamo')">+ Nuevo préstamo</button>`}
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

// ── PDF del mes cerrado ───────────────────────────────────────────────────────

function generarPdfMes() {
  if (!sueldosEmpSel || !sueldosMesCerrado) return;

  const itemsDev  = sueldosFichaItems.filter(i => i.bloque === 'devengado');
  const itemsRec  = sueldosFichaItems.filter(i => i.bloque === 'recibido');
  const sueldo    = itemsDev.find(i => i.concepto === '__sueldo__');
  const aguinaldo = itemsDev.find(i => i.concepto === '__aguinaldo__');
  const libresdev = itemsDev.filter(i => !['__sueldo__','__aguinaldo__'].includes(i.concepto));
  const libresrec = itemsRec.filter(() => true);

  const esOperario  = sueldosEmpSel?.rol === 'operario';
  const totDev      = (sueldo?.monto||0) + (aguinaldo?.monto||0)
    + (esOperario ? sueldosComision : 0)
    + libresdev.reduce((s,i) => s+(i.monto||0), 0);
  const totEntregas = sueldosEntregas.reduce((s,e) => s+(e.monto||0), 0);
  const totRec      = totEntregas + libresrec.reduce((s,i) => s+(i.monto||0), 0);
  const aEntregar   = totDev - totRec;

  const nombreMes = _mesLabel();
  const hoy       = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });

  const fila = (concepto, monto, suave = false) =>
    `<tr><td style="padding:6px 10px;font-size:13px;color:${suave?'#888':'#222'}">${concepto}</td>
         <td style="padding:6px 10px;font-size:13px;text-align:right;font-variant-numeric:tabular-nums;color:${suave?'#888':'#222'}">${fmtMonto(monto,'ARS')}</td></tr>`;

  const filaTotal = (label, monto, color = '#1a1a1a') =>
    `<tr style="background:#f5f5f5;font-weight:700">
       <td style="padding:8px 10px;font-size:13px;color:${color}">${label}</td>
       <td style="padding:8px 10px;font-size:13px;text-align:right;font-variant-numeric:tabular-nums;color:${color}">${fmtMonto(monto,'ARS')}</td>
     </tr>`;

  const lineasDev = [
    sueldo?.monto    ? fila('Sueldo', sueldo.monto)       : '',
    aguinaldo?.monto ? fila('Medio Aguinaldo', aguinaldo.monto) : '',
    ...(esOperario && sueldosComision ? [fila('Comisión Enrollado/Segado', sueldosComision)] : []),
    ...libresdev.map(i => fila(i.concepto, i.monto)),
    filaTotal('Total Devengado', totDev),
  ].join('');

  const lineasRec = [
    ...sueldosEntregas.map(e => {
      const mesOrig = e.mes_correspondiente ? e.mes_correspondiente.slice(0,7) : '';
      const label   = (e.descripcion || 'Entrega') + (mesOrig ? ` <span style="color:#888;font-size:11px">(${mesOrig})</span>` : '');
      return fila(label, e.monto);
    }),
    ...libresrec.map(i => fila(i.concepto, i.monto)),
    filaTotal('Total Recibido', totRec),
  ].join('');

  const colorAE   = aEntregar > 0 ? '#7b3f00' : aEntregar < 0 ? '#c0392b' : '#27ae60';
  const bgAE      = aEntregar > 0 ? '#fff8e1' : aEntregar < 0 ? '#fce8e8' : '#f0faf0';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
  <title>Liquidación ${nombreMes} — ${sueldosEmpSel.nombre}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #222; }
    h1   { font-size: 18px; margin: 0 0 4px; }
    .sub { font-size: 13px; color: #555; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th   { background: #3d0b0b; color: #fff; padding: 8px 10px; font-size: 13px; text-align: left; }
    th:last-child { text-align: right; }
    tr:nth-child(even):not(:last-child) { background: #fafafa; }
    .ae  { background: ${bgAE}; border: 2px solid ${colorAE}; border-radius: 8px;
           padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .ae-label { font-size: 15px; font-weight: 700; color: ${colorAE}; }
    .ae-monto { font-size: 24px; font-weight: 700; color: ${colorAE}; font-variant-numeric: tabular-nums; }
    .footer { margin-top: 40px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style></head><body>
  <h1>Liquidación de Haberes — ${sueldosEmpSel.nombre}</h1>
  <div class="sub">${nombreMes} &nbsp;·&nbsp; ${sueldosEmpSel.rol || 'Empleado'} &nbsp;·&nbsp; Emitido: ${hoy}</div>

  <table>
    <thead><tr><th>📥 Devengado</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>${lineasDev}</tbody>
  </table>

  <table>
    <thead><tr><th>📤 Recibido</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>${lineasRec}</tbody>
  </table>

  <div class="ae">
    <div class="ae-label">💳 A entregar este mes<br><span style="font-size:12px;font-weight:400;color:#555">Devengado − Recibido</span></div>
    <div class="ae-monto">${fmtMonto(aEntregar,'ARS')}</div>
  </div>

  <div class="footer">Giraudo Agropecuaria &nbsp;·&nbsp; Documento generado el ${hoy}</div>
  <script>window.onload = () => window.print();</script>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ── Cerrar / Reabrir mes ──────────────────────────────────────────────────────

function _mesLabel() {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const { anio, mes } = sueldosMes;
  return `${MESES[mes - 1]} ${anio}`;
}

async function cerrarMes() {
  if (!sueldosEmpSel) return;
  const { anio, mes } = sueldosMes;
  const empId  = sueldosEmpSel.id;
  const mesStr = String(mes).padStart(2, '0');

  // calcular saldo
  const itemsDev = sueldosFichaItems.filter(i => i.bloque === 'devengado');
  const itemsRec = sueldosFichaItems.filter(i => i.bloque === 'recibido');
  const sueldo   = itemsDev.find(i => i.concepto === '__sueldo__');
  const aguinaldo= itemsDev.find(i => i.concepto === '__aguinaldo__');
  const libresdev= itemsDev.filter(i => !['__sueldo__','__aguinaldo__'].includes(i.concepto));
  const totDev   = (sueldo?.monto||0)+(aguinaldo?.monto||0)
    + (sueldosEmpSel?.rol==='operario' ? sueldosComision : 0)
    + libresdev.reduce((s,i)=>s+(i.monto||0),0);
  const totEntregas = sueldosEntregas.reduce((s,e)=>s+(e.monto||0),0);
  const libresrec   = itemsRec.filter(()=>true);
  const totRec  = totEntregas + libresrec.reduce((s,i)=>s+(i.monto||0),0);
  const aEntregar = totDev - totRec;

  // 1. crear fila de liquidación en empleado_entrega
  const hoy = new Date().toISOString().slice(0,10);
  const desc = `Liquidación ${_mesLabel()}`;
  await sb('POST', 'empleado_entrega', {
    empleado_id: empId,
    fecha: hoy,
    mes_correspondiente: `${anio}-${mesStr}-01`,
    descripcion: desc,
    monto: aEntregar,
  });

  // 2. upsert empleado_mes cerrado=true
  if (sueldosMesData?.id) {
    await sb('PATCH', 'empleado_mes', { cerrado: true }, `?id=eq.${sueldosMesData.id}`);
  } else {
    await sb('POST', 'empleado_mes', { empleado_id: empId, anio, mes, cerrado: true });
  }

  await cargarFichaMensual();
}

async function reabrirMes() {
  if (!sueldosEmpSel) return;
  const { anio, mes } = sueldosMes;
  const empId  = sueldosEmpSel.id;
  const mesStr = String(mes).padStart(2, '0');
  const desc   = `Liquidación ${_mesLabel()}`;

  // 1. borrar fila de liquidación si existe
  await sb('DELETE', 'empleado_entrega', '',
    `?empleado_id=eq.${empId}&mes_correspondiente=eq.${anio}-${mesStr}-01&descripcion=eq.${encodeURIComponent(desc)}`);

  // 2. marcar mes como abierto
  if (sueldosMesData?.id) {
    await sb('PATCH', 'empleado_mes', { cerrado: false }, `?id=eq.${sueldosMesData.id}`);
  }

  await cargarFichaMensual();
}

async function reabrirTodos() {
  if (!sueldosEmpSel) return;
  const ok = confirm(`¿Reabrir TODOS los meses cerrados de ${sueldosEmpSel.nombre}?\nSe borrarán todas las filas de Liquidación generadas al cerrar.`);
  if (!ok) return;

  const empId = sueldosEmpSel.id;
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // obtener todos los meses cerrados del empleado
  const cerrados = await sb('GET', 'empleado_mes', '', `?empleado_id=eq.${empId}&cerrado=eq.true`);
  if (!cerrados?.length) { toast('No hay meses cerrados'); return; }

  for (const row of cerrados) {
    const mesStr  = String(row.mes).padStart(2, '0');
    const label   = `${MESES[row.mes - 1]} ${row.anio}`;
    const desc    = `Liquidación ${label}`;
    await sb('DELETE', 'empleado_entrega', '',
      `?empleado_id=eq.${empId}&mes_correspondiente=eq.${row.anio}-${mesStr}-01&descripcion=eq.${encodeURIComponent(desc)}`);
    await sb('PATCH', 'empleado_mes', { cerrado: false }, `?id=eq.${row.id}`);
  }

  await cargarFichaMensual();
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const elFecha = document.getElementById('sd-entrega-fecha');
  if (elFecha && !elFecha.value) elFecha.value = hoy;
  const elMes = document.getElementById('sd-entrega-mes');
  if (elMes) {
    const { anio, mes } = sueldosMes;
    elMes.value = `${anio}-${String(mes).padStart(2,'0')}`;
  }
  document.getElementById('form-sd-entrega').style.display = 'block';
}

async function agregarEntrega() {
  const fecha = document.getElementById('sd-entrega-fecha').value;
  const desc  = document.getElementById('sd-entrega-desc').value.trim();
  const monto = parseFloat(document.getElementById('sd-entrega-monto').value) || 0;
  const mesVal = document.getElementById('sd-entrega-mes').value; // YYYY-MM
  if (!fecha) { toast('Ingresá la fecha', 'var(--rojo)'); return; }
  if (!monto) { toast('Ingresá el monto', 'var(--rojo)'); return; }
  const mes_correspondiente = mesVal ? `${mesVal}-01` : fecha;
  const r = await sb('POST', 'empleado_entrega', { empleado_id: sueldosEmpSel.id, fecha, descripcion: desc, monto, mes_correspondiente });
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
      mes_correspondiente: fechaCuota,
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
