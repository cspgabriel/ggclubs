// Cloudflare Pages Functions - Serverless REST API para GGClubs
export async function onRequest(context: any) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Healthcheck
  if (path === '/' || path === '/health') {
    return new Response(JSON.stringify({
      service: 'GGClubs API (Cloudflare D1 Edge)',
      status: 'ok',
      version: '1.0.0',
      database: 'Cloudflare D1',
      timestamp: Date.now()
    }), { headers });
  }

  // Se o banco D1 estiver conectado (env.DB)
  if (env && env.DB) {
    try {
      // /public/live-tournament
      if (path === '/public/live-tournament') {
        const { results: tournaments } = await env.DB.prepare(
          "SELECT * FROM tournaments WHERE status = 'OPEN' OR status = 'IN_PROGRESS' LIMIT 1"
        ).all();

        const tournament = tournaments[0] || null;
        let clubs: any[] = [];
        let registrations: any[] = [];
        let matches: any[] = [];

        if (tournament) {
          const regRes = await env.DB.prepare(
            "SELECT * FROM tournament_registrations WHERE tournament_id = ?"
          ).bind(tournament.id).all();
          registrations = regRes.results || [];

          const clubsRes = await env.DB.prepare("SELECT * FROM clubs LIMIT 16").all();
          clubs = clubsRes.results || [];

          const matchesRes = await env.DB.prepare(
            "SELECT * FROM matches WHERE tournament_id = ?"
          ).bind(tournament.id).all();
          matches = matchesRes.results || [];
        }

        return new Response(JSON.stringify({
          tournament,
          registrations,
          matches,
          clubs
        }), { headers });
      }

      // /public/handle-available?handle=...
      if (path.startsWith('/public/handle-available')) {
        const handle = url.searchParams.get('handle');
        const { results } = await env.DB.prepare(
          "SELECT id FROM users WHERE LOWER(handle) = LOWER(?) LIMIT 1"
        ).bind(handle || '').all();
        return new Response(JSON.stringify({ available: results.length === 0 }), { headers });
      }

      // /public/club-tag-available?tag=...
      if (path.startsWith('/public/club-tag-available')) {
        const tag = url.searchParams.get('tag');
        const { results } = await env.DB.prepare(
          "SELECT id FROM clubs WHERE UPPER(tag) = UPPER(?) LIMIT 1"
        ).bind(tag || '').all();
        return new Response(JSON.stringify({ available: results.length === 0 }), { headers });
      }
    } catch (dbErr: any) {
      return new Response(JSON.stringify({ error: dbErr.message }), { status: 500, headers });
    }
  }

  // Fallback para rotas públicas simuladas caso D1 ainda não esteja executado
  if (path === '/public/live-tournament') {
    return new Response(JSON.stringify({
      tournament: {
        id: 'trn_demo_1',
        title: 'Copa GGClubs Pro - Edição Inaugural',
        description: 'Campeonato de Pro Clubs com premiação e chaveamento ao vivo.',
        format: 'GROUPS_AND_KNOCKOUT',
        maxTeams: 16,
        registeredTeams: 8,
        prizePool: 'R$ 2.500,00',
        status: 'OPEN',
      },
      registrations: [],
      matches: [],
      clubs: []
    }), { headers });
  }

  return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } }), {
    status: 404,
    headers
  });
}
