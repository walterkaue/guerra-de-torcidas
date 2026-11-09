// Cards personalizáveis (docs/jogo.md 14.6): a conta pura do que entra em cada estilo (Telão, Placar seco, Pôster) e formato
// (Stories 1080×1920, Quadrado 1080×1080), dos quadradinhos de ligar e desligar de cada tipo de card e das escolhas
// guardadas no aparelho. Sem DOM nem canvas: o desenho fica em `cardPersonalizadoDesenho.ts`, a tela em
// `telas/cardPersonalizado.ts`. Tipo de card novo (o troféu da Galeria, por exemplo) entra em TIPOS_DE_CARD.

import { proTime, type Time } from '../dados/times';
import type { Medalha } from './lances';
import type { DesfechoLance } from './lances';
import type { Luz } from './home';
import type { Pistas } from './timeDoDia';
import type { LinhaMeuPalpite } from './cravaTela';
import type { PontosDoJogo } from './crava';
import type { ItemDaMedalha } from './medalhaTextos';
import type { Vestimenta } from './vestiario';
import type { NumeroDaFicha, TipoDeTrofeu, Trofeu } from './galeria';
import { emblemaDoDestino, temFesta, type DestinoDoMes, type FatiaDaTabela } from './temporada';

// ---------- estilos e formatos ----------

