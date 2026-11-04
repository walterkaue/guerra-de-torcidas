// Mão animada do Aquecimento: faz o gesto uma vez (arrasta ou toca) e some. Com movimento reduzido,
// no lugar da mão fica uma seta parada apontando o gesto, até a pessoa tocar.
// Pontos em pixels, relativos ao palco (o elemento onde ela aparece).

import { icone } from '../icones';

export interface Ponto {
  x: number;
  y: number;
}

export type Gesto = { tipo: 'arrasta'; de: Ponto; para: Ponto } | { tipo: 'toca'; em: Ponto[] };

/** Tamanho da mão e onde fica a ponta do dedo dentro do ícone (o indicador do ícone `mao`). */
const TAMANHO = 56;
const PONTA = { x: (9.5 / 24) * TAMANHO, y: (4.5 / 24) * TAMANHO };
const MS_ARRASTE = 1000;
const MS_TOQUE = 700;

const NS = 'http://www.w3.org/2000/svg';

/** Ponto do palco para um elemento dentro dele (centro do elemento). */
export function centroNoPalco(palco: HTMLElement, el: Element): Ponto {
  const p = palco.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - p.left + r.width / 2, y: r.top - p.top + r.height / 2 };
}

function camada(palco: HTMLElement): SVGSVGElement {
  const r = palco.getBoundingClientRect();
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('aq-gesto');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', String(r.width));
  svg.setAttribute('height', String(r.height));
  svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
  return svg;
}

function linha(svg: SVGSVGElement, a: Ponto, b: Ponto): SVGLineElement {
  const l = document.createElementNS(NS, 'line');
  l.setAttribute('x1', String(a.x));
  l.setAttribute('y1', String(a.y));
  l.setAttribute('x2', String(b.x));
  l.setAttribute('y2', String(b.y));
  svg.append(l);
  return l;
}

/** Seta parada de `de` até `para`, com a ponta em `para`. */
function seta(svg: SVGSVGElement, de: Ponto, para: Ponto): void {
  linha(svg, de, para);
  const ang = Math.atan2(para.y - de.y, para.x - de.x);
  const asa = 12;
  for (const lado of [-1, 1]) {
    const a = ang + Math.PI + lado * 0.5;
    linha(svg, para, { x: para.x + Math.cos(a) * asa, y: para.y + Math.sin(a) * asa });
  }
}

function anel(svg: SVGSVGElement, p: Ponto): void {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', String(p.x));
  c.setAttribute('cy', String(p.y));
  c.setAttribute('r', '22');
  svg.append(c);
}

/**
 * Mostra o gesto no palco e devolve a função que o tira. Some sozinho ao fim (mão) ou quando a pessoa
 * toca no palco (mão ou seta). `reduzido`: seta parada em vez da mão.
 */
export function demonstrar(palco: HTMLElement, gesto: Gesto, reduzido: boolean): () => void {
  const svg = camada(palco);
  const animacoes: Animation[] = [];
  let mao: HTMLElement | null = null;
  let fim: number | undefined;
  let feito = false;

  const tirar = () => {
    if (feito) return;
    feito = true;
    window.clearTimeout(fim);
    palco.removeEventListener('pointerdown', tirar, true);
    animacoes.forEach((a) => a.cancel());
    svg.remove();
    mao?.remove();
  };

  if (reduzido) {
    if (gesto.tipo === 'arrasta') seta(svg, gesto.de, gesto.para);
    else
      gesto.em.forEach((p, k) => {
        anel(svg, p);
        // Seta curta de cima para o ponto; os toques seguintes (se houver) levam o número da ordem.
        seta(svg, { x: p.x, y: p.y - 58 }, { x: p.x, y: p.y - 26 });
        if (gesto.em.length > 1) {
          const n = document.createElementNS(NS, 'text');
          n.textContent = String(k + 1);
          n.setAttribute('x', String(p.x + 28));
          n.setAttribute('y', String(p.y - 26));
          svg.append(n);
        }
      });
    palco.append(svg);
    palco.addEventListener('pointerdown', tirar, true);
    return tirar;
  }

  mao = document.createElement('span');
  mao.className = 'aq-mao';
  mao.setAttribute('aria-hidden', 'true');
  mao.innerHTML = icone('mao');
  palco.append(svg, mao);

  const aTela = (p: Ponto, escala = 1) => `translate(${p.x - PONTA.x}px, ${p.y - PONTA.y}px) scale(${escala})`;
  const anima = (el: Element, quadros: Keyframe[], duracao: number, atraso = 0) => {
    const a = el.animate(quadros, { duration: duracao, delay: atraso, easing: 'ease-in-out', fill: 'both' });
    animacoes.push(a);
    return a;
  };

  let total: number;
  if (gesto.tipo === 'arrasta') {
    const { de, para } = gesto;
    const l = linha(svg, de, para);
    const comp = Math.hypot(para.x - de.x, para.y - de.y);
    l.setAttribute('stroke-dasharray', `${comp}`);
    anima(l, [{ strokeDashoffset: comp, opacity: 1 }, { strokeDashoffset: comp, opacity: 1, offset: 0.2 }, { strokeDashoffset: 0, opacity: 1, offset: 0.85 }, { strokeDashoffset: 0, opacity: 0 }], MS_ARRASTE + 700);
    anima(mao, [
      { transform: aTela(de, 1.15), opacity: 0 },
      { transform: aTela(de, 0.9), opacity: 1, offset: 0.2 },
      { transform: aTela(de, 0.9), opacity: 1, offset: 0.3 },
      { transform: aTela(para, 0.9), opacity: 1, offset: 0.85 },
      { transform: aTela(para, 1.1), opacity: 0 },
    ], MS_ARRASTE + 700);
    total = MS_ARRASTE + 700;
  } else {
    total = gesto.em.length * MS_TOQUE + 300;
    gesto.em.forEach((p, k) => {
      const atraso = k * MS_TOQUE;
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', String(p.x));
      c.setAttribute('cy', String(p.y));
      c.setAttribute('r', '22');
      c.style.opacity = '0';
      svg.append(c);
      anima(c, [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 0, offset: 0.45 }, { opacity: 1, offset: 0.55 }, { opacity: 0, transform: 'scale(1.3)' }], MS_TOQUE, atraso);
    });
    // A mão pousa em cada ponto, aperta e levanta.
    const quadros: Keyframe[] = [];
    const passo = MS_TOQUE / total;
    gesto.em.forEach((p, k) => {
      const t0 = (k * MS_TOQUE) / total;
      quadros.push({ transform: aTela(p, 1.2), opacity: 0, offset: t0 });
      quadros.push({ transform: aTela(p, 1), opacity: 1, offset: t0 + passo * 0.3 });
      quadros.push({ transform: aTela(p, 0.85), opacity: 1, offset: t0 + passo * 0.55 });
      quadros.push({ transform: aTela(p, 1), opacity: 1, offset: t0 + passo * 0.8 });
    });
    quadros.push({ transform: aTela(gesto.em[gesto.em.length - 1], 1.1), opacity: 0, offset: 1 });
    anima(mao, quadros, total);
  }
  palco.addEventListener('pointerdown', tirar, true);
  fim = window.setTimeout(tirar, total + 100);
  return tirar;
}
