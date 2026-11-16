import { describe, expect, it } from 'vitest';
import { criarContador, percentil, textoDaPlaca } from './medirPartida';

describe('?medir: plaquinha da partida', () => {
  it('quadros por segundo na mediana e no p90, e os piores congelamentos com o momento', () => {
    const m = criarContador();
    let t = 0;
    m.quadro(t);
    for (let i = 0; i < 50; i++) m.quadro((t += 16));
    m.marcar('apito');
    m.quadro((t += 330));
    m.marcar('gol');
    m.quadro((t += 120));
    for (let i = 0; i < 5; i++) m.quadro((t += 40));
    m.espera(312.4);
    const r = m.resumo();
    expect(r.fpsMediana).toBe(63);
    expect(r.congelados).toBe(2);
    expect(r.piores.map((c) => [c.ms, c.momento])).toEqual([
      [330, 'apito'],
      [120, 'gol'],
    ]);
    expect(r.esperas).toEqual([312]);
  });

  it('aba em segundo plano (intervalo de vários segundos) não conta como travada', () => {
    const m = criarContador();
    m.quadro(0);
    m.quadro(16);
    m.quadro(10_000);
    expect(m.resumo().congelados).toBe(0);
  });

  it('percentil e texto da placa', () => {
    expect(percentil([10, 20, 30, 40], 0.5)).toBe(20);
    expect(percentil([], 0.9)).toBe(0);
    const linhas = textoDaPlaca(criarContador().resumo(), 'Média');
    expect(linhas[0]).toContain('Média');
    expect(linhas.at(-1)).toBe('servidor: —');
  });
});
