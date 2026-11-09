// Vestiário do boneco montável (docs/jogo.md, seção 14.5). Puro: sem DOM, sem servidor e sem relógio.
// Vai também para as funções do Supabase (npm run compartilhar): o servidor usa `validar` antes de gravar.
// A vestimenta guarda só códigos curtos, nunca cores nem rótulos (nada de "pele clara" ou "mulher"):
// as cores saem do time na hora de desenhar (src/telas/bonecoMontavel.ts).

import { NIVEIS } from './carreira.ts';
import { medalhaDoLance, type Medalha } from './lances.ts';
import { medalhaDaDisputa } from './regraLances.ts';

// ---------- a vestimenta (o que vai para o servidor) ----------

export const CORPOS = ['h', 'm'] as const;
/** Índices dos 6 tons de pele do jogo (TONS_DE_PELE em src/telas/bonecos.ts), só a amostra. */
export const PELES = [0, 1, 2, 3, 4, 5] as const;
/** Os 7 cabelos de hoje, com os mesmos ids do `Cabelo` de src/telas/bonecos.ts. */
export const CABELOS = ['raspado', 'curto', 'crespo', 'trancas', 'coque', 'rabo', 'comprido'] as const;
/** Índices das 6 cores de cabelo (CORES_DE_CABELO em src/telas/bonecos.ts). */
export const CORES_DE_CABELO = [0, 1, 2, 3, 4, 5] as const;
export const CAMISAS = ['uni1', 'uni2', 'goleiro'] as const;
/**
 * Camisa por fora (a barra sobre o calção) ou por dentro (o calção por cima). Não é peça: vale para todo mundo, como
 * corpo e número, e não conta nas 26. Campo que chegou depois do v: 1: sem ele, vale 'fora'.
 */
export const BARRAS = ['fora', 'dentro'] as const;
export const CABECAS = ['nenhum', 'testeira'] as const;
export const PUNHOS = ['nenhum', 'munhequeira', 'munhequeira_bronze'] as const;
export const BRACOS = ['nenhum', 'bracadeira'] as const;
export const PEITOS = ['nenhum', 'colete', 'faixa'] as const;
export const PESCOCOS = ['nenhum', 'apito'] as const;
export const CHUTEIRAS = ['neutra', 'time', 'dourada'] as const;
/** "bracos" só aparece no card; no avatar e no vestiário o boneco fica parado. */
export const POSES = ['parado', 'bracos'] as const;
export const FUNDOS = [
  'gramado',
  'arquibancada',
  'estadio_noite',
  'banco',
  'tunel',
  'holofotes',
  'papel_picado',
  'telao',
  'barreira',
  'rede',
  'verde_amarelo',
] as const;
export const MOLDURAS = ['nenhuma', 'dourada', 'galeria'] as const;

/** Número da camisa: 1 ou 2 dígitos ("7" e "07" são diferentes; "0" e "00" valem). null = sem número. */
export const FORMATO_DO_NUMERO = /^[0-9]{1,2}$/;

export interface Vestimenta {
  v: 1;
  corpo: (typeof CORPOS)[number];
  pele: (typeof PELES)[number];
  cabelo: (typeof CABELOS)[number];
  corCabelo: (typeof CORES_DE_CABELO)[number];
  camisa: (typeof CAMISAS)[number];
  barra: (typeof BARRAS)[number];
  numero: string | null;
  cabeca: (typeof CABECAS)[number];
  punho: (typeof PUNHOS)[number];
  braco: (typeof BRACOS)[number];
  peito: (typeof PEITOS)[number];
  pescoco: (typeof PESCOCOS)[number];
  chuteira: (typeof CHUTEIRAS)[number];
  pose: (typeof POSES)[number];
  fundo: (typeof FUNDOS)[number];
  moldura: (typeof MOLDURAS)[number];
}

/** O que entra no lugar de uma peça trancada, desconhecida ou fora do formato (campo a campo). */
export const PADRAO: Readonly<Vestimenta> = {
  v: 1,
  corpo: 'h',
  pele: 0,
  cabelo: 'raspado',
  corCabelo: 0,
  camisa: 'uni1',
  barra: 'fora',
  numero: null,
  cabeca: 'nenhum',
  punho: 'nenhum',
  braco: 'nenhum',
  peito: 'nenhum',
  pescoco: 'nenhum',
  chuteira: 'neutra',
  pose: 'parado',
  fundo: 'gramado',
  moldura: 'nenhuma',
};

