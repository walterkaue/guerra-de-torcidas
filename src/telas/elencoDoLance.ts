// O que os Lances (telas/lances.ts) e o telão do desafio (telas/telaoDoDesafio.ts) desenham do mesmo jeito: quem veste
// o quê em cada lance, onde o goleiro começa e quanto dura o voo da bola. Só desenho: nada aqui decide o lance.

import { coresDoAdversario, roupaDoBatedorGoleiro } from '../dados/coresDosLances';
import { SELECAO } from '../dados/adversarios';
import { timePorId } from '../dados/times';
import type { Lance } from '../jogo/lances';
import { bonecoDaPessoaEmCampo } from './bonecoEmCampoCena';
import { criarBoneco, sortearAparencia, uniformesDaPartida, type Boneco, type Uniforme } from './bonecos';

/** Velocidade do desenho da bola: metros por milissegundo (o voo de uma falta de 25 m leva ~1 s). */
export const METROS_POR_MS = 0.026;

/** Nome e cores do clube de um lance (id de times.ts ou "selecao"). */
export function clubeDoLance(clube: string): { nome: string; cores: readonly [string, string] } {
  if (clube === 'selecao') return SELECAO;
  return timePorId(clube) ?? SELECAO;
}

export const distanciaDoLance = (l: Lance): number => Math.hypot(l.bola.x, l.bola.z);

export interface OpcoesDoElenco {
  /** O batedor vestido com a roupa do lance; null (ou sem a opção) sorteia. Padrão: o boneco da pessoa em campo. */
  batedor?: (roupa: Uniforme) => Boneco | null;
  /** De onde saem os rostos. Padrão: Math.random; o telão passa um gerador fixo para o mesmo link mostrar sempre os mesmos. */
  sortear?: () => number;
}

/**
 * Batedor nas cores do clube do lance, barreira e goleiro nas do adversário de verdade. Com "Meu boneco em campo"
 * ligado, o batedor é o boneco da pessoa (na roupa do lance: a do clube, ou a de goleiro no Gol 100); goleiro e barreira
 * continuam sorteados. Só visual.
 */
export function elencoDoLance(l: Lance, o: OpcoesDoElenco = {}): { batedor: Boneco; goleiro: Boneco; barreira: Boneco[] } {
  const sortear = o.sortear ?? Math.random;
  const u = uniformesDaPartida(clubeDoLance(l.clube).cores, coresDoAdversario(l.adversario), 0);
  const roupaDoBatedor = roupaDoBatedorGoleiro(l.id) ?? u.jogador;
  const doBatedor = o.batedor ?? bonecoDaPessoaEmCampo;
  return {
    batedor: doBatedor(roupaDoBatedor) ?? criarBoneco(sortearAparencia(sortear), roupaDoBatedor, false),
    goleiro: criarBoneco(sortearAparencia(sortear), u.goleiroAdversario, true),
    barreira: Array.from({ length: 6 }, () => criarBoneco(sortearAparencia(sortear), u.adversario, true)),
  };
}

/** Goleiro antes do chute: no lado sorteado (falta) ou adiantado na reta da bola (cara a cara). `x0`: de -1 a 1. */
export function posicaoDoGoleiro(l: Lance, x0: number): { x: number; z: number } {
  const d = distanciaDoLance(l);
  const saida = l.goleiroSaida ?? 0.3;
  const gx = x0 * 3.66;
  return { x: gx + (l.bola.x - gx) * (saida / d), z: l.bola.z * (saida / d) };
}

/**
 * Quanto dura o voo da bola no desenho (ms): pelo tamanho do caminho, mais devagar na cavadinha e na bola fraca.
 * `fim`: onde a bola parou (o caminho em `tFim`); `forca`: a do gesto normalizado.
 */
export function duracaoDoVoo(bola: { x: number; z: number }, fim: { x: number; z: number }, cavadinha: boolean, forca: number): number {
  const dist = Math.hypot(fim.x - bola.x, fim.z - bola.z);
  return Math.max(450, (dist / METROS_POR_MS) * (cavadinha || forca < 32 ? 1.8 : 1));
}
