// Conta da tela do Vestiário (docs/jogo.md 14.5, "Tela (Rota 2)"). Pura: sem DOM, sem servidor e sem relógio.
// O catálogo, a validação e o sorteio ficam em vestiario.ts; aqui só o que a tela precisa decidir:
// o contador, o teclado do número, o toque numa peça, o "Sair sem salvar?" e o que a folha da peça trancada mostra.

import { NIVEIS, nivelDe } from './carreira.ts';
import { MEDALHAS, type Medalha } from './lances.ts';
import { MEDALHAS_PENALTIS } from './regraLances.ts';
import {
  CABELOS,
  CORPOS,
  FORMATO_DO_NUMERO,
  PADRAO,
  PECAS,
  TOTAL_DE_PECAS,
  sortearComPecas,
  textoDaCondicao,
  type Aba,
  type CampoDaPeca,
  type Condicao,
  type EstadoDoVestiario,
  type MedalhaDoItem,
  type Peca,
  type Vestimenta,
} from './vestiario.ts';

/** O que a tela recebe da fonte: o estado do vestiário com o XP da Carreira (para a barra da folha). */
export interface EstadoDaTela extends EstadoDoVestiario {
  xp: number;
}

// ---------- contador ----------

const ehDoComeco = (p: Peca) => p.condicao.tipo === 'comeco';

/** Quantas das 26 peças a pessoa tem (as do começo contam sempre; id desconhecido ou repetido não conta). */
export function pecasQueTem(liberadas: Iterable<string>): number {
  const livres = new Set(liberadas);
  return PECAS.filter((p) => ehDoComeco(p) || livres.has(p.id)).length;
}

/** "7 de 26". */
export const textoDoContador = (liberadas: Iterable<string>): string => `${pecasQueTem(liberadas)} de ${TOTAL_DE_PECAS}`;

export const temPeca = (peca: Peca, liberadas: ReadonlySet<string>): boolean => ehDoComeco(peca) || liberadas.has(peca.id);

// ---------- abas e grades ----------

export interface Grupo {
  titulo: string;
  /** Linha curta embaixo do título (a pose só aparece no card). */
  nota?: string;
  pecas: Peca[];
}

const pecasDe = (...campos: CampoDaPeca[]) => PECAS.filter((p) => campos.includes(p.campo));

/** As grades das abas de peça (Camisa, Acessório, Fundo), na ordem de PECAS. Corpo e Cabelo não têm peça. */
export function gruposDaAba(aba: Aba): Grupo[] {
  switch (aba) {
    case 'camisa':
      return [{ titulo: 'Uniforme', pecas: pecasDe('camisa') }];
    case 'acessorio':
      return [
        { titulo: 'Acessórios', pecas: pecasDe('cabeca', 'punho', 'braco', 'peito', 'pescoco') },
        { titulo: 'Chuteira', pecas: pecasDe('chuteira') },
        { titulo: 'Pose do card', nota: 'Só aparece no card. Aqui o boneco fica parado.', pecas: pecasDe('pose') },
      ];
    case 'fundo':
      return [
        { titulo: 'Fundos', pecas: pecasDe('fundo') },
        { titulo: 'Molduras', nota: 'A moldura aparece no avatar da Home e do Perfil.', pecas: pecasDe('moldura') },
      ];
    default:
      return [];
  }
}

/** Nome dos 7 cabelos na grade (os ids são de vestiario.ts). */
export const NOMES_DOS_CABELOS: Record<(typeof CABELOS)[number], string> = {
  raspado: 'Raspado',
  curto: 'Curto',
  crespo: 'Crespo',
  trancas: 'Tranças',
  coque: 'Coque',
  rabo: 'Rabo',
  comprido: 'Comprido',
};

/** Os dois corpos aparecem só desenhados; o nome é para leitor de tela, sem rótulo de gênero. */
export const NOMES_DOS_CORPOS: Record<(typeof CORPOS)[number], string> = { h: 'Corpo 1', m: 'Corpo 2' };

/** Campos que podem ficar vazios: tocar de novo na peça vestida tira (volta ao PADRAO). Camisa e fundo nunca ficam vazios. */
const OPCIONAIS: readonly CampoDaPeca[] = ['cabeca', 'punho', 'braco', 'peito', 'pescoco', 'chuteira', 'pose', 'moldura'];

export const pecaVestida = (v: Vestimenta, peca: Peca): boolean => v[peca.campo] === peca.valor;

/** A vestimenta com a peça posta (para desenhar a prévia da trancada, meio apagada). */
export function vestirPeca(v: Vestimenta, peca: Peca): Vestimenta {
  return { ...v, [peca.campo]: peca.valor } as Vestimenta;
}

export type Toque = { tipo: 'vestiu'; vestimenta: Vestimenta } | { tipo: 'trancada'; peca: Peca };

