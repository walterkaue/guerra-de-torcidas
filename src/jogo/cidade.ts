// A cidade (docs/jogo.md, seção 3): lista fechada de municípios do IBGE com busca por nome. Puro, sem DOM.
// Formato do arquivo public/dados/municipios.json: [[codigo, "Nome", "UF"], ...], ordenado por nome.

export type Municipio = readonly [codigo: number, nome: string, uf: string];

/** Sem acento, sem maiúscula, espaços únicos: "São  Paulo" e "sao paulo" viram a mesma coisa. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "São Paulo · SP". */
export const rotuloDaCidade = (nome: string, uf: string): string => `${nome} · ${uf}`;

export interface Indexado {
  m: Municipio;
  chave: string;
}

export const indexar = (lista: readonly Municipio[]): Indexado[] => lista.map((m) => ({ m, chave: normalizar(m[1]) }));

/**
 * Busca por nome. Quem começa com o texto vem primeiro, depois quem tem o texto no meio; em cada grupo, a ordem
 * alfabética da lista. Aceita "caragua sp" (a UF, se vier por último, filtra). Máximo de `limite` resultados.
 */
export function buscar(indice: readonly Indexado[], consulta: string, limite = 30): Municipio[] {
  let q = normalizar(consulta);
  if (q.length < 2) return [];
  let uf = '';
  const partes = q.split(' ');
  if (partes.length > 1 && partes[partes.length - 1].length === 2) {
    uf = partes.pop()!.toUpperCase();
    q = partes.join(' ');
  }
  const comeca: Municipio[] = [];
  const meio: Municipio[] = [];
  for (const { m, chave } of indice) {
    if (uf && m[2] !== uf) continue;
    const i = chave.indexOf(q);
    if (i === 0) comeca.push(m);
    else if (i > 0) meio.push(m);
  }
  // Se o "UF" não era UF (ex.: "rio de" → "de"), refaz sem tratar o fim como estado.
  if (uf && !comeca.length && !meio.length) return buscarSemUf(indice, normalizar(consulta), limite);
  return [...comeca, ...meio].slice(0, limite);
}

function buscarSemUf(indice: readonly Indexado[], q: string, limite: number): Municipio[] {
  const comeca: Municipio[] = [];
  const meio: Municipio[] = [];
  for (const { m, chave } of indice) {
    const i = chave.indexOf(q);
    if (i === 0) comeca.push(m);
    else if (i > 0) meio.push(m);
  }
  return [...comeca, ...meio].slice(0, limite);
}

/** Valida o JSON baixado: descarta o que não tem o formato. */
export function lerLista(bruto: unknown): Municipio[] {
  if (!Array.isArray(bruto)) return [];
  return bruto.filter(
    (l): l is Municipio => Array.isArray(l) && Number.isInteger(l[0]) && typeof l[1] === 'string' && typeof l[2] === 'string' && l[2].length === 2,
  );
}

export type CodigoErroEscolher = 'cidade_invalida' | 'sem_torcedor' | 'sessao_encerrada' | 'muitas_trocas' | 'falha';

/**
 * Traduz o erro de `escolher_cidade` no código que a tela entende. A mensagem manda; sem mensagem conhecida,
 * 42501 (política de segurança) é sessão encerrada e o resto é falha.
 */
export function codigoDoErroDeEscolher(erro: { message?: string; code?: string }): CodigoErroEscolher {
  const msg = erro.message ?? '';
  const achado = (['cidade_invalida', 'sem_torcedor', 'sessao_encerrada', 'muitas_trocas'] as const).find((c) => msg.includes(c));
  return achado ?? (erro.code === '42501' ? 'sessao_encerrada' : 'falha');
}
