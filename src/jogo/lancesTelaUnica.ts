// Contas e textos da tela única dos Lances (docs/jogo.md, seção 14.7), que entra no domingo 08/11/2026, 0h de
// Brasília: lista de itens (disputas históricas, faltas e cara a cara), filtro de tipo e de clube,
// textos do X1 e da partida de 3 tentativas. Módulo puro, sem DOM, testado em lancesTelaUnica.test.ts.

import { TABELA_LANCES_UNIFICADA, type Lance } from './lances';
import { type ItemDaLista } from './lancesTextos';
import { itemPenaltis } from './regraLances';
import type { Disputa } from './disputas';

export type TipoDoItem = 'penaltis' | 'falta' | 'finalizacao';
export type TipoDaTela = 'todos' | TipoDoItem;

export const TIPOS_DA_TELA: { id: TipoDaTela; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'penaltis', texto: 'Pênaltis' },
  { id: 'falta', texto: 'Faltas' },
  { id: 'finalizacao', texto: 'Cara a cara' },
];

/** A aba da rota (penaltis, falta, finalizacao) abre o filtro do tipo; sem aba, Todos. */
export function tipoDaAba(aba?: string): TipoDaTela {
  return aba === 'penaltis' || aba === 'falta' || aba === 'finalizacao' ? aba : 'todos';
}

/** Um item da tela única: uma disputa do catálogo ou um lance. `id` é a chave das medalhas. */
export interface ItemUnico extends ItemDaLista {
  tipo: TipoDoItem;
}

/** Todas as disputas do catálogo e os lances de falta e cara a cara (a Disputa livre saiu no corte de 08/11). */
export function itensDaTelaUnica(
  lances: readonly Pick<Lance, 'id' | 'clube' | 'tipo'>[],
  disputas: readonly Pick<Disputa, 'id' | 'clube'>[],
): ItemUnico[] {
  return [
    ...disputas.map((d): ItemUnico => ({ id: itemPenaltis(d.id), clube: d.clube, tipo: 'penaltis' })),
    ...lances.map((l): ItemUnico => ({ id: l.id, clube: l.clube, tipo: l.tipo })),
  ];
}

/** Itens do tipo escolhido. */
export function itensDoTipo<T extends ItemUnico>(itens: readonly T[], tipo: TipoDaTela): T[] {
  return itens.filter((i) => tipo === 'todos' || i.tipo === tipo);
}

/** Aplica tipo e clube ('todos' = todos os clubes). */
export function itensDoFiltro<T extends ItemUnico>(itens: readonly T[], tipo: TipoDaTela, clube: string): T[] {
  return itensDoTipo(itens, tipo).filter((i) => clube === 'todos' || i.clube === clube);
}

/** Ids dos clubes que têm item no tipo escolhido (sem repetir). */
export function clubesDoTipo(itens: readonly ItemUnico[], tipo: TipoDaTela): string[] {
  return [...new Set(itensDoTipo(itens, tipo).flatMap((i) => (i.clube ? [i.clube] : [])))];
}

/**
 * O clube que a tela abre: o da pessoa, se tiver item; senão a Seleção, que é de todo mundo (quem é de "Outro time"
 * cai aqui); sem Seleção na lista, "todos".
 */
export const clubeInicial = (itens: readonly ItemUnico[], timeId: string): string =>
  itens.some((i) => i.clube === timeId) ? timeId : itens.some((i) => i.clube === 'selecao') ? 'selecao' : 'todos';

/**
 * Os ids que o Lance do Dia sorteia (jogo.md 14.7): todos os itens da tela única, disputas (`penaltis:<id>`) e
 * lances. A Home e a tela dos Lances usam esta mesma lista, para mostrarem o mesmo item.
 */
export const idsDoLanceDoDia = (
  lances: readonly Pick<Lance, 'id'>[],
  disputas: readonly Pick<Disputa, 'id'>[],
): string[] => [...disputas.map((d) => itemPenaltis(d.id)), ...lances.map((l) => l.id)];

/** Aviso do pênalti que o servidor recusou com 400 `disputa_obrigatoria` (o relógio do aparelho atrasou): vira treino. */
export const AVISO_DISPUTA_OBRIGATORIA = 'Escolha uma disputa pra valer pontos. Esta é de treino.';

