// Aparelhos do simulador de uso (scripts/simulacoes). Cada um vira um contexto do Playwright.
// O motor é o do Playwright no Windows: WebKit aqui não é o Safari do iPhone, e trocar o user agent
// muda só o que o jogo detecta (src/jogo/aparelhos.ts, src/telas/convitePush.ts), não o navegador.
// Por isso o relatório tem a seção "Só no celular de verdade".

export const UA = {
  whatsappAndroid:
    'Mozilla/5.0 (Linux; Android 12; SM-A135M Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36 WhatsApp/2.24.22.79',
  instagramIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.21.95 (iPhone12,8; iOS 17_6; pt_BR; pt; scale=2.00; 750x1334; 641298567)',
  samsungInternet:
    'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  operaGx:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0 (Edition GX)',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; 23021RAA2Y) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  chromeFold:
    'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  // iPadOS manda o user agent de Mac; o que denuncia o iPad é o toque (maxTouchPoints > 1).
  safariIpad:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
};

/** Rede 4G ruim do Zé: 400 ms, 1,6 Mbps de descida. Só no Chromium (CDP). */
export const REDE_4G_RUIM = { latencia: 400, descidaKbps: 1600, subidaKbps: 750 };

/**
 * Campos:
 *  navegador   chromium | webkit | firefox
 *  largura/altura, escala (deviceScaleFactor), movel (isMobile, só Chromium), toque (hasTouch)
 *  ua          user agent
 *  cpu         quantas vezes mais lenta (Chromium)
 *  rede        { latencia, descidaKbps, subidaKbps } (Chromium)
 *  fonte       1.3 = fonte do sistema em 130% (aproximação, ver sessao.mjs)
 *  movimentoReduzido, tema ('dark'|'light'), economiaDeDados, instalado (display-mode standalone)
 */
export const APARELHOS = {
  'android-entrada': {
    nome: 'Android de entrada 360×740 · Chromium (WebView do WhatsApp)',
    navegador: 'chromium', largura: 360, altura: 740, escala: 2, movel: true, toque: true,
    ua: UA.whatsappAndroid, cpu: 6, rede: REDE_4G_RUIM, fonte: 1.3,
  },
  'iphone-se': {
    nome: 'iPhone SE 375×667 · WebKit (Instagram)',
    navegador: 'webkit', largura: 375, altura: 667, escala: 2, toque: true, ua: UA.instagramIphone,
  },
  's21-samsung': {
    nome: 'Galaxy S21 384×854 · Chromium (Samsung Internet)',
    navegador: 'chromium', largura: 384, altura: 854, escala: 3, movel: true, toque: true,
    ua: UA.samsungInternet, fonte: 1.5, movimentoReduzido: true,
  },
  'iphone-15-safari': {
    nome: 'iPhone 15 Pro Max 430×932 · WebKit (Safari)',
    navegador: 'webkit', largura: 430, altura: 932, escala: 3, toque: true, ua: UA.safariIphone,
  },
  'iphone-15-instalado': {
    nome: 'iPhone 15 Pro Max 430×932 · WebKit (jogo instalado)',
    navegador: 'webkit', largura: 430, altura: 932, escala: 3, toque: true, ua: UA.safariIphone, instalado: true,
  },
  'pc-firefox': {
    nome: 'PC 1920×1080 · Firefox (mouse e teclado)',
    navegador: 'firefox', largura: 1920, altura: 1080, escala: 1,
  },
  'notebook-opera': {
    nome: 'Notebook 1366×768 · Chromium (Opera GX)',
    navegador: 'chromium', largura: 1366, altura: 768, escala: 1, ua: UA.operaGx,
  },
  'fold-dobrado': {
    nome: 'Galaxy Z Fold dobrado 344×882 · Chromium',
    navegador: 'chromium', largura: 344, altura: 882, escala: 3, movel: true, toque: true, ua: UA.chromeFold,
  },
  'fold-aberto': {
    nome: 'Galaxy Z Fold aberto 884×1104 · Chromium',
    navegador: 'chromium', largura: 884, altura: 1104, escala: 2.5, movel: true, toque: true, ua: UA.chromeFold,
  },
  'redmi-escuro': {
    nome: 'Redmi Note 393×873 · Chromium (modo escuro, economia de dados)',
    navegador: 'chromium', largura: 393, altura: 873, escala: 2.75, movel: true, toque: true,
    ua: UA.chromeAndroid, tema: 'dark', economiaDeDados: true,
  },
  'ipad-em-pe': {
    nome: 'iPad 810×1080 em pé · WebKit',
    navegador: 'webkit', largura: 810, altura: 1080, escala: 2, toque: true, ua: UA.safariIpad,
  },
  'ipad-deitado': {
    nome: 'iPad 1080×810 deitado · WebKit',
    navegador: 'webkit', largura: 1080, altura: 810, escala: 2, toque: true, ua: UA.safariIpad,
  },
  // O menor celular da regra da Rota B (docs/visual.md, Início): 360×740, fonte do sistema normal.
  'android-360': {
    nome: 'Android 360×740 · Chromium',
    navegador: 'chromium', largura: 360, altura: 740, escala: 3, movel: true, toque: true, ua: UA.chromeAndroid,
  },
  // Referência do CLAUDE.md ("teste sempre em 390×844"), usada para a Carreira inteira no Perfil.
  'referencia-390': {
    nome: 'Referência 390×844 · Chromium',
    navegador: 'chromium', largura: 390, altura: 844, escala: 3, movel: true, toque: true, ua: UA.chromeAndroid,
  },
};

