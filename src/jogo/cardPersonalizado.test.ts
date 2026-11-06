// Cards personalizáveis (docs/jogo.md 14.6): o que entra em cada estilo e formato, os quadradinhos de cada tipo e as
// escolhas guardadas no aparelho.

import { describe, expect, it } from 'vitest';
import { TIMES, proTime } from '../dados/times';
import { PADRAO, type Vestimenta } from './vestiario';
import {
  ACOES,
  AVISO_POSTER,
  AVISO_SEM_BONECO,
  ESCOLHAS_PADRAO,
  ESTILOS,
  MEU_BONECO,
  TAMANHO_DO_CARD,
  TIPOS_DE_CARD,
  alternar,
  botoesDeEstilo,
  estadoDoMeuBoneco,
  estiloEfetivo,
  estilosDisponiveis,
  estiloVizinho,
  faixaDoPoster,
  tocarMeuBoneco,
  vestimentaDoPoster,
  type BonecoDoCard,
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
  it('Telão é o padrão, depois o Placar seco e o Pôster; Stories é o formato padrão; Meu boneco começa desligado', () => {
    expect(ESTILOS.map((e) => e.nome)).toEqual(['Telão', 'Placar seco', 'Pôster']);
    expect(ESCOLHAS_PADRAO).toEqual({ estilo: 'telao', formato: 'stories', desligados: [], comBoneco: false });
  });

  it('Stories 1080×1920 e Quadrado 1080×1080', () => {
    expect(TAMANHO_DO_CARD.stories).toEqual({ l: 1080, a: 1920 });
    expect(TAMANHO_DO_CARD.quadrado).toEqual({ l: 1080, a: 1080 });
  });

  it('deslizar dá a volta nos estilos disponíveis', () => {
    expect(estiloVizinho('telao', 1)).toBe('placar');
    expect(estiloVizinho('placar', 1)).toBe('poster');
    expect(estiloVizinho('poster', 1)).toBe('telao');
    expect(estiloVizinho('telao', -1)).toBe('poster');
    // Sem boneco, só os dois de antes.
    expect(estiloVizinho('placar', 1, false)).toBe('telao');
    expect(estiloVizinho('telao', -1, false)).toBe('placar');
    expect(estiloVizinho('poster', 1, false)).toBe('telao');
  });
});

describe('estilos com e sem boneco', () => {
  it('com boneco, os 3; sem boneco (sem rede), o Pôster some', () => {
    expect(estilosDisponiveis(true)).toEqual(['telao', 'placar', 'poster']);
    expect(estilosDisponiveis(false)).toEqual(['telao', 'placar']);
  });

  it('Pôster guardado sem boneco vale como Telão, sem mudar o guardado', () => {
    expect(estiloEfetivo('poster', false)).toBe('telao');
    expect(estiloEfetivo('poster', true)).toBe('poster');
    expect(estiloEfetivo('placar', false)).toBe('placar');
    expect(lerEscolhas({ estilo: 'poster' }).estilo).toBe('poster');
  });

  it('os nomes embaixo do card viram botões, com o atual marcado', () => {
    expect(botoesDeEstilo('placar', true)).toEqual([
      { id: 'telao', nome: 'Telão', atual: false },
      { id: 'placar', nome: 'Placar seco', atual: true },
      { id: 'poster', nome: 'Pôster', atual: false },
    ]);
    expect(botoesDeEstilo('poster', false)).toEqual([
      { id: 'telao', nome: 'Telão', atual: true },
      { id: 'placar', nome: 'Placar seco', atual: false },
    ]);
  });
});

