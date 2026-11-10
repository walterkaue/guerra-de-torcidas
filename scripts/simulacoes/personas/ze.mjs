// Zé, 41, motoboy, Flamengo, 18+. Abre o link do X1 de pênaltis que caiu no grupo do WhatsApp, num Android de
// entrada com 4G ruim. Chuta forte demais (a dica "Forte demais vai por cima" tem de aparecer).
import { semearAvisos, medirFolha, versaoDosTermos } from './comum/central.mjs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { chutar, jogarPartida, esperar, tocarSemCobertura } from './comum/jogar.mjs';
import { conferirDobraDaHome } from './comum/home.mjs';
import { conferirFaixasComTelao } from './comum/golsDoConvite.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const LINK_X1 = '/?homeFalsa&penaltiFalso&d=abcdefgh&chamouTime=flamengo';
const DICA_FORTE = /forte demais/i;

export default {
  id: 'ze',
  ordem: 1,
  nome: 'Zé',
  descricao: '41 anos, motoboy, Flamengo, 18+. Abre o link do X1 que caiu no grupo do WhatsApp.',
  time: 'Flamengo',
  menor: false,
  toque: { erroPx: 4, demoraMs: 80 },
  gesto: { escalaForca: 1.6, duracaoMs: 150, tremorPx: 1 },
  aparelhos: ['android-entrada'],
  async jornada(s) {
    const p = s.page;

    // 1. O link do grupo: a tela do convite, com as faixas do time de quem chamou e do rival.
    await s.passo('abre o link do X1 (convite)', async () => {
      const ms = await s.abrir(LINK_X1, { esperarPor: '[data-faixa-time]', limiteMs: 20000, rotulo: 'link do X1 até as faixas do convite' });
      s.medir('tempo até as faixas do convite', ms, 4000);
    });

    // 2. Um toque na faixa do time (o falso chama pelo Flamengo): vai para a triagem de idade.
    await s.passo('toca na faixa do Flamengo', async () => {
      await s.tocar(p.locator('button[data-faixa-time="flamengo"]'));
      await p.getByRole('button', { name: '18 ou mais' }).waitFor({ state: 'visible', timeout: 15000 });
    });

    // 3. Triagem de idade (com a placa do desafio).
    await s.passo('triagem: 18 ou mais (placa do desafio)', async () => {
      if (!(await p.locator('[data-placa-triagem]').isVisible().catch(() => false)))
        s.achado({ regra: 'sem-placa-na-triagem', gravidade: 'detalhe', tipo: 'regra do jogo.md', oQue: 'A triagem do convite não mostrou a placa [data-placa-triagem].', talvezSimulador: true });
      await s.tocar(p.getByRole('button', { name: '18 ou mais' }));
    });

    // 4. O X1: 5 cobranças e 5 defesas, chutando forte demais.
    await s.passo('começa o X1 (mira)', async () => {
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
      await p.waitForFunction(() => window.__partida?.fase?.() === 'mirar', null, { timeout: 40000 });
      s.medir('toques até o 1º chute (faixa + triagem)', 2, 2);
    });
    let jogo = null;
    await s.passo('joga o X1 inteiro', async () => {
      jogo = await jogarPartida(s, { chute: (n) => ({ u: [0.6, -0.6, 0.3, -0.3, 0][n % 5], forca: 70 }), limiteMs: 170000 });
    }, { limiteMs: 175000 });
    if (jogo) {
      const maior = Math.max(0, ...jogo.longas.map((l) => l.dur));
      s.medir(`tarefas longas nos ${jogo.cobrancas} arrastes do X1 (${jogo.longas.length}, maior ${Math.round(maior)} ms)`, Math.round(maior), 200);
      if (!jogo.textos.some((t) => DICA_FORTE.test(t)))
        s.achado({
          regra: 'dica-nao-apareceu',
          gravidade: 'atrapalha',
          tipo: 'regra do jogo.md',
          oQue: `Chutando com força ~112 (por cima) em ${jogo.cobrancas} cobranças, a dica "Forte demais vai por cima. Arraste mais curto." não apareceu na faixa. Frases vistas: ${jogo.textos.slice(0, 8).join(' | ')}`,
          sugestao: 'Conferir se o chute saiu por cima (y > 1) ou se o simulador errou o arraste.',
          talvezSimulador: true,
        });
      if (!jogo.terminou) s.achado({ regra: 'partida-nao-terminou', gravidade: 'bloqueia', tipo: 'erro', oQue: `A partida não chegou ao resultado (${jogo.cobrancas} cobranças, ${jogo.defesas} defesas).`, talvezSimulador: true });
    }

    // 5. Resultado, Card, Compartilhar no WhatsApp.
    await s.passo('resultado do X1', async () => {
      await p.locator('[data-acao="mais-uma"], [data-acao="card"]').first().waitFor({ state: 'visible', timeout: 30000 });
    }, { paginaInteira: true });
    await s.passo('abre o Card', async () => {
      await s.tocar(p.locator('[data-acao="card"]'));
      await esperar(1500);
    });
    await s.passo('fecha o Card', async () => {
      await p.keyboard.press('Escape');
      await esperar(500);
      if (await p.locator('dialog[open]').count()) await s.tocar(p.getByRole('button', { name: /fechar/i }).first(), { semMudancaOk: true });
    });
    await s.passo('mandar no grupo (WhatsApp)', async () => {
      const zap = p.locator('a.botao-desafiar:visible, a.botao-zap:visible').first();
      await zap.scrollIntoViewIfNeeded();
      const href = await zap.getAttribute('href');
      s.medir(`endereço que o WhatsApp abriria: ${href}`, 0);
      await s.tocar(zap, { semMudancaOk: true });
      await esperar(1200);
    });

    // 6. "Jogar agora" na Home (cenário em que o próximo jogo são os Lances), com a rede caindo no meio da partida.
    await s.passo('volta à Home', async () => {
      await s.abrir('/?homeFalsa&penaltiFalso&lancesFalsos&cenario=lances', { esperarPor: '[data-acao="jogar-agora"]', limiteMs: 20000, rotulo: 'Home até o Jogar agora' });
    });
    // Rota B (HOME2): em 360×740 com fonte a 130%, o "Jogar agora" e o topo do 1º card ficam acima da barra de navegação.
    await s.passo('Home: Jogar agora e 1º card à vista sem rolar (360×740, fonte 130%)', async () => {
      await esperar(1500);
      await conferirDobraDaHome(s, 'Home do Zé');
      await s.conferirCabeNaTela('[data-acao="jogar-agora"]', 'o botão Jogar agora');
    }, { principalNaDobra: true, paginaInteira: true });
    await s.passo('toca em Jogar agora', async () => {
      const t0 = Date.now();
      await tocarSemCobertura(s, p.locator('[data-acao="jogar-agora"]'), 'Jogar agora na Home');
      await p.locator('[data-ficha]').first().waitFor({ state: 'visible', timeout: 15000 });
      s.medir('Jogar agora responde (lista dos lances aparece)', Date.now() - t0, 1500);
    });
    await s.passo('abre a ficha de uma disputa', async () => {
      await s.tocar(p.locator('[data-ficha]').first());
      await esperar(600);
    });
    await s.passo('toca em Jogar na ficha', async () => {
      await s.tocar(p.getByRole('button', { name: /^jogar/i }).first());
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
    });
    let jogo2 = null;
    await s.passo('joga com a rede caindo no meio', async () => {
      await p.waitForFunction(() => window.__partida?.fase?.() === 'mirar', null, { timeout: 40000 });
      const partida = jogarPartida(s, { chute: (n) => ({ u: [0.5, -0.5, 0.2, -0.2, 0][n % 5], forca: 70 }), limiteMs: 170000 });
      await p.waitForFunction(() => (window.__partida?.cobrancas?.length ?? 0) >= 2, null, { timeout: 90000 }).catch(() => {});
      await s.offline(true);
      await s.conferir('rede caiu no meio da partida', { assentarMs: 1500 });
      await esperar(4000);
      await s.offline(false);
      jogo2 = await partida;
    }, { limiteMs: 175000 });
    if (jogo2 && !jogo2.terminou) s.achado({ regra: 'partida-nao-terminou', gravidade: 'bloqueia', tipo: 'erro', oQue: 'Com a rede caindo no meio, a partida não chegou ao resultado.', talvezSimulador: true });
    await s.passo('resultado depois da queda de rede', async () => {
      await p.locator('[data-acao="card"]').waitFor({ state: 'visible', timeout: 30000 });
    }, { paginaInteira: true });

    // 7. O card sem rede: tem de abrir em até ~4 s.
    await s.passo('abre o Card sem rede', async () => {
      await s.offline(true);
      const t0 = Date.now();
      await s.tocar(p.locator('[data-acao="card"]'), { semMudancaOk: true });
      let abriu = true;
      await p.locator('dialog[open] .cc-slide img[src]').first().waitFor({ state: 'visible', timeout: 12000 }).catch(() => (abriu = false));
      const ms = Date.now() - t0;
      s.medir('card abre sem rede' + (abriu ? '' : ' (não abriu em 12 s)'), ms, 4000, !abriu);
      await s.offline(false);
    });

    // 8. O link de Lances com os gols de quem chamou: as faixas e o "Outro time" continuam na tela (360×740, 130%).
    await s.passo('link de Lances com o telão dos gols (faixas na tela)', () => conferirFaixasComTelao(s));
    // ---- Central de avisos (B01) em 360×740: 7 avisos, a lista rola por dentro, o Fechar fica à vista ----
    const FLAGS_CENTRAL = 'homeFalsa&temporadaFalsa&galeriaFalsa=cheia&lancesFalsos&penaltiFalso';
    await s.passo('Home com 7 avisos (sininho)', async () => {
      const termos = await versaoDosTermos(RAIZ);
      await s.abrir(`/?${FLAGS_CENTRAL}`, { esperarPor: '[data-acao="sininho"]', limiteMs: 60000, rotulo: 'Home (4G ruim) até o sininho' });
      await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('gdt:prefs') || '{}'); x.time = x.time || 'flamengo'; x.faixa = '18_mais'; localStorage.setItem('gdt:prefs', JSON.stringify(x)); });
      await semearAvisos(s, {
        ids: ['desafio:lances:abc12345', 'desafio:penaltis:def67890', 'mes:2026-10', 'trofeu:campeao_semana|2026-W45||flamengo', 'peca:apito', ...(termos ? [`termos:${termos}`] : [])],
        aquecimento: true,
        termosAntigos: true,
      });
      await s.abrir(`/?${FLAGS_CENTRAL}`, { esperarPor: '[data-acao="sininho"]', limiteMs: 60000, rotulo: 'Home até o sininho' });
      await esperar(1200);
      const num = (await p.locator('[data-sininho-num]').innerText().catch(() => '')).trim();
      if (!/^[1-9]/.test(num)) s.achado({ regra: 'sininho-sem-numero', gravidade: 'atrapalha', tipo: 'erro', oQue: `Com avisos semeados o sininho mostra "${num}".`, talvezSimulador: true });
      else s.medir('avisos novos no sininho (Zé)', Number.parseInt(num, 10) || 9);
    });
    await s.passo('folha com todos os avisos (360x740)', async () => {
      await s.tocar(p.locator('button[data-acao="sininho"]'));
      await p.locator('[data-central-avisos]').waitFor({ state: 'visible', timeout: 10000 });
      await esperar(900);
      const m = await medirFolha(p);
      if (!m) return s.achado({ regra: 'folha-ausente', gravidade: 'bloqueia', tipo: 'erro', oQue: 'A folha de avisos não abriu.' });
      s.medir(`avisos na folha: ${m.avisos}; rolagem por dentro: ${JSON.stringify(m.rolagem)}`, m.avisos);
      if (m.avisos < 6) s.achado({ regra: 'avisos-faltando', gravidade: 'atrapalha', tipo: 'erro', oQue: `A folha mostrou ${m.avisos} avisos (semeei 7).`, talvezSimulador: true });
      if (m.paginaRolaLado || m.folhaRolaLado) s.achado({ regra: 'folha-rola-pro-lado', gravidade: 'atrapalha', tipo: 'layout', oQue: 'A folha de avisos rola para o lado.' });
      if (m.rolagem && m.rolagem.conteudo <= m.rolagem.alt + 1) s.achado({ regra: 'folha-nao-rola', gravidade: 'detalhe', tipo: 'layout', oQue: `Com ${m.avisos} avisos a lista cabe sem rolar (${m.rolagem.conteudo} px em ${m.rolagem.alt} px); a conferência da rolagem por dentro não se aplica.`, talvezSimulador: true });
      for (const b of m.botoes) if (b.alt < 44) s.achado({ regra: 'alvo-da-folha-menor-que-44', gravidade: 'atrapalha', tipo: 'layout', oQue: `Na folha de avisos o botão "${b.nome}" mede ${b.larg}x${b.alt} px.`, chave: 'alvo:' + b.nome });
    }, { tela: 'folha com 7 avisos' });
    await s.passo('rola a lista até o fim: Fechar à vista', async () => {
      const antes = await p.evaluate(() => window.scrollY);
      await p.locator('[data-central-avisos] .avisos-rolagem').evaluate((el) => (el.scrollTop = el.scrollHeight));
      await esperar(600);
      const m = await medirFolha(p);
      const depois = await p.evaluate(() => window.scrollY);
      if (depois !== antes) s.achado({ regra: 'pagina-rolou-atras-da-folha', gravidade: 'detalhe', tipo: 'layout', oQue: 'Rolar a lista da folha rolou também a página de trás.' });
      if (m?.rolagem && m.rolagem.topo <= 0) s.achado({ regra: 'lista-nao-rolou', gravidade: 'detalhe', tipo: 'layout', oQue: `A lista da folha não rolou (scrollTop ${m.rolagem.topo}).`, talvezSimulador: true });
      const fechar = m?.botoes.find((b) => b.nome === 'Fechar');
      if (!fechar || fechar.topo < 0 || fechar.base > m.janela.a)
        s.achado({ regra: 'fechar-fora-da-tela', gravidade: 'bloqueia', tipo: 'layout', oQue: `Depois de rolar até o fim, o Fechar não está à vista (${fechar ? `y=${fechar.topo}..${fechar.base} em ${m.janela.a} px` : 'não achei'}).` });
      await s.conferirCabeNaTela('[data-central-avisos] [data-fechar]', 'o botão Fechar da folha');
    }, { tela: 'folha rolada até o fim' });
    await s.passo('toca em Ver (o mês) e a tela muda', async () => {
      const ver = p.locator('[data-central-avisos] .aviso', { hasText: 'O mês fechou' }).locator('[data-agir]');
      await ver.scrollIntoViewIfNeeded();
      await s.tocar(ver);
      await p.locator('[data-central-avisos]').waitFor({ state: 'detached', timeout: 8000 }).catch(() => s.achado({ regra: 'acao-nao-fechou-a-folha', gravidade: 'atrapalha', tipo: 'erro', oQue: 'Tocar em "Ver" não fechou a folha.' }));
      await esperar(900);
      if (await p.locator('[data-acao="jogar-agora"]').isVisible().catch(() => false)) s.achado({ regra: 'acao-nao-navegou', gravidade: 'atrapalha', tipo: 'erro', oQue: 'Tocar em "Ver" (O mês fechou) deixou a pessoa na Home; devia abrir a Tabela (temporada).', talvezSimulador: true });
    }, { tela: 'depois do Ver' });
    await s.passo('volta à Home: o aviso resolvido saiu da caixa', async () => {
      await s.abrir(`/?${FLAGS_CENTRAL}`, { esperarPor: '[data-acao="sininho"]', limiteMs: 60000 });
      await s.tocar(p.locator('button[data-acao="sininho"]'));
      await p.locator('[data-central-avisos]').waitFor({ state: 'visible', timeout: 10000 });
      if (await p.locator('[data-central-avisos] .aviso', { hasText: 'O mês fechou' }).count()) s.achado({ regra: 'aviso-resolvido-voltou', gravidade: 'atrapalha', tipo: 'erro', oQue: 'Depois de tocar em "Ver", o aviso "O mês fechou" continua na caixa.' });
      await p.keyboard.press('Escape');
    });
  },
};
