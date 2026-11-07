// Peças comuns das jornadas: chutar e defender no canvas dos Pênaltis, do jeito do jogo.
// Geometria copiada de src/telas/cena.ts (medir): gol de largura min(0,8·W, 440) e altura 0,4·largura, topo em
// max(0,17·H, 64), bola em (W/2, 0,82·H). Força = comprimento do arraste / distância até o meio do gol × 70.
// Este arquivo não tem export default, então o simulador não o carrega como persona.
// O estado da partida vem de window.__partida, que o jogo só expõe em modo development (o pacote do simulador é).

export const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Caixa do canvas e medidas da cena, em pixels da página. */
export async function geometria(s, seletor = 'canvas.campo-jogo') {
  return s.page.evaluate((sel) => {
    const c = document.querySelector(sel);
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const W = r.width;
    const H = r.height;
    const gw = Math.min(W * 0.8, 440);
    const gh = gw * 0.4;
    const gy = Math.max(H * 0.17, 64);
    return { x: r.x, y: r.y, W, H, gw, gh, gy, gx: (W - gw) / 2, gcx: W / 2, gcy: gy + gh / 2, bolaX: W / 2, bolaY: H * 0.82 };
  }, seletor);
}

/**
 * Chute de pênalti: `u` é o canto (-1 esquerda, 0 meio, 1 direita) e `forca` a força pretendida (70 = bola no
 * meio do gol). O jeito da persona (escalaForca, duração, tremor) entra em s.arrastar.
 */
export async function chutar(s, { u = 0.6, forca = 70, curva = 0, duracaoMs, seletor = 'canvas.campo-jogo' } = {}) {
  const g = await geometria(s, seletor);
  if (!g) throw new Error('sem canvas para chutar');
  const k = forca / 70;
  const de = [g.bolaX / g.W, g.bolaY / g.H];
  const alvoX = g.gcx + u * (g.gw / 2) * 0.9;
  const para = [(g.bolaX + (alvoX - g.bolaX) * k) / g.W, (g.bolaY + (g.gcy - g.bolaY) * k) / g.H];
  return s.arrastar(seletor, de, para, { curva, duracaoMs });
}

/** Toque numa das 6 zonas do gol (coluna 0..2, linha 'alta' ou 'baixa'). */
export async function tocarZona(s, coluna, linha = 'baixa', seletor = 'canvas.campo-jogo') {
  const g = await geometria(s, seletor);
  if (!g) return;
  const x = g.x + g.gx + ((coluna * 2) / 3 + 1 / 3) * g.gw;
  const y = g.y + g.gy + (linha === 'alta' ? 0.28 : 0.75) * g.gh;
  await tocarPonto(s, x, y);
}

/** Toque (aparelho de toque) ou clique (mouse) num ponto da página. */
export async function tocarPonto(s, x, y) {
  if (s.aparelho.toque) await s.page.touchscreen.tap(x, y);
  else await s.page.mouse.click(x, y);
}

const fase = (s) => s.page.evaluate(() => window.__partida?.fase?.() ?? null).catch(() => null);
const naPartida = (s) => s.page.evaluate(() => !!document.querySelector('canvas.campo-jogo')).catch(() => false);

/**
 * Joga uma partida de pênaltis (5 cobranças e 5 defesas, mais morte súbita e par ou ímpar se empatar) com gestos
 * de verdade, até a tela de resultado. `chute(n)` devolve as opções de chutar() para a n-ésima cobrança.
 * Devolve { cobrancas, defesas, textos (as frases da faixa de instrução que apareceram), longas (tarefas longas
 * durante os arrastes), terminou }.
 */
