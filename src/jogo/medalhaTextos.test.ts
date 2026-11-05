// Card só da medalha (docs/jogo.md 7.3): a frase com o título do lance (nunca nome de pessoa), o texto de
// compartilhar com emoji antigo e o link que abre a ficha.

import { describe, expect, it } from 'vitest';
import { DISPUTAS } from '../dados/disputas';
import { LANCES } from '../dados/lances';
import { caminhoDoItem, itemDoEndereco } from './enderecoDoLance';
import {
  fraseDaMedalha,
  itemDaMedalha,
  linkDaMedalha,
  noTitulo,
  quemNaMedalha,
  textoDeMandarMedalha,
  type Catalogo,
} from './medalhaTextos';
import { itemPenaltis } from './regraLances';

const catalogo: Catalogo = {
  lances: [
    { id: 'flamengo-1981-toquio', clube: 'flamengo', titulo: 'O primeiro gol de Tóquio', data: '1981-12-13', adversario: 'Liverpool' },
    { id: 'sao-paulo-2011-gol-100', clube: 'sao-paulo', titulo: 'Gol 100 do goleiro', data: '2011-03-27', adversario: 'Corinthians' },
    { id: 'selecao-1970-quarto', clube: 'selecao', titulo: 'A virada no fim', data: '1970-06-21', adversario: 'Itália' },
  ],
  disputas: [
    { id: 'palmeiras-1999-libertadores', clube: 'palmeiras', titulo: 'Três defesas em Assunção', data: '1999-06-16', adversario: 'Deportivo Cali' },
  ],
};

describe('frase da medalha', () => {
  it('contrai o artigo do título: no, na, nos, nas', () => {
    expect(noTitulo('O primeiro gol de Tóquio', 'lance')).toBe('no primeiro gol de Tóquio');
    expect(noTitulo('A virada em Lima', 'lance')).toBe('na virada em Lima');
    expect(noTitulo('Os pênaltis do tri', 'disputa')).toBe('nos pênaltis do tri');
    expect(noTitulo('As defesas de Assunção', 'disputa')).toBe('nas defesas de Assunção');
  });

  it('título sem artigo: "no lance" ou "na disputa" antes', () => {
    expect(noTitulo('Gol 100 do goleiro', 'lance')).toBe('no lance Gol 100 do goleiro');
    expect(noTitulo('Três defesas em Assunção', 'disputa')).toBe('na disputa Três defesas em Assunção');
    // "Os" e "As" não confundem com palavra que só começa igual.
    expect(noTitulo('Assunção de novo', 'disputa')).toBe('na disputa Assunção de novo');
    expect(noTitulo('Olé no Morumbi', 'lance')).toBe('no lance Olé no Morumbi');
  });

  it('"Já sou ouro no [título do lance] — [clube] x [adversário] ([ano])"', () => {
    const item = itemDaMedalha('flamengo-1981-toquio', catalogo)!;
    expect(fraseDaMedalha('ouro', item)).toBe('Já sou ouro no primeiro gol de Tóquio — Flamengo x Liverpool (1981)');
    expect(fraseDaMedalha('bronze', itemDaMedalha('sao-paulo-2011-gol-100', catalogo)!)).toBe(
      'Já sou bronze no lance Gol 100 do goleiro — São Paulo x Corinthians (2011)',
    );
  });

  it('lance da Seleção leva "Seleção" como clube', () => {
    expect(fraseDaMedalha('prata', itemDaMedalha('selecao-1970-quarto', catalogo)!)).toBe('Já sou prata na virada no fim — Seleção x Itália (1970)');
  });

  it('disputa de pênaltis pelo item penaltis:<id>', () => {
    const item = itemDaMedalha(itemPenaltis('palmeiras-1999-libertadores'), catalogo)!;
    expect(item.tipo).toBe('disputa');
    expect(fraseDaMedalha('ouro', item)).toBe('Já sou ouro na disputa Três defesas em Assunção — Palmeiras x Deportivo Cali (1999)');
  });

  it('item fora do catálogo e Disputa livre: sem card', () => {
    expect(itemDaMedalha('nao-existe', catalogo)).toBeNull();
    expect(itemDaMedalha(itemPenaltis(null), catalogo)).toBeNull();
  });

  it('catálogo de verdade: todo item tem frase, com o título e sem a ficha factual (onde estão os nomes)', () => {
    for (const l of LANCES) {
      const frase = fraseDaMedalha('ouro', itemDaMedalha(l.id)!);
      expect(frase).toContain(l.titulo.replace(/^(Os|As|O|A) /, ''));
      expect(frase).not.toContain(l.ficha);
    }
    for (const d of DISPUTAS) {
      const frase = fraseDaMedalha('ouro', itemDaMedalha(itemPenaltis(d.id))!);
      expect(frase).toContain(d.titulo.replace(/^(Os|As|O|A) /, ''));
      expect(frase).not.toContain(d.ficha);
    }
  });
});

