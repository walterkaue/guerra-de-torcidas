// Léo, 37, "Outro time", mora em Campinas, 18+. Dobrável (Galaxy Z Fold) dobrado e aberto. Escolhe "Outro time", joga a
// 1ª partida, aceita o convite da cidade e escolhe Campinas, vê quantos torcedores faltam, passa pelas Cidades do
// Ranking, pelos Lances (abrindo na Seleção) e pela Galeria escolhendo uma torcida. No dobrado, desdobra no meio da partida.
import { jogarPartida, esperar, tocarSemCobertura } from './comum/jogar.mjs';

const BASE = 'homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&codigoFalso&galeriaFalsa=cheia&temporadaFalsa&cenario=lances';

export default {
  id: 'leo',
  ordem: 6,
  nome: 'Léo',
  descricao: '37 anos, "Outro time", mora em Campinas, 18+. Galaxy Z Fold dobrado e aberto; cidade, Lances na Seleção e Galeria.',
  time: 'Outro time',
  menor: false,
  toque: { erroPx: 5, demoraMs: 200 },
  gesto: { escalaForca: 1, duracaoMs: 260, tremorPx: 2 },
  aparelhos: ['fold-dobrado', 'fold-aberto'],
  async jornada(s, { aparelho }) {
    const p = s.page;
    // Aparelho novo, mas o aquecimento e os Termos já foram vistos (a jornada é sobre a cidade).
    await s.semear({ 'gdt:prefs': { aquecimento: { visto: true, aquecido: true }, termosVistos: '05/11/2026' } });
    const fichaDe = (id) => `[data-id="${id}"]`;
    const dobrado = aparelho === 'fold-dobrado';
    const [L0, A0] = dobrado ? [344, 882] : [884, 1104];
    const [L1, A1] = dobrado ? [884, 1104] : [344, 882];

    // ---- 1. Aparelho novo: escolhe "Outro time" ----
    await s.passo('primeira tela: escolha da torcida', async () => {
      await s.abrir(`/?${BASE}&cidadeFalsa=sem&cidadesFalsas=sem`, { esperarPor: '[data-id]', limiteMs: 20000, rotulo: 'primeira tela até a escolha do time' });
    }, { paginaInteira: true });
    await s.passo('escolhe "Outro time"', async () => {
      await tocarSemCobertura(s, p.locator(fichaDe('outro')), 'cartão Outro time', { semMudancaOk: true });
      await esperar(300);
      await s.tocar(p.locator('[data-acao="confirmar"]'));
    });
    await s.passo('Home de quem escolheu Outro time', async () => {
      await p.locator('[data-acao="jogar-agora"]').waitFor({ state: 'visible', timeout: 15000 });
    }, { paginaInteira: true });

    // ---- 2. 1ª partida ----
    await s.passo('Jogar agora (Outro time)', async () => {
      await tocarSemCobertura(s, p.locator('[data-acao="jogar-agora"]'), 'Jogar agora na Home');
      await p.getByRole('button', { name: '18 ou mais' }).waitFor({ state: 'visible', timeout: 15000 });
    }, { paginaInteira: true });
    await s.passo('triagem de idade antes da 1ª partida: 18 ou mais', async () => {
      await s.tocar(p.getByRole('button', { name: '18 ou mais' }));
      await p.locator('[data-ficha]').first().waitFor({ state: 'visible', timeout: 15000 });
    });
    await s.passo('abre a ficha e começa a partida', async () => {
      if (await p.locator('[data-tipo="penaltis"]').count()) await s.tocar(p.locator('[data-tipo="penaltis"]'), { semMudancaOk: true });
      await esperar(400);
      await s.tocar(p.locator('[data-ficha]').first());
      await esperar(500);
      await s.tocar(p.getByRole('button', { name: /^jogar/i }).first());
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
      await p.waitForFunction(() => window.__partida?.fase?.() === 'mirar', null, { timeout: 40000 });
    });
    let jogo = null;
    await s.passo(dobrado ? 'joga e desdobra o fold no meio da partida' : 'joga e dobra o fold no meio da partida', async () => {
      const partida = jogarPartida(s, { chute: (n) => ({ u: [0.5, -0.5, 0.2, -0.2, 0][n % 5], forca: 72 }), limiteMs: 170000, reacaoMs: 700 });
      await p.waitForFunction(() => (window.__partida?.cobrancas?.length ?? 0) >= 2, null, { timeout: 90000 }).catch(() => {});
      const antes = await p.evaluate(() => window.__partida?.cobrancas?.length ?? 0).catch(() => 0);
      await s.tamanho(L1, A1);
      await s.conferir(`${dobrado ? 'desdobrou' : 'dobrou'} no meio da partida (${L1}×${A1})`, { assentarMs: 900 });
      const c = await p.evaluate(() => {
        const e = document.querySelector('canvas.campo-jogo');
        const r = e?.getBoundingClientRect();
        return r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight, rolaLado: document.documentElement.scrollWidth > innerWidth + 1 } : null;
      }).catch(() => null);
      if (!c) s.achado({ regra: 'canvas-sumiu', gravidade: 'bloqueia', tipo: 'erro', oQue: `O canvas da partida sumiu ao ir para ${L1}×${A1}.`, talvezSimulador: true });
      else if (c.x < -1 || c.y < -1 || c.x + c.w > c.vw + 1 || c.y + c.h > c.vh + 1 || c.rolaLado)
        s.achado({ regra: 'canvas-fora-da-tela', gravidade: 'atrapalha', tipo: 'layout', oQue: `Depois de ${dobrado ? 'desdobrar' : 'dobrar'} no meio da partida, o campo ficou em x=${c.x} y=${c.y} ${c.w}×${c.h} numa tela de ${c.vw}×${c.vh}${c.rolaLado ? ' e a página rola para o lado' : ''}.`, sugestao: 'O canvas deve se ajustar ao novo tamanho da janela.' });
      jogo = await partida;
      const depois = jogo.cobrancas;
      if (depois <= antes && !jogo.terminou)
        s.achado({ regra: 'chute-parou-de-responder', gravidade: 'bloqueia', tipo: 'erro', oQue: `Depois de ${dobrado ? 'desdobrar' : 'dobrar'} no meio da partida o chute não respondeu mais (cobranças antes: ${antes}, depois: ${depois}).`, talvezSimulador: true });
      s.medir(`cobranças antes/depois de mudar o tamanho: ${antes}/${depois}`, depois - antes);
      await s.tamanho(L0, A0);
    }, { limiteMs: 175000 });
    if (jogo && !jogo.terminou) s.achado({ regra: 'partida-nao-terminou', gravidade: 'bloqueia', tipo: 'erro', oQue: `A partida não chegou ao resultado (${jogo.cobrancas} cobranças).`, talvezSimulador: true });
    await s.passo('resultado da 1ª partida', async () => {
      await p.locator('[data-acao="mais-uma"], [data-acao="card"]').first().waitFor({ state: 'visible', timeout: 30000 });
      await p.locator('[data-acao="cidade-sim"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    }, { paginaInteira: true });

    // ---- 3. Convite da cidade ----
    await s.passo('convite "Defende sua cidade também?"', async () => {
      const temConvite = await p.locator('[data-acao="cidade-sim"]').count();
      if (!temConvite) {
        s.achado({ regra: 'convite-cidade-ausente', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: 'No resultado da 1ª partida não apareceu o convite "Defende sua cidade também?".', sugestao: 'docs/jogo.md seção 3: o convite aparece uma vez por aparelho depois da 1ª partida.', talvezSimulador: true });
        await s.abrir(`/?${BASE}&cidadeFalsa=sem&cidadesFalsas=sem#cidade`, { esperarPor: 'input[type="search"]', limiteMs: 20000 });
        return;
      }
      await tocarSemCobertura(s, p.locator('[data-acao="cidade-sim"]'), 'Escolher a cidade (convite)');
      await p.locator('input[type="search"]').waitFor({ state: 'visible', timeout: 10000 });
    });
    await s.passo('procura Campinas', async () => {
      await p.locator('input[type="search"]:not([disabled])').waitFor({ state: 'visible', timeout: 10000 });
      await s.tocar(p.locator('input[type="search"]'), { semMudancaOk: true });
      await p.keyboard.type('Campinas', { delay: 120 });
      await p.locator('[data-codigo="3509502"]').waitFor({ state: 'visible', timeout: 8000 });
    });
    await s.passo('escolhe Campinas (SP)', async () => {
      await s.tocar(p.locator('[data-codigo="3509502"]'));
      await p.locator('[data-acao="jogar-agora"]').waitFor({ state: 'visible', timeout: 15000 });
    });

    // ---- 4. "Faltam N" ----
    await s.passo('Home: quantos faltam para a cidade valer', async () => {
      await s.abrir(`/?${BASE}&cidadeFalsa=com&cidadesFalsas=faltam`, { esperarPor: '[data-cidade]:not([hidden])', limiteMs: 20000, rotulo: 'Home até o bloco da cidade' });
      const t = (await p.locator('[data-cidade]').innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (!/falt/i.test(t)) s.achado({ regra: 'faltam-ausente', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: `A Home não mostrou o "Faltam N" da cidade (texto do bloco: "${t.slice(0, 120)}").`, talvezSimulador: true });
      else s.medir(`bloco da cidade: ${t.slice(0, 90)}`, 0);
    }, { paginaInteira: true });

    // ---- 5. Ranking > Cidades ----
    await s.passo('Ranking: aba Cidades', async () => {
      await s.tocar(p.locator('[data-aba="ranking"]'));
      await s.tocar(p.locator('[data-ranking="cidades"]'));
      await esperar(2200);
    }, { paginaInteira: true });
    for (const [sub, rotulo] of [['top', 'Top nacional'], ['estados', 'Estados'], ['estado', 'Seu estado'], ['campeas', 'Campeãs']]) {
      await s.passo(`Cidades: ${rotulo}`, async () => {
        await s.tocar(p.locator(`[data-cidsub="${sub}"]`), { semMudancaOk: true });
        await esperar(1500);
      }, { paginaInteira: true });
    }

    // ---- 6. Lances na Seleção ----
    await s.passo('Lances do Jogo', async () => {
      await s.abrir(`/?${BASE}&cidadeFalsa=com&cidadesFalsas=faltam`, { esperarPor: '[data-jogo="penaltis"]', limiteMs: 20000 });
      await tocarSemCobertura(s, p.locator('[data-jogo="penaltis"]'), 'card Lances do Jogo');
      await p.locator('[data-ficha]').first().waitFor({ state: 'visible', timeout: 15000 });
    }, { paginaInteira: true });
    await s.passo('abre os Lances na Seleção', async () => {
      const sel = p.locator('[data-filtro="clube"]');
      await sel.selectOption('selecao').catch(() => {
        s.achado({ regra: 'sem-selecao', gravidade: 'detalhe', tipo: 'erro', oQue: 'O filtro de clube dos Lances não tem a opção Seleção.', talvezSimulador: true });
      });
      await esperar(900);
      const n = await p.locator('[data-ficha]').count();
      s.medir(`lances da Seleção na lista: ${n}`, n);
      if (n) await s.tocar(p.locator('[data-ficha]').first());
      await esperar(600);
    }, { paginaInteira: true, fichaFactual: true });

    // ---- 7. Galeria escolhendo uma torcida ----
    await s.passo('Ranking > Conquistas > Galeria', async () => {
      await s.abrir(`/?${BASE}&cidadeFalsa=com&cidadesFalsas=faltam`, { esperarPor: '[data-aba="ranking"]', limiteMs: 20000 });
      await s.tocar(p.locator('[data-aba="ranking"]'));
      await s.tocar(p.locator('[data-ranking="conquistas"]'));
      await p.locator('[data-csub="galeria"]').waitFor({ state: 'visible', timeout: 10000 });
      await s.tocar(p.locator('[data-csub="galeria"]'));
      await p.locator('[data-gal-time]').waitFor({ state: 'visible', timeout: 10000 });
      await esperar(1200);
    }, { paginaInteira: true });
    await s.passo('escolhe uma torcida na Galeria', async () => {
      await s.tocar(p.locator('[data-gal-time]'));
      await p.locator('[data-gal-escolher]').first().waitFor({ state: 'visible', timeout: 8000 });
      await s.tocar(p.locator('[data-gal-escolher="palmeiras"]').first());
      await esperar(1500);
    }, { paginaInteira: true });
  },
};