// ---------- as peças do vestiário (contam no "N de 26") ----------

export type Aba = 'corpo' | 'cabelo' | 'camisa' | 'acessorio' | 'fundo';
export const ABAS: readonly { id: Aba; nome: string }[] = [
  { id: 'corpo', nome: 'Corpo' },
  { id: 'cabelo', nome: 'Cabelo' },
  { id: 'camisa', nome: 'Camisa' },
  { id: 'acessorio', nome: 'Acessório' },
  { id: 'fundo', nome: 'Fundo' },
];

/** Índice do nível da Carreira (NIVEIS em carreira.ts): 1 Reserva … 5 Lenda. */
export type IndiceDeNivel = 1 | 2 | 3 | 4 | 5;

export type Condicao =
  | { tipo: 'comeco' }
  | { tipo: 'nivel'; nivel: IndiceDeNivel }
  /** A 1ª medalha dessa cor (ou maior) em qualquer item, lance ou disputa. */
  | { tipo: 'medalha'; medalha: Medalha }
  /** Ouro numa disputa de pênaltis. */
  | { tipo: 'ouroDisputa' }
  /** Ouro num lance ou disputa da Seleção. */
  | { tipo: 'ouroSelecao' }
  /** Ouro em `quantos` itens diferentes. */
  | { tipo: 'ouros'; quantos: number }
  | { tipo: 'aquecido' };

/** Campos da vestimenta que têm peça (pele, cabelo, corpo, barra e número são do começo e não contam). */
export type CampoDaPeca = 'camisa' | 'cabeca' | 'punho' | 'braco' | 'peito' | 'pescoco' | 'chuteira' | 'pose' | 'fundo' | 'moldura';

export interface Peca {
  /** Id fixo: nunca muda depois de publicado (o servidor e os aparelhos guardam por ele). */
  id: string;
  aba: Aba;
  /** Nome na tela, com maiúscula ("Colete de treino"). */
  nome: string;
  campo: CampoDaPeca;
  /** O valor que a peça põe no campo da vestimenta. */
  valor: string;
  condicao: Condicao;
}

const comeco: Condicao = { tipo: 'comeco' };
const nivel = (n: IndiceDeNivel): Condicao => ({ tipo: 'nivel', nivel: n });

