// Condições das dicas da faixa de instrução (docs/jogo.md, seção 14.4). Puro: cada função olha só o
// resultado do lance (ou os últimos) e diz se a dica cabe. Quem mostra é telas/dicas.ts.

import type { Dicas, IdDica } from './dicas.ts';
import type { ResultadoLance } from './lances.ts';
import { coluna, trajetoria, type GestoCobranca, type ResultadoCobranca, type ResultadoDefesa } from './penaltis.ts';
import type { Pistas } from './timeDoDia.ts';

/** Metros que o goleiro adiantado precisa ter saído para a dica "Goleiro saiu do gol" (e para a cavadinha encobrir). */
export const SAIDA_QUE_CONTA = 3;

/** Dica do primeiro candidato cuja condição vale e que ainda pode aparecer (limite por aparelho e 1 por lance). */
export function primeiraDica(dicas: Dicas, candidatas: readonly (readonly [boolean, IdDica])[]): string | null {
  for (const [vale, id] of candidatas) {
    if (!vale) continue;
    const texto = dicas.pedir(id);
    if (texto) return texto;
  }
  return null;
}

// ---------- Pênaltis ----------

/** Chute que passou por cima do travessão por força demais (não a cavadinha, não a bola para o lado). */
export function chutePorCimaPorForca(r: ResultadoCobranca): boolean {
  return r.desfecho === 'fora' && !r.cavadinha && r.y > 1 && Math.abs(r.x) <= 1;
}

/** Bola fraca, rolando, que o goleiro pegou. */
export function chuteFracoPego(r: ResultadoCobranca): boolean {
  return r.desfecho === 'defesa' && r.fraca;
}

/** Cavadinha que o goleiro pegou: ele ficou parado no meio. */
export function cavadinhaPegaNoMeio(r: ResultadoCobranca): boolean {
  return r.cavadinha && r.desfecho === 'defesa' && coluna(r.zonaGoleiro) === 1;
}

const ehCavadinha = (g: GestoCobranca) => trajetoria(g, 0, 0).cavadinha;

/**
 * As últimas `n` cobranças saíram sem efeito (arraste reto). A cavadinha é reta de propósito: não conta e
 * quebra a sequência.
 */
export function semEfeitoSeguido(gestos: readonly GestoCobranca[], n = 3): boolean {
  if (gestos.length < n) return false;
  return gestos.slice(-n).every((g) => g.efeito === 0 && !ehCavadinha(g));
}

/** Defesa em que o jogador não tocou no gol a tempo. */
export function defesaSemToque(r: ResultadoDefesa): boolean {
  return r.zonaGoleiro < 0;
}

/** O gol saiu porque o jogador pulou na coluna certa, mas na altura errada. */
export function ladoCertoAlturaErrada(r: ResultadoDefesa): boolean {
  return r.desfecho === 'gol' && r.zonaGoleiro >= 0 && r.zonaGoleiro !== r.alvo && coluna(r.zonaGoleiro) === coluna(r.alvo);
}

// ---------- Faltas e cara a cara ----------

/** Cena do lance que importa para as dicas. */
export interface CenaDaDica {
  goleiroSaida?: number;
}

/** O goleiro está adiantado a ponto de a cavadinha encobrir. */
export function goleiroSaiu(l: CenaDaDica): boolean {
  return (l.goleiroSaida ?? 0) >= SAIDA_QUE_CONTA;
}

/** Cavadinha defendida por um goleiro que ficou na linha, onde ela não passa por cima. */
export function cavadinhaPegaSemSair(r: ResultadoLance, l: CenaDaDica): boolean {
  return r.cavadinha && r.desfecho === 'defesa' && !goleiroSaiu(l);
}

/** O goleiro pegou um chute no meio do gol (fora a cavadinha, que tem dica própria). */
export function goleiroPegouNoMeio(r: ResultadoLance): boolean {
  return r.desfecho === 'defesa' && !r.cavadinha && coluna(r.zonaBola) === 1;
}

/** Gol que não foi na zona do gol de verdade: a dica mostra a zona e o +6. */
export function golSemRecriar(r: ResultadoLance): boolean {
  return r.desfecho === 'gol' && !r.recriou;
}

/** Bola parada na barreira. */
export function bolaNaBarreira(r: ResultadoLance): boolean {
  return r.desfecho === 'barreira';
}

/**
 * Cantos da zona (0 a 5, como nos pênaltis) no plano do gol, em metros: x de -meiaLargura a meiaLargura e
 * y do chão ao travessão. Serve para pintar a zona do gol de verdade.
 */
export function cantosDaZona(zona: number, meiaLargura = 3.66, altura = 2.44): { x0: number; x1: number; y0: number; y1: number } {
  const col = zona % 3;
  const lin = zona >= 3 ? 1 : 0;
  const xs = [-1, -1 / 3, 1 / 3, 1];
  return { x0: xs[col] * meiaLargura, x1: xs[col + 1] * meiaLargura, y0: lin * 0.5 * altura, y1: (lin ? 1 : 0.5) * altura };
}

// ---------- Time do Dia ----------

type Linha = { pistas: Pistas };

/** O 3º chute errado e nenhuma pista verde nos três. */
export function terceiroChuteSemVerde(tentativas: readonly Linha[], terminou = false): boolean {
  if (terminou || tentativas.length !== 3) return false;
  return tentativas.every((t) => Object.values(t.pistas).every((p) => p.tom !== 'certo'));
}

/** Há seta (↑ ou ↓) na linha de pistas. */
export function temSeta(t: Linha): boolean {
  return Object.values(t.pistas).some((p) => p.seta);
}

/** A pista de cores veio em amarelo (uma das duas cores bate). */
export function coresEmAmarelo(t: Linha): boolean {
  return t.pistas.cores.tom === 'perto';
}
