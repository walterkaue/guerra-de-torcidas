import { describe, expect, it } from 'vitest';
import { chaveDoLimite, conferirEvento, conferirLote, impressaoDoX1, MAX_POR_ENVIO } from './funil';

describe('lista fechada do funil', () => {
  it.each([
    { ev: 'compartilhou', tipo: 'x1_penaltis', meio: 'grupo', x1: 'abcd2345' },
    { ev: 'compartilhou', tipo: 'medalha', meio: 'stories' },
    { ev: 'compartilhou', tipo: 'resultado', meio: 'emoji', jogo: 'time_do_dia' },
    { ev: 'abriu', tipo: 'x1_lances', x1: 'abcd2345' },
    { ev: 'abriu', tipo: 'disputa' },
    { ev: 'aceitou', tipo: 'x1_prova', x1: 'abcd2345' },
    { ev: 'primeiro_chute', tipo: 'x1_penaltis', x1: 'abcd2345' },
    { ev: 'terminou', tipo: 'x1_lances', x1: 'abcd2345' },
    { ev: 'revanche', tipo: 'x1_prova', x1: 'abcd2345' },
    { ev: 'desistiu', tipo: 'triagem' },
    { ev: 'desistiu', tipo: 'escolha_time', x1: 'abcd2345' },
    { ev: 'voltou', tipo: 'partida', jogo: 'lances' },
  ])('aceita %o', (e) => {
    expect(conferirEvento(e)).not.toBeNull();
  });

  it.each([
    ['evento fora da lista', { ev: 'gerou', tipo: 'x1_penaltis', x1: 'abcd2345' }],
    ['X1 sem código', { ev: 'compartilhou', tipo: 'x1_penaltis', meio: 'link' }],
    ['código em tipo sem X1', { ev: 'compartilhou', tipo: 'medalha', meio: 'link', x1: 'abcd2345' }],
    ['meio fora da lista', { ev: 'compartilhou', tipo: 'medalha', meio: 'sms' }],
    ['resultado sem jogo', { ev: 'compartilhou', tipo: 'resultado', meio: 'card' }],
    ['jogo onde não cabe', { ev: 'compartilhou', tipo: 'card', meio: 'card', jogo: 'prova' }],
    ['código mal formado', { ev: 'aceitou', tipo: 'x1_prova', x1: 'ABCD-234' }],
    ['aceite sem X1', { ev: 'aceitou', tipo: 'lance' }],
    ['partida sem jogo', { ev: 'desistiu', tipo: 'partida' }],
    ['campo a mais', { ev: 'desistiu', tipo: 'triagem', torcedor: 'x' }],
    ['meio na desistência', { ev: 'desistiu', tipo: 'triagem', meio: 'grupo' }],
    ['não é objeto', 'desistiu'],
  ])('recusa: %s', (_, e) => {
    expect(conferirEvento(e)).toBeNull();
  });

  it('passa ao formato do banco, com vazio no lugar do que falta', () => {
    expect(conferirEvento({ ev: 'desistiu', tipo: 'partida', jogo: 'prova' })).toEqual({
      evento: 'desistiu',
      tipo: 'partida',
      meio: '',
      jogo: 'prova',
      x1: null,
    });
  });

  it('lote: descarta o que está errado e corta no máximo por envio', () => {
    const certo = { ev: 'abriu', tipo: 'lance' };
    expect(conferirLote([certo, { ev: 'x' }, certo])).toHaveLength(2);
    expect(conferirLote(Array(MAX_POR_ENVIO + 5).fill(certo))).toHaveLength(MAX_POR_ENVIO);
    expect(conferirLote({ e: [certo] })).toEqual([]);
  });
});

describe('impressões', () => {
  it('a do X1 é fixa para o mesmo código e segredo, e muda com qualquer um dos dois', async () => {
    const a = await impressaoDoX1('abcd2345', 's1');
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(await impressaoDoX1('abcd2345', 's1')).toBe(a);
    expect(await impressaoDoX1('abcd2346', 's1')).not.toBe(a);
    expect(await impressaoDoX1('abcd2345', 's2')).not.toBe(a);
  });

  it('a do limite separa sessão de IP e não se confunde com a do X1', async () => {
    const sessao = await chaveDoLimite({ sessao: 'abcd2345' }, 's1');
    const ip = await chaveDoLimite({ ip: 'abcd2345' }, 's1');
    expect(sessao).toMatch(/^[0-9a-f]{32}$/);
    expect(sessao).not.toBe(ip);
    expect(sessao).not.toBe(await impressaoDoX1('abcd2345', 's1'));
  });
});
