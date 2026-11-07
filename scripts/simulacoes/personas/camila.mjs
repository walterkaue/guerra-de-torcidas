// Camila, 31, analista, Palmeiras, 18+. Joga muito: aparelho com histórico (nível Titular), bate o limite diário de
// Lances, faz Provas, vai à Conquistas e à Galeria, manda o card e liga outro aparelho pelo código.
import { jogarPartida, jogarLance, esperar, tocarSemCobertura, entrarNaProva } from './comum/jogar.mjs';

const FLAGS = 'homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&codigoFalso&galeriaFalsa=cheia&nivel=titular';

export default {
  id: 'camila',
  ordem: 4,
  nome: 'Camila',
  descricao: '31 anos, analista, Palmeiras, 18+. Joga muito: nível Titular, limite do dia, Provas, Conquistas, card e outro aparelho.',
  time: 'Palmeiras',
  menor: false,
  toque: { erroPx: 3, demoraMs: 60 },
  gesto: { escalaForca: 1, duracaoMs: 220, tremorPx: 1 },
  aparelhos: ['iphone-15-safari', 'iphone-15-instalado'],
  async jornada(s, { aparelho }) {
    let p = s.page;
    const limite = 10;

    // Aparelho com histórico: time, apelido, faixa 18+ e aquecimento já feitos; os Termos já vistos.
    await s.semear({
      'gdt:prefs': { time: 'palmeiras', apelido: 'Palestrina', faixa: '18_mais', termosVistos: '05/11/2026', aquecimento: { visto: true, aquecido: true }, nivelNoCard: true },
    });
    // O WebKit do Windows derruba a página ao abrir os Lances (a lista e a cena): se ela morrer, segue em aba nova.
    let lancesCaiu = false;
    const reviver = async () => {
      if (await p.evaluate(() => true).catch(() => false)) return false;
      p = await s.novaAba();
      s.usarAba(p);
      return true;
    };
    const abrirVivo = async (caminho, op) => {
      await reviver();
      return s.abrir(caminho, op);
    };
    const home = async (extra = '') => {
      await reviver();
      return s.abrir(`/?${FLAGS}${extra}`, { esperarPor: '[data-acao="jogar-agora"]', limiteMs: 20000, rotulo: 'Home até o Jogar agora' });
    };
    const homeAntiga = (extra = '') => s.abrir(`/?${FLAGS}${extra}`, { esperarPor: '[data-acao="jogar-agora"]', limiteMs: 20000, rotulo: 'Home até o Jogar agora' });

    await s.passo('Home de quem joga muito (Titular)', async () => {
      await home();
    }, { paginaInteira: true });

    // ---- Lances até o limite do dia ----
    let tempoDaPrimeira = 0;
    let feitas = 0;
    let viuTreino = false;
    const jogarUma = async () => {
      const t0 = Date.now();
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
      const tipo = await p.waitForFunction(() => (window.__lances ? 'lance' : window.__partida ? 'penalti' : null), null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => null);
      let r;
      if (tipo === 'penalti') {
        await p.waitForFunction(() => window.__partida?.fase?.() === 'mirar', null, { timeout: 30000 }).catch(() => {});
        r = await jogarPartida(s, { chute: (n) => ({ u: [0.55, -0.55, 0.3, -0.3, 0][n % 5], forca: 70 }), limiteMs: 90000 });
      } else r = await jogarLance(s, { chute: (n) => ({ u: [0.3, -0.3, 0.1][n % 3], forca: 70 }), limiteMs: 60000 });
      const aviso = await p.locator('.aviso-partida').first().innerText().catch(() => '');
      if (/hoje j[aá] deu|treino/i.test(aviso) || r.textos?.some((t) => /hoje as \d+ valendo|j[aá] foram/i.test(t))) viuTreino = true;
      await p.locator('[data-acao="mais-uma"], [data-acao="card"]').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
      feitas++;
      return { ms: Date.now() - t0, aviso, r };
    };

    await s.passo('abre os Lances do Jogo', async () => {
      await tocarSemCobertura(s, p.locator('[data-jogo="penaltis"]'), 'card Lances do Jogo');
      await esperar(2500);
      if (!(await p.evaluate(() => true).catch(() => false))) {
        lancesCaiu = true;
        s.achado({ regra: 'pagina-caiu', gravidade: 'atrapalha', tipo: 'erro', oQue: 'A página travou ("Target crashed") ao abrir os Lances do Jogo no WebKit do simulador.', sugestao: 'Repetir no iPhone de verdade antes de concluir que é do jogo.', talvezSimulador: true });
        s.naoSimulavel('Lances: 10 partidas e a 11ª de treino', 'o WebKit do Windows derrubou a página nos Lances; o resto da jornada seguiu em aba nova');
      }
    });
    if (!lancesCaiu) {
    await s.passo('escolhe um lance e começa a 1ª partida', async () => {
      const faltas = p.getByRole('button', { name: /^faltas$/i }).first();
      if (await faltas.count()) await s.tocar(faltas, { semMudancaOk: true });
      await s.tocar(p.locator('[data-ficha]').first());
      await esperar(500);
      await s.tocar(p.getByRole('button', { name: /^jogar/i }).first());
    });
    await s.passo('joga a 1ª partida', async () => {
      const r = await jogarUma();
      tempoDaPrimeira = r.ms;
      s.medir('1ª partida de Lances (do toque no Jogar ao resultado)', r.ms, 25000);
    }, { limiteMs: 100000 });
    await s.passo('resultado da 1ª partida', async () => {
      await p.locator('[data-acao="mais-uma"]').waitFor({ state: 'visible', timeout: 20000 });
    }, { paginaInteira: true });

    const jogaDeVerdade = tempoDaPrimeira > 0 && tempoDaPrimeira < 25000;
    const meta = jogaDeVerdade ? limite : 3;
    if (!jogaDeVerdade)
      s.achado({ regra: 'partidas-puladas', gravidade: 'detalhe', tipo: 'simulador', oQue: `A 1ª partida levou ${Math.round(tempoDaPrimeira / 1000)} s (mais de ~25 s): joguei só 3 e usei a variação ?lancesFalsos=limite dos dados falsos para a partida acima do limite.`, talvezSimulador: true });
    for (let i = 1; i < meta; i++) {
      await s.passo(`partida ${i + 1} de ${meta}`, async () => {
        await s.tocar(p.locator('[data-acao="mais-uma"]'));
        const r = await jogarUma();
        s.medir(`partida ${i + 1}`, r.ms, 25000);
        await p.locator('[data-acao="mais-uma"]').waitFor({ state: 'visible', timeout: 20000 });
      }, { limiteMs: 100000 });
    }
    if (jogaDeVerdade) {
      await s.passo(`partida ${limite + 1}: acima do limite (treino)`, async () => {
        await s.tocar(p.locator('[data-acao="mais-uma"]'));
        await jogarUma();
        await p.locator('[data-acao="mais-uma"]').waitFor({ state: 'visible', timeout: 20000 });
      }, { limiteMs: 100000 });
      if (!viuTreino)
        s.achado({ regra: 'limite-sem-aviso', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: `Na partida ${limite + 1} (depois das ${limite} valendo) não vi o aviso "Hoje já deu… Essa vai de treino" nem a dica "Hoje as ${limite} valendo já foram".`, talvezSimulador: true });
    } else {
      await s.passo('1 partida com a variação de limite (treino)', async () => {
        await home(''); // volta à Home e abre de novo já no limite
        await abrirVivo(`/?${FLAGS.replace('lancesFalsos', 'lancesFalsos=limite')}`, { esperarPor: '[data-jogo="penaltis"]', limiteMs: 20000 });
        await tocarSemCobertura(s, p.locator('[data-jogo="penaltis"]'), 'card Lances do Jogo');
        await esperar(1200);
        await s.tocar(p.locator('[data-ficha]').first());
        await esperar(500);
        await s.tocar(p.getByRole('button', { name: /^jogar/i }).first());
        await jogarUma();
      }, { limiteMs: 110000 });
      if (!viuTreino) s.achado({ regra: 'limite-sem-aviso', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: 'Com a variação de limite, não vi o aviso de partida de treino.', talvezSimulador: true });
    }
    await s.passo('resultado de treino (acima do limite)', async () => {
      await p.locator('[data-acao="mais-uma"], [data-acao="card"]').first().waitFor({ state: 'visible', timeout: 20000 });
    }, { paginaInteira: true });
    }


    // ---- 3 Provas ----
    for (let k = 1; k <= 3; k++) {
      await s.passo(`Prova ${k}`, async () => {
        await entrarNaProva(s, home);
        await s.tocar(p.locator('[data-comecar]'));
        for (let i = 0; i < 24; i++) {
          if (await p.locator('[data-acao="inicio"]').isVisible().catch(() => false)) break;
          if (await p.locator('[data-parar]').isVisible().catch(() => false)) await s.tocar(p.locator('[data-parar]'), { semMudancaOk: true });
          else if (await p.locator('[data-alt]').first().isVisible().catch(() => false)) await s.tocar(p.locator('[data-alt]').first(), { semMudancaOk: true });
          await esperar(700);
        }
      }, { limiteMs: 80000, paginaInteira: true });
    }

    // ---- Conquistas e Galeria ----
    await s.passo('Perfil', async () => {
      await home();
      await s.tocar(p.locator('[data-aba="perfil"]'));
      await p.locator('[data-vestiario]').waitFor({ state: 'visible', timeout: 10000 });
      await p.locator('[data-carreira]:not([hidden])').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    }, { paginaInteira: true });
    if (aparelho === 'iphone-15-safari') {
      await s.passo('Perfil em 390×844: Carreira inteira', async () => {
        await s.tamanho(390, 844);
        await p.evaluate(() => window.scrollTo(0, 0));
        await esperar(500);
        await s.conferirCabeNaTela('[data-carreira]', 'Carreira no Perfil');
      });
      await s.tamanho(430, 932);
    }
    await s.passo('Conquistas', async () => {
      await s.tocar(p.locator('[data-acao="conquistas"]'));
      await esperar(1500);
    }, { paginaInteira: true });
    await s.passo('Galeria de Troféus', async () => {
      await s.tocar(p.getByRole('button', { name: /^galeria/i }).first());
      await esperar(2500);
      if (!(await p.evaluate(() => true).catch(() => false))) {
        s.achado({ regra: 'pagina-caiu', gravidade: 'atrapalha', tipo: 'erro', oQue: 'A página travou ("Target crashed") ao abrir a Galeria de Troféus no WebKit do simulador.', sugestao: 'Repetir no iPhone de verdade antes de concluir que é do jogo.', talvezSimulador: true });
        s.naoSimulavel('Galeria de Troféus', 'o WebKit do Windows derrubou a página ao abrir a Galeria');
      }
    }, { paginaInteira: true });

    // ---- Card no Stories e Salvar imagem ----
    await s.passo('card no Stories (compartilhar nativo)', async () => {
      await abrirVivo(`/?${FLAGS}&cardFalso&estilo=poster&formato=stories`, { esperarPor: 'dialog[open] [data-compartilhar]', limiteMs: 20000, rotulo: 'card até abrir' });
      await p.locator('dialog[open] [data-palco][aria-busy="true"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
      await s.tocar(p.locator('[data-compartilhar]'), { semMudancaOk: true });
      await esperar(1500);
      const c = await s.compartilhados();
      if (!c.length) s.achado({ regra: 'compartilhar-sem-efeito', gravidade: 'atrapalha', tipo: 'erro', oQue: 'Compartilhar no card não chamou o compartilhar nativo (nada em s.compartilhados()).', talvezSimulador: true });
    });
    await s.passo('Salvar imagem', async () => {
      await s.tocar(p.locator('[data-salvar]'), { semMudancaOk: true });
      await esperar(2000);
      s.medir(`downloads e compartilhamentos até aqui: ${(s.downloads ?? []).length} download(s), ${(await s.compartilhados()).length} compartilhamento(s)`, 0);
    });

    // ---- Outro aparelho ----
    await s.passo('Perfil > Jogar em outro aparelho', async () => {
      await home();
      await s.tocar(p.locator('[data-aba="perfil"]'));
      await tocarSemCobertura(s, p.locator('[data-acao="outro-aparelho"]'), 'Jogar em outro aparelho');
      await p.locator('[data-caixa]').waitFor({ state: 'visible', timeout: 10000 });
      await esperar(1500);
    }, { paginaInteira: true });
  },
};
