import { describe, expect, it } from 'vitest';
import type { JogoBasico } from './cravaTela';
import {
  brasileiraoEncerrado,
  faltamDosLances,
  formatarFecha,
  formatarVolta,
  linhaDoProximoEspecial,
  linhaLancesUnificados,
  proximoEspecial,
  statusCrava,
} from './statusJogos';

const agora = new Date('2026-10-23T12:00:00Z');
const jogo = (id: string, rodada: number, horasAteInicio: number, extra: Partial<JogoBasico> = {}): JogoBasico => ({
  id,
  rodada,
  inicio: new Date(agora.getTime() + horasAteInicio * 3600_000).toISOString(),
  status_api: 'TIMED',
  confirmado_em: null,
  anulado: false,
  ...extra,
});

describe('linha dos Lances na regra nova', () => {
  it('faltam = limite - feitas, nunca negativo, null sem resposta', () => {
    expect(faltamDosLances({ feitas: 4, limite: 10 })).toBe(6);
    expect(faltamDosLances({ feitas: 12, limite: 10 })).toBe(0);
    expect(faltamDosLances({ feitas: 0, limite: 0 })).toBeNull();
    expect(faltamDosLances(null)).toBeNull();
  });
  it('conta as partidas valendo de hoje', () => {
    expect(linhaLancesUnificados(6, 3)).toBe('faltam 6 partidas valendo hoje');
    expect(linhaLancesUnificados(1, 3)).toBe('falta 1 partida valendo hoje');
    expect(linhaLancesUnificados(0, 3)).toBe('Já jogou as 10 valendo de hoje. Agora é treino, pra calibrar o pé.');
    expect(linhaLancesUnificados(null, 3)).toBe('As 3 melhores do dia contam');
  });
});

describe('relógios dos cards', () => {
  it('volta do Time do Dia', () => {
    expect(formatarVolta((5 * 60 + 12) * 60_000)).toBe('5h 12m');
    expect(formatarVolta(40 * 60_000)).toBe('40m');
    expect(formatarVolta(10_000)).toBe('1m');
  });

  it('fecha do Crava', () => {
    expect(formatarFecha(3 * 3600_000 + 59 * 60_000)).toBe('3h');
    expect(formatarFecha(40 * 60_000)).toBe('40min');
    expect(formatarFecha(80 * 3600_000)).toBe('3 dias');
  });
});

describe('status do Crava', () => {
  const jogos = [jogo('a', 32, 3), jogo('b', 32, 27), jogo('c', 33, 200)];

  it('rodada em foco e o próximo palpite que tranca', () => {
    expect(statusCrava(jogos, null, agora)).toEqual({ rodada: 32, linha: '32ª rodada · 1º jogo em 3h', cravado: false, encerrado: false });
  });

  it('cravado só com todos os jogos abertos palpitados', () => {
    expect(statusCrava(jogos, new Set(['a']), agora)?.cravado).toBe(false);
    expect(statusCrava(jogos, new Set(['a', 'b']), agora)).toEqual({ rodada: 32, linha: 'Palpite salvo ✓', cravado: true, encerrado: false });
  });

  it('depois do 1º jogo, conta até o próximo', () => {
    const meio = [jogo('a', 32, -1), jogo('b', 32, 2)];
    expect(statusCrava(meio, new Set(), agora)?.linha).toBe('32ª rodada · próximo jogo em 2h');
  });

  it('jogo já começado não conta; sem jogo aberto, bola rolando', () => {
    const rolando = [jogo('a', 32, -1), jogo('b', 32, -2)];
    expect(statusCrava(rolando, new Set(), agora)?.linha).toBe('32ª rodada · bola rolando');
    expect(statusCrava([jogo('a', 32, -1), jogo('b', 32, 5)], new Set(['b']), agora)?.linha).toBe('Palpite salvo ✓');
  });

  it('sem jogos', () => {
    expect(statusCrava([], null, agora)).toBeNull();
  });
});

