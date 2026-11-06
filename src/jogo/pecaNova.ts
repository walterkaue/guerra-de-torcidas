// "Peça nova no vestiário" no resultado de qualquer jogo (docs/jogo.md 14.5, "Tela (Rota 2)"). Puro, com testes.
// O "depois" é o que o resultado já lê do servidor (carreira e medalhas); o "antes" é o XP visto antes da partida e
// as medalhas de depois menos o que a partida deu (o mesmo jeito do "Rumo às medalhas"). Quem decide o que está
// liberado de verdade é o servidor (função `boneco`): isto só escolhe o que anunciar, uma vez por aparelho.

import { nivelDe, NIVEIS } from './carreira.ts';
import { novasPecas, pecasLiberadas, PECAS, type MedalhaDoItem, type Peca, type Vestimenta } from './vestiario.ts';

/** Item de disputa de pênaltis nas medalhas do servidor (`penaltis:<disputa>`). */
export const PREFIXO_DA_DISPUTA = 'penaltis:';

/** Uma linha de `minhas_medalhas` (só o que importa aqui). */
export interface LinhaDeMedalha {
  lance_id: string;
  gols: number;
  recriados: number;
  vitorias?: number;
}

/** O que a partida somou num item (lance ou `penaltis:<disputa>`). */
export interface JogadaNoItem {
  item: string;
  gols: number;
  recriados: number;
  vitorias: number;
}

/**
 * Item da Seleção pelo id (os ids do catálogo começam pelo clube: `selecao-1994-…`, `penaltis:selecao-…`). Só para
 * o que a tela mostra: quem libera de verdade o fundo verde e amarelo é o servidor, pelo catálogo.
 */
export const itemDaSelecao = (item: string): boolean =>
  (item.startsWith(PREFIXO_DA_DISPUTA) ? item.slice(PREFIXO_DA_DISPUTA.length) : item).startsWith('selecao-');

const naoNegativo = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);

/** Linhas do servidor no formato do catálogo do vestiário. `daSelecao` diz se o item é da Seleção (pelo catálogo). */
export function itensDasMedalhas(linhas: readonly LinhaDeMedalha[], daSelecao: (item: string) => boolean = itemDaSelecao): MedalhaDoItem[] {
  return linhas.map((l) => ({
    tipo: l.lance_id.startsWith(PREFIXO_DA_DISPUTA) ? 'disputa' : 'lance',
    gols: naoNegativo(l.gols),
    recriados: naoNegativo(l.recriados),
    vitorias: naoNegativo(l.vitorias),
    daSelecao: daSelecao(l.lance_id),
  }));
}

/** As linhas de antes da partida: as de depois menos o que a partida deu em cada item (nunca abaixo de zero). */
export function linhasAntesDaPartida(depois: readonly LinhaDeMedalha[], jogadas: readonly JogadaNoItem[]): LinhaDeMedalha[] {
  const somado = new Map<string, JogadaNoItem>();
  for (const j of jogadas) {
    const s = somado.get(j.item) ?? { item: j.item, gols: 0, recriados: 0, vitorias: 0 };
    somado.set(j.item, {
      item: j.item,
      gols: s.gols + naoNegativo(j.gols),
      recriados: s.recriados + naoNegativo(j.recriados),
      vitorias: s.vitorias + naoNegativo(j.vitorias),
    });
  }
  return depois.map((l) => {
    const j = somado.get(l.lance_id);
    if (!j) return { ...l };
    return {
      lance_id: l.lance_id,
      gols: Math.max(0, naoNegativo(l.gols) - j.gols),
      recriados: Math.max(0, naoNegativo(l.recriados) - j.recriados),
      vitorias: Math.max(0, naoNegativo(l.vitorias) - j.vitorias),
    };
  });
}

export interface PartidaParaPeca {
  /** XP visto antes da partida (null: o aparelho nunca viu; aí o nível não anuncia nada). */
  xpAntes: number | null;
  /** XP lido do servidor depois da partida. */
  xpDepois: number;
  /** `minhas_medalhas` depois da partida; jogo sem medalha (Prova, Time do Dia) passa []. */
  medalhasDepois: readonly LinhaDeMedalha[];
  /** O que esta partida somou em cada item; jogo sem medalha passa []. */
  jogadas: readonly JogadaNoItem[];
  /** Item da Seleção pelo catálogo. */
  daSelecao?: (item: string) => boolean;
}