/** Opções de newContext do Playwright para um aparelho. */
export function opcoesDoContexto(ap) {
  const o = {
    viewport: { width: ap.largura, height: ap.altura },
    deviceScaleFactor: ap.escala ?? 1,
    hasTouch: !!ap.toque,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: ap.tema ?? 'light',
    reducedMotion: ap.movimentoReduzido ? 'reduce' : 'no-preference',
    // Service Worker passa por fora do page.route: bloqueado sempre (o jogo só registra o SW em produção).
    serviceWorkers: 'block',
    acceptDownloads: true,
  };
  if (ap.ua) o.userAgent = ap.ua;
  if (ap.movel && ap.navegador === 'chromium') o.isMobile = true;
  return o;
}

/** Script de início de página: o que o Playwright não emula sozinho. Roda antes do jogo. */
export function scriptDoAparelho(ap) {
  const cfg = {
    instalado: !!ap.instalado,
    economia: !!ap.economiaDeDados,
    ipad: ap.ua === UA.safariIpad,
    fonte: ap.fonte ?? 1,
  };
  return `(() => {
    const cfg = ${JSON.stringify(cfg)};
    const mm = window.matchMedia.bind(window);
    const falsos = {};
    if (cfg.instalado) { falsos['(display-mode: standalone)'] = true; falsos['(display-mode: browser)'] = false;
      try { Object.defineProperty(navigator, 'standalone', { get: () => true }); } catch {} }
    if (cfg.economia) falsos['(prefers-reduced-data: reduce)'] = true;
    if (Object.keys(falsos).length) {
      window.matchMedia = (q) => {
        const chave = String(q).trim();
        if (chave in falsos) {
          const r = mm(q);
          return { matches: falsos[chave], media: chave, onchange: null,
            addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
            __real: r };
        }
        return mm(q);
      };
    }
    if (cfg.economia) {
      try {
        const c = navigator.connection || {};
        Object.defineProperty(navigator, 'connection', { get: () => ({
          saveData: true, effectiveType: '3g', downlink: 1.5, rtt: 300, addEventListener() {}, removeEventListener() {} }) });
      } catch {}
    }
    if (cfg.ipad) { try { Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }); } catch {} }
    if (cfg.fonte !== 1) {
      // Fonte do sistema maior: o jogo usa px, então nem rem nem zoom imitam o Android. Aproximação: cada
      // elemento cresce uma vez, de cima para baixo, guardando o tamanho original em data-sim-fonte (quem herda
      // do pai usa o original do pai, para não crescer duas vezes). Não pega texto desenhado no canvas.
      const f = cfg.fonte;
      const crescer = (raiz) => {
        const els = raiz.querySelectorAll ? raiz.querySelectorAll('body *:not([data-sim-fonte])') : [];
        for (const el of els) {
          if (el.closest('svg') || /^(CANVAS|SCRIPT|STYLE|svg)$/.test(el.tagName)) continue;
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (!px) continue;
          let orig = px;
          const pai = el.parentElement;
          if (pai && pai.dataset && pai.dataset.simFonte) {
            const pp = parseFloat(getComputedStyle(pai).fontSize);
            if (Math.abs(px - pp) < 0.05) orig = parseFloat(pai.dataset.simFonte);
          }
          el.setAttribute('data-sim-fonte', String(orig));
          el.style.setProperty('font-size', (orig * f).toFixed(2) + 'px', 'important');
        }
      };
      const ligar = () => {
        crescer(document);
        new MutationObserver(() => crescer(document)).observe(document.documentElement, { childList: true, subtree: true });
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
    }
  })();`;
}
