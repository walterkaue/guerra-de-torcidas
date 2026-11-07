// Rafa, 23, gamer, Grêmio, 18+. Só mouse e teclado (Tab, Enter, Esc, setas), nunca toque. Joga os pênaltis arrastando
// o mouse, passa pelos Lances e pelas abas do Ranking, troca o estilo do card com as setas, confere o sininho (no
// notebook com Opera GX) e abre o jogo em duas abas ao mesmo tempo.
import { jogarPartida, jogarLance, esperar, tocarSemCobertura } from './comum/jogar.mjs';

const FLAGS = 'homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&codigoFalso&galeriaFalsa=cheia&temporadaFalsa&cidadesFalsas=com&cenario=lances';

export default {
  id: 'rafa',
  ordem: 5,
  nome: 'Rafa',
  descricao: '23 anos, gamer, Grêmio, 18+. Só mouse e teclado (Tab, Enter, Esc, setas). PC com Firefox e notebook com Opera GX.',
  time: 'Grêmio',
  menor: false,
  toque: { erroPx: 1, demoraMs: 40 },
  gesto: { escalaForca: 1, duracaoMs: 180, tremorPx: 0 },
  aparelhos: ['pc-firefox', 'notebook-opera'],
  cortes: ['depois'],
  async jornada(s, { aparelho }) {
    let p = s.page;
    const prefsDoAparelho = { time: 'gremio', apelido: 'Rafa_FPS', faixa: '18_mais', termosVistos: '05/11/2026', aquecimento: { visto: true, aquecido: true } };
    await s.semear({ 'gdt:prefs': prefsDoAparelho });
    const home = (extra = '') => s.abrir(`/?${FLAGS}${extra}`, { esperarPor: '[data-acao="jogar-agora"]', limiteMs: 20000, rotulo: 'Home até o Jogar agora' });
    /** Do card dos Lances na Home até a lista. A Home ainda se mexe quando acaba de abrir (placa do troféu chega tarde), então espera e repete uma vez. */
    const irAosLances = async (pg = p) => {
      await pg.locator('[data-jogo="penaltis"]').waitFor({ state: 'visible', timeout: 20000 });
      await esperar(1800);
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        await tocarSemCobertura(s, pg.locator('[data-jogo="penaltis"]'), 'card Lances do Jogo');
        if (await pg.locator('[data-ficha]').first().isVisible({ timeout: 6000 }).catch(() => false)) return;
        if (tentativa === 0)
          s.achado({ regra: 'toque-nao-abriu-lances', gravidade: 'atrapalha', tipo: 'layout', oQue: 'O clique do mouse no card dos Lances não abriu a lista (a Home mudou de lugar logo depois de abrir?).', sugestao: 'Conferir se a placa do troféu e o bloco da cidade empurram os cards depois de a Home abrir.', talvezSimulador: true });
      }
      await pg.locator('[data-ficha]').first().waitFor({ state: 'visible', timeout: 8000 });
    };
    const paginaViva = () => p.evaluate(() => true).catch(() => false);
    const estiloDoCard = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('gdt:prefs') ?? '{}').card?.estilo ?? null; } catch { return null; } }).catch(() => null);

    // ---- Home, só com o teclado ----
    await s.passo('Home no PC', async () => {
      await home();
    }, { paginaInteira: true });
    await s.passo('percorre a Home com o Tab', async () => {
      const ordem = await s.percorrerComTab(30);
      s.medir(`paradas do Tab na Home: ${ordem.length}`, ordem.length);
      if (ordem.length < 5) s.achado({ regra: 'tab-poucas-paradas', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: `Só ${ordem.length} paradas do Tab na Home: ${ordem.map((f) => f.desc).join(' | ')}`, sugestao: 'Conferir se os cards e a barra de baixo recebem foco.' });
    });

    // ---- Pênaltis com o mouse ----
    await s.passo('Enter em Jogar agora (teclado)', async () => {
      await p.locator('[data-acao="jogar-agora"]').focus();
      await p.keyboard.press('Enter');
      await p.locator('[data-ficha]').first().waitFor({ state: 'visible', timeout: 15000 });
    });
    await s.passo('filtra os Pênaltis e abre a ficha', async () => {
      const tipo = p.locator('[data-tipo="penaltis"]');
      if (await tipo.count()) await s.tocar(tipo, { semMudancaOk: true });
      await esperar(400);
      await s.tocar(p.locator('[data-ficha]').first());
      await p.locator('dialog[open] [data-jogar]').waitFor({ state: 'visible', timeout: 10000 });
    }, { fichaFactual: true });
    await s.passo('Esc fecha a ficha', async () => {
      await p.keyboard.press('Escape');
      await esperar(500);
      if (await p.locator('dialog[open]').count())
        s.achado({ regra: 'esc-nao-fecha', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: 'Esc não fechou a ficha do lance.', sugestao: 'A ficha é um dialog; Esc deveria fechar.' });
      else await s.tocar(p.locator('[data-ficha]').first());
      await p.locator('dialog[open] [data-jogar]').waitFor({ state: 'visible', timeout: 10000 });
    }, { fichaFactual: true });
    await s.passo('começa a partida (Jogar na ficha)', async () => {
      await s.tocar(p.locator('dialog[open] [data-jogar]'));
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
      await p.waitForFunction(() => window.__partida?.fase?.() === 'mirar', null, { timeout: 40000 });
    });
    let jogo = null;
    await s.passo('joga a partida arrastando o mouse', async () => {
      jogo = await jogarPartida(s, { chute: (n) => ({ u: [0.7, -0.7, 0.4, -0.4, 0.1][n % 5], forca: 72 + (n % 3) * 4, duracaoMs: 170 }), limiteMs: 170000 });
    }, { limiteMs: 175000 });
    if (jogo) {
      const maior = Math.max(0, ...jogo.longas.map((l) => l.dur));
      s.medir(`tarefas longas nos ${jogo.cobrancas} arrastes do mouse (${jogo.longas.length}, maior ${Math.round(maior)} ms)`, Math.round(maior), 200);
      if (!jogo.terminou) s.achado({ regra: 'partida-nao-terminou', gravidade: 'bloqueia', tipo: 'erro', oQue: `A partida não chegou ao resultado (${jogo.cobrancas} cobranças, ${jogo.defesas} defesas) com o mouse.`, talvezSimulador: true });
    }
    await s.passo('resultado da partida', async () => {
      await p.locator('[data-acao="mais-uma"], [data-acao="card"], [data-acao="inicio"]').first().waitFor({ state: 'visible', timeout: 30000 });
    }, { paginaInteira: true });

    // ---- Lances (faltas) ----
    await s.passo('abre a lista dos Lances', async () => {
      await s.abrir(`/?${FLAGS}`, { esperarPor: '[data-jogo="penaltis"]', limiteMs: 20000 });
      await irAosLances();
    });
    await s.passo('Tab na lista dos Lances', async () => {
      await s.percorrerComTab(20);
    });
    let lanceCaiu = false;
    await s.passo('filtra Faltas e abre a ficha', async () => {
      await s.tocar(p.locator('[data-tipo="falta"]'), { semMudancaOk: true });
      await esperar(500);
      await s.tocar(p.locator('[data-ficha]').first());
      await p.locator('dialog[open] [data-jogar]').waitFor({ state: 'visible', timeout: 10000 });
    }, { fichaFactual: true });
    await s.passo('Esc fecha a ficha da falta', async () => {
      await p.keyboard.press('Escape');
      await esperar(500);
      if (await p.locator('dialog[open]').count())
        s.achado({ regra: 'esc-nao-fecha', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: 'Esc não fechou a ficha da falta.', sugestao: 'A ficha é um dialog; Esc deveria fechar.' });
      await s.tocar(p.locator('[data-ficha]').first());
      await p.locator('dialog[open] [data-jogar]').waitFor({ state: 'visible', timeout: 10000 });
    }, { fichaFactual: true });
    await s.passo('joga a falta (cena 3D) com o mouse', async () => {
      await s.tocar(p.locator('dialog[open] [data-jogar]'));
      await esperar(2500);
      if (!(await paginaViva())) {
        lanceCaiu = true;
        s.achado({ regra: 'pagina-caiu', gravidade: 'atrapalha', tipo: 'erro', oQue: 'A página travou ao abrir a falta (cena 3D).', talvezSimulador: true });
        s.naoSimulavel('Lances: falta em 3D', 'a página caiu ao abrir a cena 3D');
        return;
      }
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
      await p.waitForFunction(() => window.__lances?.fase?.() === 'mirar', null, { timeout: 40000 }).catch(() => {});
      const r = await jogarLance(s, { chute: (n) => ({ u: [0.3, -0.3, 0.1][n % 3], forca: 74 }), limiteMs: 90000 });
      if (!r.terminou) s.achado({ regra: 'partida-nao-terminou', gravidade: 'atrapalha', tipo: 'erro', oQue: `A falta não chegou ao resultado (${r.tentativas} tentativas).`, talvezSimulador: true });
    }, { limiteMs: 130000 });
    if (lanceCaiu) {
      p = await s.novaAba();
      s.usarAba(p);
    }

    // ---- Ranking, aba por aba, com o mouse ----
    await s.passo('Ranking: Semana', async () => {
      await s.abrir(`/?${FLAGS}`, { esperarPor: '[data-aba="ranking"]', limiteMs: 20000 });
      await s.tocar(p.locator('[data-aba="ranking"]'));
      await p.locator('[data-tabela-semana] .mini-linha').first().waitFor({ state: 'visible', timeout: 15000 });
    }, { paginaInteira: true });
    await s.passo('Ranking: Tab nas abas', async () => {
      await s.percorrerComTab(25);
    });
    for (const [aba, rotulo] of [['temporada', 'Temporada'], ['conquistas', 'Conquistas'], ['cidades', 'Cidades']]) {
      await s.passo(`Ranking: ${rotulo}`, async () => {
        await s.tocar(p.locator(`[data-ranking="${aba}"]`));
        await esperar(2200);
      }, { paginaInteira: true });
    }

    // ---- SEU CARD: estilos com as setas ----
    const salvouCaiu = lanceCaiu;
    await s.passo('abre o Seu card', async () => {
      await s.abrir(`/?${FLAGS}&cardFalso&estilo=telao&formato=stories`, { esperarPor: 'dialog[open] [data-compartilhar]', limiteMs: 20000, rotulo: 'card até abrir' });
      await p.locator('dialog[open] [data-palco][aria-busy="true"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    });
    await s.passo('Tab dentro do card', async () => {
      const ordem = await s.percorrerComTab(14);
      const fugiu = await p.evaluate(() => !document.activeElement?.closest('dialog[open]')).catch(() => false);
      if (fugiu) s.achado({ regra: 'foco-fugiu-do-dialog', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: 'Com o card aberto, o Tab levou o foco para fora dele.', sugestao: 'O card é modal: o foco deve ficar preso nele.' });
      s.medir(`paradas do Tab no card: ${ordem.length}`, ordem.length);
    });
    const vistos = [];
    await s.passo('setas trocam o estilo do card', async () => {
      await p.locator('[data-palco]').focus();
      vistos.push(await estiloDoCard());
      for (const tecla of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft']) {
        await p.keyboard.press(tecla);
        await esperar(700);
        vistos.push(await estiloDoCard());
      }
      const distintos = new Set(vistos.filter(Boolean));
      if (distintos.size < 2)
        s.achado({ regra: 'seta-nao-troca-estilo', gravidade: 'atrapalha', tipo: 'erro', oQue: `As setas do teclado não trocaram o estilo do card (vistos: ${vistos.join(', ')}).`, sugestao: 'Conferir o foco no carrossel e o ouvinte de teclado.', talvezSimulador: true });
      else s.medir(`estilos vistos com as setas: ${[...distintos].join(', ')}`, distintos.size);
    });
    await s.passo('Esc fecha o card', async () => {
      await p.keyboard.press('Escape');
      await esperar(600);
      if (await p.locator('dialog[open].cc').count())
        s.achado({ regra: 'esc-nao-fecha', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: 'Esc não fechou o Seu card.', sugestao: 'O card é um dialog; Esc deveria fechar.' });
    });

    // ---- Sininho (notebook com Opera GX) ----
    if (aparelho === 'notebook-opera') {
      await s.passo('sininho na Home (Opera GX)', async () => {
        await home();
        await p.locator('[data-acao="sininho"]').focus();
        await p.keyboard.press('Enter');
        await esperar(1200);
      });
      await s.passo('Esc no painel do sininho', async () => {
        const abriu = await p.locator('.convite-push').count();
        const texto = abriu ? (await p.locator('.convite-push').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160) : '';
        if (!abriu) s.achado({ regra: 'sininho-sem-painel', gravidade: 'atrapalha', tipo: 'erro', oQue: 'Enter no sininho não abriu o painel do aviso.', talvezSimulador: true });
        else if (/Opera/.test(texto)) s.medir('painel do sininho avisa do Opera', 1);
        s.naoSimulavel('Sininho: ligar o aviso de domingo', 'precisa de Service Worker (bloqueado), permissão de notificação e o servidor de push');
        await p.keyboard.press('Escape');
        await esperar(500);
        if (abriu && (await p.locator('.convite-push').count()))
          s.achado({ regra: 'esc-nao-fecha', gravidade: 'detalhe', tipo: 'acessibilidade', oQue: `Esc não fecha o painel do sininho (texto: "${texto}").`, sugestao: 'Painel que abre por botão deve fechar com Esc.' });
      });
    }

    // ---- Voltar do navegador ----
    await s.passo('voltar do navegador depois de abrir uma ficha', async () => {
      await s.abrir(`/?${FLAGS}`, { esperarPor: '[data-jogo="penaltis"]', limiteMs: 20000 });
      await irAosLances();
      await s.tocar(p.locator('[data-ficha]').first());
      await p.locator('dialog[open]').waitFor({ state: 'visible', timeout: 10000 });
      const antes = p.url();
      await p.goBack({ timeout: 8000 }).catch(() => {});
      await esperar(1200);
      const fichaAberta = await p.locator('dialog[open]').count().catch(() => 0);
      const saiu = p.url() !== antes;
      if (fichaAberta && !saiu) s.achado({ regra: 'voltar-nao-fecha', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: 'O botão voltar do navegador não fechou a ficha do lance (e ficou na mesma página).', sugestao: 'Fichas e telas não empurram o histórico: voltar sai do jogo ou não faz nada.' });
      else if (saiu) s.achado({ regra: 'voltar-sai-do-jogo', gravidade: 'atrapalha', tipo: 'acessibilidade', oQue: `Com a ficha aberta, o voltar do navegador saiu da tela (de ${antes} para ${p.url()}) em vez de fechar a ficha.`, sugestao: 'Usar o histórico para as telas e folhas, como o vestiário já faz.' });
    }, { fichaFactual: true });

    // ---- O jogo aberto em duas abas ----
    await s.passo('abre a partida na 1ª aba', async () => {
      await s.abrir(`/?${FLAGS}`, { esperarPor: '[data-jogo="penaltis"]', limiteMs: 20000 });
      await irAosLances();
      const t = p.locator('[data-tipo="penaltis"]');
      if (await t.count()) await s.tocar(t, { semMudancaOk: true });
      await s.tocar(p.locator('[data-ficha]').first());
      await s.tocar(p.locator('dialog[open] [data-jogar]'));
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
      await p.waitForFunction(() => window.__partida?.fase?.() === 'mirar', null, { timeout: 40000 });
    });
    const aba1 = p;
    const aba2 = await s.novaAba();
    await s.passo('abre a partida também na 2ª aba', async () => {
      s.usarAba(aba2);
      p = aba2;
      await aba2.goto(s.endereco(`/?${FLAGS}`), { waitUntil: 'domcontentloaded' });
      await irAosLances(aba2);
      const t = aba2.locator('[data-tipo="penaltis"]');
      if (await t.count()) await s.tocar(t, { semMudancaOk: true });
      await s.tocar(aba2.locator('[data-ficha]').first());
      await s.tocar(aba2.locator('dialog[open] [data-jogar]'));
      await aba2.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
      await aba2.waitForFunction(() => window.__partida?.fase?.() === 'mirar', null, { timeout: 40000 });
    });
    await s.passo('chuta na 2ª aba', async () => {
      const r = await jogarPartida(s, { chute: () => ({ u: 0.5, forca: 72 }), limiteMs: 25000 });
      s.medir(`2ª aba: ${r.cobrancas} cobrança(s) em 25 s`, r.cobrancas);
    }, { limiteMs: 40000 });
    await s.passo('volta à 1ª aba e chuta', async () => {
      s.usarAba(aba1);
      p = aba1;
      await aba1.bringToFront().catch(() => {});
      const fase = await aba1.evaluate(() => window.__partida?.fase?.() ?? null).catch(() => null);
      const viva = await aba1.locator('canvas.campo-jogo').count().catch(() => 0);
      if (!viva) s.achado({ regra: 'aba-perdeu-a-partida', gravidade: 'atrapalha', tipo: 'erro', oQue: `A partida da 1ª aba saiu do canvas depois de abrir o jogo na 2ª (fase: ${fase}).`, talvezSimulador: true });
      const r = await jogarPartida(s, { chute: () => ({ u: -0.5, forca: 72 }), limiteMs: 25000 });
      s.medir(`1ª aba: ${r.cobrancas} cobrança(s) em 25 s (fase inicial: ${fase})`, r.cobrancas);
      const texto = (await aba1.locator('.instrucao, .aviso-partida').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);
      if (/outra|aba|j[aá] (est[aá]|tem)|conex/i.test(texto)) s.achado({ regra: 'duas-abas-aviso', gravidade: 'detalhe', tipo: 'regra do jogo.md', oQue: `Com duas abas jogando, a faixa disse: "${texto}"`, sugestao: 'Anotar como o jogo trata a mesma conta em duas abas.' });
    }, { limiteMs: 60000 });
    void salvouCaiu;
  },
};
