// Tabela do Brasileirão e indicadores dos cartões do Crava, calculados dos resultados da temporada
// (tabela resultados_temporada, placar da API). Puro: sem DOM, relógio nem banco.
// Só fatos da campanha (posição, pontos, forma, gols): nunca chance de vitória nem previsão de resultado.

export interface Resultado {
  rodada: number;
  mandante_id: string;
  visitante_id: string;
  inicio: string;
  gols_mandante: number;
  gols_visitante: number;
}

export type Letra = 'V' | 'E' | 'D';

export interface Campanha {
  jogos: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
}

export interface LinhaTabela extends Campanha {
  timeId: string;
  posicao: number;
  pontos: number;
  saldo: number;
  /** Últimos 5 jogos, do mais antigo para o mais recente. */
  forma: Letra[];
}

/** Rebaixados: os 4 últimos (regulamento da Série A). */
export const ZONA_REBAIXAMENTO = 4;

const porData = (a: Resultado, b: Resultado) => Date.parse(a.inicio) - Date.parse(b.inicio);

function letraDo(r: Resultado, timeId: string): Letra {
  const meus = r.mandante_id === timeId ? r.gols_mandante : r.gols_visitante;
  const deles = r.mandante_id === timeId ? r.gols_visitante : r.gols_mandante;
  return meus > deles ? 'V' : meus === deles ? 'E' : 'D';
}

/** Campanha de um time: no geral, só em casa ou só fora. */
export function campanha(resultados: readonly Resultado[], timeId: string, onde: 'geral' | 'casa' | 'fora' = 'geral'): Campanha {
  const c: Campanha = { jogos: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 };
  for (const r of resultados) {
    const casa = r.mandante_id === timeId;
    const fora = r.visitante_id === timeId;
    if (!(casa || fora) || (onde === 'casa' && !casa) || (onde === 'fora' && !fora)) continue;
    c.jogos++;
    c.gp += casa ? r.gols_mandante : r.gols_visitante;
    c.gc += casa ? r.gols_visitante : r.gols_mandante;
    const l = letraDo(r, timeId);
    if (l === 'V') c.v++;
    else if (l === 'E') c.e++;
    else c.d++;
  }
  return c;
}

export function forma(resultados: readonly Resultado[], timeId: string, n = 5): Letra[] {
  return resultados
    .filter((r) => r.mandante_id === timeId || r.visitante_id === timeId)
    .sort(porData)
    .slice(-n)
    .map((r) => letraDo(r, timeId));
}

/**
 * Classificação pelos critérios da Série A: pontos, vitórias, saldo e gols marcados.
 * (Depois vêm confronto direto e cartões, que a API não traz; aí desempata pelo id, só para a ordem ficar fixa.)
 */
export function classificacao(resultados: readonly Resultado[], times: readonly string[]): LinhaTabela[] {
  return times
    .map((timeId) => {
      const c = campanha(resultados, timeId);
      return { ...c, timeId, pontos: c.v * 3 + c.e, saldo: c.gp - c.gc, forma: forma(resultados, timeId), posicao: 0 };
    })
    .sort((a, b) => b.pontos - a.pontos || b.v - a.v || b.saldo - a.saldo || b.gp - a.gp || (a.timeId < b.timeId ? -1 : 1))
    .map((l, i) => ({ ...l, posicao: i + 1 }));
}

/** O jogo mais recente entre os dois times na temporada (normalmente o do 1º turno). */
export function ultimoConfronto(resultados: readonly Resultado[], a: string, b: string): Resultado | null {
  const entre = resultados
    .filter((r) => (r.mandante_id === a && r.visitante_id === b) || (r.mandante_id === b && r.visitante_id === a))
    .sort(porData);
  return entre.at(-1) ?? null;
}

export interface TimeNomeado {
  id: string;
  nome: string;
}

const decimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Até 2 linhas curtas de apoio para o cartão do jogo (bater o olho e cravar): o confronto anterior
 * e a média de gols do mandante em casa e do visitante fora. Sem dado suficiente (menos de 3 jogos
 * em casa ou fora), a linha de gols fica de fora.
 */
export function dicasDoJogo(resultados: readonly Resultado[], mandante: TimeNomeado, visitante: TimeNomeado): string[] {
  const dicas: string[] = [];
  const antes = ultimoConfronto(resultados, mandante.id, visitante.id);
  if (antes) {
    const nome = (id: string) => (id === mandante.id ? mandante.nome : visitante.nome);
    const quando = antes.rodada <= 19 ? '1º turno' : `${antes.rodada}ª rodada`;
    dicas.push(`${quando}: ${nome(antes.mandante_id)} ${antes.gols_mandante} x ${antes.gols_visitante} ${nome(antes.visitante_id)}`);
  }
  const casa = campanha(resultados, mandante.id, 'casa');
  const fora = campanha(resultados, visitante.id, 'fora');
  if (casa.jogos >= 3 && fora.jogos >= 3) {
    dicas.push(
      `Gols por jogo: ${mandante.nome} ${decimal(casa.gp / casa.jogos)} em casa · ${visitante.nome} ${decimal(fora.gp / fora.jogos)} fora`,
    );
  }
  return dicas;
}
