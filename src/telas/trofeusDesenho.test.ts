// Desenhos dos troféus (docs/jogo.md, seção 5): a flâmula com contorno claro e a troca das variáveis de CSS por cores
// fixas, para o SVG virar imagem no canvas do card do troféu.

import { describe, expect, it } from 'vitest';
import { CONTORNO_CLARO, comCoresFixas, proporcaoDoTrofeu, svgDoTrofeu, svgFlamula, svgMegafone, svgParaImagem, svgTaca } from './trofeusDesenho';

describe('flâmula', () => {
  it('por padrão, contorno escuro fino só na bandeira', () => {
    const svg = svgFlamula(['#c8102e', '#000000'], 'Flâmula');
    expect(svg).toContain('stroke="rgba(0,0,0,.25)"');
    expect(svg).not.toContain(CONTORNO_CLARO);
  });

  it('com contorno claro, a bandeira e a faixa da cor 2 ganham a linha branca fina (cor 2 preta não some)', () => {
    const svg = svgFlamula(['#c8102e', '#000000'], 'Flâmula', { contorno: true });
    expect(svg.split(`stroke="${CONTORNO_CLARO}" stroke-width=".8"`).length - 1).toBe(2);
    expect(svg).not.toContain('rgba(0,0,0,.25)');
    expect(svg).toContain('fill="#000000"');
  });

  it('svgDoTrofeu repassa o contorno só à flâmula', () => {
    expect(svgDoTrofeu('campeao_semana', ['#c8102e', '#000000'], 'x', { contorno: true })).toContain(CONTORNO_CLARO);
    expect(svgDoTrofeu('campeao_temporada', ['#c8102e', '#000000'], 'x', { contorno: true })).not.toContain(CONTORNO_CLARO);
  });
});

describe('cores fixas para o canvas', () => {
  it('troca var(--taca…), var(--taca-sombra…) e var(--subiu…) pela cor de reserva', () => {
    for (const svg of [svgTaca({ rotulo: 'x' }), svgTaca({ estrela: true, rotulo: 'x' }), svgMegafone('x'), svgDoTrofeu('acesso', [], 'x')]) {
      const fixo = comCoresFixas(svg);
      expect(fixo).not.toContain('var(');
    }
    const taca = comCoresFixas(svgTaca({ rotulo: 'x' }));
    expect(taca).toContain('fill="#e9c75a"');
    expect(taca).toContain('fill="#b8920f"');
    expect(comCoresFixas(svgDoTrofeu('acesso', [], 'x'))).toContain('fill="#3ddc84"');
  });

  it('currentColor vira o traço pedido (as ondas do megafone)', () => {
    expect(svgMegafone('x')).toContain('currentColor');
    expect(comCoresFixas(svgMegafone('x'), '#3b3b36')).not.toContain('currentColor');
    expect(comCoresFixas(svgMegafone('x'), '#3b3b36')).toContain('stroke="#3b3b36"');
    expect(comCoresFixas(svgMegafone('x'))).toContain('stroke="#ffffff"');
  });

  it('a flâmula não muda (já usa cores literais)', () => {
    const svg = svgFlamula(['#c8102e', '#000000'], 'x');
    expect(comCoresFixas(svg)).toBe(svg);
  });

  it('svgParaImagem vira data URL de SVG com xmlns e o tamanho pedido', () => {
    const url = svgParaImagem(svgTaca({ rotulo: 'x' }), 120, 140);
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    const svg = decodeURIComponent(url.slice('data:image/svg+xml;charset=utf-8,'.length));
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg" width="120" height="140"');
    expect(svg).not.toContain('var(');
  });

  it('proporção pelo viewBox de cada desenho', () => {
    expect(proporcaoDoTrofeu('campeao_semana')).toBeCloseTo(40 / 60);
    expect(proporcaoDoTrofeu('maior_torcida')).toBeCloseTo(56 / 48);
    expect(proporcaoDoTrofeu('campeao_temporada')).toBeCloseTo(48 / 56);
  });
});
