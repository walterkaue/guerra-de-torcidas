import { describe, expect, it } from 'vitest';
import { conviteX1Penaltis, conviteX1Prova, textoSharePenaltis, textoShareProva } from './convites';
import { linhaDoCard } from './cardProva';
import { conviteLances, textoShareLances } from './lancesTelaUnica';
import { emojisDaPartida, textoDaMedalhaNova } from './lancesTextos';
import {
  dividirDestaques,
  escolherDestaque,
  htmlDoBalao,
  juntarPedacos,
  linkDoWhatsApp,
  mensagemParaLeitor,
  ORDEM_DO_DESTAQUE,
  passaNaFrente,
  pedacosDaMensagem,
} from './resultadoDuasCamadas';

const SITE = 'https://torcida.kauewalter.com.br';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const desesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
/** O que o balão mostra, como texto: o HTML sem as tags. */
const textoDoBalao = (mensagem: string) => desesc(htmlDoBalao(mensagem, esc).replace(/<[^>]+>/g, ''));
/** O texto que vai no link do WhatsApp. */
const textoDoZap = (href: string) => decodeURIComponent(href.slice(href.indexOf('?text=') + 6));

// As mensagens de verdade dos 3 jogos, montadas pelas mesmas funções das telas (TEXTOS, PR #166).
const MENSAGENS = {
  lances: textoShareLances(
    conviteLances(85, 'pro Flamengo', true),
    emojisDaPartida(['gol', 'defesa', 'gol']),
    textoDaMedalhaNova('bronze', 'A falta do tri'),
    `${SITE}/?l=abcd1234`,
  ),
  penaltis: textoSharePenaltis(conviteX1Penaltis(47, 'pra Chapecoense', true), `${SITE}/?d=wxyz5678`),
  prova: textoShareProva({
    codigo: true,
    convite: conviteX1Prova(58, true),
    linha: linhaDoCard('6 de 8 certas', 58, 'pro Grêmio'),
    escada: '🟩🟩🟥🟩🟩🟩🟥🟩',
    link: `${SITE}/?p=prova999`,
  }),
};

describe('prévia da mensagem do desafio', () => {
  for (const [jogo, mensagem] of Object.entries(MENSAGENS)) {
    it(`${jogo}: o balão mostra exatamente o que vai no link do wa.me (só sem o "https://")`, () => {
      const zap = textoDoZap(linkDoWhatsApp(mensagem));
      expect(zap).toBe(mensagem);
      expect(textoDoBalao(mensagem)).toBe(zap.replace(/https:\/\//g, ''));
      // Mesmas quebras de linha e o link inteiro, com o código do desafio.
      expect(juntarPedacos(pedacosDaMensagem(mensagem))).toBe(zap);
      expect(zap).toMatch(/\/\?[dlp]=[a-z0-9]{8}$/);
    });

    it(`${jogo}: o leitor de tela lê o link como "link do desafio"`, () => {
      const lido = mensagemParaLeitor(mensagem);
      expect(lido.startsWith('Mensagem que vai junto: ')).toBe(true);
      expect(lido).toContain('link do desafio');
      expect(lido).not.toMatch(/https?:|kauewalter/);
      expect(lido).not.toContain('\n');
    });
  }

  it('Lances e Prova mantêm as linhas; pênaltis é uma linha só', () => {
    expect(textoDoBalao(MENSAGENS.lances).split('\n')).toHaveLength(3);
    expect(textoDoBalao(MENSAGENS.prova).split('\n')).toHaveLength(3);
    expect(textoDoBalao(MENSAGENS.penaltis).split('\n')).toHaveLength(1);
  });

  it('o link no balão é um pedaço à parte, sem o "https://"', () => {
    const pedacos = pedacosDaMensagem(MENSAGENS.penaltis);
    expect(pedacos.at(-1)).toEqual({ link: `${SITE}/?d=wxyz5678`, mostra: 'torcida.kauewalter.com.br/?d=wxyz5678' });
    expect(htmlDoBalao(MENSAGENS.penaltis, esc)).toContain('<span class="res-msg-link">torcida.kauewalter.com.br/?d=wxyz5678</span>');
  });

  it('escapa o texto (o apelido nunca vai no balão, mas nada passa cru)', () => {
    expect(htmlDoBalao('<b>oi</b> https://x.y/?a=1&b=2', esc)).toBe('&lt;b&gt;oi&lt;/b&gt; <span class="res-msg-link">x.y/?a=1&amp;b=2</span>');
  });
});

describe('destaque da dobra', () => {
  it('a ordem decidida', () => {
    expect(ORDEM_DO_DESTAQUE).toEqual(['aviso', 'desafio', 'medalha', 'peca', 'recorde', 'top3', 'frase']);
  });

  it('um só: o primeiro da ordem que a partida tem', () => {
    expect(escolherDestaque(['frase', 'recorde', 'top3'])).toBe('recorde');
    expect(escolherDestaque(['frase', 'desafio', 'aviso'])).toBe('aviso');
    expect(escolherDestaque(['medalha', 'desafio'])).toBe('desafio');
    expect(escolherDestaque(['frase'])).toBe('frase');
    expect(escolherDestaque([])).toBeNull();
  });

  it('divide: um destaque na dobra; o resto desce, menos a frase (fica nas frases) e o resumo só da dobra', () => {
    const c = [
      { tipo: 'aviso' as const, id: 'aviso' },
      { tipo: 'desafio' as const, id: 'duelo-curto', soNaDobra: true },
      { tipo: 'recorde' as const, id: 'selos' },
      { tipo: 'frase' as const, id: 'frase' },
    ];
    const { destaque, resto } = dividirDestaques(c);
    expect(destaque?.id).toBe('aviso');
    expect(resto.map((r) => r.id)).toEqual(['selos']);
    expect(dividirDestaques([{ tipo: 'frase' as const }]).resto).toEqual([]);
    expect(dividirDestaques([{ tipo: 'desafio' as const, soNaDobra: true }]).destaque?.tipo).toBe('desafio');
    expect(dividirDestaques([])).toEqual({ destaque: null, resto: [] });
  });

  it('o que chega depois só passa na frente de quem vem depois na ordem', () => {
    expect(passaNaFrente('peca', 'frase')).toBe(true);
    expect(passaNaFrente('peca', 'recorde')).toBe(true);
    expect(passaNaFrente('peca', 'medalha')).toBe(false);
    expect(passaNaFrente('peca', 'aviso')).toBe(false);
    expect(passaNaFrente('medalha', 'desafio')).toBe(false);
    expect(passaNaFrente('medalha', null)).toBe(true);
  });
});
