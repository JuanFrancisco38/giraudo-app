# Reglas del proyecto — Giraudo App

## Infraestructura
- La app está en **Vercel** (giraudo-app.vercel.app). La función de IA es `api/claude.js`.
- No hay Netlify. Ignorar cualquier referencia a Netlify en el historial.

## Supabase
- Todo pedido REST pasa por `sb()` (en `js/core.js`) o por `authHeaders()`.
- **Nunca** usar la clave pública (`SUPABASE_KEY`) como `Authorization: Bearer` directamente.
  `sb()` y `authHeaders()` resuelven el token correcto.

## /api/claude
- Todo llamado a `/api/claude` usa `headers: await headersClaude()` (definida en `js/auth.js`).
- **Nunca** `headers: {'Content-Type':'application/json'}` en pedidos a `/api/claude`.

## Tablas nuevas
- Todo archivo SQL de tabla nueva termina con:
  ```sql
  select bloquear_tabla('<tabla>', '<módulo>');
  ```
  Módulos disponibles: `admin`, `ganaderia`, `lluvias`.
  Una tabla nueva sin esto queda abierta a cualquiera.

## Antes de pushear

- Después de editar cualquier archivo `.js`, correr `node --check` en cada uno que se tocó.
  Comando rápido desde la raíz del repo:
  ```
  for f in js/*.js js/*/*.js api/*.js; do node --check "$f" || echo "FALLA $f"; done
  ```
  No pushear si falla alguno.

## Permisos de pantallas
- Toda sección nueva se agrega a `SECCION_MODULO` en `js/auth.js`.
  Si no está en el mapa, queda visible solo para admin.
