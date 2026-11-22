STARGLOW VERSION 29 — ENKA UID PROXY PATCH

Files:
- public/index.html : Starglow Version 28 with only the UID fetch path and
  obsolete CORS fallback message updated.
- worker.js         : Cloudflare Worker routes /api/enka/uid/{uid}/?info to
  the fixed Enka API endpoint and serves the static site through ASSETS.
- wrangler.toml     : Cloudflare Workers + Static Assets configuration.

DEPLOY
1. Keep this folder structure intact.
2. From this folder, run: npx wrangler deploy
   (Wrangler must be authenticated to the Cloudflare account that owns the
   Starglow deployment.)
3. If the existing Worker has a different Cloudflare name, change the `name`
   value in wrangler.toml to the exact existing Worker name before deploying.
4. Test the public site, then open:
   https://YOUR-STARGLOW-DOMAIN/api/enka/uid/100000000/?info
   A JSON response (or a meaningful Enka error) confirms the proxy route is
   responding. Use your own valid UID for an actual profile lookup.

IMPORTANT
- This package does not deploy itself and does not change Cloudflare remotely.
- Deploy the Worker and static assets together using this config so the HTML
  and /api route share the same origin.
- The proxy accepts only GET/OPTIONS and a numeric UID path; it cannot fetch
  arbitrary URLs and does not require any secret or API key.
