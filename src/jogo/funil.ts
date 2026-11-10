// Funil do X1 e onde a pessoa desiste (docs/jogos/contas.md, "Contagem de uso"). Lista fechada dos eventos que o
// celular pode mandar, conferida aqui e de novo no banco (checks da migração 20261108000000_funil_x1.sql).
// Nenhum evento leva quem foi: nem torcedor, nem apelido, nem IP. O código do X1 vai só até a função `funil`, que
// guarda dele apenas uma impressão (HMAC com o segredo das funções) para ligar compartilhou → abriu → aceitou.
// Copiado para as funções por `npm run compartilhar`; sem import nenhum, para servir aos dois lados.

/** O que dá para compartilhar. `resultado`: resultado sem X1 (Time do Dia, X1 recebido, partida sem rede). */
export const TIPOS_COMPARTILHAR = ['x1_penaltis', 'x1_lances', 'x1_prova', 'medalha', 'lance', 'card', 'resultado'] as const;
/** Por onde: o botão "Mandar no grupo", o Card, os Stories, o Emoji ou o Link. */
export const MEIOS = ['grupo', 'card', 'stories', 'emoji', 'link'] as const;
/** Link que abriu o jogo: ?d=, ?l=, ?p=, #lance/ e #disputa/. */
export const TIPOS_ABRIU = ['x1_penaltis', 'x1_lances', 'x1_prova', 'lance', 'disputa'] as const;
export const TIPOS_X1 = ['x1_penaltis', 'x1_lances', 'x1_prova'] as const;
/** Etapas em que dá para desistir. Na `partida`, o `jogo` diz qual. */
export const ETAPAS = ['escolha_time', 'triagem', 'aquecimento', 'partida'] as const;
export const JOGOS = ['penaltis', 'lances', 'prova', 'time_do_dia'] as const;

/**
 * Eventos do celular. `desistiu`: saiu da etapa sem concluir (trocou de tela, fechou ou foi pro fundo); `voltou`:
 * voltou do fundo para a mesma etapa. "Onde desiste" é desistiu − voltou: quem manda no WhatsApp e volta dá zero.
 * `viu_gols`: o 1º gol de quem chamou passou no telão do convite (só nos Lances).
 */
export const EVENTOS = ['compartilhou', 'abriu', 'viu_gols', 'aceitou', 'primeiro_chute', 'terminou', 'revanche', 'desistiu', 'voltou'] as const;

export type TipoX1 = (typeof TIPOS_X1)[number];
export type Etapa = (typeof ETAPAS)[number];
export type JogoFunil = (typeof JOGOS)[number];
export type Meio = (typeof MEIOS)[number];

export type EventoFunil =
  | { ev: 'compartilhou'; tipo: TipoX1; meio: Meio; x1: string }
  | { ev: 'compartilhou'; tipo: 'medalha' | 'lance' | 'card'; meio: Meio }
  | { ev: 'compartilhou'; tipo: 'resultado'; meio: Meio; jogo: JogoFunil }
  | { ev: 'abriu'; tipo: TipoX1; x1: string }
  | { ev: 'abriu'; tipo: 'lance' | 'disputa' }
  | { ev: 'viu_gols'; tipo: 'x1_lances'; x1: string }
  | { ev: 'aceitou' | 'primeiro_chute' | 'terminou' | 'revanche'; tipo: TipoX1; x1: string }
  | { ev: 'desistiu' | 'voltou'; tipo: Exclude<Etapa, 'partida'>; x1?: string }
  | { ev: 'desistiu' | 'voltou'; tipo: 'partida'; jogo: JogoFunil; x1?: string };

/** Uma etapa em andamento: o que vira `desistiu` se a pessoa sair dela. */
export type EtapaFunil = EventoFunil extends infer E ? (E extends { ev: 'desistiu' | 'voltou' } ? Omit<E, 'ev'> : never) : never;

