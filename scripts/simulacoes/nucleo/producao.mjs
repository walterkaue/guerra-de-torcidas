// Rodada curta no site no ar (torcida.kauewalter.com.br): só carregamento e desempenho, com o Zé e a Duda.
// A guarda (rede.mjs, modo "producao") deixa passar só GET; POST, PATCH, DELETE, /auth/, /rpc/, /functions/ e o
// Turnstile são abortados. Nenhuma jornada daqui escolhe time na tela nem começa partida. A volta de quem já tem
// time é imitada só no localStorage do navegador do simulador, para ver o jogo cair no "sem valer pontos" sem
// login (o /auth/ é abortado, então nenhuma conta nasce).

const LANCE_CORINTHIANS = 'corinthians-1995-falta-da-copa';

async function primeiraVisita(s, caminho, rotulo, esperarPor) {
  const ms = await s.abrir(caminho, { esperarPor, limiteMs: 20000, rotulo });
  await s.esperar(1500);
  const pintura = await s.page
    .evaluate(
      () =>
        new Promise((ok) => {
          const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
          let lcp = null;
          try {
            new PerformanceObserver((l) => {
              const e = l.getEntries();
              if (e.length) lcp = e[e.length - 1].startTime;
            }).observe({ type: 'largest-contentful-paint', buffered: true });
          } catch {
            /* WebKit antigo */
          }
          const longas = (window.__simLongas || []).map((e) => e.dur);
          setTimeout(() => ok({ fcp, lcp, longas: longas.length, maiorLonga: longas.length ? Math.round(Math.max(...longas)) : 0, somaLongas: Math.round(longas.reduce((a, b) => a + b, 0)) }), 300);
        }),
    )
    .catch(() => ({}));
  const kb = (n) => Math.round((n ?? 0) / 102.4) / 10;
  const b = s.bytes ?? {};
  s.medir(`${rotulo} (pintura)`, Math.round(pintura.fcp ?? -1), null, false, {
    fcpMs: pintura.fcp && Math.round(pintura.fcp),
    lcpMs: pintura.lcp && Math.round(pintura.lcp),
    tarefasLongas: pintura.longas,
    maiorTarefaMs: pintura.maiorLonga,
    somaTarefasMs: pintura.somaLongas,
    jsKB: kb(b.script),
    cssKB: kb(b.stylesheet),
    fontesKB: kb(b.font),
    imagensKB: kb(b.image),
    fetchKB: kb((b.fetch ?? 0) + (b.xhr ?? 0)),
    totalKB: kb(b.total),
  });
  return ms;
}

export const JORNADAS_PRODUCAO = {
  ze: {
    aparelhos: ['android-entrada'],
    async jornada(s) {
      await s.passo('primeira visita (aparelho novo)', () =>
        primeiraVisita(s, '/', 'Zé no ar: 1ª visita até a escolha do time', 'text=/qual [ée] a sua torcida/i'),
      );
      s.bytes = {};
      await s.passo('segunda visita (com cache)', () =>
        primeiraVisita(s, '/', 'Zé no ar: 2ª visita até a escolha do time', 'text=/qual [ée] a sua torcida/i'),
      );
      s.bytes = {};
      await s.passo('link de X1 sem servidor', () =>
        primeiraVisita(s, '/?d=simul4dr', 'Zé no ar: link de X1 até o 1º botão', 'button'),
      );
      // Volta de quem já tem time (só no localStorage deste navegador): Home sem login.
      await s.semear({ 'gdt:prefs': { time: 'flamengo', faixa: '18_mais', aquecimento: { visto: true } } });
      s.bytes = {};
      await s.passo('Home de quem já tem time, sem login', async () => {
        await primeiraVisita(s, '/', 'Zé no ar: Home de quem já tem time', 'text=/jogar agora/i');
        await s.esperar(4000);
      });
      await s.passo('Lances do Jogo sem login (sem começar partida)', async () => {
        const botao = s.page.getByRole('button', { name: /lances/i }).first();
        if (await botao.isVisible().catch(() => false)) await s.tocar(botao, { semMudancaOk: true });
        else await s.abrir('/#lances');
        await s.esperar(3000);
        const texto = await s.page.innerText('body').catch(() => '');
        if (!/sem valer|treino|sem conex|offline|não vale/i.test(texto))
          s.achado({ regra: 'sem-valer-pontos', gravidade: 'detalhe', tipo: 'erro', oQue: 'Sem login (servidor bloqueado), a tela dos Lances não diz que a partida não vai valer pontos.', sugestao: 'Avisar "sem valer pontos" antes do apito quando não houver sessão.', talvezSimulador: true });
      });
    },
  },
  duda: {
    aparelhos: ['iphone-se'],
    async jornada(s) {
      await s.passo('link do lance pelo Stories (aparelho novo)', () =>
        primeiraVisita(s, `/#lance/${LANCE_CORINTHIANS}`, 'Duda no ar: link do lance até a 1ª tela', 'button'),
      );
      await s.passo('Termos', async () => {
        await s.abrir('/#termos', { esperarPor: 'text=/termos/i', limiteMs: 15000, rotulo: 'Duda no ar: Termos' });
      });
    },
  },
};
