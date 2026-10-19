// Escolha de frases do narrador (regras na seção 2 do docs/narrador.md).
// Módulo puro: recebe o gerador aleatório de fora. Use SEMPRE um gerador próprio do
// narrador (ex.: Math.random), nunca a semente da partida, para não mexer na física.

import { FRASES, type EventoNarrador, type Frase } from './frases';

export type Artigo = 'o' | 'a';

export interface TimeNarrado {
  nome: string;
  artigo: Artigo;
}

export interface ContextoNarrador {
  /** Ausente para quem escolheu "Outro time": aí nenhuma frase de time ou rival sai. */
  time?: TimeNarrado;
  rival?: TimeNarrado;
  apelido?: string;
  desafiante?: string;
  placar?: string;
  pontos?: number;
  dif?: string;
  horas?: string;
  posicao?: string;
  /** Cidade (fase 1.5): vai sempre sem preposição antes ("{cidade} tá em 3º"). */
  cidade?: string;
  cidadeRival?: string;
  uf?: string;
  /** Número do narrador no par ou ímpar. */
  numero?: number;
  /** Frases (texto original) já usadas nesta partida: nunca repetem. */
  usadas?: ReadonlySet<string>;
  /** Últimas ~30 frases vistas neste aparelho: evitadas enquanto houver outra opção. */
  recentes?: readonly string[];
  /** O que é verdade no lance (ver lance.ts). Frase com etiqueta só sai se todas estiverem aqui. */
  etiquetas?: ReadonlySet<Etiqueta>;
}

/** Etiquetas de lance da tabela do docs/narrador.md (seção 2). */
export const ETIQUETAS = [
  'canto', 'meio', 'alto', 'baixo', 'fraca', 'goleiro_outro_lado', 'travessao',
  'pulou_outro_lado', 'mesma_coluna', 'nao_pulou', 'dica_honesta', 'cobranca', 'defesa',
] as const;

export type Etiqueta = (typeof ETIQUETAS)[number];

export interface FraseEscolhida {
  /** Texto original do banco (chave para "usadas" e "recentes"). */
  id: string;
  texto: string;
}

export const PESO_RARA = 0.1;

/** Frase com etiqueta que combina com o lance vale o dobro no sorteio. */
export const PESO_ETIQUETA = 2;

/** Até ~75 caracteres depois da troca, para caber em 2 linhas em 390 px. */
export const MAX_CARACTERES = 75;

/**
 * Situações que aparecem no grito do narrador e no card: frase que passar do limite
 * depois da troca (ex.: apelido de 20 letras repetido) é pulada, como variável faltando.
 */
const COM_LIMITE: ReadonlySet<EventoNarrador> = new Set<EventoNarrador>([
  'abertura', 'gol', 'gol_angulo', 'cavadinha', 'cavadinha_falhou', 'trave_gol', 'trave',
  'fora_cima', 'fora_lado', 'goleiro_pegou', 'defesa', 'sofreu_gol', 'decisiva',
  'morte_subita', 'par_ou_impar_escolha', 'par_ou_impar_ganhou', 'par_ou_impar_perdeu',
  'maquina_fora', 'vitoria', 'derrota', 'cinco_cobrancas', 'cinco_defesas',
  'desafio_convite', 'desafio_vitoria', 'desafio_derrota',
]);

export const temLimite = (ev: EventoNarrador) => COM_LIMITE.has(ev);

export const VARIAVEIS = [
  'o_time', 'do_time', 'pro_time', 'no_time',
  'o_rival', 'do_rival', 'pro_rival', 'no_rival',
  'apelido', 'desafiante', 'placar', 'pontos', 'dif', 'horas', 'posicao',
  'cidade', 'cidade_rival', 'uf', 'numero',
] as const;

type Variavel = (typeof VARIAVEIS)[number];

const CONTRACOES: Record<Artigo, { do: string; pro: string; no: string }> = {
  o: { do: 'do', pro: 'pro', no: 'no' },
  a: { do: 'da', pro: 'pra', no: 'na' },
};

