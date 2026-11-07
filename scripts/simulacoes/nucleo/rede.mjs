// Guarda de rede do simulador. É ela que garante que nada chega ao Supabase de produção.
//
// Modo "dev" (rodadas com dados falsos): lista de permissão. Só passa o que vem do próprio Vite local
// (mesma origem, data:, blob:). Todo o resto é abortado e anotado: *.supabase.co, Turnstile, WhatsApp,
// qualquer outro site. Camadas extras, em servidor.mjs e sessao.mjs: o Vite sobe com a URL e a chave do
// Supabase trocadas por um projeto que não existe, o Service Worker fica bloqueado no contexto, WebSocket só
// fala com o HMR local e o sendBeacon para fora vira no-op.
//
// Modo "producao" (rodada curta no torcida.kauewalter.com.br): só GET ao próprio site e GET de leitura em
// /rest/v1/ do Supabase. POST, PATCH, PUT, DELETE, OPTIONS, /auth/, /rpc/, /functions/, o Turnstile e qualquer
// outro site são abortados. Worker e SharedWorker ficam desligados (passariam por fora do route), e cada
// resposta recebida é auditada à parte: o que respondeu de fora da lista vira "furo" e para a rodada.
// O jogo deve cair no "sem valer pontos".

const TURNSTILE = /(^|\.)challenges\.cloudflare\.com$/i;
const SUPABASE = /(^|\.)supabase\.(co|in|net)$/i;

export function categoria(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return 'outro';
  }
  if (SUPABASE.test(u.hostname)) {
    if (u.pathname.startsWith('/auth/')) return 'supabase-auth';
    if (u.pathname.includes('/rpc/')) return 'supabase-rpc';
    if (u.pathname.startsWith('/functions/')) return 'supabase-funcoes';
    if (u.pathname.startsWith('/realtime/')) return 'supabase-realtime';
    if (u.pathname.startsWith('/storage/')) return 'supabase-storage';
    return 'supabase-rest';
  }
  if (TURNSTILE.test(u.hostname)) return 'turnstile';
  if (u.hostname === 'torcida.kauewalter.com.br') return 'site';
  if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return 'local';
  if (/whatsapp\.com$|wa\.me$/i.test(u.hostname)) return 'whatsapp';
  if (/instagram\.com$/i.test(u.hostname)) return 'instagram';
  return 'externo';
}

/**
 * Liga a guarda num contexto. `registro` recebe cada decisão:
 *   { quando, metodo, url, categoria, decisao: 'bloqueada' | 'liberada', motivo }
 */
