// Card de resultado 1080×1920 (9:16, proporção dos stories do Instagram), gerado no próprio celular.

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
const A = 1920;
// Mesmas fontes da interface (docs/visual.md); o sistema entra só se elas não carregarem.
export const FONTE = 'Barlow, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const PLACAR = 'Anton, Impact, "Arial Narrow", sans-serif';
export const ROTULO = '"Barlow Condensed", "Arial Narrow", sans-serif';

const ALTURA_FAIXA = 330;
/** Quanto o conteúdo desce no formato 9:16 (a layout original tinha 1920 de altura). */
export const DESLOC = 320;

/** Fundo "faixa de placar" (docs/visual.md): cor 1 cheia, faixa reta da cor 2 embaixo e filete da 3ª cor. */
export function fundoFaixaDePlacar(c: CanvasRenderingContext2D, time: Time): void {
  const topo = A - ALTURA_FAIXA;
  c.fillStyle = time.cores[0];
  c.fillRect(0, 0, L, A);
  c.fillStyle = time.cores[1];
  c.fillRect(0, topo, L, A - topo);
  c.fillStyle = time.cor3 ?? time.cores[1];
  c.fillRect(0, topo, L, 8);
}

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
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.textAlign = 'center';
  c.fillStyle = cor;
  c.globalAlpha = 0.85;
  c.font = `600 28px ${FONTE}`;
  c.fillText(AVISO_PRE_TEMPORADA, L / 2, A - 150, L - 120);
  c.restore();
}

/** Rodapé limpo sobre a faixa: só o link e a letra miúda da pré-temporada, sem botão. */
export function rodapeCard(c: CanvasRenderingContext2D, time: Time, link: string): void {
  const cor = corDeTexto(time.cores[1]);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.textAlign = 'center';
  c.fillStyle = cor;
  c.font = `700 44px ${ROTULO}`;
  c.fillText(link.replace(/^https?:\/\//, ''), L / 2, A - 210, L - 120);
  c.restore();
  rodapePreTemporada(c, cor);
}

/**
 * Nível da carreira no card, só quando a pessoa escolhe (docs/jogo.md, seção 5, "Longo prazo"): uma
 * etiqueta no alto da faixa de baixo, acima do link. Desenha por cima de qualquer card pronto.
 */
export function seloNivel(canvas: HTMLCanvasElement, nivel: string): void {
  const c = canvas.getContext('2d')!;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  const texto = `CARREIRA · ${nivel.toUpperCase()}`;
  c.font = `700 40px ${ROTULO}`;
  const largura = c.measureText(texto).width + 56;
  const y = A - ALTURA_FAIXA + 46;
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.beginPath();
  c.roundRect(L / 2 - largura / 2, y - 34, largura, 68, 34);
  c.fill();
  c.fillStyle = '#ffd23f';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, L / 2, y + 2);
  c.restore();
}

export function desenharCard(d: DadosCard): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = A;
  const c = canvas.getContext('2d')!;
  const [c1] = d.time.cores;
  const txt = corDeTexto(c1);

  fundoFaixaDePlacar(c, d.time);
  // Stories 9:16: o conteúdo desce para fora das zonas que o Instagram cobre.
  c.translate(0, DESLOC);

  // Faixa escura para o placar.
  c.fillStyle = txt === '#111111' ? 'rgba(17,17,17,0.9)' : 'rgba(0,0,0,0.55)';
  c.beginPath();
  c.roundRect(70, 320, L - 140, 330, 40);
  c.fill();
  if (d.novoRecorde) seloRecorde(c, L - 210, 320);

  c.textAlign = 'center';
  c.fillStyle = txt;
  c.font = `700 44px ${ROTULO}`;
  c.fillText('GUERRA DE TORCIDAS · BATE CONTRA MIM', L / 2, 130);

  c.font = `400 92px ${PLACAR}`;
  c.fillText(d.time.nome.toUpperCase(), L / 2, 250);

  c.fillStyle = '#ffffff';
  c.font = `400 190px ${PLACAR}`;
  c.fillText(`${d.golsJogador} x ${d.golsMaquina}`, L / 2, 530);
  c.font = `700 40px ${ROTULO}`;
  c.globalAlpha = 0.8;
  c.fillText('VOCÊ          MÁQUINA', L / 2, 610);
  c.globalAlpha = 1;

  c.fillStyle = txt;
  c.font = `900 64px ${FONTE}`;
  const destaque = quebrarTexto(c, `${d.apelido ? `${d.apelido} fez` : 'Fiz'} ${d.pontos} pontos${d.paraTime ? ` ${d.paraTime}` : ''}`, L - 160);
  destaque.slice(0, 2).forEach((l, i) => c.fillText(l, L / 2, 740 + i * 76));

  c.font = `italic 600 46px ${FONTE}`;
  const frase = quebrarTexto(c, `“${d.frase}”`, L - 180);
  const yFrase = 740 + Math.min(destaque.length, 2) * 76 + 50;
  frase.slice(0, 3).forEach((l, i) => c.fillText(l, L / 2, yFrase + i * 58));

  rodapeCard(c, d.time, d.link);

  return canvas;
}
