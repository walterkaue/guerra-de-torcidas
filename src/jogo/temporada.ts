// Temporada das torcidas (docs/jogo.md, seção 5, "A temporada"): série do mês e classificação mensal.
// Módulo puro: sem DOM, banco nem relógio. Datas entram como parâmetro. Meses são "AAAA-MM-01".
// Os pontos e a ordem vêm do servidor (view classificacao_temporada); aqui só ficam a leitura e os textos.

import { semanaConfirmadaEm } from './crava';
import { AVISO_PRE_TEMPORADA } from './posicao';
import type { Trofeu } from './galeria';

export type Serie = 'unica' | 'a' | 'b';
export type Destino = 'a' | 'b';

export interface Temporada {
  mes: string;
  pre_temporada: boolean;
  fechada_em: string | null;
  campeao_estreia_id: string | null;
}

export interface LinhaTemporada {
  time_id: string;
  serie: Serie;
  posicao: number;
  pontos: number;
  vitorias: number;
  /** Nula enquanto nenhuma semana do mês fechou para a torcida. */
  ultima_posicao: number | null;
  /** Só depois de fechar o mês. */
  posicao_final: number | null;
  destino: Destino | null;
}

export interface TimeDaFrase {
  nome: string;
  artigo: 'o' | 'a';
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIA_MS = 24 * 3600_000;

const partes = (mes: string) => ({ ano: Number(mes.slice(0, 4)), m: Number(mes.slice(5, 7)) - 1 });
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pontos = (n: number) => `${n} ${n === 1 ? 'ponto' : 'pontos'}`;

/** "novembro" (minúsculo, sem ano). */
export function mesPorExtenso(mes: string): string {
  return MESES[partes(mes).m];
}

/** "Novembro de 2026". */
export function nomeDoMes(mes: string): string {
  return `${maiuscula(mesPorExtenso(mes))} de ${partes(mes).ano}`;
}

/** Primeiro dia do mês seguinte. */
export function mesSeguinte(mes: string): string {
  const { ano, m } = partes(mes);
  return iso(Date.UTC(ano, m + 1, 1));
}

/** Segundas-feiras do mês: a semana é do mês da sua segunda. */
export function segundasDoMes(mes: string): string[] {
  const { ano, m } = partes(mes);
  const fim = Date.UTC(ano, m + 1, 1);
  const lista: string[] = [];
  for (let t = Date.UTC(ano, m, 1); t < fim; t += DIA_MS) {
    if (new Date(t).getUTCDay() === 1) lista.push(iso(t));
  }
  return lista;
}

/** Quando a primeira semana do mês trava: a segunda seguinte à primeira segunda, 12h de Brasília. */
export function primeiraTrava(mes: string): Date {
  return semanaConfirmadaEm(segundasDoMes(mes)[0]);
}

/** "2 de 5 semanas fechadas". */
export function textoContagem(fechadas: number, total: number): string {
  if (total === 1) return `${fechadas} de 1 semana fechada`;
  return `${fechadas} de ${total} semanas fechadas`;
}

/** Nenhuma semana do mês fechou para ninguém. */
export function semSemanaFechada(linhas: readonly LinhaTemporada[]): boolean {
  return linhas.every((l) => l.ultima_posicao === null);
}

/** Mensagem do mês sem semana fechada; `agora` entra como parâmetro. */
export function mensagemSemSemana(mes: string, agora: Date): string {
  const trava = primeiraTrava(mes);
  if (agora.getTime() >= trava.getTime()) return 'A primeira semana do mês ainda está fechando.';
  const segunda = segundasDoMes(mes)[0];
  const dia = iso(Date.parse(`${segunda}T00:00:00Z`) + 7 * DIA_MS);
  return `Nenhuma semana fechou ainda. A primeira fecha na segunda, ${Number(dia.slice(8, 10))}/${Number(dia.slice(5, 7))}, às 12h.`;
}

/**
 * Ordem da tabela. Mês fechado: posição final. Sem semana fechada: ordem alfabética (`nomeDe`).
 * Senão: a posição que o servidor calculou.
 */
export function ordenarLinhas(
  linhas: LinhaTemporada[],
  op: { fechado: boolean; semSemana: boolean; nomeDe?: (timeId: string) => string },
): LinhaTemporada[] {
  const copia = [...linhas];
  if (op.fechado) {
    return copia.sort((a, b) => (a.posicao_final ?? 999) - (b.posicao_final ?? 999) || a.posicao - b.posicao);
  }
  if (op.semSemana) {
    const nome = op.nomeDe ?? ((id: string) => id);
    return copia.sort((a, b) => nome(a.time_id).localeCompare(nome(b.time_id), 'pt-BR'));
  }
  return copia.sort((a, b) => a.posicao - b.posicao);
}

/** Faixa da linha: Série A, 9º e 10º caem; Série B, 1º e 2º sobem. Série única não tem faixa. */
export function zonaDaLinha(serie: Serie, posicao: number): 'acesso' | 'queda' | null {
  if (serie === 'a' && posicao >= 9) return 'queda';
  if (serie === 'b' && posicao <= 2) return 'acesso';
  return null;
}

export const LEGENDA_SERIE: Record<'a' | 'b', string> = { a: 'Os 2 últimos caem', b: 'Os 2 primeiros sobem' };

export function nomeDaSerie(serie: Serie): string {
  return serie === 'unica' ? 'série única' : serie === 'a' ? 'Série A' : 'Série B';
}

/** Selo da linha no mês fechado. */
export function seloDoDestino(serie: Serie, destino: Destino | null): string | null {
  if (!destino) return null;
  if (serie === 'unica') return destino === 'a' ? 'Série A' : 'Série B';
  if (serie === 'a') return destino === 'b' ? 'Caiu' : 'Fica';
  return destino === 'a' ? 'Subiu' : 'Fica';
}

/** Divisor da série única, depois do 10º. */
export function textoDivisor(mes: string): string {
  return `Daqui pra cima, Série A em ${mesPorExtenso(mesSeguinte(mes))}`;
}

export function textoVitorias(n: number): string | null {
  return n > 0 ? `${n} ${n === 1 ? 'vitória' : 'vitórias'} de semana` : null;
}

export interface EntradaDaFrase {
  time: TimeDaFrase | null;
  /** Meu time é "Outro time". */
  outro: boolean;
  /** Linha do meu time na tabela do mês (ausente se não estiver nela). */
  linha: LinhaTemporada | undefined;
  /** A série do meu time, qualquer ordem. */
  daSerie: LinhaTemporada[];
  mes: string;
  fechada: boolean;
}

/** A linha "do meu time" acima da tabela. Nula quando não há o que dizer. */
export function fraseDoMeuTime(e: EntradaDaFrase): string | null {
  if (e.outro) return 'Quem joga por Outro time fica fora das divisões.';
  if (!e.time || !e.linha) return null;
  const { linha } = e;
  const quem = `${maiuscula(e.time.artigo)} ${e.time.nome}`;
  const serie = nomeDaSerie(linha.serie);

  if (e.fechada) {
    const p = linha.posicao_final;
    if (p === null) return null;
    const fim = `${quem} terminou em ${p}º`;
    if (linha.serie === 'unica') return `${fim} e vai pra Série ${linha.destino === 'a' ? 'A' : 'B'}.`;
    if (linha.serie === 'a') return linha.destino === 'b' ? `${fim} e caiu pra Série B.` : `${fim} e fica na Série A.`;
    return linha.destino === 'a' ? `${fim} e subiu pra Série A.` : `${fim} e fica na Série B.`;
  }

  if (semSemanaFechada(e.daSerie)) return `${quem} está na ${serie} de ${mesPorExtenso(e.mes)}.`;

  const ordem = [...e.daSerie].sort((a, b) => a.posicao - b.posicao);
  const p = linha.posicao;
  const zona = zonaDaLinha(linha.serie, p);

  if (p === 1) {
    const segundo = ordem[1];
    const acesso = zona === 'acesso' ? ', na zona de acesso' : '';
    if (!segundo) return `${quem} lidera a ${serie}${acesso}.`;
    if (segundo.pontos === linha.pontos) return `${quem} lidera a ${serie} no desempate${acesso}.`;
    return `${quem} lidera a ${serie}, ${pontos(linha.pontos - segundo.pontos)} à frente do 2º${acesso}.`;
  }

  const lider = ordem[0];
  const atrasLider = lider ? lider.pontos - linha.pontos : 0;
  const atras = (n: number, ref: string, sufixo = '') =>
    n > 0 ? `${pontos(n)} atrás ${ref}${sufixo}` : `com os mesmos pontos ${ref}${sufixo}`;

  if (zona === 'acesso') return `${quem} está em ${p}º na ${serie}, na zona de acesso.`;
  if (zona === 'queda') {
    const acima = ordem[p - 2];
    const dif = acima ? acima.pontos - linha.pontos : 0;
    return `${quem} está em ${p}º na ${serie}, na zona de queda, ${atras(dif, `do ${p - 1}º`)}.`;
  }
  if (linha.serie === 'unica') {
    if (p <= 10) return `${quem} está em ${p}º: por enquanto vai pra Série A em ${mesPorExtenso(mesSeguinte(e.mes))}.`;
    const decimo = ordem[9];
    const dif = decimo ? decimo.pontos - linha.pontos : 0;
    return `${quem} está em ${p}º, ${atras(dif, 'do 10º', ', a última vaga da Série A')}.`;
  }
  return `${quem} está em ${p}º na ${serie}, ${atras(atrasLider, 'do líder')}.`;
}

export interface TextosDoSelo {
  cabecalho: string;
  /** Selo da pré-temporada (aviso + sem troféu). */
  pre: string | null;
  /** Linha do troféu. */
  trofeu: string | null;
}

/** Cabeçalho do mês, selo da pré-temporada e linha do troféu. */
export function textoDoSelo(t: Temporada, modo: 'unica' | 'ab', campeao: TimeDaFrase | null): TextosDoSelo {
  const cabecalho = `${nomeDoMes(t.mes)} · ${modo === 'unica' ? 'Série única' : 'Séries A e B'}`;
  if (t.pre_temporada) return { cabecalho, pre: `${AVISO_PRE_TEMPORADA} Teste das divisões: sem troféu.`, trofeu: null };
  if (t.fechada_em && t.campeao_estreia_id && campeao) {
    return { cabecalho, pre: null, trofeu: `Campeão da estreia: ${campeao.artigo} ${campeao.nome}.` };
  }
  return {
    cabecalho,
    pre: null,
    trofeu: modo === 'unica' ? 'O 1º leva o troféu Campeão da estreia.' : 'O campeão da Série A é o campeão da temporada.',
  };
}

/** Rodapé que explica a pontuação. */
export function textoExplica(modo: 'unica' | 'ab'): string {
  const base = 'Cada semana travada vale pontos pela posição';
  const fim =
    'Torcida sem ninguém jogando na semana não pontua. Empate no mês: mais vitórias de semana, depois a melhor última semana.';
  return modo === 'unica'
    ? `${base} entre os 20: 25, 20, 17, 15, 14 e depois um a menos até o 18º. ${fim}`
    : `${base} na série: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1. ${fim}`;
}

// ---------- Pontos de campeonato (igual a public.pontos_campeonato, migração 20261101000000) ----------

const PONTOS_DA_SERIE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;
const PONTOS_DA_UNICA = [25, 20, 17, 15, 14] as const;

/** Pontos de campeonato de uma posição na semana: série de 10 (estilo F1) ou série única de 20. */
export function pontosDeCampeonato(serie: Serie, posicao: number): number {
  if (!Number.isInteger(posicao) || posicao < 1) return 0;
  if (serie === 'unica') return PONTOS_DA_UNICA[posicao - 1] ?? Math.max(19 - posicao, 0);
  return PONTOS_DA_SERIE[posicao - 1] ?? 0;
}

// ---------- Home: o bloco das divisões (Rota 2, "linha ao vivo"; docs/jogo.md seção 5, "Telas do resto das divisões") ----------

/** O que a Home já lê do ranking da semana (`rankingDaSemana`). */
export interface LinhaDaSemanaAoVivo {
  time_id: string;
  ativos: number;
  posicao_campeao: number;
}

export interface SemanaNaSerie {
  /** Posição na série nesta semana (entre os 10 da série, ou entre os 20 na série única). */
  posicao: number;
  /** Pontos de campeonato que essa posição daria; 0 se ninguém do time jogou (docs/jogo.md seção 5). */
  pontos: number;
  vitoria: boolean;
  ativos: number;
}

const porId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Posição de cada time da série na semana ao vivo, como a view faz com a semana travada: a ordem é a posição geral,
 * só entre os times da série. Time ausente do ranking fica no fim, sem ninguém jogando.
 */
export function semanaNaSerie(daSerie: readonly LinhaTemporada[], semana: readonly LinhaDaSemanaAoVivo[]): Map<string, SemanaNaSerie> {
  const porTime = new Map(semana.map((l) => [l.time_id, l]));
  const ordem = [...daSerie].sort((a, b) => {
    const pa = porTime.get(a.time_id)?.posicao_campeao ?? Infinity;
    const pb = porTime.get(b.time_id)?.posicao_campeao ?? Infinity;
    return pa === pb ? porId(a.time_id, b.time_id) : pa - pb;
  });
  const mapa = new Map<string, SemanaNaSerie>();
  ordem.forEach((l, i) => {
    const ativos = porTime.get(l.time_id)?.ativos ?? 0;
    const posicao = i + 1;
    const pontos = ativos > 0 ? pontosDeCampeonato(l.serie, posicao) : 0;
    mapa.set(l.time_id, { posicao, pontos, ativos, vitoria: ativos > 0 && posicao === 1 });
  });
  return mapa;
}

export interface Projecao {
  semana: SemanaNaSerie;
  /** Posição de agora na tabela do mês; nula sem semana travada. */
  agora: number | null;
  /** Posição se a semana fechasse agora. */
  depois: number;
  seta: 'sobe' | 'desce' | null;
}

/**
 * "Se a semana fechasse agora": soma à tabela do mês os pontos da posição de agora na semana e reordena com o
 * desempate da view (pontos, vitórias, melhor última semana, que passa a ser esta, e o id). É informação, não
 * contagem regressiva.
 */
export function projetarSemana(
  daSerie: readonly LinhaTemporada[],
  semana: readonly LinhaDaSemanaAoVivo[],
  meuTime: string,
): Projecao | null {
  const minha = daSerie.find((l) => l.time_id === meuTime);
  // Ranking vazio (segunda cedo, ou a Home sem leitura): não há semana para projetar.
  if (!minha || semana.length === 0) return null;
  const naSemana = semanaNaSerie(daSerie, semana);
  const presentes = new Set(semana.map((l) => l.time_id));
  const projetada = daSerie.map((l) => {
    const s = naSemana.get(l.time_id)!;
    // Como na view: time fora do ranking da semana não ganha "última semana" nova; fica a que tinha (nula vai pro fim).
    const ultima = presentes.has(l.time_id) ? s.posicao : (l.ultima_posicao ?? Infinity);
    return { id: l.time_id, pontos: l.pontos + s.pontos, vitorias: l.vitorias + (s.vitoria ? 1 : 0), ultima };
  });
  projetada.sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || a.ultima - b.ultima || porId(a.id, b.id));
  const depois = projetada.findIndex((l) => l.id === meuTime) + 1;
  const agora = semSemanaFechada(daSerie) ? null : minha.posicao;
  const seta = agora === null || agora === depois ? null : depois < agora ? 'sobe' : 'desce';
  return { semana: naSemana.get(meuTime)!, agora, depois, seta };
}

