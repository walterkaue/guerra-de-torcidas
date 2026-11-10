// Central de avisos (docs/visual.md, "Central de avisos"; docs/jogo.md, seção 7): o sininho do topo da Home é a caixa
// de avisos do jogo, para todo mundo. Aviso é o que acontece uma vez e pede uma ação ou um "ok"; informação (placar,
// tabela, cidade) mora na Home. Puro, sem DOM: decide quais avisos existem a partir do estado do aparelho e do que a
// Home já leu. O aparelho guarda só ids e dias (gdt:prefs.avisos), nunca texto.
//
// Dois jeitos de um aviso existir:
// - por estado: a regra olha o aparelho na hora (Termos não lidos, cidade por escolher, aquecimento por abrir);
// - por registro: um momento do jogo põe o id na caixa (`registrar`), e ele fica até a pessoa resolver ou dispensar
//   (troféu e placa do mês que a vaga mostrou, peça nova anunciada no resultado, desafio aberto e não jogado).
// Para um aviso novo (o "O que mudou" do B04, por exemplo): um tipo em TIPOS, os textos em TEXTOS e, se for por
// registro, um prefixo de id e quem chama `registrar`.
//
// ECA (jogo.md, seção 7): nada de urgência, prazo, contagem ou "não perca" nos textos; nada pune quem não abre a caixa.

import { deveLembrarDaCidade } from './rankingCidades';

/** Os tipos, na ordem em que aparecem dentro de cada grupo (novos e já vistos). */
export const TIPOS = ['desafio', 'mes', 'trofeu', 'peca', 'termos', 'cidade', 'aquecimento'] as const;
export type TipoDeAviso = (typeof TIPOS)[number];

/** O que a pessoa toca em cada aviso. Botão no infinitivo, de 1 a 3 palavras (docs/narrador.md, regras de estilo). */
export const TEXTOS: Record<TipoDeAviso, { titulo: string; linha: string; acao: string }> = {
  desafio: { titulo: 'Desafio', linha: 'Você abriu um desafio e ainda não jogou.', acao: 'Encarar' },
  mes: { titulo: 'O mês fechou', linha: 'Veja como sua torcida terminou o mês.', acao: 'Ver' },
  trofeu: { titulo: 'Troféu da semana', linha: 'Tem troféu novo da sua torcida na Galeria.', acao: 'Ver' },
  peca: { titulo: 'Peça nova no vestiário', linha: 'Seu boneco ganhou peça nova pra vestir.', acao: 'Vestir' },
  termos: { titulo: 'Os Termos mudaram', linha: 'Tem versão nova dos Termos e da privacidade.', acao: 'Ler' },
  cidade: { titulo: 'Defende sua cidade também?', linha: 'Seus pontos somam também pra sua cidade.', acao: 'Escolher' },
  aquecimento: { titulo: 'Conheça os outros jogos', linha: 'Um aquecimento de 1 minuto pelos jogos.', acao: 'Abrir' },
};

/** Textos fixos da folha. */
export const TITULO_DA_CAIXA = 'Avisos';
export const ROTULO_JA_VISTOS = 'Já vistos';
export const ROTULO_DISPENSAR = 'Dispensar';
export const CAIXA_VAZIA = { titulo: 'Tudo em dia', linha: 'Quando o jogo tiver novidade pra você, ela aparece aqui.' };

/** aria-label do sininho: "Avisos" ou "Avisos, N novos". */
export function rotuloDoSininho(novos: number): string {
  if (novos <= 0) return TITULO_DA_CAIXA;
  return `${TITULO_DA_CAIXA}, ${novos} ${novos === 1 ? 'novo' : 'novos'}`;
}

/** O número no canto do sininho: nada sem novos; acima de 9, "9+". */
export function numeroDoSininho(novos: number): string | null {
  if (novos <= 0) return null;
  return novos > 9 ? '9+' : String(novos);
}

// ---------------------------------------------------------------------------
// Ids (o que vai para o aparelho)
// ---------------------------------------------------------------------------

/** Tipos de desafio por link (os mesmos de jogo/conviteDesafio.ts). */
export type TipoDoDesafio = 'penaltis' | 'lances' | 'prova';
const TIPOS_DO_DESAFIO: readonly TipoDoDesafio[] = ['penaltis', 'lances', 'prova'];

