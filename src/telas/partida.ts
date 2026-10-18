// Tela da partida em canvas: alterna cobrança e defesa, 5 de cada.
// Toda decisão de resultado vem do motor puro (jogo/penaltis.ts); aqui é só gesto e desenho.

import { irPara, type Rota } from '../app';
import { corDeTexto, timePorId, TIMES, type Time } from '../dados/times';
import { prefs } from '../estado';
import { sementeNova } from '../jogo/aleatorio';
import { narrarCobranca, narrarDefesa, narrarFinal } from '../jogo/narrador';
import {
  COBRANCAS,
  coluna,
  dificuldadePorDia,
  linha,
  normalizarCobranca,
  planejarDefesa,
  resolverCobranca,
  resolverDefesa,
  totalizar,
  type GestoCobranca,
  type PlanoDefesa,
  type ResultadoCobranca,
  type ResultadoDefesa,
} from '../jogo/penaltis';
import { destravarSom, somApito, somChute, somTorcida } from '../jogo/som';

type Fase =
  | { tipo: 'mirar' }
  | { tipo: 'chute'; inicio: number; r: ResultadoCobranca; gesto: GestoCobranca }
  | { tipo: 'corrida'; inicio: number; plano: PlanoDefesa; zona: number | null; pulouEm: number | null }
  | { tipo: 'chuteMaquina'; inicio: number; r: ResultadoDefesa; pulouEm: number }
  | { tipo: 'pausa'; ate: number; depois: () => void };

/** Dia da semana no horário de Brasília (a temporada zera na segunda, 00h BRT). */
function diaEmBrasilia(): number {
  const nome = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date());
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(nome);
}

// Em dev, ?relogio troca o requestAnimationFrame por timer (para testes com a aba em segundo plano).
const usarTimer = import.meta.env.DEV && new URLSearchParams(location.search).has('relogio');
const proximoQuadro = (fn: (t: number) => void): number =>
  usarTimer ? window.setTimeout(() => fn(performance.now()), 16) : requestAnimationFrame(fn);

const DUR_CHUTE = 650;
const DUR_CAVADINHA = 1050;
const DUR_PULO = 420;
const DUR_CORRIDA = 900;

