// kidzee.games is retired: everything moves permanently (301) to gameindubai.com.
// /sw.js is a kill switch, so phones that installed the old site drop its cache and follow the redirect.
const DEST = 'https://gameindubai.com';
const map = p => (p.startsWith('/pew-pew-space') ? '/games/pew-pew-space/' : '/');
const KILL_SW = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) {
    try { const p = new URL(c.url).pathname; c.navigate('${DEST}' + (p.startsWith('/pew-pew-space') ? '/games/pew-pew-space/' : '/')); } catch (e) {}
  }
})()));`;
export default {
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === '/sw.js') return new Response(KILL_SW, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-cache, no-store' } });
    return new Response(null, { status: 301, headers: { location: DEST + map(u.pathname), 'cache-control': 'public, max-age=86400' } });
  }
};
