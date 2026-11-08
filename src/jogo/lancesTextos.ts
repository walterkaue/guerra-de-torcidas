// Textos e montagem dos Lances do Jogo valendo (docs/jogo.md, seções 7.3 e 14.7): emoji de cada lance, escolha do
// texto do resultado, progresso das medalhas e a vitrine das torcidas.
// Puro: sem DOM, sem servidor e sem relógio. A tela e o card só desenham o que sai daqui.

import {
  MEDALHAS,
  medalhaDoLance,
  TABELA_LANCES_UNIFICADA,
  type DesfechoLance,
  type Faixa,
  type Lance,
  type Medalha,
} from './lances.ts';
import { LANCES_PARTIDAS_POR_DIA_UNIFICADO, MEDALHAS_PENALTIS, medalhaDaDisputa, MELHORES_DO_DIA } from './regraLances.ts';

export const NOME_DA_MEDALHA: Record<Medalha, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };

/**
 * Emoji de cada lance no texto de compartilhar: só emoji antigo e universal, sem seletor de variação
 * (seção 6, "Card de resultado"). O 🧱 e o 🧤 são recentes e podem virar quadradinho no WhatsApp velho;
 * a barreira vira 🚧 e a defesa, ✋ (o mesmo que o par ou ímpar dos pênaltis já usa).
 */
export const EMOJI_DO_LANCE: Record<DesfechoLance, string> = {
  gol: '⚽',
  defesa: '✋',
  barreira: '🚧',
  trave: '❌',
  fora: '❌',
};

export const emojiDoLance = (d: DesfechoLance): string => EMOJI_DO_LANCE[d];

export const emojisDaPartida = (desfechos: readonly DesfechoLance[]): string => desfechos.map(emojiDoLance).join('');

// ---------- texto do resultado ----------

export type SituacaoDoResultado =
  | { tipo: 'sem_pontos'; texto: string }
  | { tipo: 'suspeita'; texto: string }
  | { tipo: 'melhor_do_dia'; texto: string }
  | { tipo: 'ranking'; texto: null };

/**
 * Qual explicação a tela mostra no lugar do efeito no ranking:
 * - sem servidor (queda de conexão): o aviso com o código do motivo;
 * - sob suspeita: o mesmo texto dos pênaltis;
 * - não conta (não superou a melhor do dia): "Sua melhor de hoje continua a de N pontos.";
 * - conta: segue o fluxo "Subiu de 5º pra 3º" / "Contou pro ranking da semana" (texto null).
 */
export function situacaoDoResultado(d: {
  fechou: boolean;
  aviso?: string;
  contaNoRanking: boolean;
  sobSuspeita: boolean;
  melhorDoDia: number | null;
  /** Regra nova (desde 08/11/2026): as 3 melhores de Lances de hoje, que o servidor devolve no fechamento. */
  melhoresDoDia?: readonly number[] | null;
}): SituacaoDoResultado {
  if (!d.fechou) return { tipo: 'sem_pontos', texto: d.aviso ?? 'Partida sem valer pontos.' };
  if (d.sobSuspeita) return { tipo: 'suspeita', texto: 'Essa ficou fora do ranking até a gente conferir.' };
  if (!d.contaNoRanking && d.melhoresDoDia !== undefined) return { tipo: 'melhor_do_dia', texto: textoForaDasMelhores(d.melhoresDoDia) };
  if (!d.contaNoRanking) {
    return {
      tipo: 'melhor_do_dia',
      texto:
        d.melhorDoDia === null
          ? 'Não superou sua melhor de hoje: o ranking não muda.'
          : `Sua melhor de hoje continua a de ${d.melhorDoDia} ${d.melhorDoDia === 1 ? 'ponto' : 'pontos'}.`,
    };
  }
  return { tipo: 'ranking', texto: null };
}

/**
 * Aviso de quando o servidor diz `limite_do_dia` (seção 14.7): o limite soma pênaltis, faltas e cara a cara, e a
 * partida segue como treino, sem ponto nem medalha.
 */
export const AVISO_LIMITE_DO_DIA = `Hoje já deu: ${LANCES_PARTIDAS_POR_DIA_UNIFICADO} partidas valendo. Essa vai de treino: sem ponto nem medalha.`;

