// Galeria de Troféus, 52 semanas e Campeãs de estado (docs/jogo.md, seção 5, "Longo prazo" e "Telas aprovadas
// em 05/11/2026"). Módulo puro: sem DOM, banco nem relógio. Datas entram como parâmetro ("AAAA-MM-DD").
// O servidor diz quem ganhou o quê (galeria_trofeus, galeria_cidades, ranking_52_semanas); aqui ficam a estante,
// os textos e o que a Home anuncia.

import type { Serie } from './temporada';

export type TipoDeTrofeu =
  | 'campeao_semana'
  | 'maior_torcida'
  | 'campeao_temporada'
  | 'campeao_serie_b'
  | 'acesso'
  | 'rebaixamento'
  | 'campeao_estreia';

/** Uma linha de `galeria_trofeus`. Troféu da semana tem `semana`; da temporada, `mes`. */
export interface Trofeu {
  trofeu: TipoDeTrofeu;
  prateleira: 'trofeus' | 'vitrine';
  time_id: string;
  semana: string | null;
  mes: string | null;
  serie: Serie | null;
}

/** Uma linha de `ranking_52_semanas`. */
export interface Linha52 {
  posicao: number;
  time_id: string;
  pontos: number;
  vitorias: number;
  ultima_posicao: number | null;
  semanas: number;
  desde: string | null;
  ate: string | null;
}

/** Uma linha de `galeria_cidades`. */
export interface CampeaDeEstado {
  semana: string;
  uf: string;
  codigo: number;
  nome: string;
}

/** O nome e o artigo do time, para os textos. */
export interface TimeDoTexto {
  nome: string;
  artigo: 'o' | 'a';
}