function valores(ctx: ContextoNarrador): Partial<Record<Variavel, string>> {
  const v: Partial<Record<Variavel, string>> = {};
  const comArtigo = (prefixo: 'time' | 'rival', t?: TimeNarrado) => {
    if (!t) return;
    const c = CONTRACOES[t.artigo];
    v[`o_${prefixo}`] = `${t.artigo} ${t.nome}`;
    v[`do_${prefixo}`] = `${c.do} ${t.nome}`;
    v[`pro_${prefixo}`] = `${c.pro} ${t.nome}`;
    v[`no_${prefixo}`] = `${c.no} ${t.nome}`;
  };
  comArtigo('time', ctx.time);
  // Sem time (Outro time) também não tem rival.
  if (ctx.time) comArtigo('rival', ctx.rival);
  if (ctx.apelido) v.apelido = ctx.apelido;
  if (ctx.desafiante) v.desafiante = ctx.desafiante;
  if (ctx.placar) v.placar = ctx.placar;
  if (ctx.pontos !== undefined) v.pontos = String(ctx.pontos);
  if (ctx.dif) v.dif = ctx.dif;
  if (ctx.horas) v.horas = ctx.horas;
  if (ctx.posicao) v.posicao = ctx.posicao;
  if (ctx.cidade) v.cidade = ctx.cidade;
  if (ctx.cidadeRival) v.cidade_rival = ctx.cidadeRival;
  if (ctx.uf) v.uf = ctx.uf;
  if (ctx.numero !== undefined) v.numero = String(ctx.numero);
  return v;
}

/** Variáveis usadas por uma frase do banco. */
export function variaveisDa(frase: string): string[] {
  return [...frase.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

/**
 * Troca as variáveis. Devolve null se faltar alguma (a frase é pulada).
 * Variável que abre a frase, ou vem depois de ". ", "! " ou "? ", ganha maiúscula ("O Flamengo").
 */
export function preencher(frase: string, ctx: ContextoNarrador): string | null {
  const v = valores(ctx);
  let faltou = false;
  const texto = frase.replace(/\{(\w+)\}/g, (_m, nome: string, pos: number) => {
    const valor = v[nome as Variavel];
    if (valor === undefined) {
      faltou = true;
      return '';
    }
    const antes = frase.slice(0, pos);
    return antes === '' || /[.!?]\s+$/.test(antes) ? maiuscula(valor) : valor;
  });
  return faltou ? null : maiuscula(texto);
}

const maiuscula = (s: string) => s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1);

const pesoDa = (f: Frase) => (f.rara ? PESO_RARA : 1) * (f.e?.length ? PESO_ETIQUETA : 1);

/** Frase sem etiqueta vale para qualquer lance; com etiqueta, só se todas forem verdadeiras. */
export const combina = (f: Frase, etiquetas: ReadonlySet<string> = new Set()) =>
  !f.e || f.e.every((e) => etiquetas.has(e));

function sortearComPeso(lista: readonly Frase[], rng: () => number): Frase {
  const pesos = lista.map(pesoDa);
  let alvo = rng() * pesos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lista.length; i++) {
    alvo -= pesos[i];
    if (alvo < 0) return lista[i];
  }
  return lista[lista.length - 1];
}

/** Escolhe uma frase para o evento, ou null se nenhuma servir (ex.: só frases com rival e sem rival). */
export function escolherFrase(
  evento: EventoNarrador,
  ctx: ContextoNarrador,
  rng: () => number,
): FraseEscolhida | null {
  const limite = COM_LIMITE.has(evento);
  const validas = (FRASES[evento] as readonly Frase[]).filter((f) => {
    if (!combina(f, ctx.etiquetas)) return false;
    const t = preencher(f.t, ctx);
    return t !== null && (!limite || t.length <= MAX_CARACTERES);
  });
  if (!validas.length) return null;

  const usadas = ctx.usadas ?? new Set<string>();
  const recentes = new Set(ctx.recentes ?? []);
  const ineditas = validas.filter((f) => !usadas.has(f.t));
  const frescas = ineditas.filter((f) => !recentes.has(f.t));
  // Ordem de preferência: nem na partida nem nas recentes > só fora da partida > qualquer uma.
  const opcoes = frescas.length ? frescas : ineditas.length ? ineditas : validas;

  const f = sortearComPeso(opcoes, rng);
  return { id: f.t, texto: preencher(f.t, ctx)! };
}
