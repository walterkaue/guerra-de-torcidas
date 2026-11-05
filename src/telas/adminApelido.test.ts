import { describe, expect, it } from 'vitest';
import { textoDaBusca, textoDaConfirmacao, textoDaLista, textoDoFeito } from './adminApelido';

describe('apagar apelido no #admin', () => {
  it('a busca diz quantos usam, no singular e no plural', () => {
    expect(textoDaBusca('Zé', 1)).toBe('1 torcedor com o apelido "Zé".');
    expect(textoDaBusca('Zé', 3)).toBe('3 torcedores com o apelido "Zé".');
    expect(textoDaBusca('Zé', 0)).toBe('Ninguém usa o apelido "Zé".');
  });

  it('a confirmação avisa quantos e que não dá pra desfazer', () => {
    expect(textoDaConfirmacao(2)).toContain('2 torcedores');
    expect(textoDaConfirmacao(2)).toContain('Não dá pra desfazer');
  });

  it('o fim diz quantos mudaram', () => {
    expect(textoDoFeito(2)).toBe('Apelido apagado de 2 torcedores.');
    expect(textoDoFeito(0)).toBe('Ninguém usava mais esse apelido.');
  });

  it('a lista diz quantos apelidos o filtro barra, no singular e no plural', () => {
    expect(textoDaLista(1)).toContain('1 apelido gravado é barrado');
    expect(textoDaLista(3)).toContain('3 apelidos gravados são barrados');
    expect(textoDaLista(0)).toBe('Nenhum apelido gravado é barrado pelo filtro de hoje.');
  });
});