export function telaPartida(root: HTMLElement, _rota: Rota): () => void {
  const time: Time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  const semente = sementeNova();
  const dificuldade = dificuldadePorDia(diaEmBrasilia());

  root.innerHTML = `
    <main class="partida" style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
      <header class="hud">
        <button class="voltar" type="button" aria-label="Sair da partida">‹</button>
        <div class="placar-jogo">
          <div class="lado"><span class="sigla">${time.nome}</span><span class="bolinhas" data-lado="jogador"></span></div>
          <strong class="gols"><span data-gols="jogador">0</span> x <span data-gols="maquina">0</span></strong>
          <div class="lado"><span class="sigla">Máquina</span><span class="bolinhas" data-lado="maquina"></span></div>
        </div>
        <button class="mudo" type="button" aria-label="Som"></button>
      </header>
      <canvas class="campo-jogo"></canvas>
      <p class="instrucao" aria-live="polite"></p>
      <p class="narrador" aria-live="assertive"></p>
    </main>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const c = canvas.getContext('2d')!;
  const elInstrucao = root.querySelector<HTMLElement>('.instrucao')!;
  const elNarrador = root.querySelector<HTMLElement>('.narrador')!;
  const elMudo = root.querySelector<HTMLButtonElement>('.mudo')!;

  const cobrancas: ResultadoCobranca[] = [];
  const defesas: ResultadoDefesa[] = [];
  const gestosCobranca: GestoCobranca[] = [];
  const gestosDefesa: number[] = [];
  let rodada = 0; // 0..4
  let fase: Fase = { tipo: 'mirar' };
  let rastro: { x: number; y: number }[] = [];
  let acabou = false;

  // ---------- geometria ----------
  let W = 0;
  let H = 0;
  const g = { gx: 0, gy: 0, gw: 0, gh: 0, bolaX: 0, bolaY: 0, raio: 0 };

  function medir(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ret = canvas.getBoundingClientRect();
    W = ret.width;
    H = ret.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.gw = Math.min(W * 0.86, 420);
    g.gh = g.gw * 0.36;
    g.gx = (W - g.gw) / 2;
    g.gy = H * 0.16;
    g.bolaX = W / 2;
    g.bolaY = H * 0.8;
    g.raio = Math.max(10, Math.min(W, H) * 0.035);
  }

  /** Coordenadas do motor (x -1..1, y 0..1) para a tela. */
  const telaX = (x: number) => g.gx + ((x + 1) / 2) * g.gw;
  const telaY = (y: number) => g.gy + g.gh - y * g.gh;
  const centroZona = (z: number) => ({ x: [-2 / 3, 0, 2 / 3][coluna(z)], y: linha(z) === 1 ? 0.72 : 0.25 });

  // ---------- HUD ----------
  function atualizarHud(): void {
    const golsJ = cobrancas.filter((r) => r.desfecho === 'gol').length;
    const golsM = defesas.filter((r) => r.desfecho === 'gol').length;
    root.querySelector('[data-gols="jogador"]')!.textContent = String(golsJ);
    root.querySelector('[data-gols="maquina"]')!.textContent = String(golsM);
    const bolinhas = (lista: { desfecho: string }[], marcou: (d: string) => boolean) =>
      Array.from({ length: COBRANCAS }, (_, i) => {
        const r = lista[i];
        const cls = r ? (marcou(r.desfecho) ? 'b-gol' : 'b-erro') : '';
        return `<i class="${cls}"></i>`;
      }).join('');
    root.querySelector('[data-lado="jogador"]')!.innerHTML = bolinhas(cobrancas, (d) => d === 'gol');
    root.querySelector('[data-lado="maquina"]')!.innerHTML = bolinhas(defesas, (d) => d === 'gol');
    elMudo.textContent = prefs.get().mudo ? '🔇' : '🔊';
  }

  function narrar(texto: string): void {
    elNarrador.textContent = texto;
    elNarrador.classList.remove('pulso');
    void elNarrador.offsetWidth;
    elNarrador.classList.add('pulso');
  }

  function instruir(texto: string): void {
    elInstrucao.textContent = texto;
  }

  // ---------- fluxo ----------
  function comecarCobranca(): void {
    fase = { tipo: 'mirar' };
    rastro = [];
    instruir(
      rodada === 0
        ? 'Arraste da bola pro gol. Mais longo = mais forte. Curve no fim para dar efeito.'
        : `Cobrança ${rodada + 1} de ${COBRANCAS}. Arraste para chutar.`,
    );
  }

  function comecarDefesa(): void {
    const plano = planejarDefesa(semente, rodada, dificuldade);
    fase = { tipo: 'corrida', inicio: performance.now(), plano, zona: null, pulouEm: null };
    instruir('Agora você é o goleiro! Olhe o pé de apoio e toque onde pular.');
  }

  function depoisDe(ms: number, fn: () => void): void {
    fase = { tipo: 'pausa', ate: performance.now() + ms, depois: fn };
  }

  function chutar(gesto: GestoCobranca): void {
    const gq = normalizarCobranca(gesto);
    const r = resolverCobranca(semente, rodada, gq, dificuldade);
    gestosCobranca.push(gq);
    fase = { tipo: 'chute', inicio: performance.now(), r, gesto: gq };
    instruir('');
    somChute();
  }

  function fimDoChute(r: ResultadoCobranca): void {
    cobrancas.push(r);
    atualizarHud();
    narrar(narrarCobranca(r, time.nome));
    somTorcida(r.desfecho === 'gol' ? 'festa' : 'uuuh');
    depoisDe(1500, comecarDefesa);
  }

  function chuteDaMaquina(zona: number, pulouEm: number): void {
    const r = resolverDefesa(semente, rodada, zona, dificuldade);
    gestosDefesa.push(zona);
    fase = { tipo: 'chuteMaquina', inicio: performance.now(), r, pulouEm };
    somChute();
  }

  function fimDaDefesa(r: ResultadoDefesa): void {
    defesas.push(r);
    atualizarHud();
    narrar(narrarDefesa(r, time.nome));
    somTorcida(r.desfecho === 'defesa' ? 'festa' : 'uuuh');
    rodada++;
    if (rodada < COBRANCAS) depoisDe(1500, comecarCobranca);
    else depoisDe(1600, encerrar);
  }

  function encerrar(): void {
    acabou = true;
    const resultado = totalizar(cobrancas, defesas);
    somApito(true);
    irPara({
      tela: 'resultado',
      dados: {
        timeId: time.id,
        semente,
        dificuldade,
        gestos: { cobrancas: gestosCobranca, defesas: gestosDefesa },
        resultado,
        fraseFinal: narrarFinal(resultado, time.nome),
      },
    });
  }

  // ---------- gestos ----------
  function ponto(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function aoTocar(e: PointerEvent): void {
    destravarSom();
    if (fase.tipo === 'mirar') {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // alguns navegadores recusam a captura; o arraste segue funcionando
      }
      rastro = [ponto(e)];
    } else if (fase.tipo === 'corrida' && fase.zona === null) {
      const p = ponto(e);
      fase.zona = zonaTocada(p.x, p.y);
      fase.pulouEm = performance.now();
    }
  }

  function aoMover(e: PointerEvent): void {
    if (fase.tipo === 'mirar' && rastro.length) {
      const juntos = e.getCoalescedEvents?.() ?? [];
      for (const ev of juntos.length ? juntos : [e]) rastro.push(ponto(ev));
    }
  }

  function aoSoltar(e: PointerEvent): void {
    if (fase.tipo !== 'mirar' || rastro.length < 1) {
      rastro = [];
      return;
    }
    rastro.push(ponto(e));
    const gesto = lerArraste(rastro);
    rastro = [];
    if (gesto) chutar(gesto);
    else instruir('Arraste pra cima, na direção do gol.');
  }

  /** Converte o arraste em gesto: direção = canto, comprimento = força, curva final = efeito. */
  function lerArraste(pts: { x: number; y: number }[]): GestoCobranca | null {
    const a = pts[0];
    const b = pts[pts.length - 1];
    const dx = b.x - a.x;
    const subida = a.y - b.y;
    const comp = Math.hypot(dx, subida);
    if (subida < 12 || comp < 20) return null;

    // Prolonga a linha do arraste até a altura do gol para achar o canto.
    const distGol = g.bolaY - (g.gy + g.gh / 2);
    const xGol = ((dx / subida) * distGol) / (g.gw / 2);
    const dir = (xGol / 1.1) * 100;
    // Arrastar da bola até o meio do gol dá ~70 (meia altura); passar do gol isola.
    const forca = (comp / (H * 0.7)) * 100;

    // Efeito: quanto o último terço do arraste dobra em relação à direção geral.
    const k = Math.floor(pts.length * 0.65);
    const m = pts[Math.min(k, pts.length - 2)];
    const ox = dx / comp;
    const oy = -subida / comp;
    const lx = b.x - m.x;
    const ly = b.y - m.y;
    const lc = Math.hypot(lx, ly) || 1;
    // Produto vetorial: positivo quando o fim do arraste dobra para a direita.
    const giro = ox * (ly / lc) - oy * (lx / lc);
    let efeito = giro * 160;
    if (Math.abs(efeito) < 15) efeito = 0;

    return { dir, forca, efeito };
  }

  function zonaTocada(x: number, y: number): number {
    // Toque fora do gol ainda conta: vale a zona mais próxima.
    const gx = Math.max(-0.999, Math.min(0.999, ((x - g.gx) / g.gw) * 2 - 1));
    const gy = Math.max(0, Math.min(1, (g.gy + g.gh - y) / g.gh));
    const col = gx < -1 / 3 ? 0 : gx > 1 / 3 ? 2 : 1;
    return (gy >= 0.5 ? 3 : 0) + col;
  }

  // ---------- desenho ----------
  const facil = (t: number) => 1 - (1 - t) * (1 - t);

  function desenharCenario(): void {
    // Gramado em faixas.
    for (let i = 0; i * 48 < H; i++) {
      c.fillStyle = i % 2 ? '#13562d' : '#0f4a26';
      c.fillRect(0, i * 48, W, 48);
    }
    // Arquibancada com as cores do time.
    const alt = g.gy - 6;
    c.fillStyle = '#0a2414';
    c.fillRect(0, 0, W, alt);
    for (let y = 8; y < alt - 4; y += 10) {
      for (let x = (y / 10) % 2 ? 4 : 10; x < W; x += 12) {
        c.fillStyle = (x + y) % 3 === 0 ? time.cores[0] : (x + y) % 3 === 1 ? time.cores[1] : '#1d3b28';
        c.globalAlpha = 0.55;
        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
    // Grande área e marca do pênalti.
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 2;
    const ax = g.gx - g.gw * 0.25;
    const aw = g.gw * 1.5;
    c.strokeRect(ax, g.gy + g.gh, aw, H * 0.3);
    c.beginPath();
    c.moveTo(0, g.gy + g.gh);
    c.lineTo(W, g.gy + g.gh);
    c.stroke();
    // Rede.
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(g.gx, g.gy, g.gw, g.gh);
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = 1;
    for (let x = g.gx; x <= g.gx + g.gw; x += 12) {
      c.beginPath();
      c.moveTo(x, g.gy);
      c.lineTo(x, g.gy + g.gh);
      c.stroke();
    }
    for (let y = g.gy; y <= g.gy + g.gh; y += 12) {
      c.beginPath();
      c.moveTo(g.gx, y);
      c.lineTo(g.gx + g.gw, y);
      c.stroke();
    }
    // Traves.
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(g.gx, g.gy + g.gh);
    c.lineTo(g.gx, g.gy);
    c.lineTo(g.gx + g.gw, g.gy);
    c.lineTo(g.gx + g.gw, g.gy + g.gh);
    c.stroke();
  }

  function desenharGoleiro(corA: string, corB: string, zona: number | null, t: number): void {
    // t de 0 (parado) a 1 (pulo completo).
    const base = { x: 0, y: 0.38 };
    const alvo = zona === null || zona < 0 ? base : centroZona(zona);
    const e = facil(Math.max(0, Math.min(1, t)));
    const gx = telaX(base.x + (alvo.x - base.x) * e);
    const gy = telaY(base.y + (alvo.y - base.y) * e);
    const inclina = zona === null || zona < 0 || coluna(zona) === 1 ? 0 : (coluna(zona) === 0 ? -1 : 1) * 1.25 * e;
    const esc = g.gh / 120;

    c.save();
    c.translate(gx, gy);
    c.rotate(inclina);
    c.scale(esc, esc);
    // braços
    c.strokeStyle = corA;
    c.lineWidth = 9;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-14, -18);
    c.lineTo(-30, -44 + e * 10);
    c.moveTo(14, -18);
    c.lineTo(30, -44 + e * 10);
    c.stroke();
    // luvas
    c.fillStyle = '#f5f5f0';
    for (const lx of [-30, 30]) {
      c.beginPath();
      c.arc(lx, -46 + e * 10, 6, 0, Math.PI * 2);
      c.fill();
    }
    // corpo
    c.fillStyle = corA;
    c.beginPath();
    c.roundRect(-16, -26, 32, 38, 8);
    c.fill();
    c.fillStyle = corB;
    c.fillRect(-16, -4, 32, 6);
    // pernas
    c.strokeStyle = '#1b1b1b';
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(-8, 12);
    c.lineTo(-12, 36);
    c.moveTo(8, 12);
    c.lineTo(12, 36);
    c.stroke();
    // cabeça
    c.fillStyle = '#d9a37a';
    c.beginPath();
    c.arc(0, -36, 10, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function desenharBola(x: number, y: number, escala = 1): void {
    const r = g.raio * escala;
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.ellipse(x, y + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1b1b1b';
    c.beginPath();
    c.arc(x, y, r * 0.38, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
  }

  /** Batedor da máquina visto de costas, com o pé de apoio apontando a "dica". */
  function desenharBatedor(progresso: number, dica: number | null): void {
    const x0 = g.bolaX - g.raio * 5;
    const y0 = g.bolaY + g.raio * 4;
    // Para um pouco atrás da bola, para o pé de apoio ficar à vista.
    const x = x0 + (g.bolaX - g.raio * 3.4 - x0) * Math.min(1, progresso);
    const y = y0 + (g.bolaY + g.raio * 1.8 - y0) * Math.min(1, progresso);
    const esc = g.raio / 14;
    // Pé de apoio (a dica), ao lado da bola, com um rastro no chão apontando o canto.
    if (dica !== null) {
      const ang = [-0.6, 0, 0.6][dica];
      const px = g.bolaX - g.raio * 1.7;
      const py = g.bolaY + g.raio * 0.2;
      c.save();
      c.translate(px, py);
      c.rotate(ang);
      c.strokeStyle = 'rgba(255,210,63,0.8)';
      c.lineWidth = 4;
      c.setLineDash([6, 6]);
      c.beginPath();
      c.moveTo(0, -g.raio * 1.4);
      c.lineTo(0, -g.raio * 5);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#ffd23f';
      c.shadowColor = '#ffd23f';
      c.shadowBlur = 16;
      c.beginPath();
      c.ellipse(0, 0, g.raio * 0.5, g.raio * 1.1, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.save();
    c.translate(x, y);
    c.scale(esc, esc);
    // pernas
    c.strokeStyle = '#1b1b1b';
    c.lineWidth = 9;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-6, -18);
    c.lineTo(-12, 6);
    c.moveTo(6, -18);
    c.lineTo(12, 0);
    c.stroke();
    // corpo (camisa neutra da máquina)
    c.fillStyle = '#e5e7eb';
    c.beginPath();
    c.roundRect(-16, -56, 32, 40, 8);
    c.fill();
    c.fillStyle = '#9ca3af';
    c.font = '900 18px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('10', 0, -30);
    c.fillStyle = '#3b2a20';
    c.beginPath();
    c.arc(0, -66, 11, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function desenharZonas(destaque: number | null): void {
    for (let z = 0; z < 6; z++) {
      const x0 = telaX(-1 + coluna(z) * (2 / 3));
      const y0 = telaY(linha(z) === 1 ? 1 : 0.5);
      const w = g.gw / 3;
      const h = g.gh / 2;
      c.fillStyle = z === destaque ? 'rgba(255,210,63,0.45)' : 'rgba(255,255,255,0.1)';
      c.fillRect(x0 + 2, y0 + 2, w - 4, h - 4);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 1;
      c.setLineDash([5, 5]);
      c.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
      c.setLineDash([]);
    }
  }

  function desenharRastro(): void {
    if (rastro.length < 2) return;
    c.strokeStyle = 'rgba(255,210,63,0.85)';
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(rastro[0].x, rastro[0].y);
    for (const p of rastro) c.lineTo(p.x, p.y);
    c.stroke();
  }

  /** Posição da bola num chute com curva (bezier quadrática). */
  function trajetoria(alvoX: number, alvoY: number, efeito: number, t: number, alto: boolean) {
    const sx = g.bolaX;
    const sy = g.bolaY;
    const cx = (sx + alvoX) / 2 - (efeito / 100) * g.gw * 0.35;
    const cy = alto ? Math.min(sy, alvoY) - g.gh * 1.2 : (sy + alvoY) / 2;
    const u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * alvoX,
      y: u * u * sy + 2 * u * t * cy + t * t * alvoY,
      escala: 1 - 0.45 * t,
    };
  }

  function quadro(agora: number): void {
    if (acabou) return;
    c.clearRect(0, 0, W, H);
    desenharCenario();

    if (fase.tipo === 'pausa') {
      if (agora >= fase.ate) fase.depois();
    }

    const corMaquina: [string, string] = ['#f97316', '#1b1b1b'];
    const corJogador: [string, string] = [time.cores[0], time.cores[1]];

    switch (fase.tipo) {
      case 'mirar': {
        desenharGoleiro(corMaquina[0], corMaquina[1], null, 0);
        desenharBola(g.bolaX, g.bolaY);
        desenharRastro();
        break;
      }
      case 'chute': {
        const { r, gesto } = fase;
        const dur = r.cavadinha ? DUR_CAVADINHA : DUR_CHUTE;
        const t = Math.min(1, (agora - fase.inicio) / dur);
        const tPulo = (agora - fase.inicio - dur * 0.15) / DUR_PULO;
        desenharGoleiro(corMaquina[0], corMaquina[1], r.zonaGoleiro, tPulo);
        // Bola defendida para na luva do goleiro.
        const destino = r.desfecho === 'defesa' ? centroZona(r.zonaGoleiro) : { x: r.x, y: r.y };
        const p = trajetoria(telaX(destino.x), telaY(destino.y), gesto.efeito, facil(t), r.cavadinha);
        desenharBola(p.x, p.y, p.escala);
        if (t >= 1) fimDoChute(r);
        break;
      }
      case 'corrida': {
        const tc = (agora - fase.inicio) / DUR_CORRIDA;
        // Tempo para reagir depois da corrida: encurta ao longo da semana.
        const janela = 1900 - 700 * dificuldade;
        const mostraDica = tc >= 0.55;
        desenharZonas(fase.zona);
        const tPulo = fase.pulouEm === null ? 0 : (agora - fase.pulouEm) / DUR_PULO;
        desenharGoleiro(corJogador[0], corJogador[1], fase.zona, tPulo);
        desenharBola(g.bolaX, g.bolaY);
        desenharBatedor(tc, mostraDica ? fase.plano.dica : null);
        if (agora - fase.inicio >= DUR_CORRIDA + janela) {
          chuteDaMaquina(fase.zona ?? -1, fase.pulouEm ?? agora);
        }
        break;
      }
      case 'chuteMaquina': {
        const { r } = fase;
        const t = Math.min(1, (agora - fase.inicio) / DUR_CHUTE);
        const tPulo = (agora - fase.pulouEm) / DUR_PULO;
        desenharGoleiro(corJogador[0], corJogador[1], r.zonaGoleiro, Math.max(tPulo, 0));
        const alvo =
          r.desfecho === 'fora'
            ? { x: coluna(r.alvo) === 0 ? -0.7 : coluna(r.alvo) === 2 ? 0.7 : 0.1, y: 1.35 }
            : r.desfecho === 'defesa'
              ? centroZona(r.zonaGoleiro)
              : centroZona(r.alvo);
        const p = trajetoria(telaX(alvo.x), telaY(alvo.y), 0, facil(t), false);
        desenharBatedor(1, null);
        desenharBola(p.x, p.y, p.escala);
        if (t >= 1) fimDaDefesa(r);
        break;
      }
      case 'pausa': {
        const ultimaDefesa = defesas.length === cobrancas.length;
        if (ultimaDefesa && defesas.length) {
          const r = defesas[defesas.length - 1];
          desenharGoleiro(corJogador[0], corJogador[1], r.zonaGoleiro, 1);
        } else if (cobrancas.length) {
          const r = cobrancas[cobrancas.length - 1];
          desenharGoleiro(corMaquina[0], corMaquina[1], r.zonaGoleiro, 1);
          if (r.desfecho === 'gol' || r.desfecho === 'trave') desenharBola(telaX(r.x), telaY(r.y), 0.55);
        }
        break;
      }
    }
    raf = proximoQuadro(quadro);
  }

  // ---------- ligações ----------
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__partida = { semente, dificuldade, cobrancas, defesas, gestosCobranca, gestosDefesa, fase: () => fase.tipo };
  }
  medir();
  atualizarHud();
  comecarCobranca();
  somApito();
  let raf = proximoQuadro(quadro);

  const aoRedimensionar = () => medir();
  window.addEventListener('resize', aoRedimensionar);
  canvas.addEventListener('pointerdown', aoTocar);
  canvas.addEventListener('pointermove', aoMover);
  canvas.addEventListener('pointerup', aoSoltar);
  canvas.addEventListener('pointercancel', () => (rastro = []));
  root.querySelector('.voltar')?.addEventListener('click', () => irPara({ tela: 'inicio' }));
  elMudo.addEventListener('click', () => {
    prefs.set({ mudo: !prefs.get().mudo });
    atualizarHud();
  });

  return () => {
    acabou = true;
    if (usarTimer) clearTimeout(raf);
    else cancelAnimationFrame(raf);
    window.removeEventListener('resize', aoRedimensionar);
  };
}