const contracaoPor = (artigo: 'o' | 'a') => (artigo === 'a' ? 'pela' : 'pelo');

/** "Se a semana fechasse agora: 4º na série esta semana, +12 · subia pro 6º". */
export function linhaDaProjecao(p: Projecao, serie: Serie, time: TimeDaFrase): string {
  const onde =
    p.semana.ativos > 0
      ? `${p.semana.posicao}º ${serie === 'unica' ? 'entre os 20' : 'na série'} esta semana`
      : `ninguém jogou ${contracaoPor(time.artigo)} ${time.nome} esta semana`;
  const rumo =
    p.agora === null
      ? ''
      : p.seta === 'sobe'
        ? ` · subia pro ${p.depois}º`
        : p.seta === 'desce'
          ? ` · descia pro ${p.depois}º`
          : ` · ficava em ${p.depois}º`;
  return `Se a semana fechasse agora: ${onde}, +${p.semana.pontos}${rumo}`;
}

/** Situações do narrador na Home durante o mês (docs/narrador.md, seção 16). */
export type SituacaoDoMes = 'temporada_lider' | 'temporada_acesso' | 'temporada_queda' | 'temporada_meio';

export interface BlocoDasDivisoes {
  /** "8º", ou "–" sem semana travada. */
  posicao: string;
  /** "Na Série A · dezembro" / "Na série única · novembro" / "Série A de dezembro" (sem semana travada). */
  serie: string;
  /** "4 pts acima da zona · 2 de 5 semanas" / "A 1ª semana trava segunda, 12h". */
  situacao: string;
  /** Tudo numa linha, para o leitor de tela: "8º na Série A · 4 pts acima da zona". */
  resumo: string;
  /** A situação para o narrador; nula sem semana travada. */
  evento: SituacaoDoMes | null;
  /** A distância que a frase pode citar ("3 pontos"); nula quando não há. */
  dif: string | null;
}

