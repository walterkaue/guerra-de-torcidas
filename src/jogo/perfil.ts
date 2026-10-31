// Textos da aba Perfil (docs/visual.md, seção 3.1). Puro: sem DOM nem relógio. Só da própria pessoa.

import { ID_OUTRO, type Time } from '../dados/times';
import type { PosicaoSemana } from './posicao';

/** Nome do crachá: o apelido, ou "Torcedor do Flamengo" / "Torcedor da Chapecoense". */
export function nomeNoCracha(apelido: string | undefined, time: Pick<Time, 'id' | 'nome' | 'artigo'> | undefined): string {
  if (apelido) return apelido;
  if (!time) return 'Sem time ainda';
  if (time.id === ID_OUTRO) return 'Torcedor de outro time';
  return `Torcedor ${time.artigo === 'a' ? 'da' : 'do'} ${time.nome}`;
}

/** "3º de 14" numa linha da semana; quem ainda não pontuou ali vê "Sem posição ainda". */
export function linhaDaPosicao(p: Pick<PosicaoSemana, 'posicao' | 'total'> | null): string {
  return p?.posicao ? `${p.posicao}º de ${p.total}` : 'Sem posição ainda';
}

/** "85 pontos" numa linha de recorde. */
export function linhaDoRecorde(recorde: number | null | undefined): string {
  if (recorde === null || recorde === undefined) return 'Sem recorde ainda';
  return `${recorde.toLocaleString('pt-BR')} ${recorde === 1 ? 'ponto' : 'pontos'}`;
}
