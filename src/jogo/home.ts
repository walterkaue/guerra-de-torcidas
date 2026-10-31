// Regras da Home nova (docs/visual.md, seção 3): luz da arquibancada, para onde vai o "Jogar agora", linhas de
// estado dos cards e frases do giro da semana. Puro: sem DOM nem relógio.
// Só torcidas, nunca apelido. Textos neutros de gênero, com do/da e no/na pelo artigo do time.

import { type Artigo } from '../dados/times';
import { faseDoJogo, rodadaEmFoco, type JogoBasico } from './cravaTela';
import { PERGUNTAS, levar } from './prova';
import { formatarFecha, formatarVolta, linhaPenaltis } from './statusJogos';
import { NOMES_PISTAS, TENTATIVAS, type Pistas, type Tom } from './timeDoDia';

// ---------- luz da arquibancada ----------

export type Luz = 'dia' | 'entardecer' | 'noite';

/** Pelo horário de Brasília: dia das 6h às 17h, entardecer até as 19h e noite (refletores acesos) no resto. */
export function luzDoHorario(hora: number): Luz {
  if (hora >= 6 && hora < 17) return 'dia';
  if (hora >= 17 && hora < 19) return 'entardecer';
  return 'noite';
}

// ---------- "Jogar agora" ----------

export type JogoDaHome = 'penaltis' | 'prova' | 'dia' | 'crava';

/** O que a Home sabe do dia da pessoa. Null = não sabe (ainda carregando ou sem conexão): pula para o próximo. */
export interface SituacaoDoDia {
  /** Quanto falta para a rodada fechar, se a pessoa ainda não palpitou nela. */
  cravaFechaEm: number | null;
  /** Chutes já usados no Time do Dia, enquanto o dia dela não terminou. */
  chutesDoDia: number | null;
  /** Partidas que ainda contam hoje. */
  faltamPartidas: number | null;
}

const UM_DIA_MS = 24 * 3600_000;

/** Crava perto de fechar → Time do Dia → Lances (se ainda contam partidas) → Prova. */
export function proximoJogo(s: SituacaoDoDia): JogoDaHome {
  if (s.cravaFechaEm !== null && s.cravaFechaEm < UM_DIA_MS) return 'crava';
  if (s.chutesDoDia !== null) return 'dia';
  if (s.faltamPartidas !== null && s.faltamPartidas > 0) return 'penaltis';
  return 'prova';
}

/** A linha de baixo do botão: só informa o motivo, sem pressa nem cobrança. */
export function motivoDoJogo(jogo: JogoDaHome, s: SituacaoDoDia, teto: number): string {
  if (jogo === 'crava') return `Crava a Rodada: fecha em ${formatarFecha(s.cravaFechaEm ?? 0)}, sem palpite seu`;
  if (jogo === 'dia') {
    return s.chutesDoDia ? `Time do Dia: ${linhaChutes(s.chutesDoDia)}` : 'Time do Dia: ainda não jogou hoje';
  }
  if (jogo === 'penaltis') return `Lances do Jogo: ${linhaPenaltis(s.faltamPartidas, teto)}`;
  return 'Prova de Boleiro: 8 perguntas, para quando quiser';
}

/**
 * Quanto falta para a rodada em foco fechar (o próximo palpite trancar), só para quem não palpitou
 * em nenhum jogo dela. Null: rodada sem jogo aberto, ou já tem palpite, ou não sabemos os palpites.
 */
export function fechaSemPalpite(
  jogos: readonly JogoBasico[],
  palpites: ReadonlySet<string> | null,
  agora: Date,
): number | null {
  const rodada = rodadaEmFoco(jogos, agora);
  if (rodada === null || !palpites) return null;
  const daRodada = jogos.filter((j) => j.rodada === rodada);
  if (daRodada.some((j) => palpites.has(j.id))) return null;
  const abertos = daRodada.filter((j) => faseDoJogo(j, agora) === 'aberto');
  return abertos.length ? Math.min(...abertos.map((j) => Date.parse(j.inicio))) - agora.getTime() : null;
}

// ---------- estado dos cards ----------