/** Só letras, números, ponto, hífen e sublinhado: o que vem do aparelho nunca vira HTML nem rota estranha. */
const PEDACO = /^[A-Za-z0-9._-]{1,80}$/;
const MES = /^\d{4}-\d{2}$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

export const idDoTermos = (versao: string): string => `termos:${versao}`;
export const idDoTrofeu = (chave: string): string => `trofeu:${chave}`;
/** `mes`: "AAAA-MM" ou o "AAAA-MM-01" que as placas guardam. */
export const idDoMes = (mes: string): string => `mes:${mes.slice(0, 7)}`;
export const idDaPeca = (peca: string): string => `peca:${peca}`;
export const idDoDesafio = (tipo: TipoDoDesafio, codigo: string): string => `desafio:${tipo}:${codigo}`;
export const ID_DA_CIDADE = 'cidade';
export const ID_DO_AQUECIMENTO = 'aquecimento';

/** Ids que só existem por registro, com a validação de cada um. */
function idRegistravel(id: string): boolean {
  const [tipo, ...resto] = id.split(':');
  if (tipo === 'termos') return resto.length > 0 && resto.join(':').length > 0 && resto.join(':').length <= 40;
  // A chave do troféu é a de jogo/galeria.ts (chaveDoTrofeu): "campeao_semana|2026-W45||flamengo".
  if (tipo === 'trofeu') return resto.length === 1 && /^[A-Za-z0-9._|-]{1,100}$/.test(resto[0]);
  if (tipo === 'mes') return resto.length === 1 && MES.test(resto[0]);
  if (tipo === 'peca') return resto.length === 1 && PEDACO.test(resto[0]);
  if (tipo === 'desafio') return resto.length === 2 && TIPOS_DO_DESAFIO.includes(resto[0] as TipoDoDesafio) && PEDACO.test(resto[1]);
  return false;
}

/** Quantos dias um aviso por registro fica na caixa sem ser resolvido (por dentro: o texto nunca diz prazo). */
const DIAS_NA_CAIXA: Partial<Record<TipoDeAviso, number>> = {
  // O desafio vale 7 dias desde que foi criado; contamos do dia em que a pessoa abriu o link (nunca passa disso).
  desafio: 7,
  trofeu: 30,
  mes: 30,
};
/** Dispensa de aviso por registro que ninguém mais precisa lembrar. */
const DIAS_DA_DISPENSA = 90;
/** Teto de ids guardados por lista (um aparelho esquecido não cresce sem fim). */
const TETO = 40;

const tipoDoId = (id: string): TipoDeAviso | null => {
  const t = id.split(':')[0];
  return (TIPOS as readonly string[]).includes(t) ? (t as TipoDeAviso) : null;
};

// ---------------------------------------------------------------------------
// Estado no aparelho
// ---------------------------------------------------------------------------

/** gdt:prefs.avisos. Dias em AAAA-MM-DD (de Brasília). */
export interface EstadoDosAvisos {
  /** id → dia em que a folha mostrou o aviso pela última vez. */
  vistos?: Record<string, string>;
  /** id → dia em que a pessoa tocou em "Dispensar". */
  dispensados?: Record<string, string>;
  /** id → dia em que o aviso entrou na caixa (só os por registro). */
  datas?: Record<string, string>;
}

/** Lê o que veio do aparelho sem confiar: só mapas de id → dia válidos. */
export function lerEstado(bruto: unknown): EstadoDosAvisos {
  const mapa = (x: unknown): Record<string, string> => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return {};
    const saida: Record<string, string> = {};
    for (const [id, dia] of Object.entries(x as Record<string, unknown>)) {
      if (typeof dia === 'string' && DIA.test(dia) && id.length <= 120 && tipoDoId(id)) saida[id] = dia;
    }
    return saida;
  };
  const b = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>;
  return { vistos: mapa(b.vistos), dispensados: mapa(b.dispensados), datas: mapa(b.datas) };
}

const DIA_MS = 86_400_000;
const diasEntre = (de: string, ate: string): number => {
  const a = Date.parse(`${de}T00:00:00Z`);
  const b = Date.parse(`${ate}T00:00:00Z`);
  return Number.isNaN(a) || Number.isNaN(b) ? 0 : Math.round((b - a) / DIA_MS);
};

