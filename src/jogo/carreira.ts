// Carreira do jogador (docs/jogo.md, seção 5, "Longo prazo"). Puro: sem DOM nem relógio.
// O XP é calculado só no servidor (supabase/migrations/20261026200000_carreira.sql, carreira_xp_dia);
// aqui ficam a mesma conta (para testar e explicar), os níveis e os textos. Só da própria pessoa:
// nenhuma lista, nenhum apelido. Textos neutros de gênero.

export const NIVEIS = [
  { nome: 'Estreante', xp: 0 },
  { nome: 'Reserva', xp: 100 },
  { nome: 'Titular', xp: 1_000 },
  { nome: 'Craque', xp: 5_000 },
  { nome: 'Ídolo', xp: 15_000 },
  { nome: 'Lenda', xp: 30_000 },
] as const;

export type NomeNivel = (typeof NIVEIS)[number]['nome'];

/** XP por partida válida no dia: 10 nas 5 primeiras, 5 da 6ª à 15ª, zero depois. */
export const XP_PRIMEIRAS = 10;
export const XP_SEGUINTES = 5;
export const PARTIDAS_CHEIAS = 5;
export const PARTIDAS_COM_XP = 15;
export const BONUS_DIA = 100;
export const BONUS_SEMANA = 200;

/** XP de um dia com `partidas` válidas (Time do Dia e cada rodada palpitada do Crava contam como 1). */
export function xpDoDia(partidas: number): number {
  const n = Math.max(0, Math.floor(partidas));
  return Math.min(n, PARTIDAS_CHEIAS) * XP_PRIMEIRAS + Math.max(0, Math.min(n, PARTIDAS_COM_XP) - PARTIDAS_CHEIAS) * XP_SEGUINTES;
}

/** XP que a próxima partida do dia vale, depois de `partidas` já feitas hoje. */
export function xpDaProxima(partidas: number): number {
  return xpDoDia(partidas + 1) - xpDoDia(partidas);
}

export interface Nivel {
  nome: NomeNivel;
  /** 0 (Estreante) a 5 (Lenda). */
  indice: number;
  /** Próximo nível, ou null na Lenda. */
  proximo: NomeNivel | null;
  /** XP que falta para o próximo (0 na Lenda). */
  faltam: number;
  /** Quanto da barra até o próximo nível está cheio, de 0 a 1 (1 na Lenda). */
  fracao: number;
}

export function nivelDe(xp: number): Nivel {
  const x = Math.max(0, xp);
  let i = 0;
  while (i + 1 < NIVEIS.length && x >= NIVEIS[i + 1].xp) i++;
  const atual = NIVEIS[i];
  const prox = NIVEIS[i + 1];
  if (!prox) return { nome: atual.nome, indice: i, proximo: null, faltam: 0, fracao: 1 };
  return {
    nome: atual.nome,
    indice: i,
    proximo: prox.nome,
    faltam: prox.xp - x,
    fracao: (x - atual.xp) / (prox.xp - atual.xp),
  };
}

/** Nome do nível novo quando o XP passou de um nível para outro; null se continuou no mesmo. */
export function subiuPara(xpAntes: number, xpAgora: number): NomeNivel | null {
  const antes = nivelDe(xpAntes);
  const agora = nivelDe(xpAgora);
  return agora.indice > antes.indice ? agora.nome : null;
}

/** O que o servidor devolve em minha_carreira(). */
export interface Carreira {
  xp: number;
  /** Partidas válidas de hoje (Brasília) que já entraram na carreira. */
  partidasHoje: number;
  /** Bônus mais recente dos últimos 7 dias, se houver. */
  bonus: { tipo: 'dia' | 'semana'; referencia: string } | null;
}

const xp = (n: number) => `${n.toLocaleString('pt-BR')} XP`;

/** "Faltam 230 XP pra Titular" (ou o recado da Lenda). */
export function linhaFalta(n: Nivel): string {
  return n.proximo ? `Faltam ${xp(n.faltam)} pra ${n.proximo}` : 'Lenda: topo da carreira.';
}

/** Recado do dia: quanto a próxima partida ainda vale. */
export function linhaHoje(partidasHoje: number): string {
  const prox = xpDaProxima(partidasHoje);
  return prox > 0 ? `Próxima partida de hoje: +${prox} XP` : 'XP de hoje completo. Amanhã tem mais.';
}

/** "+100 XP: 1º do dia entre todos" (só a própria conquista; nunca quem ficou atrás). */
export function linhaBonus(b: Carreira['bonus']): string | null {
  if (!b) return null;
  return b.tipo === 'dia'
    ? `+${xp(BONUS_DIA)}: 1º do dia entre todos (${dataCurta(b.referencia)})`
    : `+${xp(BONUS_SEMANA)}: 1º da sua torcida na semana de ${dataCurta(b.referencia)}`;
}

const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Resultado: "+10 XP · Titular" ou, ao subir, "Subiu pra Titular!". Null quando o XP não mudou. */
export function linhaResultado(xpAntes: number | null, xpAgora: number): { texto: string; subiu: boolean } | null {
  if (xpAntes === null || xpAgora <= xpAntes) return null;
  const novo = subiuPara(xpAntes, xpAgora);
  if (novo) return { texto: `Subiu pra ${novo}!`, subiu: true };
  return { texto: `+${xp(xpAgora - xpAntes)} na carreira · ${nivelDe(xpAgora).nome}`, subiu: false };
}
