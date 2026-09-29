// Generador de reporte PDF — Cheques (Recibidos y Emitidos)

const CAMPOS_REP_CHEQUES = {
  recibido: [
    { id: 'fecha_emision', label: 'Fecha emisión',  def: true  },
    { id: 'contraparte',   label: 'Librador',        def: true  },
    { id: 'detalle',       label: 'Detalle',         def: true  },
    { id: 'numero',        label: 'N° cheque',       def: true  },
    { id: 'banco',         label: 'Banco',           def: true  },
    { id: 'fecha_cobro',   label: 'Fecha de cobro',  def: true  },
    { id: 'monto',         label: 'Monto',           def: true  },
    { id: 'estado',        label: 'Estado',          def: true  },
    { id: 'registro',      label: 'Registro',        def: false },
    { id: 'destino',       label: 'Destino',         def: false },
    { id: 'rubro_destino', label: 'Rubro destino',   def: false },
  ],
  emitido: [
    { id: 'fecha_cobro',   label: 'Fecha cobro/pago',def: true  },
    { id: 'numero',        label: 'N° cheque',       def: true  },
    { id: 'banco',         label: 'Banco',           def: true  },
    { id: 'contraparte',   label: 'Beneficiario',    def: true  },
    { id: 'detalle',       label: 'Detalle',         def: true  },
    { id: 'firma',         label: 'Firma',           def: true  },
    { id: 'monto',         label: 'Monto',           def: true  },
    { id: 'estado',        label: 'Estado',          def: true  },
    { id: 'registro',      label: 'Registro',        def: false },
  ],
};

const ESTADO_LABEL_CHR = { cartera: 'En cartera', efectivizado: 'Cobrado', rechazado: 'Rechazado', endosado: 'Endosado' };
const ESTADO_LABEL_CHE = { cartera: 'En cartera', efectivizado: 'Pagado',  rechazado: 'Rechazado' };

function _chequesGetFiltered(tipo) {
  const cfg = CHEQUE_CFG[tipo];
  const st  = chequeState[tipo];
  const fBusca  = (document.getElementById(`${cfg.pref}-filtro-busca`)?.value || '').trim().toLowerCase();
  const fEstado = document.getElementById(`${cfg.pref}-filtro-estado`)?.value || '';
  return st.todas.filter(c => {
    if (fEstado && c.estado !== fEstado) return false;
    if (fBusca && !`${c.contraparte||''} ${c.numero||''} ${c.detalle||''} ${c.destino||''} ${c.factura_origen||''} ${c.factura_destino||''}`.toLowerCase().includes(fBusca)) return false;
    if (st.mesFiltro && (c.fecha_cobro || '').slice(0, 7) !== st.mesFiltro) return false;
    return true;
  });
}

function _chequesFiltroDesc(tipo) {
  const cfg = CHEQUE_CFG[tipo];
  const st  = chequeState[tipo];
  const p = [];
  const fEstado = document.getElementById(`${cfg.pref}-filtro-estado`)?.value || '';
  const fBusca  = (document.getElementById(`${cfg.pref}-filtro-busca`)?.value || '').trim();
  if (fEstado)       p.push('Estado: ' + fEstado);
  if (st.mesFiltro)  p.push('Mes: ' + st.mesFiltro);
  if (fBusca)        p.push('Búsqueda: "' + fBusca + '"');
  return p.length ? p.join(' · ') : 'Sin filtros aplicados';
}

