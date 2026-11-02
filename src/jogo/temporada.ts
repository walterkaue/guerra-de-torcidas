// Temporada das torcidas (docs/jogo.md, seção 5, "A temporada"): série do mês e classificação mensal.
// Módulo puro: sem DOM, banco nem relógio. Datas entram como parâmetro. Meses são "AAAA-MM-01".
// Os pontos e a ordem vêm do servidor (view classificacao_temporada); aqui só ficam a leitura e os textos.

import { semanaConfirmadaEm } from './crava';
import { AVISO_PRE_TEMPORADA } from './posicao';

export type Serie = 'unica' | 'a' | 'b';
export type Destino = 'a' | 'b';

export interface Temporada {
  mes: string;
  pre_temporada: boolean;
  fechada_em: string | null;
  campeao_estreia_id: string | null;
}

export interface LinhaTemporada {
  time_id: string;
  serie: Serie;
  posicao: number;
  pontos: number;
  vitorias: number;
  /** Nula enquanto nenhuma semana do mês fechou para a torcida. */
  ultima_posicao: number | null;
  /** Só depois de fechar o mês. */
  posicao_final: number | null;
  destino: Destino | null;
}

export interface TimeDaFrase {
  nome: string;
  artigo: 'o' | 'a';
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIA_MS = 24 * 3600_000;

const partes = (mes: string) => ({ ano: Number(mes.slice(0, 4)), m: Number(mes.slice(5, 7)) - 1 });
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pontos = (n: number) => `${n} ${n === 1 ? 'ponto' : 'pontos'}`;

/** "novembro" (minúsculo, sem ano). */
export function mesPorExtenso(mes: string): string {
  return MESES[partes(mes).m];
}

/** "Novembro de 2026". */
export function nomeDoMes(mes: string): string {
  return `${maiuscula(mesPorExtenso(mes))} de ${partes(mes).ano}`;
}

/** Primeiro dia do mês seguinte. */
export function mesSeguinte(mes: string): string {
  const { ano, m } = partes(mes);
  return iso(Date.UTC(ano, m + 1, 1));
}

/** Segundas-feiras do mês: a semana é do mês da sua segunda. */
export function segundasDoMes(mes: string): string[] {
  const { ano, m } = partes(mes);
  const fim = Date.UTC(ano, m + 1, 1);
  const lista: string[] = [];
  for (let t = Date.UTC(ano, m, 1); t < fim; t += DIA_MS) {
    if (new Date(t).getUTCDay() === 1) lista.push(iso(t));
  }
  return lista;
}

/** Quando a primeira semana do mês trava: a segunda seguinte à primeira segunda, 12h de Brasília. */
export function primeiraTrava(mes: string): Date {
  return semanaConfirmadaEm(segundasDoMes(mes)[0]);
}

/** "2 de 5 semanas fechadas". */
export function textoContagem(fechadas: number, total: number): string {
  if (total === 1) return `${fechadas} de 1 semana fechada`;
  return `${fechadas} de ${total} semanas fechadas`;
}

/** Nenhuma semana do mês fechou para ninguém. */
export function semSemanaFechada(linhas: LinhaTemporada[]): boolean {
  return linhas.every((l) => l.ultima_posicao === null);
}

/** Mensagem do mês sem semana fechada; `agora` entra como parâmetro. */
export function mensagemSemSemana(mes: string, agora: Date): string {
  const trava = primeiraTrava(mes);
  if (agora.getTime() >= trava.getTime()) return 'A primeira semana do mês ainda está fechando.';
  const segunda = segundasDoMes(mes)[0];
  const dia = iso(Date.parse(`${segunda}T00:00:00Z`) + 7 * DIA_MS);
  return `Nenhuma semana fechou ainda. A primeira fecha na segunda, ${Number(dia.slice(8, 10))}/${Number(dia.slice(5, 7))}, às 12h.`;
}

/**
 * Ordem da tabela. Mês fechado: posição final. Sem semana fechada: ordem alfabética (`nomeDe`).
 * Senão: a posição que o servidor calculou.
 */
export function ordenarLinhas(
  linhas: LinhaTemporada[],
  op: { fechado: boolean; semSemana: boolean; nomeDe?: (timeId: string) => string },
): LinhaTemporada[] {
  const copia = [...linhas];
  if (op.fechado) {
    return copia.sort((a, b) => (a.posicao_final ?? 999) - (b.posicao_final ?? 999) || a.posicao - b.posicao);
  }
  if (op.semSemana) {
    const nome = op.nomeDe ?? ((id: string) => id);
    return copia.sort((a, b) => nome(a.time_id).localeCompare(nome(b.time_id), 'pt-BR'));
  }
  return copia.sort((a, b) => a.posicao - b.posicao);
}

/** Faixa da linha: Série A, 9º e 10º caem; Série B, 1º e 2º sobem. Série única não tem faixa. */
export function zonaDaLinha(serie: Serie, posicao: number): 'acesso' | 'queda' | null {
  if (serie === 'a' && posicao >= 9) return 'queda';
  if (serie === 'b' && posicao <= 2) return 'acesso';
  return null;
}

export const LEGENDA_SERIE: Record<'a' | 'b', string> = { a: 'Os 2 últimos caem', b: 'Os 2 primeiros sobem' };

export function nomeDaSerie(serie: Serie): string {
  return serie === 'unica' ? 'série única' : serie === 'a' ? 'Série A' : 'Série B';
}

/** Selo da linha no mês fechado. */
export function seloDoDestino(serie: Serie, destino: Destino | null): string | null {
  if (!destino) return null;
  if (serie === 'unica') return destino === 'a' ? 'Série A' : 'Série B';
  if (serie === 'a') return destino === 'b' ? 'Caiu' : 'Fica';
  return destino === 'a' ? 'Subiu' : 'Fica';
}

/** Divisor da série única, depois do 10º. */
export function textoDivisor(mes: string): string {
  return `Daqui pra cima, Série A em ${mesPorExtenso(mesSeguinte(mes))}`;
}

export function textoVitorias(n: number): string | null {
  return n > 0 ? `${n} ${n === 1 ? 'vitória' : 'vitórias'} de semana` : null;
}

export interface EntradaDaFrase {
  time: TimeDaFrase | null;
  /** Meu time é "Outro time". */
  outro: boolean;
  /** Linha do meu time na tabela do mês (ausente se não estiver nela). */
  linha: LinhaTemporada | undefined;
  /** A série do meu time, qualquer ordem. */
  daSerie: LinhaTemporada[];
  mes: string;
  fechada: boolean;
}

/** A linha "do meu time" acima da tabela. Nula quando não há o que dizer. */
export function fraseDoMeuTime(e: EntradaDaFrase): string | null {
  if (e.outro) return 'Quem joga por Outro time fica fora das divisões.';
  if (!e.time || !e.linha) return null;
  const { linha } = e;
  const quem = `${maiuscula(e.time.artigo)} ${e.time.nome}`;
  const serie = nomeDaSerie(linha.serie);

  if (e.fechada) {
    const p = linha.posicao_final;
    if (p === null) return null;
    const fim = `${quem} terminou em ${p}º`;
    if (linha.serie === 'unica') return `${fim} e vai pra Série ${linha.destino === 'a' ? 'A' : 'B'}.`;
    if (linha.serie === 'a') return linha.destino === 'b' ? `${fim} e caiu pra Série B.` : `${fim} e fica na Série A.`;
    return linha.destino === 'a' ? `${fim} e subiu pra Série A.` : `${fim} e fica na Série B.`;
  }

  if (semSemanaFechada(e.daSerie)) return `${quem} está na ${serie} de ${mesPorExtenso(e.mes)}.`;

  const ordem = [...e.daSerie].sort((a, b) => a.posicao - b.posicao);
  const p = linha.posicao;
  const zona = zonaDaLinha(linha.serie, p);

  if (p === 1) {
    const segundo = ordem[1];
    const acesso = zona === 'acesso' ? ', na zona de acesso' : '';
    if (!segundo) return `${quem} lidera a ${serie}${acesso}.`;
    if (segundo.pontos === linha.pontos) return `${quem} lidera a ${serie} no desempate${acesso}.`;
    return `${quem} lidera a ${serie}, ${pontos(linha.pontos - segundo.pontos)} à frente do 2º${acesso}.`;
  }

  const lider = ordem[0];
  const atrasLider = lider ? lider.pontos - linha.pontos : 0;
  const atras = (n: number, ref: string, sufixo = '') =>
    n > 0 ? `${pontos(n)} atrás ${ref}${sufixo}` : `com os mesmos pontos ${ref}${sufixo}`;

  if (zona === 'acesso') return `${quem} está em ${p}º na ${serie}, na zona de acesso.`;
  if (zona === 'queda') {
    const acima = ordem[p - 2];
    const dif = acima ? acima.pontos - linha.pontos : 0;
    return `${quem} está em ${p}º na ${serie}, na zona de queda, ${atras(dif, `do ${p - 1}º`)}.`;
  }
  if (linha.serie === 'unica') {
    if (p <= 10) return `${quem} está em ${p}º: por enquanto vai pra Série A em ${mesPorExtenso(mesSeguinte(e.mes))}.`;
    const decimo = ordem[9];
    const dif = decimo ? decimo.pontos - linha.pontos : 0;
    return `${quem} está em ${p}º, ${atras(dif, 'do 10º', ', a última vaga da Série A')}.`;
  }
  return `${quem} está em ${p}º na ${serie}, ${atras(atrasLider, 'do líder')}.`;
}

export interface TextosDoSelo {
  cabecalho: string;
  /** Selo da pré-temporada (aviso + sem troféu). */
  pre: string | null;
  /** Linha do troféu. */
  trofeu: string | null;
}

/** Cabeçalho do mês, selo da pré-temporada e linha do troféu. */
export function textoDoSelo(t: Temporada, modo: 'unica' | 'ab', campeao: TimeDaFrase | null): TextosDoSelo {
  const cabecalho = `${nomeDoMes(t.mes)} · ${modo === 'unica' ? 'Série única' : 'Séries A e B'}`;
  if (t.pre_temporada) return { cabecalho, pre: `${AVISO_PRE_TEMPORADA} Teste das divisões: sem troféu.`, trofeu: null };
  if (t.fechada_em && t.campeao_estreia_id && campeao) {
    return { cabecalho, pre: null, trofeu: `Campeão da estreia: ${campeao.artigo} ${campeao.nome}.` };
  }
  return {
    cabecalho,
    pre: null,
    trofeu: modo === 'unica' ? 'O 1º leva o troféu Campeão da estreia.' : 'O campeão da Série A é o campeão da temporada.',
  };
}

/** Rodapé que explica a pontuação. */
export function textoExplica(modo: 'unica' | 'ab'): string {
  const base = 'Cada semana travada vale pontos pela posição';
  const fim =
    'Torcida sem ninguém jogando na semana não pontua. Empate no mês: mais vitórias de semana, depois a melhor última semana.';
  return modo === 'unica'
    ? `${base} entre os 20: 25, 20, 17, 15, 14 e depois um a menos até o 18º. ${fim}`
    : `${base} na série: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1. ${fim}`;
}
