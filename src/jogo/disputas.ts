// Disputas históricas de pênaltis (docs/jogo.md, seção 6): só cenário. Quem joga contra quem e a ficha mudam;
// motor, dificuldade, detecção, desafio por link e pontuação são os da partida de sempre.

export interface Disputa {
  /** clube-ano-apelido. Nunca muda depois de publicado: vai para a partida como disputa_id. */
  id: string;
  /** Id de times.ts ou "selecao". */
  clube: string;
  titulo: string;
  /** Pode citar nome real, como fato (jogo.md, seção 8). Nunca vai para título, card ou narrador. */
  ficha: string;
  competicao: string;
  fase: string;
  data: string;
  adversario: string;
  /** "4 x 3", com o clube primeiro. */
  placar: string;
}

export const ID_SELECAO = 'selecao';

/** "Final de 2018: foi 4 x 3." */
export const lembrancaDaDisputa = (d: Disputa): string => `${d.fase} de ${d.data.slice(0, 4)}: foi ${d.placar}.`;

/** "Final de 2018: foi 4 x 3. E hoje?" */
export const chamadaDaDisputa = (d: Disputa): string => `${lembrancaDaDisputa(d)} E hoje?`;

/** O que o torcedor vê: as do time do coração e as da Seleção, que são de todo mundo, da mais nova à mais antiga. */
export function disputasDoTorcedor(catalogo: readonly Disputa[], timeId: string): { doTime: Disputa[]; daSelecao: Disputa[] } {
  const maisNovas = (a: Disputa, b: Disputa) => b.data.localeCompare(a.data);
  return {
    doTime: catalogo.filter((d) => d.clube === timeId).sort(maisNovas),
    daSelecao: catalogo.filter((d) => d.clube === ID_SELECAO).sort(maisNovas),
  };
}