/** O palpite que vai na tarja do card: o do próximo jogo aberto da rodada em foco que já tem placar. */
export function placarCravado<P>(
  jogos: readonly JogoBasico[],
  palpites: ReadonlyMap<string, P> | null,
  agora: Date,
): P | null {
  const rodada = rodadaEmFoco(jogos, agora);
  const abertos = jogos.filter((j) => j.rodada === rodada && faseDoJogo(j, agora) === 'aberto');
  const jogo = abertos.find((j) => palpites?.has(j.id));
  return jogo ? palpites!.get(jogo.id)! : null;
}

/** "2 de 6 chutes hoje". */
export const linhaChutes = (usados: number) => `${usados} de ${TENTATIVAS} chutes hoje`;

/** Linha do Time do Dia: chutes usados ou, quando terminou, o resultado e a volta. */
export function linhaDoDia(d: { chutes: number; fim: boolean; acertou: boolean }, msAteVoltar: number): string {
  if (!d.fim) return linhaChutes(d.chutes);
  const volta = `volta em ${formatarVolta(msAteVoltar)}`;
  return d.acertou ? `Acertou na ${d.chutes}ª · ${volta}` : `Não foi hoje · ${volta}`;
}

/** Degraus da escada que o recorde alcança: até onde os pontos garantidos cabem nele. */
export function degrausDoRecorde(recorde: number | null): number {
  if (recorde === null) return 0;
  let degraus = 0;
  while (degraus < PERGUNTAS && levar(degraus + 1) <= recorde) degraus++;
  return degraus;
}

/** Os tons de cada chute, na ordem da grade do Time do Dia, sem nome de clube (nada de spoiler). */
export const tonsDosChutes = (chutes: readonly { pistas: Pistas }[]): Tom[][] =>
  chutes.map((c) => NOMES_PISTAS.map((n) => c.pistas[n].tom));

// ---------- giro da semana ----------

export interface LinhaDoGiro {
  time_id: string;
  ativos: number;
  media30: number;
  posicao_campeao: number;
}

export interface TimeDoGiro {
  nome: string;
  artigo: Artigo;
}

const MAX_FRASES = 6;
const de = (t: TimeDoGiro) => `${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}`;
const colado = (t: TimeDoGiro, de: TimeDoGiro) => `${t.nome} ${t.artigo === 'a' ? 'colada' : 'colado'} ${de.artigo === 'a' ? 'na' : 'no'} ${de.nome}`;

/**
 * Frases de posição das torcidas, da mais interessante para a menos: quem mudou de posição desde a
 * última visita, o líder e as disputas entre vizinhos da tabela (a do seu time primeiro).
 */
export function frasesDoGiro(
  linhas: readonly LinhaDoGiro[],
  antes: Readonly<Record<string, number>>,
  timeDe: (id: string) => TimeDoGiro | undefined,
  meuTime?: string,
): string[] {
  const jogando = linhas
    .filter((l) => l.ativos > 0 && timeDe(l.time_id))
    .sort((a, b) => a.posicao_campeao - b.posicao_campeao);
  const nome = (l: LinhaDoGiro) => timeDe(l.time_id)!;

  const mudaram = jogando.flatMap((l) => {
    const anterior = antes[l.time_id];
    if (anterior === undefined || anterior === l.posicao_campeao) return [];
    const subiu = anterior > l.posicao_campeao;
    return [`${nome(l).nome} ${subiu ? 'subiu' : 'caiu'} pro ${l.posicao_campeao}º`];
  });

  const lider = jogando.length ? [`${nome(jogando[0]).nome} lidera a semana`] : [];

  const vizinhos = jogando.slice(1).map((l, i) => {
    const acima = jogando[i];
    const dif = Math.round(acima.media30 - l.media30);
    const meu = l.time_id === meuTime || acima.time_id === meuTime;
    const texto = dif > 0 ? `${nome(l).nome} a ${dif} ${de(nome(acima))}` : colado(nome(l), nome(acima));
    return { texto, meu, dif };
  });
  vizinhos.sort((a, b) => Number(b.meu) - Number(a.meu) || a.dif - b.dif);

  return [...mudaram, ...lider, ...vizinhos.map((v) => v.texto)].slice(0, MAX_FRASES);
}
