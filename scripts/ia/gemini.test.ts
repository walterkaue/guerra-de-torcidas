import { describe, expect, it } from 'vitest';
import { acharSegredo, estimarTokens, lerArgumentos, lerResposta, linhaCsv, montarCorpo, raizDoCheckout, segredoEm } from './gemini.mjs';
import { MODELOS } from './modelos.mjs';

describe('gemini (partes puras)', () => {
  it('lê os argumentos', () => {
    expect(lerArgumentos(['--instrucao=a.md', '--entrada=b.txt', '--saida=c.json', '--modelos=x,y', '--seco'])).toEqual({
      instrucao: 'a.md', entrada: 'b.txt', saida: 'c.json', modelos: 'x,y', seco: true,
    });
    expect(lerArgumentos(['--instrucao=a=b', '--entrada=b', '--saida=c']).instrucao).toBe('a=b');
  });
  it('recusa argumento faltando ou desconhecido', () => {
    expect(() => lerArgumentos(['--instrucao=a', '--entrada=b'])).toThrow('--saida');
    expect(() => lerArgumentos(['--instrucao=a', '--entrada=b', '--saida=c', '--foo=1'])).toThrow('--foo');
    expect(() => lerArgumentos(['--instrucao=a', '--entrada=b', '--saida=c', '--esquema'])).toThrow('--esquema');
  });
  it('detecta segredos sem devolver o valor', () => {
    expect(acharSegredo('use sb_secret_abc')).toBe('sb_secret_');
    expect(acharSegredo('GEMINI_API_KEY=xyz')).toBe('GEMINI_API_KEY=');
    expect(acharSegredo(`chave ${'AIza' + 'a'.repeat(35)}`)).toBe('chave no formato AIza');
    expect(acharSegredo('texto normal, AIza curto')).toBeNull();
  });
  it('monta o corpo, com e sem esquema', () => {
    const sem = montarCorpo('inst', 'ent');
    expect(sem.systemInstruction.parts[0].text).toBe('inst');
    expect(sem.contents[0].parts[0].text).toBe('ent');
    expect(sem.generationConfig).not.toHaveProperty('responseSchema');
    const com = montarCorpo('i', 'e', { type: 'ARRAY' });
    expect(com.generationConfig).toMatchObject({ responseMimeType: 'application/json', responseSchema: { type: 'ARRAY' } });
  });
  it('lê a resposta e os tokens', () => {
    const d = { candidates: [{ content: { parts: [{ text: '[1]' }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 3 } };
    expect(lerResposta(d, { type: 'ARRAY' })).toEqual({ texto: '[1]', tokensEntrada: 10, tokensSaida: 3 });
    expect(() => lerResposta({ candidates: [{ content: { parts: [{ text: 'oi' }] } }] }, { type: 'ARRAY' })).toThrow('JSON');
    expect(lerResposta({ candidates: [{ content: { parts: [{ text: 'oi' }] } }] }).texto).toBe('oi');
    expect(() => lerResposta({})).toThrow('vazia');
  });
  it('trata resposta cortada como erro', () => {
    const base = (finishReason?: string) => ({ candidates: [{ finishReason, content: { parts: [{ text: 'oi' }] } }] });
    expect(lerResposta(base('STOP')).texto).toBe('oi');
    expect(lerResposta(base()).texto).toBe('oi');
    expect(() => lerResposta(base('MAX_TOKENS'))).toThrow('resposta incompleta: MAX_TOKENS');
  });
  it('soma os tokens de raciocínio na saída', () => {
    const d = { candidates: [{ content: { parts: [{ text: 'x' }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, thoughtsTokenCount: 40 } };
    expect(lerResposta(d).tokensSaida).toBe(43);
  });
  it('acha a chave real do ambiente e o segredo no esquema', () => {
    const chave = 'k'.repeat(53);
    expect(segredoEm(['a', `x ${chave} y`], chave)).toBe('GEMINI_API_KEY');
    expect(segredoEm(['a', 'b'], chave)).toBeNull();
    expect(segredoEm(['a', 'b'], undefined)).toBeNull();
    expect(segredoEm(['a', '{"d":"sb_secret_1"}'], chave)).toBe('sb_secret_');
  });
  it('acha a raiz do checkout principal', () => {
    const raiz = raizDoCheckout(process.cwd());
    expect(raiz).toBeTruthy();
    expect(raizDoCheckout('/caminho/que/nao/existe')).toBeNull();
  });
  it('estima tokens e monta a linha do CSV sem conteúdo', () => {
    expect(estimarTokens('abcd', 'efgh')).toBe(2);
    expect(linhaCsv('2026-10-31', 'gemini-3.5-flash-lite', 10, 3, 'tmp/dir/saida,x.json')).toBe('2026-10-31,gemini-3.5-flash-lite,10,3,saida_x.json');
  });
  it('mantém os modelos padrão', () => {
    expect(MODELOS).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash']);
  });
});
