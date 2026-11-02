// Card da Prova de Boleiro, gerado no celular: a escada de 8 degraus dentro do telão (card.ts).
// Nunca mostra o texto das perguntas (o desafio por link usa as mesmas).

import { AMARELO, APAGADO, PLACAR, ROTULO, desenharModelo, modeloDePontos, type DadosBase } from './card';
import { degrausCertos, degrausDaEscada, type Degrau } from './cardTextos';

export interface DadosCardProva extends DadosBase {
  /** "cheguei na 6ª e parei" */
  resumo: string;
  pontos: number;
  escada: string;
}

/** "Prova de Boleiro: cheguei na 6ª e parei, 58 pro Flamengo" (texto do card e do WhatsApp). */
export function linhaDoCard(resumo: string, pontos: number, paraTime: string | null, novoRecorde = false): string {
  const quanto = paraTime ? `${pontos} ${paraTime}` : `${pontos} pontos`;
  return `Prova de Boleiro: ${resumo}, ${quanto}${novoRecorde ? ' · NOVO RECORDE!' : ''}`;
}

const COR_DO_DEGRAU: Record<Degrau, string> = {
  acertou: AMARELO,
  ajuda: '#f4e6ad',
  errou: '#ff5a3c',
  parou: '#ffffff',
  vazio: APAGADO,
};

function degrau(c: CanvasRenderingContext2D, tipo: Degrau, x: number, base: number, largura: number, altura: number): void {
  c.fillStyle = COR_DO_DEGRAU[tipo];
  c.beginPath();
  c.roundRect(x, base - altura, largura, altura, 6);
  c.fill();
  // Nunca só a cor: o erro leva um X e quem parou, uma barra no alto do degrau.
  if (tipo === 'errou') {
    const meio = x + largura / 2;
    const y = base - altura + 30;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 8;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(meio - 13, y - 13);
    c.lineTo(meio + 13, y + 13);
    c.moveTo(meio + 13, y - 13);
    c.lineTo(meio - 13, y + 13);
    c.stroke();
  } else if (tipo === 'parou') {
    c.fillStyle = '#070b10';
    c.fillRect(x + 12, base - altura + 22, largura - 24, 10);
  }
}

export function desenharCardProva(d: DadosCardProva): HTMLCanvasElement {
  return desenharModelo(modeloDePontos(d, 'Prova de Boleiro', d.pontos), (c, { x, y, l, a }) => {
    const degraus = degrausDaEscada(d.escada);
    const larguraEscada = 560;
    const passo = larguraEscada / degraus.length;
    const base = y + a - 56;
    const alturaMaxima = a - 84;
    degraus.forEach((tipo, i) => degrau(c, tipo, x + i * passo, base, passo - 10, 40 + (i * (alturaMaxima - 40)) / (degraus.length - 1)));

    c.textBaseline = 'alphabetic';
    c.textAlign = 'center';
    c.fillStyle = '#ffffff';
    c.font = `400 150px ${PLACAR}`;
    c.fillText(`${degrausCertos(degraus)}/${degraus.length}`, x + larguraEscada + (l - larguraEscada) / 2 + 6, base - 34, l - larguraEscada - 20);
    c.font = `700 40px ${ROTULO}`;
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillText(d.resumo.toUpperCase(), x + l / 2, y + a - 6, l);
  });
}