const listaDePontos = (melhores: readonly number[]) => melhores.join(' · ');

/**
 * "Suas 3 melhores hoje: 96 · 72 · 54" (regra nova: o dia vale as 3 melhores partidas de Lances). Sem nenhuma
 * ainda, a regra; null sem resposta do servidor.
 */
export function linhaMelhoresDoDia(melhores: readonly number[] | null | undefined): string | null {
  if (!melhores) return null;
  const top = melhores.slice(0, MELHORES_DO_DIA);
  if (!top.length) return `Suas ${MELHORES_DO_DIA} melhores do dia contam`;
  return `${top.length === MELHORES_DO_DIA ? `Suas ${MELHORES_DO_DIA} melhores` : top.length === 1 ? 'Sua melhor' : 'Suas melhores'} hoje: ${listaDePontos(top)}`;
}

/** A partida não entrou nas 3 melhores de hoje (Lances ou Prova, regra nova). Com a lista, mostra quais contam. */
export function textoForaDasMelhores(melhores?: readonly number[] | null): string {
  const top = (melhores ?? []).slice(0, MELHORES_DO_DIA);
  if (!top.length) return `Não superou suas ${MELHORES_DO_DIA} melhores de hoje: o ranking não muda.`;
  return `Não entrou nas suas ${MELHORES_DO_DIA} melhores de hoje: ${listaDePontos(top)}.`;
}

/**
 * A faixa e os pontos de um gol que a tela mostra: a do catálogo recalibrado (`faixaUnificada`);
 * a partida pode jogar numa faixa abaixo dela (taxa real) e a resposta da função `lances` traz a que vale.
 */
export function faixaNaTela(l: Pick<Lance, 'faixa' | 'faixaUnificada'>): { faixa: Faixa; pontos: number } {
  const faixa = l.faixaUnificada ?? l.faixa;
  return { faixa, pontos: TABELA_LANCES_UNIFICADA.faixa[faixa] };
}

/** "Valendo hoje: 2 de 10" (null sem resposta do servidor). */
export function linhaValendoHoje(h: { feitas: number; limite: number } | null): string | null {
  if (!h || !(h.limite > 0)) return null;
  return `Valendo hoje: ${Math.min(h.feitas, h.limite)} de ${h.limite}`;
}

/** "Bronze no lance Gol do título!" */
export const textoDaMedalhaNova = (medalha: Medalha, titulo: string): string => `${NOME_DA_MEDALHA[medalha]} no lance ${titulo}!`;

// ---------- medalhas e progresso ----------

export interface Progresso {
  medalha: Medalha | null;
  /** Null quando já é ouro. `faltamVitorias` só nas disputas de pênaltis (progressoDaDisputa). */
  proxima: { medalha: Medalha; faltamGols: number; faltamRecriados: number; faltamVitorias?: number } | null;
  texto: string;
}

/** Quanto falta para a próxima medalha: bronze 5 gols, prata 20, ouro 50 (10 recriando o lance). */
export function progressoDaMedalha(gols: number, recriados: number): Progresso {
  const medalha = medalhaDoLance(gols, recriados);
  const alvo = MEDALHAS.find((m) => gols < m.acertos || recriados < m.recriados);
  if (!alvo) return { medalha, proxima: null, texto: 'Ouro conquistado.' };
  const faltamRecriados = Math.max(0, alvo.recriados - recriados);
  // Gol recriando o lance também é gol: quem precisa de 8 recriados precisa de pelo menos 8 gols.
  const faltamGols = Math.max(alvo.acertos - gols, faltamRecriados);
  const nome = NOME_DA_MEDALHA[alvo.medalha].toLowerCase();
  const gol = (n: number) => `${n} ${n === 1 ? 'gol' : 'gols'}`;
  let quanto = gol(faltamGols);
  if (faltamRecriados === faltamGols) quanto += ' recriando o lance';
  else if (faltamRecriados) quanto += `, ${faltamRecriados} deles recriando o lance,`;
  return {
    medalha,
    proxima: { medalha: alvo.medalha, faltamGols, faltamRecriados },
    texto: `Faltam ${quanto} pro ${nome}.`,
  };
}

