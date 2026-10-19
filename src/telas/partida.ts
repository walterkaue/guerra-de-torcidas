// Tela da partida em canvas: alterna cobrança e defesa, 5 de cada.
// Toda decisão de resultado vem do motor puro (jogo/penaltis.ts); aqui é só gesto e desenho.

import { irPara, type Rota } from '../app';
import { corDeTexto, timePorId, TIMES, type Time } from '../dados/times';
import { prefs } from '../estado';
import { sementeNova } from '../jogo/aleatorio';
import { eventoDaCobranca, eventoDaDefesa, eventosDoFim } from '../narrador/lance';
import { criarNarrador } from '../narrador/sessao';
import {
  COBRANCAS,
  RODADAS_EXTRAS_MAX,
  coluna,
  dificuldadePorDia,
  linha,
  normalizarCobranca,
  planejarDefesa,
  precisaDeOutraRodada,
  precisaDeParOuImpar,
  resolverParOuImpar,
  resolverCobranca,
  resolverDefesa,
  totalizar,
  type EscolhaParOuImpar,
  type GestoCobranca,
  type Paridade,
  type ResultadoParOuImpar,
  type PlanoDefesa,
  type ResultadoCobranca,
  type ResultadoDefesa,
} from '../jogo/penaltis';
import { pedirNumeroDoNarrador } from '../jogo/numeroNarrador';
import {
  ErroServidor,
  fecharPartida,
  novaPartida,
  type DesafioRecebido,
  type FechamentoDoServidor,
} from '../servidor/api';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { destravarSom, somApito, somChute, somTorcida } from '../jogo/som';

type Fase =
  | { tipo: 'mirar' }
  | { tipo: 'chute'; inicio: number; r: ResultadoCobranca; gesto: GestoCobranca }
  | { tipo: 'corrida'; inicio: number; plano: PlanoDefesa; zona: number | null; pulouEm: number | null }
  | { tipo: 'chuteMaquina'; inicio: number; r: ResultadoDefesa; pulouEm: number }
  | { tipo: 'pausa'; ate: number; depois: () => void }
  | { tipo: 'parOuImpar' }
  | { tipo: 'preparando' };

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

export const AVISO_SEM_PONTOS = 'Partida sem valer pontos: sem conexão com o placar da torcida.';