/**
 * Toque numa peça da grade. Trancada abre a folha; liberada veste. Tocar de novo numa peça vestida de um campo que
 * pode ficar vazio tira a peça; camisa e fundo ficam como estão.
 */
export function tocarPeca(atual: Vestimenta, peca: Peca, liberadas: ReadonlySet<string>): Toque {
  if (!temPeca(peca, liberadas)) return { tipo: 'trancada', peca };
  if (pecaVestida(atual, peca)) {
    if (!OPCIONAIS.includes(peca.campo)) return { tipo: 'vestiu', vestimenta: atual };
    return { tipo: 'vestiu', vestimenta: { ...atual, [peca.campo]: PADRAO[peca.campo] } as Vestimenta };
  }
  return { tipo: 'vestiu', vestimenta: vestirPeca(atual, peca) };
}

// ---------- número ----------

export const AJUDA_DO_NUMERO = '1 ou 2 dígitos: 7, 07, 0, 00 ou 99.';

export type TeclaDoNumero = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'apagar';

/**
 * Teclado do número. Com 0 ou 1 dígito, o dígito entra no fim ("0" + "7" = "07"); com 2, começa de novo.
 * Apagar tira o último; sem dígito nenhum, fica sem número (null).
 */
export function teclarNumero(numero: string | null, tecla: TeclaDoNumero): string | null {
  const atual = numero !== null && FORMATO_DO_NUMERO.test(numero) ? numero : '';
  if (tecla === 'apagar') return atual.length > 1 ? atual.slice(0, -1) : null;
  return atual.length >= 2 ? tecla : atual + tecla;
}

/** Os dois quadros grandes: "7" ocupa só o primeiro e "07" os dois; sem número, os dois vazios. */
export function quadrosDoNumero(numero: string | null): { quadros: [string, string]; usados: 0 | 1 | 2 } {
  if (numero === null || !FORMATO_DO_NUMERO.test(numero)) return { quadros: ['', ''], usados: 0 };
  return numero.length === 1 ? { quadros: [numero, ''], usados: 1 } : { quadros: [numero[0], numero[1]], usados: 2 };
}

// ---------- mudou? (Sair sem salvar) ----------

const CAMPOS = Object.keys(PADRAO) as (keyof Vestimenta)[];

/** A vestimenta na tela é diferente da última gravada (campo a campo). */
export function mudou(gravada: Vestimenta, atual: Vestimenta): boolean {
  return CAMPOS.some((c) => gravada[c] !== atual[c]);
}

/** O voltar (o da tela e o do Android): sem mudança sai direto; com mudança pergunta "Sair sem salvar?". */
export const aoVoltar = (gravada: Vestimenta, atual: Vestimenta): 'sair' | 'perguntar' => (mudou(gravada, atual) ? 'perguntar' : 'sair');

// ---------- sortear ----------

/** Botão Sortear: só peças que a pessoa tem; tenta não repetir a vestimenta da tela (até 5 vezes). */
export function sortearNaTela(atual: Vestimenta, liberadas: Iterable<string>, sortear: () => number = Math.random): Vestimenta {
  const lista = [...liberadas];
  let nova = sortearComPecas(lista, sortear);
  for (let i = 0; i < 5 && !mudou(atual, nova); i++) nova = sortearComPecas(lista, sortear);
  return nova;
}

// ---------- folha da peça trancada ----------

export interface BarraDeXp {
  /** De 0 a 1: XP de agora sobre o XP do nível que libera. */
  fracao: number;
  /** "Você: Titular · 1.770 XP" */
  voce: string;
  /** "Faltam 3.230 XP" */
  faltam: string;
}

export interface FolhaDaTrancada {
  peca: Peca;
  nome: string;
  /** "Libera no Craque" (textoDaCondicao). */
  condicao: string;
  /** Só em peça de nível. */
  barra?: BarraDeXp;
  /** Medalha, ouros e Aquecimento: a regra e quanto falta. */
  falta?: string[];
  /** Nomes das outras peças que liberam junto (mesma condição). */
  junto: string[];
}

const milhar = (n: number) => Math.max(0, Math.round(n)).toLocaleString('pt-BR');
const plural = (n: number, um: string, varios: string) => `${milhar(n)} ${n === 1 ? um : varios}`;

const mesmaCondicao = (a: Condicao, b: Condicao) => JSON.stringify(a) === JSON.stringify(b);

const ORDEM: Record<Medalha, number> = { bronze: 0, prata: 1, ouro: 2 };
const NOME_DA_MEDALHA: Record<Medalha, string> = { bronze: 'bronze', prata: 'prata', ouro: 'ouro' };

const inteiro = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);