// ---------- trilha de 3 medalhas (docs/jogo.md, seção 14.3) ----------
// Só desenho e texto a partir do que o servidor já guarda (gols e recriados por lance): não muda regra nem pontos.

const OURO = MEDALHAS[MEDALHAS.length - 1];
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const fracao = (v: number, de: number, ate: number) => (ate <= de ? 1 : Math.max(0, Math.min(1, (v - de) / (ate - de))));

export interface MarcoDaTrilha {
  medalha: Medalha;
  /** Gols que o marco pede (5, 20, 50). */
  gols: number;
  conquistada: boolean;
  /** Só na próxima medalha: quanto da bolinha já está cheio (0 a 1). */
  parcial: number;
}

export interface Trilha {
  gols: number;
  recriados: number;
  /** Bronze, prata e ouro, nessa ordem. */
  marcos: MarcoDaTrilha[];
  /** Quanto da linha está cheio (0 a 1): três trechos iguais, até o bronze, até a prata e até o ouro. */
  enche: number;
  medalha: Medalha | null;
  proxima: Medalha | null;
  /** Ouro com os 10 recriados: ganha brilho. */
  ouroCompleto: boolean;
  /** Ao lado da trilha: "23 gols · faltam 27". */
  rotulo: string;
  /** Barra própria de recriados: o ouro pede 10. Nas disputas de pênaltis, as vitórias (o mesmo que `extraDoOuro`). */
  recriadosDoOuro: { feitos: number; pede: number };
  /** A barra própria do ouro com o rótulo: "Recriados" nos lances, "Vitórias" nas disputas de pênaltis. */
  extraDoOuro: { rotulo: 'Recriados' | 'Vitórias'; feitos: number; pede: number };
  /** "Faltam 27 gols, 6 recriando, pro ouro." */
  faltaProOuro: string;
}

/** Trilha de um lance: as três bolinhas, a linha que se enche e os textos ao lado. */
export function trilhaDoLance(golsBrutos: number, recriadosBrutos: number): Trilha {
  const gols = Math.max(0, golsBrutos);
  const recriados = Math.max(0, Math.min(recriadosBrutos, gols));
  const p = progressoDaMedalha(gols, recriados);
  let anterior = 0;
  let enche = 0;
  const marcos = MEDALHAS.map((m): MarcoDaTrilha => {
    const conquistada = gols >= m.acertos && recriados >= m.recriados;
    // A bolinha da próxima medalha enche pelo trecho de gols; no ouro, também pelos recriados (vale o menor).
    const doTrecho = Math.min(fracao(gols, anterior, m.acertos), m.recriados ? recriados / m.recriados : 1);
    const ehProxima = !conquistada && p.proxima?.medalha === m.medalha;
    enche += (conquistada ? 1 : ehProxima ? doTrecho : 0) / MEDALHAS.length;
    anterior = m.acertos;
    return { medalha: m.medalha, gols: m.acertos, conquistada, parcial: ehProxima ? doTrecho : 0 };
  });
  let rotulo = plural(gols, 'gol', 'gols');
  if (p.proxima) {
    const alvo = MEDALHAS.find((m) => m.medalha === p.proxima!.medalha)!;
    // Gols de sobra, mas faltando recriados: o que falta é recriar.
    rotulo += gols >= alvo.acertos ? ` · faltam ${p.proxima.faltamRecriados} recriando` : ` · faltam ${p.proxima.faltamGols}`;
  } else rotulo += ' · ouro completo';
  const faltaRec = Math.max(0, OURO.recriados - recriados);
  const faltaGols = Math.max(OURO.acertos - gols, faltaRec, 0);
  return {
    gols,
    recriados,
    marcos,
    enche: Math.min(1, enche),
    medalha: p.medalha,
    proxima: p.proxima?.medalha ?? null,
    ouroCompleto: !p.proxima,
    rotulo,
    recriadosDoOuro: { feitos: Math.min(recriados, OURO.recriados), pede: OURO.recriados },
    extraDoOuro: { rotulo: 'Recriados', feitos: Math.min(recriados, OURO.recriados), pede: OURO.recriados },
    faltaProOuro: !p.proxima
      ? 'Ouro completo!'
      : `Faltam ${plural(faltaGols, 'gol', 'gols')}${faltaRec ? `, ${faltaRec} recriando,` : ''} pro ouro.`,
  };
}

