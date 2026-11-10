// Onde quem chamou bateu (resultado de um desafio de pênaltis recebido). As cobranças gravadas de quem chamou são o
// alvo das defesas de quem recebeu: tudo sai de `resultado.defesas` (só as `contraGravada`; as da máquina na morte
// súbita ficam de fora). Lógica pura, sem servidor: a tela (telas/resultado.ts) só desenha o que sai daqui.
// Zona = linha × 3 + coluna: coluna 0 esquerda e 2 direita, do ponto de vista de quem bate; linha 0 embaixo, 1 em cima.

import type { ResultadoDefesa } from './penaltis';

export interface MarcaDeCobranca {
  /** Ordem da cobrança gravada, a partir de 1. */
  n: number;
  /** Zona 0 a 5 onde a bola foi (ignorada quando foi pra fora). */
  alvo: number;
  desfecho: ResultadoDefesa['desfecho'];
}

export interface ZonasDoGol {
  /** As 6 zonas, na ordem de `alvo`; cada uma com as marcas que foram nela, na ordem da cobrança. */
  zonas: MarcaDeCobranca[][];
  /** As que foram pra fora, na ordem. */
  fora: MarcaDeCobranca[];
}

/** Só as defesas contra cobrança gravada, numeradas pela ordem. */
export function marcasDasGravadas(defesas: readonly Pick<ResultadoDefesa, 'alvo' | 'desfecho' | 'contraGravada'>[]): MarcaDeCobranca[] {
  return defesas
    .filter((d) => d.contraGravada)
    .map((d, i) => ({ n: i + 1, alvo: d.alvo, desfecho: d.desfecho }));
}

/** M = cobranças gravadas; N = as que você pegou. */
export function contarMarcas(marcas: readonly MarcaDeCobranca[]): { n: number; m: number } {
  return { n: marcas.filter((x) => x.desfecho === 'defesa').length, m: marcas.length };
}

export function montarZonas(marcas: readonly MarcaDeCobranca[]): ZonasDoGol {
  const zonas: MarcaDeCobranca[][] = Array.from({ length: 6 }, () => []);
  const fora: MarcaDeCobranca[] = [];
  for (const x of marcas) {
    if (x.desfecho === 'fora') fora.push(x);
    else if (x.alvo >= 0 && x.alvo <= 5) zonas[x.alvo].push(x);
  }
  return { zonas, fora };
}

/** A frase ao lado das bolinhas da dobra. */
export function fraseDaDobra(n: number, m: number): string {
  if (m === 1) return n === 1 ? 'Você pegou a cobrança' : 'Você não pegou a cobrança';
  return `Você pegou ${n} das ${m} cobranças`;
}

/** Rótulo do bloco nos detalhes; sem apelido, quem chamou fica sem nome. Neutro de gênero. */
export function rotuloOndeBateu(apelido: string | null | undefined): string {
  const nome = apelido?.trim();
  return nome ? `Onde ${nome} bateu` : 'Onde quem te chamou bateu';
}

const NOME_DA_ZONA = [
  'embaixo, no canto esquerdo',
  'embaixo, no meio',
  'embaixo, no canto direito',
  'no alto, no canto esquerdo',
  'no alto, no meio',
  'no alto, no canto direito',
];

export const nomeDaZona = (alvo: number): string => NOME_DA_ZONA[alvo] ?? 'no gol';

/** Frase para o leitor de tela: "Onde Fulano bateu: 1ª no alto, no canto direito, você pegou; 2ª pra fora, ...". */
export function ariaDoOndeBateu(apelido: string | null | undefined, marcas: readonly MarcaDeCobranca[]): string {
  const partes = marcas.map((x) => {
    const onde = x.desfecho === 'fora' ? 'pra fora' : nomeDaZona(x.alvo);
    const fim = x.desfecho === 'defesa' ? 'você pegou' : x.desfecho === 'gol' ? 'entrou' : 'não valeu';
    return `${x.n}ª ${onde}, ${fim}`;
  });
  return `${rotuloOndeBateu(apelido)}: ${partes.join('; ')}.`;
}
