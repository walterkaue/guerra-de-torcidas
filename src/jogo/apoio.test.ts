import { describe, expect, it } from 'vitest';
import { APOIO } from '../config/apoio';
import {
  INTERVALO_APOIO_MS,
  VALIDADE_CONFIRMACAO_MS,
  apoioDisponivel,
  bomMomentoDoDia,
  bomMomentoDosLances,
  confirmacaoValida,
  linkSeguro,
  passouUmaSemana,
} from './apoio';

const ligado = { apoio_ligado: true, linkApoioMensal: 'https://apoia.se/jogo', chavePix: 'jogo@exemplo.com' };

describe('"Sou maior de 18 ou responsável"', () => {
  const agora = 1_800_000_000_000;
  it('vale por 30 dias', () => {
    expect(VALIDADE_CONFIRMACAO_MS).toBe(30 * 24 * 3600 * 1000);
    expect(confirmacaoValida(agora - VALIDADE_CONFIRMACAO_MS + 1, agora)).toBe(true);
    expect(confirmacaoValida(agora - VALIDADE_CONFIRMACAO_MS, agora)).toBe(false);
  });
  it('sem confirmação, com valor estranho ou data no futuro, pergunta de novo', () => {
    expect(confirmacaoValida(null, agora)).toBe(false);
    expect(confirmacaoValida(Number.NaN, agora)).toBe(false);
    expect(confirmacaoValida(agora + 1, agora)).toBe(false);
  });
});

describe('apoioDisponivel', () => {
  it('a configuração que vai no repositório começa desligada', () => {
    expect(APOIO.apoio_ligado).toBe(false);
    expect(apoioDisponivel(APOIO)).toBe(false);
  });
  it('desligado, nada aparece mesmo com link e Pix preenchidos', () => {
    expect(apoioDisponivel({ ...ligado, apoio_ligado: false })).toBe(false);
  });
  it('ligado com link ou com Pix aparece', () => {
    expect(apoioDisponivel(ligado)).toBe(true);
    expect(apoioDisponivel({ ...ligado, chavePix: '' })).toBe(true);
    expect(apoioDisponivel({ ...ligado, linkApoioMensal: '' })).toBe(true);
  });
  it('ligado mas vazio (ou com link que não é https) não aparece', () => {
    expect(apoioDisponivel({ ...ligado, linkApoioMensal: '', chavePix: '  ' })).toBe(false);
    expect(apoioDisponivel({ ...ligado, linkApoioMensal: 'javascript:alert(1)', chavePix: '' })).toBe(false);
    expect(apoioDisponivel({ ...ligado, linkApoioMensal: 'http://apoia.se/x', chavePix: '' })).toBe(false);
  });
});

describe('linkSeguro', () => {
  it('aceita https e apara espaços', () => {
    expect(linkSeguro('  https://apoia.se/jogo ')).toBe('https://apoia.se/jogo');
  });
  it('recusa o resto', () => {
    expect(linkSeguro('')).toBe('');
    expect(linkSeguro('apoia.se/jogo')).toBe('');
    expect(linkSeguro('https://a b')).toBe('');
  });
});

describe('passouUmaSemana', () => {
  const agora = Date.UTC(2026, 10, 1, 12);
  it('primeira vez pode', () => expect(passouUmaSemana(null, agora)).toBe(true));
  it('antes de 7 dias não', () => expect(passouUmaSemana(agora - INTERVALO_APOIO_MS + 1, agora)).toBe(false));
  it('com 7 dias pode', () => expect(passouUmaSemana(agora - INTERVALO_APOIO_MS, agora)).toBe(true));
  it('lixo ou relógio no futuro não trava', () => {
    expect(passouUmaSemana(NaN, agora)).toBe(true);
    expect(passouUmaSemana(agora + 1000, agora)).toBe(true);
  });
});

describe('bom momento', () => {
  it('lances: vitória que valeu ou recorde', () => {
    expect(bomMomentoDosLances({ venceu: true, valendo: true, novoRecorde: false })).toBe(true);
    expect(bomMomentoDosLances({ venceu: false, valendo: true, novoRecorde: true })).toBe(true);
    expect(bomMomentoDosLances({ venceu: true, valendo: false, novoRecorde: false })).toBe(false);
    expect(bomMomentoDosLances({ venceu: false, valendo: true, novoRecorde: false })).toBe(false);
  });
  it('dia: só acertando', () => {
    expect(bomMomentoDoDia({ acertou: true })).toBe(true);
    expect(bomMomentoDoDia({ acertou: false })).toBe(false);
  });
});
