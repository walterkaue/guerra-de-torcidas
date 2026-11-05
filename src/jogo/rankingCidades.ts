// Cidades e estados no Ranking e na Home (docs/jogo.md, seções 3 e 5). Puro: sem DOM, relógio nem servidor.
// Só cidades e estados com 5+ jogadores na semana aparecem; nenhum apelido em lugar nenhum.

import type { EventoNarrador } from '../narrador/frases';

/** Resposta de `minha_cidade_semana` (uma linha; vazio = sem cidade escolhida). */
export interface MinhaCidade {
  /** Código do IBGE: o servidor devolve `integer`. */
  codigo: number;
  nome: string;
  uf: string;
  ativos: number;
  minimo: number;
  faltam: number;
  posicao_estado: number | null;
  cidades_no_estado: number;
  media30: number | null;
  rival_codigo: number | null;
  rival_nome: string | null;
  rival_media30: number | null;
  rival_acima: boolean | null;
  uf_posicao: number | null;
  estados_no_ranking: number;
}

export interface LinhaCidade {
  posicao: number;
  codigo: number;
  nome: string;
  uf: string;
  ativos: number;
  media30: number;
}

export interface LinhaEstado {
  posicao: number;
  uf: string;
  ativos: number;
  media30: number;
}

const DIA_MS = 24 * 3600_000;
/** O lembrete da Home aparece no máximo 1 vez por semana. */
export const INTERVALO_LEMBRETE_DIAS = 7;

/** "Faltam 2 pra sua cidade entrar no ranking. Chama a galera." */
export function textoFaltam(faltam: number): string {
  return `${faltam === 1 ? 'Falta 1' : `Faltam ${faltam}`} pra sua cidade entrar no ranking. Chama a galera.`;
}

/** Linha da Home: "Sua cidade está em 3º em SP" ou o "Faltam N". */
export function linhaDaCidadeNaHome(m: MinhaCidade): string {
  if (m.faltam > 0 || m.posicao_estado === null) return textoFaltam(Math.max(1, m.faltam));
  return `Sua cidade está em ${m.posicao_estado}º em ${m.uf}`;
}

/** Lembrete "Defende sua cidade também?": só depois de jogar, sem cidade, e uma vez por semana. `hoje`/`ultimo`: AAAA-MM-DD. */
export function deveLembrarDaCidade(o: { temCidade: boolean; jogouAlguma: boolean; ultimo?: string; hoje: string }): boolean {
  if (o.temCidade || !o.jogouAlguma) return false;
  if (!o.ultimo) return true;
  const a = Date.parse(`${o.ultimo}T00:00:00Z`);
  const b = Date.parse(`${o.hoje}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return true;
  return b - a >= INTERVALO_LEMBRETE_DIAS * DIA_MS;
}

/** O que a Home guardou do rival da cidade: vale só na semana em que foi visto. */
export interface CidadeVista {
  semana: string;
  acima: Record<string, boolean>;
}

/** Estava acima do rival na última visita *desta semana*? null = sem registro (ou registro de outra semana). */
export function acimaNaUltimaVisita(guardado: Partial<CidadeVista> | null | undefined, semana: string, codigo: number | string): boolean | null {
  if (!guardado || guardado.semana !== semana || !guardado.acima) return null;
  const v = guardado.acima[String(codigo)];
  return typeof v === 'boolean' ? v : null;
}

/** Registro novo para guardar; começa do zero quando a semana mudou. */
export function guardarCidadeVista(guardado: Partial<CidadeVista> | null | undefined, semana: string, codigo: number | string, acima: boolean): CidadeVista {
  const resto = guardado?.semana === semana && guardado.acima ? guardado.acima : {};
  return { semana, acima: { ...resto, [String(codigo)]: acima } };
}

export interface DueloCidade {
  evento: EventoNarrador;
  /** "12 pontos" / "1 ponto": diferença na média dos 30 melhores. */
  dif: string;
  /** A cidade está na frente do rival. */
  frente: boolean;
}

export const formatarDif = (n: number) => {
  // As médias têm duas casas: abaixo de meio ponto, o arredondado daria "0 pontos".
  if (Math.abs(n) < 0.5) return 'menos de 1 ponto';
  const v = Math.round(Math.abs(n));
  return `${v.toLocaleString('pt-BR')} ${v === 1 ? 'ponto' : 'pontos'}`;
};

/**
 * Frase do momento da cidade. Só posição no ranking: nunca origem ou tamanho da cidade.
 * `estavaAcima`: o que o aparelho viu da última vez (para "passou"). `semanaFechada`: campeã do estado.
 * Abaixo do mínimo ou sem rival, não há duelo.
 */
export function situacaoDaCidade(m: MinhaCidade, estavaAcima: boolean | null, semanaFechada = false): DueloCidade | null {
  if (m.faltam > 0 || m.posicao_estado === null || m.media30 === null) return null;
  const dif = formatarDif(m.rival_media30 === null ? 0 : m.media30 - m.rival_media30);
  if (m.posicao_estado === 1 && semanaFechada) return { evento: 'cidade_campea', dif, frente: true };
  if (m.rival_nome === null || m.rival_acima === null) return null;
  const frente = !m.rival_acima;
  if (frente && estavaAcima === true) return { evento: 'cidade_passou', dif, frente };
  return { evento: frente ? 'cidade_frente' : 'cidade_atras', dif, frente };
}

/** Aviso sob o seletor de semana (igual ao da aba Semana). */
export function seloDaSemana(passada: boolean, provisoria: boolean): string | null {
  if (!passada) return null;
  return provisoria ? 'Provisória até segunda 12h: ainda entram placares confirmados do fim de semana.' : 'Semana fechada.';
}

export const EXPLICA_CIDADES =
  'Conta a média das 30 melhores pessoas de cada cidade (100 no estado). Só entra quem tem 5 ou mais jogadores na semana.';

export const textoJogadores = (n: number) => `${n} ${n === 1 ? 'jogador' : 'jogadores'}`;