/** As 26 peças, na ordem em que aparecem no vestiário. Ids fixos (docs/jogo.md 14.5). */
export const PECAS: readonly Peca[] = [
  // Camisa
  { id: 'uni1', aba: 'camisa', nome: 'Uniforme 1', campo: 'camisa', valor: 'uni1', condicao: comeco },
  { id: 'uni2', aba: 'camisa', nome: 'Uniforme 2', campo: 'camisa', valor: 'uni2', condicao: comeco },
  { id: 'goleiro', aba: 'camisa', nome: 'Uniforme de goleiro', campo: 'camisa', valor: 'goleiro', condicao: { tipo: 'ouroDisputa' } },
  // Acessório
  { id: 'testeira', aba: 'acessorio', nome: 'Testeira', campo: 'cabeca', valor: 'testeira', condicao: comeco },
  { id: 'munhequeira', aba: 'acessorio', nome: 'Munhequeira', campo: 'punho', valor: 'munhequeira', condicao: comeco },
  { id: 'colete', aba: 'acessorio', nome: 'Colete de treino', campo: 'peito', valor: 'colete', condicao: nivel(1) },
  { id: 'chuteira_time', aba: 'acessorio', nome: 'Chuteira nas cores do time', campo: 'chuteira', valor: 'time', condicao: nivel(2) },
  { id: 'pose_bracos', aba: 'acessorio', nome: 'Braços pra cima', campo: 'pose', valor: 'bracos', condicao: nivel(2) },
  { id: 'bracadeira', aba: 'acessorio', nome: 'Braçadeira de capitão', campo: 'braco', valor: 'bracadeira', condicao: nivel(3) },
  { id: 'faixa', aba: 'acessorio', nome: 'Faixa de campeão', campo: 'peito', valor: 'faixa', condicao: nivel(4) },
  { id: 'munhequeira_bronze', aba: 'acessorio', nome: 'Munhequeira bronze', campo: 'punho', valor: 'munhequeira_bronze', condicao: { tipo: 'medalha', medalha: 'bronze' } },
  { id: 'chuteira_dourada', aba: 'acessorio', nome: 'Chuteira dourada', campo: 'chuteira', valor: 'dourada', condicao: { tipo: 'medalha', medalha: 'ouro' } },
  { id: 'apito', aba: 'acessorio', nome: 'Apito no pescoço', campo: 'pescoco', valor: 'apito', condicao: { tipo: 'aquecido' } },
  // Fundo
  { id: 'fundo_gramado', aba: 'fundo', nome: 'Gramado', campo: 'fundo', valor: 'gramado', condicao: comeco },
  { id: 'fundo_arquibancada', aba: 'fundo', nome: 'Arquibancada', campo: 'fundo', valor: 'arquibancada', condicao: comeco },
  { id: 'fundo_estadio_noite', aba: 'fundo', nome: 'Estádio à noite', campo: 'fundo', valor: 'estadio_noite', condicao: comeco },
  { id: 'fundo_banco', aba: 'fundo', nome: 'Banco de reservas', campo: 'fundo', valor: 'banco', condicao: nivel(1) },
  { id: 'fundo_tunel', aba: 'fundo', nome: 'Túnel', campo: 'fundo', valor: 'tunel', condicao: nivel(2) },
  { id: 'fundo_holofotes', aba: 'fundo', nome: 'Holofotes', campo: 'fundo', valor: 'holofotes', condicao: nivel(3) },
  { id: 'fundo_papel_picado', aba: 'fundo', nome: 'Papel picado', campo: 'fundo', valor: 'papel_picado', condicao: nivel(4) },
  { id: 'fundo_telao', aba: 'fundo', nome: 'Telão', campo: 'fundo', valor: 'telao', condicao: nivel(5) },
  { id: 'fundo_barreira', aba: 'fundo', nome: 'Barreira', campo: 'fundo', valor: 'barreira', condicao: { tipo: 'medalha', medalha: 'prata' } },
  { id: 'fundo_rede', aba: 'fundo', nome: 'Rede balançando', campo: 'fundo', valor: 'rede', condicao: { tipo: 'medalha', medalha: 'ouro' } },
  { id: 'fundo_verde_amarelo', aba: 'fundo', nome: 'Verde e amarelo', campo: 'fundo', valor: 'verde_amarelo', condicao: { tipo: 'ouroSelecao' } },
  { id: 'moldura_dourada', aba: 'fundo', nome: 'Moldura dourada', campo: 'moldura', valor: 'dourada', condicao: nivel(5) },
  { id: 'moldura_galeria', aba: 'fundo', nome: 'Moldura Galeria', campo: 'moldura', valor: 'galeria', condicao: { tipo: 'ouros', quantos: 5 } },
];

export const TOTAL_DE_PECAS = PECAS.length; // 26

// ---------- o que a pessoa conquistou (contado no servidor) ----------

export interface MedalhaDoItem {
  /** lance (faltas e cara a cara: 5 · 20 · 50, ouro com 10 recriados) ou disputa de pênaltis (10 · 50 · 100, ouro com 10 vitórias). */
  tipo: 'lance' | 'disputa';
  gols: number;
  recriados: number;
  vitorias: number;
  /** Lance ou disputa da Seleção, pelo catálogo (quem monta o estado decide). */
  daSelecao: boolean;
}

export interface EstadoDoVestiario {
  /** Índice do nível da Carreira: 0 Estreante … 5 Lenda (nivelDe(xp).indice). */
  nivel: number;
  medalhas: readonly MedalhaDoItem[];
  /** Completou o Aquecimento (bônus `aquecimento` em carreira_bonus). */
  aquecido: boolean;
}

// ---------- funções ----------