const pts = (n: number) => `${n} ${n === 1 ? 'pt' : 'pts'}`;

/** "2 de 5 semanas" (sem o "fechadas" da aba Temporada). */
export const textoSemanas = (fechadas: number, total: number): string => `${fechadas} de ${total} ${total === 1 ? 'semana' : 'semanas'}`;

export interface EntradaDoBloco {
  linha: LinhaTemporada;
  /** A série do meu time, em qualquer ordem. */
  daSerie: readonly LinhaTemporada[];
  mes: string;
  fechadas: number;
  agora: Date;
}

/** Textos do bloco das divisões da Home. Só para os 20 times; a pré-temporada só põe o selo de sempre na tela. */
export function blocoDasDivisoes(e: EntradaDoBloco): BlocoDasDivisoes {
  const { linha } = e;
  const nomeSerie = nomeDaSerie(linha.serie);
  const nomeMes = mesPorExtenso(e.mes);
  const total = segundasDoMes(e.mes).length;

  if (semSemanaFechada(e.daSerie)) {
    const travando = e.agora.getTime() >= primeiraTrava(e.mes).getTime();
    const trava = travando ? 'a 1ª semana tá travando' : 'a 1ª semana trava segunda, 12h';
    const serie = `${maiuscula(nomeSerie)} de ${nomeMes}`;
    return { posicao: '–', serie, situacao: maiuscula(trava), resumo: `${serie} · ${trava}`, evento: null, dif: null };
  }

  const ordem = [...e.daSerie].sort((a, b) => a.posicao - b.posicao);
  const p = linha.posicao;
  const zona = zonaDaLinha(linha.serie, p);
  const ponto = (i: number) => ordem[i]?.pontos ?? linha.pontos;
  let texto: string;
  let evento: SituacaoDoMes;
  let dif: number | null = null;

  if (p === 1) {
    evento = 'temporada_lider';
    const vantagem = linha.pontos - ponto(1);
    texto = ordem.length < 2 ? 'na ponta' : vantagem > 0 ? `${pts(vantagem)} à frente` : 'na ponta no desempate';
  } else if (zona === 'acesso') {
    evento = 'temporada_acesso';
    texto = 'na zona de acesso';
  } else if (zona === 'queda') {
    evento = 'temporada_queda';
    dif = ponto(7) - linha.pontos;
    texto = dif > 0 ? `na zona, ${pts(dif)} do 8º` : 'na zona, com os pontos do 8º';
  } else if (linha.serie === 'a') {
    evento = 'temporada_meio';
    const folga = linha.pontos - ponto(8);
    texto = folga > 0 ? `${pts(folga)} acima da zona` : 'acima da zona no desempate';
  } else if (linha.serie === 'b') {
    evento = 'temporada_meio';
    const falta = ponto(1) - linha.pontos;
    texto = falta > 0 ? `${pts(falta)} do acesso` : 'com os pontos do 2º';
  } else if (p <= 10) {
    evento = 'temporada_acesso';
    texto = 'por enquanto vai pra Série A';
  } else {
    evento = 'temporada_meio';
    const falta = ponto(9) - linha.pontos;
    texto = falta > 0 ? `${pts(falta)} da última vaga da Série A` : 'com os pontos do 10º';
  }

  return {
    posicao: `${p}º`,
    serie: `Na ${nomeSerie} · ${nomeMes}`,
    situacao: `${texto} · ${textoSemanas(e.fechadas, total)}`,
    resumo: `${p}º${linha.serie === 'unica' ? '' : ` na ${nomeSerie}`} · ${texto}`,
    evento,
    dif: dif !== null && dif > 0 ? pontos(dif) : null,
  };
}