export function telaPartida(root: HTMLElement, rota: Rota): () => void {
  const time: Time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  const codigoDesafio = rota.tela === 'partida' ? rota.desafio : undefined;
  // Valores locais (partida sem valer pontos); trocados pelos do servidor quando ele responde.
  let semente = sementeNova();
  let dificuldade = dificuldadePorDia(diaEmBrasilia());
  let partidaId: string | null = null;
  let desafio: DesafioRecebido | null = null;
  let aviso: string | null = null;
  let fechamento: Promise<FechamentoDoServidor> | null = null;
  const narrador = criarNarrador(time, prefs.get().apelido);

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
      <p class="aviso-partida" hidden></p>
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
  let rodada = 0; // 0..4 no tempo normal, 5..9 na morte súbita
  let fase: Fase = { tipo: 'preparando' };
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
      Array.from({ length: Math.max(COBRANCAS, lista.length) }, (_, i) => {
        const r = lista[i];
        const cls = r ? (marcou(r.desfecho) ? 'b-gol' : 'b-erro') : '';
        return `<i class="${cls}"></i>`;
      }).join('');
    root.querySelector('[data-lado="jogador"]')!.innerHTML = bolinhas(cobrancas, (d) => d === 'gol');
    root.querySelector('[data-lado="maquina"]')!.innerHTML = bolinhas(defesas, (d) => d === 'gol');
    elMudo.textContent = prefs.get().mudo ? '🔇' : '🔊';
  }

  function narrar(texto: string | null): void {
    if (!texto) return;
    elNarrador.textContent = texto;
    elNarrador.classList.remove('pulso');
    void elNarrador.offsetWidth;
    elNarrador.classList.add('pulso');
  }

  function instruir(texto: string): void {
    elInstrucao.textContent = texto;
  }

  // ---------- fluxo ----------
  const golsJogador = () => cobrancas.filter((r) => r.desfecho === 'gol').length;
  const golsMaquina = () => defesas.filter((r) => r.desfecho === 'gol').length;

  /** Última cobrança do tempo normal com a disputa em aberto (na morte súbita só a defesa). */
  function cobrancaDecisiva(): boolean {
    if (rodada !== COBRANCAS - 1) return false;
    const j = golsJogador();
    const m = golsMaquina();
    return !(j + 1 < m || j > m + 1);
  }

  /** Defesa que pode decidir: depois dela, ou acaba, ou empata. */
  function defesaDecisiva(): boolean {
    if (rodada < COBRANCAS - 1) return false;
    const dif = golsJogador() - golsMaquina();
    return dif === 0 || dif === 1;
  }

  function comecarCobranca(): void {
    fase = { tipo: 'mirar' };
    rastro = [];
    const extra = rodada - COBRANCAS + 1;
    instruir(
      rodada === 0
        ? 'Arraste da bola pro gol. Mais longo = mais forte. Curve no fim para dar efeito.'
        : extra > 0
          ? `${extra === 1 ? 'Empatou! ' : ''}Morte súbita: rodada extra ${extra} de ${RODADAS_EXTRAS_MAX}.`
          : `Cobrança ${rodada + 1} de ${COBRANCAS}. Arraste para chutar.`,
    );
    if (rodada === 0) narrar(narrador.falar('abertura'));
    else if (rodada === COBRANCAS) narrar(narrador.falar('morte_subita', { placar: placarAtual() }));
    else if (cobrancaDecisiva()) narrar(narrador.falar('decisiva'));
  }

  function comecarDefesa(): void {
    const plano = planejarDefesa(semente, rodada, dificuldade, desafio?.cobrancas[rodada]);
    fase = { tipo: 'corrida', inicio: performance.now(), plano, zona: null, pulouEm: null };
    instruir('Sua vez de defender! Olhe o pé de apoio e toque onde pular.');
    if (defesaDecisiva()) narrar(narrador.falar('decisiva'));
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
    narrar(narrador.falar(eventoDaCobranca(r)));
    somTorcida(r.desfecho === 'gol' ? 'festa' : 'uuuh');
    depoisDe(1500, comecarDefesa);
  }

  function chuteDaMaquina(zona: number, pulouEm: number): void {
    const r = resolverDefesa(semente, rodada, zona, dificuldade, desafio?.cobrancas[rodada]);
    gestosDefesa.push(zona);
    fase = { tipo: 'chuteMaquina', inicio: performance.now(), r, pulouEm };
    somChute();
  }

  function fimDaDefesa(r: ResultadoDefesa): void {
    defesas.push(r);
    atualizarHud();
    const evento = eventoDaDefesa(r);
    if (evento) narrar(narrador.falar(evento));
    // O banco ainda não tem frases para o batedor da máquina errar: fica só o aviso.
    else instruir('O batedor isolou! Nem precisou pular.');
    somTorcida(r.desfecho === 'defesa' ? 'festa' : 'uuuh');
    rodada++;
    if (precisaDeOutraRodada(cobrancas, defesas)) depoisDe(1500, comecarCobranca);
    else if (precisaDeParOuImpar(cobrancas, defesas)) depoisDe(1600, abrirParOuImpar);
    else depoisDe(1600, () => void encerrar());
  }

  const placarAtual = () => `${golsJogador()} x ${golsMaquina()}`;

  /** Morte súbita terminou empatada: par ou ímpar contra o narrador. */
  function abrirParOuImpar(): void {
    fase = { tipo: 'parOuImpar' };
    instruir('');
    const painel = document.createElement('section');
    painel.className = 'par-ou-impar';
    painel.innerHTML = `
      <h2>Par ou ímpar</h2>
      <div class="poi-paridade" role="radiogroup" aria-label="Par ou ímpar">
        <button type="button" role="radio" aria-checked="false" data-paridade="par">Par</button>
        <button type="button" role="radio" aria-checked="false" data-paridade="impar">Ímpar</button>
      </div>
      <p class="poi-rotulo">Seu número</p>
      <div class="poi-numeros" role="radiogroup" aria-label="Seu número">
        ${[0, 1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" data-numero="${n}">${n}</button>`).join('')}
      </div>
      <button type="button" class="botao" data-acao="mostrar" disabled>Mostra, narrador!</button>
      <p class="poi-status" aria-live="polite"></p>`;
    root.querySelector('.partida')!.append(painel);
    narrar(narrador.falar('par_ou_impar_escolha'));

    let paridade: Paridade | null = null;
    let numero: number | null = null;
    const botao = painel.querySelector<HTMLButtonElement>('[data-acao="mostrar"]')!;
    const status = painel.querySelector<HTMLElement>('.poi-status')!;
    const marcar = (sel: string, alvo: Element) =>
      painel.querySelectorAll(sel).forEach((b) => b.setAttribute('aria-checked', String(b === alvo)));

    painel.querySelectorAll<HTMLButtonElement>('[data-paridade]').forEach((b) =>
      b.addEventListener('click', () => {
        paridade = b.dataset.paridade as Paridade;
        marcar('[data-paridade]', b);
        botao.disabled = numero === null;
      }),
    );
    painel.querySelectorAll<HTMLButtonElement>('[data-numero]').forEach((b) =>
      b.addEventListener('click', () => {
        numero = Number(b.dataset.numero);
        marcar('[data-numero]', b);
        botao.disabled = paridade === null;
      }),
    );

    botao.addEventListener('click', async () => {
      if (paridade === null || numero === null) return;
      const escolha: EscolhaParOuImpar = { escolha: paridade, numero };
      painel.querySelectorAll('button').forEach((b) => (b.disabled = true));
      status.textContent = 'O narrador tá pensando…';
      painel.classList.add('pensando');
      const numeroNarrador = await numeroDoNarrador(escolha);
      if (acabou) return;
      const r = resolverParOuImpar(escolha, numeroNarrador);
      painel.classList.remove('pensando');
      status.innerHTML = `Narrador: <strong>${numeroNarrador}</strong> · soma <strong>${r.soma}</strong>, ${r.soma % 2 === 0 ? 'par' : 'ímpar'}`;
      somTorcida(r.ganhou ? 'festa' : 'uuuh');
      setTimeout(() => void encerrar(escolha, r), 1800);
    });
  }

  // ---------- servidor ----------
  function mostrarAviso(texto: string): void {
    aviso = texto;
    const el = root.querySelector<HTMLElement>('.aviso-partida')!;
    el.textContent = texto;
    el.hidden = false;
  }

  /** Pede a semente ao servidor. Sem resposta, a partida segue local e sem valer pontos. */
  async function preparar(): Promise<void> {
    instruir('Preparando a partida…');
    try {
      // Time e apelido precisam estar no servidor; sessão nova (aparelho limpo) regrava.
      const pedir = async (codigo?: string) => {
        await sincronizarTorcedor();
        try {
          return await novaPartida(codigo);
        } catch (e) {
          if (!(e instanceof ErroServidor) || e.codigo !== 'sem_time') throw e;
          await sincronizarTorcedor(true);
          return novaPartida(codigo);
        }
      };
      let p;
      try {
        p = await pedir(codigoDesafio);
      } catch (e) {
        if (!(e instanceof ErroServidor) || !codigoDesafio || !['proprio_desafio', 'desafio_nao_encontrado'].includes(e.codigo)) throw e;
        // Link do próprio desafio ou link quebrado: vira partida normal, valendo.
        p = await pedir();
      }
      semente = p.semente;
      dificuldade = p.dificuldade;
      partidaId = p.partidaId;
      desafio = p.desafio;
      if (desafio) {
        // O convite já foi aceito: tira o ?d= do endereço para não oferecer de novo.
        history.replaceState(null, '', location.pathname);
        root.querySelector('.placar-jogo .lado:last-child .sigla')!.textContent = desafio.apelido ?? 'Desafio';
      }
    } catch (e) {
      console.warn('Partida sem valer pontos:', e instanceof ErroServidor ? e.codigo : e);
      mostrarAviso(e instanceof ErroServidor && e.codigo === 'muitas_partidas'
        ? 'Calma! Muitas partidas em 1 minuto: esta não vale pontos.'
        : AVISO_SEM_PONTOS);
    }
    if (!acabou) comecarCobranca();
  }

  const gestosAtuais = (escolha?: EscolhaParOuImpar) => ({
    cobrancas: gestosCobranca,
    defesas: gestosDefesa,
    ...(escolha ? { parOuImpar: escolha } : {}),
  });

  /** Fecha no servidor uma vez só (o par ou ímpar e o fim da partida usam a mesma resposta). */
  function fecharNoServidor(escolha?: EscolhaParOuImpar): Promise<FechamentoDoServidor> | null {
    if (!partidaId || aviso) return null;
    fechamento ??= fecharPartida(partidaId, gestosAtuais(escolha));
    return fechamento;
  }

  /** Número do narrador: do servidor (segredo que o celular não conhece); sem servidor, local. */
  async function numeroDoNarrador(escolha: EscolhaParOuImpar): Promise<number> {
    const fechando = fecharNoServidor(escolha);
    if (fechando) {
      try {
        const r = await fechando;
        if (r.numeroNarrador !== null) return r.numeroNarrador;
      } catch {
        fechamento = null;
        mostrarAviso(AVISO_SEM_PONTOS);
      }
    }
    return pedirNumeroDoNarrador(escolha);
  }

  async function encerrar(escolha?: EscolhaParOuImpar, parOuImpar?: ResultadoParOuImpar): Promise<void> {
    acabou = true;
    let resultado = totalizar(cobrancas, defesas, parOuImpar);
    let servidor: FechamentoDoServidor | undefined;
    const fechando = fecharNoServidor(escolha);
    if (fechando) {
      instruir('Conferindo o placar com a torcida…');
      try {
        servidor = await fechando;
        // Quem manda é o servidor (deve dar igual ao que o celular calculou).
        resultado = servidor.resultado;
      } catch {
        aviso = 'Não deu pra registrar: esta partida ficou sem valer pontos.';
      }
    }
    somApito(true);
    irPara({
      tela: 'resultado',
      dados: {
        timeId: time.id,
        semente,
        dificuldade,
        gestos: gestosAtuais(escolha),
        numeroNarrador: parOuImpar?.numeroNarrador,
        valendo: !!servidor,
        aviso: aviso ?? undefined,
        servidor,
        desafio: desafio ?? undefined,
        resultado,
        frasesFinais: eventosDoFim(resultado)
          .map((ev) =>
            narrador.falar(ev, {
              placar: `${resultado.golsJogador} x ${resultado.golsMaquina}`,
              pontos: resultado.pontos.total,
              numero: parOuImpar?.numeroNarrador,
            }),
          )
          .filter((f): f is string => !!f),
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
      case 'preparando':
      case 'parOuImpar': {
        desenharGoleiro(corJogador[0], corJogador[1], null, 0);
        desenharBola(g.bolaX, g.bolaY);
        break;
      }
    }
    raf = proximoQuadro(quadro);
  }

  // ---------- ligações ----------
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__partida = { semente, dificuldade, cobrancas, defesas, gestosCobranca, gestosDefesa, fase: () => fase.tipo, abrirParOuImpar: () => abrirParOuImpar() };
  }
  medir();
  atualizarHud();
  void preparar();
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
