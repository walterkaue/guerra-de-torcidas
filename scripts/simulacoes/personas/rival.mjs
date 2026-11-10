// Rival (caso do convite): o desafio é do Flamengo; quem abre vê as faixas Flamengo e Fluminense (nessa ordem, nenhuma
// marcada), toca o Fluminense, passa a triagem e o gdt:prefs.time vira fluminense.
export default {
  id: 'rival',
  ordem: 9,
  nome: 'Rival',
  descricao: 'Aparelho novo; o desafio é do Flamengo e a pessoa escolhe a faixa do rival.',
  time: 'Fluminense',
  menor: false,
  toque: { erroPx: 4, demoraMs: 80 },
  gesto: { escalaForca: 1, duracaoMs: 150, tremorPx: 1 },
  aparelhos: ['android-entrada'],
  async jornada(s) {
    const p = s.page;
    await s.passo('abre o desafio do Flamengo', async () => {
      await s.abrir('/?homeFalsa&penaltiFalso&d=abcdefgh&chamouTime=flamengo', { esperarPor: '[data-faixa-time]', limiteMs: 20000 });
    }, { paginaInteira: true });
    await s.passo('as faixas: Flamengo e Fluminense, nessa ordem, nenhuma marcada', async () => {
      const faixas = await p.locator('[data-faixa-time]').evaluateAll((els) =>
        els.map((e) => ({ id: e.dataset.faixaTime, marcada: e.getAttribute('aria-pressed') === 'true' || e.classList.contains('marcada') || e.classList.contains('ativa') || e.hasAttribute('data-marcada') })),
      );
      s.medir(`faixas: ${faixas.map((f) => f.id).join(', ')}`, faixas.length);
      if (faixas.map((f) => f.id).join() !== 'flamengo,fluminense')
        s.achado({ regra: 'faixas-do-rival', gravidade: 'atrapalha', tipo: 'erro', oQue: `Esperava flamengo,fluminense e vi: ${faixas.map((f) => f.id).join(',')}` });
      if (faixas.some((f) => f.marcada)) s.achado({ regra: 'faixa-marcada', gravidade: 'detalhe', tipo: 'regra do jogo.md', oQue: 'Alguma faixa já veio marcada.' });
    });
    await s.passo('toca no Fluminense', async () => {
      await s.tocar(p.locator('button[data-faixa-time="fluminense"]'));
      await p.getByRole('button', { name: '18 ou mais' }).waitFor({ state: 'visible', timeout: 15000 });
    });
    await s.passo('triagem: 18 ou mais', async () => {
      await s.tocar(p.getByRole('button', { name: '18 ou mais' }));
      await p.locator('canvas.campo-jogo').waitFor({ state: 'visible', timeout: 30000 });
    });
    await s.passo('o time guardado é o Fluminense', async () => {
      const prefs = await p.evaluate(() => JSON.parse(localStorage.getItem('gdt:prefs') || '{}'));
      s.medir(`gdt:prefs.time = ${prefs.time}`, 0);
      if (prefs.time !== 'fluminense') s.achado({ regra: 'time-errado', gravidade: 'bloqueia', tipo: 'erro', oQue: `gdt:prefs.time ficou "${prefs.time}" em vez de fluminense.` });
    });
  },
};
