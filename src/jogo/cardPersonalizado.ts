// Cards personalizáveis (docs/jogo.md 14.6): a conta pura do que entra em cada estilo (Telão, Placar seco) e formato
// (Stories 1080×1920, Quadrado 1080×1080), dos quadradinhos de ligar e desligar de cada tipo de card e das escolhas
// guardadas no aparelho. Sem DOM nem canvas: o desenho fica em `cardPersonalizadoDesenho.ts`, a tela em
// `telas/cardPersonalizado.ts`. Tipo de card novo (o troféu da Galeria, por exemplo) entra em TIPOS_DE_CARD.

import type { Time } from '../dados/times';
import type { Medalha } from './lances';
import type { DesfechoLance } from './lances';
import type { Luz } from './home';
import type { Pistas } from './timeDoDia';
import type { LinhaMeuPalpite } from './cravaTela';
import type { PontosDoJogo } from './crava';
import type { ItemDaMedalha } from './medalhaTextos';

// ---------- estilos e formatos ----------

export type EstiloCard = 'telao' | 'placar';
/** Na ordem do deslizar; o primeiro é o padrão. */
export const ESTILOS: readonly { id: EstiloCard; nome: string }[] = [
  { id: 'telao', nome: 'Telão' },
  { id: 'placar', nome: 'Placar seco' },
];

export type FormatoCard = 'stories' | 'quadrado';
export const FORMATOS: readonly { id: FormatoCard; nome: string }[] = [
  { id: 'stories', nome: 'Stories' },
  { id: 'quadrado', nome: 'Quadrado' },
];
/** Tamanho da imagem gerada, em pixels. */
export const TAMANHO_DO_CARD: Record<FormatoCard, { l: number; a: number }> = {
  stories: { l: 1080, a: 1920 },
  quadrado: { l: 1080, a: 1080 },
};

/** O estilo seguinte (ou anterior, passo −1), dando a volta: o deslizar e "Trocar estilo". */
export function estiloVizinho(atual: EstiloCard, passo: 1 | -1): EstiloCard {
  const i = ESTILOS.findIndex((e) => e.id === atual);
  return ESTILOS[(i + passo + ESTILOS.length) % ESTILOS.length].id;
}

// ---------- tipos de card e quadradinhos ----------

/** O que se liga e desliga no card. */
export type Chave = 'frase' | 'apelido' | 'nivel' | 'placar' | 'link';
export type Acao = 'sortear' | 'escrever' | 'trocar';

export interface Quadradinho<C extends string> {
  chave: C;
  /** Texto curto, em 2 linhas (a quebra é o "\n"). */
  nome: string;
  /** Nome do ícone em `telas/icones.ts`. */
  icone: string;
}

/**
 * Cada tipo de card diz quais quadradinhos de ligar e desligar existem e com que nome, na ordem da tela.
 * `jogo-x1`: Lances (com os Pênaltis) e Prova, que geram link de X1. `jogo`: Time do Dia e Crava, sem X1.
 * `medalha`: o card de "Mandar a medalha".
 */
export type TipoDeCard = 'jogo-x1' | 'jogo' | 'medalha';

const FRASE: Quadradinho<'frase'> = { chave: 'frase', nome: 'Frase do\nnarrador', icone: 'balao' };
const APELIDO: Quadradinho<'apelido'> = { chave: 'apelido', nome: 'Meu\napelido', icone: 'pessoa' };
const NIVEL: Quadradinho<'nivel'> = { chave: 'nivel', nome: 'Nível na\nCarreira', icone: 'estrela' };

export const TIPOS_DE_CARD: Record<TipoDeCard, readonly Quadradinho<Chave>[]> = {
  'jogo-x1': [FRASE, APELIDO, NIVEL, { chave: 'placar', nome: 'Placar em\nemoji', icone: 'sorriso' }, { chave: 'link', nome: 'Link do\nX1', icone: 'corrente' }],
  jogo: [FRASE, APELIDO, NIVEL, { chave: 'placar', nome: 'Placar em\nemoji', icone: 'sorriso' }, { chave: 'link', nome: 'Link do\njogo', icone: 'corrente' }],
  medalha: [FRASE, APELIDO, NIVEL, { chave: 'placar', nome: 'Medalha\nem emoji', icone: 'trofeu' }, { chave: 'link', nome: 'Link do\nlance', icone: 'corrente' }],
};

/** Os 3 de ação (verdes), iguais em todo tipo, depois dos de ligar. */
export const ACOES: readonly Quadradinho<Acao>[] = [
  { chave: 'sortear', nome: 'Sortear\noutra frase', icone: 'troca' },
  { chave: 'escrever', nome: 'Escrever\nminha frase', icone: 'lapis' },
  { chave: 'trocar', nome: 'Trocar\nestilo', icone: 'imagem' },
];

