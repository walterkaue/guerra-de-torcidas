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