export async function ligarGuarda(contexto, { modo, origemLocal, registro, origemSite = 'https://torcida.kauewalter.com.br' }) {
  if (modo !== 'dev' && modo !== 'producao') throw new Error(`modo de rede desconhecido: ${modo}`);
  const anotar = (req, decisao, motivo) =>
    registro.push({
      quando: Date.now(),
      metodo: req.method(),
      url: req.url().slice(0, 300),
      categoria: categoria(req.url()),
      tipo: req.resourceType(),
      decisao,
      motivo,
    });

  await contexto.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    if (modo === 'dev') {
      if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      let origem = '';
      try {
        origem = new URL(url).origin;
      } catch {
        /* url estranha: bloqueia */
      }
      if (origem === origemLocal) return route.continue();
      anotar(req, 'bloqueada', 'fora do Vite local');
      return route.abort('blockedbyclient');
    }
    // producao
    if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    const cat = categoria(url);
    let caminho = '';
    try {
      caminho = new URL(url).pathname;
    } catch {
      /* bloqueia abaixo */
    }
    const metodo = req.method().toUpperCase();
    let motivo = '';
    if (metodo !== 'GET') motivo = `método ${metodo}`;
    else if (/\/auth\//.test(caminho)) motivo = '/auth/';
    else if (/\/rpc\//.test(caminho)) motivo = '/rpc/';
    else if (/\/functions\//.test(caminho)) motivo = '/functions/';
    else if (cat === 'turnstile') motivo = 'Turnstile';
    else if (!caminho) motivo = 'url inválida';
    // Lista de permissão também na produção: o próprio site e leitura em /rest/v1/ do Supabase. Nada de terceiros.
    else if (cat.startsWith('supabase') && !/^\/rest\/v1\//.test(caminho)) motivo = 'Supabase fora de /rest/v1/';
    else if (!cat.startsWith('supabase') && new URL(url).origin !== origemSite) motivo = 'outro site';
    else if (/%[0-9a-f]{2}/i.test(caminho)) motivo = 'caminho codificado';
    if (motivo) {
      anotar(req, 'bloqueada', motivo);
      return route.abort('blockedbyclient');
    }
    anotar(req, 'liberada', 'GET');
    return route.continue();
  });

  // WebSocket: no dev, só o HMR do Vite local; na produção, nenhum (o Realtime do Supabase fica de fora).
  await contexto.routeWebSocket(/.*/, (ws) => {
    const url = ws.url();
    let local = false;
    try {
      local = modo === 'dev' && new URL(url.replace(/^ws/, 'http')).origin === origemLocal;
    } catch {
      /* url estranha: bloqueia */
    }
    registro.push({
      quando: Date.now(),
      metodo: 'WS',
      url: url.slice(0, 300),
      categoria: local ? 'vite-hmr' : categoria(url.replace(/^ws/, 'http')),
      tipo: 'websocket',
      decisao: local ? 'liberada' : 'bloqueada',
      motivo: local ? 'HMR local' : 'WebSocket para fora',
    });
    if (local) ws.connectToServer();
    else ws.close({ code: 1008, reason: 'simulador' });
  });

  // Worker e SharedWorker passam por fora do route (revisão de 06/11/2026). O jogo não usa nenhum dos dois.
  await contexto.addInitScript('window.Worker = undefined; window.SharedWorker = undefined;');

  // Auditoria independente da decisão: tudo que de fato respondeu. Se algo de fora respondeu, é furo.
  contexto.on('response', (r) => {
    const u = r.url();
    if (/^(data|blob):/.test(u)) return;
    let origem = '';
    let caminho = '';
    let host = '';
    try {
      ({ origin: origem, pathname: caminho, hostname: host } = new URL(u));
    } catch {
      /* conta como furo abaixo */
    }
    const metodo = r.request().method().toUpperCase();
    const furo =
      modo === 'dev'
        ? origem !== origemLocal
        : metodo !== 'GET' || /\/(auth|rpc|functions)\//.test(caminho) || (origem !== origemSite && !(SUPABASE.test(host) && caminho.startsWith('/rest/v1/')));
    if (furo)
      registro.push({ quando: Date.now(), metodo, url: u.slice(0, 300), categoria: categoria(u), tipo: 'resposta', decisao: 'furo', motivo: 'respondeu de fora da lista' });
  });
}

/** Script de início de página: sendBeacon para outra origem não sai (o route já pega; isto é cinto e suspensório). */
export function scriptDaGuarda(modo) {
  return `(() => {
    const modo = ${JSON.stringify(modo)};
    const orig = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
    if (!orig) return;
    navigator.sendBeacon = (url, dados) => {
      try {
        const u = new URL(url, location.href);
        if (modo === 'producao' || u.origin !== location.origin) { window.__simBeacons = (window.__simBeacons || 0) + 1; return true; }
      } catch { return true; }
      return orig(url, dados);
    };
  })();`;
}

/** Resumo do registro para o relatório: contagem por categoria e decisão. */
export function resumoDaRede(registro) {
  const r = {};
  for (const e of registro) {
    const k = `${e.decisao}:${e.categoria}`;
    r[k] = (r[k] ?? 0) + 1;
  }
  return r;
}

/** Nenhuma requisição liberada pode ter ido a outra origem no dev, nem ser escrita na produção. */
export function conferirGuarda(registro) {
  return registro.filter((e) => e.decisao === 'furo');
}
