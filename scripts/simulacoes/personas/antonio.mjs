// Seu Antônio, 68, aposentado, Vasco, 18+. Entra direto no site pelo Samsung Internet, com fonte 150% e movimento
// reduzido. Lê devagar, toca impreciso e arrasta curto e lento (a dica "Fraquinho, o goleiro pega" tem de aparecer).
import { chutar, tocarZona, jogarPartida, esperar, tocarSemCobertura, entrarNaProva } from './comum/jogar.mjs';
import { textosCortados, seEncostam } from './comum/home.mjs';
import { conferirTelaoParado } from './comum/golsDoConvite.mjs';

const FLAGS = 'homeFalsa&aquecimentoFalso&provaFalsa&penaltiFalso&lancesFalsos';
const DICA_FRACO = /fraquinho/i;

export default {
  id: 'antonio',
  ordem: 3,
  nome: 'Seu Antônio',
  descricao: '68 anos, aposentado, Vasco, 18+. Entra direto no site, lê devagar, toque impreciso, movimento reduzido ligado.',
  time: 'Vasco',
  menor: false,
  toque: { erroPx: 10, demoraMs: 900 },
  gesto: { escalaForca: 0.45, duracaoMs: 900, tremorPx: 4 },
  aparelhos: ['s21-samsung'],
  async jornada(s) {
    const p = s.page;
    const home = (extra = '') => s.abrir(`/?${FLAGS}${extra}`, { esperarPor: '[data-acao="jogar-agora"]', limiteMs: 20000, rotulo: 'Home até o Jogar agora' });

    // 1. Aparelho novo: a escolha do time é a primeira tela, depois a triagem e o aquecimento.
    await s.passo('entra direto no site (aparelho novo)', async () => {
      await s.abrir(`/?${FLAGS}`, { esperarPor: '[data-id]', limiteMs: 20000, rotulo: 'primeira tela até a escolha do time' });
    });
    await s.passo('escolhe o Vasco', async () => {
      await s.tocar(p.locator('[data-id="vasco"]'), { semMudancaOk: true });
      await s.tocar(p.locator('[data-acao="confirmar"]'));
    });
    await s.passo('triagem: 18 ou mais', async () => {
      await s.tocar(p.getByRole('button', { name: '18 ou mais' }));
    });

    // 2. Aquecimento: 5 estações.
    const nomeDaEstacao = () => p.locator('.aq-etapa').first().innerText().catch(() => '');
    await s.passo('aquecimento: começa na estação 1', async () => {
      await p.locator('.aq-etapa').first().waitFor({ state: 'visible', timeout: 20000 });
      await esperar(2200);
      await s.conferirParado('a mão do aquecimento (estação 1)');
    });
    let vistas = 0;
    for (let guarda = 0; guarda < 8; guarda++) {
      if (await p.locator('[data-jogar]').isVisible().catch(() => false)) break;
      const etapa = await nomeDaEstacao();
      const n = Number((/(\d)\s*\/\s*\d/.exec(etapa) ?? [])[1] ?? 0);
      await s.passo(`aquecimento: estação ${n || guarda + 1} (${etapa.replace(/\s+/g, ' ').slice(0, 30)})`, async () => {
        const seletor = 'canvas.aq-canvas';
        if (/Pênalti/i.test(etapa)) {
          await esperar(1500);
          await chutar(s, { u: 0.5, forca: 70, seletor });
        } else if (/Defesa/i.test(etapa)) {
          await esperar(1800);
          await tocarZona(s, 1, 'baixa', seletor);
        } else if (/Falta/i.test(etapa)) {
          await esperar(1500);
          await s.arrastar(seletor, [0.5, 0.78], [0.56, 0.45]);
        } else if (/Prova/i.test(etapa)) {
          await s.tocar(p.locator('[data-alt]').first());
        } else if (/Palpite/i.test(etapa)) {
          await s.tocar(p.locator('[data-passo$=":1"]').first(), { semMudancaOk: true });
          await s.tocar(p.locator('[data-cravar]'));
        } else await esperar(1500);
        await s.conferirParado(`o papel picado da estação ${n}`);
        vistas++;
        // espera a próxima estação (ou o fim)
        const t0 = Date.now();
        while (Date.now() - t0 < 9000) {
          if (await p.locator('[data-jogar]').isVisible().catch(() => false)) break;
          if ((await nomeDaEstacao()) !== etapa) break;
          await esperar(300);
        }
      }, { limiteMs: 40000 });
    }
    await s.passo('aquecimento: fim (Aquecido)', async () => {
      await p.locator('[data-jogar]').waitFor({ state: 'visible', timeout: 15000 });
    });

    // 3. "Jogar agora" do aquecimento abre os Lances; um X1 curto com chutes fracos.
    await s.passo('Jogar agora (fim do aquecimento)', async () => {
      await s.tocar(p.locator('[data-jogar]'));
      await p.locator('[data-ficha]').first().waitFor({ state: 'visible', timeout: 15000 });
    });
    await s.passo('abre a ficha e começa a partida', async () => {
      await s.tocar(p.locator('[data-ficha]').first());
      await esperar(600);
      await s.tocar(p.getByRole('button', { name: /^jogar/i }).first());
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
    });
    let jogo = null;
    await s.passo('joga com arraste curto e lento', async () => {
      await p.waitForFunction(() => window.__partida?.fase?.() === 'mirar', null, { timeout: 40000 });
      jogo = await jogarPartida(s, { chute: (n) => ({ u: [0.4, -0.4, 0.2, -0.2, 0][n % 5], forca: 70 }), limiteMs: 200000, reacaoMs: 1200 });
      await s.conferirParado('o replay e a partida (movimento reduzido)');
    }, { limiteMs: 205000 });
    if (jogo && !jogo.textos.some((t) => DICA_FRACO.test(t)))
      s.achado({
        regra: 'dica-nao-apareceu',
        gravidade: 'atrapalha',
        tipo: 'regra do jogo.md',
        oQue: `Arrastando curto (força ~31) em ${jogo.cobrancas} cobranças, a dica "Fraquinho, o goleiro pega. Arraste mais longo." não apareceu. Frases vistas: ${jogo.textos.slice(0, 8).join(' | ')}`,
        sugestao: 'A dica só vem se o goleiro pegar a bola fraca; ver no print se a bola entrou.',
        talvezSimulador: true,
      });
    if (jogo && !jogo.terminou) s.achado({ regra: 'partida-nao-terminou', gravidade: 'bloqueia', tipo: 'erro', oQue: 'A partida não chegou ao resultado.', talvezSimulador: true });
    await s.passo('resultado (movimento reduzido)', async () => {
      await p.locator('[data-acao="inicio"]').waitFor({ state: 'visible', timeout: 30000 });
      await s.conferirParado('o resultado (papel picado e pulinho)');
    }, { paginaInteira: true });
    await s.passo('volta ao início', async () => {
      await s.tocar(p.locator('[data-acao="inicio"]'));
      await p.locator('[data-acao="jogar-agora"]').waitFor({ state: 'visible', timeout: 15000 });
    });

    // Rota B (HOME2), fonte a 150%: a tarja do time, o "trocar" e a barra do time não se encostam, nada é cortado.
    await s.passo('Home a 150%: tarja, trocar e barra sem se encostar, sem texto cortado', async () => {
      await p.locator('[data-barra] .barra-time').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      await esperar(1500);
      const g = await p.evaluate(() => {
        const c = (sel) => {
          const el = document.querySelector(sel);
          if (!el || el.getClientRects().length === 0) return null;
          const r = el.getBoundingClientRect();
          return { topo: Math.round(r.top), base: Math.round(r.bottom), esq: Math.round(r.left), dir: Math.round(r.right), larg: Math.round(r.width), alt: Math.round(r.height) };
        };
        return { tarja: c('.arquibancada .bloco-time-faixa'), trocar: c('.arquibancada .link-trocar'), barra: c('[data-barra] .barra-time'), texto: (document.querySelector('[data-barra] .barra-time')?.textContent ?? '').replace(/\s+/g, ' ').trim() };
      });
      for (const [a, b, nome] of [['tarja', 'trocar', 'a tarja e o "trocar"'], ['tarja', 'barra', 'a tarja e a barra'], ['trocar', 'barra', 'o "trocar" e a barra']])
        if (!g[a] || !g[b]) s.achado({ regra: 'home-peca-ausente', gravidade: 'atrapalha', tipo: 'layout', oQue: `Na Home a 150% não achei ${!g[a] ? a : b} para conferir ${nome}.`, talvezSimulador: true });
        else if (seEncostam(g[a], g[b]))
          s.achado({ regra: 'home-pecas-se-encostam', gravidade: 'atrapalha', tipo: 'layout', oQue: `Na Home a 150%, ${nome} se sobrepõem: ${a} y=${g[a].topo}..${g[a].base} x=${g[a].esq}..${g[a].dir}; ${b} y=${g[b].topo}..${g[b].base} x=${g[b].esq}..${g[b].dir}.`, chave: 'encosta:' + a + b });
      if (g.tarja && g.barra) s.medir(`folga entre a base da tarja (y=${g.tarja.base}) e o topo da barra (y=${g.barra.topo})`, g.barra.topo - g.tarja.base);
      if (g.trocar && g.barra) s.medir(`folga entre a base do "trocar" (y=${g.trocar.base}) e o topo da barra (y=${g.barra.topo})`, g.barra.topo - g.trocar.base);
      if (g.trocar && (g.trocar.larg < 44 || g.trocar.alt < 44))
        s.achado({ regra: 'trocar-menor-que-44', gravidade: 'atrapalha', tipo: 'layout', oQue: `O "trocar" mede ${g.trocar.larg}×${g.trocar.alt} px a 150%; o alvo é de 44 px.` });
      s.medir(`"trocar" a 150%: ${g.trocar?.larg}×${g.trocar?.alt}; barra com ${g.barra?.alt} px de altura, texto "${g.texto.slice(0, 60)}"`, g.trocar?.alt ?? 0);
      const cortados = await textosCortados(p, ['.bloco-time-faixa', '.bloco-time-faixa *', '.link-trocar', '.barra-time', '.barra-time *']);
      for (const c of cortados)
        s.achado({ regra: 'home-texto-cortado', gravidade: 'atrapalha', tipo: 'layout', oQue: `Texto cortado na Home a 150%: ${c.sel} "${c.texto}" (sobra ${c.dx} px na largura, ${c.dy} px na altura).`, chave: 'corta:' + c.sel + c.texto });
    }, { paginaInteira: true });

    // 4. Crava a rodada, com a certeza.
    await s.passo('abre o Palpite da Rodada', async () => {
      await s.tocar(p.locator('[data-jogo="crava"]'));
      await p.locator('[data-jogo]').first().waitFor({ state: 'visible', timeout: 15000 });
    });
    await s.passo('crava com a certeza', async () => {
      await s.tocar(p.locator('[data-acao="certeza"]').first());
      await s.tocar(p.locator('[data-acao="mais"][data-lado="m"]').first(), { semMudancaOk: true });
      await s.tocar(p.locator('[data-acao="mais"][data-lado="m"]').first(), { semMudancaOk: true });
      await s.tocar(p.locator('[data-acao="cravar"]').first());
    });
    await s.passo('regras do Crava (?)', async () => {
      await s.tocar(p.locator('[data-acao="como-cravar"]'));
      await esperar(800);
    });
    await s.passo('fecha as regras', async () => {
      await s.tocar(p.locator('button[data-regras-fechar]').first(), { semMudancaOk: true });
      await esperar(400);
    });

    // 5. Time do Dia (o ?diaFalso abre o jogo direto).
    await s.passo('Time do Dia', async () => {
      await s.abrir(`/?${FLAGS}&diaFalso=flamengo`, { esperarPor: '#dia-busca', limiteMs: 20000, rotulo: 'Time do Dia até o campo de busca' });
      await esperar(1500);
      await s.conferirParado('a linha de exemplo do Time do Dia');
    });
    await s.passo('chuta um clube', async () => {
      const busca = p.locator('#dia-busca');
      await s.tocar(busca, { semMudancaOk: true });
      await p.keyboard.type('Fluminense', { delay: 200 });
      await s.tocar(p.locator('[data-clube]').first());
      await s.tocar(p.locator('[data-chutar-btn]'));
      await esperar(1500);
    });

    // 6. Prova: o tempo estoura de propósito.
    await s.passo('Home e Prova', async () => {
      await entrarNaProva(s, home);
      await p.locator('[data-comecar]').waitFor({ state: 'visible', timeout: 15000 });
    });
    await s.passo('regras da Prova (?) antes de começar', async () => {
      await s.tocar(p.locator('.prova-como'));
      await esperar(800);
    });
    await s.passo('fecha as regras da Prova', async () => {
      await s.tocar(p.locator('button[data-regras-fechar]').first(), { semMudancaOk: true });
      await esperar(400);
    });
    await s.passo('começa a prova e deixa o tempo estourar', async () => {
      await s.tocar(p.locator('[data-comecar]'));
      await p.locator('[data-alt]').first().waitFor({ state: 'visible', timeout: 20000 });
      const t0 = Date.now();
      // espera o tempo acabar sem tocar: o jogo troca a pergunta ou mostra o erro por tempo esgotado
      const antes = await p.locator('[data-texto]').innerText().catch(() => '');
      for (let i = 0; i < 60; i++) {
        await esperar(1000);
        const agora = await p.locator('[data-texto]').innerText().catch(() => '');
        const dica = await p.locator('[data-dica]').innerText().catch(() => '');
        if (agora !== antes || /acabou o tempo|tempo/i.test(dica)) break;
      }
      s.medir('tempo até a Prova dar a pergunta por perdida (sem toque)', Date.now() - t0, 60000);
    }, { limiteMs: 70000 });
    await s.passo('depois do tempo estourado', async () => {
      await esperar(1000);
    });

    // 7. Casa do Vasco.
    await s.passo('Casa do Vasco', async () => {
      await home();
      await s.tocar(p.locator('[data-acao="casa"]').first());
      await esperar(2500);
    }, { paginaInteira: true, fichaFactual: true });

    // 8. O link de Lances com os gols de quem chamou, com movimento reduzido: nada anda, "Próximo gol" troca o quadro.
    await s.passo('link de Lances: telão parado e "Próximo gol"', () => conferirTelaoParado(s));
  },
};
