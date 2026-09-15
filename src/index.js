const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function defaultPayload() {
  return {
    days: [1, 2, 3].map((n) => ({ id: n, name: `Giorno ${n}`, exercises: [] })),
    history: [],
    nextDayId: 4,
    nextExerciseId: 1,
  };
}

function cleanUsername(value) {
  const username = String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (username.length < 2 || username.length > 30) {
    throw Object.assign(new Error('Il nome utente deve avere da 2 a 30 caratteri.'), { status: 400 });
  }
  if (!/^[\p{L}\p{N}._ -]+$/u.test(username)) {
    throw Object.assign(new Error('Usa solo lettere, numeri, spazio, punto, trattino o underscore.'), { status: 400 });
  }
  return { username, key: username.toLocaleLowerCase('it-IT') };
}

function validatePayload(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.days) || !Array.isArray(data.history)) {
    throw Object.assign(new Error('Dati GymTrack non validi.'), { status: 400 });
  }
  if (data.days.length > 30) throw Object.assign(new Error('Massimo 30 giorni.'), { status: 400 });
  if (data.history.length > 10000) throw Object.assign(new Error('Storico troppo grande.'), { status: 400 });
  return {
    days: data.days,
    history: data.history,
    nextDayId: Number(data.nextDayId) || 1,
    nextExerciseId: Number(data.nextExerciseId) || 1,
  };
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readJson(request, maxBytes = 5 * 1024 * 1024) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw Object.assign(new Error('Richiesta troppo grande.'), { status: 413 });
  let body;
  try {
    body = await request.json();
  } catch {
    throw Object.assign(new Error('JSON non valido.'), { status: 400 });
  }
  return body;
}

async function authUser(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;

  const row = await env.DB.prepare(`
    SELECT s.token, s.user_id, s.expires_at, u.username
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).bind(token).first();

  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return { token, userId: row.user_id, username: row.username };
}

async function handleApi(request, env, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    const dbCheck = await env.DB.prepare('SELECT 1 AS ok').first();
    return json(200, { ok: dbCheck?.ok === 1 });
  }

  if (request.method === 'POST' && url.pathname === '/api/login') {
    const body = await readJson(request, 64 * 1024);
    const { username, key } = cleanUsername(body.username);

    let user = await env.DB.prepare('SELECT id, username FROM users WHERE username_key = ?').bind(key).first();
    if (!user) {
      const now = new Date().toISOString();
      const insert = await env.DB.prepare(
        'INSERT INTO users(username, username_key, created_at) VALUES(?, ?, ?)'
      ).bind(username, key, now).run();
      const userId = Number(insert.meta.last_row_id);
      await env.DB.prepare(
        'INSERT INTO user_data(user_id, payload, updated_at) VALUES(?, ?, ?)'
      ).bind(userId, JSON.stringify(defaultPayload()), now).run();
      user = { id: userId, username };
    }

    const token = randomToken();
    const now = new Date().toISOString();
    const expires = Date.now() + 180 * 24 * 60 * 60 * 1000;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO sessions(token, user_id, created_at, expires_at) VALUES(?, ?, ?, ?)')
        .bind(token, user.id, now, expires),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
    ]);

    return json(200, {
      token,
      username: user.username,
      warning: 'Accesso basato solo sul nome utente: chi conosce il nome può accedere al profilo.',
    });
  }

  const user = await authUser(request, env);
  if (!user) return json(401, { error: 'Sessione non valida. Effettua di nuovo l’accesso.' });

  if (request.method === 'GET' && url.pathname === '/api/data') {
    let row = await env.DB.prepare('SELECT payload, updated_at FROM user_data WHERE user_id = ?')
      .bind(user.userId).first();
    if (!row) {
      const now = new Date().toISOString();
      const payload = JSON.stringify(defaultPayload());
      await env.DB.prepare('INSERT INTO user_data(user_id, payload, updated_at) VALUES(?, ?, ?)')
        .bind(user.userId, payload, now).run();
      row = { payload, updated_at: now };
    }
    return json(200, { username: user.username, data: JSON.parse(row.payload), updatedAt: row.updated_at });
  }

  if (request.method === 'PUT' && url.pathname === '/api/data') {
    const body = validatePayload(await readJson(request));
    const now = new Date().toISOString();
    const payload = JSON.stringify(body);
    await env.DB.prepare(`
      INSERT INTO user_data(user_id, payload, updated_at)
      VALUES(?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `).bind(user.userId, payload, now).run();
    return json(200, { ok: true, updatedAt: now });
  }

  if (request.method === 'POST' && url.pathname === '/api/logout') {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(user.token).run();
    return json(200, { ok: true });
  }

  return json(404, { error: 'Endpoint non trovato.' });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, url);
      }

      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      headers.set('X-Frame-Options', 'DENY');
      headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (err) {
      return json(err.status || 500, { error: err.status ? err.message : 'Errore interno del server.' });
    }
  },
};