/** X1 só existe quando a partida gerou o código; sem ele, o card é do tipo sem X1 ("Link do jogo"). */
export const tipoDoJogo = (temX1: boolean): TipoDeCard => (temX1 ? 'jogo-x1' : 'jogo');

// ---------- escolhas no aparelho ----------

/** O que fica guardado no aparelho para o próximo card. A frase própria nunca entra aqui. */
export interface EscolhasDoCard {
  estilo: EstiloCard;
  formato: FormatoCard;
  /** Desligados de propósito (o nível fica em `nivelNoCard`, a mesma escolha do Perfil). */
  desligados: readonly Exclude<Chave, 'nivel'>[];
}

export const ESCOLHAS_PADRAO: EscolhasDoCard = { estilo: 'telao', formato: 'stories', desligados: [] };

const CHAVES_GUARDADAS: readonly Exclude<Chave, 'nivel'>[] = ['frase', 'apelido', 'placar', 'link'];

/** Lê o que está guardado (pode vir velho ou estragado): o que não reconhece volta ao padrão. */
export function lerEscolhas(salvo: unknown): EscolhasDoCard {
  const s = (salvo && typeof salvo === 'object' ? salvo : {}) as Record<string, unknown>;
  const estilo = ESTILOS.some((e) => e.id === s.estilo) ? (s.estilo as EstiloCard) : ESCOLHAS_PADRAO.estilo;
  const formato = FORMATOS.some((f) => f.id === s.formato) ? (s.formato as FormatoCard) : ESCOLHAS_PADRAO.formato;
  const desligados = Array.isArray(s.desligados) ? CHAVES_GUARDADAS.filter((c) => (s.desligados as unknown[]).includes(c)) : [];
  return { estilo, formato, desligados };
}

/** Situação do aparelho que muda o que pode ficar ligado. */
export interface Contexto {
  /** Tem apelido salvo; sem ele, "Meu apelido" fica desligado e leva a escolher apelido. */
  temApelido: boolean;
  /** `nivelNoCard` do Perfil. */
  nivelNoCard: boolean;
}

/** O que está ligado agora, para um tipo de card. */
export function ligados(tipo: TipoDeCard, e: EscolhasDoCard, ctx: Contexto): ReadonlySet<Chave> {
  const existe = new Set(TIPOS_DE_CARD[tipo].map((q) => q.chave));
  const ligado = new Set<Chave>();
  for (const c of existe) {
    if (c === 'nivel') {
      if (ctx.nivelNoCard) ligado.add(c);
    } else if (c === 'apelido') {
      if (ctx.temApelido && !e.desligados.includes(c)) ligado.add(c);
    } else if (!e.desligados.includes(c)) ligado.add(c);
  }
  return ligado;
}

/** Liga ou desliga uma chave. O nível devolve `nivelNoCard` à parte, porque mora no Perfil. */
export function alternar(e: EscolhasDoCard, chave: Chave, ctx: Contexto): { escolhas: EscolhasDoCard; nivelNoCard: boolean } {
  if (chave === 'nivel') return { escolhas: e, nivelNoCard: !ctx.nivelNoCard };
  const desligado = e.desligados.includes(chave);
  const desligados = desligado ? e.desligados.filter((c) => c !== chave) : [...e.desligados, chave];
  return { escolhas: { ...e, desligados }, nivelNoCard: ctx.nivelNoCard };
}

// ---------- o que o card mostra ----------

/** O que vai dentro do telão no estilo Telão: cada jogo desenha o seu (os desenhos de `card*.ts`). */
export type ConteudoDoTelao =
  | { jogo: 'penaltis'; golsJogador: number; golsMaquina: number }
  | {
      jogo: 'lances';
      lances: readonly { titulo: string; desfecho: DesfechoLance; recriou: boolean; pontos: number }[];
      tituloUnico: string | null;
      /** "Bronze no lance Gol do título!" */
      medalha: string | null;
    }
  | { jogo: 'prova'; resumo: string; escada: string }
  | { jogo: 'dia'; numero: number; placar: string; pistas: readonly Pistas[] }
  | { jogo: 'crava-meus'; rodada: number; linhas: readonly LinhaMeuPalpite[] }
  | { jogo: 'crava-resultado'; rodada: number; resultados: readonly Pick<PontosDoJogo, 'acerto' | 'certeza'>[] }
  | { jogo: 'medalha'; medalha: Medalha; item: ItemDaMedalha };

