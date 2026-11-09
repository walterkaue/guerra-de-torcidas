// Só em desenvolvimento (npm run dev): ?resultadoFalso=<cenário> abre o resultado de verdade (telas/resultado.ts e
// telas/provaResultado.ts) com dados de mentira, sem jogar a partida. Para conferir o resultado em duas camadas
// (B02 + C02) e tirar os prints. Junte com &penaltiFalso para o rumo às medalhas e &pecaNova para a peça nova.
//   pen-vitoria     vitória nos pênaltis, desafio gerado
//   pen-derrota     derrota na disputa contra o Junior Barranquilla (nome longo, B05), desafio gerado
//   pen-recebido    desafio recebido e vencido (sem apelido: "Rival do dia"), desafio gerado
//   pen-sem-rede    partida sem rede: não vale, sem código (volta o "Mandar no grupo")
//   pen-recorde     vitória com recorde novo
//   prova-desafio   Prova com desafio gerado
//   prova-recebido  Prova de um desafio recebido e perdido (Jogo de volta)
//   lances-vitoria  Lances com 2 gols, prata nova e desafio gerado (junte &lancesFalsos)
//   lances-recebido desafio recebido e vencido nos Lances: sem código, volta o "Mandar no grupo" com o card
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import { irPara, type DadosResultado } from '../app';
import { prefs } from '../estado';
import { DISPUTAS } from '../dados/disputas';
import { LANCES } from '../dados/lances';
import type { ResultadoLance } from '../jogo/lances';
import type { FechamentoLances } from '../jogo/lancesPartida';
import type { ResultadoCobranca, ResultadoDefesa, ResultadoPartida } from '../jogo/penaltis';
import type { FimProva } from '../servidor/api';

const cobranca = (desfecho: ResultadoCobranca['desfecho'], extra: Partial<ResultadoCobranca> = {}): ResultadoCobranca => ({
  desfecho,
  x: 0.4,
  y: 0.3,
  zonaBola: 2,
  zonaGoleiro: 0,
  angulo: false,
  raspouTrave: false,
  cavadinha: false,
  fraca: false,
  goleiroLeu: false,
  pontos: desfecho === 'gol' ? 10 : 0,
  ...extra,
});
const defesa = (desfecho: ResultadoDefesa['desfecho']): ResultadoDefesa => ({
  desfecho,
  alvo: 1,
  zonaGoleiro: 1,
  contraGravada: false,
  pontos: desfecho === 'defesa' ? 10 : 0,
});

function partida(venceu: boolean): ResultadoPartida {
  const cobrancas = venceu
    ? [cobranca('gol', { angulo: true }), cobranca('gol'), cobranca('defesa'), cobranca('gol', { cavadinha: true }), cobranca('gol')]
    : [cobranca('gol'), cobranca('defesa'), cobranca('gol'), cobranca('fora'), cobranca('gol')];
  const defesas = venceu
    ? [defesa('gol'), defesa('defesa'), defesa('gol'), defesa('gol'), defesa('defesa')]
    : [defesa('gol'), defesa('gol'), defesa('defesa'), defesa('gol'), defesa('gol')];
  const golsJogador = cobrancas.filter((c) => c.desfecho === 'gol').length;
  const golsMaquina = defesas.filter((d) => d.desfecho === 'gol').length;
  const pontos = venceu
    ? { gols: 40, angulos: 4, cavadinhas: 6, defesas: 20, vitoria: 15, cincoDeCinco: 0, total: 85 }
    : { gols: 30, angulos: 0, cavadinhas: 0, defesas: 10, vitoria: 0, cincoDeCinco: 0, total: 40 };
  return { cobrancas, defesas, golsJogador, golsMaquina, rodadasExtras: 0, cincoCobrancas: false, cincoDefesas: false, venceu, decisao: 'tempo_normal', pontos };
}

