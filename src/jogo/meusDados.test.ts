import { describe, expect, it } from 'vitest';
import { linhasDosMeusDados, resumoDaMensagem, type MeusDados } from './meusDados';

const nome = (id: string) => ({ bahia: 'Bahia' })[id] ?? id;

const dados: MeusDados = {
  torcedor: { time_id: 'bahia', apelido: 'Tricolor', faixa_etaria: '16_17', criado_em: '2026-10-20T15:00:00Z' },
  partidas: { penaltis: 2, prova: 1 },
  time_do_dia: 1,
  desafios: 0,
  palpites: 12,
  carreira_xp: 1250,
  avisos: 1,
  mensagens: [{ tipo: 'bug', texto: 'o card cortou', tela: 'inicio', aparelho: 'Firefox', criado_em: '2026-11-01T02:00:00Z' }],
};

const valor = (rotulo: string, d: MeusDados | null = dados) => linhasDosMeusDados(d, nome).find((l) => l.rotulo === rotulo)?.valor;

describe('ver meus dados', () => {
  it('mostra cada coisa que os Termos dizem que o servidor guarda', () => {
    expect(linhasDosMeusDados(dados, nome).map((l) => l.rotulo)).toEqual([
      'Time',
      'Apelido',
      'Faixa de idade',
      'No jogo desde',
      'Partidas',
      'Time do Dia',
      'Desafios criados',
      'Palpites do Crava',
      'Carreira',
      'Medalhas dos Lances',
      'Aviso de domingo',
      'Mensagens do "Achei um erro"',
    ]);
  });

  it('em linguagem simples', () => {
    expect(valor('Time')).toBe('Bahia');
    expect(valor('Faixa de idade')).toBe('16 ou 17');
    expect(valor('No jogo desde')).toBe('20/10/2026');
    expect(valor('Partidas')).toBe('3 partidas (2 de pênaltis, 1 da Prova de Boleiro)');
    expect(valor('Time do Dia')).toBe('1 dia jogado');
    expect(valor('Desafios criados')).toBe('nenhum');
    expect(valor('Carreira')).toBe('1.250 XP');
    expect(valor('Medalhas dos Lances')).toBe('nenhuma');
    expect(valor('Aviso de domingo')).toBe('ligado em 1 navegador');
    expect(valor('Mensagens do "Achei um erro"')).toBe('1 mensagem');
  });

  it('o que falta aparece como nenhum ou desligado', () => {
    const vazio: MeusDados = {
      ...dados,
      torcedor: { ...dados.torcedor!, apelido: null, faixa_etaria: null },
      partidas: {},
      time_do_dia: 0,
      palpites: 0,
      carreira_xp: null,
      avisos: 0,
      mensagens: [],
    };
    expect(valor('Apelido', vazio)).toBe('nenhum');
    expect(valor('Faixa de idade', vazio)).toBe('não respondeu');
    expect(valor('Partidas', vazio)).toBe('nenhuma');
    expect(valor('Carreira', vazio)).toBe('0 XP');
    expect(valor('Aviso de domingo', vazio)).toBe('desligado');
    expect(valor('Mensagens do "Achei um erro"', vazio)).toBe('nenhuma');
  });

  it('sem sessão ou sem time, não há ficha', () => {
    expect(linhasDosMeusDados(null, nome)).toEqual([]);
    expect(linhasDosMeusDados({ ...dados, torcedor: null }, nome)).toEqual([]);
  });

  it('a mensagem mostra a data de Brasília, o tipo, o texto e o que foi junto', () => {
    expect(resumoDaMensagem(dados.mensagens[0])).toEqual({
      cabeca: '31/10/2026 · Bug',
      texto: 'o card cortou',
      junto: 'tela: inicio · navegador: Firefox',
    });
    expect(resumoDaMensagem({ ...dados.mensagens[0], tela: null, aparelho: null }).junto).toBe('');
  });
});