/** O que falta num item para uma medalha: [gols, recriados ou vitórias]. */
function faltaNoItem(m: MedalhaDoItem, medalha: Medalha): [number, number] {
  if (m.tipo === 'disputa') {
    const n = MEDALHAS_PENALTIS[ORDEM[medalha]];
    return [Math.max(0, n.gols - inteiro(m.gols)), Math.max(0, n.vitorias - inteiro(m.vitorias))];
  }
  const n = MEDALHAS[ORDEM[medalha]];
  return [Math.max(0, n.acertos - inteiro(m.gols)), Math.max(0, n.recriados - inteiro(m.recriados))];
}

/** "Faltam 12 gols e 3 recriados no lance mais perto." (null quando nenhum item jogado serve). */
function maisPerto(itens: readonly MedalhaDoItem[], medalha: Medalha): string | null {
  let melhor: { m: MedalhaDoItem; f: [number, number] } | null = null;
  for (const m of itens) {
    const f = faltaNoItem(m, medalha);
    if (f[0] + f[1] === 0) continue;
    if (!melhor || f[0] + f[1] < melhor.f[0] + melhor.f[1]) melhor = { m, f };
  }
  if (!melhor) return null;
  const [gols, outro] = melhor.f;
  const partes: string[] = [];
  if (gols > 0) partes.push(plural(gols, 'gol', 'gols'));
  if (outro > 0) partes.push(melhor.m.tipo === 'disputa' ? plural(outro, 'vitória', 'vitórias') : `${milhar(outro)} carimbando`);
  const onde = melhor.m.tipo === 'disputa' ? 'na disputa mais perto' : 'no lance mais perto';
  return `${gols + outro === 1 ? 'Falta' : 'Faltam'} ${partes.join(' e ')} ${onde}.`;
}

function regraDaMedalha(medalha: Medalha, so: 'tudo' | 'disputa'): string {
  const d = MEDALHAS_PENALTIS[ORDEM[medalha]];
  const l = MEDALHAS[ORDEM[medalha]];
  const disputa = `${d.gols} gols${d.vitorias ? ` e ${d.vitorias} vitórias` : ''} numa mesma disputa de pênaltis`;
  const lance = `${l.acertos} gols${l.recriados ? ` e ${l.recriados} carimbando` : ''} num mesmo lance`;
  const nome = NOME_DA_MEDALHA[medalha];
  return so === 'disputa' ? `O ${nome} sai com ${disputa}.` : `${medalha === 'prata' ? 'A' : 'O'} ${nome} sai com ${lance} ou ${disputa}.`;
}

function faltaDaCondicao(c: Condicao, estado: EstadoDaTela): string[] | undefined {
  const itens = estado.medalhas ?? [];
  switch (c.tipo) {
    case 'medalha': {
      const perto = maisPerto(itens, c.medalha);
      return [regraDaMedalha(c.medalha, 'tudo'), perto ?? 'Ainda sem gol valendo em lance ou disputa.'];
    }
    case 'ouroDisputa': {
      const perto = maisPerto(
        itens.filter((m) => m.tipo === 'disputa'),
        'ouro',
      );
      return [regraDaMedalha('ouro', 'disputa'), perto ?? 'Ainda sem gol valendo numa disputa.'];
    }
    case 'ouroSelecao': {
      const perto = maisPerto(
        itens.filter((m) => m.daSelecao === true),
        'ouro',
      );
      return ['Vale o ouro em qualquer lance ou disputa da Seleção.', perto ?? 'Ainda sem gol valendo num item da Seleção.'];
    }
    case 'ouros': {
      const tem = itens.filter((m) => faltaNoItem(m, 'ouro').every((f) => f === 0)).length;
      return [`Ouro em ${c.quantos} lances ou disputas diferentes.`, `Você tem ${Math.min(tem, c.quantos)} de ${c.quantos}.`];
    }
    case 'aquecido':
      return ['Complete as 5 estações do Aquecimento, no Perfil.'];
    default:
      return undefined;
  }
}

/** Tudo o que a folha de baixo mostra ao tocar numa peça trancada. Nada de compra, sorteio ou prazo. */
export function folhaDaTrancada(peca: Peca, estado: EstadoDaTela): FolhaDaTrancada {
  const c = peca.condicao;
  const folha: FolhaDaTrancada = {
    peca,
    nome: peca.nome,
    condicao: textoDaCondicao(peca),
    junto: PECAS.filter((p) => p.id !== peca.id && mesmaCondicao(p.condicao, c)).map((p) => p.nome),
  };
  if (c.tipo === 'nivel') {
    const xp = inteiro(estado.xp);
    const alvo = NIVEIS[c.nivel].xp;
    folha.barra = {
      fracao: Math.min(1, xp / alvo),
      voce: `Você: ${nivelDe(xp).nome} · ${milhar(xp)} XP`,
      faltam: `Faltam ${milhar(alvo - xp)} XP`,
    };
  } else {
    folha.falta = faltaDaCondicao(c, estado);
  }
  return folha;
}