const ORDEM_DA_MEDALHA: Record<Medalha, number> = { bronze: 1, prata: 2, ouro: 3 };

/** Número inteiro >= 0; negativo, NaN, infinito ou não inteiro vira 0. */
const inteiro = (x: unknown): number => (typeof x === 'number' && Number.isInteger(x) && x > 0 ? x : 0);

function medalhaDoItem(m: MedalhaDoItem): Medalha | null {
  return m.tipo === 'disputa' ? medalhaDaDisputa(inteiro(m.gols), inteiro(m.vitorias)) : medalhaDoLance(inteiro(m.gols), inteiro(m.recriados));
}

function cumpre(c: Condicao, estado: EstadoDoVestiario, medalhas: readonly (Medalha | null)[]): boolean {
  switch (c.tipo) {
    case 'comeco':
      return true;
    case 'nivel':
      return inteiro(estado.nivel) >= c.nivel;
    case 'medalha':
      return medalhas.some((m) => m !== null && ORDEM_DA_MEDALHA[m] >= ORDEM_DA_MEDALHA[c.medalha]);
    case 'ouroDisputa':
      return estado.medalhas.some((m, i) => m.tipo === 'disputa' && medalhas[i] === 'ouro');
    case 'ouroSelecao':
      return estado.medalhas.some((m, i) => m.daSelecao === true && medalhas[i] === 'ouro');
    case 'ouros':
      return medalhas.filter((m) => m === 'ouro').length >= inteiro(c.quantos);
    case 'aquecido':
      return estado.aquecido === true;
  }
}

/** Ids das peças liberadas, na ordem de PECAS. Medalha pela mesma regra da trilha (medalhaDoLance / medalhaDaDisputa). */
export function pecasLiberadas(estado: EstadoDoVestiario): string[] {
  const medalhas = estado.medalhas.map(medalhaDoItem);
  return PECAS.filter((p) => cumpre(p.condicao, estado, medalhas)).map((p) => p.id);
}

const CAMPOS_DE_PECA: readonly (readonly [CampoDaPeca, readonly string[]])[] = [
  ['camisa', CAMISAS],
  ['cabeca', CABECAS],
  ['punho', PUNHOS],
  ['braco', BRACOS],
  ['peito', PEITOS],
  ['pescoco', PESCOCOS],
  ['chuteira', CHUTEIRAS],
  ['pose', POSES],
  ['fundo', FUNDOS],
  ['moldura', MOLDURAS],
];

const ehObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const dentro = <T>(lista: readonly T[], x: unknown, padrao: T): T => (lista.includes(x as T) ? (x as T) : padrao);

/**
 * A mesma vestimenta, com toda peça trancada, desconhecida ou fora do formato trocada pela de PADRAO (campo a campo).
 * Aceita qualquer coisa (JSON do aparelho): chave a mais some, `v` diferente de 1 vira o PADRAO inteiro.
 */
export function validar(vestimenta: unknown, liberadas: Iterable<string>): Vestimenta {
  if (!ehObjeto(vestimenta) || vestimenta.v !== 1) return { ...PADRAO };
  const livres = new Set(liberadas);
  const x = vestimenta;
  const saida: Vestimenta = {
    ...PADRAO,
    corpo: dentro(CORPOS, x.corpo, PADRAO.corpo),
    pele: dentro(PELES, x.pele, PADRAO.pele),
    cabelo: dentro(CABELOS, x.cabelo, PADRAO.cabelo),
    corCabelo: dentro(CORES_DE_CABELO, x.corCabelo, PADRAO.corCabelo),
    barra: dentro(BARRAS, x.barra, PADRAO.barra),
    numero: typeof x.numero === 'string' && FORMATO_DO_NUMERO.test(x.numero) ? x.numero : null,
  };
  const escrita = saida as unknown as Record<string, unknown>;
  for (const [campo, lista] of CAMPOS_DE_PECA) {
    const valor = x[campo];
    if (valor === PADRAO[campo] || !lista.includes(valor as string)) continue;
    const peca = PECAS.find((p) => p.campo === campo && p.valor === valor);
    if (peca && (peca.condicao.tipo === 'comeco' || livres.has(peca.id))) escrita[campo] = valor;
  }
  return saida;
}