/**
 * Peças que esta partida liberou, na ordem de PECAS: novasPecas(antes, depois). O Aquecimento fica igual nos dois
 * lados (o apito sai no Aquecimento, nunca no resultado).
 */
export function pecasDaPartida(p: PartidaParaPeca): Peca[] {
  const xpDepois = naoNegativo(p.xpDepois);
  const xpAntes = p.xpAntes === null ? xpDepois : Math.min(naoNegativo(p.xpAntes), xpDepois);
  const daSelecao = p.daSelecao ?? itemDaSelecao;
  const antes = pecasLiberadas({
    nivel: nivelDe(xpAntes).indice,
    medalhas: itensDasMedalhas(linhasAntesDaPartida(p.medalhasDepois, p.jogadas), daSelecao),
    aquecido: false,
  });
  const depois = pecasLiberadas({
    nivel: nivelDe(xpDepois).indice,
    medalhas: itensDasMedalhas(p.medalhasDepois, daSelecao),
    aquecido: false,
  });
  return novasPecas(antes, depois);
}

/** "Próxima: chuteira nas cores do time, no Titular" (bloco Vestiário do Perfil); null quando já tem tudo. */
export function linhaDaProxima(proxima: { peca: Pick<Peca, 'nome'>; condicao: string } | null): string | null {
  if (!proxima) return null;
  const nome = proxima.peca.nome.charAt(0).toLowerCase() + proxima.peca.nome.slice(1);
  return `Próxima: ${nome}, ${proxima.condicao.replace(/^Libera /, '')}`;
}

/** Tira o que este aparelho já viu (anunciado num resultado ou já liberado numa leitura do servidor). */
export function paraAnunciar(novas: readonly Peca[], vistas: ReadonlySet<string>): Peca[] {
  return novas.filter((p) => !vistas.has(p.id));
}

/** Título de cada grupo do bloco: "Subiu pra Titular!", "Primeiro ouro!"… Nunca nome de pessoa. */
export function tituloDaConquista(peca: Peca): string {
  const c = peca.condicao;
  switch (c.tipo) {
    case 'comeco':
      return 'Do começo';
    case 'nivel':
      return `Subiu pra ${NIVEIS[c.nivel].nome}!`;
    case 'medalha':
      // Por extenso: no título em caixa alta, "1º" vira algo como "1⁰" e lê "10".
      return c.medalha === 'bronze' ? 'Primeiro bronze!' : c.medalha === 'prata' ? 'Primeira prata!' : 'Primeiro ouro!';
    case 'ouroDisputa':
      return 'Ouro nos pênaltis!';
    case 'ouroSelecao':
      return 'Ouro da Seleção!';
    case 'ouros':
      return `${c.quantos} ouros!`;
    case 'aquecido':
      return 'Aquecimento completo!';
  }
}

/** A lista do bloco: as peças agrupadas pela conquista, na ordem de PECAS. */
export function gruposDaPecaNova(pecas: readonly Peca[]): { titulo: string; pecas: Peca[] }[] {
  const grupos: { titulo: string; pecas: Peca[] }[] = [];
  for (const p of PECAS.filter((x) => pecas.some((y) => y.id === x.id))) {
    const titulo = tituloDaConquista(p);
    const g = grupos.find((x) => x.titulo === titulo);
    if (g) g.pecas.push(p);
    else grupos.push({ titulo, pecas: [p] });
  }
  return grupos;
}

/** A peça que "Vestir agora" escolhe: a primeira que muda o boneco no vestiário (a pose só aparece no card). */
export function pecaParaVestir(pecas: readonly Peca[]): Peca | null {
  return pecas.find((p) => p.campo !== 'pose') ?? pecas[0] ?? null;
}

/** O boneco do bloco: a vestimenta de agora com todas as peças novas vestidas (e a pose de braços pra cima, se veio). */
export function vestirAsNovas(v: Vestimenta, pecas: readonly Peca[]): Vestimenta {
  let r: Vestimenta = { ...v };
  for (const p of pecas) r = { ...r, [p.campo]: p.valor } as Vestimenta;
  return r;
}
