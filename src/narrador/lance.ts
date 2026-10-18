// Qual situação do narrador cada lance gera. Puro, sem sorteio.

import type { ResultadoCobranca, ResultadoDefesa, ResultadoPartida } from '../jogo/penaltis';
import type { EventoNarrador } from './frases';

/** Prioridade num mesmo lance: cavadinha > trave e gol > ângulo > gol. */
export function eventoDaCobranca(r: ResultadoCobranca): EventoNarrador {
  if (r.cavadinha) return r.desfecho === 'gol' ? 'cavadinha' : 'cavadinha_falhou';
  switch (r.desfecho) {
    case 'gol':
      return r.raspouTrave ? 'trave_gol' : r.angulo ? 'gol_angulo' : 'gol';
    case 'defesa':
      return 'goleiro_pegou';
    case 'trave':
      return 'trave';
    case 'fora':
      return r.y > 1 ? 'fora_cima' : 'fora_lado';
  }
}

/** O batedor da máquina errar ainda não tem situação no banco: devolve null. */
export function eventoDaDefesa(r: ResultadoDefesa): EventoNarrador | null {
  if (r.desfecho === 'defesa') return 'defesa';
  if (r.desfecho === 'gol') return 'sofreu_gol';
  return null;
}

/** Tela final: 5 de 5 primeiro, depois o resultado, no máximo 2 frases. */
export function eventosDoFim(r: ResultadoPartida): EventoNarrador[] {
  const lista: EventoNarrador[] = [];
  if (r.cincoCobrancas) lista.push('cinco_cobrancas');
  if (r.cincoDefesas) lista.push('cinco_defesas');
  lista.push(r.venceu ? 'vitoria' : r.empate ? 'empate' : 'derrota');
  return lista.slice(0, 2);
}