// ---------- Fim do mês: a placa da Home e o card (Rota 1, "tabela final no telão") ----------

export type DestinoDoMes = 'campeao' | 'campeao_b' | 'subiu' | 'fica_a' | 'fica_b' | 'caiu' | 'unica_a' | 'unica_b' | 'estreia';

/** O destino do meu time num mês fechado; nulo sem a foto do fim do mês. */
export function destinoDoMes(l: LinhaTemporada, t: Pick<Temporada, 'pre_temporada' | 'campeao_estreia_id'>): DestinoDoMes | null {
  if (l.posicao_final === null || !l.destino) return null;
  if (l.serie === 'unica') {
    if (!t.pre_temporada && t.campeao_estreia_id === l.time_id) return 'estreia';
    return l.destino === 'a' ? 'unica_a' : 'unica_b';
  }
  if (l.serie === 'a') {
    if (l.posicao_final === 1) return 'campeao';
    return l.destino === 'b' ? 'caiu' : 'fica_a';
  }
  if (l.posicao_final === 1) return 'campeao_b';
  return l.destino === 'a' ? 'subiu' : 'fica_b';
}

/** O destino em Anton na placa. */
export const TITULO_DO_DESTINO: Record<DestinoDoMes, string> = {
  campeao: 'CAMPEÃO DA TEMPORADA',
  campeao_b: 'CAMPEÃO DA SÉRIE B',
  subiu: 'SUBIU PRA SÉRIE A',
  fica_a: 'FICA NA SÉRIE A',
  fica_b: 'FICA NA SÉRIE B',
  caiu: 'CAIU PRA SÉRIE B',
  unica_a: 'VAI PRA SÉRIE A',
  unica_b: 'COMEÇA NA SÉRIE B',
  estreia: 'CAMPEÃO DA ESTREIA',
};

