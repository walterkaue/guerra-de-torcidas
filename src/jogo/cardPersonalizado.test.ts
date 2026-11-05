// Cards personalizáveis (docs/jogo.md 14.6): o que entra em cada estilo e formato, os quadradinhos de cada tipo e as
// escolhas guardadas no aparelho.

import { describe, expect, it } from 'vitest';
import { TIMES } from '../dados/times';
import {
  ACOES,
  ESCOLHAS_PADRAO,
  ESTILOS,
  TAMANHO_DO_CARD,
  TIPOS_DE_CARD,
  alternar,
  estiloVizinho,
  lerEscolhas,
  ligados,
  nomeDoArquivo,
  planoDoCard,
  salvaPelaFolha,
  textoDoCompartilhar,
  tipoDoJogo,
  type Chave,
  type DadosDoCard,
} from './cardPersonalizado';

const flamengo = TIMES.find((t) => t.id === 'flamengo')!;

const dados = (mais: Partial<DadosDoCard> = {}): DadosDoCard => ({
  tipo: 'jogo-x1',
  time: flamengo,
  jogo: 'Lances do Jogo',
  destaque: '+47',
  quem: { comApelido: 'Zé da Geral pro Flamengo', semApelido: 'Fiz 47 pontos pro Flamengo' },
  lance: 'Falta no ângulo',
  placarEmoji: '⚽✋⚽',
  frase: 'Na gaveta!',
  novoRecorde: false,
  link: 'https://torcida.kauewalter.com.br/?l=ab12cd34',
  nivel: 'Craque',
  conteudo: { jogo: 'penaltis', golsJogador: 2, golsMaquina: 1 },
  ...mais,
});

const TUDO: ReadonlySet<Chave> = new Set(['frase', 'apelido', 'nivel', 'placar', 'link']);
const NADA: ReadonlySet<Chave> = new Set();

describe('estilos e formatos', () => {
  it('Telão é o padrão, depois o Placar seco; Stories é o formato padrão', () => {
    expect(ESTILOS.map((e) => e.nome)).toEqual(['Telão', 'Placar seco']);
    expect(ESCOLHAS_PADRAO).toEqual({ estilo: 'telao', formato: 'stories', desligados: [] });
  });

  it('Stories 1080×1920 e Quadrado 1080×1080', () => {
    expect(TAMANHO_DO_CARD.stories).toEqual({ l: 1080, a: 1920 });
    expect(TAMANHO_DO_CARD.quadrado).toEqual({ l: 1080, a: 1080 });
  });

  it('deslizar dá a volta nos estilos', () => {
    expect(estiloVizinho('telao', 1)).toBe('placar');
    expect(estiloVizinho('placar', 1)).toBe('telao');
    expect(estiloVizinho('telao', -1)).toBe('placar');
  });
});

describe('quadradinhos', () => {
  it('5 de ligar e 3 de ação: 8, em 2 linhas de 4', () => {
    for (const tipo of Object.keys(TIPOS_DE_CARD) as (keyof typeof TIPOS_DE_CARD)[]) {
      expect(TIPOS_DE_CARD[tipo].length + ACOES.length).toBe(8);
    }
    expect(ACOES.map((a) => a.chave)).toEqual(['sortear', 'escrever', 'trocar']);
  });

  it('todo texto cabe em 2 linhas', () => {
    for (const q of [...Object.values(TIPOS_DE_CARD).flat(), ...ACOES]) expect(q.nome.split('\n')).toHaveLength(2);
  });

  it('jogo sem X1 troca "Link do X1" por "Link do jogo"', () => {
    const nome = (tipo: keyof typeof TIPOS_DE_CARD) => TIPOS_DE_CARD[tipo].find((q) => q.chave === 'link')!.nome;
    expect(tipoDoJogo(true)).toBe('jogo-x1');
    expect(tipoDoJogo(false)).toBe('jogo');
    expect(nome('jogo-x1')).toBe('Link do\nX1');
    expect(nome('jogo')).toBe('Link do\njogo');
    expect(nome('medalha')).toBe('Link do\nlance');
  });

  it('nas duas pontas, as mesmas chaves na mesma ordem', () => {
    const ordem = ['frase', 'apelido', 'nivel', 'placar', 'link'];
    for (const qs of Object.values(TIPOS_DE_CARD)) expect(qs.map((q) => q.chave)).toEqual(ordem);
  });
});

describe('escolhas no aparelho', () => {
  it('guardado estragado ou velho volta ao padrão', () => {
    expect(lerEscolhas(undefined)).toEqual(ESCOLHAS_PADRAO);
    expect(lerEscolhas('lixo')).toEqual(ESCOLHAS_PADRAO);
    expect(lerEscolhas({ estilo: 'neon', formato: 'a4', desligados: 'frase' })).toEqual(ESCOLHAS_PADRAO);
  });

  it('guarda estilo, formato e os desligados que reconhece', () => {
    expect(lerEscolhas({ estilo: 'placar', formato: 'quadrado', desligados: ['frase', 'nivel', 'xyz', 'link'] })).toEqual({
      estilo: 'placar',
      formato: 'quadrado',
      desligados: ['frase', 'link'],
    });
  });

  it('o nível segue a escolha do Perfil', () => {
    expect(ligados('jogo', ESCOLHAS_PADRAO, { temApelido: true, nivelNoCard: false }).has('nivel')).toBe(false);
    expect(ligados('jogo', ESCOLHAS_PADRAO, { temApelido: true, nivelNoCard: true }).has('nivel')).toBe(true);
    const r = alternar(ESCOLHAS_PADRAO, 'nivel', { temApelido: true, nivelNoCard: false });
    expect(r).toEqual({ escolhas: ESCOLHAS_PADRAO, nivelNoCard: true });
  });

  it('sem apelido salvo, "Meu apelido" fica desligado', () => {
    expect(ligados('jogo-x1', ESCOLHAS_PADRAO, { temApelido: false, nivelNoCard: true }).has('apelido')).toBe(false);
    expect(ligados('jogo-x1', ESCOLHAS_PADRAO, { temApelido: true, nivelNoCard: true })).toEqual(TUDO);
  });

  it('alternar desliga e religa', () => {
    const ctx = { temApelido: true, nivelNoCard: false };
    const a = alternar(ESCOLHAS_PADRAO, 'frase', ctx).escolhas;
    expect(a.desligados).toEqual(['frase']);
    expect(ligados('jogo', a, ctx).has('frase')).toBe(false);
    expect(alternar(a, 'frase', ctx).escolhas.desligados).toEqual([]);
  });
});