describe('Meu boneco', () => {
  it('Telão e Placar seco: liga e desliga, guardado nas escolhas', () => {
    expect(estadoDoMeuBoneco('telao', true, false)).toEqual({ ligado: false, travado: false, aviso: null });
    expect(estadoDoMeuBoneco('placar', true, true)).toEqual({ ligado: true, travado: false, aviso: null });
    const liga = tocarMeuBoneco(ESCOLHAS_PADRAO, true);
    expect(liga).toEqual({ escolhas: { ...ESCOLHAS_PADRAO, comBoneco: true }, aviso: null });
    expect(tocarMeuBoneco(liga.escolhas, true).escolhas.comBoneco).toBe(false);
    expect(lerEscolhas({ comBoneco: true }).comBoneco).toBe(true);
    expect(lerEscolhas({ comBoneco: 'sim' }).comBoneco).toBe(false);
  });

  it('Pôster: sempre ligado e travado, mesmo com o busto desligado; tocar só avisa', () => {
    expect(estadoDoMeuBoneco('poster', true, false)).toEqual({ ligado: true, travado: true, aviso: AVISO_POSTER });
    const e = { ...ESCOLHAS_PADRAO, estilo: 'poster' as const };
    expect(tocarMeuBoneco(e, true)).toEqual({ escolhas: e, aviso: 'No Pôster o boneco é o card.' });
  });

  it('sem boneco: desligado e travado, com o aviso de sem conexão (também com o Pôster guardado)', () => {
    expect(estadoDoMeuBoneco('telao', false, true)).toEqual({ ligado: false, travado: true, aviso: AVISO_SEM_BONECO });
    const e = { ...ESCOLHAS_PADRAO, estilo: 'poster' as const, comBoneco: true };
    expect(tocarMeuBoneco(e, false)).toEqual({ escolhas: e, aviso: 'Sem conexão pro boneco agora' });
  });
});