function penaltis(cenario: string): DadosResultado {
  const timeId = prefs.get().time ?? 'athletico-pr';
  const venceu = cenario !== 'pen-derrota';
  const r = partida(venceu);
  const disputa = cenario === 'pen-derrota' ? DISPUTAS.find((d) => d.id === 'athletico-pr-2018-sul-americana') : undefined;
  const semRede = cenario === 'pen-sem-rede';
  const recebido = cenario === 'pen-recebido';
  return {
    timeId,
    semente: 1,
    dificuldade: 0.5,
    gestos: { cobrancas: [], defesas: [] },
    resultado: r,
    valendo: !semRede,
    aviso: semRede ? 'Caiu a conexão: essa partida não vale pontos.\nCódigo: sem_rede' : undefined,
    servidor: semRede
      ? undefined
      : {
          resultado: r,
          numeroNarrador: null,
          semana: '2026-11-09',
          contaNoRanking: true,
          sobSuspeita: false,
          ranking: { antes: null, depois: null },
          desempenho: { posicao: 4, total: 31, recorde: cenario === 'pen-recorde' ? r.pontos.total : 120, novoRecorde: cenario === 'pen-recorde' },
          desafio: { codigo: 'falso123' },
          comparacao: recebido ? { desafiante: null, pontosDesafiante: 62, golsJogadorDesafiante: 3, golsMaquinaDesafiante: 2, venceu: true } : null,
          melhoresDoDia: [r.pontos.total, 72, 54],
          restantesHoje: 6,
        },
    desafio: recebido ? { id: 'abcdefgh', timeId: 'palmeiras', apelido: null, golsJogador: 3, golsMaquina: 2, pontos: 62 } : undefined,
    disputa,
    frasesFinais: venceu ? ['É CAVADINHAAAA! Que categoria, que deboche!', 'Pegou! O goleiro da máquina tava com o almoço pago!'] : ['Dessa vez não deu. Bola pro centro e jogo de volta!'],
  } as DadosResultado;
}

function prova(cenario: string) {
  const recebido = cenario === 'prova-recebido';
  const fim: FimProva = {
    fim: 'errou',
    pontos: { acertos: 6, erros: 3, base: 77, bonus: 0, total: 58 } as FimProva['pontos'],
    escada: '🟩🟩🟥🟩🟩🟩🟥🟩🟥',
    resumo: '6 de 8 certas',
    passos: [],
    contaNoRanking: true,
    sobSuspeita: false,
    semana: '2026-11-09',
    desempenho: { posicao: 2, total: 18, recorde: 96, novoRecorde: false },
    desafio: { codigo: 'teste123' },
    comparacao: recebido ? { desafiante: null, pontosDesafiante: 74, escadaDesafiante: '🟩🟩🟩🟩🟥🟩🟩🟥', resumoDesafiante: '6 de 8 certas', venceu: false } : null,
  };
  return { timeId: prefs.get().time ?? 'gremio', fim, desafio: recebido ? ({ id: 'abcdefgh' } as never) : null, frases: ['Sabe muito! A escada tá subindo!'] };
}

/** Fonte do sistema grande, aproximada como nas simulações (scripts/simulacoes/nucleo/aparelhos.mjs): cada elemento cresce uma vez. */
function crescerFonte(f: number): void {
  const crescer = () => {
    for (const el of document.querySelectorAll<HTMLElement>('body *:not([data-sim-fonte])')) {
      if (el.closest('svg') || /^(CANVAS|SCRIPT|STYLE|svg)$/.test(el.tagName)) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) continue;
      let orig = px;
      const pai = el.parentElement;
      if (pai?.dataset.simFonte && Math.abs(px - parseFloat(getComputedStyle(pai).fontSize)) < 0.05) orig = parseFloat(pai.dataset.simFonte);
      el.dataset.simFonte = String(orig);
      el.style.setProperty('font-size', `${(orig * f).toFixed(2)}px`, 'important');
    }
  };
  const crescerEAvisar = () => {
    crescer();
    // A dobra se ajusta ao tamanho novo da letra (ajustarDobra ouve o resize).
    dispatchEvent(new Event('resize'));
  };
  crescerEAvisar();
  new MutationObserver(crescerEAvisar).observe(document.body, { childList: true, subtree: true });
}