/** Mantém o clube escolhido se ele ainda tem item no tipo; senão volta a "todos". */
export const clubeValido = (itens: readonly ItemUnico[], tipo: TipoDaTela, clube: string): string =>
  clube === 'todos' || clubesDoTipo(itens, tipo).includes(clube) ? clube : 'todos';

// ---------- textos ----------

/** A linha do hub: o número do bônus vem da tabela nova. */
export const LINHA_DO_HUB = `Faltas e cara a cara: 3 tentativas do mesmo lance. Gol no canto do lance de verdade vale +${TABELA_LANCES_UNIFICADA.recriou}.`;

export const TENTATIVAS_POR_PARTIDA = 3;

/** HUD da partida: "Tentativa 2 de 3". */
export const textoDaTentativa = (i: number, total = TENTATIVAS_POR_PARTIDA): string => `Tentativa ${i + 1} de ${total}`;

/** Linha da lista de tentativas do resultado: "Tentativa 1". */
export const rotuloDaTentativa = (i: number): string => `Tentativa ${i + 1}`;

/** O alvo no HUD do desafio: "Desafio: Fulano fez 96". Sem apelido, "alguém". */
export const alvoDoX1 = (apelido: string | null | undefined, pontos: number): string => `Desafio: ${apelido?.trim() || 'alguém'} fez ${pontos}`;

/** Quando o X1 não vale, a partida é normal do mesmo lance; a linha do narrador na abertura. */
const AVISOS_DO_X1: Record<string, string> = {
  desafio_nao_encontrado: 'Esse desafio não existe mais. Bora outro!',
  proprio_desafio: 'Esse desafio é seu. Bora outro!',
  desafio_expirado: 'Apitou o fim: esse desafio valia 7 dias. Bora outro!',
};

/** O aviso de um erro de X1 que vira partida normal, ou null se o erro é outro (aí a partida segue o caminho dos erros). */
export const avisoDoErroDoX1 = (codigo: string): string | null => AVISOS_DO_X1[codigo] ?? null;

export interface ComparacaoX1 {
  desafiante: string | null;
  pontosDesafiante: number;
  venceu: boolean;
}

/** O que mostrar no placar do X1: quem fez quanto, lado a lado. */
export function placarDoX1(pontos: number, c: ComparacaoX1): { voce: number; outro: number; nomeDoOutro: string; venceu: boolean } {
  return { voce: pontos, outro: c.pontosDesafiante, nomeDoOutro: c.desafiante?.trim() || 'Rival do dia', venceu: c.venceu };
}

/** Frase neutra do X1 quando o narrador não tem uma que sirva. Sem zoeira com a pessoa. */
export function fraseNeutraDoX1(venceu: boolean): string {
  // O desafio recebido não gera link; jogar de novo gera o seu.
  return venceu ? 'Desafio vencido! Agora é resenha no grupo.' : 'Dessa vez deu o outro lado. Tem jogo de volta?';
}

/** Texto que acompanha o link no WhatsApp: com desafio chama alguém; sem, só convida. */
export function conviteLances(pontos: number, paraTime: string | null, comX1: boolean): string {
  const quanto = paraTime ? `${pontos} ${paraTime}` : `${pontos} ${pontos === 1 ? 'ponto' : 'pontos'}`;
  return comX1 ? `Te desafio nos Lances do Jogo: fiz ${quanto}. Faz mais?` : `Fiz ${quanto} nos Lances do Jogo. Vem pro jogo:`;
}

/** O texto completo do WhatsApp: convite, emojis (com a medalha na mesma linha, se houver) e o link na última linha. */
export const textoShareLances = (convite: string, emojis: string, medalha: string | null, link: string): string =>
  [convite, medalha ? `${emojis} ${medalha}` : emojis, link].join('\n');

/** As 3 tentativas do resultado: o título da placa é o do lance, as linhas são "Tentativa N". */
export function linhasDeTentativas(n: number): string[] {
  return Array.from({ length: n }, (_, i) => rotuloDaTentativa(i));
}
