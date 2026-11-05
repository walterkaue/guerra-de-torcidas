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

/** Campos da vestimenta que têm peça (pele, cabelo, corpo e número são do começo e não contam). */
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

// ---------- funções (parte 2 do plano D5a) ----------

/** Ids das peças liberadas, na ordem de PECAS. Medalha pela mesma regra da trilha (medalhaDoLance / medalhaDaDisputa). */
export function pecasLiberadas(estado: EstadoDoVestiario): string[] {
  void estado;
  void NIVEIS;
  void medalhaDoLance;
  void medalhaDaDisputa;
  throw new Error('a fazer: parte 2');
}

/**
 * A mesma vestimenta, com toda peça trancada, desconhecida ou fora do formato trocada pela de PADRAO (campo a campo).
 * Aceita qualquer coisa (JSON do aparelho): chave a mais some, `v` diferente de 1 vira o PADRAO inteiro.
 */
export function validar(vestimenta: unknown, liberadas: Iterable<string>): Vestimenta {
  void vestimenta;
  void liberadas;
  throw new Error('a fazer: parte 2');
}

/** Vestimenta sorteada só com as peças liberadas (botão Sortear do vestiário). */
export function sortearComPecas(liberadas: Iterable<string>, sortear: () => number = Math.random): Vestimenta {
  void liberadas;
  void sortear;
  throw new Error('a fazer: parte 2');
}

/** Vestimenta da conta nova: só peças do começo. */
export function sortearDoComeco(sortear: () => number = Math.random): Vestimenta {
  void sortear;
  throw new Error('a fazer: parte 2');
}

/** Próxima peça a liberar, para o bloco do Perfil; null quando todas já liberaram. */
export function proximaPeca(estado: EstadoDoVestiario): { peca: Peca; condicao: string } | null {
  void estado;
  throw new Error('a fazer: parte 2');
}

/** "Libera no Titular", "Libera no 1º ouro", "Libera com o Aquecimento completo"… Nunca nome de pessoa. */
export function textoDaCondicao(peca: Peca): string {
  void peca;
  throw new Error('a fazer: parte 2');
}

/** O que liberou entre duas leituras (ids de `depois` que não estavam em `antes`), na ordem de PECAS. */
export function novasPecas(antes: Iterable<string>, depois: Iterable<string>): Peca[] {
  void antes;
  void depois;
  throw new Error('a fazer: parte 2');
}

export const pecaPorId = (id: string): Peca | undefined => PECAS.find((p) => p.id === id);