export async function jogarPartida(s, { chute = () => ({}), limiteMs = 150000, reacaoMs = 500 } = {}) {
  const t0 = Date.now();
  const textos = new Set();
  const longas = [];
  let cobrancas = 0;
  let defesas = 0;
  let ultimoTexto = '';
  const lerTexto = async () => {
    const t = await s.page.evaluate(() => (document.querySelector('.instrucao')?.textContent ?? '').trim()).catch(() => '');
    if (t && t !== ultimoTexto) {
      ultimoTexto = t;
      textos.add(t);
    }
  };
  while (Date.now() - t0 < limiteMs) {
    if (!(await naPartida(s))) return { cobrancas, defesas, textos: [...textos], longas, terminou: true };
    await lerTexto();
    const f = await fase(s);
    if (f === 'mirar') {
      await esperar(s.persona.toque?.demoraMs ?? 100);
      const r = await chutar(s, chute(cobrancas));
      longas.push(...(r.longas ?? []));
      cobrancas++;
      await esperar(700);
      await lerTexto();
    } else if (f === 'corrida') {
      const zona = await s.page.evaluate(() => window.__partida?.estado?.()?.zona).catch(() => 0);
      if (zona === null) {
        await esperar(reacaoMs); // a dica (pé de apoio) aparece depois da metade da corrida
        const dica = await s.page.evaluate(() => window.__partida?.estado?.()?.dica ?? 1).catch(() => 1);
        await tocarZona(s, dica ?? 1, defesas % 2 ? 'alta' : 'baixa');
        defesas++;
        await esperar(700);
      }
    } else if (f === 'parOuImpar') {
      const painel = s.page.locator('.par-ou-impar');
      if (await painel.isVisible().catch(() => false)) {
        await s.tocar(painel.locator('[data-paridade="par"]'), { semMudancaOk: true });
        await s.tocar(painel.locator('[data-numero="3"]'), { semMudancaOk: true });
        await s.tocar(painel.locator('[data-acao="mostrar"]'), { semMudancaOk: true });
        await esperar(3000);
      }
    } else if (f === 'replay') {
      const g = await geometria(s); if (g) await tocarPonto(s, g.x + g.W / 2, g.y + g.H / 2).catch(() => {});
    }
    await esperar(150);
  }
  return { cobrancas, defesas, textos: [...textos], longas, terminou: false };
}

/**
 * Lances do Jogo (cena 3D de src/telas/cena3d.ts): a bola e o gol não ficam onde os pênaltis têm (a câmera muda por
 * lance e a posição não sai da página), então o arraste é uma estimativa: da bola (centro, perto de 78% da altura)
 * em direção ao gol (centro, perto de 32%). `u` desloca o alvo para os lados. Joga as 3 tentativas até o resultado.
 */
export async function jogarLance(s, { chute = () => ({}), limiteMs = 120000 } = {}) {
  const t0 = Date.now();
  let tentativas = 0;
  const textos = new Set();
  const longas = [];
  let ultimo = '';
  while (Date.now() - t0 < limiteMs) {
    const viva = await s.page.evaluate(() => !!document.querySelector('canvas.campo-jogo')).catch(() => false);
    if (!viva) return { tentativas, textos: [...textos], longas, terminou: true };
    const t = await s.page.evaluate(() => (document.querySelector('.instrucao')?.textContent ?? '').trim()).catch(() => '');
    if (t && t !== ultimo) { ultimo = t; textos.add(t); }
    const f = await s.page.evaluate(() => window.__lances?.fase?.() ?? null).catch(() => null);
    if (f === 'mirar') {
      await esperar(s.persona.toque?.demoraMs ?? 100);
      const o = chute(tentativas);
      const k = (o.forca ?? 70) / 70;
      const u = o.u ?? 0.2;
      const r = await s.arrastar('canvas.campo-jogo', [0.5, 0.78], [0.5 + u * 0.16 * k, 0.78 - 0.46 * k], { curva: o.curva ?? 0, duracaoMs: o.duracaoMs });
      longas.push(...(r.longas ?? []));
      tentativas++;
      await esperar(900);
    } else if (f === 'replay') {
      const g = await geometria(s);
      if (g) await tocarPonto(s, g.x + g.W / 2, g.y + g.H / 2).catch(() => {});
    }
    await esperar(200);
  }
  return { tentativas, textos: [...textos], longas, terminou: false };
}