/** Fica só com os `teto` mais recentes. */
function aparar(m: Record<string, string>, teto = TETO): Record<string, string> {
  const entradas = Object.entries(m);
  if (entradas.length <= teto) return m;
  return Object.fromEntries(entradas.sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).slice(0, teto));
}

/**
 * Um momento do jogo põe o aviso na caixa (a vaga mostrou a placa, o resultado anunciou a peça, o convite abriu o
 * desafio). Já registrado ou já dispensado: nada muda (o dia de entrada fica o primeiro). Id inválido: nada muda.
 */
export function registrar(e: EstadoDosAvisos, ids: readonly string[], hoje: string): EstadoDosAvisos {
  const datas = { ...e.datas };
  let mudou = false;
  for (const id of ids) {
    if (!idRegistravel(id) || datas[id] || e.dispensados?.[id]) continue;
    datas[id] = hoje;
    mudou = true;
  }
  return mudou ? { ...e, datas: aparar(datas) } : e;
}

/** A pessoa resolveu (fez a ação): o aviso sai da caixa e das listas. `ids` exatos ou um prefixo terminado em ":". */
export function resolver(e: EstadoDosAvisos, ids: readonly string[]): EstadoDosAvisos {
  const sai = (id: string) => ids.some((x) => (x.endsWith(':') ? id.startsWith(x) : id === x));
  const filtrar = (m: Record<string, string> | undefined) => Object.fromEntries(Object.entries(m ?? {}).filter(([id]) => !sai(id)));
  return { vistos: filtrar(e.vistos), dispensados: filtrar(e.dispensados), datas: filtrar(e.datas) };
}

/** "Dispensar": o aviso some. A cidade volta no máximo uma vez por semana; o resto não volta. */
export function dispensar(e: EstadoDosAvisos, aviso: Aviso, hoje: string): EstadoDosAvisos {
  const dispensados = { ...e.dispensados };
  const datas = { ...e.datas };
  for (const id of aviso.ids) {
    dispensados[id] = hoje;
    delete datas[id];
  }
  return { ...e, dispensados: aparar(dispensados), datas };
}

/** A folha abriu: tudo o que ela mostra passa a "Já vistos" (o número do sininho zera). */
export function marcarVistos(e: EstadoDosAvisos, avisos: readonly Aviso[], hoje: string): EstadoDosAvisos {
  const vistos = { ...e.vistos };
  for (const a of avisos) for (const id of a.ids) vistos[id] = hoje;
  return { ...e, vistos: aparar(vistos) };
}

// ---------------------------------------------------------------------------
// Quais avisos existem agora
// ---------------------------------------------------------------------------

/** O que a Home sabe nesta abertura. */
export interface EntradaDaCaixa {
  hoje: string;
  /** Versão dos Termos em vigor e a que o aparelho já leu (prefs.termosVistos). */
  termos: { atual: string; vista?: string };
  /** prefs.aquecimento: o card "Conheça os outros jogos" de quem veio por link de desafio, até abrir. */
  aquecimento?: { cardNaHome?: boolean; visto?: boolean };
  /**
   * Já jogou, não tem cidade e a sessão vale (o que a Home já lê para a barra e o bloco da cidade). `undefined`:
   * a Home ainda não sabe (rede), e o aviso não entra.
   */
  semCidade?: boolean;
}

export interface Aviso {
  tipo: TipoDeAviso;
  /** Os ids guardados que este aviso cobre (peça e troféu juntam vários num aviso só). */
  ids: string[];
  /** Só no desafio: para onde o "Encarar" leva. */
  desafio?: { tipo: TipoDoDesafio; codigo: string };
  /** Só na placa do mês: "AAAA-MM". */
  mes?: string;
}

export interface Caixa {
  novos: Aviso[];
  vistos: Aviso[];
}

/** Um aviso já foi visto se a folha o mostrou depois da última dispensa (a cidade que volta, volta como novo). */
function foiVisto(e: EstadoDosAvisos, id: string): boolean {
  const visto = e.vistos?.[id];
  if (!visto) return false;
  const dispensa = e.dispensados?.[id];
  return !dispensa || visto > dispensa;
}

