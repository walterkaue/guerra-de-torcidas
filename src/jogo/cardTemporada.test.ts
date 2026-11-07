// Card de fim de temporada (docs/jogo.md seção 5 e 14.6): os quadradinhos do tipo, os dados (quem com e sem apelido e
// sem soma, tabela, números), o plano de cada estilo, o sorteio de frase e o texto de compartilhar.

import { describe, expect, it } from 'vitest';
import { TIMES } from '../dados/times';
import { PADRAO } from './vestiario';
import { ACOES, MEU_BONECO, ligados, planoDoCard, quadradinhosDoCard, textoDoCompartilhar, TIPOS_DE_CARD, type BonecoDoCard, type Chave } from './cardPersonalizado';
import {
  contextoDoFimDoMes,
  dadosDoCardDoMes,
  fraseDoFimDoMes,
  numerosDoFim,
  somouNoMes,
  sorteadorDeFraseDoFim,
  textoDoCardDoMes,
} from './cardTemporadaDados';
import { LINK_DO_JOGO } from './galeria';
import { destinoDoMes, type LinhaTemporada, type Serie, type Temporada } from './temporada';
import { FRASES_DA_TEMPORADA } from '../narrador/temporada';
import { mesDeAmostra, type CenarioDoMes } from '../dev/temporadaCardFalso';

const flamengo = TIMES.find((t) => t.id === 'flamengo')!;
const TUDO: ReadonlySet<Chave> = new Set(['frase', 'apelido', 'nivel', 'placar', 'link']);
const boneco: BonecoDoCard = { vestimenta: { ...PADRAO, numero: '07' }, liberadas: ['pose_bracos'] };

function dadosDe(cenario: CenarioDoMes = 'subiu', o: { pre?: boolean; somou?: boolean } = {}) {
  const m = mesDeAmostra(cenario, flamengo, !!o.pre);
  const d = dadosDoCardDoMes({
    temporada: m.temporada,
    linhas: m.linhas,
    linha: m.linha,
    time: flamengo,
    destino: m.destino,
    frase: 'Subiu! A Série B ficou pequena.',
    somou: o.somou ?? true,
    apelido: 'Zé da Geral',
    nivel: 'Craque',
  });
  return { ...m, d };
}

describe('quadradinhos do card de fim de temporada', () => {
  it('frase, apelido, nível, tabela final e link do jogo, nessa ordem', () => {
    expect(TIPOS_DE_CARD.temporada.map((q) => [q.chave, q.nome])).toEqual([
      ['frase', 'Frase do\nnarrador'],
      ['apelido', 'Meu\napelido'],
      ['nivel', 'Nível na\nCarreira'],
      ['placar', 'Tabela\nfinal'],
      ['link', 'Link do\njogo'],
    ]);
  });

  it('com os de ação e o "Meu boneco" são 8, e todo nome tem 2 linhas', () => {
    expect(TIPOS_DE_CARD.temporada.length + ACOES.length + 1).toBe(8);
    for (const q of [...TIPOS_DE_CARD.temporada, ...ACOES, MEU_BONECO]) expect(q.nome.split('\n')).toHaveLength(2);
  });

  it('quadradinhosDoCard devolve os do tipo (o nome "Tabela final" não muda)', () => {
    expect(quadradinhosDoCard(dadosDe().d)).toBe(TIPOS_DE_CARD.temporada);
  });

  it('"Tabela final" liga e desliga como os outros (o padrão é ligado)', () => {
    const ctx = { temApelido: true, nivelNoCard: true };
    const base = { estilo: 'telao' as const, formato: 'stories' as const, comBoneco: false };
    expect(ligados('temporada', { ...base, desligados: [] }, ctx).has('placar')).toBe(true);
    expect(ligados('temporada', { ...base, desligados: ['placar'] }, ctx).has('placar')).toBe(false);
  });
});

