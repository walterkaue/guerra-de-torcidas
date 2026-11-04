// Textos e montagem dos Lances do Jogo valendo (docs/jogo.md, seção 7.3): emoji de cada lance, texto de
// compartilhar, escolha do texto do resultado, progresso das medalhas e a vitrine das torcidas.
// Puro: sem DOM, sem servidor e sem relógio. A tela e o card só desenham o que sai daqui.

import { MEDALHAS, medalhaDoLance, type DesfechoLance, type Medalha } from './lances.ts';

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

/** Texto de compartilhar: um emoji por lance, os pontos e o link. */
export function textoDeCompartilhar(d: {
  desfechos: readonly DesfechoLance[];
  pontos: number;
  paraTime: string | null;
  link: string;
  /** "Bronze no lance Gol do título!" */
  medalha?: string | null;
}): string {
  const quanto = `${d.pontos} ${d.pontos === 1 ? 'ponto' : 'pontos'}${d.paraTime ? ` ${d.paraTime}` : ''}`;
  return [
    '⚽ Guerra de Torcidas · Lances do Jogo',
    `${emojisDaPartida(d.desfechos)} · ${quanto}`,
    ...(d.medalha ? [d.medalha] : []),
    d.link,
  ].join('\n');
}

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
}): SituacaoDoResultado {
  if (!d.fechou) return { tipo: 'sem_pontos', texto: d.aviso ?? 'Partida sem valer pontos.' };
  if (d.sobSuspeita) return { tipo: 'suspeita', texto: 'Essa ficou fora do ranking até a gente conferir.' };
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

export const AVISO_LIMITE_DO_DIA = 'Hoje já deu: 6 partidas valendo. O treino continua liberado.';

/** "Valendo hoje: 2 de 6" (null sem resposta do servidor). */
export function linhaValendoHoje(h: { feitas: number; limite: number } | null): string | null {
  if (!h || !(h.limite > 0)) return null;
  return `Valendo hoje: ${Math.min(h.feitas, h.limite)} de ${h.limite}`;
}

/** "Bronze no lance Gol do título!" */
export const textoDaMedalhaNova = (medalha: Medalha, titulo: string): string => `${NOME_DA_MEDALHA[medalha]} no lance ${titulo}!`;

// ---------- medalhas e progresso ----------

export interface Progresso {
  medalha: Medalha | null;
  /** Null quando já é ouro. */
  proxima: { medalha: Medalha; faltamGols: number; faltamRecriados: number } | null;
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
  /** Barra própria de recriados: o ouro pede 10. */
  recriadosDoOuro: { feitos: number; pede: number };
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

export type FiltroAlbum = 'todos' | 'meus' | 'perto';

/**
 * Álbum: "Todos" (ordem do catálogo), "Meus troféus" (só lances com medalha) e "Perto do próximo" (pelos gols
 * que faltam pra próxima medalha; ouro completo vai pro fim). Favoritos sempre primeiro.
 */
export function filtrarAlbum<T extends { id: string }>(
  lances: readonly T[],
  medalhas: ReadonlyMap<string, { gols: number; recriados: number }>,
  filtro: FiltroAlbum,
  favoritos: ReadonlySet<string>,
): T[] {
  const de = (id: string) => medalhas.get(id) ?? { gols: 0, recriados: 0 };
  const falta = (id: string) => progressoDaMedalha(de(id).gols, de(id).recriados).proxima?.faltamGols ?? Infinity;
  const fav = (id: string) => (favoritos.has(id) ? 0 : 1);
  return lances
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => filtro !== 'meus' || medalhaDoLance(de(l.id).gols, de(l.id).recriados) !== null)
    .sort((a, b) => {
      if (fav(a.l.id) !== fav(b.l.id)) return fav(a.l.id) - fav(b.l.id);
      if (filtro === 'perto') {
        const fa = falta(a.l.id);
        const fb = falta(b.l.id);
        if (fa !== fb) return fa < fb ? -1 : 1;
        if (de(a.l.id).gols !== de(b.l.id).gols) return de(b.l.id).gols - de(a.l.id).gols;
      }
      return a.i - b.i;
    })
    .map(({ l }) => l);
}

export interface LinhaMedalha {
  lance_id: string;
  gols: number;
  recriados: number;
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
    const progresso = progressoDaMedalha(l.gols, l.recriados);
    porLance.push({ lanceId: l.lance_id, titulo: f.titulo, clube: f.clube, gols: l.gols, recriados: l.recriados, progresso });
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