/** Teto da vestimenta em JSON, em caracteres. A maior possível tem cerca de 250; o servidor recusa acima disto. */
export const TAMANHO_MAXIMO = 512;

const LISTAS: Record<Exclude<keyof Vestimenta, 'v' | 'numero'>, readonly unknown[]> = {
  corpo: CORPOS,
  pele: PELES,
  cabelo: CABELOS,
  corCabelo: CORES_DE_CABELO,
  camisa: CAMISAS,
  barra: BARRAS,
  cabeca: CABECAS,
  punho: PUNHOS,
  braco: BRACOS,
  peito: PEITOS,
  pescoco: PESCOCOS,
  chuteira: CHUTEIRAS,
  pose: POSES,
  fundo: FUNDOS,
  moldura: MOLDURAS,
};
const CHAVES = Object.keys(PADRAO).sort().join(',');
/** As chaves de antes da barra (H03b): a cópia guardada no aparelho e o site antigo ainda mandam assim. */
const CHAVES_SEM_BARRA = Object.keys(PADRAO)
  .filter((k) => k !== 'barra')
  .sort()
  .join(',');

/** Vestimenta de antes da barra: as mesmas chaves, sem `barra` (vale 'fora'). */
export type VestimentaSemBarra = Omit<Vestimenta, 'barra'>;

/**
 * O formato que o servidor aceita em salvar_boneco, antes de olhar o que está liberado: exatamente as chaves de PADRAO
 * (ou elas sem `barra`, o formato de antes), cada valor dentro do catálogo, número no formato ou null e JSON pequeno.
 * Fora disso, recusa (não conserta). Peça trancada passa aqui: quem troca pela padrão é o `validar`.
 * Para desenhar, use `comFormato`, que completa a barra.
 */
export function conferirFormato(x: unknown): x is Vestimenta | VestimentaSemBarra {
  if (!ehObjeto(x) || x.v !== 1) return false;
  const chaves = Object.keys(x).sort().join(',');
  if (chaves !== CHAVES && chaves !== CHAVES_SEM_BARRA) return false;
  if (!(x.numero === null || (typeof x.numero === 'string' && FORMATO_DO_NUMERO.test(x.numero)))) return false;
  for (const [campo, lista] of Object.entries(LISTAS)) {
    if (campo === 'barra' && !('barra' in x)) continue;
    if (!lista.includes(x[campo])) return false;
  }
  return JSON.stringify(x).length <= TAMANHO_MAXIMO;
}

/** A vestimenta no formato do catálogo (conferirFormato), com a barra completada ('fora' quando falta), ou null. */
export function comFormato(x: unknown): Vestimenta | null {
  if (!conferirFormato(x)) return null;
  return 'barra' in x ? x : { ...x, barra: PADRAO.barra };
}

function indice(sortear: () => number, n: number): number {
  return Math.min(n - 1, Math.max(0, Math.floor(sortear() * n)));
}
const escolher = <T>(lista: readonly T[], sortear: () => number): T => lista[indice(sortear, lista.length)];

/** Vestimenta sorteada só com as peças liberadas (botão Sortear do vestiário). */
export function sortearComPecas(liberadas: Iterable<string>, sortear: () => number = Math.random): Vestimenta {
  const livres = new Set(liberadas);
  const tem = (p: Peca) => p.condicao.tipo === 'comeco' || livres.has(p.id);
  const valores = (campo: CampoDaPeca): string[] => PECAS.filter((p) => p.campo === campo && tem(p)).map((p) => p.valor);
  const opcional = (campo: CampoDaPeca): string => escolher([String(PADRAO[campo]), ...valores(campo)], sortear);

  const corpo = escolher(CORPOS, sortear);
  const pele = escolher(PELES, sortear);
  const cabelo = escolher(CABELOS, sortear);
  const corCabelo = escolher(CORES_DE_CABELO, sortear);
  const camisa = escolher(valores('camisa'), sortear);
  const cabeca = opcional('cabeca');
  const punho = opcional('punho');
  const braco = opcional('braco');
  const peito = opcional('peito');
  const pescoco = opcional('pescoco');
  const chuteira = opcional('chuteira');
  const fundo = escolher(valores('fundo'), sortear);
  const moldura = opcional('moldura');
  let numero: string | null = null;
  if (sortear() >= 0.25) {
    const doisDigitos = sortear() >= 0.5;
    const n = indice(sortear, doisDigitos ? 100 : 10);
    numero = doisDigitos ? String(n).padStart(2, '0') : String(n);
  }
  // Por último, para o resto do sorteio sair igual ao de antes da barra com a mesma sequência.
  const barra = escolher(BARRAS, sortear);
  return { v: 1, corpo, pele, cabelo, corCabelo, camisa, barra, numero, cabeca, punho, braco, peito, pescoco, chuteira, pose: 'parado', fundo, moldura } as Vestimenta;
}