export interface LinhaRumo {
  texto: string;
  /** Medalha que entrou com esta partida (a maior, se subiu duas), ou null. */
  subiu: Medalha | null;
}

/**
 * Linha do resultado por lance: "+1 rumo ao ouro · 24/50". Sem gol na partida: "Rumo ao ouro · 23/50".
 * Gols de sobra, faltando recriados: "+1 rumo ao ouro · 7/10 recriando". Ouro completo: "+1 · ouro completo · 53 gols".
 */
export function linhaRumo(antes: { gols: number; recriados: number }, depois: { gols: number; recriados: number }): LinhaRumo {
  const ganhou = Math.max(0, depois.gols - antes.gols);
  const mAntes = medalhaDoLance(antes.gols, antes.recriados);
  const mDepois = medalhaDoLance(depois.gols, depois.recriados);
  const subiu = mDepois && mDepois !== mAntes ? mDepois : null;
  const p = progressoDaMedalha(depois.gols, depois.recriados);
  if (!p.proxima) return { texto: `${ganhou ? `+${ganhou} · ` : ''}ouro completo · ${plural(depois.gols, 'gol', 'gols')}`, subiu };
  const alvo = MEDALHAS.find((m) => m.medalha === p.proxima!.medalha)!;
  const nome = `${alvo.medalha === 'prata' ? 'à' : 'ao'} ${NOME_DA_MEDALHA[alvo.medalha].toLowerCase()}`;
  const conta = depois.gols >= alvo.acertos ? `${depois.recriados}/${alvo.recriados} recriando` : `${depois.gols}/${alvo.acertos}`;
  return { texto: `${ganhou ? `+${ganhou} rumo` : 'Rumo'} ${nome} · ${conta}`, subiu };
}

/**
 * Uma linha por lance da partida (sem repetir), na ordem em que foram jogados. `depois` é a leitura de
 * minhas_medalhas() logo depois de a partida fechar (o gatilho já anotou os gols). Só para partida que contou.
 */
export function linhasRumoDaPartida(
  jogados: readonly { id: string; gol: boolean; recriou: boolean }[],
  depois: readonly LinhaMedalha[],
): { lanceId: string; linha: LinhaRumo }[] {
  return [...new Set(jogados.map((j) => j.id))].map((id) => {
    const daqui = jogados.filter((j) => j.id === id && j.gol);
    const gols = daqui.length;
    const rec = daqui.filter((j) => j.recriou).length;
    const d = depois.find((l) => l.lance_id === id) ?? { gols, recriados: rec };
    const antes = { gols: Math.max(0, d.gols - gols), recriados: Math.max(0, d.recriados - rec) };
    return { lanceId: id, linha: linhaRumo(antes, { gols: d.gols, recriados: d.recriados }) };
  });
}

/** Prévia na ficha: a linha do resultado com mais um gol (recriando, se o que falta pro ouro é recriar). */
export function previaDoProximoGol(gols: number, recriados: number): string {
  const recria = recriados < OURO.recriados && gols + 1 >= OURO.acertos;
  return linhaRumo({ gols, recriados }, { gols: gols + 1, recriados: recriados + (recria ? 1 : 0) }).texto;
}

// ---------- medalhas das disputas de pênaltis (seção 14.7) ----------
// Por disputa histórica: bronze 10 gols, prata 50, ouro 100 com 10 vitórias. Os números vêm de
// minhas_medalhas() (gols e vitórias do item `penaltis:<disputa>`), como nos lances.

const OURO_PENALTIS = MEDALHAS_PENALTIS[MEDALHAS_PENALTIS.length - 1];

