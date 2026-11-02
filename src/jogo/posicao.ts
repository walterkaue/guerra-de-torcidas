// "Sua posição" e recorde pessoal (docs/jogo.md, seção 5). Puro: sem DOM nem relógio.
// Só a própria posição: nunca a lista de outras pessoas nem apelidos. Textos neutros de gênero
// ("Sua posição: 3º de 14"), sem "você é o/a".

/** Aviso único da pré-temporada, no lugar dos antigos selos de teste. */
export const AVISO_PRE_TEMPORADA = 'Pré-temporada: tudo vale ponto, mas zera antes do lançamento.';

export interface PosicaoSemana {
  /** Nula enquanto a pessoa não pontuou na semana. */
  posicao: number | null;
  total: number;
  pontos: number;
}

/** O que o servidor devolve no fim de cada partida (e do Time do Dia). */
export interface Desempenho {
  /** Nula quando a partida não entra (sob suspeita). */
  posicao: number | null;
  total: number;
  recorde: number | null;
  novoRecorde: boolean;
}

export type Minigame = 'penaltis' | 'prova' | 'dia';

const ONDE: Record<Minigame, string> = {
  penaltis: 'nos pênaltis na semana',
  prova: 'na Prova de Boleiro na semana',
  dia: 'no Time do Dia de hoje',
};

const pontos = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'ponto' : 'pontos'}`;

/** Home: posição geral da semana, somando todos os jogos e todos os times ("Você: 3º de 14 na semana"). */
export function linhaPosicaoSemana(p: PosicaoSemana): string {
  if (p.posicao === null) {
    return p.total
      ? `${p.total} ${p.total === 1 ? 'pessoa já pontuou' : 'pessoas já pontuaram'} na semana. Joga uma e entra na disputa!`
      : 'Ninguém pontuou ainda nesta semana. Sai na frente!';
  }
  return `Você: ${p.posicao}º de ${p.total} na semana`;
}

/** Resultado: "Sua posição: 3º de 14 nos pênaltis na semana". Null quando a partida não entrou. */
export function linhaPosicaoMinigame(d: Desempenho, minigame: Minigame): string | null {
  if (d.posicao === null) return null;
  return `Sua posição: ${d.posicao}º de ${d.total} ${ONDE[minigame]}`;
}

/** "Seu recorde: 85 pontos" (null antes da primeira partida que vale). */
export function linhaRecorde(recorde: number | null): string | null {
  return recorde === null ? null : `Seu recorde: ${pontos(recorde)}`;
}

/** Seta da Home: compara com a posição vista na última visita, na mesma semana. */
export function setaDaPosicao(antes: number | null, agora: number | null): 'subiu' | 'caiu' | null {
  if (antes === null || agora === null || antes === agora) return null;
  return agora < antes ? 'subiu' : 'caiu';
}

/**
 * Recorde do Crava: a melhor rodada (pontos já com peso). `novo` quando a rodada vista é a melhor e
 * passou todas as anteriores (a primeira rodada pontuada não conta como recorde novo), igual ao servidor.
 */
export function recordeCrava(porRodada: ReadonlyMap<number, number>, rodada: number): { recorde: number | null; novo: boolean } {
  const valores = [...porRodada.values()];
  if (!valores.length) return { recorde: null, novo: false };
  const recorde = Math.max(...valores);
  const atual = porRodada.get(rodada);
  const anteriores = [...porRodada].filter(([r]) => r < rodada).map(([, v]) => v);
  const novo = atual !== undefined && anteriores.length > 0 && atual > Math.max(...anteriores) && atual === recorde;
  return { recorde, novo };
}

/**
 * Bloco da tela de resultado: "NOVO RECORDE!", posição naquele minigame e recorde. Vazio quando não
 * há nada para mostrar (sem servidor, ou partida fora do ranking e sem recorde). Só números e textos
 * fixos: nada de entrada de usuário, então dispensa escapar.
 */
export function htmlPosicao(d: Desempenho | null, minigame: Minigame): string {
  if (!d) return '';
  const posicao = linhaPosicaoMinigame(d, minigame);
  const recorde = linhaRecorde(d.recorde);
  if (!posicao && !recorde) return '';
  return `<section class="res-posicao" aria-label="Sua posição">
      ${d.novoRecorde ? '<span class="selo-recorde">NOVO RECORDE!</span>' : ''}
      ${posicao ? `<p>${posicao}</p>` : ''}
      ${recorde ? `<p class="recorde">${recorde}</p>` : ''}
    </section>`;
}
