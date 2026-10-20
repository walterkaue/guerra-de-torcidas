// Card do Time do Dia (1080×1350), gerado no celular: número do dia, placar, sequência e a grade
// em emoji. Nunca mostra o nome de nenhum clube (nada de spoiler para o grupo).

import { corDeTexto, type Time } from '../dados/times';
import { FONTE, PLACAR, ROTULO, quebrarTexto } from './card';

const L = 1080;
const A = 1350;
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export interface DadosCardDia {
  time: Time;
  numero: number;
  /** "4/6" ou "X/6" */
  placar: string;
  dias: number;
  /** Uma linha por tentativa. */
  grade: string;
  frase: string;
  amistoso: boolean;
  link: string;
}

export function desenharCardDia(d: DadosCardDia): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = A;
  const c = canvas.getContext('2d')!;
  const [c1, c2] = d.time.cores;
  const txt = corDeTexto(c1);

  c.fillStyle = c1;
  c.fillRect(0, 0, L, A);
  c.save();
  c.globalAlpha = 0.18;
  c.fillStyle = c2;
  c.rotate(-0.35);
  for (let x = -A; x < L * 2; x += 180) c.fillRect(x, -200, 70, A * 2);
  c.restore();

  c.textAlign = 'center';
  c.fillStyle = txt;
  c.font = `700 44px ${ROTULO}`;
  c.fillText(`GUERRA DE TORCIDAS${d.amistoso ? ' · AMISTOSO' : ''}`, L / 2, 110);
  c.font = `400 110px ${PLACAR}`;
  c.fillText(`TIME DO DIA #${d.numero}`, L / 2, 235);

  // Caixa escura com placar, sequência e grade.
  const linhas = d.grade.split('\n').slice(0, 6);
  const altGrade = linhas.length * 74;
  const altCaixa = 230 + altGrade;
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.beginPath();
  c.roundRect(70, 280, L - 140, altCaixa, 40);
  c.fill();

  c.fillStyle = '#ffffff';
  c.font = `400 150px ${PLACAR}`;
  c.fillText(d.placar, L / 2, 440);
  if (d.dias > 1) {
    c.font = `700 44px ${ROTULO}`;
    c.globalAlpha = 0.85;
    c.fillText(`🔥 ${d.dias} DIAS SEGUIDOS`, L / 2, 495);
    c.globalAlpha = 1;
  }
  c.font = `60px ${EMOJI}`;
  linhas.forEach((l, i) => c.fillText(l, L / 2, 575 + i * 74));

  const yFrase = 280 + altCaixa + 80;
  c.fillStyle = txt;
  c.font = `italic 600 44px ${FONTE}`;
  quebrarTexto(c, `“${d.frase}”`, L - 180)
    .slice(0, 2)
    .forEach((l, i) => c.fillText(l, L / 2, yFrase + i * 56));

  c.fillStyle = '#ffd23f';
  c.beginPath();
  c.roundRect(110, A - 190, L - 220, 110, 55);
  c.fill();
  c.fillStyle = '#111111';
  c.font = `700 46px ${ROTULO}`;
  c.fillText('Duvido você achar em menos →', L / 2, A - 140);
  c.font = `700 32px ${FONTE}`;
  c.fillText(d.link, L / 2, A - 98);

  return canvas;
}
