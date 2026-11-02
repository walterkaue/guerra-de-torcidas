// Service worker leve do Guerra de Torcidas (PWA, sem push por enquanto).
// Regra: o jogo sempre busca na rede o que muda (a página, os dados do Supabase); o cache só
// acelera o que nunca muda (arquivos com hash do build) e segura a página se a conexão cair.
// Nada de outro domínio (Supabase, funções, APIs) passa por aqui.

const VERSAO = 'gt-v2';
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

// ---------- aviso de domingo (push) ----------
// O servidor manda { titulo, corpo, url }. Sem dado, mostra um aviso genérico.
self.addEventListener('push', (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : '' };
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Guerra de Torcidas', {
      body: dados.corpo || 'A semana tá fechando. Bora somar pra sua torcida?',
      icon: '/icones/icone-192.png',
      badge: '/icones/icone-192.png',
      tag: 'aviso-semana',
      renotify: false,
      data: { url: dados.url || '/' },
    }),
  );
});

// Tocar no aviso: volta para a aba do jogo aberta ou abre uma nova.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url || '/', self.location.origin).href;
  evento.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const aba = abas.find((c) => new URL(c.url).origin === self.location.origin);
      if (aba) {
        await aba.focus();
        if ('navigate' in aba) await aba.navigate(destino).catch(() => {});
        return;
      }
      await self.clients.openWindow(destino);
    })(),
  );
});
