// Card do troféu da Galeria (docs/jogo.md 14.6, "Card do troféu"): os quadradinhos do tipo, o plano de cada estilo
// (quem com e sem apelido e sem soma, números, Pôster) e o texto de compartilhar.

import { describe, expect, it } from 'vitest';
import { TIMES } from '../dados/times';
import { PADRAO } from './vestiario';
import { quadradinhosDoCard, planoDoCard, textoDoCompartilhar, TIPOS_DE_CARD, type BonecoDoCard, type Chave } from './cardPersonalizado';
import { dadosDoCardDoTrofeu, somouNoTrofeu, sorteadorDeFraseDoTrofeu } from './cardTrofeuDados';
import { LINK_DO_JOGO, quemNoTrofeu, textoDoCardDoTrofeu, type Trofeu } from './galeria';
import { FRASES_DA_GALERIA, preencherFraseDaGaleria } from '../narrador/galeria';

const flamengo = TIMES.find((t) => t.id === 'flamengo')!;
const semana: Trofeu = { trofeu: 'campeao_semana', prateleira: 'trofeus', time_id: 'flamengo', semana: '2026-11-02', mes: null, serie: 'a' };
const mes: Trofeu = { trofeu: 'campeao_temporada', prateleira: 'trofeus', time_id: 'flamengo', semana: null, mes: '2027-03-01', serie: 'a' };
const NUMEROS = [
  { valor: '88,4', rotulo: 'média dos 30' },
  { valor: '214', rotulo: 'jogaram' },
  { valor: '+12,6', rotulo: 'sobre o 2º' },
];
const TUDO: ReadonlySet<Chave> = new Set(['frase', 'apelido', 'nivel', 'placar', 'link']);
const boneco: BonecoDoCard = { vestimenta: { ...PADRAO, numero: '07' }, liberadas: ['pose_bracos'] };

const dados = (o: { trofeu?: Trofeu; meusPontos?: number | null; ehDoMeuTime?: boolean; numeros?: typeof NUMEROS } = {}) =>
  dadosDoCardDoTrofeu({
    trofeu: o.trofeu ?? semana,
    time: flamengo,
    numeros: o.numeros ?? NUMEROS,
    meusPontos: o.meusPontos === undefined ? 340 : o.meusPontos,
    ehDoMeuTime: o.ehDoMeuTime ?? true,
    apelido: 'Zé da Geral',
    frase: 'Flâmula na parede!',
    nivel: 'Craque',
  });

describe('quadradinhos do card do troféu', () => {
  it('frase, apelido, nível, números da semana e link do jogo, nessa ordem', () => {
    expect(TIPOS_DE_CARD.trofeu.map((q) => [q.chave, q.nome])).toEqual([
      ['frase', 'Frase do\nnarrador'],
      ['apelido', 'Meu\napelido'],
      ['nivel', 'Nível na\nCarreira'],
      ['placar', 'Números da\nsemana'],
      ['link', 'Link do\njogo'],
    ]);
  });

  it('no troféu de mês o quadradinho se chama "Números do mês"; no de semana, não muda', () => {
    const nome = (d: ReturnType<typeof dados>) => quadradinhosDoCard(d).find((q) => q.chave === 'placar')!.nome;
    expect(nome(dados({ trofeu: mes }))).toBe('Números do\nmês');
    expect(nome(dados())).toBe('Números da\nsemana');
    expect(quadradinhosDoCard(dados({ trofeu: mes })).map((q) => q.chave)).toEqual(['frase', 'apelido', 'nivel', 'placar', 'link']);
  });

  it('os outros tipos seguem como estavam', () => {
    const d = { ...dados(), tipo: 'medalha' as const };
    expect(quadradinhosDoCard(d)).toBe(TIPOS_DE_CARD.medalha);
  });
});