/** Quanto falta para a próxima medalha de uma disputa: gols e, no ouro, vitórias. */
export function progressoDaDisputa(golsBrutos: number, vitoriasBrutas: number): Progresso {
  const gols = Math.max(0, golsBrutos);
  const vitorias = Math.max(0, vitoriasBrutas);
  const medalha = medalhaDaDisputa(gols, vitorias);
  const alvo = MEDALHAS_PENALTIS.find((m) => gols < m.gols || vitorias < m.vitorias);
  if (!alvo) return { medalha, proxima: null, texto: 'Ouro conquistado.' };
  const faltamGols = Math.max(0, alvo.gols - gols);
  const faltamVitorias = Math.max(0, alvo.vitorias - vitorias);
  const partes = [
    ...(faltamGols ? [plural(faltamGols, 'gol', 'gols')] : []),
    ...(faltamVitorias ? [plural(faltamVitorias, 'vitória', 'vitórias')] : []),
  ];
  const nome = NOME_DA_MEDALHA[alvo.medalha].toLowerCase();
  return {
    medalha,
    proxima: { medalha: alvo.medalha, faltamGols, faltamRecriados: 0, faltamVitorias },
    texto: `Faltam ${partes.join(' e ')} pro ${nome}.`,
  };
}

/** Trilha de uma disputa de pênaltis: 10 · 50 · 100 gols e a barra de vitórias no lugar da de recriados. */
export function trilhaDaDisputa(golsBrutos: number, vitoriasBrutas: number): Trilha {
  const gols = Math.max(0, golsBrutos);
  const vitorias = Math.max(0, vitoriasBrutas);
  const p = progressoDaDisputa(gols, vitorias);
  let anterior = 0;
  let enche = 0;
  const marcos = MEDALHAS_PENALTIS.map((m): MarcoDaTrilha => {
    const conquistada = gols >= m.gols && vitorias >= m.vitorias;
    const doTrecho = Math.min(fracao(gols, anterior, m.gols), m.vitorias ? vitorias / m.vitorias : 1);
    const ehProxima = !conquistada && p.proxima?.medalha === m.medalha;
    enche += (conquistada ? 1 : ehProxima ? doTrecho : 0) / MEDALHAS_PENALTIS.length;
    anterior = m.gols;
    return { medalha: m.medalha, gols: m.gols, conquistada, parcial: ehProxima ? doTrecho : 0 };
  });
  let rotulo = plural(gols, 'gol', 'gols');
  if (p.proxima) {
    // Gols de sobra, faltando vitórias: o que falta é vencer.
    rotulo += p.proxima.faltamGols
      ? ` · faltam ${p.proxima.faltamGols}`
      : ` · faltam ${plural(p.proxima.faltamVitorias ?? 0, 'vitória', 'vitórias')}`;
  } else rotulo += ' · ouro completo';
  const feitas = Math.min(vitorias, OURO_PENALTIS.vitorias);
  const faltaVit = Math.max(0, OURO_PENALTIS.vitorias - vitorias);
  const faltaGols = Math.max(0, OURO_PENALTIS.gols - gols);
  const falta = [...(faltaGols ? [plural(faltaGols, 'gol', 'gols')] : []), ...(faltaVit ? [plural(faltaVit, 'vitória', 'vitórias')] : [])];
  return {
    gols,
    recriados: 0,
    marcos,
    enche: Math.min(1, enche),
    medalha: p.medalha,
    proxima: p.proxima?.medalha ?? null,
    ouroCompleto: !p.proxima,
    rotulo,
    recriadosDoOuro: { feitos: feitas, pede: OURO_PENALTIS.vitorias },
    extraDoOuro: { rotulo: 'Vitórias', feitos: feitas, pede: OURO_PENALTIS.vitorias },
    faltaProOuro: !p.proxima ? 'Ouro completo!' : `Faltam ${falta.join(' e ')} pro ouro.`,
  };
}

/** Gols de uma partida de pênaltis que contam na medalha da disputa: os das 8 primeiras cobranças (igual ao gatilho do banco). */
export const golsDaDisputa = (cobrancas: readonly { desfecho: string }[]): number =>
  cobrancas.slice(0, 8).filter((c) => c.desfecho === 'gol').length;

/**
 * Linha do resultado da disputa: "+3 rumo ao bronze · 8/10". Com os gols de sobra, falta vencer: "+2 rumo ao ouro ·
 * 7/10 vitórias". Ouro completo: "+1 · ouro completo · 103 gols". Mesma régua da trilhaDaDisputa.
 */