describe('quadradinhos', () => {
  it('5 de ligar, 2 de ação e Meu boneco: 8, em 2 linhas de 4', () => {
    for (const tipo of Object.keys(TIPOS_DE_CARD) as (keyof typeof TIPOS_DE_CARD)[]) {
      expect(TIPOS_DE_CARD[tipo].length + ACOES.length + 1).toBe(8);
    }
    expect(ACOES.map((a) => a.chave)).toEqual(['sortear', 'escrever']);
    expect(MEU_BONECO.nome).toBe('Meu\nboneco');
  });

  it('todo texto cabe em 2 linhas', () => {
    for (const q of [...Object.values(TIPOS_DE_CARD).flat(), ...ACOES, MEU_BONECO]) expect(q.nome.split('\n')).toHaveLength(2);
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
      comBoneco: false,
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

describe('o boneco no card', () => {
  const vestimenta: Vestimenta = { ...PADRAO, numero: '07', fundo: 'tunel' };
  const comPose: BonecoDoCard = { vestimenta, liberadas: ['uni1', 'pose_bracos', 'fundo_tunel'] };
  const semPose: BonecoDoCard = { vestimenta: { ...vestimenta, pose: 'bracos' }, liberadas: ['uni1'] };
  const opcoes = { ligados: TUDO, boneco: comPose, apelido: 'Zé da Geral' } as const;

  it('Telão e Placar seco: busto só com Meu boneco ligado e boneco carregado', () => {
    expect(planoDoCard(dados(), { ...opcoes, estilo: 'telao', formato: 'stories', comBoneco: true }).busto).toEqual(vestimenta);
    expect(planoDoCard(dados(), { ...opcoes, estilo: 'placar', formato: 'quadrado', comBoneco: true }).busto).toEqual(vestimenta);
    expect(planoDoCard(dados(), { ...opcoes, estilo: 'telao', formato: 'stories', comBoneco: false }).busto).toBeNull();
    expect(planoDoCard(dados(), { ...opcoes, boneco: null, estilo: 'telao', formato: 'stories', comBoneco: true }).busto).toBeNull();
    expect(planoDoCard(dados(), { ...opcoes, estilo: 'telao', formato: 'stories', comBoneco: true }).poster).toBeNull();
  });

  it('Pôster no Stories: corpo inteiro, braços pra cima (pose liberada), número, faixa, placa e pontos', () => {
    const p = planoDoCard(dados({ destaque: '+134', lance: 'a falta do tri' }), { ...opcoes, estilo: 'poster', formato: 'stories' });
    expect(p.estilo).toBe('poster');
    expect(p.busto).toBeNull();
    expect(p).toMatchObject({ largura: 1080, altura: 1920, frase: 'Na gaveta!', nivel: 'CARREIRA · CRAQUE', link: 'torcida.kauewalter.com.br/?l=ab12cd34' });
    expect(p.poster).toEqual({
      vestimenta: { ...vestimenta, pose: 'bracos' },
      enquadramento: 'corpo',
      numero: '07',
      faixa: 'LANCES DO JOGO · a falta do tri',
      apelido: 'Zé da Geral',
      pontos: '+134',
      proTime: 'pro Flamengo',
      medalha: null,
    });
  });

  it('Pôster no Quadrado: do joelho pra cima', () => {
    expect(planoDoCard(dados(), { ...opcoes, estilo: 'poster', formato: 'quadrado' }).poster!.enquadramento).toBe('joelho');
  });

  it('sem a pose liberada, o Pôster fica parado (mesmo com bracos na vestimenta); sem número, sem número', () => {
    const p = planoDoCard(dados(), { ...opcoes, boneco: { ...semPose, vestimenta: { ...semPose.vestimenta, numero: null } }, estilo: 'poster', formato: 'stories' });
    expect(p.poster!.vestimenta.pose).toBe('parado');
    expect(p.poster!.numero).toBeNull();
  });

  it('Pôster com tudo desligado: sem frase, apelido, nível nem link; pontos e faixa ficam', () => {
    const p = planoDoCard(dados(), { ...opcoes, ligados: NADA, estilo: 'poster', formato: 'stories' });
    expect(p).toMatchObject({ frase: null, nivel: null, link: null });
    expect(p.poster).toMatchObject({ apelido: null, pontos: '+47', faixa: 'LANCES DO JOGO · Falta no ângulo' });
  });

  it('Pôster sem boneco vira Telão', () => {
    const p = planoDoCard(dados(), { ...opcoes, boneco: null, estilo: 'poster', formato: 'stories' });
    expect(p.estilo).toBe('telao');
    expect(p.poster).toBeNull();
    expect(p.telaoComPlacar).toBe(true);
  });

  it('card de medalha no Pôster: a medalha e o título do lance, sem nome de pessoa', () => {
    const medalha = dados({
      tipo: 'medalha',
      destaque: 'OURO',
      jogo: 'Lances do Jogo',
      lance: 'Gol do título · Lances do Jogo',
      conteudo: { jogo: 'medalha', medalha: 'ouro', item: { tipo: 'lance', titulo: 'Gol do título' } as never },
    });
    const p = planoDoCard(medalha, { ...opcoes, estilo: 'poster', formato: 'stories' });
    expect(p.poster).toMatchObject({ medalha: 'ouro', pontos: 'OURO', faixa: 'LANCES DO JOGO · Gol do título' });
  });

  it('a faixa não repete o nome do jogo', () => {
    expect(faixaDoPoster('Prova de Boleiro', 'Prova de Boleiro: cheguei na 6ª')).toBe('PROVA DE BOLEIRO · cheguei na 6ª');
    expect(faixaDoPoster('Lances do Jogo', 'Seus 3 lances')).toBe('LANCES DO JOGO · Seus 3 lances');
    expect(faixaDoPoster('Time do Dia #7', '')).toBe('TIME DO DIA #7');
    expect(faixaDoPoster('Pênaltis', 'Pênaltis')).toBe('PÊNALTIS');
    expect(faixaDoPoster('Crava a Rodada · 34ª', '34ª rodada')).toBe('CRAVA A RODADA · 34ª rodada');
  });

  it('time "Outro" fica sem "pro [time]"', () => {
    const outro = TIMES.find((t) => !proTime(t));
    if (!outro) return;
    expect(planoDoCard(dados({ time: outro }), { ...opcoes, estilo: 'poster', formato: 'stories' }).poster!.proTime).toBeNull();
  });

  it('vestimentaDoPoster não mexe no resto da vestimenta', () => {
    expect(vestimentaDoPoster(comPose)).toEqual({ ...vestimenta, pose: 'bracos' });
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
    expect(nomeDoArquivo('poster', 'stories')).toBe('guerra-de-torcidas-poster-stories.png');
  });

  it('iPhone e iPad salvam pela folha de compartilhar; Android e computador baixam', () => {
    expect(salvaPelaFolha('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true);
    expect(salvaPelaFolha('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
    expect(salvaPelaFolha('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(salvaPelaFolha('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false);
  });
});
