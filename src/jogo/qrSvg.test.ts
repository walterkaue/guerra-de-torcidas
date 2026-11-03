import { describe, expect, it } from 'vitest';
import { MARGEM_QR, svgDoQr } from './qrSvg';

describe('svgDoQr', () => {
  const matriz = [
    [true, false, true],
    [true, true, false],
    [false, false, false],
  ];

  it('deixa margem clara de 4 módulos em volta', () => {
    const svg = svgDoQr(matriz);
    expect(svg).toContain(`viewBox="0 0 ${3 + MARGEM_QR * 2} ${3 + MARGEM_QR * 2}"`);
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain(`M${MARGEM_QR} ${MARGEM_QR}h1v1h-1z`);
  });

  it('junta módulos escuros vizinhos na mesma linha', () => {
    expect(svgDoQr(matriz)).toContain(`M${MARGEM_QR} ${MARGEM_QR + 1}h2v1h-2z`);
  });

  it('não pinta nada numa matriz toda clara', () => {
    expect(svgDoQr([[false, false], [false, false]])).toContain('d=""');
  });
});