export type EstiloCard = 'telao' | 'placar' | 'poster';
/** Na ordem do deslizar; o primeiro é o padrão. O Pôster só existe com o boneco carregado (`estilosDisponiveis`). */
export const ESTILOS: readonly { id: EstiloCard; nome: string }[] = [
  { id: 'telao', nome: 'Telão' },
  { id: 'placar', nome: 'Placar seco' },
  { id: 'poster', nome: 'Pôster' },
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

/** Os estilos que dá para escolher agora: sem o boneco carregado (sem rede), o Pôster some da lista. */
export function estilosDisponiveis(temBoneco: boolean): readonly EstiloCard[] {
  return ESTILOS.map((e) => e.id).filter((e) => temBoneco || e !== 'poster');
}

/**
 * O estilo que vale agora: o guardado, ou o primeiro disponível se o guardado não está na lista (Pôster guardado e
 * sem boneco). A escolha guardada não muda por isso: com rede de novo, o Pôster volta.
 */
export function estiloEfetivo(guardado: EstiloCard, temBoneco: boolean): EstiloCard {
  const lista = estilosDisponiveis(temBoneco);
  return lista.includes(guardado) ? guardado : lista[0];
}

/** O estilo seguinte (ou anterior, passo −1) entre os disponíveis, dando a volta: o deslizar e as setas do teclado. */
export function estiloVizinho(atual: EstiloCard, passo: 1 | -1, temBoneco = true): EstiloCard {
  const lista = estilosDisponiveis(temBoneco);
  const i = lista.indexOf(atual);
  if (i < 0) return lista[0];
  return lista[(i + passo + lista.length) % lista.length];
}

/** Os nomes embaixo do card, que viram botões de tocar (para quem não desliza); o atual fica em amarelo. */
export function botoesDeEstilo(atual: EstiloCard, temBoneco: boolean): { id: EstiloCard; nome: string; atual: boolean }[] {
  const efetivo = estiloEfetivo(atual, temBoneco);
  return estilosDisponiveis(temBoneco).map((id) => ({ id, nome: ESTILOS.find((e) => e.id === id)!.nome, atual: id === efetivo }));
}

// ---------- tipos de card e quadradinhos ----------

/** O que se liga e desliga no card. */
export type Chave = 'frase' | 'apelido' | 'nivel' | 'placar' | 'link';
export type Acao = 'sortear' | 'escrever';

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
 * `medalha`: o card de "Mandar a medalha". `trofeu`: o card de "Mandar no grupo" da Galeria de Troféus (no troféu de
 * mês, o quadradinho dos números se chama "Números do mês": `quadradinhosDoCard`). `temporada`: o card de fim de
 * temporada ("Mandar no grupo" da placa de fim do mês e botão "Card do mês"); o "placar" é a tabela final.
 */
export type TipoDeCard = 'jogo-x1' | 'jogo' | 'medalha' | 'trofeu' | 'temporada';

const FRASE: Quadradinho<'frase'> = { chave: 'frase', nome: 'Frase do\nnarrador', icone: 'balao' };
const APELIDO: Quadradinho<'apelido'> = { chave: 'apelido', nome: 'Meu\napelido', icone: 'pessoa' };
const NIVEL: Quadradinho<'nivel'> = { chave: 'nivel', nome: 'Nível na\nCarreira', icone: 'estrela' };

export const TIPOS_DE_CARD: Record<TipoDeCard, readonly Quadradinho<Chave>[]> = {
  'jogo-x1': [FRASE, APELIDO, NIVEL, { chave: 'placar', nome: 'Placar em\nemoji', icone: 'sorriso' }, { chave: 'link', nome: 'Link do\ndesafio', icone: 'corrente' }],
  jogo: [FRASE, APELIDO, NIVEL, { chave: 'placar', nome: 'Placar em\nemoji', icone: 'sorriso' }, { chave: 'link', nome: 'Link do\njogo', icone: 'corrente' }],
  medalha: [FRASE, APELIDO, NIVEL, { chave: 'placar', nome: 'Medalha\nem emoji', icone: 'trofeu' }, { chave: 'link', nome: 'Link do\nlance', icone: 'corrente' }],
  trofeu: [FRASE, APELIDO, NIVEL, { chave: 'placar', nome: 'Números da\nsemana', icone: 'grafico' }, { chave: 'link', nome: 'Link do\njogo', icone: 'corrente' }],
  temporada: [FRASE, APELIDO, NIVEL, { chave: 'placar', nome: 'Tabela\nfinal', icone: 'grafico' }, { chave: 'link', nome: 'Link do\njogo', icone: 'corrente' }],
};

/** Os quadradinhos de ligar de um card: os do tipo, com "Números do mês" no lugar de "Números da semana" no troféu de mês. */
export function quadradinhosDoCard(d: Pick<DadosDoCard, 'tipo' | 'conteudo'>): readonly Quadradinho<Chave>[] {
  const base = TIPOS_DE_CARD[d.tipo];
  if (d.conteudo.jogo !== 'trofeu' || d.conteudo.trofeu.semana || !d.conteudo.trofeu.mes) return base;
  return base.map((q) => (q.chave === 'placar' ? { ...q, nome: 'Números do\nmês' } : q));
}

/** Os 2 de ação (verdes), iguais em todo tipo, depois dos de ligar. */
export const ACOES: readonly Quadradinho<Acao>[] = [
  { chave: 'sortear', nome: 'Sortear\noutra frase', icone: 'troca' },
  { chave: 'escrever', nome: 'Escrever\nminha frase', icone: 'lapis' },
];

/**
 * O 8º quadradinho, no lugar do antigo "Trocar estilo": liga e desliga o busto no Telão e no Placar seco; no Pôster
 * fica sempre ligado. Igual em todo tipo de card. O estado sai de `estadoDoMeuBoneco`.
 */
export const MEU_BONECO: Quadradinho<'boneco'> = { chave: 'boneco', nome: 'Meu\nboneco', icone: 'camisa' };

export const AVISO_POSTER = 'No Pôster o boneco é o card.';
export const AVISO_SEM_BONECO = 'Sem conexão pro boneco agora';

export interface EstadoDoMeuBoneco {
  ligado: boolean;
  /** Não muda ao tocar (no Pôster, ou sem boneco carregado). */
  travado: boolean;
  /** O que aparece ao tocar (ou fixo, sem boneco). */
  aviso: string | null;
}

/** "Meu boneco" para o estilo de agora: sem boneco, desligado e travado; no Pôster, ligado e travado. */
export function estadoDoMeuBoneco(estilo: EstiloCard, temBoneco: boolean, comBoneco: boolean): EstadoDoMeuBoneco {
  if (!temBoneco) return { ligado: false, travado: true, aviso: AVISO_SEM_BONECO };
  if (estilo === 'poster') return { ligado: true, travado: true, aviso: AVISO_POSTER };
  return { ligado: comBoneco, travado: false, aviso: null };
}

/** Toque em "Meu boneco": travado não muda nada e devolve o aviso; senão liga ou desliga o busto (guardado no aparelho). */
export function tocarMeuBoneco(e: EscolhasDoCard, temBoneco: boolean): { escolhas: EscolhasDoCard; aviso: string | null } {
  const estado = estadoDoMeuBoneco(estiloEfetivo(e.estilo, temBoneco), temBoneco, e.comBoneco);
  if (estado.travado) return { escolhas: e, aviso: estado.aviso };
  return { escolhas: { ...e, comBoneco: !e.comBoneco }, aviso: null };
}

/** X1 só existe quando a partida gerou o código; sem ele, o card é do tipo sem X1 ("Link do jogo"). */
export const tipoDoJogo = (temX1: boolean): TipoDeCard => (temX1 ? 'jogo-x1' : 'jogo');

// ---------- escolhas no aparelho ----------

/** O que fica guardado no aparelho para o próximo card. A frase própria nunca entra aqui. */
export interface EscolhasDoCard {
  estilo: EstiloCard;
  formato: FormatoCard;
  /** Desligados de propósito (o nível fica em `nivelNoCard`, a mesma escolha do Perfil). */
  desligados: readonly Exclude<Chave, 'nivel'>[];
  /** "Meu boneco" no Telão e no Placar seco (o busto ao lado do apelido). Começa desligado. */
  comBoneco: boolean;
}

export const ESCOLHAS_PADRAO: EscolhasDoCard = { estilo: 'telao', formato: 'stories', desligados: [], comBoneco: false };

const CHAVES_GUARDADAS: readonly Exclude<Chave, 'nivel'>[] = ['frase', 'apelido', 'placar', 'link'];

/** Lê o que está guardado (pode vir velho ou estragado): o que não reconhece volta ao padrão. */
export function lerEscolhas(salvo: unknown): EscolhasDoCard {
  const s = (salvo && typeof salvo === 'object' ? salvo : {}) as Record<string, unknown>;
  const estilo = ESTILOS.some((e) => e.id === s.estilo) ? (s.estilo as EstiloCard) : ESCOLHAS_PADRAO.estilo;
  const formato = FORMATOS.some((f) => f.id === s.formato) ? (s.formato as FormatoCard) : ESCOLHAS_PADRAO.formato;
  const desligados = Array.isArray(s.desligados) ? CHAVES_GUARDADAS.filter((c) => (s.desligados as unknown[]).includes(c)) : [];
  return { estilo, formato, desligados, comBoneco: s.comBoneco === true };
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
  | { jogo: 'medalha'; medalha: Medalha; item: ItemDaMedalha }
  | {
      jogo: 'trofeu';
      trofeu: Trofeu;
      /** "Campeão da semana". */
      nome: string;
      /** "Série A" (nula na vitrine). */
      serie: string | null;
      /** "Semana de 02/11 a 08/11/2026" ou "Março de 2027". */
      periodo: string;
      /** Os 3 números da ficha; vazio sem rede ou sem a linha do time. */
      numeros: readonly NumeroDaFicha[];
      /** A pessoa somou na semana do troféu do próprio time (só então a linha "tava na arquibancada" entra). */
      somou: boolean;
    }
  | {
      jogo: 'temporada';
      destino: DestinoDoMes;
      /** O selo inclinado: "SUBIU!", "CAMPEÃO". */
      selo: string;
      /** "Série B". */
      serie: string;
      /** Posição final do meu time na série. */
      posicao: number;
      /** O pedaço da tabela final em volta do meu time. */
      fatia: FatiaDaTabela;
      meuTime: string;
      /** Os 3 números: posição final, pontos e vitórias de semana. */
      numeros: readonly NumeroDaFicha[];
      /** Mês de pré-temporada: o card diz "Teste das divisões" e não tem troféu. */
      teste: boolean;
      /** A pessoa somou no mês (só então a linha "tava na arquibancada" entra). */
      somou: boolean;
    };

/** Tudo o que o card pode mostrar; quem chama (cada jogo, a medalha) monta. Nada aqui tem nome de pessoa. */
export interface DadosDoCard {
  tipo: TipoDeCard;
  time: Time;
  /** O jogo na linha do topo: "Lances do Jogo", "Time do Dia #7". */
  jogo: string;
  /** O número grande: "+47", "OURO". */
  destaque: string;
  /** Nula: a linha some (troféu em que a pessoa não somou). A linha de quem fez, com e sem o apelido ("Zé pro Flamengo" / "Fiz 47 pontos pro Flamengo"). */
  quem: { comApelido: string; semApelido: string } | null;
  /** O que foi jogado, no Placar seco: título do lance, "Prova de Boleiro: cheguei na 6ª", "33ª rodada". */
  lance: string;
  /** O placar em emoji: uma linha, ou poucas separadas por quebra de linha (a grade do Time do Dia). No card é desenho, então vale qualquer emoji. */
  placarEmoji: string;
  /** Frase do narrador escolhida para este resultado (pode ser vazia). */
  frase: string;
  novoRecorde: boolean;
  /** Link sem "https://": o do desafio ou o do jogo/lance. */
  link: string;
  /** Linha fixa do rodapé (o aviso do Crava): sai sempre, nunca desliga. */
  avisoFixo?: string;
  /** Nome do nível da Carreira, se já se sabe. */
  nivel: string | null;
  conteudo: ConteudoDoTelao;
  luz?: Luz;
}

/** O boneco da pessoa, como veio do servidor (`lerBoneco`). */
export interface BonecoDoCard {
  vestimenta: Vestimenta;
  /** Ids das peças liberadas (PECAS em vestiario.ts). */
  liberadas: readonly string[];
}

/** O Pôster: o boneco é o card. */
export interface PlanoDoPoster {
  /** A vestimenta como vai no card: "braços pra cima" se a pose está liberada, senão parado. */
  vestimenta: Vestimenta;
  /** Stories: corpo inteiro. Quadrado: do joelho pra cima, para caber. */
  enquadramento: 'corpo' | 'joelho';
  /** O número da camisa, grande e translúcido atrás do boneco, na cor 1 do time (null sem número). */
  numero: string | null;
  /** A faixa escura do topo: "LANCES DO JOGO · a falta do tri". */
  faixa: string;
  /** Na placa escura de baixo, à esquerda, com o nível do plano embaixo; só com "Meu apelido" ligado. */
  apelido: string | null;
  /** À direita: os pontos grandes ("+134", "OURO") e "pro Flamengo" embaixo (null para "Outro time"). */
  pontos: string;
  proTime: string | null;
  /** No card de medalha, a medalha desenhada junto dos pontos. */
  medalha: Medalha | null;
  /** No card do troféu, o troféu desenhado e o nome dele no lugar dos pontos ("pro Time" vira "Time · Série A"). */
  trofeu: { tipo: TipoDeTrofeu; nome: string } | null;
  /** No card do fim de temporada, o selo do destino (seta) no lugar da medalha; o destino em Anton no lugar dos pontos. */
  selo: { emblema: 'sobe' | 'desce' | 'fica'; destino: DestinoDoMes } | null;
}

/** O fim de temporada do card: o que o Telão e o Placar seco desenham. */
export interface PlanoDaTemporada {
  destino: DestinoDoMes;
  selo: string;
  emblema: 'sobe' | 'desce' | 'fica';
  /** Papel picado: só em campeão, campeão da B, subiu, "vai pra Série A" e Campeão da estreia. */
  festa: boolean;
  /** "Teste das divisões" (pré-temporada). */
  teste: boolean;
  meuTime: string;
  /** Telão: a tabela final (nula com "Tabela final" desligado). */
  fatia: FatiaDaTabela | null;
  /** Telão: sempre; Placar seco: só com "Tabela final" ligado. */
  numeros: readonly NumeroDaFicha[];
}

/** O troféu do card: o que o Telão e o Placar seco desenham. Os números só vêm com "Números da semana" ligado. */
export interface PlanoDoTrofeu {
  tipo: TipoDeTrofeu;
  nome: string;
  serie: string | null;
  periodo: string;
  numeros: readonly NumeroDaFicha[];
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
  /** Telão e Placar seco: o busto ao lado do apelido ("Meu boneco" ligado e boneco carregado). */
  busto: Vestimenta | null;
  /** Só no card do troféu. */
  trofeu: PlanoDoTrofeu | null;
  /** Só no card do fim de temporada. */
  temporada: PlanoDaTemporada | null;
  /** Só no estilo Pôster. */
  poster: PlanoDoPoster | null;
}

export interface OpcoesDoPlano {
  estilo: EstiloCard;
  formato: FormatoCard;
  ligados: ReadonlySet<Chave>;
  /** A frase própria deste card (já conferida); troca a do narrador. */
  frasePropria?: string | null;
  /** O boneco carregado; sem ele não há busto nem Pôster (o Pôster vira Telão). */
  boneco?: BonecoDoCard | null;
  /** "Meu boneco" ligado (busto no Telão e no Placar seco). */
  comBoneco?: boolean;
  /** O apelido salvo, para a placa do Pôster. */
  apelido?: string | null;
}

/** A pose do Pôster: "braços pra cima" se a peça está liberada, senão parado (docs/jogo.md 14.6). */
export function vestimentaDoPoster(b: BonecoDoCard): Vestimenta {
  return { ...b.vestimenta, pose: b.liberadas.includes('pose_bracos') ? 'bracos' : 'parado' };
}

/**
 * "LANCES DO JOGO · a falta do tri": só o nome do jogo (a parte antes de " · ", sem a rodada do Crava, que o lance já
 * diz) e o lance, sem repetir o nome que já vier nele ("Prova de Boleiro: …").
 */
export function faixaDoPoster(jogo: string, lance: string): string {
  const nome = jogo.split(' · ')[0].trim();
  const minusculo = (t: string) => t.trim().toLocaleLowerCase('pt-BR');
  let resto = lance.trim();
  if (minusculo(resto).startsWith(`${minusculo(nome)}:`)) resto = resto.slice(nome.length + 1).trim();
  resto = resto
    .split(' · ')
    .filter((t) => t.trim() && minusculo(t) !== minusculo(nome))
    .join(' · ');
  return resto ? `${nome.toUpperCase()} · ${resto}` : nome.toUpperCase();
}

/** Decide o que entra no card para um estilo, um formato e o que está ligado. */
export function planoDoCard(d: DadosDoCard, o: OpcoesDoPlano): PlanoDoCard {
  const { l, a } = TAMANHO_DO_CARD[o.formato];
  const liga = (c: Chave) => o.ligados.has(c);
  const comApelido = liga('apelido');
  const frase = (o.frasePropria ?? d.frase).trim();
  const boneco = o.boneco ?? null;
  // Sem boneco, o Pôster não existe: vira o Telão (estiloEfetivo).
  const estilo = estiloEfetivo(o.estilo, !!boneco);
  const telao = estilo === 'telao';
  const poster = estilo === 'poster' && boneco ? planoDoPoster(d, o, boneco, comApelido) : null;
  const k = d.conteudo;
  const trofeu: PlanoDoTrofeu | null =
    k.jogo === 'trofeu' ? { tipo: k.trofeu.trofeu, nome: k.nome, serie: k.serie, periodo: k.periodo, numeros: liga('placar') ? k.numeros : [] } : null;
  const temporada: PlanoDaTemporada | null =
    k.jogo === 'temporada'
      ? {
          destino: k.destino,
          selo: k.selo,
          emblema: emblemaDoDestino(k.destino),
          festa: temFesta(k.destino),
          teste: k.teste,
          meuTime: k.meuTime,
          fatia: telao && liga('placar') ? k.fatia : null,
          numeros: telao || liga('placar') ? k.numeros : [],
        }
      : null;
  // Troféu e fim de temporada: a linha de quem ("tava na arquibancada") sai nos três estilos, com ou sem apelido; sem soma, d.quem é nulo.
  const quem = !d.quem ? null : telao || trofeu || temporada ? (comApelido ? d.quem.comApelido : d.quem.semApelido) : comApelido ? d.quem.comApelido : null;
  return {
    estilo,
    formato: o.formato,
    largura: l,
    altura: a,
    topo: `GUERRA DE TORCIDAS · ${d.jogo.toUpperCase()}${temporada?.teste && !telao ? ` · ${TESTE_DAS_DIVISOES}` : ''}`,
    destaque: d.destaque,
    time: d.time.nome,
    quem,
    telaoComPlacar: telao && liga('placar'),
    lance: telao ? null : lanceDoFim(d, temporada),
    placarEmoji: !telao && liga('placar') && d.placarEmoji ? d.placarEmoji : null,
    frase: liga('frase') && frase ? frase : null,
    nivel: liga('nivel') && d.nivel ? `CARREIRA · ${d.nivel.toUpperCase()}` : null,
    link: liga('link') && d.link ? d.link.replace(/^https?:\/\//, '') : null,
    novoRecorde: d.novoRecorde,
    avisoFixo: d.avisoFixo ?? null,
    busto: !poster && boneco && o.comBoneco ? boneco.vestimenta : null,
    trofeu,
    temporada,
    poster,
  };
}

export const TESTE_DAS_DIVISOES = 'TESTE DAS DIVISÕES';

/**
 * O que foi jogado, no Placar seco. No fim de temporada, "O Cruzeiro terminou em 2º na Série B · 61 pts · 2 vitórias de
 * semana"; com os 3 números na linha de baixo, fica só a primeira parte (para não repetir).
 */
function lanceDoFim(d: DadosDoCard, t: PlanoDaTemporada | null): string | null {
  if (!t || !t.numeros.length) return d.lance || null;
  return d.lance.split(' · ')[0] || null;
}

function planoDoPoster(d: DadosDoCard, o: OpcoesDoPlano, b: BonecoDoCard, comApelido: boolean): PlanoDoPoster {
  const vestimenta = vestimentaDoPoster(b);
  const apelido = comApelido && o.apelido?.trim() ? o.apelido.trim() : null;
  const k = d.conteudo;
  // Troféu: "GALERIA DE TROFÉUS · SEMANA DE 02/11 A 08/11/2026" na faixa; na placa, o nome do troféu e "Time · Série A".
  // Fim de temporada: "FIM DE DEZEMBRO · 2º NA SÉRIE B" (pré-temporada: "… · TESTE DAS DIVISÕES · …").
  const faixa =
    k.jogo === 'trofeu'
      ? faixaDoPoster(d.jogo, k.periodo.toLocaleUpperCase('pt-BR'))
      : k.jogo === 'temporada'
        ? [d.jogo, k.teste ? TESTE_DAS_DIVISOES : '', `${k.posicao}º na ${k.serie}`].filter(Boolean).join(' · ').toLocaleUpperCase('pt-BR')
        : faixaDoPoster(d.jogo, d.lance);
  return {
    vestimenta,
    enquadramento: o.formato === 'stories' ? 'corpo' : 'joelho',
    numero: vestimenta.numero,
    faixa,
    apelido,
    pontos: d.destaque,
    proTime: k.jogo === 'trofeu' || k.jogo === 'temporada' ? [d.time.nome, k.serie].filter(Boolean).join(' · ') : proTime(d.time),
    medalha: k.jogo === 'medalha' ? k.medalha : null,
    trofeu: k.jogo === 'trofeu' ? { tipo: k.trofeu.trofeu, nome: k.nome } : null,
    selo: k.jogo === 'temporada' ? { emblema: emblemaDoDestino(k.destino), destino: k.destino } : null,
  };
}

// ---------- compartilhar ----------

/** Nome do arquivo baixado ou compartilhado. */
export const nomeDoArquivo = (estilo: EstiloCard, formato: FormatoCard): string => `guerra-de-torcidas-${estilo}-${formato}.png`;

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