/** Onde cada bloco da dobra termina, e a dobra (altura da tela menos o rodapé fixo). */
function medirDobra() {
  const rodape = document.querySelector('.res-acoes');
  const fim = (s: string) => {
    const el = document.querySelector(s);
    return el ? Math.round(el.getBoundingClientRect().bottom + scrollY) : null;
  };
  return {
    dobra: rodape ? Math.round(innerHeight - rodape.getBoundingClientRect().height) : null,
    destaque: fim('.res-destaque'),
    tipo: document.querySelector<HTMLElement>('[data-destaque]')?.dataset.tipo ?? null,
    balao: fim('.res-msg'),
    botao: fim('.botao-desafiar') ?? fim('.botao-zap'),
    larguraDaPagina: document.documentElement.scrollWidth,
    aperto: document.querySelector<HTMLElement>('.res-padrao')?.dataset.aperto ?? '0',
  };
}

const tentativa = (desfecho: ResultadoLance['desfecho'], pontos: number, recriou = false): ResultadoLance => ({
  desfecho,
  x: 0.6,
  y: 0.7,
  zonaBola: 5,
  cavadinha: false,
  angulo: desfecho === 'gol',
  raspouTrave: false,
  recriou,
  goleiroX: -0.4,
  tFim: 1,
  pontos,
});

/**
 * Lances: abre a tela dos Lances e chama o resultado de verdade (o `window.__lancesResultado` que ela deixa em dev).
 * `lances-vitoria`: 2 gols em 3, prata nova e desafio gerado. `lances-recebido`: desafio recebido e vencido, sem
 * código (volta o "Mandar no grupo" com o card).
 */
function lances(cenario: string): void {
  const recebido = cenario === 'lances-recebido';
  const lance = LANCES.find((l) => l.id === 'palmeiras-2022-falta-da-recopa') ?? LANCES[0];
  const resultados = [tentativa('gol', 42, true), tentativa('barreira', 0), tentativa('gol', 42)];
  const pontos = 84;
  const fim = {
    resultado: { lances: [], gols: 2, recriados: 1, pontos },
    semana: '2026-11-09',
    contaNoRanking: true,
    sobSuspeita: false,
    melhorDoDia: pontos,
    ranking: { antes: null, depois: null },
    confirmadaEm: new Date().toISOString(),
    desempenho: { posicao: 3, total: 27, recorde: 130, novo_recorde: false },
    medalhas: recebido ? [] : [{ lanceId: lance.id, medalha: 'prata' as const }],
    restantesHoje: 7,
    melhoresDoDia: [pontos, 72, 54],
    desafio: recebido ? null : { codigo: 'abcd2345' },
    comparacao: recebido ? { desafiante: null, pontosDesafiante: 62, venceu: true } : null,
  } satisfies FechamentoLances;
  irPara({ tela: 'lances' });
  const chamar = (tentativas: number) => {
    const r = (window as unknown as { __lancesResultado?: (...a: unknown[]) => void }).__lancesResultado;
    if (r) r([lance, lance, lance], resultados, 'Na gaveta! Que falta, que categoria!', fim, null, recebido ? 'abcdefgh' : null);
    else if (tentativas > 0) setTimeout(() => chamar(tentativas - 1), 100);
  };
  chamar(50);
}

export function abrirResultadoFalso(cenario: string | null): void {
  const c = cenario ?? 'pen-vitoria';
  if (c.startsWith('prova')) irPara({ tela: 'provaResultado', dados: prova(c) });
  else if (c.startsWith('lances')) lances(c);
  else irPara({ tela: 'resultado', dados: penaltis(c) });
  const fonte = Number(new URLSearchParams(location.search).get('fonte'));
  if (fonte > 100) crescerFonte(fonte / 100);
  (window as unknown as { __medirDobra: typeof medirDobra }).__medirDobra = medirDobra;
}