describe('dados do card do troféu', () => {
  it('jogo "Galeria de Troféus", nome do troféu em maiúsculas e período com a série', () => {
    const d = dados();
    expect(d.jogo).toBe('Galeria de Troféus');
    expect(d.destaque).toBe('CAMPEÃO DA SEMANA');
    expect(d.lance).toBe('Série A · Semana de 02/11 a 08/11/2026');
    expect(d.link).toBe('torcida.kauewalter.com.br');
  });

  it('somou só em troféu de semana do próprio time com pontos', () => {
    expect(somouNoTrofeu(semana, true, 340)).toBe(true);
    expect(somouNoTrofeu(semana, true, 0)).toBe(false);
    expect(somouNoTrofeu(semana, true, null)).toBe(false);
    expect(somouNoTrofeu(semana, false, 340)).toBe(false);
    expect(somouNoTrofeu(mes, true, 340)).toBe(false);
  });
});

describe('plano do card do troféu', () => {
  const plano = (d: ReturnType<typeof dados>, estilo: 'telao' | 'placar' | 'poster', ligados: ReadonlySet<Chave> = TUDO, extra = {}) =>
    planoDoCard(d, { estilo, formato: 'stories', ligados, apelido: 'Zé da Geral', ...extra });

  it('quem: "<apelido> tava na arquibancada" com o apelido, "Eu tava na arquibancada" sem, nos dois estilos sem Pôster', () => {
    const sem = new Set<Chave>(['frase', 'nivel', 'placar', 'link']);
    for (const estilo of ['telao', 'placar'] as const) {
      expect(plano(dados(), estilo).quem).toBe('Zé da Geral tava na arquibancada');
      expect(plano(dados(), estilo, sem).quem).toBe('Eu tava na arquibancada');
    }
  });

  it('sem soma na semana (ou em outro time, ou troféu de mês) a linha some nos três estilos', () => {
    for (const d of [dados({ meusPontos: null }), dados({ meusPontos: 0 }), dados({ ehDoMeuTime: false }), dados({ trofeu: mes })]) {
      expect(d.quem).toBeNull();
      expect(plano(d, 'telao').quem).toBeNull();
      expect(plano(d, 'placar').quem).toBeNull();
      expect(plano(d, 'poster', TUDO, { boneco }).quem).toBeNull();
    }
  });

  it('os números entram com o quadradinho ligado e saem com ele desligado', () => {
    const sem = new Set<Chave>(['frase', 'apelido', 'nivel', 'link']);
    expect(plano(dados(), 'telao').trofeu?.numeros).toEqual(NUMEROS);
    expect(plano(dados(), 'telao', sem).trofeu?.numeros).toEqual([]);
    expect(plano(dados(), 'placar', sem).trofeu?.numeros).toEqual([]);
    expect(plano(dados({ numeros: [] }), 'telao').trofeu?.numeros).toEqual([]);
  });

  it('o troféu leva nome, série e período; o topo diz Galeria de Troféus', () => {
    const p = plano(dados(), 'telao');
    expect(p.topo).toBe('GUERRA DE TORCIDAS · GALERIA DE TROFÉUS');
    expect(p.trofeu).toMatchObject({ tipo: 'campeao_semana', nome: 'Campeão da semana', serie: 'Série A', periodo: 'Semana de 02/11 a 08/11/2026' });
    expect(plano(dados({ trofeu: mes }), 'telao').trofeu?.periodo).toBe('Março de 2027');
  });

  it('link e frase seguem os quadradinhos', () => {
    const p = plano(dados(), 'telao', new Set<Chave>(['nivel']));
    expect(p.link).toBeNull();
    expect(p.frase).toBeNull();
    expect(p.nivel).toBe('CARREIRA · CRAQUE');
    expect(plano(dados(), 'telao').link).toBe('torcida.kauewalter.com.br');
  });

  it('Pôster: faixa "GALERIA DE TROFÉUS · <período>", troféu e "Time · Série" na placa, nunca nome de pessoa', () => {
    const p = plano(dados(), 'poster', TUDO, { boneco }).poster!;
    expect(p.faixa).toBe('GALERIA DE TROFÉUS · SEMANA DE 02/11 A 08/11/2026');
    expect(p.pontos).toBe('CAMPEÃO DA SEMANA');
    expect(p.proTime).toBe('Flamengo · Série A');
    expect(p.trofeu).toEqual({ tipo: 'campeao_semana', nome: 'Campeão da semana' });
    expect(p.apelido).toBe('Zé da Geral');
    expect(p.medalha).toBeNull();
    // Os números não mudam nada no Pôster.
    const semNumeros = plano(dados(), 'poster', new Set<Chave>(['frase', 'apelido', 'nivel', 'link']), { boneco }).poster;
    expect(semNumeros).toEqual(p);
  });

  it('troféu de outro time (sem boneco): vira Telão, com as cores do time do troféu e sem busto', () => {
    const p = plano(dados({ ehDoMeuTime: false }), 'poster', TUDO, { boneco: null, comBoneco: true });
    expect(p.estilo).toBe('telao');
    expect(p.poster).toBeNull();
    expect(p.busto).toBeNull();
    expect(p.trofeu?.nome).toBe('Campeão da semana');
  });

  it('o troféu de mês não tem a vitrine nem série: a vitrine mostra só o período', () => {
    const vitrine: Trofeu = { ...semana, trofeu: 'maior_torcida', prateleira: 'vitrine', serie: null };
    const p = plano(dados({ trofeu: vitrine }), 'poster', TUDO, { boneco }).poster!;
    expect(p.proTime).toBe('Flamengo');
    expect(p.trofeu?.tipo).toBe('maior_torcida');
  });
});

