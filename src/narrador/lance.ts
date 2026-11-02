// Qual situação do narrador cada lance gera. Puro, sem sorteio.

import type { ResultadoLance } from '../jogo/lances';
import { coluna, linha, type ResultadoCobranca, type ResultadoDefesa, type ResultadoPartida } from '../jogo/penaltis';
import { ERROS_QUE_ENCERRAM, type Desfecho } from '../jogo/prova';
import type { Etiqueta } from './escolher';
import type { EventoNarrador } from './frases';

/** Etiquetas de lugar da bola: coluna 0 e 2 são canto, 1 é meio; linha 0 baixo, 1 alto. */
function lugar(zona: number): Etiqueta[] {
  return [coluna(zona) === 1 ? 'meio' : 'canto', linha(zona) === 1 ? 'alto' : 'baixo'];
}

/** O que é verdade numa cobrança de quem joga (tabela "Etiquetas de lance" do narrador.md). */
export function etiquetasDaCobranca(r: ResultadoCobranca): Set<Etiqueta> {
  const e = new Set(lugar(r.zonaBola));
  if (r.fraca) e.add('fraca');
  if (coluna(r.zonaGoleiro) !== coluna(r.zonaBola)) e.add('goleiro_outro_lado');
  // Trave com a bola acima da linha do travessão (no poste lateral, y fica abaixo de 1).
  if (r.desfecho === 'trave' && r.y > 1) e.add('travessao');
  return e;
}

/** O que é verdade numa defesa. `dica` é a coluna do pé de apoio (planejarDefesa). */
export function etiquetasDaDefesa(r: ResultadoDefesa, dica: number): Set<Etiqueta> {
  const e = new Set(lugar(r.alvo));
  if (r.zonaGoleiro < 0) e.add('nao_pulou');
  else if (coluna(r.zonaGoleiro) !== coluna(r.alvo)) e.add('pulou_outro_lado');
  else if (r.zonaGoleiro !== r.alvo) e.add('mesma_coluna');
  if (dica === coluna(r.alvo)) e.add('dica_honesta');
  return e;
}

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

export function eventoDaDefesa(r: ResultadoDefesa): EventoNarrador {
  if (r.desfecho === 'defesa') return 'defesa';
  if (r.desfecho === 'gol') return 'sofreu_gol';
  return 'maquina_fora';
}

/** Erro na Prova com a partida seguindo: faltando 1 para acabar, o aviso vale mais que o motivo do erro. */
export function eventoDoErroNaProva(desfecho: Desfecho, erros: number): EventoNarrador {
  if (erros === ERROS_QUE_ENCERRAM - 1) return 'prova_ultima_vida';
  return desfecho === 'tempo' ? 'prova_tempo' : 'prova_errou';
}

/**
 * Tela final, no máximo 2 frases, nesta ordem: 5 de 5, resultado do par ou ímpar
 * (antes da vitória ou derrota) e vitória ou derrota. Não existe empate.
 */
export function eventosDoFim(r: ResultadoPartida): EventoNarrador[] {
  const lista: EventoNarrador[] = [];
  if (r.cincoCobrancas) lista.push('cinco_cobrancas');
  if (r.cincoDefesas) lista.push('cinco_defesas');
  if (r.parOuImpar) lista.push(r.parOuImpar.ganhou ? 'par_ou_impar_ganhou' : 'par_ou_impar_perdeu');
  lista.push(r.venceu ? 'vitoria' : 'derrota');
  return lista.slice(0, 2);
}

/** Coluna do gol (0, 1 ou 2) de um x de -1 a 1, como em zonaDoPonto. */
const colunaDoX = (x: number) => (x < -1 / 3 ? 0 : x > 1 / 3 ? 2 : 1);

/** Etiquetas de um lance dos Lances do Jogo (as mesmas da cobrança, seção 3 do narrador.md). */
export function etiquetasDoLance(r: ResultadoLance): Set<Etiqueta> {
  const e = new Set(lugar(r.zonaBola));
  if (colunaDoX(r.goleiroX) !== coluna(r.zonaBola)) e.add('goleiro_outro_lado');
  if (r.desfecho === 'trave' && r.y > 1) e.add('travessao');
  return e;
}

/** Lances do Jogo (narrador.md, seção 12): barreira e lance recriado têm frases próprias; o resto é como a cobrança. */
export function eventoDoLance(r: ResultadoLance): EventoNarrador {
  if (r.desfecho === 'barreira') return 'lance_barreira';
  if (r.desfecho === 'gol' && r.recriou) return 'lance_recriou';
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
