// O desafio que a tela do convite (telas/convite.ts) carregou, guardado para a triagem mostrar a placa curta de quem
// chamou quando a pessoa passa por ela no caminho do jogo (C06). Fica só na memória da página: recarregar esquece, e
// aí a triagem sai sem a placa, como sempre. Sem DOM: a conta de "esta triagem vem desse desafio?" é testável.

import type { Rota } from '../app';
import type { TipoConvite } from '../jogo/conviteDesafio';

export interface DesafioAberto {
  tipo: TipoConvite;
  codigo: string;
  apelido: string | null;
  pontos: number;
  /** O time de quem chamou (a cor do filete da placa). */
  timeId: string | null;
  /** O boneco de quem chamou, só as chaves de campo (o busto da placa). */
  boneco?: unknown;
}

const abertos = new Map<string, DesafioAberto>();
const chave = (tipo: TipoConvite, codigo: string) => `${tipo}:${codigo}`;

export function guardarDesafioAberto(d: DesafioAberto): void {
  abertos.set(chave(d.tipo, d.codigo), d);
}

export function lerDesafioAberto(tipo: TipoConvite, codigo: string): DesafioAberto | undefined {
  return abertos.get(chave(tipo, codigo));
}

/** Para onde a triagem leva, visto como desafio: partida, Lances ou Prova com o código do convite. */
export function desafioDoDestino(depois: Rota): { tipo: TipoConvite; codigo: string } | undefined {
  if (depois.tela === 'partida' && depois.desafio) return { tipo: 'penaltis', codigo: depois.desafio };
  if (depois.tela === 'lances' && depois.desafio) return { tipo: 'lances', codigo: depois.desafio };
  if (depois.tela === 'prova' && depois.desafio) return { tipo: 'prova', codigo: depois.desafio };
  return undefined;
}

/** O desafio aberto a que este destino da triagem pertence, se a pessoa veio do convite. */
export function desafioDaTriagem(depois: Rota): DesafioAberto | undefined {
  const d = desafioDoDestino(depois);
  return d ? lerDesafioAberto(d.tipo, d.codigo) : undefined;
}