export function linhaRumoDisputa(antes: { gols: number; vitorias: number }, depois: { gols: number; vitorias: number }): LinhaRumo {
  const ganhou = Math.max(0, depois.gols - antes.gols);
  const mAntes = medalhaDaDisputa(antes.gols, antes.vitorias);
  const mDepois = medalhaDaDisputa(depois.gols, depois.vitorias);
  const subiu = mDepois && mDepois !== mAntes ? mDepois : null;
  const p = progressoDaDisputa(depois.gols, depois.vitorias);
  if (!p.proxima) return { texto: `${ganhou ? `+${ganhou} · ` : ''}ouro completo · ${plural(depois.gols, 'gol', 'gols')}`, subiu };
  const alvo = MEDALHAS_PENALTIS.find((m) => m.medalha === p.proxima!.medalha)!;
  const nome = `${alvo.medalha === 'prata' ? 'à' : 'ao'} ${NOME_DA_MEDALHA[alvo.medalha].toLowerCase()}`;
  const conta = depois.gols >= alvo.gols ? `${depois.vitorias}/${alvo.vitorias} vitórias` : `${depois.gols}/${alvo.gols}`;
  return { texto: `${ganhou ? `+${ganhou} rumo` : 'Rumo'} ${nome} · ${conta}`, subiu };
}

/** Os números de um item da lista: lance (gols e recriados) ou disputa de pênaltis (gols e vitórias). */
export interface NumerosDoItem {
  gols: number;
  recriados: number;
  vitorias?: number;
}

/** O item de medalha é de pênaltis (`penaltis:<disputa>`)? */
export const ehItemPenaltis = (id: string): boolean => id.startsWith('penaltis:');

/** Medalha e progresso de qualquer item: lance ou disputa de pênaltis, pelo id. */
export function progressoDoItem(id: string, n: NumerosDoItem): Progresso {
  return ehItemPenaltis(id) ? progressoDaDisputa(n.gols, n.vitorias ?? 0) : progressoDaMedalha(n.gols, n.recriados);
}

/** Trilha de qualquer item: lance ou disputa de pênaltis, pelo id. */
export function trilhaDoItem(id: string, n: NumerosDoItem): Trilha {
  return ehItemPenaltis(id) ? trilhaDaDisputa(n.gols, n.vitorias ?? 0) : trilhaDoLance(n.gols, n.recriados);
}

export type FiltroAlbum = 'todos' | 'meus' | 'perto';

/** Um item da tela única (regra nova): lance de falta ou cara a cara, ou disputa histórica. */
export interface ItemDaLista {
  /** A chave das medalhas: o id do lance, `penaltis:<disputa>` (itemPenaltis). */
  id: string;
  /** Id de times.ts ou "selecao". */
  clube: string;
}

/**
 * A tela única dos Lances (seção 14.7): "Todos" e "Meus troféus" com favoritos →
 * seu time → Seleção → outros (cada grupo na ordem de chegada). "Meus troféus" mostra só itens com medalha.
 * "Perto do próximo" ordena pelo que falta para a próxima medalha (gols; na disputa com os gols feitos, as
 * vitórias), com os favoritos no topo e o ouro completo no fim. Sem medalhas lidas, passe um mapa vazio.
 */
export function ordenarTelaUnica<T extends ItemDaLista>(
  itens: readonly T[],
  medalhas: ReadonlyMap<string, NumerosDoItem>,
  filtro: FiltroAlbum,
  favoritos: ReadonlySet<string>,
  timeId: string,
): T[] {
  const de = (id: string) => medalhas.get(id) ?? { gols: 0, recriados: 0, vitorias: 0 };
  const progresso = (id: string) => progressoDoItem(id, de(id));
  const falta = (id: string) => {
    const p = progresso(id).proxima;
    if (!p) return Infinity;
    return p.faltamGols || p.faltamVitorias || 0;
  };
  const fav = (id: string) => (favoritos.has(id) ? 0 : 1);
  const grupo = (i: ItemDaLista) => (i.clube === timeId ? 0 : i.clube === 'selecao' ? 1 : 2);
  return itens
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => filtro !== 'meus' || progresso(item.id).medalha !== null)
    .sort((a, b) => {
      if (filtro === 'perto') {
        if (fav(a.item.id) !== fav(b.item.id)) return fav(a.item.id) - fav(b.item.id);
        const fa = falta(a.item.id);
        const fb = falta(b.item.id);
        if (fa !== fb) return fa < fb ? -1 : 1;
        if (de(a.item.id).gols !== de(b.item.id).gols) return de(b.item.id).gols - de(a.item.id).gols;
        return a.i - b.i;
      }
      if (fav(a.item.id) !== fav(b.item.id)) return fav(a.item.id) - fav(b.item.id);
      if (grupo(a.item) !== grupo(b.item)) return grupo(a.item) - grupo(b.item);
      return a.i - b.i;
    })
    .map(({ item }) => item);
}

