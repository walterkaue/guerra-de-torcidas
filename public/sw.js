// Service worker leve do Guerra de Torcidas (PWA, sem push por enquanto).
// Regra: o jogo sempre busca na rede o que muda (a página, os dados do Supabase); o cache só
// acelera o que nunca muda (arquivos com hash do build) e segura a página se a conexão cair.
// Nada de outro domínio (Supabase, funções, APIs) passa por aqui.

const VERSAO = 'gt-v1';
const CACHE_PAGINA = `${VERSAO}-pagina`;
const CACHE_ARQUIVOS = `${VERSAO}-arquivos`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // A página: rede primeiro (deploy novo aparece na hora); sem rede, a última que abriu.
  if (req.mode === 'navigate') {
    evento.respondWith(redePrimeiro(req));
    return;
  }
  // Arquivos do build têm hash no nome e nunca mudam: cache primeiro.
  if (url.pathname.startsWith('/assets/')) {
    evento.respondWith(cachePrimeiro(req));
    return;
  }
  // Fontes e ícones: devolve o que tem e atualiza por trás.
  if (url.pathname.startsWith('/fontes/') || url.pathname.startsWith('/icones/') || url.pathname === '/favicon.svg') {
    evento.respondWith(cacheEAtualiza(req));
  }
});

async function redePrimeiro(req) {
  const cache = await caches.open(CACHE_PAGINA);
  try {
    const resp = await fetch(req);
    if (resp.ok) await cache.put('/', resp.clone());
    return resp;
  } catch {
    return (await cache.match('/')) ?? Response.error();
  }
}

async function cachePrimeiro(req) {
  const cache = await caches.open(CACHE_ARQUIVOS);
  const guardada = await cache.match(req);
  if (guardada) return guardada;
  const resp = await fetch(req);
  if (resp.ok) await cache.put(req, resp.clone());
  return resp;
}

async function cacheEAtualiza(req) {
  const cache = await caches.open(CACHE_ARQUIVOS);
  const guardada = await cache.match(req);
  const nova = fetch(req)
    .then(async (resp) => {
      if (resp.ok) await cache.put(req, resp.clone());
      return resp;
    })
    .catch(() => guardada ?? Response.error());
  return guardada ?? nova;
}
