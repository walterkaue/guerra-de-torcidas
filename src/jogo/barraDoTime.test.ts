import { describe, expect, it } from 'vitest';
import { ID_OUTRO, timePorId } from '../dados/times';
import { barraDoTime, TEXTO_SEM_CIDADE, TEXTO_SEM_REDE, type EntradaDaBarra } from './barraDoTime';
import type { MinhaCidade } from './rankingCidades';
import type { BlocoDasDivisoes } from './temporada';

const flamengo = timePorId('flamengo')!;
const chape = timePorId('chapecoense')!;
const outro = timePorId(ID_OUTRO)!;

const bloco = (o: Partial<BlocoDasDivisoes> = {}): BlocoDasDivisoes => ({
  posicao: '1º',
  serie: 'Na série única · novembro',
  situacao: '4 pts à frente · 2 de 5 semanas',
  resumo: '1º · 4 pts à frente',
  evento: 'temporada_lider',
  dif: null,
  ...o,
});

const semana = [
  { time_id: 'palmeiras', media30: 120.4, posicao_campeao: 1 },
  { time_id: 'flamengo', media30: 108.2, posicao_campeao: 2 },
  { time_id: 'chapecoense', media30: 90, posicao_campeao: 3 },
];

const entrada = (o: Partial<EntradaDaBarra> = {}): EntradaDaBarra => ({
  time: flamengo,
  semRede: false,
  jogou: true,
  mes: bloco(),
  semana,
  cidade: undefined,
  timePorId,
  ...o,
});

const cidade = (o: Partial<MinhaCidade> = {}): MinhaCidade => ({
  codigo: 3509502,
  nome: 'Campinas',
  uf: 'SP',
  ativos: 12,
  minimo: 5,
  faltam: 0,
  posicao_estado: 3,
  cidades_no_estado: 9,
  media30: 80,
  rival_codigo: null,
  rival_nome: null,
  rival_media30: null,
  rival_acima: null,
  uf_posicao: 1,
  estados_no_ranking: 4,
  ...o,
});

describe('barraDoTime', () => {
  it('a. quem nunca jogou: sem número, com o artigo certo, abre a semana', () => {
    expect(barraDoTime(entrada({ jogou: false }))).toEqual({
      grande: null,
      linha1: 'Seus pontos vão pro placar do Flamengo',
      linha2: null,
      leitor: 'Seus pontos vão pro placar do Flamengo. Ver a tabela',
      destino: 'semana',
    });
    expect(barraDoTime(entrada({ time: chape, jogou: false }))?.linha1).toBe('Seus pontos vão pro placar da Chapecoense');
  });

  it('a vence a tabela do mês e a falta de rede', () => {
    expect(barraDoTime(entrada({ jogou: false, semRede: true }))?.grande).toBeNull();
  });

  it('b. com a tabela do mês: posição, série e situação; o leitor lê por extenso e sem as semanas', () => {
    expect(barraDoTime(entrada())).toEqual({
      grande: '1º',
      linha1: 'na série única',
      linha2: '4 pts à frente · 2 de 5 semanas',
      leitor: '1º na série única, 4 pontos à frente. Ver a tabela',
      destino: 'temporada',
    });
    const b = barraDoTime(entrada({ mes: bloco({ posicao: '7º', serie: 'Na Série A · dezembro', situacao: '1 pt acima da zona · 3 de 4 semanas' }) }));
    expect(b?.linha1).toBe('na Série A');
    expect(b?.leitor).toBe('7º na Série A, 1 ponto acima da zona. Ver a tabela');
  });

  it('b sem semana travada ("–") cai para a semana', () => {
    expect(barraDoTime(entrada({ mes: bloco({ posicao: '–', serie: 'Série única de novembro' }) }))?.destino).toBe('semana');
  });

  it('c. sem tabela do mês: posição na semana e distância para o de cima', () => {
    expect(barraDoTime(entrada({ mes: null }))).toEqual({
      grande: '2º',
      linha1: 'na semana',
      linha2: '12 pts atrás do Palmeiras',
      leitor: '2º na semana, 12 pontos atrás do Palmeiras. Ver a tabela',
      destino: 'semana',
    });
  });

  it('c. o líder mede para o de baixo; empate diz empatado', () => {
    const lider = barraDoTime(entrada({ time: timePorId('palmeiras')!, mes: null }));
    expect(lider?.linha2).toBe('12 pts à frente do Flamengo');
    const empate = barraDoTime(entrada({ mes: null, semana: [semana[0], { ...semana[1], media30: 120.2 }] }));
    expect(empate?.linha2).toBe('empatado com o Palmeiras');
  });

  it('c. semana vazia ou time fora dela: a frase sem número', () => {
    expect(barraDoTime(entrada({ mes: null, semana: null }))?.linha1).toBe('Seus pontos vão pro placar do Flamengo');
    expect(barraDoTime(entrada({ mes: null, semana: semana.map((l) => ({ ...l, media30: 0 })) }))?.grande).toBeNull();
    expect(barraDoTime(entrada({ mes: null, semana: semana.slice(0, 1) }))?.grande).toBeNull();
  });

  it('d. Outro time: a cidade abre Tabela > Cidades', () => {
    expect(barraDoTime(entrada({ time: outro, cidade: cidade() }))).toEqual({
      grande: '3º',
      linha1: 'Campinas em SP',
      linha2: 'na tabela das cidades',
      leitor: 'Sua cidade está em 3º em SP. Ver a tabela',
      destino: 'cidades',
    });
    const faltam = barraDoTime(entrada({ time: outro, cidade: cidade({ faltam: 2, posicao_estado: null }) }));
    expect(faltam).toMatchObject({ grande: null, linha1: 'Faltam 2 pra sua cidade entrar na tabela.', linha2: 'Chama a galera.', destino: 'cidades' });
    expect(faltam?.leitor).toBe('Faltam 2 pra sua cidade entrar na tabela. Chama a galera. Ver a tabela');
  });

  it('d. Outro time sem cidade: o convite abre a escolha da cidade (mesmo sem ter jogado)', () => {
    expect(barraDoTime(entrada({ time: outro, cidade: null, jogou: false }))).toMatchObject({ linha1: TEXTO_SEM_CIDADE, destino: 'escolher-cidade' });
  });

  it('e. sem rede: o aviso, sem toque', () => {
    const e = barraDoTime(entrada({ semRede: true, jogou: undefined, mes: undefined, semana: undefined }));
    expect(e).toEqual({ grande: null, linha1: TEXTO_SEM_REDE, linha2: null, leitor: TEXTO_SEM_REDE, destino: null });
    expect(barraDoTime(entrada({ time: outro, semRede: true }))?.destino).toBeNull();
    expect(barraDoTime(entrada({ semRede: true, mes: null, semana: null }))?.linha1).toBe(TEXTO_SEM_REDE);
  });

  it('sem rede, o que já chegou ainda vale', () => {
    expect(barraDoTime(entrada({ semRede: true, semana: undefined }))?.grande).toBe('1º');
  });

  it('espera (nulo) enquanto falta o que decide', () => {
    expect(barraDoTime(entrada({ jogou: undefined }))).toBeNull();
    expect(barraDoTime(entrada({ mes: undefined }))).toBeNull();
    expect(barraDoTime(entrada({ mes: null, semana: undefined }))).toBeNull();
    expect(barraDoTime(entrada({ time: outro }))).toBeNull();
  });
});
