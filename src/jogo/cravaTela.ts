// Apoio puro da aba Palpites: rodada em foco, estado de cada jogo, horários e textos dos cards.

import { linhaEmoji, ordinalRodada, palpiteContra, pontosDaRodada, type Acerto, type Placar, type PontosDoJogo } from './crava';
import { STATUS_ADIADO } from './footballData';

/** Aviso fixo do Crava (docs/jogo.md, seção 7): topo da tela e todo card. */
export const AVISO_RESENHA = 'Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca.';

export interface JogoBasico {
  id: string;
  rodada: number;
  inicio: string;
  status_api: string;
  confirmado_em: string | null;
  anulado: boolean;
  /** Jogo especial (rodada de um jogo só): a competição. Ausente ou null nas rodadas do Brasileirão. */
  competicao?: string | null;
  fase?: string | null;
}

export type Fase = 'aberto' | 'rolando' | 'confirmado' | 'anulado';

export function faseDoJogo(j: JogoBasico, agora: Date): Fase {
  if (j.anulado) return 'anulado';
  if (j.confirmado_em) return 'confirmado';
  return agora.getTime() < Date.parse(j.inicio) ? 'aberto' : 'rolando';
}

export const adiado = (j: JogoBasico) => !j.confirmado_em && !j.anulado && STATUS_ADIADO.includes(j.status_api);

/** Jogo especial: o que tem competição (final da Copa do Brasil etc.). Cada um é uma rodada só dele. */
export const ehEspecial = (j: { competicao?: string | null }): boolean => j.competicao != null;

/** "Final da Copa do Brasil"; "Copa Intercontinental · Quartas". Sem fase, só a competição. */
export function tituloDoEspecial(competicao: string, fase: string | null | undefined): string {
  const f = fase?.trim();
  return f ? `${competicao} · ${f}` : competicao;
}

/** O título do jogo especial, ou null se o jogo é do Brasileirão. */
export const tituloDoJogo = (j: { competicao?: string | null; fase?: string | null }): string | null =>
  j.competicao == null ? null : tituloDoEspecial(j.competicao, j.fase);

type JogoComTitulo = { rodada: number; competicao?: string | null; fase?: string | null };

/** O título da rodada se ela é um jogo especial; null nas rodadas do Brasileirão. */
export function tituloDaRodadaEspecial(jogos: readonly JogoComTitulo[], rodada: number): string | null {
  const j = jogos.find((x) => x.rodada === rodada && x.competicao != null);
  return j ? tituloDoJogo(j) : null;
}

/** Como a rodada se chama na tela: "33ª rodada" ou o título do especial (nunca "1001ª rodada"). */
export function nomeDaRodada(jogos: readonly JogoComTitulo[], rodada: number): string {
  return tituloDaRodadaEspecial(jogos, rodada) ?? `${ordinalRodada(rodada)} rodada`;
}

/** Faixa neutra do time de fora: só o nome, sem cor de clube nem escudo (contraste bem acima de 4,5:1). */
export const FAIXA_DE_FORA = { fundo: '#2b2f36', texto: '#f2f3f5' } as const;

export interface LadoDoJogo {
  /** Id de um dos 20 times; null no time de fora. */
  id: string | null;
  nome: string;
  fora: boolean;
}

/** Um lado do jogo: um dos 20 (nome pelo `nomeDoTime`) ou o time de fora, só com o nome vindo do servidor. */
export function ladoDoJogo(
  j: { mandante_id: string | null; visitante_id: string | null; mandante_fora?: string | null; visitante_fora?: string | null },
  lado: 'm' | 'v',
  nomeDoTime: (id: string) => string,
): LadoDoJogo {
  const id = lado === 'm' ? j.mandante_id : j.visitante_id;
  if (id) return { id, nome: nomeDoTime(id), fora: false };
  return { id: null, nome: (lado === 'm' ? j.mandante_fora : j.visitante_fora)?.trim() || 'Time de fora', fora: true };
}

/** Até quantos dias antes um jogo especial entra na conta da rodada em foco. */
export const ANTECEDENCIA_ESPECIAL_MS = 7 * 24 * 3600_000;

interface RodadaNoTempo {
  numero: number;
  mediana: number;
  primeiro: number;
  especial: boolean;
}

/** Cada rodada com a data típica (mediana dos inícios, que ignora um jogo adiado para dezembro), na ordem do tempo. */
function rodadasComData(jogos: readonly Pick<JogoBasico, 'rodada' | 'inicio' | 'competicao'>[]): RodadaNoTempo[] {
  const porRodada = new Map<number, { inicios: number[]; especial: boolean }>();
  for (const j of jogos) {
    if (!porRodada.has(j.rodada)) porRodada.set(j.rodada, { inicios: [], especial: false });
    const r = porRodada.get(j.rodada)!;
    r.inicios.push(Date.parse(j.inicio));
    if (ehEspecial(j)) r.especial = true;
  }
  return [...porRodada.entries()]
    .map(([numero, r]) => {
      const inicios = r.inicios.sort((x, y) => x - y);
      return { numero, mediana: inicios[Math.floor(inicios.length / 2)], primeiro: inicios[0], especial: r.especial };
    })
    .sort((x, y) => x.mediana - y.mediana || x.numero - y.numero);
}