const DIA_MS = 24 * 3600_000;
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const ms = (dia: string) => Date.UTC(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)));
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const somarDias = (dia: string, n: number) => iso(ms(dia) + n * DIA_MS);
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const ddmmaaaa = (dia: string) => `${ddmm(dia)}/${dia.slice(0, 4)}`;
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const vezes = (n: number) => `${n} ${n === 1 ? 'vez' : 'vezes'}`;
const pontos = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'ponto' : 'pontos'}`;

/** "fev/2027". */
export const mesCurto = (mes: string): string => `${MESES_CURTOS[Number(mes.slice(5, 7)) - 1]}/${mes.slice(0, 4)}`;
const mesNome = (mes: string | null) => MESES[Number((mes ?? '').slice(5, 7)) - 1] ?? '';
/** "Março de 2027". */
export const mesLongo = (mes: string): string => `${maiuscula(MESES[Number(mes.slice(5, 7)) - 1])} de ${mes.slice(0, 4)}`;

// ---------- nomes e chaves ----------

export const NOME_DO_TROFEU: Record<TipoDeTrofeu, string> = {
  campeao_semana: 'Campeão da semana',
  maior_torcida: 'Maior torcida',
  campeao_temporada: 'Campeão da temporada',
  campeao_serie_b: 'Campeão da Série B',
  acesso: 'Acesso à Série A',
  rebaixamento: 'Queda pra Série B',
  campeao_estreia: 'Campeão da estreia',
};

/** Chave única de um troféu (o que o aparelho guarda como "já anunciado"). */
export const chaveDoTrofeu = (t: Trofeu): string => `${t.trofeu}|${t.semana ?? t.mes ?? ''}|${t.serie ?? ''}|${t.time_id}`;

/** "Série A", "Série B" ou "Série única"; nulo para a vitrine (vale para os 20 juntos). */
export function serieDoTrofeu(t: Trofeu): string | null {
  if (t.trofeu === 'maior_torcida') return null;
  if (t.trofeu === 'acesso') return 'Série B → Série A';
  if (t.trofeu === 'rebaixamento') return 'Série A → Série B';
  return t.serie === 'a' ? 'Série A' : t.serie === 'b' ? 'Série B' : 'Série única';
}

/** "Semana de 02/11 a 08/11/2026" ou "Março de 2027". */
export function periodoDoTrofeu(t: Trofeu): string {
  if (t.semana) return `Semana de ${ddmm(t.semana)} a ${ddmmaaaa(somarDias(t.semana, 6))}`;
  return t.mes ? mesLongo(t.mes) : '';
}

/** Uma frase do que o troféu é (a regra, sem número). */
export const EXPLICACAO_DO_TROFEU: Record<TipoDeTrofeu, string> = {
  campeao_semana: 'A maior média dos 30 melhores torcedores na semana. Título se ganha por média, não por tamanho.',
  maior_torcida: 'A maior soma de pontos da semana, de todo mundo que jogou. É vitrine: soma de todo mundo, não é título.',
  campeao_temporada: 'O 1º da Série A na soma das semanas do mês, pelos pontos de campeonato.',
  campeao_serie_b: 'O 1º da Série B na soma das semanas do mês, pelos pontos de campeonato.',
  acesso: 'Um dos 2 primeiros da Série B no fim do mês: sobe pra Série A.',
  rebaixamento: 'Um dos 2 últimos da Série A no fim do mês: desce pra Série B.',
  campeao_estreia: 'O 1º do mês de estreia, com os 20 times juntos, antes da Série A e B.',
};

// ---------- estante ----------

export interface Taca {
  tipo: 'campeao_estreia' | 'campeao_temporada' | 'campeao_serie_b';
  nome: string;
  /** 0 = ainda não (desenho tracejado). */
  vezes: number;
  /** "×3" só quando repetiu. */
  multiplo: string | null;
  /** O mais recente, para abrir a ficha. */
  ultimo: Trofeu | null;
}

export interface Flamula {
  trofeu: Trofeu;
  /** "02/11/2026" (a segunda-feira da semana). */
  data: string;
  serieB: boolean;
}

export interface Estante {
  /** Troféus no botão do topo ("N troféus"): todos menos o rebaixamento. */
  total: number;
  tacas: Taca[];
  /** Uma flâmula por semana, da mais nova à mais antiga. */
  flamulas: Flamula[];
  vitrine: { vezes: number; multiplo: string | null; ultimo: Trofeu | null };
}

const ORDEM_DAS_TACAS: Taca['tipo'][] = ['campeao_estreia', 'campeao_temporada', 'campeao_serie_b'];
const multiplo = (n: number) => (n > 1 ? `×${n}` : null);
const maisNovo = (a: Trofeu, b: Trofeu) => ((b.semana ?? b.mes ?? '') > (a.semana ?? a.mes ?? '') ? 1 : -1);

/** Monta as prateleiras de um time a partir das linhas de `galeria_trofeus`. */
export function montarEstante(trofeus: readonly Trofeu[]): Estante {
  const ordenados = [...trofeus].sort(maisNovo);
  const doTipo = (tipo: TipoDeTrofeu) => ordenados.filter((t) => t.trofeu === tipo);
  const tacas = ORDEM_DAS_TACAS.map((tipo): Taca => {
    const lista = doTipo(tipo);
    return { tipo, nome: NOME_DO_TROFEU[tipo], vezes: lista.length, multiplo: multiplo(lista.length), ultimo: lista[0] ?? null };
  });
  const flamulas = doTipo('campeao_semana').map((t) => ({ trofeu: t, data: ddmmaaaa(t.semana ?? ''), serieB: t.serie === 'b' }));
  const vitrine = doTipo('maior_torcida');
  return {
    total: ordenados.filter((t) => t.trofeu !== 'rebaixamento').length,
    tacas,
    flamulas,
    vitrine: { vezes: vitrine.length, multiplo: multiplo(vitrine.length), ultimo: vitrine[0] ?? null },
  };
}

/** "Nenhum troféu ainda", "1 troféu", "12 troféus". */
export const textoDoTotal = (n: number): string => (n === 0 ? 'Nenhum troféu ainda' : `${n} ${n === 1 ? 'troféu' : 'troféus'}`);

// ---------- sobe e desce ----------

/** A série do time num mês (de `temporada_serie`), já sem os meses de pré-temporada. */
export interface SerieDoMes {
  mes: string;
  serie: Serie;
}

/**
 * Linha neutra de sobe e desce: "Na Série A desde fev/2027 · nunca caiu". Nula enquanto não há Série A e B
 * (pré-temporada e mês de estreia). O mês de estreia que manda o time para a A não conta como acesso.
 */
export function fraseSobeDesce(historico: readonly SerieDoMes[]): string | null {
  const meses = [...historico].filter((h) => h.serie !== 'unica').sort((a, b) => (a.mes < b.mes ? -1 : 1));
  if (meses.length === 0) return null;
  const atual = meses[meses.length - 1].serie;
  let desde = meses.length - 1;
  while (desde > 0 && meses[desde - 1].serie === atual) desde--;
  let quedas = 0;
  let acessos = 0;
  for (let i = 1; i < meses.length; i++) {
    if (meses[i - 1].serie === 'a' && meses[i].serie === 'b') quedas++;
    if (meses[i - 1].serie === 'b' && meses[i].serie === 'a') acessos++;
  }
  const inicio = `Na Série ${atual === 'a' ? 'A' : 'B'} desde ${mesCurto(meses[desde].mes)}`;
  const resto =
    atual === 'a'
      ? quedas === 0
        ? 'nunca caiu'
        : `caiu ${vezes(quedas)}`
      : acessos === 0
        ? 'ainda sem acesso'
        : `subiu ${vezes(acessos)}`;
  return `${inicio} · ${resto}`;
}

// ---------- ficha do troféu ----------

/** Uma linha de `fechamento_semana` (só o que a ficha usa). */
export interface LinhaDaSemana {
  time_id: string;
  ativos: number;
  soma: number;
  media30: number;
  posicao_campeao: number;
  posicao_soma: number;
}

/** Uma linha de `classificacao_temporada` (só o que a ficha usa). */
export interface LinhaDoMes {
  time_id: string;
  serie: Serie;
  posicao: number;
  pontos: number;
  vitorias: number;
}

export interface NumeroDaFicha {
  valor: string;
  rotulo: string;
}

const decimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const inteiro = (n: number) => Math.round(n).toLocaleString('pt-BR');

/**
 * Os 3 números públicos da ficha. Na semana: média dos 30 (ou soma, na vitrine), quantos jogaram e a vantagem
 * sobre o 2º da mesma série (`series`: a série de cada time no mês da semana; vazio = série única). No mês:
 * pontos, vitórias e posição. Sem a linha do time, devolve vazio (a ficha sai sem números).
 */
export function numerosDaFicha(
  t: Trofeu,
  dados: { semana?: readonly LinhaDaSemana[]; series?: ReadonlyMap<string, Serie>; mes?: readonly LinhaDoMes[] },
): NumeroDaFicha[] {
  if (t.semana) {
    const linhas = dados.semana ?? [];
    const eu = linhas.find((l) => l.time_id === t.time_id);
    if (!eu) return [];
    if (t.trofeu === 'maior_torcida') {
      const segundo = [...linhas].filter((l) => l.time_id !== t.time_id).sort((a, b) => a.posicao_soma - b.posicao_soma)[0];
      return [
        { valor: inteiro(eu.soma), rotulo: 'pontos somados' },
        { valor: inteiro(eu.ativos), rotulo: eu.ativos === 1 ? 'jogou' : 'jogaram' },
        { valor: `+${inteiro(eu.soma - (segundo?.soma ?? 0))}`, rotulo: 'sobre o 2º' },
      ];
    }
    const serieDe = (id: string) => dados.series?.get(id) ?? 'unica';
    const minhaSerie = serieDe(t.time_id);
    const segundo = [...linhas]
      .filter((l) => l.time_id !== t.time_id && serieDe(l.time_id) === minhaSerie)
      .sort((a, b) => a.posicao_campeao - b.posicao_campeao)[0];
    return [
      { valor: decimal(eu.media30), rotulo: 'média dos 30' },
      { valor: inteiro(eu.ativos), rotulo: eu.ativos === 1 ? 'jogou' : 'jogaram' },
      { valor: `+${decimal(eu.media30 - (segundo?.media30 ?? 0))}`, rotulo: 'sobre o 2º' },
    ];
  }
  const eu = (dados.mes ?? []).find((l) => l.time_id === t.time_id);
  if (!eu) return [];
  return [
    { valor: inteiro(eu.pontos), rotulo: eu.pontos === 1 ? 'ponto' : 'pontos' },
    { valor: inteiro(eu.vitorias), rotulo: eu.vitorias === 1 ? 'vitória de semana' : 'vitórias de semana' },
    { valor: `${eu.posicao}º`, rotulo: 'posição' },
  ];
}

/**
 * "Você tava em campo: 340 pontos nessa semana", só em troféu de semana, na Galeria do próprio time, e só para
 * quem somou (pontos da pessoa na semana, `minha_posicao_semana`).
 */
export function linhaEmCampo(t: Trofeu, meuTime: string | undefined, meusPontos: number | null): string | null {
  if (!t.semana || t.time_id !== meuTime || !meusPontos || meusPontos <= 0) return null;
  return `Você tava em campo: ${pontos(meusPontos)} nessa semana`;
}

// ---------- mandar no grupo ----------

export const LINK_DO_JOGO = 'https://torcida.kauewalter.com.br';

/** Texto do "Mandar no grupo" (emoji antigo, sem nome de pessoa). O link vai à parte. */
export function textoDeMandarTrofeu(t: Trofeu, time: TimeDoTexto): string {
  const serie = t.serie === 'a' ? ' na Série A' : t.serie === 'b' ? ' na Série B' : '';
  switch (t.trofeu) {
    case 'campeao_semana':
      return `🏆 ${time.nome} campeão da semana${serie} do Guerra de Torcidas!`;
    case 'maior_torcida':
      return `📣 ${time.nome} maior torcida da semana no Guerra de Torcidas!`;
    case 'campeao_temporada':
      return `🏆 ${time.nome} campeão da temporada de ${mesNome(t.mes)} no Guerra de Torcidas!`;
    case 'campeao_serie_b':
      return `🏆 ${time.nome} campeão da Série B de ${mesNome(t.mes)} no Guerra de Torcidas!`;
    case 'campeao_estreia':
      return `⭐ ${time.nome} Campeão da estreia do Guerra de Torcidas!`;
    case 'acesso':
      return `⬆️ ${time.nome} subiu pra Série A no Guerra de Torcidas!`;
    case 'rebaixamento':
      return `${time.nome} no Guerra de Torcidas.`;
  }
}

// ---------- Home: o que anunciar ----------

/** Quantos dias depois de ganhar o troféu ainda é "novo" (aparelho novo não anuncia troféu velho). */
export const DIAS_DE_NOVIDADE = 21;
/** Quantas chaves o aparelho guarda (as mais novas). */
export const MAX_ANUNCIADOS = 80;

/** Quando o troféu foi ganho: o dia seguinte ao fim da semana ou do mês. */
export function ganhoEm(t: Trofeu): string {
  if (t.semana) return somarDias(t.semana, 7);
  const mes = t.mes ?? '1970-01-01';
  const ano = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  return iso(Date.UTC(ano, m, 1));
}

export interface Anuncio {
  /** O mais novo, que a placa mostra. */
  trofeu: Trofeu;
  /** Quantos outros novos chegaram junto ("+1 troféu novo"). */
  outros: number;
  /** As chaves para guardar no aparelho (todas as anunciadas agora). */
  chaves: string[];
}

/**
 * O que a placa da Home anuncia: troféus do time do coração (menos o rebaixamento) que este aparelho ainda não
 * anunciou e que foram ganhos há até `DIAS_DE_NOVIDADE` dias. Mostra o mais novo; os outros entram no "+N" e são
 * marcados juntos, para a placa aparecer uma vez só por troféu.
 */
export function trofeuParaAnunciar(
  trofeus: readonly Trofeu[],
  o: { meuTime: string | undefined; anunciados: readonly string[]; hoje: string },
): Anuncio | null {
  if (!o.meuTime) return null;
  const vistos = new Set(o.anunciados);
  const limite = somarDias(o.hoje, -DIAS_DE_NOVIDADE);
  const novos = trofeus
    .filter((t) => t.time_id === o.meuTime && t.trofeu !== 'rebaixamento')
    .filter((t) => !vistos.has(chaveDoTrofeu(t)))
    .filter((t) => ganhoEm(t) >= limite && ganhoEm(t) <= o.hoje)
    .sort(maisNovo);
  if (novos.length === 0) return null;
  return { trofeu: novos[0], outros: novos.length - 1, chaves: novos.map(chaveDoTrofeu) };
}

/** Junta as chaves novas às já guardadas, sem repetir e ficando com as `MAX_ANUNCIADOS` mais recentes. */
export function guardarAnunciados(antes: readonly string[], novas: readonly string[]): string[] {
  const todas = [...antes.filter((c) => !novas.includes(c)), ...novas];
  return todas.slice(-MAX_ANUNCIADOS);
}

/** "+1 troféu novo" / "+2 troféus novos" (nulo sem outros). */
export const textoDosOutros = (n: number): string | null => (n <= 0 ? null : `+${n} ${n === 1 ? 'troféu novo' : 'troféus novos'}`);

// ---------- 52 semanas ----------

/**
 * "10 de 52 semanas · 04/01 a 14/03/2027": de segunda da primeira semana ao domingo da última. Nula sem semana
 * travada.
 */
export function textoDaJanela(l: Pick<Linha52, 'semanas' | 'desde' | 'ate'> | undefined): string | null {
  if (!l || !l.semanas || !l.desde || !l.ate) return null;
  const fim = somarDias(l.ate, 6);
  const inicio = l.desde.slice(0, 4) === fim.slice(0, 4) ? ddmm(l.desde) : ddmmaaaa(l.desde);
  return `${l.semanas} de 52 semanas · ${inicio} a ${ddmmaaaa(fim)}`;
}

export interface PlacaDoTime {
  posicao: number;
  pontos: number;
  vitorias: number;
  /** "A 5 pontos do Palmeiras" / "Líder, 12 pontos na frente" / "Líder, empatado nos pontos". */
  distancia: string;
}

/** A placa do seu time nas 52 semanas. Nula para "Outro time" ou time fora da lista. */
export function placaDoTime(linhas: readonly Linha52[], meuTime: string | undefined, nomeDe: (id: string) => TimeDoTexto): PlacaDoTime | null {
  const ordem = [...linhas].sort((a, b) => a.posicao - b.posicao);
  const i = ordem.findIndex((l) => l.time_id === meuTime);
  if (i < 0) return null;
  const eu = ordem[i];
  let distancia: string;
  if (i === 0) {
    const dif = eu.pontos - (ordem[1]?.pontos ?? 0);
    distancia = dif > 0 ? `Líder, ${pontos(dif)} na frente` : 'Líder, empatado nos pontos';
  } else {
    const frente = ordem[i - 1];
    const dif = frente.pontos - eu.pontos;
    const t = nomeDe(frente.time_id);
    distancia = dif > 0 ? `A ${pontos(dif)} ${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}` : `Empatado com ${t.artigo} ${t.nome}, atrás no desempate`;
  }
  return { posicao: eu.posicao, pontos: eu.pontos, vitorias: eu.vitorias, distancia };
}

/** Largura da barrinha (0 a 1), proporcional ao líder. */
export function fracaoDaBarra(pontosDoTime: number, pontosDoLider: number): number {
  if (pontosDoLider <= 0) return 0;
  return Math.max(0, Math.min(1, pontosDoTime / pontosDoLider));
}

/** Top 3 das 52 semanas (o da pré-temporada, de teste). Vazio se ninguém pontuou. */
export function top3(linhas: readonly Linha52[]): Linha52[] {
  return [...linhas]
    .sort((a, b) => a.posicao - b.posicao)
    .filter((l) => l.pontos > 0)
    .slice(0, 3);
}

// ---------- pré-temporada ----------

/**
 * A Galeria está em pré-temporada quando não há temporada nenhuma ou a mais recente é de pré-temporada (o zerar
 * apaga as de teste e abre a estreia, que não é).
 */
export function galeriaEmPreTemporada(temporadas: readonly { mes: string; pre_temporada: boolean }[]): boolean {
  if (temporadas.length === 0) return true;
  const ultima = [...temporadas].sort((a, b) => (a.mes < b.mes ? 1 : -1))[0];
  return ultima.pre_temporada;
}

export const TEXTO_PRE_GALERIA = {
  titulo: 'A GALERIA ABRE NO LANÇAMENTO',
  explica:
    'Na pré-temporada tudo vale ponto, mas zera antes do lançamento. Os troféus começam a contar depois do zerar: o primeiro campeão da semana sai na primeira semana fechada.',
  seloTeste: 'Teste: zera no lançamento',
  top3: 'Top 3 das 52 semanas de teste',
} as const;

// ---------- campeãs de estado ----------

export interface Campeas {
  /** As que mais ganharam (todas empatadas no máximo, até 3). */
  maisVezes: { codigo: number; nome: string; vezes: number }[];
  /** Sua cidade, só se ela já ganhou. */
  minha: { nome: string; vezes: number } | null;
  /** Uma por semana, da mais nova à mais antiga. */
  semanas: { semana: string; data: string; codigo: number; nome: string }[];
}

/** Resume as campeãs de um estado. `minhaCidade` é o código IBGE da cidade da pessoa (ou nulo). */
export function resumirCampeas(linhas: readonly CampeaDeEstado[], minhaCidade: number | null): Campeas {
  const contagem = new Map<number, { codigo: number; nome: string; vezes: number }>();
  for (const l of linhas) {
    const c = contagem.get(l.codigo) ?? { codigo: l.codigo, nome: l.nome, vezes: 0 };
    c.vezes++;
    contagem.set(l.codigo, c);
  }
  const lista = [...contagem.values()].sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome, 'pt-BR'));
  const max = lista[0]?.vezes ?? 0;
  const minha = minhaCidade !== null ? contagem.get(minhaCidade) : undefined;
  return {
    maisVezes: lista.filter((c) => c.vezes === max).slice(0, 3),
    minha: minha ? { nome: minha.nome, vezes: minha.vezes } : null,
    semanas: [...linhas]
      .sort((a, b) => (a.semana < b.semana ? 1 : -1))
      .map((l) => ({ semana: l.semana, data: `Semana de ${ddmmaaaa(l.semana)}`, codigo: l.codigo, nome: l.nome })),
  };
}

/** "3 vezes campeã" / "1 vez campeã". */
export const textoCampea = (n: number): string => `${vezes(n)} campeã`;
