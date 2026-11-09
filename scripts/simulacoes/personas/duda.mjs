// Duda, 15, estudante, Corinthians, "menos de 16". Abre no Instagram o link de um lance (#lance/<id>) que viu nos
// Stories, joga e manda o card no Stories. Testa a frase própria (barrada e aceita) e o apelido.
import { jogarLance, palavrasDoFiltro, esperar } from './comum/jogar.mjs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const LANCE = 'corinthians-2012-gol-da-america'; // cara a cara do catálogo (src/dados/lances.ts)

export default {
  id: 'duda',
  ordem: 2,
  nome: 'Duda',
  descricao: '15 anos, estudante, Corinthians, "menos de 16". Abre no Instagram o link de um lance dos Stories.',
  time: 'Corinthians',
  menor: true,
  toque: { erroPx: 6, demoraMs: 150 },
  gesto: { escalaForca: 1, duracaoMs: 300, tremorPx: 2 },
  aparelhos: ['iphone-se'],
  async jornada(s) {
    let p = s.page;
    const { palavrao } = await palavrasDoFiltro(RAIZ);
    const famoso = (s.famosos ?? []).find((n) => n.length >= 6) ?? null;

    await s.passo('abre o link do lance (Stories)', async () => {
      await s.abrir(`/?homeFalsa&lancesFalsos#lance/${LANCE}`, { esperarPor: '[data-id]', limiteMs: 20000, rotulo: 'link do lance até a escolha do time' });
    });
    await s.passo('escolhe o Corinthians', async () => {
      await s.tocar(p.locator('[data-id="corinthians"]'), { semMudancaOk: true });
      await s.tocar(p.locator('[data-acao="confirmar"]'));
    });
    await s.passo('triagem: menos de 16', async () => {
      await s.tocar(p.getByRole('button', { name: 'Menos de 16' }));
    });
    await s.passo('aquecimento aparece: Pular', async () => {
      const pular = p.locator('[data-pular]');
      if (await pular.isVisible({ timeout: 6000 }).catch(() => false)) await s.tocar(pular);
      else s.achado({ regra: 'sem-aquecimento', gravidade: 'detalhe', tipo: 'regra do jogo.md', oQue: 'Depois da triagem pelo link do lance o aquecimento não apareceu (o jogo.md 14.8 diz triagem, aquecimento, Home; link entra direto).', talvezSimulador: true });
    });
    await s.passo('o lance (ficha ou partida)', async () => {
      await esperar(1500);
      const jogar = p.getByRole('button', { name: /^jogar/i }).first();
      if (await jogar.isVisible().catch(() => false)) await s.tocar(jogar);
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
    });
    let jogo = null;
    await s.passo('joga as 3 tentativas', async () => {
      jogo = await jogarLance(s, { chute: (n) => ({ u: [0.3, -0.3, 0.1][n % 3], forca: 70 }), limiteMs: 110000 });
    }, { limiteMs: 115000 });
    if (jogo && !jogo.terminou) s.achado({ regra: 'partida-nao-terminou', gravidade: 'bloqueia', tipo: 'erro', oQue: `O lance não chegou ao resultado (${jogo.tentativas} tentativas).`, talvezSimulador: true });
    await s.passo('resultado do lance', async () => {
      await p.locator('[data-acao="card"]').waitFor({ state: 'visible', timeout: 30000 });
    }, { paginaInteira: true });

    // O WebKit do Windows às vezes cai na cena 3D dos Lances (limite do simulador): se a página morreu, segue numa aba nova
    // com o card de mentira (?cardFalso), que abre a mesma tela "Seu card" sem passar pelo lance.
    const viva = await p.evaluate(() => true).catch(() => false);
    if (!viva) {
      s.achado({ regra: 'pagina-caiu', gravidade: 'atrapalha', tipo: 'erro', oQue: 'A página travou ("Target crashed") ao abrir ou jogar o lance na cena 3D no WebKit do simulador.', sugestao: 'Repetir no iPhone de verdade antes de concluir que é do jogo.', talvezSimulador: true });
      p = await s.novaAba();
      s.usarAba(p);
      s.naoSimulavel('resultado do lance (iPhone SE)', 'a página do WebKit caiu na cena 3D; o card foi aberto pelo ?cardFalso');
      await s.passo('card de mentira (a página do lance caiu)', async () => {
        await p.goto(s.endereco('/?homeFalsa&lancesFalsos&cardFalso&estilo=poster'), { waitUntil: 'domcontentloaded' });
        await p.locator('dialog[open] [data-palco]').waitFor({ state: 'visible', timeout: 20000 });
      });
    }

    // O card no Stories, com o Pôster.
    await s.passo('abre SEU CARD', async () => {
      if (!(await p.locator('dialog[open] [data-palco]').count())) await s.tocar(p.locator('[data-acao="card"]'));
      await p.locator('dialog[open] [data-palco]').waitFor({ state: 'visible', timeout: 15000 });
      await p.locator('dialog[open] [data-palco][aria-busy="true"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    });
    await s.passo('troca para o Pôster', async () => {
      const poster = p.locator('dialog[open] [data-ponto]', { hasText: /p[oô]ster/i }).first();
      if (await poster.count()) await s.tocar(poster);
      else s.achado({ regra: 'poster-ausente', gravidade: 'atrapalha', tipo: 'erro', oQue: 'O estilo Pôster não apareceu na lista do card (com o boneco falso do vestiário).', talvezSimulador: true });
      await esperar(1200);
    });

    // Frase própria: palavrão barrado, nome de jogador famoso, frase limpa.
    const escrever = async (texto) => {
      const campo = p.locator('#cc-frase');
      if (!(await campo.isVisible().catch(() => false))) await s.tocar(p.locator('dialog[open] [data-acao="escrever"]'));
      await campo.waitFor({ state: 'visible', timeout: 8000 });
      await campo.fill(texto);
      await esperar(300);
    };
    await s.passo('frase com palavrão (barrada)', async () => {
      if (!palavrao) return s.naoSimulavel('Escrever minha frase', 'não achei palavra da lista do filtro na migração base');
      await escrever(`o ${palavrao} do jogo`);
      await s.tocar(p.locator('[data-por]'), { semMudancaOk: true });
      await esperar(500);
      if (!(await p.locator('[data-barrada]').isVisible().catch(() => false)))
        s.achado({ regra: 'filtro-nao-barrou', gravidade: 'bloqueia', tipo: 'regra do jogo.md', oQue: 'Frase com palavra da lista do filtro foi aceita (o aviso "Essa frase não passou no filtro" não apareceu).', sugestao: 'Conferir o filtro da frase.' });
    });
    await s.passo('frase com nome de jogador famoso (barrada)', async () => {
      if (!famoso) return s.naoSimulavel('frase com nome famoso', 'lista de famosos vazia');
      await escrever(`falta do ${famoso}`);
      await s.tocar(p.locator('[data-por]'), { semMudancaOk: true });
      await esperar(500);
      if (!(await p.locator('[data-barrada]').isVisible().catch(() => false)))
        s.achado({ regra: 'filtro-nao-barrou-famoso', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: 'Frase com nome de jogador famoso foi aceita no card. O filtro de nome famoso (docs/jogo.md 14.6) pode ser só do servidor/apelido; a frase vai só no aparelho.', talvezSimulador: true });
    });
    await s.passo('frase limpa (aceita)', async () => {
      await escrever('Vai Corinthians, hoje o lance sai!');
      await s.tocar(p.locator('[data-por]'));
      await esperar(1500);
      if (await p.locator('#cc-frase').isVisible().catch(() => false)) s.achado({ regra: 'frase-nao-aceita', gravidade: 'atrapalha', tipo: 'erro', oQue: 'A frase limpa não fechou a folha.', talvezSimulador: true });
    });

    // Apelido só 16+ (docs/jogo.md, seção 4): para a Duda o quadradinho "Meu apelido" fica apagado e não abre a folha.
    await s.passo('apelido fechado para menos de 16', async () => {
      const apelido = p.locator('dialog[open] [data-chave="apelido"]');
      if (!(await apelido.count())) return;
      if (!(await apelido.isDisabled().catch(() => false))) {
        s.achado({ regra: 'apelido-menor-de-16', gravidade: 'bloqueia', tipo: 'regra do jogo.md', oQue: 'Com "menos de 16" na triagem, o quadradinho "Meu apelido" do card está ligável (jogo.md, seção 4: apelido só 16+).' });
        await s.tocar(apelido, { semMudancaOk: true });
      }
      if (await p.locator('#cc-apelido').isVisible().catch(() => false)) {
        s.achado({ regra: 'apelido-menor-de-16', gravidade: 'bloqueia', tipo: 'regra do jogo.md', oQue: 'Com "menos de 16" na triagem, o card abriu a folha "Escolha seu apelido".' });
      }
    });
    await s.passo('fecha a folha e o card', async () => {
      if (await p.locator('#cc-apelido').isVisible().catch(() => false)) await s.tocar(p.locator('[data-agora-nao]'), { semMudancaOk: true });
      await esperar(300);
      await p.keyboard.press('Escape');
      await esperar(300);
      if (await p.locator('dialog[open]').count()) await s.tocar(p.locator('dialog[open] [data-fechar]').first(), { semMudancaOk: true });
    });

    // Perfil e vestiário.
    await s.passo('Perfil', async () => {
      await s.abrir('/?homeFalsa&lancesFalsos', { esperarPor: '[data-aba="perfil"]', limiteMs: 15000 });
      await s.tocar(p.locator('[data-aba="perfil"]'));
      await p.locator('[data-vestiario]').waitFor({ state: 'visible', timeout: 10000 });
      if (await p.locator('[data-acao="apelido"]').count()) {
        s.achado({ regra: 'apelido-menor-de-16', gravidade: 'bloqueia', tipo: 'regra do jogo.md', oQue: 'Com "menos de 16" na triagem, o Perfil oferece "Dar um apelido" (jogo.md, seção 4: apelido só 16+).' });
      }
    }, { paginaInteira: true });
    await s.passo('vestiário', async () => {
      await s.tocar(p.locator('[data-acao="vestiario"]'));
      await esperar(2000);
    });
  },
};
