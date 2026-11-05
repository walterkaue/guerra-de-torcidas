// Só em desenvolvimento: imita o servidor das cidades. ?cidadesFalsas= com | passou | sem | encerrada | faltam | vazia | erro
// (com: cidade no ranking; passou: na frente do rival; sem: sem cidade escolhida; encerrada: sem cidade e a sessão
// foi encerrada em outro aparelho; faltam: abaixo de 5; vazia: ninguém no ranking; erro: falha de rede).

import type { LinhaCidade, LinhaEstado, MinhaCidade } from '../jogo/rankingCidades';

const cenario = new URLSearchParams(location.search).get('cidadesFalsas') ?? 'com';
const espera = <T>(v: T) =>
  new Promise<T>((ok, falha) => setTimeout(() => (cenario === 'erro' ? falha(new Error('falha')) : ok(v)), 150));

const NOMES: [number, string, string][] = [
  [3509502, 'Campinas', 'SP'], [3550308, 'São Paulo', 'SP'], [3548500, 'Santos', 'SP'], [3543402, 'Ribeirão Preto', 'SP'],
  [3304557, 'Rio de Janeiro', 'RJ'], [3106200, 'Belo Horizonte', 'MG'], [4106902, 'Curitiba', 'PR'], [4314902, 'Porto Alegre', 'RS'],
  [2927408, 'Salvador', 'BA'], [2304400, 'Fortaleza', 'CE'], [2611606, 'Recife', 'PE'], [5300108, 'Brasília', 'DF'],
];
const linhas = (): LinhaCidade[] =>
  NOMES.map(([codigo, nome, uf], i) => ({ posicao: i + 1, codigo, nome, uf, ativos: 40 - i * 3, media30: 96 - i * 6 }));

export const minhaCidadeSemana = (_semana: string): Promise<MinhaCidade | null> => {
  if (cenario === 'sem' || cenario === 'encerrada') return espera(null);
  const comum = { codigo: 3550308, nome: 'São Paulo', uf: 'SP', minimo: 5 };
  if (cenario === 'faltam' || cenario === 'vazia') {
    return espera({
      ...comum, ativos: 3, faltam: 2, posicao_estado: null, cidades_no_estado: 0, media30: null, rival_codigo: null, rival_nome: null,
      rival_media30: null, rival_acima: null, uf_posicao: null, estados_no_ranking: 0,
    });
  }
  const passou = cenario === 'passou';
  return espera({
    ...comum, ativos: 31, faltam: 0, posicao_estado: 2, cidades_no_estado: 4, media30: 90, rival_codigo: 3509502, rival_nome: 'Campinas',
    rival_media30: passou ? 80 : 96, rival_acima: !passou, uf_posicao: 1, estados_no_ranking: 8,
  });
};

/** Sessão ainda vale neste servidor? (`encerrada`: foi desconectada em outro aparelho.) */
export const sessaoValida = (): Promise<boolean> => espera(cenario !== 'encerrada');

export const rankingCidades = (_s: string, uf: string): Promise<LinhaCidade[]> =>
  espera(cenario === 'vazia' || cenario === 'faltam' ? [] : linhas().filter((l) => l.uf === uf).map((l, i) => ({ ...l, posicao: i + 1 })));

export const rankingCidadesTop = (_s: string): Promise<LinhaCidade[]> => espera(cenario === 'vazia' ? [] : linhas());

export const rankingEstados = (_s: string): Promise<LinhaEstado[]> =>
  espera(
    cenario === 'vazia'
      ? []
      : ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'CE', 'PE'].map((uf, i) => ({ posicao: i + 1, uf, ativos: 120 - i * 10, media30: 92 - i * 5 })),
  );