function generarReporteCheques(tipo, formato) {
  const rows = _chequesGetFiltered(tipo);
  if (!rows.length) { toast('No hay cheques con los filtros actuales', 'var(--tierra)'); return; }

  const titulo = tipo === 'recibido' ? 'Cheques Recibidos' : 'Cheques Emitidos';
  const camposDef = CAMPOS_REP_CHEQUES[tipo];

  const camposHtml = camposDef.map(c =>
    `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
      <input type="checkbox" class="repcheq-campo" data-id="${c.id}" ${c.def ? 'checked' : ''}>
      ${c.label}
    </label>`
  ).join('');

  const modalId = `modal-reporte-cheques-${tipo}`;
  const html = `<div id="${modalId}" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)document.getElementById('${modalId}').remove()">
    <div style="background:var(--blanco);border-radius:14px;padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:17px">📄 Reporte — ${titulo}</h3>
        <button onclick="document.getElementById('${modalId}').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--texto-suave)">✕</button>
      </div>
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--texto-suave);margin-bottom:8px;letter-spacing:.5px">Campos a incluir (${rows.length} cheques)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:16px">${camposHtml}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--gris-borde);padding-top:16px">
        <button class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="_ejecutarReporteCheques('${tipo}','${modalId}')">📄 PDF</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function _ejecutarReporteCheques(tipo, modalId) {
  const campos = [...document.querySelectorAll(`#${modalId} .repcheq-campo:checked`)].map(c => c.dataset.id);
  if (!campos.length) { toast('Seleccioná al menos un campo', 'var(--tierra)'); return; }
  document.getElementById(modalId)?.remove();

  const rows = _chequesGetFiltered(tipo);
  const cols = CAMPOS_REP_CHEQUES[tipo].filter(c => campos.includes(c.id));
  const estadoLabel = tipo === 'recibido' ? ESTADO_LABEL_CHR : ESTADO_LABEL_CHE;

  // Resumen sobre filas filtradas
  const totMonto = rows.reduce((s, c) => s + (c.monto || 0), 0);
  const desglose = {};
  rows.forEach(c => {
    if (!desglose[c.estado]) desglose[c.estado] = { cant: 0, monto: 0 };
    desglose[c.estado].cant++;
    desglose[c.estado].monto += c.monto || 0;
  });
  const desgloseHtml = Object.entries(desglose)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([e, v]) => `<span style="margin-right:14px">${estadoLabel[e] || e}: <strong>${v.cant}</strong> · ${fmtMonto(v.monto, 'ARS')}</span>`)
    .join('');

  // Filas de detalle
  const cabecera = cols.map(c => c.label);
  const filas = rows.map(c => {
    const map = {
      fecha_emision: fmtFecha(c.fecha_emision) || '—',
      fecha_cobro:   fmtFecha(c.fecha_cobro)   || '—',
      contraparte:   c.contraparte || '—',
      detalle:       c.detalle     || '—',
      numero:        c.numero      || '—',
      banco:         c.banco       || '—',
      monto:         fmtMonto(c.monto, 'ARS'),
      estado:        estadoLabel[c.estado] || c.estado || '—',
      registro:      c.registro === 'negro' ? 'Negro' : 'Blanco',
      destino:       c.destino      || '—',
      rubro_destino: c.rubro_destino || '—',
      firma:         c.firma || '—',
    };
    return cols.map(col => map[col.id] ?? '—');
  });

  const titulo = tipo === 'recibido' ? 'Cheques Recibidos' : 'Cheques Emitidos';
  const color  = tipo === 'recibido' ? '#1a5f8a' : '#7B3F00';
  const bgRes  = tipo === 'recibido' ? '#eef5fb' : '#fdf5ee';
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const filtroDesc = _chequesFiltroDesc(tipo);

  const tablaCols = cols.map(c =>
    `<th style="background:${color};color:#fff;padding:7px 10px;font-size:12px;text-align:left;white-space:nowrap">${c.label}</th>`
  ).join('');
  const tablaFilas = filas.map((f, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : bgRes}">
      ${f.map(v => `<td style="padding:6px 10px;font-size:12px;border-bottom:1px solid #eee">${v}</td>`).join('')}
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    @media print { @page { margin:15mm 12mm; } .no-print { display:none; } }
    body { font-family:Arial,sans-serif; color:#222; margin:0; padding:20px; }
    h1 { font-size:20px; color:${color}; margin:0 0 4px; }
    .sub { font-size:13px; color:#666; margin-bottom:4px; }
    .resumen { background:${bgRes}; border-left:4px solid ${color}; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0; font-size:14px; }
    table { width:100%; border-collapse:collapse; margin-top:16px; }
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>💳 ${titulo}</h1>
      <div class="sub">Reporte · ${hoy}</div>
      <div class="sub" style="color:${color}">${filtroDesc}</div>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:8px 18px;background:${color};color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimir / PDF</button>
  </div>
  <div class="resumen">
    <div style="font-weight:700;margin-bottom:6px">Resumen · ${rows.length} cheque${rows.length !== 1 ? 's' : ''} · Total: ${fmtMonto(totMonto, 'ARS')}</div>
    <div style="font-size:13px">${desgloseHtml}</div>
  </div>
  <table>
    <thead><tr>${tablaCols}</tr></thead>
    <tbody>${tablaFilas}</tbody>
  </table>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}
