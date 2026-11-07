import { describe, expect, it } from 'vitest';
import { LANCES } from '../dados/lances';
import { linkDoItem, textoDaDisputaParaMandar, textoDoLanceParaMandar, textoParaCopiar } from './mandarLance';

describe('mandar esse lance', () => {
  it('o link do lance e o da disputa', () => {
    expect(linkDoItem('flamengo-2019-virada-em-lima')).toBe('https://torcida.kauewalter.com.br/#lance/flamengo-2019-virada-em-lima');
    expect(linkDoItem('penaltis:flamengo-2022-copa-do-brasil')).toBe(
      'https://torcida.kauewalter.com.br/#disputa/flamengo-2022-copa-do-brasil',
    );
  });

  it('os dois textos', () => {
    expect(textoDoLanceParaMandar({ titulo: 'A virada em Lima', clube: 'Flamengo', adversario: 'River Plate', data: '2019-11-23' })).toBe(
      '⚽ Lance do Guerra de Torcidas: A virada em Lima (Flamengo x River Plate, 2019). Consegue recriar?',
    );
    expect(textoDaDisputaParaMandar('A final da Copa do Brasil')).toBe(
      '⚽ Disputa de pênaltis no Guerra de Torcidas: A final da Copa do Brasil. Bate comigo?',
    );
  });

  it('a área de transferência leva o texto e o link', () => {
    expect(textoParaCopiar('oi', 'https://x.br/#lance/a')).toBe('oi https://x.br/#lance/a');
  });

  it('nenhum nome da ficha factual entra no texto (só título, clube, adversário e ano)', () => {
    const l = LANCES.find((o) => o.id === 'flamengo-2019-virada-em-lima')!;
    const texto = textoDoLanceParaMandar({ titulo: l.titulo, clube: 'Flamengo', adversario: l.adversario, data: l.data });
    const permitidas = new Set(
      `${l.titulo} Flamengo ${l.adversario} Lance Guerra Torcidas Consegue`.split(/[^\p{L}]+/u).filter(Boolean),
    );
    const nomesDaFicha = (l.ficha.match(/\p{Lu}\p{L}+/gu) ?? []).filter((p) => !permitidas.has(p));
    expect(nomesDaFicha).toEqual(expect.arrayContaining(['Diego', 'Gabriel', 'Barbosa']));
    for (const p of nomesDaFicha) expect(texto).not.toContain(p);
  });
});
