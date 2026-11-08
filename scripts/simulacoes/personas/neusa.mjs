// Dona Neusa, 58, professora, São Paulo, 18+. iPad em pé e deitado (WebKit). Devagar e cuidadosa, toque grande. Lê a Casa do
// São Paulo (ficha factual), olha a Galeria e as 52 semanas, lê os Termos, vê e apaga os dados (só o que não precisa do
// servidor) e entra com o código de outro aparelho.
import { esperar, tocarSemCobertura } from './comum/jogar.mjs';

const BASE = 'homeFalsa&lancesFalsos&penaltiFalso&provaFalsa&galeriaFalsa=cheia&temporadaFalsa&cidadesFalsas=com';
const CODIGO = 'ABCD2345';

export default {
  id: 'neusa',
  ordem: 8,
  nome: 'Dona Neusa',
  descricao: '58 anos, professora, São Paulo, 18+. iPad em pé e deitado; lê a Casa do São Paulo, a Galeria, os Termos e usa o código de outro aparelho.',
  time: 'São Paulo',
  menor: false,
  toque: { erroPx: 3, demoraMs: 1100 },
  gesto: { escalaForca: 0.9, duracaoMs: 800, tremorPx: 2 },
  aparelhos: ['ipad-em-pe', 'ipad-deitado'],
  async jornada(s) {
    let p = s.page;
    await s.semear({ 'gdt:prefs': { time: 'sao-paulo', faixa: '18_mais', termosVistos: '05/11/2026', aquecimento: { visto: true, aquecido: true } } });
    // O WebKit do Windows derrubou a página nos Lances 3D e na Galeria: se ela morrer, segue numa aba nova.
    const reviver = async () => {
      if (await p.evaluate(() => true).catch(() => false)) return false;
      const morta = p;
      p = await s.novaAba();
      s.usarAba(p);
      morta.close().catch(() => {});
      await esperar(600);
      return true;
    };
    // Cada passo confere se a página ainda vive; se ela cair no meio (WebKit do Windows), refaz o passo uma vez em aba nova.
    const passo = (nome, fn, op) =>
      s.passo(nome, async () => {
        await reviver();
        try {
          await fn();
        } catch (e) {
          if (!/crash|closed/i.test(String(e?.message))) throw e;
          s.achado({ regra: 'pagina-caiu', gravidade: 'atrapalha', tipo: 'erro', oQue: `A página caiu ("Target crashed") no passo "${nome}" (WebKit do simulador); refeito em aba nova.`, sugestao: 'Repetir no iPad de verdade antes de concluir que é do jogo.', talvezSimulador: true });
          await reviver();
          await fn();
        }
      }, op);
    const abrir = async (caminho, op) => {
      await reviver();
      return s.abrir(caminho, op);
    };
    const home = (extra = '') => abrir(`/?${BASE}${extra}`, { esperarPor: '[data-acao="jogar-agora"]', limiteMs: 20000, rotulo: 'Home até o Jogar agora' });

    await passo('Home no iPad', async () => {
      await home();
    }, {});

    // ---- Casa do São Paulo (ficha factual) ----
    await passo('Casa do São Paulo', async () => {
      await s.tocar(p.locator('[data-acao="casa"]').first());
      await esperar(2500);
      if (!(await p.evaluate(() => true).catch(() => false))) s.naoSimulavel('Casa do São Paulo (página inteira)', 'o WebKit do Windows derrubou a página ao abrir a Casa');
    }, { fichaFactual: true });
    await passo('Casa: "Seja sócio" abre a folha de saída', async () => {
      const abrirSocio = p.locator('[data-socio-abrir]').first();
      if (!(await abrirSocio.count())) {
        s.naoSimulavel('Casa: Seja sócio', 'o clube não tem link de sócio na Casa deste time ou o botão não apareceu');
        return;
      }
      await s.tocar(abrirSocio);
      await p.locator('[data-socio-ficar]').first().waitFor({ state: 'visible', timeout: 8000 });
    }, { fichaFactual: true });
    await passo('Casa: "Ficar no jogo"', async () => {
      const ficar = p.locator('[data-socio-ficar]').first();
      if (await ficar.isVisible().catch(() => false)) await s.tocar(ficar, { semMudancaOk: true });
      await esperar(500);
    }, { fichaFactual: true });

    // ---- 52 semanas e Galeria ----
    await passo('Ranking > Temporada', async () => {
      await home();
      await s.tocar(p.locator('[data-aba="ranking"]'));
      await s.tocar(p.locator('[data-ranking="temporada"]'));
      await esperar(2000);
    }, {});
    await passo('52 semanas', async () => {
      await s.tocar(p.locator('[data-tsub="52semanas"]'));
      await esperar(2200);
    }, {});
    await passo('Ranking > Conquistas', async () => {
      await s.tocar(p.locator('[data-ranking="conquistas"]'));
      await esperar(1800);
    }, {});
    await passo('Galeria de Troféus', async () => {
      await s.tocar(p.locator('[data-csub="galeria"]'));
      await esperar(2500);
      if (!(await p.evaluate(() => true).catch(() => false))) {
        s.achado({ regra: 'pagina-caiu', gravidade: 'atrapalha', tipo: 'erro', oQue: 'A página travou ("Target crashed") ao abrir a Galeria de Troféus no WebKit do simulador.', sugestao: 'Repetir no iPad de verdade antes de concluir que é do jogo.', talvezSimulador: true });
        s.naoSimulavel('Galeria de Troféus', 'o WebKit do Windows derrubou a página ao abrir a Galeria');
      }
    }, {});

    // ---- Termos, ver e apagar os dados ----
    let termosCaiu = false;
    await passo('Home até os Termos', async () => {
      await home();
      await tocarSemCobertura(s, p.locator('[data-acao="termos"]').first(), 'Termos e privacidade (Home)', { semMudancaOk: true });
      await esperar(3000);
      if (!(await p.evaluate(() => true).catch(() => false))) {
        termosCaiu = true;
        s.achado({ regra: 'pagina-caiu', gravidade: 'atrapalha', tipo: 'erro', oQue: 'A página travou ("Target crashed") ao abrir os Termos e privacidade no WebKit do simulador (nos dois iPads, em todas as tentativas).', sugestao: 'Repetir no iPad de verdade antes de concluir que é do jogo.', talvezSimulador: true });
        s.naoSimulavel('Termos e privacidade, Ver meus dados e Apagar meus dados (tela de #termos)', 'o WebKit do Windows derruba a página ao abrir os Termos; o servidor está bloqueado de qualquer jeito');
        return;
      }
      await p.locator('[data-acao="ver"]').waitFor({ state: 'visible', timeout: 10000 });
    }, {});
    await passo('Ver meus dados', async () => {
      if (termosCaiu) return;
      await tocarSemCobertura(s, p.locator('[data-acao="ver"]'), 'Ver meus dados');
      await esperar(1500);
      const texto = (await p.locator('.termos-dados').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      s.medir(`Ver meus dados mostrou: ${texto.slice(0, 100)}`, 0);
      s.naoSimulavel('Ver meus dados: ficha do servidor', 'sem sessão no aparelho do simulador o jogo não pergunta ao servidor e mostra "nada guardado"; a ficha com dados precisa do servidor');
    }, {});
    await passo('Apagar meus dados: abre a folha e volta atrás', async () => {
      if (termosCaiu) return;
      await tocarSemCobertura(s, p.locator('[data-acao="apagar"]'), 'Apagar meus dados');
      await p.locator('[data-folha]:not([hidden])').waitFor({ state: 'visible', timeout: 8000 });
    });
    await passo('Apagar meus dados: "Voltar"', async () => {
      if (termosCaiu) return;
      await s.tocar(p.locator('[data-acao="ficar"]'));
      await esperar(500);
      if (await p.locator('[data-folha]:not([hidden])').count()) s.achado({ regra: 'folha-nao-fechou', gravidade: 'atrapalha', tipo: 'erro', oQue: 'Tocar em "Voltar" não fechou a folha de apagar os dados.', talvezSimulador: true });
    });

    // ---- Entrar com o código de outro aparelho ----
    const digitarCodigo = async () => {
      await p.locator('input').first().waitFor({ state: 'visible', timeout: 10000 });
      await s.tocar(p.locator('input').first(), { semMudancaOk: true });
      await p.keyboard.type(CODIGO, { delay: 250 });
      await esperar(500);
    };
    await passo('Perfil > Entrar com código (código recusado)', async () => {
      await abrir(`/?${BASE}&codigoFalso&cenario=erro=codigo_invalido`, { esperarPor: '[data-aba="perfil"]', limiteMs: 20000 });
      await s.tocar(p.locator('[data-aba="perfil"]'));
      await tocarSemCobertura(s, p.locator('[data-acao="entrar-codigo"]'), 'Entrar com código de outro aparelho');
      await digitarCodigo();
      await s.tocar(p.locator('[data-acao="entrar"]'));
      await p.locator('#entrar-erro:not([hidden])').waitFor({ state: 'visible', timeout: 8000 });
    }, {});
    await passo('Entrar com código (times diferentes)', async () => {
      await abrir(`/?${BASE}&codigoFalso&cenario=escolher`, { esperarPor: '[data-aba="perfil"]', limiteMs: 20000 });
      await s.tocar(p.locator('[data-aba="perfil"]'));
      await tocarSemCobertura(s, p.locator('[data-acao="entrar-codigo"]'), 'Entrar com código de outro aparelho');
      await digitarCodigo();
      await s.tocar(p.locator('[data-acao="entrar"]'));
      await p.locator('[data-acao="fica"]').waitFor({ state: 'visible', timeout: 8000 });
    }, {});
    await passo('escolhe qual time fica', async () => {
      await s.tocar(p.locator('.entrar-opcoes .cartao-time').first());
      await s.tocar(p.locator('[data-acao="fica"]'));
      await p.locator('.codigo-pronto, [data-acao="home"]').first().waitFor({ state: 'visible', timeout: 8000 });
    });
    await passo('Termos > Apagar meus dados (de verdade, sem sessão) e "Já jogo em outro aparelho"', async () => {
      if (termosCaiu) {
        // Sem a tela dos Termos: apaga as preferências do aparelho à mão e recarrega, que é o estado em que "Apagar" deixa o aparelho.
        await abrir(`/?${BASE}&codigoFalso`, { esperarPor: '[data-acao="jogar-agora"]', limiteMs: 20000 });
        await p.evaluate(() => localStorage.removeItem('gdt:prefs'));
        await p.reload({ waitUntil: 'domcontentloaded' });
      } else {
        await abrir(`/?${BASE}&codigoFalso#termos`, { esperarPor: '[data-acao="apagar"]', limiteMs: 20000 });
        await tocarSemCobertura(s, p.locator('[data-acao="apagar"]'), 'Apagar meus dados');
        await p.locator('[data-folha]:not([hidden])').waitFor({ state: 'visible', timeout: 8000 });
        await s.tocar(p.locator('[data-acao="confirmar"]'));
        s.naoSimulavel('Apagar meus dados: parte do servidor', 'sem sessão no aparelho do simulador, o jogo só limpa o aparelho; apagar o usuário no servidor precisa do servidor de verdade');
      }
      await p.locator('[data-id]').first().waitFor({ state: 'visible', timeout: 15000 });
    }, {});
    await passo('"Já jogo em outro aparelho" na escolha do time', async () => {
      await s.tocar(p.locator('[data-acao="outro-aparelho"]'));
      await digitarCodigo();
      await s.tocar(p.locator('[data-acao="entrar"]'));
      await p.locator('.codigo-pronto, [data-acao="home"]').first().waitFor({ state: 'visible', timeout: 8000 });
    }, {});
    await passo('Bora pra Home', async () => {
      // A tela "Pronto" vai sozinha para a Home em ~2 s: se o botão ainda estiver lá, toca; senão já está na Home.
      if (await p.locator('[data-acao="home"]').isVisible().catch(() => false)) await s.tocar(p.locator('[data-acao="home"]'), { semMudancaOk: true }).catch(() => {});
      await p.locator('[data-acao="jogar-agora"]').waitFor({ state: 'visible', timeout: 15000 });
    });
  },
};
