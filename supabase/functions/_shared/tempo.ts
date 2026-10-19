// Relógios do jogo, sempre em horário de Brasília e sempre pelo relógio do servidor.
// O Brasil não tem horário de verão desde 2019, então Brasília é UTC−3 fixo.

import { dificuldadePorDia } from './jogo/penaltis.ts';

const FUSO_MS = -3 * 60 * 60 * 1000;
/** Partida começada antes da virada conta no período antigo se terminar até 00h05. */
const TOLERANCIA_MS = 5 * 60 * 1000;

const emBrasilia = (d: Date) => new Date(d.getTime() + FUSO_MS);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** "AAAA-MM-DD" do dia em Brasília. */
export function diaBrasilia(d: Date): string {
  return iso(emBrasilia(d));
}

/** Segunda-feira (Brasília) da semana de `d`. */
export function semanaBrasilia(d: Date): string {
  const b = emBrasilia(d);
  const desdeSegunda = (b.getUTCDay() + 6) % 7;
  b.setUTCDate(b.getUTCDate() - desdeSegunda);
  return iso(b);
}

export function dificuldadeAgora(agora: Date): number {
  return dificuldadePorDia(emBrasilia(agora).getUTCDay());
}

/** Dia e semana em que a partida conta (com a tolerância de 00h05). */
export function periodoDaPartida(criada: Date, fechada: Date): { dia: string; semana: string } {
  const b = emBrasilia(fechada);
  const meiaNoite = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - FUSO_MS;
  const usarCriacao = fechada.getTime() - meiaNoite < TOLERANCIA_MS && criada.getTime() < meiaNoite;
  const base = usarCriacao ? criada : fechada;
  return { dia: diaBrasilia(base), semana: semanaBrasilia(base) };
}