/** O selo inclinado do card. */
export const SELO_DO_DESTINO: Record<DestinoDoMes, string> = {
  campeao: 'CAMPEÃO',
  campeao_b: 'CAMPEÃO',
  subiu: 'SUBIU!',
  fica_a: 'FICOU',
  fica_b: 'FICOU',
  caiu: 'CAIU',
  unica_a: 'SÉRIE A!',
  unica_b: 'SÉRIE B',
  estreia: 'CAMPEÃO',
};

/** O emblema desenhado: seta para cima em verde, para baixo em cinza, e um traço neutro para quem fica. */
export function emblemaDoDestino(d: DestinoDoMes): 'sobe' | 'desce' | 'fica' {
  if (d === 'caiu') return 'desce';
  if (d === 'fica_a' || d === 'fica_b' || d === 'unica_b') return 'fica';
  return 'sobe';
}

/** Papel picado e vibração só em campeão, campeão da B, subiu, "vai pra Série A" e Campeão da estreia. */
export const temFesta = (d: DestinoDoMes): boolean =>
  d === 'campeao' || d === 'campeao_b' || d === 'subiu' || d === 'unica_a' || d === 'estreia';

/** "Fim de dezembro · temporada fechada" (topo da placa). */
export const topoDaPlaca = (mes: string): string => `Fim de ${mesPorExtenso(mes)} · temporada fechada`;