/** Palavra do filtro (primeira de 6+ letras da lista da migração base) e nome famoso (da migração de apelidos famosos), lidos na hora. */
export async function palavrasDoFiltro(raiz) {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const base = readFileSync(join(raiz, 'supabase', 'migrations', '20261019000000_base.sql'), 'utf8');
  const bloco = base.slice(base.indexOf('insert into public.palavras_bloqueadas'));
  const lista = [...bloco.slice(0, bloco.indexOf(';')).matchAll(/'([a-z]+)'/g)].map((m) => m[1]).filter((w) => w.length >= 6);
  return { palavrao: lista[0] ?? null };
}

/**
 * Toque num botão que pode ficar sob a barra fixa de baixo: confere se o centro dele está livre na posição em que a
 * página o deixa ao rolar o mínimo (o que um dedo veria) e, se estiver coberto, anota o achado e rola até o meio
 * da tela para o toque seguir.
 */
export async function tocarSemCobertura(s, loc, rotulo, opcoes = {}) {
  await loc.waitFor({ state: 'visible', timeout: 15000 });
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const coberto = await loc
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !(e && (el === e || el.contains(e)));
    })
    .catch(() => false);
  if (coberto)
    s.achado({
      regra: 'alvo-coberto-ao-tocar',
      gravidade: 'atrapalha',
      tipo: 'layout',
      oQue: `${rotulo}: com a rolagem mínima, o centro do botão fica sob a barra fixa de baixo e o toque cairia nela.`,
      sugestao: 'Dar respiro no fim da página ou rolar até o botão aparecer inteiro.',
    });
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {});
  return s.tocar(loc, opcoes);
}

/**
 * Da Home à tela inicial da Prova. Se o toque (com o erro de mira da persona) abrir outra coisa, anota o achado
 * e repete com mira exata, para a jornada seguir.
 */
export async function entrarNaProva(s, home) {
  await home();
  const abriu = async () => s.page.locator('[data-comecar]').isVisible({ timeout: 6000 }).catch(() => false);
  await tocarSemCobertura(s, s.page.locator('[data-jogo="prova"]'), 'card Prova de Boleiro');
  if (await abriu()) return;
  const onde = await s.page.evaluate(() => location.hash || document.querySelector('h1')?.textContent || '?').catch(() => '?');
  s.achado({
    regra: 'toque-abriu-outra-tela',
    gravidade: 'atrapalha',
    tipo: 'layout',
    oQue: `Tocar no card da Prova (com o erro de mira da persona) não abriu a Prova: caiu em "${String(onde).trim().slice(0, 40)}".`,
    sugestao: 'Conferir o espaço entre os cards da Home e o alvo de toque do card da Prova.',
    talvezSimulador: true,
  });
  await home();
  await tocarSemCobertura(s, s.page.locator('[data-jogo="prova"]'), 'card Prova de Boleiro (mira exata)', { precisao: 0 });
}

/**
 * O canvas do jogo cabe na tela agora? (depois de girar ou dobrar o aparelho no meio da partida). Anota o achado se o
 * campo saiu da tela, se a página rola para o lado ou se o canvas sumiu. Devolve as medidas (ou null).
 */
export async function conferirCampo(s, onde, seletor = 'canvas.campo-jogo') {
  const c = await s.page
    .evaluate((sel) => {
      const e = document.querySelector(sel);
      const r = e?.getBoundingClientRect();
      return r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight, rolaLado: document.documentElement.scrollWidth > innerWidth + 1 } : null;
    }, seletor)
    .catch(() => null);
  if (!c) {
    s.achado({ regra: 'canvas-sumiu', gravidade: 'bloqueia', tipo: 'erro', oQue: `O canvas da partida sumiu (${onde}).`, talvezSimulador: true });
    return null;
  }
  if (c.x < -1 || c.y < -1 || c.x + c.w > c.vw + 1 || c.y + c.h > c.vh + 1 || c.rolaLado)
    s.achado({
      regra: 'canvas-fora-da-tela',
      gravidade: 'atrapalha',
      tipo: 'layout',
      oQue: `${onde}: o campo ficou em x=${c.x} y=${c.y} com ${c.w}×${c.h} numa tela de ${c.vw}×${c.vh}${c.rolaLado ? ' e a página rola para o lado' : ''}.`,
      sugestao: 'O canvas deve se ajustar ao novo tamanho da janela.',
    });
  return c;
}
