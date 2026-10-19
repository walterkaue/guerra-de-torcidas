import { describe, expect, it } from 'vitest';
import { ID_OUTRO, TIMES } from '../dados/times';
import { CHAVES_API, lerPartidas, timeDaApi, timeDoNome, type PartidaApi } from './footballData';

// Nomes do football-data.org para a Série A (nome completo e curto). Ao sincronizar,
// nome novo que não casar aparece no #admin; acrescente aqui e em CHAVES_API.
const NOMES_DA_API: [nome: string, curto: string, id: string][] = [
  ['CA Paranaense', 'Athletico-PR', 'athletico-pr'],
  ['CA Mineiro', 'Atlético Mineiro', 'atletico-mg'],
  ['EC Bahia', 'Bahia', 'bahia'],
  ['Botafogo FR', 'Botafogo', 'botafogo'],
  ['RB Bragantino', 'Bragantino', 'bragantino'],
  ['Chapecoense AF', 'Chapecoense', 'chapecoense'],
  ['SC Corinthians Paulista', 'Corinthians', 'corinthians'],
  ['Coritiba FBC', 'Coritiba', 'coritiba'],
  ['Cruzeiro EC', 'Cruzeiro', 'cruzeiro'],
  ['CR Flamengo', 'Flamengo', 'flamengo'],
  ['Fluminense FC', 'Fluminense', 'fluminense'],
  ['Grêmio FBPA', 'Grêmio', 'gremio'],
  ['SC Internacional', 'Internacional', 'internacional'],
  ['Mirassol FC', 'Mirassol', 'mirassol'],
  ['SE Palmeiras', 'Palmeiras', 'palmeiras'],
  ['Clube do Remo', 'Remo', 'remo'],
  ['Santos FC', 'Santos', 'santos'],
  ['São Paulo FC', 'São Paulo', 'sao-paulo'],
  ['CR Vasco da Gama', 'Vasco da Gama', 'vasco'],
  ['EC Vitória', 'Vitória', 'vitoria'],
];

const oficiais = TIMES.filter((t) => t.id !== ID_OUTRO).map((t) => t.id);

describe('times da API', () => {
  it('todo time oficial tem par na API (e só os oficiais)', () => {
    expect(Object.keys(CHAVES_API).sort()).toEqual([...oficiais].sort());
    const achados = NOMES_DA_API.map(([nome]) => timeDoNome(nome));
    expect(achados.filter((id) => id === null)).toEqual([]);
    expect(new Set(achados).size).toBe(20);
    expect([...achados].sort()).toEqual([...oficiais].sort());
  });

  it('nome completo e curto dão o mesmo time', () => {
    for (const [nome, curto, id] of NOMES_DA_API) {
      expect(timeDoNome(nome), nome).toBe(id);
      expect(timeDoNome(curto), curto).toBe(id);
    }
  });

  it('o nome do próprio jogo também casa', () => {
    for (const t of TIMES.filter((x) => x.id !== ID_OUTRO)) expect(timeDoNome(t.nome), t.nome).toBe(t.id);
  });

  it('nome ambíguo ou desconhecido fica sem par', () => {
    expect(timeDoNome('Atlético')).toBeNull();
    expect(timeDoNome('Clube Atlético')).toBeNull();
    expect(timeDoNome('Sport Recife')).toBeNull();
    expect(timeDaApi({ name: null, shortName: 'Palmeiras' })).toBe('palmeiras');
  });
});

describe('leitura das partidas', () => {
  const partida = (o: Partial<PartidaApi>): PartidaApi => ({
    id: 1,
    utcDate: '2026-10-24T21:30:00Z',
    status: 'TIMED',
    matchday: 32,
    homeTeam: { id: 1, name: 'CR Flamengo', shortName: 'Flamengo' },
    awayTeam: { id: 2, name: 'SE Palmeiras', shortName: 'Palmeiras' },
    score: { fullTime: { home: null, away: null } },
    ...o,
  });

  it('só rodadas 32 a 38', () => {
    const r = lerPartidas([partida({ id: 1, matchday: 31 }), partida({ id: 2 }), partida({ id: 3, matchday: 38 })]);
    expect(r.jogos.map((j) => j.api_id)).toEqual([2, 3]);
  });

  it('traz horário, status e placar', () => {
    const r = lerPartidas([partida({ status: 'FINISHED', score: { fullTime: { home: 2, away: 1 } } })]);
    expect(r.jogos[0]).toEqual({
      api_id: 1,
      rodada: 32,
      mandante_id: 'flamengo',
      visitante_id: 'palmeiras',
      inicio: '2026-10-24T21:30:00.000Z',
      status_api: 'FINISHED',
      gols_api_mandante: 2,
      gols_api_visitante: 1,
    });
  });

  it('time sem par é avisado e o jogo fica de fora', () => {
    const r = lerPartidas([partida({ awayTeam: { id: 9, name: 'Clube Novo', shortName: 'Novo' } })]);
    expect(r.jogos).toEqual([]);
    expect(r.semPar).toEqual(['Clube Novo']);
  });
});
