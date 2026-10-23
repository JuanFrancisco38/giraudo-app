const SUPABASE_URL = 'https://lwzqtrjtqzfkvdztrvse.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fb8e8haYdLGyHmnJ3KBA-g_ChkEIhY1';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validar que el pedido viene de un usuario logueado con permiso
  const auth = req.headers.authorization || '';
  if (!/^Bearer\s+\S+/i.test(auth)) return res.status(401).json({ error: 'No autorizado' });

  const permRes = await fetch(`${SUPABASE_URL}/rest/v1/permisos_usuario?select=modulos&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: auth }
  }).catch(() => null);
  if (!permRes || !permRes.ok) return res.status(401).json({ error: 'No autorizado' });

  const filas = await permRes.json();
  const modulos = filas?.[0]?.modulos || [];
  if (!modulos.includes('admin') && !modulos.includes('ganaderia'))
    return res.status(403).json({ error: 'Sin permiso' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Limitar max_tokens para evitar uso indebido costoso
    if (body.max_tokens && body.max_tokens > 4000) body.max_tokens = 4000;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
