// Desenho dos cards personalizáveis (docs/jogo.md 14.6, docs/visual.md): recebe os dados e o plano já decidido
// (`planoDoCard`, em cardPersonalizado.ts) e devolve o canvas no tamanho do formato. Só desenha o que o plano manda.
// ESBOÇO da parte 1: a parte 2 troca o corpo pelos estilos Telão e Placar seco, sem mudar a assinatura.

import type { DadosDoCard, PlanoDoCard } from './cardPersonalizado';

export function desenharCardPersonalizado(d: DadosDoCard, plano: PlanoDoCard): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = plano.largura;
  canvas.height = plano.altura;
  const c = canvas.getContext('2d')!;
  c.fillStyle = plano.estilo === 'telao' ? '#0b3d1f' : '#f4f1e8';
  c.fillRect(0, 0, plano.largura, plano.altura);
  c.fillStyle = plano.estilo === 'telao' ? '#ffffff' : '#111111';
  c.font = '700 80px sans-serif';
  c.textAlign = 'center';
  c.fillText(`${plano.estilo} · ${plano.formato}`, plano.largura / 2, plano.altura / 2);
  c.fillText(d.destaque, plano.largura / 2, plano.altura / 2 + 120);
  return canvas;
}