describe('dados do card de fim de temporada', () => {
  it('jogo "FIM DE DEZEMBRO", o destino como destaque e a linha do fim', () => {
    const { d } = dadosDe('subiu');
    expect(d.tipo).toBe('temporada');
    expect(d.jogo).toBe('FIM DE DEZEMBRO');
    expect(d.destaque).toBe('SUBIU PRA SÉRIE A');
    expect(d.lance).toBe('O Flamengo terminou em 2º na Série B · 87 pts · 2 vitórias de semana');
    expect(d.link).toBe('torcida.kauewalter.com.br');
  });

  it('a tabela é a fatia em volta do meu time, com o corte da Série B', () => {
    const { d } = dadosDe('subiu');
    if (d.conteudo.jogo !== 'temporada') throw new Error('conteúdo errado');
    expect(d.conteudo.fatia.linhas).toHaveLength(5);
    expect(d.conteudo.fatia.linhas.some((l) => l.time_id === 'flamengo')).toBe(true);
    expect(d.conteudo.fatia.corte).toEqual({ depoisDe: 2, tipo: 'sobem' });
    expect(d.conteudo.selo).toBe('SUBIU!');
    expect(d.conteudo.posicao).toBe(2);
    expect(d.conteudo.serie).toBe('Série B');
  });

  it('o corte da Série A é "caem" e o campeão não tem corte na fatia', () => {
    const caiu = dadosDe('caiu').d.conteudo;
    const campeao = dadosDe('campeao').d.conteudo;
    if (caiu.jogo !== 'temporada' || campeao.jogo !== 'temporada') throw new Error('conteúdo errado');
    expect(caiu.fatia.corte).toEqual({ depoisDe: 8, tipo: 'caem' });
    expect(campeao.fatia.corte).toBeNull();
  });

  it('os 3 números: posição final, pontos e vitórias de semana', () => {
    expect(numerosDoFim({ ...dadosDe().linha, posicao_final: 2, pontos: 1166, vitorias: 2 })).toEqual([
      { valor: '2º', rotulo: 'posição final' },
      { valor: '1.166', rotulo: 'pontos' },
      { valor: '2', rotulo: 'vitórias de semana' },
    ]);
    expect(numerosDoFim({ ...dadosDe().linha, pontos: 1, vitorias: 1 }).map((n) => n.rotulo)).toEqual(['posição final', 'ponto', 'vitória de semana']);
  });

  it('"tava na arquibancada" só com soma no mês; sem apelido é "Eu"; nada de nome de pessoa a mais', () => {
    const { d } = dadosDe('subiu', { somou: true });
    expect(d.quem).toEqual({ comApelido: 'Zé da Geral tava na arquibancada', semApelido: 'Eu tava na arquibancada' });
    expect(dadosDe('subiu', { somou: false }).d.quem).toBeNull();
  });

  it('pré-temporada: o card marca "teste" e nunca vira troféu', () => {
    const { d } = dadosDe('campeao', { pre: true });
    if (d.conteudo.jogo !== 'temporada') throw new Error('conteúdo errado');
    expect(d.conteudo.teste).toBe(true);
    const normal = dadosDe('campeao').d.conteudo;
    expect(normal.jogo === 'temporada' && normal.teste).toBe(false);
  });

  it('o destino do cenário bate com a conta da temporada', () => {
    const esperado: Record<CenarioDoMes, string> = {
      subiu: 'subiu',
      caiu: 'caiu',
      campeao: 'campeao',
      campeao_b: 'campeao_b',
      fica_a: 'fica_a',
      fica_b: 'fica_b',
      unica_a: 'unica_a',
      unica_b: 'unica_b',
      estreia: 'estreia',
    };
    for (const [c, d] of Object.entries(esperado)) expect(dadosDe(c as CenarioDoMes).destino).toBe(d);
  });
});