/** "FIM DE DEZEMBRO" (topo do card). */
export const topoDoCardDoMes = (mes: string): string => `FIM DE ${mesPorExtenso(mes).toLocaleUpperCase('pt-BR')}`;

/** "O Cruzeiro terminou em 2º na Série B · 61 pts · 2 vitórias de semana" (sem vitória, a última parte some). */
export function linhaDoFim(l: LinhaTemporada, time: TimeDaFrase): string {
  const p = l.posicao_final ?? l.posicao;
  const partes = [`${maiuscula(time.artigo)} ${time.nome} terminou em ${p}º na ${nomeDaSerie(l.serie)}`, pts(l.pontos), textoVitorias(l.vitorias)];
  return partes.filter(Boolean).join(' · ');
}

/** Os troféus da Galeria que o mês deu ao time, iguais aos de `galeria_trofeus` (pré-temporada não dá troféu). */
export function trofeusDoMes(l: LinhaTemporada, t: Temporada): Trofeu[] {
  if (t.pre_temporada || !t.fechada_em || l.posicao_final === null) return [];
  const de = (trofeu: Trofeu['trofeu'], serie: Serie): Trofeu => ({ trofeu, prateleira: 'trofeus', time_id: l.time_id, semana: null, mes: t.mes, serie });
  const lista: Trofeu[] = [];
  if (l.serie === 'a' && l.posicao_final === 1) lista.push(de('campeao_temporada', 'a'));
  if (l.serie === 'b' && l.posicao_final === 1) lista.push(de('campeao_serie_b', 'b'));
  if (l.serie === 'b' && l.destino === 'a') lista.push(de('acesso', 'b'));
  if (t.campeao_estreia_id === l.time_id) lista.push(de('campeao_estreia', 'unica'));
  return lista;
}

