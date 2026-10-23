// Autenticación — Fase 1
// Los datos siguen siendo accesibles con la clave pública hasta la Fase 2.

const SESION_KEY      = 'giraudo_sesion';
const DOMINIO_USUARIO = '@giraudo.app';

let USUARIO = null;           // { id, usuario, nombre, modulos, landing, campo_default }
let _renovando = null;        // promesa compartida para evitar doble renovación
const _colaLogin = [];        // callbacks que esperan al login

// ── Helpers ───────────────────────────────────────────────────────────────────

function emailDeUsuario(txt) {
  if (!txt) return '';
  const t = txt.trim().toLowerCase();
  return t.includes('@') ? t : t + DOMINIO_USUARIO;
}

function _sesionGuardada() {
  try { return JSON.parse(localStorage.getItem(SESION_KEY)); } catch (_) { return null; }
}

function _guardarSesion(data) {
  const s = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    data.expires_at ?? (Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600)),
    user_id:       data.user?.id ?? data.user_id,
  };
  localStorage.setItem(SESION_KEY, JSON.stringify(s));
  return s;
}

// ── Token vigente (renueva si hace falta) ────────────────────────────────────

async function tokenActual() {
  const s = _sesionGuardada();
  if (!s) return null;

  // Quedan más de 60 s → OK
  if (s.expires_at - Math.floor(Date.now() / 1000) > 60) return s.access_token;

  // Renovar — una sola promesa compartida para no girar el refresh_token dos veces
  if (!_renovando) {
    _renovando = fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    })
      .then(async r => {
        if (!r.ok) { localStorage.removeItem(SESION_KEY); return null; }
        const data = await r.json();
        _guardarSesion(data);
        return data.access_token;
      })
      .catch(() => { localStorage.removeItem(SESION_KEY); return null; })
      .finally(() => { _renovando = null; });
  }
  return _renovando;
}

// ── Headers para consultas a Supabase ────────────────────────────────────────

async function authHeaders() {
  const token = await tokenActual();
  return {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + (token || SUPABASE_KEY),
  };
}

// ── Mapa secciones → módulos ──────────────────────────────────────────────────

const SECCION_MODULO = {
  lluvias:       'lluvias',
  manga:         'ganaderia',
  pastoreos:     'ganaderia',
  'indices-repro': 'ganaderia',
  animales:      'ganaderia',
  eventos:       'ganaderia',
  pesadas:       'ganaderia',
  hoteleria:     'ganaderia',
  alimentacion:  'ganaderia',
};

function esAdmin() { return USUARIO?.modulos?.includes('admin') ?? false; }

function puedeVer(seccion) {
  if (!USUARIO) return false;
  if (esAdmin()) return true;
  const mod = SECCION_MODULO[seccion];
  return !!mod && USUARIO.modulos.includes(mod);
}

// ── Cola post-login ───────────────────────────────────────────────────────────

function alIniciarSesion(fn) {
  if (USUARIO) { fn(); } else { _colaLogin.push(fn); }
}

function _ejecutarCola() {
  while (_colaLogin.length) _colaLogin.shift()();
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function iniciarSesion(usuario, clave) {
  const email = emailDeUsuario(usuario);
  const btn   = document.getElementById('login-btn');
  const err   = document.getElementById('login-error');
  btn.disabled = true;
  btn.textContent = 'Entrando…';
  err.textContent = '';

  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ email, password: clave }),
  }).catch(() => null);

  if (!r || !r.ok) {
    err.textContent = 'Usuario o contraseña incorrectos.';
    btn.disabled = false;
    btn.textContent = 'Entrar';
    return;
  }

  const data = await r.json();
  const ses  = _guardarSesion(data);
  await _arrancarConSesion(ses);
}

// ── Cerrar sesión ─────────────────────────────────────────────────────────────

function cerrarSesion() {
  localStorage.removeItem(SESION_KEY);
  location.reload();
}

// ── Cargar permisos y mostrar la app ─────────────────────────────────────────

async function _arrancarConSesion(ses, mensajeVencida) {
  // Leer fila propia de permisos_usuario con el token del usuario
  const headers = await authHeaders();
  const perm = await fetch(
    `${SUPABASE_URL}/rest/v1/permisos_usuario?user_id=eq.${ses.user_id}&limit=1`,
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  ).then(r => r.ok ? r.json() : null).catch(() => null);

  if (!perm || !perm.length) {
    _mostrarError('Tu usuario todavía no tiene permisos asignados. Avisale a Juan.');
    localStorage.removeItem(SESION_KEY);
    return;
  }

  USUARIO = {
    id:            ses.user_id,
    usuario:       perm[0].usuario,
    nombre:        perm[0].nombre,
    modulos:       perm[0].modulos,
    landing:       perm[0].landing,
    campo_default: perm[0].campo_default,
  };

  _filtrarMenu();
  _actualizarPieSidebar();
  _ocultarLogin();

  if (mensajeVencida) {
    // No usamos toast() todavía porque puede no estar definido; lo posponemos
    setTimeout(() => toast && toast(mensajeVencida, 'var(--tierra)'), 300);
  }

  // Ir a la pantalla inicial
  const navItem = document.querySelector(`.nav-item[onclick*="showSection('${USUARIO.landing}'"]`);
  showSection(USUARIO.landing, navItem);

  _ejecutarCola();
}

// ── Filtrar menú según permisos ───────────────────────────────────────────────

function _filtrarMenu() {
  document.querySelectorAll('.nav-item').forEach(el => {
    const m = el.getAttribute('onclick') || '';
    const match = m.match(/showSection\('([^']+)'/);
    if (!match) return;
    const seccion = match[1];
    el.style.display = puedeVer(seccion) ? '' : 'none';
  });

  // Ocultar grupos vacíos
  document.querySelectorAll('.sidebar-group').forEach(grupo => {
    const visibles = [...grupo.querySelectorAll('.nav-item')].filter(el => el.style.display !== 'none');
    const header = grupo.previousElementSibling;
    const ocultar = visibles.length === 0;
    grupo.style.display = ocultar ? 'none' : '';
    if (header?.classList.contains('sidebar-section')) header.style.display = ocultar ? 'none' : '';
  });
}

// ── Pie del sidebar ───────────────────────────────────────────────────────────

function _actualizarPieSidebar() {
  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;
  footer.innerHTML = `
    <div style="font-weight:600;margin-bottom:2px">${USUARIO.nombre}</div>
    <div style="opacity:0.6;margin-bottom:8px">${esAdmin() ? 'Administrador' : 'Acceso limitado'}</div>
    <button onclick="cerrarSesion()" style="background:rgba(255,255,255,0.15);border:none;color:white;font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer;width:100%">Cerrar sesión</button>`;
}

// ── Overlay de login ──────────────────────────────────────────────────────────

function _ocultarLogin() {
  const ov = document.getElementById('login-overlay');
  if (ov) ov.style.display = 'none';
}

function _mostrarError(msg) {
  const el = document.getElementById('login-error');
  if (el) el.textContent = msg;
}

// ── Arranque ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const ses = _sesionGuardada();
  if (!ses) return; // queda el overlay visible

  // Renovar si hace falta
  const token = await tokenActual();
  if (!token) {
    _mostrarError('Tu sesión venció, entrá de nuevo.');
    return;
  }

  await _arrancarConSesion({ ...ses, access_token: token });
});
