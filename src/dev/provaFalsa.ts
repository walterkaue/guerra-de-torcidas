// Só em desenvolvimento (npm run dev, com ?provaFalsa na URL): imita a função "prova" do servidor
// no próprio navegador, com perguntas de mentira, para conferir a tela sem banco nem login.
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import {
  AJUDAS,
  DEGRAU_DA_POSICAO,
  PERGUNTAS,
  SEGUNDOS,
  calcularPontos,
  escadaEmoji,
  fimDosPassos,
  levar,
  porcentagens,
  precisaDecidir,
  quantasTirar,
  resumoDaProva,
  type Ajuda,
  type Desfecho,
  type Passo,
} from '../jogo/prova';
import type { AjudaProva, FimProva, PerguntaProva, RespostaProva } from '../servidor/api';

const CLUBES = ['flamengo', 'geral', 'remo', 'geral', 'bahia', 'geral', 'geral', 'palmeiras'];
const espera = () => new Promise((ok) => setTimeout(ok, 250));

let estado: {
  atual: number;
  alternativas: { id: string; idx: number }[];
  passos: Passo[];
  ajudas: Set<Ajuda>;
  ajudaNaAtual: boolean;
  removidas: string[];
  trocas: number;
} | null = null;

function pergunta(): PerguntaProva {
  const e = estado!;
  const n = e.atual + 1;
  e.alternativas = [0, 1, 2, 3].sort(() => Math.random() - 0.5).map((idx) => ({ id: Math.random().toString(36).slice(2, 8), idx }));
  e.removidas = [];
  const textos = ['Certa', 'Errada um', 'Errada dois', 'Errada três com texto bem maior'];
  return {
    numero: n,
    degrau: DEGRAU_DA_POSICAO[e.atual],
    clube: CLUBES[e.atual],
    texto: `Pergunta de teste ${n}${e.trocas ? ' (trocada)' : ''}: em 2019, qual alternativa é a certa nesta tela de exemplo bem comprida?`,
    alternativas: e.alternativas.map((a) => ({ id: a.id, texto: textos[a.idx] })),
    segundos: SEGUNDOS,
    levar: levar(e.atual),
    ajudasUsadas: AJUDAS.filter((a) => e.ajudas.has(a)),
  };
}

function fim(): FimProva {
  const e = estado!;
  const f = fimDosPassos(e.passos) ?? 'parou';
  const pontos = calcularPontos(e.passos);
  return {
    fim: f,
    pontos,
    escada: escadaEmoji(e.passos, f),
    resumo: resumoDaProva(e.passos, f),
    passos: e.passos,
    contaNoRanking: true,
    sobSuspeita: false,
    semana: '2026-10-19',
    desempenho: { posicao: 3, total: 14, recorde: pontos.total, novoRecorde: pontos.total > 0 },
    desafio: { codigo: 'teste123' },
    comparacao: null,
  };
}

export async function novaProva() {
  await espera();
  estado = { atual: 0, alternativas: [], passos: [], ajudas: new Set(), ajudaNaAtual: false, removidas: [], trocas: 0 };
  return { partidaId: 'falsa', total: PERGUNTAS, desafio: null, pergunta: pergunta() };
}

export async function proximaPergunta(_id: string, decisao?: 'seguir' | 'parar') {
  await espera();
  if (precisaDecidir(estado!.atual) && decisao === 'parar') return { fim: fim() };
  return { pergunta: pergunta() };
}

export async function responderPergunta(_id: string, alternativa: string | null): Promise<RespostaProva> {
  await espera();
  const e = estado!;
  const alt = e.alternativas.find((a) => a.id === alternativa);
  const desfecho: Desfecho = !alt ? 'tempo' : alt.idx === 0 ? 'acertou' : 'errou';
  e.passos.push({ desfecho, ajuda: e.ajudaNaAtual });
  e.ajudaNaAtual = false;
  const acabou = desfecho !== 'acertou' || e.passos.length >= PERGUNTAS;
  if (!acabou) e.atual++;
  return {
    desfecho,
    certa: e.alternativas.find((a) => a.idx === 0)!.id,
    escolhida: alternativa,
    levar: levar(e.passos.filter((p) => p.desfecho === 'acertou').length),
    proxima: acabou ? null : { numero: e.atual + 1, decidir: precisaDecidir(e.atual) },
    fim: acabou ? fim() : null,
  };
}

export async function pedirAjuda(_id: string, tipo: Ajuda): Promise<AjudaProva> {
  await espera();
  const e = estado!;
  e.ajudas.add(tipo);
  e.ajudaNaAtual = true;
  const restantes = e.alternativas.filter((a) => !e.removidas.includes(a.id));
  if (tipo === 'troca') {
    e.trocas++;
    const p = pergunta();
    e.ajudaNaAtual = true;
    return { tipo, pergunta: p };
  }
  if (tipo === 'arquibancada') {
    const pct = porcentagens([52, 21, 17, 10]);
    return { tipo, porcentagens: Object.fromEntries(e.alternativas.map((a) => [a.id, pct[a.idx]])), respostas: 100 };
  }
  const n = quantasTirar(2, restantes.length);
  const tirar = restantes.filter((a) => a.idx !== 0).slice(0, n).map((a) => a.id);
  e.removidas.push(...tirar);
  return { tipo, removidas: tirar };
}