/** O time caiu da Série A neste mês fechado (para a zoeira com o rival na placa e no card). */
export const caiuNoMes = (linhas: readonly LinhaTemporada[], timeId: string | undefined): boolean =>
  !!timeId && linhas.some((l) => l.time_id === timeId && l.serie === 'a' && l.destino === 'b');

/** Quantos dias depois do fechamento a placa ainda aparece (o mesmo prazo do "Troféu novo"). */
export const DIAS_DA_PLACA_DO_MES = 21;

/** Dia de Brasília ("AAAA-MM-DD") de um instante ISO. */
const diaDeBrasilia = (instante: string) => new Date(Date.parse(instante) - 3 * 3600_000).toISOString().slice(0, 10);

/**
 * O mês que a placa de fim do mês anuncia: o mais recente já fechado, se este aparelho ainda não o viu e se fechou há
 * até `DIAS_DA_PLACA_DO_MES` dias. `hoje` é "AAAA-MM-DD" (dia de Brasília).
 */
export function mesParaAnunciar(temporadas: readonly Temporada[], visto: string | undefined, hoje: string): Temporada | null {
  const fechadas = temporadas.filter((t) => t.fechada_em).sort((a, b) => (a.mes < b.mes ? 1 : -1));
  const t = fechadas[0];
  if (!t || t.mes === visto) return null;
  const dia = diaDeBrasilia(t.fechada_em!);
  const limite = iso(Date.parse(`${hoje}T00:00:00Z`) - DIAS_DA_PLACA_DO_MES * DIA_MS);
  return dia >= limite && dia <= hoje ? t : null;
}

