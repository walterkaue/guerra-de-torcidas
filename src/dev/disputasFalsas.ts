// Só em desenvolvimento (npm run dev, com ?disputasFalsas na URL): enche a aba Pênaltis com disputas de mentira,
// para conferir a tela enquanto o catálogo está em rascunho. Nenhum fato daqui é verdadeiro nem vai ao ar.
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import type { Disputa } from '../jogo/disputas';

const falsa = (id: string, clube: string, titulo: string, adversario: string, fase: string, data: string, placar: string): Disputa => ({
  id,
  clube,
  titulo,
  ficha: `Ficha de mentira para testar a tela (${data.slice(0, 4)}): a disputa terminou ${placar}. Nada aqui aconteceu de verdade.`,
  competicao: 'Copa de Mentira',
  fase,
  data,
  adversario,
  placar,
});

export const DISPUTAS_FALSAS: readonly Disputa[] = [
  falsa('flamengo-2018-falsa', 'flamengo', 'Disputa de mentira do clube', 'Junior Barranquilla', 'Final', '2018-12-12', '4 x 3'),
  falsa('flamengo-2005-falsa', 'flamengo', 'Título no limite de quarenta letras', 'Independiente Rivadavia', 'Quartas de final', '2005-06-01', '11 x 10'),
  falsa('selecao-1994-falsa', 'selecao', 'Disputa de mentira da Seleção', 'Itália', 'Final', '1994-07-17', '3 x 2'),
  falsa('selecao-2016-falsa', 'selecao', 'Outra de mentira da Seleção', 'Alemanha', 'Semifinal', '2016-08-20', '5 x 4'),
];