describe('o que entra em cada estilo e formato', () => {
  it('Telão, tudo ligado: placar no telão, quem com apelido, frase, nível e link; sem a linha de emoji', () => {
    const p = planoDoCard(dados(), { estilo: 'telao', formato: 'stories', ligados: TUDO });
    expect(p).toMatchObject({
      largura: 1080,
      altura: 1920,
      topo: 'GUERRA DE TORCIDAS · LANCES DO JOGO',
      destaque: '+47',
      time: 'Flamengo',
      quem: 'Zé da Geral pro Flamengo',
      telaoComPlacar: true,
      lance: null,
      placarEmoji: null,
      frase: 'Na gaveta!',
      nivel: 'CARREIRA · CRAQUE',
      link: 'torcida.kauewalter.com.br/?l=ab12cd34',
    });
  });

  it('Telão, tudo desligado: fica o topo, o time, o número e quem fez sem apelido', () => {
    const p = planoDoCard(dados(), { estilo: 'telao', formato: 'quadrado', ligados: NADA });
    expect(p).toMatchObject({
      largura: 1080,
      altura: 1080,
      topo: 'GUERRA DE TORCIDAS · LANCES DO JOGO',
      destaque: '+47',
      time: 'Flamengo',
      quem: 'Fiz 47 pontos pro Flamengo',
      telaoComPlacar: false,
      frase: null,
      nivel: null,
      link: null,
    });
  });

  it('Placar seco, tudo ligado: número, time, lance, emoji, apelido e link', () => {
    const p = planoDoCard(dados(), { estilo: 'placar', formato: 'stories', ligados: TUDO });
    expect(p).toMatchObject({
      destaque: '+47',
      time: 'Flamengo',
      lance: 'Falta no ângulo',
      placarEmoji: '⚽✋⚽',
      quem: 'Zé da Geral pro Flamengo',
      frase: 'Na gaveta!',
      nivel: 'CARREIRA · CRAQUE',
      link: 'torcida.kauewalter.com.br/?l=ab12cd34',
      telaoComPlacar: false,
    });
  });

  it('Placar seco, tudo desligado: número, time e lance', () => {
    const p = planoDoCard(dados(), { estilo: 'placar', formato: 'quadrado', ligados: NADA });
    expect(p).toMatchObject({ destaque: '+47', time: 'Flamengo', lance: 'Falta no ângulo', placarEmoji: null, quem: null, frase: null, nivel: null, link: null });
  });

  it('a frase própria troca a do narrador e some com a frase desligada', () => {
    expect(planoDoCard(dados(), { estilo: 'telao', formato: 'stories', ligados: TUDO, frasePropria: 'Hoje não!' }).frase).toBe('Hoje não!');
    expect(planoDoCard(dados(), { estilo: 'telao', formato: 'stories', ligados: NADA, frasePropria: 'Hoje não!' }).frase).toBeNull();
  });

  it('frase vazia, nível desconhecido ou sem link não entram, mesmo ligados', () => {
    const p = planoDoCard(dados({ frase: ' ', nivel: null, link: '', placarEmoji: '' }), { estilo: 'placar', formato: 'stories', ligados: TUDO });
    expect(p).toMatchObject({ frase: null, nivel: null, link: null, placarEmoji: null });
  });

  it('o aviso do Crava nunca desliga', () => {
    const p = planoDoCard(dados({ tipo: 'jogo', avisoFixo: 'Aqui é só resenha.' }), { estilo: 'placar', formato: 'quadrado', ligados: NADA });
    expect(p.avisoFixo).toBe('Aqui é só resenha.');
  });
});

describe('compartilhar', () => {
  const texto = 'Fiz 47 pontos pro Flamengo nos Lances do Jogo\n⚽✋⚽\nhttps://torcida.kauewalter.com.br/?l=ab12cd34';
  const link = 'https://torcida.kauewalter.com.br/?l=ab12cd34';

  it('com o link ligado, o texto do jogo como está', () => {
    expect(textoDoCompartilhar(texto, link, true)).toBe(texto);
  });

  it('com o link desligado, a linha do link sai', () => {
    expect(textoDoCompartilhar(texto, link, false)).toBe('Fiz 47 pontos pro Flamengo nos Lances do Jogo\n⚽✋⚽');
    expect(textoDoCompartilhar(`Vem pro X1: ${link}`, link, false)).toBe('Vem pro X1:');
  });

  it('nome do arquivo pelo estilo e formato', () => {
    expect(nomeDoArquivo('telao', 'stories')).toBe('guerra-de-torcidas-telao-stories.png');
    expect(nomeDoArquivo('placar', 'quadrado')).toBe('guerra-de-torcidas-placar-quadrado.png');
  });

  it('iPhone e iPad salvam pela folha de compartilhar; Android e computador baixam', () => {
    expect(salvaPelaFolha('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true);
    expect(salvaPelaFolha('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
    expect(salvaPelaFolha('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(salvaPelaFolha('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false);
  });
});
