// Troca de telas. Cada tela desenha no #app e devolve uma função de limpeza.

import type { Gestos, ResultadoPartida } from './jogo/penaltis';
import type { DesafioRecebido, FechamentoDoServidor } from './servidor/api';
import type { DadosResultadoProva } from './telas/prova';
import { faixaDoAparelho } from './estado';
import { precisaDaTriagem } from './jogo/faixaEtaria';
import { qualidade } from './telas/qualidade';

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
  | { tela: 'apoie' }
  /** Faixa etária (docs/jogo.md, seção 13): depois de responder, segue para `depois`. */
  | { tela: 'triagem'; depois: Rota }
  /** Termos e privacidade: `de` é para onde o voltar leva (sem ela, a Home). */
  | { tela: 'termos'; de?: Rota }
  | { tela: 'feedback'; de?: string }
  | { tela: 'times'; depois?: 'partida' | 'inicio' | 'palpites' | 'prova' | 'timeDoDia' | 'lances'; desafio?: string }
  | { tela: 'partida'; desafio?: string }
  | { tela: 'resultado'; dados: DadosResultado }
  | { tela: 'prova'; desafio?: string }
  | { tela: 'provaResultado'; dados: DadosResultadoProva }
  | { tela: 'timeDoDia' }
  | { tela: 'lances'; aba?: 'penaltis' | 'falta' | 'finalizacao' }
  /** Casa do [time]: sem id, o índice dos clubes. */
  | { tela: 'casa'; id?: string };

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

let primeiraTela = true;

/**
 * Troca de tela. Com a transição nativa do navegador (View Transitions), a tela nova entra numa
 * varrida inclinada, como a tarja de TV (docs/visual.md, seção 4.5); sem ela, na qualidade Leve,
 * com movimento reduzido ou na primeira tela, troca direto. A troca em si continua igual.
 * Toda entrada em jogo passa por aqui, então é aqui que a triagem de faixa etária segura a 1ª partida.
 */
export function irPara(pedida: Rota): void {
  const rota: Rota = precisaDaTriagem(pedida.tela, faixaDoAparelho()) ? { tela: 'triagem', depois: pedida } : pedida;
  const trocar = () => {
    if (typeof limparAtual === 'function') limparAtual();
    raiz.innerHTML = '';
    window.scrollTo(0, 0);
    limparAtual = telas.get(rota.tela)?.(raiz, rota);
  };
  const doc = document as Document & { startViewTransition?: (fn: () => void) => unknown };
  const semTransicao =
    primeiraTela || !doc.startViewTransition || qualidade().nivel === 'leve' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  primeiraTela = false;
  if (semTransicao) trocar();
  else doc.startViewTransition!(trocar);
}

/** Código de desafio que veio no link (?d=), até ser aceito. */
export function desafioDoLink(): string | undefined {
  const d = new URLSearchParams(location.search).get('d');
  return d && /^[a-z0-9]{8}$/i.test(d) ? d.toLowerCase() : undefined;
}

/** Código de desafio da Prova de Boleiro que veio no link (?p=). */
export function desafioProvaDoLink(): string | undefined {
  const p = new URLSearchParams(location.search).get('p');
  return p && /^[a-z0-9]{8}$/i.test(p) ? p.toLowerCase() : undefined;
}

/** O link do Time do Dia (?dia) abre direto no jogo. */
export function linkDoTimeDoDia(): boolean {
  return new URLSearchParams(location.search).has('dia');
}

/** Escapa texto do usuário (apelido) antes de colocar no HTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
