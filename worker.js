/**
 * Starglow · Cloudflare Worker
 * Serves the static Starglow site and proxies public Enka UID lookups.
 * Enka target is intentionally fixed; this is not an open proxy.
 */
const ENKA_ORIGIN = 'https://enka.network';
const UID_ROUTE = /^\/api\/enka\/uid\/(\d{8,10})\/$/;
const UPSTREAM_TIMEOUT_MS = 15000;

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function withCors(response, request) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get('Origin');
  // The site uses a same-origin request. Reflect only this Worker origin;
  // do not turn the endpoint into a public cross-origin proxy.
  if (origin && origin === new URL(request.url).origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.append('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/enka/')) {
      if (request.method === 'OPTIONS') {
        return withCors(new Response(null, { status: 204 }), request);
      }
      if (request.method !== 'GET') {
        return withCors(json({ message: 'Method not allowed.' }, 405, { Allow: 'GET, OPTIONS' }), request);
      }

      const match = url.pathname.match(UID_ROUTE);
      if (!match) {
        return withCors(json({ message: 'Invalid UID route. Use an 8–10 digit Genshin UID.' }, 400), request);
      }

      const upstreamUrl = `${ENKA_ORIGIN}/api/uid/${match[1]}/?info`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort('Enka request timed out'), UPSTREAM_TIMEOUT_MS);

      try {
        const upstream = await fetch(upstreamUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Starglow/29 (public Genshin profile lookup)',
          },
          signal: controller.signal,
        });

        // Preserve Enka's status and JSON body so the existing UI can show
        // meaningful 404/429/maintenance messages rather than masking them.
        const headers = new Headers(upstream.headers);
        headers.set('content-type', headers.get('content-type') || 'application/json; charset=utf-8');
        headers.set('cache-control', 'no-store');
        return withCors(new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers,
        }), request);
      } catch (error) {
        const timedOut = error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('timed out');
        return withCors(json({
          message: timedOut
            ? 'Enka did not respond in time. Please try again shortly.'
            : 'Starglow could not reach Enka.Network. Please try again shortly.',
        }, timedOut ? 504 : 502), request);
      } finally {
        clearTimeout(timeout);
      }
    }

    // Cloudflare Static Assets serves index.html and all existing site assets.
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Starglow static asset binding is not configured.', { status: 500 });
  },
};
