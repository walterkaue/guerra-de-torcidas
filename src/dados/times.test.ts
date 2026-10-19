import { describe, expect, it } from 'vitest';
import { ID_OUTRO, TIMES, proTime, rivalDe, timePorId } from './times';

// Tabela da seção 3 do docs/jogo.md.
const TABELA: Record<string, [artigo: 'o' | 'a', rival: string | null]> = {
  'athletico-pr': ['o', 'coritiba'],
  'atletico-mg': ['o', 'cruzeiro'],
  bahia: ['o', 'vitoria'],
  botafogo: ['o', 'flamengo'],
  bragantino: ['o', null],
  chapecoense: ['a', null],
  corinthians: ['o', 'palmeiras'],
  coritiba: ['o', 'athletico-pr'],
  cruzeiro: ['o', 'atletico-mg'],
  flamengo: ['o', 'fluminense'],
  fluminense: ['o', 'flamengo'],
  gremio: ['o', 'internacional'],
  internacional: ['o', 'gremio'],
  mirassol: ['o', null],
  palmeiras: ['o', 'corinthians'],
  remo: ['o', null],
  santos: ['o', 'corinthians'],
  'sao-paulo': ['o', 'palmeiras'],
  vasco: ['o', 'flamengo'],
  vitoria: ['o', 'bahia'],
};

describe('times', () => {
  it('ids únicos', () => {
    expect(new Set(TIMES.map((t) => t.id)).size).toBe(TIMES.length);
  });

  it('todo rival aponta para um time que existe (e nunca para si mesmo)', () => {
    for (const t of TIMES) {
      if (t.rival === null) continue;
      expect(timePorId(t.rival), `${t.nome} → ${t.rival}`).toBeDefined();
      expect(t.rival).not.toBe(t.id);
      expect(t.rival).not.toBe(ID_OUTRO);
    }
  });

  it('artigo e rival seguem a tabela do jogo.md', () => {
    const oficiais = TIMES.filter((t) => t.id !== ID_OUTRO);
    expect(oficiais.map((t) => t.id).sort()).toEqual(Object.keys(TABELA).sort());
    for (const t of oficiais) expect([t.artigo, t.rival], t.nome).toEqual(TABELA[t.id]);
  });

  it('"Outro time" não tem rival nem contração', () => {
    const outro = timePorId(ID_OUTRO)!;
    expect(rivalDe(outro)).toBeUndefined();
    expect(proTime(outro)).toBeNull();
  });

  it('contração com o artigo', () => {
    expect(proTime(timePorId('chapecoense')!)).toBe('pra Chapecoense');
    expect(proTime(timePorId('flamengo')!)).toBe('pro Flamengo');
  });
});