/** Evento já conferido, no formato das colunas do banco (campos vazios como ''). */
export interface EventoConferido {
  evento: (typeof EVENTOS)[number];
  tipo: string;
  meio: string;
  jogo: string;
  /** Código do X1 (8 letras e números), só até a função tirar a impressão. */
  x1: string | null;
}

/** Eventos por envio. O celular junta o que der em alguns segundos; mais que isso é descartado. */
export const MAX_POR_ENVIO = 20;
const CODIGO_X1 = /^[a-z0-9]{8}$/;

const em = <T extends readonly string[]>(lista: T, v: unknown): v is T[number] => typeof v === 'string' && lista.includes(v);

/** Confere um evento cru. Qualquer campo fora da lista, sobrando ou faltando: null (o evento é descartado). */
export function conferirEvento(bruto: unknown): EventoConferido | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const o = bruto as Record<string, unknown>;
  const permitidos = new Set(['ev', 'tipo', 'meio', 'jogo', 'x1']);
  if (Object.keys(o).some((k) => !permitidos.has(k))) return null;
  const { ev, tipo, meio, jogo, x1 } = o;
  if (!em(EVENTOS, ev)) return null;
  if (x1 !== undefined && (typeof x1 !== 'string' || !CODIGO_X1.test(x1))) return null;
  const ehX1 = em(TIPOS_X1, tipo);

  let certo = false;
  switch (ev) {
    case 'compartilhou':
      certo =
        em(TIPOS_COMPARTILHAR, tipo) &&
        em(MEIOS, meio) &&
        (tipo === 'resultado' ? em(JOGOS, jogo) : jogo === undefined) &&
        ehX1 === (x1 !== undefined);
      break;
    case 'abriu':
      certo = em(TIPOS_ABRIU, tipo) && meio === undefined && jogo === undefined && ehX1 === (x1 !== undefined);
      break;
    case 'viu_gols':
      certo = tipo === 'x1_lances' && x1 !== undefined && meio === undefined && jogo === undefined;
      break;
    case 'aceitou':
    case 'primeiro_chute':
    case 'terminou':
    case 'revanche':
      certo = ehX1 && x1 !== undefined && meio === undefined && jogo === undefined;
      break;
    case 'desistiu':
    case 'voltou':
      certo = em(ETAPAS, tipo) && meio === undefined && (tipo === 'partida' ? em(JOGOS, jogo) : jogo === undefined);
      break;
  }
  if (!certo) return null;
  return { evento: ev, tipo: tipo as string, meio: (meio as string) ?? '', jogo: (jogo as string) ?? '', x1: (x1 as string) ?? null };
}

/** Confere o lote do celular: só os eventos certos, até MAX_POR_ENVIO. */
export function conferirLote(bruto: unknown): EventoConferido[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .slice(0, MAX_POR_ENVIO)
    .map(conferirEvento)
    .filter((e): e is EventoConferido => e !== null);
}

/** HMAC-SHA256 em hexadecimal. */
async function hmac(segredo: string, texto: string): Promise<string> {
  const te = new TextEncoder();
  const chave = await crypto.subtle.importKey('raw', te.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', chave, te.encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Impressão do código do X1 (32 hexadecimais): liga os eventos do mesmo X1 sem guardar o código. HMAC, e não só
 * SHA-256: com 31^8 códigos possíveis, quem lesse a tabela acharia o código (e o X1) por força bruta.
 */
export async function impressaoDoX1(codigo: string, segredo: string): Promise<string> {
  return (await hmac(segredo, `funil-x1:${codigo}`)).slice(0, 32);
}

/**
 * Chave do limite por minuto: o aparelho (a sessão) ou, sem sessão, o IP. Só a impressão vai para a tabela do
 * limite, que guarda o minuto corrente e é limpa a cada envio; nunca fica junto dos eventos.
 */
export async function chaveDoLimite(origem: { sessao: string } | { ip: string }, segredo: string): Promise<string> {
  const texto = 'sessao' in origem ? `sessao:${origem.sessao}` : `ip:${origem.ip}`;
  return (await hmac(segredo, `funil-limite:${texto}`)).slice(0, 32);
}