describe('plano do card de fim de temporada por estilo', () => {
  const plano = (estilo: 'telao' | 'placar' | 'poster', ligadosAgora: ReadonlySet<Chave> = TUDO, cenario: CenarioDoMes = 'subiu', pre = false) => {
    const { d } = dadosDe(cenario, { pre });
    return planoDoCard(d, { estilo, formato: 'stories', ligados: ligadosAgora, boneco, apelido: 'Zé da Geral' });
  };
  const SEM_TABELA: ReadonlySet<Chave> = new Set(['frase', 'apelido', 'nivel', 'link']);

  it('Telão: tabela e números com "Tabela final" ligado; desligado tira a tabela e os números ficam', () => {
    const ligado = plano('telao');
    expect(ligado.temporada?.fatia?.linhas).toHaveLength(5);
    expect(ligado.temporada?.numeros).toHaveLength(3);
    expect(ligado.temporada?.selo).toBe('SUBIU!');
    expect(ligado.temporada?.emblema).toBe('sobe');
    const desligado = plano('telao', SEM_TABELA);
    expect(desligado.temporada?.fatia).toBeNull();
    expect(desligado.temporada?.numeros).toHaveLength(3);
  });

  it('Telão: o topo é "GUERRA DE TORCIDAS · FIM DE DEZEMBRO" e o "Teste das divisões" vai no selo', () => {
    expect(plano('telao').topo).toBe('GUERRA DE TORCIDAS · FIM DE DEZEMBRO');
    const pre = plano('telao', TUDO, 'subiu', true);
    expect(pre.topo).toBe('GUERRA DE TORCIDAS · FIM DE DEZEMBRO');
    expect(pre.temporada?.teste).toBe(true);
  });

  it('Placar seco: o destino é o destaque e os números só aparecem com "Tabela final" ligado', () => {
    const ligado = plano('placar');
    expect(ligado.destaque).toBe('SUBIU PRA SÉRIE A');
    expect(ligado.temporada?.fatia).toBeNull();
    expect(ligado.temporada?.numeros).toHaveLength(3);
    expect(ligado.lance).toBe('O Flamengo terminou em 2º na Série B');
    const desligado = plano('placar', SEM_TABELA);
    expect(desligado.temporada?.numeros).toEqual([]);
    expect(desligado.lance).toContain('87 pts');
  });

  it('Placar seco e Pôster levam "Teste das divisões" no topo na pré-temporada', () => {
    expect(plano('placar', TUDO, 'subiu', true).topo).toBe('GUERRA DE TORCIDAS · FIM DE DEZEMBRO · TESTE DAS DIVISÕES');
    const poster = plano('poster', TUDO, 'subiu', true).poster!;
    expect(poster.faixa).toBe('FIM DE DEZEMBRO · TESTE DAS DIVISÕES · 2º NA SÉRIE B');
  });

  it('Pôster: o selo do destino na placa, o destino em Anton e "Time · Série B"', () => {
    const p = plano('poster').poster!;
    expect(p.selo).toEqual({ emblema: 'sobe', destino: 'subiu' });
    expect(p.pontos).toBe('SUBIU PRA SÉRIE A');
    expect(p.proTime).toBe('Flamengo · Série B');
    expect(p.faixa).toBe('FIM DE DEZEMBRO · 2º NA SÉRIE B');
    expect(p.medalha).toBeNull();
    expect(p.trofeu).toBeNull();
    expect(p.apelido).toBe('Zé da Geral');
  });

  it('o emblema muda com o destino: sobe, desce e fica; papel picado só na festa', () => {
    expect(plano('telao', TUDO, 'caiu').temporada).toMatchObject({ emblema: 'desce', festa: false });
    expect(plano('telao', TUDO, 'fica_a').temporada).toMatchObject({ emblema: 'fica', festa: false });
    expect(plano('telao', TUDO, 'fica_b').temporada).toMatchObject({ emblema: 'fica', festa: false });
    expect(plano('telao', TUDO, 'unica_b').temporada).toMatchObject({ emblema: 'fica', festa: false });
    for (const c of ['subiu', 'campeao', 'campeao_b', 'unica_a', 'estreia'] as const) expect(plano('telao', TUDO, c).temporada?.festa).toBe(true);
  });

  it('a linha de quem sai nos três estilos, com e sem apelido, e some sem soma', () => {
    const comApelido = (estilo: 'telao' | 'placar' | 'poster') => plano(estilo).quem;
    expect(comApelido('telao')).toBe('Zé da Geral tava na arquibancada');
    expect(comApelido('placar')).toBe('Zé da Geral tava na arquibancada');
    const semApelido = planoDoCard(dadosDe().d, { estilo: 'placar', formato: 'stories', ligados: new Set<Chave>(['frase', 'link']), boneco });
    expect(semApelido.quem).toBe('Eu tava na arquibancada');
    const semSoma = planoDoCard(dadosDe('subiu', { somou: false }).d, { estilo: 'telao', formato: 'stories', ligados: TUDO, boneco });
    expect(semSoma.quem).toBeNull();
  });

  it('Link do jogo desligado tira o link do card e do texto de compartilhar', () => {
    expect(plano('telao').link).toBe('torcida.kauewalter.com.br');
    expect(plano('telao', new Set<Chave>(['frase'])).link).toBeNull();
    const { destino } = dadosDe();
    const texto = textoDoCardDoMes(destino, flamengo, '2026-12-01', true);
    expect(textoDoCompartilhar(texto, LINK_DO_JOGO, false)).not.toContain('torcida.kauewalter');
  });

  it('o card de outro tipo não ganha plano de temporada', () => {
    expect(planoDoCard({ ...dadosDe().d, tipo: 'jogo', conteudo: { jogo: 'penaltis', golsJogador: 1, golsMaquina: 0 } }, { estilo: 'telao', formato: 'stories', ligados: TUDO }).temporada).toBeNull();
  });
});

