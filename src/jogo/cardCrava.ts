// Cards do Crava a Rodada (1080×1350), gerados no celular: "Meus palpites" (antes, sem
// porcentagem) e "Resultado da rodada" (pontos e linha de emoji). Os dois levam o aviso fixo.

import { corDeTexto, type Time } from '../dados/times';
import { FONTE, fundoFaixaDePlacar, PLACAR, ROTULO, quebrarTexto, rodapeCard, seloRecorde } from './card';
import { ordinalRodada } from './crava';
import { AVISO_RESENHA, type LinhaMeuPalpite } from './cravaTela';

const L = 1080;
const A = 1350;

export type DadosCardCrava =
  | { tipo: 'meus'; time: Time; rodada: number; linhas: readonly LinhaMeuPalpite[]; link: string }
  | {
      tipo: 'resultado';
      time: Time;
      rodada: number;
      pontos: number;
      paraTime: string | null;
      emoji: string;
      frase: string;
      /** Melhor rodada até agora (passou todas as anteriores). */
      novoRecorde: boolean;
      link: string;
    };

export function desenharCardCrava(d: DadosCardCrava): HTMLCanvasElement {
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
  c.fillText('GUERRA DE TORCIDAS · CRAVA A RODADA', L / 2, 120);
  c.font = `400 96px ${PLACAR}`;
  c.fillText(`${ordinalRodada(d.rodada)} RODADA`.toUpperCase(), L / 2, 240);

  c.fillStyle = txt === '#111111' ? 'rgba(17,17,17,0.9)' : 'rgba(0,0,0,0.55)';
  c.beginPath();
  c.roundRect(60, 290, L - 120, 720, 40);
  c.fill();
  if (d.tipo === 'resultado' && d.novoRecorde) seloRecorde(c, L - 210, 325);
  c.fillStyle = '#ffffff';

  if (d.tipo === 'meus') {
    c.font = `700 46px ${ROTULO}`;
    c.fillText('MEUS PALPITES', L / 2, 370);
    const linhas = d.linhas.slice(0, 10);
    const passo = linhas.length > 8 ? 58 : 66;
    c.font = `700 ${linhas.length > 8 ? 38 : 42}px ${FONTE}`;
    linhas.forEach((l, i) => {
      const y = 450 + i * passo;
      c.textAlign = 'right';
      c.fillText(l.mandante, L / 2 - 90, y, 360);
      c.textAlign = 'center';
      c.fillStyle = '#ffd23f';
      c.fillText(`${l.placar.m} x ${l.placar.v}`, L / 2, y);
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.fillText(`${l.visitante}${l.certeza ? ' ⭐' : ''}`, L / 2 + 90, y, 380);
    });
    c.textAlign = 'center';
    if (d.linhas.length > linhas.length) {
      c.font = `600 34px ${FONTE}`;
      c.fillText(`e mais ${d.linhas.length - linhas.length}`, L / 2, 450 + linhas.length * passo);
    }
  } else {
    c.font = `400 210px ${PLACAR}`;
    c.fillText(String(d.pontos), L / 2, 560);
    c.font = `900 58px ${FONTE}`;
    c.fillText(`pontos${d.paraTime ? ` ${d.paraTime}` : ''}`, L / 2, 650, L - 180);
    c.font = `64px ${FONTE}`;
    c.fillText(d.emoji, L / 2, 790, L - 160);
    c.font = `italic 600 42px ${FONTE}`;
    quebrarTexto(c, `“${d.frase}”`, L - 200)
      .slice(0, 2)
      .forEach((l, i) => c.fillText(l, L / 2, 940 + i * 52));
  }

  // Aviso fixo.
  c.fillStyle = txt;
  c.font = `700 34px ${FONTE}`;
  quebrarTexto(c, AVISO_RESENHA, L - 160).forEach((l, i) => c.fillText(l, L / 2, 1080 + i * 44));

  rodapeCard(c, d.time, d.link);
  return canvas;
}