describe('depois da 38ª e jogos especiais', () => {
  const conf = (id: string, rodada: number, horas: number, extra: Partial<JogoBasico> = {}) =>
    jogo(id, rodada, horas, { confirmado_em: new Date(agora.getTime() + (horas + 2) * 3600_000).toISOString(), ...extra });
  const final = (id: string, horas: number, extra: Partial<JogoBasico> = {}) =>
    jogo(id, 1001, horas, { competicao: 'Copa do Brasil', fase: 'Final', ...extra });
  const fim38 = [conf('a', 38, -60), conf('b', 38, -59), jogo('c', 38, -58, { anulado: true })];

  it('rodada toda confirmada fora do encerramento diz "encerrada", nunca "bola rolando"', () => {
    const jogos = [conf('a', 30, -20), conf('b', 30, -19), jogo('c', 31, 150)];
    const s = statusCrava(jogos, null, agora);
    expect(s).toEqual({ rodada: 30, linha: '30ª rodada · encerrada', cravado: false, encerrado: false });
  });

  it('bola rolando só com jogo da rodada em campo', () => {
    const jogos = [conf('a', 30, -20), jogo('b', 30, -1), jogo('c', 31, 150)];
    expect(statusCrava(jogos, null, agora)?.linha).toBe('30ª rodada · bola rolando');
  });

  it('depois da 38ª o status é o encerramento (com jogo anulado também)', () => {
    expect(brasileiraoEncerrado(fim38, agora)).toBe(true);
    expect(statusCrava(fim38, new Set(['a']), agora)).toEqual({ rodada: 38, linha: 'Brasileirão encerrado', cravado: false, encerrado: true });
    // semanas depois, igual
    expect(statusCrava(fim38, null, new Date('2026-12-30T12:00:00Z'))?.encerrado).toBe(true);
  });

  it('a 38ª ainda com jogo rolando ou aberto não encerra', () => {
    const rolando = [conf('a', 38, -60), jogo('b', 38, -1)];
    expect(brasileiraoEncerrado(rolando, agora)).toBe(false);
    expect(statusCrava(rolando, null, agora)?.linha).toBe('38ª rodada · bola rolando');
    expect(brasileiraoEncerrado([conf('a', 38, -60), jogo('b', 38, 3)], agora)).toBe(false);
  });

  it('especial aberto a menos de 7 dias vira a rodada em foco, com o título', () => {
    const jogos = [...fim38, final('esp', 50)];
    expect(brasileiraoEncerrado(jogos, agora)).toBe(false);
    expect(statusCrava(jogos, null, agora)).toEqual({ rodada: 1001, linha: 'Copa do Brasil · Final · fecha em 2 dias', cravado: false, encerrado: false });
    expect(statusCrava(jogos, new Set(['esp']), agora)?.linha).toBe('Palpite salvo ✓');
  });

  it('especial sem fase usa só a competição; nunca "1001ª rodada"', () => {
    const jogos = [...fim38, final('esp', 5, { fase: null })];
    const s = statusCrava(jogos, null, agora);
    expect(s?.linha).toBe('Copa do Brasil · fecha em 5h');
    expect(s?.linha).not.toContain('1001');
  });

  it('especial rolando: bola rolando com o título; confirmado ou anulado: volta o encerramento', () => {
    expect(statusCrava([...fim38, final('esp', -1)], null, agora)?.linha).toBe('Copa do Brasil · Final · bola rolando');
    expect(statusCrava([...fim38, final('esp', -1)], null, agora)?.encerrado).toBe(false);
    expect(statusCrava([...fim38, conf('esp', 1001, -10, { competicao: 'Copa do Brasil', fase: 'Final' })], null, agora)?.encerrado).toBe(true);
    expect(statusCrava([...fim38, final('esp', -10, { anulado: true })], null, agora)?.encerrado).toBe(true);
  });

  it('especial a mais de 7 dias não toma a rodada em foco: o encerramento mostra o próximo', () => {
    const jogos = [...fim38, final('esp', 24 * 9)];
    expect(statusCrava(jogos, null, agora)?.encerrado).toBe(true);
    expect(proximoEspecial(jogos, agora)?.id).toBe('esp');
    expect(linhaDoProximoEspecial(jogos, agora)).toBe('Próximo: Copa do Brasil · Final · dom 01/11 · 9h');
  });

  it('o próximo é o especial aberto que começa mais cedo; sem nenhum, volta em janeiro', () => {
    const jogos = [...fim38, final('longe', 24 * 40, { fase: 'Volta' }), final('perto', 24 * 9), final('velho', -24 * 30, { confirmado_em: '2026-09-22T12:00:00Z' })];
    expect(proximoEspecial(jogos, agora)?.id).toBe('perto');
    expect(linhaDoProximoEspecial(fim38, agora)).toBe('Sem jogo para palpitar agora. Volta em janeiro.');
    expect(proximoEspecial([...fim38, final('velho', -24 * 30, { confirmado_em: '2026-09-22T12:00:00Z' })], agora)).toBeNull();
  });
});
