const SUPABASE_URL = 'https://lwzqtrjtqzfkvdztrvse.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fb8e8haYdLGyHmnJ3KBA-g_ChkEIhY1';

const hoy = new Date();
document.getElementById('fecha-top').textContent = hoy.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
document.querySelectorAll('input[type="date"]').forEach(i=>{if(!i.value)i.value=hoy.toISOString().split('T')[0]});

async function extraerDocIA(file, system, instruccion) {
  if (file.size > 3.5 * 1024 * 1024) {
    throw new Error('El archivo pesa ' + (file.size / 1048576).toFixed(1) + ' MB. Probá con uno de menos de 3.5 MB (comprimí el PDF o sacale una foto más liviana).');
  }
  const base64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = () => rej(new Error('Error al leer'));
    r.readAsDataURL(file);
  });
  const isPdf = file.type === 'application/pdf';
  const block = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } };
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: [block, { type: 'text', text: instruccion }] }]
    })
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  if (!json.content) throw new Error('El modelo no devolvió contenido (status ' + res.status + ')');
  let raw = json.content?.filter(c => c.type === 'text').map(c => c.text).join('') || '{}';
  raw = raw.replace(/```json|```/g, '').trim();
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No se encontró JSON en la respuesta');
  return JSON.parse(m[0]);
}

function parseFechaIA(str) {
  const p = (str || '').split('/');
  return p.length === 3 ? `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` : '';
}

function fmtFecha(f) {
  if (!f) return '—';
  const m = String(f).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return f;
}

async function sb(method, table, data=null, query='') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : ''
    }
  };
  if (data) opts.body = JSON.stringify(data);
  const r = await fetch(url, opts);
  if (!r.ok) { console.error(await r.text()); return null; }
  return method === 'DELETE' ? null : r.json();
}

function showSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  if (el) el.classList.add('active');
  const titles = {
    dashboard:'Dashboard', importar:'Importar jornada', ia:'Consultas IA',
    animales:'Animales', eventos:'Eventos manga', pesadas:'Pesadas',
    hoteleria:'Hotelería', alimentacion:'Alimentación',
    liq_hacienda:'Liquidaciones hacienda', trabajos_agri:'Trabajos de campo',
    agro_dash:'Resumen agrícola',
    lotes:'Lotes / Historia', liq_granos:'Liquidaciones granos',
    certificaciones:'Certificaciones', maquinaria:'Maquinaria',
    mantenimiento:'Mantenimiento', precios:'Precios relativos',
    boletas:'Facturas recibidas', facturas_emitidas:'Facturas emitidas', movimientos:'Movimientos',
    retenciones:'Retenciones', balance:'Balance mensual'
  };
  if (id === 'boletas') cargarBoletas();
  if (id === 'precios') cargarHistorialPrecios();
  if (id === 'trabajos_agri') cargarTrabajos();
  if (id === 'agro_dash') cargarAgroDashboard();
  if (id === 'liq_granos') { cargarLiqGranos(); cargarResumenGranos(); }
  if (id === 'certificaciones') cargarCertificaciones();
  if (id === 'facturas_emitidas') cargarFacturasEmitidas();
  if (id === 'mantenimiento') cargarMantenimiento();
  if (id === 'dashboard') cargarDashboard();
  document.getElementById('topbar-title').textContent = titles[id] || id;
  closeSidebar();
}

function proximamente(nombre, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-proximamente').classList.add('active');
  document.getElementById('prox-nombre').textContent = nombre;
  document.getElementById('topbar-title').textContent = nombre;
  if (el) el.classList.add('active');
  closeSidebar();
}

function switchTab(tabEl, targetId) {
  const section = tabEl.closest('.section');
  section.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  section.querySelectorAll('[id]').forEach(el => {
    if (el.id.startsWith('tab-')) el.style.display = (el.id === targetId) ? '' : 'none';
  });
  if (targetId.includes('lista')) {
    if (targetId.includes('ani')) cargarAnimales();
    if (targetId.includes('ev'))  cargarEventos();
    if (targetId.includes('pes')) cargarPesadas();
  }
}

function switchTabImportar(tabEl, targetId) {
  tabEl.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  ['imp-tab-texto','imp-tab-imagen'].forEach(id => {
    document.getElementById(id).style.display = id === targetId ? '' : 'none';
  });
}

function toggleForm(id) {
  const f = document.getElementById(id);
  f.style.display = f.style.display === 'none' ? '' : 'none';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function toast(msg, color='var(--bordo)') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = color;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