describe('texto de compartilhar do troféu', () => {
  it('com quem somou: "Eu tava na arquibancada." e o link em linha à parte', () => {
    const t = textoDoCardDoTrofeu(semana, flamengo, true);
    expect(t).toBe(`🏆 Flamengo campeão da semana na Série A do Guerra de Torcidas! Eu tava na arquibancada.\n${LINK_DO_JOGO}`);
  });

  it('sem soma não leva a frase da arquibancada', () => {
    expect(textoDoCardDoTrofeu(semana, flamengo, false)).toBe(`🏆 Flamengo campeão da semana na Série A do Guerra de Torcidas!\n${LINK_DO_JOGO}`);
  });

  it('com "Link do jogo" desligado a linha do link some, nos dois casos', () => {
    expect(textoDoCompartilhar(textoDoCardDoTrofeu(semana, flamengo, true), LINK_DO_JOGO, false)).toBe(
      '🏆 Flamengo campeão da semana na Série A do Guerra de Torcidas! Eu tava na arquibancada.',
    );
    expect(textoDoCompartilhar(textoDoCardDoTrofeu(semana, flamengo, false), LINK_DO_JOGO, false)).toBe(
      '🏆 Flamengo campeão da semana na Série A do Guerra de Torcidas!',
    );
    expect(textoDoCompartilhar(textoDoCardDoTrofeu(semana, flamengo, false), LINK_DO_JOGO, true)).toContain(LINK_DO_JOGO);
  });

  it('a linha de quem usa o apelido ou "Eu"', () => {
    expect(quemNoTrofeu('Zé da Geral')).toBe('Zé da Geral tava na arquibancada');
    expect(quemNoTrofeu(undefined)).toBe('Eu tava na arquibancada');
    expect(quemNoTrofeu('  ')).toBe('Eu tava na arquibancada');
  });
});

describe('sortear outra frase do troféu', () => {
  it('sorteia da lista da Galeria do tipo, sem repetir a de agora nem as que já saíram', () => {
    const todas = (FRASES_DA_GALERIA.campeao_semana ?? []).map((f) => preencherFraseDaGaleria(f, flamengo));
    const agora = todas[0];
    const sorteia = sorteadorDeFraseDoTrofeu('campeao_semana', flamengo, agora, () => 0);
    const saidas = [sorteia(), sorteia(), sorteia()];
    expect(saidas.every((f) => f && todas.includes(f) && f !== agora)).toBe(true);
    expect(new Set(saidas).size).toBe(3);
    // Esgotadas, recomeça sem a de agora.
    expect(sorteia()).not.toBe(agora);
  });

  it('rebaixamento não tem frase', () => {
    expect(sorteadorDeFraseDoTrofeu('rebaixamento', flamengo, null)()).toBeNull();
  });
});
