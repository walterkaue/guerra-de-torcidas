// O boneco montável fora do vestiário (docs/jogo.md 14.5): o busto da Home e do Perfil, o corpo inteiro do bloco
// Vestiário e o do "Peça nova no vestiário". Este módulo fica no bundle inicial (a Home usa) e é pequeno de
// propósito: o desenho, o catálogo e a leitura do servidor vêm por import() em bonecoPintar.ts.
//
// O aparelho guarda só uma cópia para mostrar sem esperar a rede. Quem manda é o servidor: toda leitura dele
// substitui a cópia, e nada daqui é gravado de volta.

import type { Vestimenta } from '../jogo/vestiario';

const CHAVE_DO_BONECO = 'gdt:boneco';
const CHAVE_DAS_VISTAS = 'gdt:pecas-vistas';
const CHAVE_DO_VESTIARIO = 'gdt:vestiario-aberto';

function ler<T>(chave: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(chave) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // aparelho sem espaço ou em modo privado: só não lembra
  }
}

/** A última vestimenta que o servidor devolveu, sem conferir (bonecoPintar.ts passa pelo `validar` antes de desenhar). */
export const bonecoGuardado = (): unknown => ler<unknown>(CHAVE_DO_BONECO);

/** Guarda a cópia de exibição (sempre a que veio do servidor). */
export function guardarBoneco(v: Vestimenta): void {
  gravar(CHAVE_DO_BONECO, v);
}

/** Ids das peças que este aparelho já viu liberadas (numa leitura do servidor ou anunciadas num resultado). */
export function pecasVistas(): Set<string> {
  const l = ler<unknown>(CHAVE_DAS_VISTAS);
  return new Set(Array.isArray(l) ? l.filter((x): x is string => typeof x === 'string') : []);
}

/** Marca peças como vistas (cada peça é anunciada uma vez por aparelho). */
export function marcarVistas(ids: Iterable<string>): void {
  const vistas = pecasVistas();
  const antes = vistas.size;
  for (const id of ids) vistas.add(id);
  if (vistas.size !== antes) gravar(CHAVE_DAS_VISTAS, [...vistas]);
}

/** O Perfil troca "Monte seu boneco" por "Abrir vestiário" depois da primeira visita ao vestiário. */
export const vestiarioJaAberto = (): boolean => ler<boolean>(CHAVE_DO_VESTIARIO) === true;
export function marcarVestiarioAberto(): void {
  gravar(CHAVE_DO_VESTIARIO, true);
}

export interface Pintura {
  recorte: 'busto' | 'corpo';
  largura: number;
  altura: number;
  /** Vestimenta para desenhar; sem ela, a guardada (e, sem a guardada, nada: fica o que já estava no alvo). */
  vestimenta?: Vestimenta;
  /**
   * O `boneco` de quem chamou um X1, como o servidor manda (só o que vai a campo): a conta de Vestimenta segura e o fundo
   * e a moldura padrão ficam no bonecoPintar. Tem prioridade sobre `vestimenta`; inválido ou null, não desenha.
   */
  deCampo?: unknown;
  /** As cores do time para desenhar; sem elas, as do time do coração de agora. */
  cores?: readonly [string, string];
  /** `alvo` é o texto de um convite: o busto entra antes dele, como um quadradinho que o texto contorna (Home, X1). */
  aoLado?: boolean;
  /** Rótulo para leitor de tela ("Seu boneco"); sem ele, o desenho é decorativo. */
  rotulo?: string;
}

/**
 * Desenha o boneco num canvas novo dentro de `alvo`, trocando o que estava lá (o ícone de pessoa, por exemplo) só
 * depois que o desenho fica pronto. Devolve a função que esquece o pedido (tela que saiu antes não é tocada).
 */
export function pintarBoneco(alvo: HTMLElement, p: Pintura): () => void {
  let cancelado = false;
  void import('./bonecoPintar').then((m) => {
    if (!cancelado && alvo.isConnected) m.pintarNoAlvo(alvo, p);
  });
  return () => {
    cancelado = true;
  };
}

/**
 * Busto do avatar (Home 52 px, Perfil 84 px): desenha a cópia guardada na hora e confere com o servidor uma vez
 * por abertura do app; se mudou, desenha de novo. Sem cópia e sem rede, fica o ícone.
 */
export function pintarAvatar(alvo: HTMLElement, tamanho: number): () => void {
  let cancelado = false;
  void import('./bonecoPintar').then(async (m) => {
    if (cancelado || !alvo.isConnected) return;
    m.pintarNoAlvo(alvo, { recorte: 'busto', largura: tamanho, altura: tamanho });
    const mudou = await m.conferirComOServidor();
    if (mudou && !cancelado && alvo.isConnected) m.pintarNoAlvo(alvo, { recorte: 'busto', largura: tamanho, altura: tamanho });
  });
  return () => {
    cancelado = true;
  };
}
