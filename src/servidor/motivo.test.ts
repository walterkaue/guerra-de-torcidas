import { describe, expect, it } from 'vitest';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { codigoDaFuncao, comMotivo, htmlDoAviso, motivoDaFalha, partesDoAviso } from './motivo';
import { ErroServidor } from './api';

describe('código da falha de uma função', () => {
  it('pedido que nem saiu é rede', async () => {
    expect(await codigoDaFuncao(new FunctionsFetchError(new TypeError('Failed to fetch')))).toBe('rede');
  });

  it('usa o erro que a função mandou no corpo', async () => {
    const r = new Response(JSON.stringify({ erro: 'muitas_partidas' }), { status: 429 });
    expect(await codigoDaFuncao(new FunctionsHttpError(r))).toBe('muitas_partidas');
  });

  it('sem corpo, guarda o status', async () => {
    expect(await codigoDaFuncao(new FunctionsHttpError(new Response('', { status: 503 })))).toBe('http_503');
    expect(await codigoDaFuncao(new FunctionsRelayError(new Response('<html>', { status: 502 })))).toBe('http_502');
  });

  it('erro sem resposta conhecida é falha', async () => {
    expect(await codigoDaFuncao({ name: 'Outro' })).toBe('falha');
  });
});

describe('motivo no aviso', () => {
  it('código do servidor, rede ou desconhecido', () => {
    expect(motivoDaFalha(new ErroServidor('captcha'))).toBe('captcha');
    expect(motivoDaFalha(new ErroServidor('tempo_esgotado'))).toBe('tempo_esgotado');
    expect(motivoDaFalha(new TypeError('Failed to fetch dynamically imported module'))).toBe('rede');
    expect(motivoDaFalha(new Error('x'))).toBe('desconhecido');
    expect(motivoDaFalha(undefined)).toBe('desconhecido');
  });

  it('código estranho não vai para a tela', () => {
    expect(motivoDaFalha({ codigo: 'mensagem longa com espaço' })).toBe('desconhecido');
  });

  it('o código vai no fim do aviso', () => {
    expect(comMotivo('Sem conexão: essa partida não vale pontos.', new ErroServidor('captcha'))).toBe(
      'Sem conexão: essa partida não vale pontos.\ncódigo: captcha',
    );
  });

  it('a frase e o código se separam, sem parênteses', () => {
    const aviso = comMotivo('Caiu a conexão: essa não vale mais pontos. Joga de novo quando a rede voltar.', new ErroServidor('tempo_esgotado'));
    expect(partesDoAviso(aviso)).toEqual({
      frase: 'Caiu a conexão: essa não vale mais pontos. Joga de novo quando a rede voltar.',
      codigo: 'código: tempo_esgotado',
    });
    expect(htmlDoAviso(aviso, (s) => s)).toBe(
      'Caiu a conexão: essa não vale mais pontos. Joga de novo quando a rede voltar.<small class="aviso-codigo">código: tempo_esgotado</small>',
    );
    expect(partesDoAviso('Sem código.')).toEqual({ frase: 'Sem código.', codigo: null });
  });
});