describe('link e texto de compartilhar', () => {
  it('o link abre a ficha do lance ou da disputa', () => {
    expect(linkDaMedalha(itemDaMedalha('flamengo-1981-toquio', catalogo)!)).toBe('https://torcida.kauewalter.com.br/#lance/flamengo-1981-toquio');
    expect(linkDaMedalha(itemDaMedalha(itemPenaltis('palmeiras-1999-libertadores'), catalogo)!, 'https://x')).toBe(
      'https://x/#disputa/palmeiras-1999-libertadores',
    );
  });

  it('o texto: jogo, frase, de quem é a medalha e o link, uma linha cada', () => {
    const item = itemDaMedalha('flamengo-1981-toquio', catalogo)!;
    expect(textoDeMandarMedalha('ouro', item, 'pro Flamengo', 'https://x/#lance/flamengo-1981-toquio')).toBe(
      '🏆 Guerra de Torcidas · Lances do Jogo\nJá sou ouro no primeiro gol de Tóquio — Flamengo x Liverpool (1981)\nMedalha pro Flamengo\nhttps://x/#lance/flamengo-1981-toquio',
    );
    const disputa = itemDaMedalha(itemPenaltis('palmeiras-1999-libertadores'), catalogo)!;
    expect(textoDeMandarMedalha('bronze', disputa, null, 'l').split('\n')).toEqual([
      '🏆 Guerra de Torcidas · Pênaltis',
      'Já sou bronze na disputa Três defesas em Assunção — Palmeiras x Deportivo Cali (1999)',
      'l',
    ]);
  });

  it('só emoji antigo: sem seletor de variação e nada do bloco novo', () => {
    const t = textoDeMandarMedalha('ouro', itemDaMedalha('flamengo-1981-toquio', catalogo)!, 'pro Flamengo', 'l');
    expect(t).not.toMatch(/️/);
    for (const ch of t) expect(ch.codePointAt(0)!).toBeLessThan(0x1f900);
  });

  it('quem: apelido e time, só o time, ou o jogo', () => {
    expect(quemNaMedalha('Fera', 'pro Flamengo')).toBe('Fera pro Flamengo');
    expect(quemNaMedalha(undefined, 'pra Chapecoense')).toBe('Medalha pra Chapecoense');
    expect(quemNaMedalha(undefined, null)).toBe('Medalha nos Lances do Jogo');
  });
});

describe('endereço do lance', () => {
  it('#lance/<id> e #disputa/<id> viram o item que a tela dos Lances abre', () => {
    expect(itemDoEndereco('#lance/flamengo-1981-toquio')).toBe('flamengo-1981-toquio');
    expect(itemDoEndereco('#disputa/palmeiras-1999-libertadores')).toBe(itemPenaltis('palmeiras-1999-libertadores'));
  });

  it('endereço quebrado não vira nada', () => {
    for (const h of ['#lance/', '#lance/Flamengo', '#lance/a b', '#disputa/x/y', '#lances/x', '#lance/<script>', `#lance/${'a'.repeat(81)}`])
      expect(itemDoEndereco(h)).toBeNull();
  });

  it('ida e volta: caminho do item → item, para todo o catálogo', () => {
    for (const l of LANCES) expect(itemDoEndereco(caminhoDoItem(l.id))).toBe(l.id);
    for (const d of DISPUTAS) expect(itemDoEndereco(caminhoDoItem(itemPenaltis(d.id)))).toBe(itemPenaltis(d.id));
  });
});