describe('frase e texto do card de fim de temporada', () => {
  const { linhas, linha, destino, temporada } = dadosDe('subiu');

  it('a frase do card sai da lista do evento do destino', () => {
    const { ctx, rivalCaiu } = contextoDoFimDoMes(linha, linhas, flamengo, temporada.mes);
    expect(ctx.serie).toBe('Série B');
    expect(ctx.mes).toBe('janeiro');
    const f = fraseDoFimDoMes(destino, ctx, rivalCaiu, () => 0);
    expect(f).not.toBe('');
    expect(FRASES_DA_TEMPORADA.temporada_subiu.some((x) => f.toLocaleLowerCase('pt-BR').includes(x.slice(0, 5).toLocaleLowerCase('pt-BR')))).toBe(true);
  });

  it('o sorteio não repete a frase de agora nem as que já saíram, e recomeça quando acaba', () => {
    const { ctx, rivalCaiu } = contextoDoFimDoMes(linha, linhas, flamengo, temporada.mes);
    const todas = new Set(FRASES_DA_TEMPORADA.temporada_subiu.map((f) => f.replace('{o_time}', 'o Flamengo')));
    const agora = fraseDoFimDoMes(destino, ctx, rivalCaiu, () => 0);
    const sorteia = sorteadorDeFraseDoFim(destino, ctx, rivalCaiu, agora, () => 0);
    const vistas: string[] = [];
    for (let i = 0; i < todas.size - 1; i++) vistas.push(sorteia()!);
    expect(new Set(vistas).size).toBe(vistas.length);
    expect(vistas).not.toContain(agora);
    // Acabou a lista: recomeça, ainda sem devolver a de agora.
    expect(sorteia()).not.toBe(agora);
  });

  it('com o rival que caiu, quem ficou na série ganha a zoeira do rival e quem subiu, não', () => {
    const rival = TIMES.find((t) => t.id === flamengo.rival)!;
    const caiu: LinhaTemporada = { time_id: rival.id, serie: 'a' as Serie, posicao: 9, pontos: 700, vitorias: 0, ultima_posicao: 9, posicao_final: 9, destino: 'b' };
    const meu: LinhaTemporada = { time_id: 'flamengo', serie: 'a', posicao: 4, pontos: 900, vitorias: 1, ultima_posicao: 4, posicao_final: 4, destino: 'a' };
    const t: Temporada = { mes: '2026-12-01', pre_temporada: false, fechada_em: '2027-01-04T15:01:00Z', campeao_estreia_id: null };
    const c = contextoDoFimDoMes(meu, [meu, caiu], flamengo, t.mes);
    expect(c.rivalCaiu).toBe(true);
    expect(destinoDoMes(meu, t)).toBe('fica_a');
    expect(FRASES_DA_TEMPORADA.temporada_rival_caiu.length).toBeGreaterThan(0);
    expect(contextoDoFimDoMes(linha, linhas, flamengo, temporada.mes).rivalCaiu).toBe(false);
  });

  it('texto de compartilhar: o de sempre, " Eu tava na arquibancada." só com soma, e o link em linha à parte', () => {
    expect(textoDoCardDoMes('subiu', flamengo, '2026-12-01', true)).toBe(`⬆️ Flamengo subiu pra Série A no Guerra de Torcidas! Eu tava na arquibancada.\n${LINK_DO_JOGO}`);
    expect(textoDoCardDoMes('subiu', flamengo, '2026-12-01', false)).toBe(`⬆️ Flamengo subiu pra Série A no Guerra de Torcidas!\n${LINK_DO_JOGO}`);
    expect(textoDoCardDoMes('caiu', flamengo, '2026-12-01', true)).not.toContain('arquibancada');
  });
});

describe('somou no mês', () => {
  it('algum ponto acima de 0 em alguma semana; nulo e zero não contam', () => {
    expect(somouNoMes([0, 0, 12, null])).toBe(true);
    expect(somouNoMes([0, null, undefined])).toBe(false);
    expect(somouNoMes([])).toBe(false);
  });
});