export interface FatiaDaTabela {
  /** Até `n` linhas da série em volta do meu time, na ordem final. */
  linhas: LinhaTemporada[];
  /** Onde passa o tracejado, se cair dentro da fatia: depois da linha de posição final `depoisDe`. */
  corte: { depoisDe: number; tipo: 'sobem' | 'caem' } | null;
}

/** O pedaço da tabela final no telão do card: o meu time no meio, com a linha de quem sobe ou cai. */
export function fatiaDaTabela(daSerie: readonly LinhaTemporada[], meuTime: string, n = 5): FatiaDaTabela {
  const ordem = ordenarLinhas([...daSerie], { fechado: true, semSemana: false });
  const i = Math.max(0, ordem.findIndex((l) => l.time_id === meuTime));
  const inicio = Math.min(Math.max(0, i - Math.floor(n / 2)), Math.max(0, ordem.length - n));
  const linhas = ordem.slice(inicio, inicio + n);
  const serie = ordem[0]?.serie ?? 'unica';
  const pos = (l: LinhaTemporada) => l.posicao_final ?? l.posicao;
  const regra =
    serie === 'a'
      ? { depoisDe: 8, tipo: 'caem' as const }
      : serie === 'b'
        ? { depoisDe: 2, tipo: 'sobem' as const }
        : { depoisDe: 10, tipo: 'sobem' as const };
  const dentro = linhas.some((l) => pos(l) === regra.depoisDe) && linhas.some((l) => pos(l) === regra.depoisDe + 1);
  return { linhas, corte: dentro ? regra : null };
}

/**
 * Texto do "Mandar no grupo" do fim do mês (emoji antigo, sem nome de pessoa). O link vai à parte.
 * " Eu tava na arquibancada." só para quem somou no mês, e nunca na queda.
 */
export function textoDeMandarTemporada(d: DestinoDoMes, time: TimeDaFrase, mes: string, somou: boolean): string {
  const proximo = mesPorExtenso(mesSeguinte(mes));
  const eu = somou ? ' Eu tava na arquibancada.' : '';
  switch (d) {
    case 'campeao':
      return `🏆 ${time.nome} campeão da temporada no Guerra de Torcidas!${eu}`;
    case 'campeao_b':
      return `🏆 ${time.nome} campeão da Série B no Guerra de Torcidas! Vai pra Série A.${eu}`;
    case 'subiu':
      return `⬆️ ${time.nome} subiu pra Série A no Guerra de Torcidas!${eu}`;
    case 'fica_a':
      return `⚽ ${time.nome} fica na Série A no Guerra de Torcidas.${eu}`;
    case 'fica_b':
      return `⚽ ${time.nome} fica na Série B no Guerra de Torcidas.${eu}`;
    case 'caiu':
      return `⬇️ ${time.nome} caiu pra Série B. Em ${proximo} tem volta.`;
    case 'unica_a':
      return `⬆️ ${time.nome} vai pra Série A em ${proximo} no Guerra de Torcidas!${eu}`;
    case 'unica_b':
      return `⚽ ${time.nome} começa ${proximo} na Série B no Guerra de Torcidas.${eu}`;
    case 'estreia':
      return `⭐ ${time.nome} Campeão da estreia do Guerra de Torcidas!${eu}`;
  }
}
