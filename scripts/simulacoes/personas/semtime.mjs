// Aparelho sem time escolhido (HOME2, Rota B). O primeiro acesso cai na escolha do time, sem voltar, então a Home sem
// time só se alcança por outra tela: abre o índice "Casa dos clubes" (#casa, que não exige time) e toca no voltar,
// que leva à Home. Confere a arquibancada de 150 px, sem barra do time, e a tarja que pergunta.
import { medidasDaHome, conferirDobraDaHome } from './comum/home.mjs';

export default {
  id: 'semtime',
  ordem: 11,
  nome: 'Sem time',
  descricao: 'Aparelho que ainda não escolheu o time, 360×740, 18+. Chega à Home pela Casa dos clubes e confere a arquibancada de 150 px sem barra.',
  time: 'nenhum',
  menor: false,
  toque: { erroPx: 4, demoraMs: 120 },
  gesto: { escalaForca: 1, duracaoMs: 200, tremorPx: 2 },
  aparelhos: ['android-360'],
  async jornada(s) {
    const p = s.page;
    await s.semear({ 'gdt:prefs': { faixa: '18_mais', termosVistos: '05/11/2026', aquecimento: { visto: true, aquecido: true } } });

    await s.passo('abre a Casa dos clubes (a Home sozinha mandaria para a escolha do time)', async () => {
      await s.abrir('/?homeFalsa#casa', { esperarPor: '.voltar', limiteMs: 15000, rotulo: 'Casa dos clubes até o voltar' });
    });
    await s.passo('toca em voltar: Home sem time', async () => {
      await s.tocar(p.locator('.voltar'));
      await p.locator('[data-acao="jogar-agora"]').waitFor({ state: 'visible', timeout: 15000 });
      await s.esperar(2500);
    }, { paginaInteira: true, principalNaDobra: true });

    await s.passo('confere: arquibancada de 150 px, sem barra, tarja que pergunta', async () => {
      const m = await medidasDaHome(p);
      const tarja = await p.evaluate(() => (document.querySelector('.arquibancada .bloco-time-faixa')?.textContent ?? '').replace(/\s+/g, ' ').trim());
      if (!m.arquibancada || Math.abs(m.arquibancada.alt - 150) > 2)
        s.achado({ regra: 'arquibancada-sem-time-nao-150', gravidade: 'atrapalha', tipo: 'layout', oQue: `Sem time, a arquibancada devia ter 150 px e tem ${m.arquibancada?.alt ?? 'nenhuma'} px.` });
      if (m.barra || (await p.locator('[data-barra]').count()))
        s.achado({ regra: 'barra-sem-time', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: 'Sem time escolhido não devia haver [data-barra] na Home.' });
      if (!/Qual é a sua torcida\?/.test(tarja))
        s.achado({ regra: 'tarja-sem-time', gravidade: 'atrapalha', tipo: 'regra do jogo.md', oQue: `Sem time, a tarja devia perguntar "Qual é a sua torcida?" e diz: "${tarja.slice(0, 80)}".` });
      s.medir(`arquibancada sem time: ${m.arquibancada?.alt} px; barra: ${m.barra ? 'sim' : 'não'}; tarja: "${tarja.slice(0, 50)}"`, m.arquibancada?.alt ?? 0);
      await conferirDobraDaHome(s, 'Home sem time');
    });
  },
};