export interface LinhaMedalha {
  lance_id: string;
  gols: number;
  recriados: number;
  /** Regra nova: vitórias nas disputas de pênaltis (os itens `penaltis:…`); 0 nos lances. */
  vitorias?: number;
  medalha: Medalha | null;
}

export interface FichaDoLance {
  titulo: string;
  clube: string;
}

export interface MedalhaDoLanceMontada {
  lanceId: string;
  titulo: string;
  clube: string;
  gols: number;
  recriados: number;
  /** Só nas disputas de pênaltis. */
  vitorias: number;
  /** Item de pênaltis (disputa histórica): medalha por 10 · 50 · 100 gols e 10 vitórias. */
  penaltis: boolean;
  progresso: Progresso;
}

export interface MedalhasDoClube {
  clube: string;
  bronze: number;
  prata: number;
  ouro: number;
  lances: number;
}

const PESO: Record<Medalha, number> = { bronze: 1, prata: 2, ouro: 3 };
const pesoDe = (m: Medalha | null) => (m ? PESO[m] : 0);

/**
 * Monta "Suas medalhas": por clube (quantas de cada) e por lance (título, gols, quanto falta). Lance que
 * saiu do catálogo e lance sem nenhum gol não aparecem. Ordena por medalha maior, depois por gols.
 * Os itens de pênaltis (`penaltis:…`) só entram se `ficha` devolver algo para eles (a tela decide pela regra nova);
 * a medalha deles segue a régua dos pênaltis.
 */
export function montarMedalhas(
  linhas: readonly LinhaMedalha[],
  ficha: (id: string) => FichaDoLance | undefined,
): { porClube: MedalhasDoClube[]; porLance: MedalhaDoLanceMontada[] } {
  const porLance: MedalhaDoLanceMontada[] = [];
  const clubes = new Map<string, MedalhasDoClube>();
  for (const l of linhas) {
    const f = ficha(l.lance_id);
    if (!f || l.gols <= 0) continue;
    const penaltis = ehItemPenaltis(l.lance_id);
    const vitorias = penaltis ? (l.vitorias ?? 0) : 0;
    const progresso = progressoDoItem(l.lance_id, { gols: l.gols, recriados: l.recriados, vitorias });
    porLance.push({ lanceId: l.lance_id, titulo: f.titulo, clube: f.clube, gols: l.gols, recriados: l.recriados, vitorias, penaltis, progresso });
    const c = clubes.get(f.clube) ?? { clube: f.clube, bronze: 0, prata: 0, ouro: 0, lances: 0 };
    c.lances++;
    if (progresso.medalha) c[progresso.medalha]++;
    clubes.set(f.clube, c);
  }
  porLance.sort((a, b) => pesoDe(b.progresso.medalha) - pesoDe(a.progresso.medalha) || b.gols - a.gols || a.titulo.localeCompare(b.titulo));
  const porClube = [...clubes.values()].sort(
    (a, b) => b.ouro - a.ouro || b.prata - a.prata || b.bronze - a.bronze || b.lances - a.lances || a.clube.localeCompare(b.clube),
  );
  return { porClube, porLance };
}

export interface LinhaVitrine {
  time_id: string;
  bronze: number;
  prata: number;
  ouro: number;
}

/** Vitrine das torcidas: ordenada por ouro, depois prata e bronze; torcida sem medalha fica de fora. */
export function ordenarVitrine(linhas: readonly LinhaVitrine[]): LinhaVitrine[] {
  return linhas
    .filter((l) => l.ouro + l.prata + l.bronze > 0)
    .sort((a, b) => b.ouro - a.ouro || b.prata - a.prata || b.bronze - a.bronze || a.time_id.localeCompare(b.time_id));
}

export const CONQUISTAS_VAZIO = 'Ainda sem medalhas. Joga os Lances do Jogo valendo: 5 gols no mesmo lance já dão o bronze.';
