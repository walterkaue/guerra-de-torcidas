// Desenha a matriz de um QR (módulos escuros = true) como SVG: fundo claro e margem de 4 módulos, que é o que a
// câmera do celular precisa para ler. Puro: quem gera a matriz é a tela (biblioteca uqr, baixada só lá).

export const MARGEM_QR = 4;

export function svgDoQr(matriz: readonly (readonly boolean[])[], margem = MARGEM_QR): string {
  const n = matriz.length;
  const lado = n + margem * 2;
  let d = '';
  matriz.forEach((linha, y) => {
    let x = 0;
    while (x < n) {
      if (!linha[x]) {
        x++;
        continue;
      }
      const ini = x;
      while (x < n && linha[x]) x++;
      d += `M${ini + margem} ${y + margem}h${x - ini}v1h-${x - ini}z`;
    }
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges" role="img" aria-label="QR do código">` +
    `<rect width="${lado}" height="${lado}" fill="#ffffff"/><path d="${d}" fill="#111111"/></svg>`
  );
}