/** As rodadas na ordem do tempo (jogos especiais entram no lugar da data deles), para o ‹ › da aba Palpites. */
export const rodadasNoTempo = (jogos: readonly Pick<JogoBasico, 'rodada' | 'inicio' | 'competicao'>[]): number[] =>
  rodadasComData(jogos).map((r) => r.numero);

/**
 * Rodada que a aba abre. Candidatas: todas as do Brasileirão e os jogos especiais que começam em até 7 dias.
 * Ordem do tempo (mediana dos inícios, depois o número); abre a primeira cuja data não ficou mais de 36 h
 * para trás, ou a última candidata.
 */
export function rodadaEmFoco(
  jogos: readonly Pick<JogoBasico, 'rodada' | 'inicio' | 'competicao'>[],
  agora: Date,
): number | null {
  const limiteEspecial = agora.getTime() + ANTECEDENCIA_ESPECIAL_MS;
  const candidatas = rodadasComData(jogos).filter((c) => !c.especial || c.primeiro <= limiteEspecial);
  if (!candidatas.length) return null;
  const limite = agora.getTime() - 36 * 3600_000;
  return (candidatas.find((c) => c.mediana >= limite) ?? candidatas[candidatas.length - 1]).numero;
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** "sáb 24/10 · 16h" ou "sáb 24/10 · 18h30", em horário de Brasília (UTC−3 fixo). */
export function horaDoJogo(inicio: string): string {
  const b = new Date(Date.parse(inicio) - 3 * 3600_000);
  const dd = String(b.getUTCDate()).padStart(2, '0');
  const mm = String(b.getUTCMonth() + 1).padStart(2, '0');
  const min = b.getUTCMinutes();
  return `${DIAS[b.getUTCDay()]} ${dd}/${mm} · ${b.getUTCHours()}h${min ? String(min).padStart(2, '0') : ''}`;
}

/** "6 horas", "1 hora", "40 minutos" (variável {horas} do narrador). */
export function tempoAte(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  const h = Math.floor(min / 60);
  return `${h} ${h === 1 ? 'hora' : 'horas'}`;
}

export interface LinhaMeuPalpite {
  mandante: string;
  visitante: string;
  placar: Placar;
  certeza: boolean;
}

/** "2 x 1". */
export const placarTexto = (p: Placar): string => `${p.m} x ${p.v}`;

/** Nome curto de cada acerto, para o selo do cartão (o emoji sozinho não diz nada ao leitor de tela). */
export const NOME_DO_ACERTO: Record<Acerto, string> = {
  exato: 'Na mosca',
  saldo: 'Vencedor e saldo',
  vencedor: 'Só o vencedor',
  errou: 'Errou',
};

/** Rótulo curto embaixo do número de pontos: "pontos", "ponto" ou "pontos pro Flamengo". */
export function rotuloDePontos(pontos: number, paraTime: string | null): string {
  return `${pontos === 1 ? 'ponto' : 'pontos'}${paraTime ? ` ${paraTime}` : ''}`;
}

/** Quantos jogos com resultado foram certeiros (qualquer acerto, menos "errou"). */
export function acertosDaRodada(resultados: readonly Pick<PontosDoJogo, 'acerto'>[]): { acertos: number; jogos: number } {
  const jogos = resultados.filter((r) => r.acerto !== null);
  return { acertos: jogos.filter((r) => r.acerto !== 'errou').length, jogos: jogos.length };
}

/** Texto do card "Meus palpites" (antes): só os placares cravados e o jogo da certeza. */
export function textoMeusPalpites(rodada: number | string, linhas: readonly LinhaMeuPalpite[], link: string): string {
  return [
    // Texto = título do jogo especial.
    typeof rodada === 'string' ? `Meus palpites, ${rodada}:` : `Meus palpites da ${ordinalRodada(rodada)} rodada:`,
    ...linhas.map((l) => `${l.mandante} ${l.placar.m} x ${l.placar.v} ${l.visitante}${l.certeza ? ' ⭐' : ''}`),
    '',
    AVISO_RESENHA,
    link,
  ].join('\n');
}

/** Texto do card "Resultado da rodada": pontos {pro_time} e a linha de emoji. */
export function textoResultadoRodada(
  /** O número da rodada, ou o título do jogo especial. */
  rodada: number | string,
  pontos: number,
  paraTime: string | null,
  resultados: readonly Pick<PontosDoJogo, 'acerto' | 'certeza'>[],
  link: string,
): string {
  return [
    `Palpite da Rodada, ${typeof rodada === 'string' ? rodada : ordinalRodada(rodada)}: ${pontos} pontos${paraTime ? ` ${paraTime}` : ''}`,
    linhaEmoji(resultados),
    '',
    AVISO_RESENHA,
    link,
  ].join('\n');
}

export interface ResumoDoBrasileirao {
  pontos: number;
  /** Rodadas do Brasileirão com palpite em jogo confirmado. */
  rodadas: number;
  exatos: number;
  saldos: number;
  vencedores: number;
  posicao: number;
  total: number;
}

/** "🎯 5 ✅ 12 👍 20": os acertos do Brasileirão inteiro (❌ não entra). */
export const linhaAcertosDoBrasileirao = (r: Pick<ResumoDoBrasileirao, 'exatos' | 'saldos' | 'vencedores'>): string =>
  `🎯 ${r.exatos} ✅ ${r.saldos} 👍 ${r.vencedores}`;

/** Texto do card "Resultado do Brasileirão", em 1ª pessoa: 2 linhas antes do aviso e do link. */
export function textoResultadoBrasileirao(r: ResumoDoBrasileirao, paraTime: string | null, link: string): string {
  return [
    `Fechei o Palpite da Rodada no Brasileirão: ${r.pontos} pontos${paraTime ? ` ${paraTime}` : ''}`,
    `${linhaAcertosDoBrasileirao(r)} · ${r.posicao}º de ${r.total}`,
    '',
    AVISO_RESENHA,
    link,
  ].join('\n');
}

export interface JogoComPlacar extends JogoBasico {
  gols_mandante: number | null;
  gols_visitante: number | null;
}

/**
 * Os números do card "Resultado do Brasileirão": pontos, rodadas palpitadas (com palpite em jogo confirmado),
 * a contagem de 🎯 ✅ 👍 e a posição. Só rodadas do Brasileirão; cada uma com a própria certeza.
 * Null sem posição (quem nunca palpitou no Brasileirão não tem card).
 */
export function resumoDoBrasileirao(
  jogos: readonly JogoComPlacar[],
  palpites: ReadonlyMap<string, Placar>,
  certezas: ReadonlyMap<number, string>,
  posicao: { posicao: number; total: number; pontos: number } | null,
): ResumoDoBrasileirao | null {
  if (!posicao) return null;
  const porRodada = new Map<number, JogoComPlacar[]>();
  for (const j of jogos) {
    if (ehEspecial(j)) continue;
    if (!porRodada.has(j.rodada)) porRodada.set(j.rodada, []);
    porRodada.get(j.rodada)!.push(j);
  }
  let rodadas = 0;
  let exatos = 0;
  let saldos = 0;
  let vencedores = 0;
  for (const [rodada, lista] of porRodada) {
    const resultados = pontosDaRodada(
      lista.map((j) => ({
        id: j.id,
        confirmadoEm: j.confirmado_em,
        placar: j.gols_mandante === null || j.gols_visitante === null ? null : { m: j.gols_mandante, v: j.gols_visitante },
        anulado: j.anulado,
      })),
      palpites,
      certezas.get(rodada) ?? null,
    ).filter((r) => r.acerto !== null);
    if (!resultados.length) continue;
    rodadas++;
    for (const r of resultados) {
      if (r.acerto === 'exato') exatos++;
      else if (r.acerto === 'saldo') saldos++;
      else if (r.acerto === 'vencedor') vencedores++;
    }
  }
  return { pontos: posicao.pontos, rodadas, exatos, saldos, vencedores, posicao: posicao.posicao, total: posicao.total };
}

/** "Você foi o 37º de 412". */
export const linhaPosicaoFinal = (p: { posicao: number; total: number }): string => `Você foi o ${p.posicao}º de ${p.total}`;

/** A torcida que mais pontuou no Brasileirão: a 1ª do ranking com palpiteiros; null se ninguém pontuou. */
export function torcidaQueMaisPontuou(ranking: readonly { time_id: string; palpiteiros: number; posicao: number }[]): string | null {
  const lider = [...ranking].sort((a, b) => a.posicao - b.posicao).find((l) => l.palpiteiros > 0);
  return lider?.time_id ?? null;
}

/**
 * Palpite de derrota do próprio time, num jogo em que um lado pode ser time de fora (id null). Só vale quando
 * o seu time está no jogo.
 */
export function palpiteContraNoJogo(
  p: Placar,
  j: { mandante_id: string | null; visitante_id: string | null },
  meuTime: string | null | undefined,
): boolean {
  if (!meuTime || (meuTime !== j.mandante_id && meuTime !== j.visitante_id)) return false;
  return palpiteContra(p, j.mandante_id ?? '', j.visitante_id ?? '', meuTime);
}