/** Tudo o que o card pode mostrar; quem chama (cada jogo, a medalha) monta. Nada aqui tem nome de pessoa. */
export interface DadosDoCard {
  tipo: TipoDeCard;
  time: Time;
  /** O jogo na linha do topo: "Lances do Jogo", "Time do Dia #7". */
  jogo: string;
  /** O número grande: "+47", "OURO". */
  destaque: string;
  /** A linha de quem fez, com e sem o apelido ("Zé pro Flamengo" / "Fiz 47 pontos pro Flamengo"). */
  quem: { comApelido: string; semApelido: string };
  /** O que foi jogado, no Placar seco: título do lance, "Prova de Boleiro: cheguei na 6ª", "33ª rodada". */
  lance: string;
  /** O placar em emoji, uma linha (a mesma do texto de compartilhar; no card é desenho, então vale qualquer emoji). */
  placarEmoji: string;
  /** Frase do narrador escolhida para este resultado (pode ser vazia). */
  frase: string;
  novoRecorde: boolean;
  /** Link sem "https://": o do X1 ou o do jogo/lance. */
  link: string;
  /** Linha fixa do rodapé (o aviso do Crava): sai sempre, nunca desliga. */
  avisoFixo?: string;
  /** Nome do nível da Carreira, se já se sabe. */
  nivel: string | null;
  conteudo: ConteudoDoTelao;
  luz?: Luz;
}

/** O que entra no card, já decidido: o desenho só desenha o que vier aqui. */
export interface PlanoDoCard {
  estilo: EstiloCard;
  formato: FormatoCard;
  largura: number;
  altura: number;
  /** "GUERRA DE TORCIDAS · LANCES DO JOGO" (sempre). */
  topo: string;
  destaque: string;
  /** Nome do time (sempre). */
  time: string;
  /** Linha de quem fez; no Placar seco, só com o apelido ligado. */
  quem: string | null;
  /** Telão: desenho do placar dentro do telão (com o placar desligado, o telão fica só com o nome do time). */
  telaoComPlacar: boolean;
  /** Placar seco: o que foi jogado. */
  lance: string | null;
  /** Placar seco: a linha de emoji. */
  placarEmoji: string | null;
  frase: string | null;
  /** "CARREIRA · CRAQUE" */
  nivel: string | null;
  link: string | null;
  novoRecorde: boolean;
  avisoFixo: string | null;
}

export interface OpcoesDoPlano {
  estilo: EstiloCard;
  formato: FormatoCard;
  ligados: ReadonlySet<Chave>;
  /** A frase própria deste card (já conferida); troca a do narrador. */
  frasePropria?: string | null;
}

/** Decide o que entra no card para um estilo, um formato e o que está ligado. */
export function planoDoCard(d: DadosDoCard, o: OpcoesDoPlano): PlanoDoCard {
  const { l, a } = TAMANHO_DO_CARD[o.formato];
  const liga = (c: Chave) => o.ligados.has(c);
  const comApelido = liga('apelido');
  const frase = (o.frasePropria ?? d.frase).trim();
  const telao = o.estilo === 'telao';
  return {
    estilo: o.estilo,
    formato: o.formato,
    largura: l,
    altura: a,
    topo: `GUERRA DE TORCIDAS · ${d.jogo.toUpperCase()}`,
    destaque: d.destaque,
    time: d.time.nome,
    quem: telao ? (comApelido ? d.quem.comApelido : d.quem.semApelido) : comApelido ? d.quem.comApelido : null,
    telaoComPlacar: telao && liga('placar'),
    lance: telao ? null : d.lance || null,
    placarEmoji: !telao && liga('placar') && d.placarEmoji ? d.placarEmoji : null,
    frase: liga('frase') && frase ? frase : null,
    nivel: liga('nivel') && d.nivel ? `CARREIRA · ${d.nivel.toUpperCase()}` : null,
    link: liga('link') && d.link ? d.link.replace(/^https?:\/\//, '') : null,
    novoRecorde: d.novoRecorde,
    avisoFixo: d.avisoFixo ?? null,
  };
}

// ---------- compartilhar ----------

/** Nome do arquivo baixado ou compartilhado. */
export const nomeDoArquivo = (estilo: EstiloCard, formato: FormatoCard): string =>
  `guerra-de-torcidas-${estilo === 'telao' ? 'telao' : 'placar'}-${formato}.png`;

/**
 * Texto que vai junto com a imagem: o do jogo (só emoji antigo, seção 6), sem as linhas do link quando o link está
 * desligado. A frase própria nunca entra no texto: só no card.
 */
export function textoDoCompartilhar(texto: string, link: string, comLink: boolean): string {
  if (comLink) return texto;
  const semLink = link.replace(/^https?:\/\//, '');
  return texto
    .split('\n')
    .map((linha) => linha.replace(link, '').replace(semLink, '').trimEnd())
    .filter((linha, i, todas) => linha || (i > 0 && i < todas.length - 1))
    .join('\n')
    .trim();
}

/** iPhone e iPad não baixam arquivo pelo navegador: a tela orienta a salvar pela folha de compartilhar. */
export function salvaPelaFolha(userAgent: string, toques: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && toques > 1);
}

export const AVISO_IPHONE = 'No iPhone, toque em Compartilhar e escolha "Salvar imagem".';