/** Avisos por registro ainda de pé: dentro do prazo e, nos Termos, com a versão ainda não lida. */
function registrosDePe(e: EstadoDosAvisos, entrada: EntradaDaCaixa): string[] {
  return Object.entries(e.datas ?? {})
    .filter(([id, dia]) => {
      const tipo = tipoDoId(id);
      if (!tipo || !idRegistravel(id) || e.dispensados?.[id]) return false;
      const prazo = DIAS_NA_CAIXA[tipo];
      if (prazo !== undefined && diasEntre(dia, entrada.hoje) >= prazo) return false;
      // Termos: só a versão em vigor, e só até a pessoa abrir #termos.
      if (tipo === 'termos') return id === idDoTermos(entrada.termos.atual) && entrada.termos.vista !== entrada.termos.atual;
      return true;
    })
    .map(([id]) => id);
}

/** A caixa agora: novos em cima, já vistos embaixo, cada grupo na ordem de TIPOS. */
export function avisosDaCaixa(e: EstadoDosAvisos, entrada: EntradaDaCaixa): Caixa {
  const avisos: Aviso[] = [];
  const registros = registrosDePe(e, entrada);
  const doTipo = (t: TipoDeAviso) => registros.filter((id) => tipoDoId(id) === t).sort();

  for (const id of doTipo('desafio')) {
    const [, tipo, codigo] = id.split(':');
    avisos.push({ tipo: 'desafio', ids: [id], desafio: { tipo: tipo as TipoDoDesafio, codigo } });
  }
  // A placa do mês mais recente basta (meses de antes ficam nela, na Tabela).
  const meses = doTipo('mes');
  if (meses.length) avisos.push({ tipo: 'mes', ids: meses, mes: meses[meses.length - 1].slice('mes:'.length) });
  const trofeus = doTipo('trofeu');
  if (trofeus.length) avisos.push({ tipo: 'trofeu', ids: trofeus });
  const pecas = doTipo('peca');
  if (pecas.length) avisos.push({ tipo: 'peca', ids: pecas });
  for (const id of doTipo('termos')) avisos.push({ tipo: 'termos', ids: [id] });

  if (entrada.semCidade && deveLembrarDaCidade({ temCidade: false, jogouAlguma: true, ultimo: e.dispensados?.[ID_DA_CIDADE], hoje: entrada.hoje }))
    avisos.push({ tipo: 'cidade', ids: [ID_DA_CIDADE] });
  const aq = entrada.aquecimento;
  if (aq?.cardNaHome && !aq.visto && !e.dispensados?.[ID_DO_AQUECIMENTO]) avisos.push({ tipo: 'aquecimento', ids: [ID_DO_AQUECIMENTO] });

  // Um aviso que junta vários ids é novo se algum deles for novo (peça nova depois de ver a outra).
  const novo = (a: Aviso) => a.ids.some((id) => !foiVisto(e, id));
  return { novos: avisos.filter(novo), vistos: avisos.filter((a) => !novo(a)) };
}

/**
 * O estado para gravar depois de olhar a caixa: sai o que venceu ou foi resolvido por fora (Termos lidos, aquecimento
 * aberto), os "vistos" de avisos que não existem mais e as dispensas antigas de avisos por registro. A cidade e o
 * aquecimento guardam a dispensa (a da cidade decide a volta semanal). Devolve o mesmo objeto se nada mudou.
 */
export function arrumar(e: EstadoDosAvisos, entrada: EntradaDaCaixa): EstadoDosAvisos {
  const dePe = new Set(registrosDePe(e, entrada));
  const datas = Object.fromEntries(Object.entries(e.datas ?? {}).filter(([id]) => dePe.has(id)));
  const fixos = new Set([ID_DA_CIDADE, ID_DO_AQUECIMENTO]);
  const vistos = Object.fromEntries(Object.entries(e.vistos ?? {}).filter(([id]) => dePe.has(id) || fixos.has(id)));
  const dispensados = Object.fromEntries(
    Object.entries(e.dispensados ?? {}).filter(([id, dia]) => fixos.has(id) || diasEntre(dia, entrada.hoje) < DIAS_DA_DISPENSA),
  );
  const igual = (a: Record<string, string> | undefined, b: Record<string, string>) => Object.keys(a ?? {}).length === Object.keys(b).length;
  if (igual(e.datas, datas) && igual(e.vistos, vistos) && igual(e.dispensados, dispensados)) return e;
  return { vistos, dispensados, datas };
}
