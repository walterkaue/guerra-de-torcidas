// Card da Prova de Boleiro (1080×1350), gerado no celular: resumo, pontos e a escada em emoji.
// Nunca mostra o texto das perguntas (o desafio por link usa as mesmas).

import { corDeTexto, type Time } from '../dados/times';
import { FONTE, fundoFaixaDePlacar, PLACAR, ROTULO, quebrarTexto, rodapePreTemporada, seloRecorde } from './card';

const L = 1080;
const A = 1350;
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export interface DadosCardProva {
  time: Time;
  apelido?: string;
  /** "pro Flamengo"; null para "Outro time". */
  paraTime: string | null;
  /** "cheguei na 6ª e parei" */
  resumo: string;
  pontos: number;
  escada: string;
  frase: string;
  novoRecorde: boolean;
  link: string;
}

/** "Prova de Boleiro: cheguei na 6ª e parei, 58 pro Flamengo" (texto do card e do WhatsApp). */
export function linhaDoCard(resumo: string, pontos: number, paraTime: string | null, novoRecorde = false): string {
  const quanto = paraTime ? `${pontos} ${paraTime}` : `${pontos} pontos`;
  return `Prova de Boleiro: ${resumo}, ${quanto}${novoRecorde ? ' · NOVO RECORDE!' : ''}`;
}

export function desenharCardProva(d: DadosCardProva): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = A;
  const c = canvas.getContext('2d')!;
  const [c1] = d.time.cores;
  const txt = corDeTexto(c1);

  fundoFaixaDePlacar(c, d.time);

  c.textAlign = 'center';
  c.fillStyle = txt;
  c.font = `700 44px ${ROTULO}`;
  c.fillText('GUERRA DE TORCIDAS', L / 2, 120);
  c.font = `400 110px ${PLACAR}`;
  c.fillText('PROVA DE BOLEIRO', L / 2, 245);

  c.fillStyle = txt === '#111111' ? 'rgba(17,17,17,0.9)' : 'rgba(0,0,0,0.55)';
  c.beginPath();
  c.roundRect(70, 300, L - 140, 470, 40);
  c.fill();
  if (d.novoRecorde) seloRecorde(c, L - 210, 335);

  c.fillStyle = '#ffffff';
  c.font = `400 200px ${PLACAR}`;
  c.fillText(String(d.pontos), L / 2, 520);
  c.font = `700 44px ${ROTULO}`;
  c.globalAlpha = 0.85;
  c.fillText(d.resumo.toUpperCase(), L / 2, 590);
  c.globalAlpha = 1;
  // Escada: até 9 símbolos (8 perguntas + ✋).
  c.font = `76px ${EMOJI}`;
  c.fillText(d.escada, L / 2, 710);

  c.fillStyle = txt;
  c.font = `900 60px ${FONTE}`;
  const quem = d.apelido ? `${d.apelido} fez` : 'Fiz';
  const destaque = quebrarTexto(c, `${quem} ${d.pontos} pontos${d.paraTime ? ` ${d.paraTime}` : ''}`, L - 160);
  destaque.slice(0, 2).forEach((l, i) => c.fillText(l, L / 2, 880 + i * 72));

  c.font = `italic 600 44px ${FONTE}`;
  const frase = quebrarTexto(c, `“${d.frase}”`, L - 180);
  const yFrase = 880 + Math.min(destaque.length, 2) * 72 + 46;
  frase.slice(0, 2).forEach((l, i) => c.fillText(l, L / 2, yFrase + i * 56));

  c.fillStyle = '#ffd23f';
  c.beginPath();
  c.roundRect(110, A - 190, L - 220, 110, 55);
  c.fill();
  c.fillStyle = '#111111';
  c.font = `700 46px ${ROTULO}`;
  c.fillText('Faz mais? →', L / 2, A - 140);
  c.font = `700 32px ${FONTE}`;
  c.fillText(d.link, L / 2, A - 98);
  rodapePreTemporada(c, corDeTexto(d.time.cores[1]));

  return canvas;
}
