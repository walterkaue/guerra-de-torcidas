// Troca de telas. Cada tela desenha no #app e devolve uma função de limpeza.

import type { Gestos, ResultadoPartida } from './jogo/penaltis';
import type { DesafioRecebido, FechamentoDoServidor } from './servidor/api';

export interface DadosResultado {
  timeId: string;
  semente: number;
  dificuldade: number;
  gestos: Gestos;
  resultado: ResultadoPartida;
  /** Só quando a disputa foi ao par ou ímpar. */
  numeroNarrador?: number;
  /** A partida foi registrada no servidor e conta para a torcida (se passar no teto e na detecção). */
  valendo: boolean;
  aviso?: string;
  servidor?: FechamentoDoServidor;
  /** Partida de desafio por link: dados de quem desafiou. */
  desafio?: DesafioRecebido;
  /** Até 2 frases do narrador para a tela final (5 de 5, depois o resultado). */
  frasesFinais: string[];
}

export type Rota =
  | { tela: 'inicio' }
  | { tela: 'ranking' }
  | { tela: 'palpites' }
  | { tela: 'admin' }
  | { tela: 'times'; depois?: 'partida' | 'inicio' | 'palpites'; desafio?: string }
  | { tela: 'partida'; desafio?: string }
  | { tela: 'resultado'; dados: DadosResultado };

type Limpeza = (() => void) | void;
type Renderizador = (root: HTMLElement, rota: Rota) => Limpeza;

const telas = new Map<Rota['tela'], Renderizador>();
let limparAtual: Limpeza;
let raiz: HTMLElement;

export function registrarTela(nome: Rota['tela'], fn: Renderizador): void {
  telas.set(nome, fn);
}

export function iniciarApp(root: HTMLElement): void {
  raiz = root;
}

export function irPara(rota: Rota): void {
  if (typeof limparAtual === 'function') limparAtual();
  raiz.innerHTML = '';
  window.scrollTo(0, 0);
  limparAtual = telas.get(rota.tela)?.(raiz, rota);
}

/** Código de desafio que veio no link (?d=), até ser aceito. */
export function desafioDoLink(): string | undefined {
  const d = new URLSearchParams(location.search).get('d');
  return d && /^[a-z0-9]{8}$/i.test(d) ? d.toLowerCase() : undefined;
}

/** Escapa texto do usuário (apelido) antes de colocar no HTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
