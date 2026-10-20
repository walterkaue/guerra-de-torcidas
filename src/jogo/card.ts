// Card de resultado 1080×1350 (bom para WhatsApp e stories), gerado no próprio celular.

import { corDeTexto, type Time } from '../dados/times';
import { AVISO_PRE_TEMPORADA } from './posicao';

export interface DadosCard {
  time: Time;
  /** Sem apelido, o card diz "Fiz N pontos…". */
  apelido?: string;
  /** "pro Flamengo" / "pra Chapecoense"; null para "Outro time". */
  paraTime: string | null;
  golsJogador: number;
  golsMaquina: number;
  pontos: number;
  frase: string;
  novoRecorde: boolean;
  link: string;
}

const L = 1080;
const A = 1350;
// Mesmas fontes da interface (docs/visual.md); o sistema entra só se elas não carregarem.
export const FONTE = 'Barlow, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const PLACAR = 'Anton, Impact, "Arial Narrow", sans-serif';
export const ROTULO = '"Barlow Condensed", "Arial Narrow", sans-serif';

export function quebrarTexto(c: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (c.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Selo amarelo "NOVO RECORDE!", levemente torto (adesivo de transmissão), centrado em (x, y). */
export function seloRecorde(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(-0.14);
  c.font = `400 54px ${PLACAR}`;
  const largura = c.measureText('NOVO RECORDE!').width + 56;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.roundRect(-largura / 2 - 6, -46, largura + 12, 92, 18);
  c.fill();
  c.fillStyle = '#ffd23f';
  c.beginPath();
  c.roundRect(-largura / 2, -40, largura, 80, 14);
  c.fill();
  c.fillStyle = '#111111';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('NOVO RECORDE!', 0, 3);
  c.restore();
}

/** Letra miúda da pré-temporada, embaixo do botão do link (todos os cards). */
export function rodapePreTemporada(c: CanvasRenderingContext2D, cor: string): void {
  c.save();
  c.textAlign = 'center';
  c.fillStyle = cor;
  c.globalAlpha = 0.85;
  c.font = `600 28px ${FONTE}`;
  c.fillText(AVISO_PRE_TEMPORADA, L / 2, A - 32, L - 120);
  c.restore();
}

export function desenharCard(d: DadosCard): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = A;
  const c = canvas.getContext('2d')!;
  const [c1, c2] = d.time.cores;
  const txt = corDeTexto(c1);

  // Fundo em listras diagonais com as cores do time.
  c.fillStyle = c1;
  c.fillRect(0, 0, L, A);
  c.save();
  c.globalAlpha = 0.18;
  c.fillStyle = c2;
  c.rotate(-0.35);
  for (let x = -A; x < L * 2; x += 180) c.fillRect(x, -200, 70, A * 2);
  c.restore();

  // Faixa escura para o placar.
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.beginPath();
  c.roundRect(70, 330, L - 140, 420, 40);
  c.fill();
  if (d.novoRecorde) seloRecorde(c, L - 210, 330);

  c.textAlign = 'center';
  c.fillStyle = txt;
  c.font = `700 44px ${ROTULO}`;
  c.fillText('GUERRA DE TORCIDAS · BATE CONTRA MIM', L / 2, 130);

  c.font = `400 92px ${PLACAR}`;
  c.fillText(d.time.nome.toUpperCase(), L / 2, 250);

  c.fillStyle = '#ffffff';
  c.font = `400 250px ${PLACAR}`;
  c.fillText(`${d.golsJogador} x ${d.golsMaquina}`, L / 2, 600);
  c.font = `700 40px ${ROTULO}`;
  c.globalAlpha = 0.8;
  c.fillText('VOCÊ          MÁQUINA', L / 2, 690);
  c.globalAlpha = 1;

  c.fillStyle = txt;
  c.font = `900 64px ${FONTE}`;
  const destaque = quebrarTexto(c, `${d.apelido ? `${d.apelido} fez` : 'Fiz'} ${d.pontos} pontos${d.paraTime ? ` ${d.paraTime}` : ''}`, L - 160);
  destaque.slice(0, 2).forEach((l, i) => c.fillText(l, L / 2, 860 + i * 76));

  c.font = `italic 600 46px ${FONTE}`;
  const frase = quebrarTexto(c, `“${d.frase}”`, L - 180);
  const yFrase = 860 + Math.min(destaque.length, 2) * 76 + 50;
  frase.slice(0, 3).forEach((l, i) => c.fillText(l, L / 2, yFrase + i * 58));

  // Rodapé com o link.
  c.fillStyle = '#ffd23f';
  c.beginPath();
  c.roundRect(110, A - 190, L - 220, 110, 55);
  c.fill();
  c.fillStyle = '#111111';
  c.font = `700 46px ${ROTULO}`;
  c.fillText('Faz mais? →', L / 2, A - 140);
  c.font = `700 32px ${FONTE}`;
  c.fillText(d.link, L / 2, A - 98);
  rodapePreTemporada(c, txt);

  return canvas;
}
