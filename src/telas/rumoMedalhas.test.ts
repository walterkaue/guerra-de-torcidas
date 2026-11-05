// Placa "Rumo às medalhas" da disputa histórica de pênaltis (seção 14.7): o "antes" sai de minhas_medalhas() menos o
// que a partida deu, como o gatilho penaltis_anotar_gols conta (gols nas 8 primeiras cobranças e 1 linha de vitória).

import { describe, expect, it } from 'vitest';
import { placaRumo, placaRumoDisputa } from './rumoMedalhas';

const partida = (gols: number, venceu: boolean) => ({ id: 'flamengo-2022-copa-do-brasil', titulo: 'O tetra da Copa do Brasil', gols, venceu });
const linha = (gols: number, vitorias?: number) => ({ lance_id: 'penaltis:flamengo-2022-copa-do-brasil', gols, recriados: 0, vitorias, medalha: null });

describe('placa rumo à medalha da disputa', () => {
  it('soma a partida: 4 gols que levam de 4 a 8 rumo ao bronze', () => {
    const p = placaRumoDisputa(partida(4, false), [linha(8, 0)]);
    expect(p?.subiu).toBe(false);
    expect(p?.html).toContain('+4 rumo ao bronze · 8/10');
  });

  it('subiu de medalha: o selo e o papel picado (subiu = true)', () => {
    const p = placaRumoDisputa(partida(5, true), [linha(12, 1)]);
    expect(p?.subiu).toBe(true);
  });

  it('ouro só com 100 gols e 10 vitórias: a vitória que fecha o ouro também sobe', () => {
    const p = placaRumoDisputa(partida(0, true), [linha(120, 10)]);
    expect(p?.subiu).toBe(true);
  });

  it('derrota sem gol e sem linha no servidor: mostra a trilha do zero', () => {
    const p = placaRumoDisputa(partida(0, false), []);
    expect(p).not.toBeNull();
    expect(p?.subiu).toBe(false);
  });

  it('vitórias sem vir do servidor contam como 0', () => {
    const p = placaRumoDisputa(partida(2, false), [linha(6)]);
    expect(p?.html).toContain('rumo ao bronze · 6/10');
  });

  it('gol ou vitória que o servidor não anotou (disputa que ele não conhece): sem placa, para não inventar', () => {
    expect(placaRumoDisputa(partida(3, false), [])).toBeNull();
    expect(placaRumoDisputa(partida(0, true), [])).toBeNull();
  });
});

describe('mandar a medalha no resultado (card só da medalha, jogo.md 7.3)', () => {
  it('subiu de medalha na disputa: a linha leva o botão com o item penaltis:<id> e a medalha', () => {
    const p = placaRumoDisputa(partida(5, true), [linha(12, 1)]);
    expect(p?.html).toContain('Mandar a medalha');
    expect(p?.html).toContain('data-mandar-medalha="penaltis:flamengo-2022-copa-do-brasil"');
    expect(p?.html).toContain('data-medalha="bronze"');
  });

  it('não subiu: sem botão', () => {
    expect(placaRumoDisputa(partida(4, false), [linha(8, 0)])?.html).not.toContain('Mandar a medalha');
  });

  it('lance que subiu de medalha: botão na linha dele', () => {
    const p = placaRumo(
      [{ id: 'flamengo-1981-toquio', titulo: 'O primeiro gol de Tóquio', gol: true, recriou: false }],
      [{ lance_id: 'flamengo-1981-toquio', gols: 5, recriados: 0, medalha: 'bronze' }],
      [{ lanceId: 'flamengo-1981-toquio', medalha: 'bronze' }],
    );
    expect(p?.subiu).toBe(true);
    expect(p?.html).toContain('data-mandar-medalha="flamengo-1981-toquio"');
  });
});
