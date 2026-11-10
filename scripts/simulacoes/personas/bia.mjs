// Bia, 20, universitária, Bahia, 18+. Redmi no modo escuro e com economia de dados. Gira o celular no meio da partida
// de pênaltis, deixa a rede cair no 2º chute dos Lances, dá toque duplo nervoso em Jogar, Compartilhar e Salvar e sai
// do vestiário sem salvar.
import { SUPABASE_FALSO } from '../nucleo/servidor.mjs';
import { jogarPartida, jogarLance, esperar, tocarSemCobertura, conferirCampo } from './comum/jogar.mjs';
import { medidasDaHome } from './comum/home.mjs';

const BASE = 'homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&codigoFalso&galeriaFalsa=cheia&cenario=lances';

export default {
  id: 'bia',
  ordem: 7,
  nome: 'Bia',
  descricao: '20 anos, universitária, Bahia, 18+. Redmi em modo escuro e economia de dados; gira o celular, perde a rede, toca duas vezes.',
  time: 'Bahia',
  menor: false,
  toque: { erroPx: 6, demoraMs: 70 },
  gesto: { escalaForca: 1.1, duracaoMs: 140, tremorPx: 3 },
  aparelhos: ['redmi-escuro'],
  async jornada(s) {
    const p = s.page;
    await s.semear({ 'gdt:prefs': { time: 'bahia', apelido: 'Bia da UFBA', faixa: '18_mais', termosVistos: '05/11/2026', aquecimento: { visto: true, aquecido: true } } });
    // Conta as partidas e os lances que o jogo começa (toque duplo não pode começar duas).
    await s.contexto.addInitScript(() => {
      window.__contInicios = 0;
      for (const nome of ['__partida', '__lances']) {
        let guardado;
        Object.defineProperty(window, nome, {
          configurable: true,
          get: () => guardado,
          set: (v) => {
            guardado = v;
            window.__contInicios++;
          },
        });
      }
    });
    const inicios = () => p.evaluate(() => window.__contInicios ?? 0).catch(() => -1);
    const home = (extra = '') => s.abrir(`/?${BASE}${extra}`, { esperarPor: '[data-acao="jogar-agora"]', limiteMs: 20000, rotulo: 'Home até o Jogar agora' });

    /** Da lista dos Lances até a primeira ficha do tipo Pênaltis. */
    const abrirPenalti = async () => {
      const t = p.locator('[data-tipo="penaltis"]');
      if (await t.count()) await s.tocar(t, { semMudancaOk: true });
      await esperar(400);
      await s.tocar(p.locator('[data-ficha]').first());
      await p.locator('dialog[open] [data-jogar]').waitFor({ state: 'visible', timeout: 10000 });
    };
    const botaoJogarPenalti = () => p.locator('dialog[open] [data-jogar]');

    // ---- Home ----
    await s.passo('Home no Redmi (escuro, economia de dados)', async () => {
      await home();
    }, { paginaInteira: true });

    // ---- Home sem conexão com o placar: a barra avisa, sem toque, e o Jogar agora não anda ----
    await s.passo('Home sem conexão com o placar (barra avisa e o Jogar agora fica parado)', async () => {
      // ?rankingErro faz o placar falhar 120 ms depois de abrir; mede o botão antes e depois do aviso.
      await s.abrir(`/?${BASE}&rankingErro`, { esperarPor: '[data-acao="jogar-agora"]', limiteMs: 15000, rotulo: 'Home sem rede até o Jogar agora' });
      const antes = await medidasDaHome(p);
      await p.locator('[data-barra] .barra-time').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      await p.waitForFunction(() => /sem conex/i.test(document.querySelector('[data-barra]')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
      await esperar(1200);
      const depois = await medidasDaHome(p);
      const aviso = 'Sem conexão com o placar agora. Dá pra jogar mesmo assim.';
      const texto = depois.textoDaBarra.replace(/s+/g, ' ');
      if (!texto.includes(aviso))
        s.achado({ regra: 'barra-sem-aviso-de-rede', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: `Com o placar falhando, a barra do time devia dizer "${aviso}" e disse: "${texto}".`, sugestao: 'Ver se o ?rankingErro basta para o aviso (docs/visual.md, Início).', talvezSimulador: true });
      const tocavel = await p.evaluate(() => { const b = document.querySelector('[data-barra] .barra-time'); return !!b && (b.tagName === 'BUTTON' || b.hasAttribute('data-destino')); });
      if (tocavel) s.achado({ regra: 'barra-sem-rede-tocavel', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: 'A barra do aviso de rede é um botão; devia ser só um aviso, sem toque.' });
      const topoAntes = antes.botao?.topo ?? null;
      const topoDepois = depois.botao?.topo ?? null;
      if (topoAntes !== null && topoDepois !== null && Math.abs(topoAntes - topoDepois) > 1)
        s.achado({ regra: 'jogar-agora-andou', gravidade: 'atrapalha', tipo: 'layout', oQue: `O "Jogar agora" andou quando o aviso de rede chegou: topo em y=${topoAntes} antes e y=${topoDepois} depois.`, sugestao: 'A altura da barra é reservada desde a abertura (docs/visual.md, Início).' });
      s.medir(`topo do Jogar agora: ${topoAntes} antes do aviso, ${topoDepois} depois (barra: "${texto.slice(0, 70)}", tocável: ${tocavel})`, topoDepois ?? 0);
    }, { paginaInteira: true });

    // ---- Pênalti, girando o celular no meio da partida ----
    await s.passo('Jogar agora e escolhe a disputa', async () => {
      await tocarSemCobertura(s, p.locator('[data-acao="jogar-agora"]'), 'Jogar agora na Home');
      await p.locator('[data-ficha]').first().waitFor({ state: 'visible', timeout: 15000 });
      await abrirPenalti();
    }, { fichaFactual: true });
    await s.passo('começa a partida de pênaltis', async () => {
      await s.tocar(botaoJogarPenalti());
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
      await p.waitForFunction(() => window.__partida?.fase?.() === 'mirar', null, { timeout: 40000 });
    });
    let jogo = null;
    await s.passo('gira o celular no meio da partida e volta', async () => {
      const partida = jogarPartida(s, { chute: (n) => ({ u: [0.6, -0.6, 0.3, -0.3, 0][n % 5], forca: 70 }), limiteMs: 170000, reacaoMs: 450 });
      await p.waitForFunction(() => (window.__partida?.cobrancas?.length ?? 0) >= 2, null, { timeout: 90000 }).catch(() => {});
      const antes = await p.evaluate(() => window.__partida?.cobrancas?.length ?? 0).catch(() => 0);
      await s.tamanho(873, 393);
      await conferirCampo(s, 'celular deitado (873×393) no meio da partida');
      await s.conferir('celular deitado no meio da partida', { assentarMs: 900, semRolar: true });
      await esperar(2500);
      const durante = await p.evaluate(() => window.__partida?.cobrancas?.length ?? 0).catch(() => 0);
      await s.tamanho(393, 873);
      await conferirCampo(s, 'celular em pé de novo (393×873)');
      await s.conferir('celular em pé de novo', { assentarMs: 900, semRolar: true });
      jogo = await partida;
      s.medir(`cobranças: ${antes} antes de girar, ${durante} com o celular deitado, ${jogo.cobrancas} no fim`, jogo.cobrancas - antes);
      if (jogo.cobrancas <= antes && !jogo.terminou)
        s.achado({ regra: 'chute-parou-de-responder', gravidade: 'bloqueia', tipo: 'erro', oQue: `Depois de girar o celular no meio da partida o chute não respondeu mais (cobranças antes: ${antes}, no fim: ${jogo.cobrancas}).`, talvezSimulador: true });
    }, { limiteMs: 175000 });
    if (jogo && !jogo.terminou) s.achado({ regra: 'partida-nao-terminou', gravidade: 'bloqueia', tipo: 'erro', oQue: `A partida não chegou ao resultado (${jogo.cobrancas} cobranças, ${jogo.defesas} defesas).`, talvezSimulador: true });
    await s.passo('resultado da partida', async () => {
      await p.locator('[data-acao="mais-uma"], [data-acao="card"], [data-acao="inicio"]').first().waitFor({ state: 'visible', timeout: 30000 });
    }, { paginaInteira: true });

    // ---- Lances: a rede cai no 2º chute ----
    await s.passo('abre uma falta (Lances)', async () => {
      await s.abrir(`/?${BASE}&caiNoLance=2`, { esperarPor: '[data-jogo="penaltis"]', limiteMs: 20000 });
      await esperar(1800); // a Home ainda se mexe quando acaba de abrir (placa do troféu chega tarde)
      for (let k = 0; k < 2; k++) {
        await tocarSemCobertura(s, p.locator('[data-jogo="penaltis"]'), 'card Lances do Jogo');
        if (await p.locator('[data-ficha]').first().isVisible({ timeout: 6000 }).catch(() => false)) break;
        if (k === 0) s.achado({ regra: 'toque-nao-abriu-lances', gravidade: 'atrapalha', tipo: 'layout', oQue: 'O toque no card dos Lances não abriu a lista (a Home mudou de lugar logo depois de abrir?).', talvezSimulador: true });
      }
      await p.locator('[data-ficha]').first().waitFor({ state: 'visible', timeout: 15000 });
      await s.tocar(p.locator('[data-tipo="falta"]'), { semMudancaOk: true });
      await p.locator('[data-filtro="clube"]').selectOption('todos').catch(() => {});
      await esperar(500);
      await s.tocar(p.locator('[data-ficha]').first());
      await esperar(400);
      await s.tocar(p.getByRole('button', { name: /^jogar/i }).first());
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
      await p.waitForFunction(() => window.__lances?.fase?.() === 'mirar', null, { timeout: 40000 });
    }, { fichaFactual: true });
    let lance = null;
    await s.passo('rede cai no 2º chute e volta', async () => {
      const partida = jogarLance(s, { chute: (n) => ({ u: [0.3, -0.3, 0.1][n % 3], forca: 74 }), limiteMs: 110000 });
      await p.waitForFunction(() => (window.__lances?.resultados?.length ?? 0) >= 1, null, { timeout: 60000 }).catch(() => {});
      await s.offline(true);
      await esperar(2500);
      await s.conferir('rede caiu no 2º chute dos Lances', { assentarMs: 1500, semRolar: true });
      const faixa = (await p.locator('.instrucao, .aviso-partida, [role="alert"], [role="status"]').allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
      s.medir(`o que o jogo mostrou com a rede caída: ${faixa.slice(0, 4).join(' | ') || '(nada na faixa)'}`, 0);
      await esperar(2500);
      await s.offline(false);
      lance = await partida;
    }, { limiteMs: 130000 });
    if (lance && !lance.terminou) s.achado({ regra: 'partida-nao-terminou', gravidade: 'atrapalha', tipo: 'erro', oQue: `Os Lances não chegaram ao resultado depois da rede cair no 2º chute (${lance.tentativas} tentativas).`, talvezSimulador: true });
    await s.passo('resultado dos Lances depois da queda', async () => {
      await p.locator('[data-acao="mais-uma"], [data-acao="card"], [data-acao="inicio"], [data-estado-acao], [data-tentar]').first().waitFor({ state: 'visible', timeout: 25000 });
    }, { paginaInteira: true });

    // ---- Toque duplo: Jogar ----
    await s.passo('toque duplo em Jogar agora', async () => {
      await home();
      const antes = await p.evaluate(() => document.querySelectorAll('main').length).catch(() => 0);
      await p.locator('[data-acao="jogar-agora"]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await s.tocarDuplo(p.locator('[data-acao="jogar-agora"]'), 80);
      await esperar(2500);
      const n = await p.evaluate(() => ({ mains: document.querySelectorAll('main').length, dialogs: document.querySelectorAll('dialog[open]').length, canvas: document.querySelectorAll('canvas.campo-jogo').length, fichas: document.querySelectorAll('[data-ficha]').length })).catch(() => null);
      s.medir(`depois do toque duplo em Jogar agora: ${JSON.stringify(n)} (main antes: ${antes})`, n?.mains ?? 0);
      if (n && (n.mains > 1 || n.canvas > 1 || n.dialogs > 1)) s.achado({ regra: 'toque-duplo-abriu-duas-vezes', gravidade: 'atrapalha', tipo: 'erro', oQue: `Toque duplo em "Jogar agora" abriu coisa em duplicidade: ${JSON.stringify(n)}.`, sugestao: 'Ignorar o 2º toque enquanto a tela troca.' });
    });
    await s.passo('toque duplo em Jogar (começa a partida)', async () => {
      await home();
      await esperar(1500);
      await tocarSemCobertura(s, p.locator('[data-jogo="penaltis"]'), 'card Lances do Jogo');
      await p.locator('[data-ficha]').first().waitFor({ state: 'visible', timeout: 15000 });
      await abrirPenalti();
      const antes = await inicios();
      const alvo = botaoJogarPenalti();
      await alvo.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await s.tocarDuplo(alvo, 70);
      await p.locator('canvas.campo-jogo').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
      await esperar(2500);
      const depoisN = await inicios();
      const canvas = await p.locator('canvas.campo-jogo').count();
      s.medir(`partidas começadas pelo toque duplo em Jogar: ${depoisN - antes} (canvas na tela: ${canvas})`, depoisN - antes);
      if (depoisN - antes > 1 || canvas > 1) s.achado({ regra: 'toque-duplo-duas-partidas', gravidade: 'atrapalha', tipo: 'erro', oQue: `Toque duplo em Jogar começou ${depoisN - antes} partidas (${canvas} campos na tela).`, sugestao: 'Desligar o botão no 1º toque.' });
    }, { fichaFactual: true });

    // ---- Toque duplo: Compartilhar e Salvar (card) ----
    await s.passo('abre o card (Stories)', async () => {
      await s.abrir(`/?${BASE}&cardFalso&estilo=poster&formato=stories`, { esperarPor: 'dialog[open] [data-compartilhar]', limiteMs: 20000, rotulo: 'card até abrir' });
      await p.locator('dialog[open] [data-palco][aria-busy="true"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    });
    await s.passo('toque duplo em Compartilhar', async () => {
      const antes = (await s.compartilhados()).length;
      await s.tocarDuplo(p.locator('[data-compartilhar]'), 80);
      await esperar(2500);
      const c = await s.compartilhados();
      s.medir(`compartilhamentos pelo toque duplo: ${c.length - antes}`, c.length - antes);
      if (c.length - antes > 1) s.achado({ regra: 'toque-duplo-compartilhou-duas-vezes', gravidade: 'atrapalha', tipo: 'erro', oQue: `Toque duplo em Compartilhar abriu o compartilhar ${c.length - antes} vezes.`, sugestao: 'Travar o botão enquanto a folha está aberta.' });
      if (c.length === antes) s.achado({ regra: 'compartilhar-sem-efeito', gravidade: 'atrapalha', tipo: 'erro', oQue: 'Toque duplo em Compartilhar não chamou o compartilhar nativo.', talvezSimulador: true });
    });
    await s.passo('toque duplo em Salvar imagem', async () => {
      const antes = (s.downloads ?? []).length;
      await s.tocarDuplo(p.locator('[data-salvar]'), 80);
      await esperar(3500);
      const n = (s.downloads ?? []).length - antes;
      s.medir(`arquivos baixados pelo toque duplo em Salvar: ${n}`, n);
      if (n > 1) s.achado({ regra: 'toque-duplo-baixou-dois', gravidade: 'atrapalha', tipo: 'erro', oQue: `Toque duplo em Salvar imagem baixou ${n} arquivos.`, sugestao: 'Travar o botão enquanto o arquivo é feito.' });
      if (n === 0) s.achado({ regra: 'salvar-sem-download', gravidade: 'detalhe', tipo: 'erro', oQue: 'Toque duplo em Salvar imagem não baixou nenhum arquivo (aparelho de toque pode ir para o compartilhar).', talvezSimulador: true });
    });

    // ---- Vestiário: troca uma peça e sai sem salvar ----
    await s.passo('Perfil > Vestiário', async () => {
      await home();
      await s.tocar(p.locator('[data-aba="perfil"]'));
      await p.locator('[data-acao="vestiario"]').waitFor({ state: 'visible', timeout: 10000 });
      await tocarSemCobertura(s, p.locator('[data-acao="vestiario"]'), 'Vestiário (Perfil)');
      await p.locator('[data-aba="cabelo"]').waitFor({ state: 'visible', timeout: 15000 });
    }, { paginaInteira: true });
    await s.passo('troca uma peça (cabelo)', async () => {
      await s.tocar(p.locator('[data-aba="cabelo"]'));
      const itens = p.locator('[data-conteudo] .vest-item:not(.trancada):not([aria-pressed="true"])');
      const n = await itens.count();
      s.medir(`peças de cabelo liberadas: ${n}`, n);
      await s.tocar(itens.first(), { semMudancaOk: true });
      await esperar(600);
    });
    await s.passo('sai sem salvar (voltar)', async () => {
      await s.tocar(p.locator('[data-voltar]'), { semMudancaOk: true });
      await esperar(900);
      const pergunta = await p.locator('.vest-folha.sair').count();
      const perfil = await p.locator('[data-acao="vestiario"]').count();
      const texto = pergunta ? (await p.locator('.vest-folha.sair').innerText().catch(() => '')).replace(/\s+/g, ' ') : '';
      s.medir(`ao sair sem salvar: ${pergunta ? `perguntou ("${texto.slice(0, 80)}")` : perfil ? 'saiu direto, sem perguntar' : 'ficou na tela, sem perguntar'}`, pergunta);
      if (!pergunta && perfil) s.achado({ regra: 'saiu-sem-perguntar', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: 'Saiu do vestiário com peça trocada e não salva, sem perguntar "Sair sem salvar?" (a troca se perdeu).', sugestao: 'docs/jogo.md 14.5: sair com mudança pergunta antes.' });
    });
    await s.passo('responde "Sair" e confere o que ficou', async () => {
      if (await p.locator('.vest-folha.sair [data-sair]').count()) {
        await s.tocar(p.locator('.vest-folha.sair [data-sair]'));
        await esperar(900);
      }
      await tocarSemCobertura(s, p.locator('[data-acao="vestiario"]'), 'Vestiário (Perfil)');
      await p.locator('[data-aba="cabelo"]').waitFor({ state: 'visible', timeout: 15000 });
      const marcado = await p.locator('[data-conteudo] .vest-item[aria-pressed="true"]').first().innerText().catch(() => '?');
      s.medir(`peça de cabelo marcada ao voltar ao vestiário: ${marcado.replace(/\s+/g, ' ').slice(0, 40)}`, 0);
    });
    await s.passo('voltar do celular com peça trocada', async () => {
      await s.tocar(p.locator('[data-aba="cabelo"]'), { semMudancaOk: true });
      const itens = p.locator('[data-conteudo] .vest-item:not(.trancada):not([aria-pressed="true"])');
      const n = await itens.count();
      await s.tocar(itens.first(), { semMudancaOk: true });
      await esperar(500);
      await p.goBack({ timeout: 6000 }).catch(() => {});
      await esperar(1000);
      const pergunta = await p.locator('.vest-folha.sair').count();
      const noVestiario = await p.locator('[data-aba="cabelo"]').count();
      s.medir(`voltar do celular com peça trocada: ${pergunta ? 'perguntou' : noVestiario ? 'ficou no vestiário' : 'saiu sem perguntar'}`, pergunta);
      if (!pergunta && !noVestiario) s.achado({ regra: 'voltar-perdeu-a-troca', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: 'O voltar do celular saiu do vestiário com a peça trocada, sem perguntar.', sugestao: 'O voltar do Android deveria abrir "Sair sem salvar?".' });
    });

    // ---- Convite sem rede (C06): sem o falso do resumo o pedido é abortado e a placa vira "sem_rede" ----
    await s.passo('link de desafio sem rede para o resumo', async () => {
      await s.abrir('/?d=abcdefgh', { esperarPor: '[data-situacao="sem_rede"]', limiteMs: 20000, rotulo: 'convite até a placa sem rede' });
      const texto = await p.locator('[data-placa]').innerText();
      if (!/Sem rede: o desafio não carregou\./.test(texto)) s.achado({ regra: 'texto-sem-rede', gravidade: 'atrapalha', tipo: 'erro', oQue: `A placa sem rede disse: "${texto.trim()}"` });
      for (const a of ['tentar', 'ir-inicio']) if (!(await p.locator(`[data-acao="${a}"]`).count())) s.achado({ regra: 'botao-sem-rede', gravidade: 'atrapalha', tipo: 'erro', oQue: `Faltou [data-acao="${a}"] no convite sem rede.` });
    }, { paginaInteira: true });
    await s.passo('"Tentar de novo" mostra buscando (e, sem rede de verdade, volta à placa sem rede)', async () => {
      // A guarda do simulador não deixa nenhuma resposta de fora, então o pedido só demora um pouco e depois cai de novo
      // (não dá para mostrar o desafio abrindo aqui; isso está na jornada do Zé, que usa o falso do resumo).
      await p.route(`${SUPABASE_FALSO}/rest/v1/rpc/ver_desafio*`, async (route) => {
        await new Promise((ok) => setTimeout(ok, 1500));
        await route.fallback().catch(() => {});
      });
      await s.tocar(p.locator('[data-acao="tentar"]'), { semMudancaOk: true });
      await p.locator('[data-placa][data-situacao="buscando"]').waitFor({ state: 'visible', timeout: 3000 }).catch(() => s.achado({ regra: 'tentar-sem-buscando', gravidade: 'atrapalha', tipo: 'erro', oQue: '"Tentar de novo" não mostrou a placa em "buscando".' }));
      await p.locator('[data-placa][data-situacao="sem_rede"]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => s.achado({ regra: 'tentar-nao-voltou', gravidade: 'atrapalha', tipo: 'erro', oQue: 'Sem rede, depois do "buscando" a placa não voltou a "sem_rede".' }));
    });
    await s.passo('sem rede de novo e "Ir pro início" limpa o endereço', async () => {
      await p.unroute(`${SUPABASE_FALSO}/rest/v1/rpc/ver_desafio*`).catch(() => {});
      await s.abrir('/?d=abcdefgh', { esperarPor: '[data-situacao="sem_rede"]', limiteMs: 20000 });
      await s.tocar(p.locator('[data-acao="ir-inicio"]'));
      await p.locator('[data-acao="jogar-agora"]').waitFor({ state: 'visible', timeout: 10000 });
      const url = p.url();
      s.medir(`endereço depois do Ir pro início: ${url}`, 0);
      if (/[?&]d=/.test(url)) s.achado({ regra: 'endereco-com-d', gravidade: 'atrapalha', tipo: 'erro', oQue: `O ?d= continuou no endereço depois de "Ir pro início": ${url}` });
    });
  },
};