/** Vestimenta da conta nova: só peças do começo, com a camisa por fora (a barra só muda no vestiário). */
export function sortearDoComeco(sortear: () => number = Math.random): Vestimenta {
  return { ...sortearComPecas([], sortear), barra: PADRAO.barra };
}

const ORDEM_DA_FACILIDADE = ['aquecido', 'bronze', 'prata', 'ouro', 'ouroDisputa', 'ouroSelecao', 'ouros'];
/** Ordem das peças que não são de nível na "Próxima": a sort é estável, então empate fica na ordem de PECAS. */
const facilidade = (p: Peca): number =>
  ORDEM_DA_FACILIDADE.indexOf(p.condicao.tipo === 'medalha' ? p.condicao.medalha : p.condicao.tipo);

/**
 * Próxima peça a liberar, para o bloco do Perfil; null quando todas já liberaram. Primeiro a do próximo nível da
 * Carreira; sem peça de nível trancada, a mais fácil das outras.
 */
export function proximaPeca(estado: EstadoDoVestiario): { peca: Peca; condicao: string } | null {
  const livres = new Set(pecasLiberadas(estado));
  const trancadas = PECAS.filter((p) => !livres.has(p.id));
  if (trancadas.length === 0) return null;
  const atual = inteiro(estado.nivel);
  let escolhida: Peca | undefined;
  for (const p of trancadas) {
    if (p.condicao.tipo !== 'nivel' || p.condicao.nivel <= atual) continue;
    if (!escolhida || (escolhida.condicao.tipo === 'nivel' && p.condicao.nivel < escolhida.condicao.nivel)) escolhida = p;
  }
  // Sem peça de nível trancada: a mais fácil primeiro (Aquecimento, 1º bronze, 1ª prata, 1º ouro, depois os ouros específicos).
  const peca = escolhida ?? [...trancadas].sort((a, b) => facilidade(a) - facilidade(b))[0];
  return { peca, condicao: textoDaCondicao(peca) };
}

/** "Libera no Titular", "Libera no 1º ouro", "Libera com o Aquecimento completo"… Nunca nome de pessoa. */
export function textoDaCondicao(peca: Peca): string {
  const c = peca.condicao;
  switch (c.tipo) {
    case 'comeco':
      return 'Do começo';
    case 'nivel':
      return `Libera no ${NIVEIS[c.nivel].nome}`;
    case 'medalha':
      return c.medalha === 'bronze' ? 'Libera no 1º bronze' : c.medalha === 'prata' ? 'Libera na 1ª prata' : 'Libera no 1º ouro';
    case 'ouroDisputa':
      return 'Libera com um ouro nos pênaltis';
    case 'ouroSelecao':
      return 'Libera com um ouro da Seleção';
    case 'ouros':
      return `Libera com ${c.quantos} ouros`;
    case 'aquecido':
      return 'Libera com o Aquecimento completo';
  }
}

/** O que liberou entre duas leituras (ids de `depois` que não estavam em `antes`), na ordem de PECAS. */
export function novasPecas(antes: Iterable<string>, depois: Iterable<string>): Peca[] {
  const a = new Set(antes);
  const d = new Set(depois);
  return PECAS.filter((p) => d.has(p.id) && !a.has(p.id));
}

export const pecaPorId = (id: string): Peca | undefined => PECAS.find((p) => p.id === id);
