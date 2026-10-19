// Tela da partida em canvas: alterna cobrança e defesa, 5 de cada.
// Toda decisão de resultado vem do motor puro (jogo/penaltis.ts); aqui é só gesto e desenho.

import { esc, irPara, type Rota } from '../app';
import { corDeTexto, proTime, timePorId, TIMES, type Time } from '../dados/times';
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
import {
  GOLEIRO,
  desenharBatedor,
  desenharGoleiro,
  entre,
  poseChute,
  poseCorrida,
  poseGoleiroEsperando,
  poseParado,
  type Pose,
  type Uniforme,
} from './bonecos';

type Fase =
  | { tipo: 'mirar' }
  | { tipo: 'chute'; inicio: number; r: ResultadoCobranca; gesto: GestoCobranca }
  | { tipo: 'corrida'; inicio: number; plano: PlanoDefesa; zona: number | null; pulouEm: number | null }
  | { tipo: 'chuteMaquina'; inicio: number; r: ResultadoDefesa; pulouEm: number }
  | { tipo: 'pausa'; ate: number; depois: () => void }
  | { tipo: 'parOuImpar' }
  | { tipo: 'preparando' };

/** A máquina joga de laranja e preto: nenhum time da lista usa essa dupla. */
const UNIFORME_MAQUINA: Uniforme = { camisa: '#f97316', detalhe: '#1b1b1b' };

/** Dia da semana no horário de Brasília (a temporada zera na segunda, 00h BRT). */
function diaEmBrasilia(): number {
  const nome = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date());
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(nome);
}

// Em dev, ?relogio troca o requestAnimationFrame por timer (para testes com a aba em segundo plano).
// ?lento=8 deixa tudo 8 vezes mais lento (para conferir a animação quadro a quadro).
const parametros = new URLSearchParams(location.search);
const usarTimer = import.meta.env.DEV && parametros.has('relogio');
const escalaTempo = import.meta.env.DEV ? Math.max(1, Number(parametros.get('lento')) || 1) : 1;
const relogio = () => performance.now() / escalaTempo;
const proximoQuadro = (fn: (t: number) => void): number =>
  usarTimer ? window.setTimeout(() => fn(relogio()), 16) : requestAnimationFrame(() => fn(relogio()));

const DUR_CHUTE = 650;
const DUR_CAVADINHA = 1050;
const DUR_PULO = 420;
const DUR_CORRIDA = 900;
/** Do início do chute até o pé encontrar a bola (a bola só sai depois). */
const DUR_BATIDA = 190;

// Efeitos (docs/visual.md, seção 4): tudo curto; só o grito do narrador passa de 400 ms.
const DUR_TREMIDA = 120;
const DUR_REDE = 400;
const DUR_OLA = 400;
const DUR_PONTOS = 1100;
/** Câmera lenta da cavadinha: 0,5 s a mais no trecho final, antes de a bola entrar. */
const DUR_CAMERA_LENTA = 500;

// Perspectiva de TV: câmera atrás do batedor com teleobjetiva. As linhas que vão para o gol
// convergem num ponto de fuga acima da tela. Medidas em metros, só para o desenho.
const PROF_CAMERA = 40;
const DIST_MARCA = 11;
/** Meia largura da pequena área, estilizada (a real tem 9,16 m) para caber na tela. */
const MEIA_PEQUENA_AREA = 3.75;
const PROF_PEQUENA_AREA = 5.5;
const PROF_REDE = 2;

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
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paraTime = proTime(time) ?? 'pra sua torcida';

  root.innerHTML = `
    <main class="partida" style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
      <header class="hud">
        <button class="voltar" type="button" aria-label="Sair da partida">‹</button>
        <div class="placar-jogo">
          <div class="lado lado-jogador"><span class="sigla">${esc(time.nome)}</span><span class="bolinhas" data-lado="jogador"></span></div>
          <strong class="gols"><span data-gols="jogador">0</span><em>x</em><span data-gols="maquina">0</span></strong>
          <div class="lado lado-maquina"><span class="sigla">Máquina</span><span class="bolinhas" data-lado="maquina"></span></div>
        </div>
        <button class="ajuda" type="button" aria-label="Como jogar">?</button>
        <button class="mudo" type="button" aria-label="Som"></button>
      </header>
      <canvas class="campo-jogo"></canvas>
      <p class="instrucao" aria-live="polite"></p>
      <div class="grito" aria-live="assertive">
        <p class="grito-frase"></p>
        <p class="grito-sub rotulo"></p>
      </div>
      <p class="aviso-partida" hidden></p>
      <section class="como-jogar" role="dialog" aria-modal="true" aria-labelledby="cj-titulo" hidden>
        <div class="cj-caixa">
          <p class="rotulo cj-faixa faixa-tv">Antes do apito</p>
          <h2 id="cj-titulo" class="cj-titulo">Como jogar</h2>
          <ul class="cj-passos">
            <li><span class="cj-icone" aria-hidden="true">⚽</span><p><strong>Cobrar.</strong> Arraste o dedo da bola na direção do gol. Arraste longo = chute forte; forte demais vai por cima.</p></li>
            <li><span class="cj-icone" aria-hidden="true">↪</span><p><strong>Efeito.</strong> Curve o fim do arraste pra bola fazer curva. Arraste curtinho e reto é cavadinha.</p></li>
            <li><span class="cj-icone" aria-hidden="true">🧤</span><p><strong>Defender.</strong> O batedor corre. Olhe o pé de apoio, em amarelo, e toque no gol onde pular. Ele nem sempre é honesto!</p></li>
            <li><span class="cj-icone" aria-hidden="true">🏆</span><p><strong>Pontos ${esc(paraTime)}.</strong> Gol 10, ângulo +5, cavadinha +10, defesa 10, vitória +20, 5 de 5 +25.</p></li>
          </ul>
          <p class="cj-nota">5 cobranças e 5 defesas, alternadas. Empatou? Morte súbita.</p>
          <label class="cj-check"><input type="checkbox" data-cj-pular> Não exibir novamente</label>
          <button class="botao" type="button" data-cj-fechar>Bora jogar!</button>
        </div>
      </section>
    </main>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const c = canvas.getContext('2d')!;
  const elInstrucao = root.querySelector<HTMLElement>('.instrucao')!;
  const elGrito = root.querySelector<HTMLElement>('.grito')!;
  const elGritoFrase = root.querySelector<HTMLElement>('.grito-frase')!;
  const elGritoSub = root.querySelector<HTMLElement>('.grito-sub')!;
  const elMudo = root.querySelector<HTMLButtonElement>('.mudo')!;
  const elComoJogar = root.querySelector<HTMLElement>('.como-jogar')!;

  const cobrancas: ResultadoCobranca[] = [];
  const defesas: ResultadoDefesa[] = [];
  const gestosCobranca: GestoCobranca[] = [];
  const gestosDefesa: number[] = [];
  let rodada = 0; // 0..4 no tempo normal, 5..9 na morte súbita
  let fase: Fase = { tipo: 'preparando' };
  let rastro: { x: number; y: number }[] = [];
  let acabou = false;

  const uniformeJogador: Uniforme = { camisa: time.cores[0], detalhe: time.cores[1] };
  /** Quem bate contra você: a máquina ou, no desafio por link, a camiseta do time de quem desafiou. */
  let uniformeBatedor: Uniforme = UNIFORME_MAQUINA;

  // ---------- efeitos ----------
  const efeitos = {
    tremida: -Infinity,
    ola: -Infinity,
    rede: { inicio: -Infinity, x: 0, y: 0 },
    pontos: [] as { inicio: number; x: number; y: number; texto: string }[],
  };

  // ---------- geometria ----------
  let W = 0;
  let H = 0;
  const g = { gx: 0, gy: 0, gw: 0, gh: 0, chao: 0, bolaX: 0, bolaY: 0, raio: 0, fugaY: 0, escM: 0 };

  function medir(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ret = canvas.getBoundingClientRect();
    W = ret.width;
    H = ret.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Gol maior e mais baixo que antes; a bola grande perto do dedo.
    g.gw = Math.min(W * 0.8, 440);
    g.gh = g.gw * 0.4;
    g.gx = (W - g.gw) / 2;
    g.gy = Math.max(H * 0.17, 64);
    g.chao = g.gy + g.gh;
    g.bolaX = W / 2;
    g.bolaY = H * 0.82;
    g.raio = Math.max(16, Math.min(30, W * 0.058));
    g.escM = g.gw / 7.32;
    // Ponto de fuga escolhido para a marca do pênalti (11 m) cair exatamente na bola.
    g.fugaY = g.chao - (g.bolaY - g.chao) / (fator(DIST_MARCA) - 1);
    prepararCenario(dpr);
  }

  /** Escala de um ponto do chão a z metros da linha do gol (z positivo vem para a câmera). */
  const fator = (z: number) => PROF_CAMERA / (PROF_CAMERA - z);
  const chaoY = (z: number) => g.fugaY + (g.chao - g.fugaY) * fator(z);
  const chaoX = (xm: number, z: number) => W / 2 + xm * g.escM * fator(z);
  /** Fundo do gol: o quadro da frente encolhido em direção ao ponto de fuga. */
  const fundo = (x: number, y: number) => {
    const k = fator(-PROF_REDE);
    return { x: W / 2 + (x - W / 2) * k, y: g.fugaY + (y - g.fugaY) * k };
  };

  /** Coordenadas do motor (x -1..1, y 0..1) para a tela. */
  const telaX = (x: number) => g.gx + ((x + 1) / 2) * g.gw;
  const telaY = (y: number) => g.gy + g.gh - y * g.gh;
  const centroZona = (z: number) => ({ x: [-2 / 3, 0, 2 / 3][coluna(z)], y: linha(z) === 1 ? 0.72 : 0.25 });

  // ---------- HUD ----------
  function atualizarHud(): void {
    root.querySelector('[data-gols="jogador"]')!.textContent = String(golsJogador());
    root.querySelector('[data-gols="maquina"]')!.textContent = String(golsMaquina());
    // Bolinhas de TV: verde = gol, preta = erro, amarela = gol no ângulo ou de cavadinha.
    const bolinhas = (classes: string[]) =>
      Array.from({ length: Math.max(COBRANCAS, classes.length) }, (_, i) => `<i class="${classes[i] ?? ''}"></i>`).join('');
    root.querySelector('[data-lado="jogador"]')!.innerHTML = bolinhas(
      cobrancas.map((r) => (r.desfecho !== 'gol' ? 'b-erro' : r.angulo || r.cavadinha ? 'b-ouro' : 'b-gol')),
    );
    root.querySelector('[data-lado="maquina"]')!.innerHTML = bolinhas(
      defesas.map((r) => (r.desfecho === 'gol' ? 'b-gol' : 'b-erro')),
    );
    elMudo.textContent = prefs.get().mudo ? '🔇' : '🔊';
  }

  /** Grito do narrador como adesivo na cor do time, com a frase complementar logo abaixo. */
  function narrar(texto: string | null, sub?: string): void {
    if (!texto && !sub) return;
    elGritoFrase.textContent = texto ?? sub ?? '';
    elGritoSub.textContent = texto ? (sub ?? '') : '';
    elGritoSub.hidden = !texto || !sub;
    elGrito.classList.remove('pulso');
    void elGrito.offsetWidth;
    elGrito.classList.add('pulso');
  }

  function instruir(texto: string): void {
    elInstrucao.textContent = texto;
    elInstrucao.hidden = !texto;
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
    fase = { tipo: 'corrida', inicio: relogio(), plano, zona: null, pulouEm: null };
    instruir('Sua vez de defender! Olhe o pé de apoio e toque onde pular.');
    if (defesaDecisiva()) narrar(narrador.falar('decisiva'));
  }

  function depoisDe(ms: number, fn: () => void): void {
    fase = { tipo: 'pausa', ate: relogio() + ms, depois: fn };
  }

  function chutar(gesto: GestoCobranca): void {
    const gq = normalizarCobranca(gesto);
    const r = resolverCobranca(semente, rodada, gq, dificuldade);
    gestosCobranca.push(gq);
    fase = { tipo: 'chute', inicio: relogio(), r, gesto: gq };
    instruir('');
    somChute();
  }

  /** Comemoração de gol ou defesa: ola, "+pontos" subindo e, no gol, tremida, rede e vibração. */
  function comemorar(x: number, y: number, pontos: number, gol: boolean): void {
    const agora = relogio();
    if (!reduzido) efeitos.ola = agora;
    if (pontos > 0) efeitos.pontos.push({ inicio: agora, x, y, texto: `+${pontos}` });
    if (!gol) return;
    efeitos.rede = { inicio: agora, x, y };
    if (!reduzido) efeitos.tremida = agora;
    try {
      navigator.vibrate?.(reduzido ? 40 : [60, 40, 90]);
    } catch {
      // sem vibração (iPhone, desktop): segue sem
    }
  }

  function legendaDaCobranca(r: ResultadoCobranca): string {
    if (r.desfecho === 'gol') {
      const tipo = r.cavadinha ? 'Cavadinha' : r.angulo ? 'No ângulo' : 'Gol';
      return `${tipo} · +${r.pontos}`;
    }
    return r.desfecho === 'defesa' ? 'O goleiro pegou' : r.desfecho === 'trave' ? 'Na trave' : 'Pra fora';
  }

  function fimDoChute(r: ResultadoCobranca): void {
    cobrancas.push(r);
    atualizarHud();
    narrar(narrador.falar(eventoDaCobranca(r)), legendaDaCobranca(r));
    if (r.desfecho === 'gol') comemorar(telaX(r.x), telaY(r.y), r.pontos, true);
    somTorcida(r.desfecho === 'gol' ? 'festa' : 'uuuh');
    depoisDe(1500, comecarDefesa);
  }

  function chuteDaMaquina(zona: number, pulouEm: number): void {
    const r = resolverDefesa(semente, rodada, zona, dificuldade, desafio?.cobrancas[rodada]);
    gestosDefesa.push(zona);
    fase = { tipo: 'chuteMaquina', inicio: relogio(), r, pulouEm };
    instruir('');
    somChute();
  }

  function fimDaDefesa(r: ResultadoDefesa): void {
    defesas.push(r);
    atualizarHud();
    const evento = eventoDaDefesa(r);
    const legenda =
      r.desfecho === 'defesa' ? (r.pontos ? `Defesa · +${r.pontos}` : 'Defesa') : r.desfecho === 'gol' ? 'Gol do adversário' : 'Pra fora';
    // O banco ainda não tem frases para o batedor da máquina errar: fica só a legenda.
    narrar(evento ? narrador.falar(evento) : 'O batedor isolou! Nem precisou pular.', legenda);
    if (r.desfecho === 'defesa') {
      const z = centroZona(r.zonaGoleiro);
      comemorar(telaX(z.x), telaY(z.y), r.pontos, false);
    } else if (r.desfecho === 'gol') {
      const z = centroZona(r.alvo);
      efeitos.rede = { inicio: relogio(), x: telaX(z.x), y: telaY(z.y) };
    }
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

  // ---------- como jogar ----------
  let servidorPronto = false;
  let jogadorPronto = !!prefs.get().semComoJogar;

  /** O apito só sai quando o servidor respondeu e o jogador fechou o "Como jogar". */
  function talvezComecar(): void {
    if (!servidorPronto || !jogadorPronto || acabou || fase.tipo !== 'preparando') return;
    somApito();
    comecarCobranca();
  }

  function abrirComoJogar(): void {
    root.querySelector<HTMLInputElement>('[data-cj-pular]')!.checked = !!prefs.get().semComoJogar;
    elComoJogar.hidden = false;
    root.querySelector<HTMLButtonElement>('[data-cj-fechar]')!.focus();
  }

  function fecharComoJogar(): void {
    destravarSom();
    prefs.set({ semComoJogar: root.querySelector<HTMLInputElement>('[data-cj-pular]')!.checked });
    elComoJogar.hidden = true;
    jogadorPronto = true;
    talvezComecar();
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
        const t = timePorId(desafio.timeId);
        if (t && t.id !== time.id) uniformeBatedor = { camisa: t.cores[0], detalhe: t.cores[1] };
      }
    } catch (e) {
      console.warn('Partida sem valer pontos:', e instanceof ErroServidor ? e.codigo : e);
      mostrarAviso(e instanceof ErroServidor && e.codigo === 'muitas_partidas'
        ? 'Calma! Muitas partidas em 1 minuto: esta não vale pontos.'
        : AVISO_SEM_PONTOS);
    }
    servidorPronto = true;
    talvezComecar();
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
      fase.pulouEm = relogio();
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
    const forca = (comp / distGol) * 70;

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
  // O que não mexe (grama, linhas, rede, torcida) vai para canvas à parte e é só copiado a cada
  // quadro; ao vivo ficam bonecos, bola, traves e efeitos. Assim o jogo segura 60 quadros por segundo.
  const facil = (t: number) => 1 - (1 - t) * (1 - t);
  const limitar01 = (t: number) => Math.max(0, Math.min(1, t));
  const fimArquibancada = () => g.gy + g.gh * 0.42;

  function novoCanvas(dpr: number, w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(w * dpr));
    off.height = Math.max(1, Math.round(h * dpr));
    const o = off.getContext('2d')!;
    o.scale(dpr, dpr);
    return [off, o];
  }

  /** Sorteio fixo por posição (a torcida não pode "piscar" entre os quadros). */
  const hash = (a: number, b: number) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  /** Lugares da arquibancada atrás do gol (posição, cor e quem segura bandeira). */
  function lugares(): { x: number; y: number; cor: string; r: number; bandeira: boolean; h: number }[] {
    const lista = [];
    const fim = fimArquibancada() - 12;
    const neutros = ['#2c4a37', '#3a3f4a', '#4a3a2e'];
    let fila = 0;
    for (let y = 9; y < fim - 4; y += 10, fila++) {
      const r = 2.8 + (y / fim) * 1.6;
      for (let x = fila % 2 ? 3 : 9; x < W + 6; x += 11) {
        const h = hash(x, y);
        const cor = h < 0.42 ? time.cores[0] : h < 0.78 ? time.cores[1] : neutros[Math.floor(h * 30) % 3];
        lista.push({ x: x + (h - 0.5) * 3, y, r, cor, bandeira: h > 0.965, h });
      }
    }
    return lista;
  }

  function desenharTorcedor(o: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string, h: number, levantou = 0, quadroTorcida = 0, bandeira = false): void {
    // Cada torcedor balança no seu ritmo: 3 quadros de animação, sorteados por pessoa.
    const balanco = Math.sin((quadroTorcida + h * 3) * ((Math.PI * 2) / 3)) * (h > 0.5 ? 1.4 : 0.6);
    const dy = -levantou * r * 2.2 + balanco;
    o.fillStyle = cor;
    o.beginPath();
    o.ellipse(x, y + dy + r * 1.5, r * 1.3, r * 1.05, 0, Math.PI, 0);
    o.fill();
    o.fillStyle = h > 0.6 ? '#3a2a20' : h > 0.3 ? '#6b4a33' : '#8a5f40';
    o.beginPath();
    o.arc(x, y + dy, r * 0.8, 0, Math.PI * 2);
    o.fill();
    const bracos = levantou > 0.3 || (h > 0.88 && quadroTorcida % 3 !== Math.floor(h * 9) % 3);
    if (bracos) {
      o.strokeStyle = cor;
      o.lineWidth = r * 0.6;
      o.beginPath();
      o.moveTo(x - r, y + dy + r * 0.6);
      o.lineTo(x - r * 1.5, y + dy - r * 1.7);
      o.moveTo(x + r, y + dy + r * 0.6);
      o.lineTo(x + r * 1.5, y + dy - r * 1.7);
      o.stroke();
    }
    if (bandeira) {
      // Bandeira lisa nas 2 cores do time, tremulando.
      const onda = Math.sin(quadroTorcida * 2.1 + h * 10) * 3;
      o.strokeStyle = '#ddd';
      o.lineWidth = 1;
      o.beginPath();
      o.moveTo(x + r, y + dy);
      o.lineTo(x + r, y + dy - 22);
      o.stroke();
      o.fillStyle = time.cores[0];
      o.beginPath();
      o.moveTo(x + r, y + dy - 22);
      o.quadraticCurveTo(x + r + 9, y + dy - 22 + onda, x + r + 18, y + dy - 21);
      o.lineTo(x + r + 18, y + dy - 10);
      o.quadraticCurveTo(x + r + 9, y + dy - 11 + onda, x + r, y + dy - 11);
      o.fill();
      o.fillStyle = time.cores[1];
      o.fillRect(x + r, y + dy - 17 + onda * 0.3, 18, 2.5);
    }
  }

  const QUADROS_TORCIDA = 3;
  let torcida: HTMLCanvasElement[] = [];
  let campo: HTMLCanvasElement | null = null;
  let rede: HTMLCanvasElement | null = null;

  function prepararCenario(dpr: number): void {
    const fim = fimArquibancada();
    const gente = lugares();
    torcida = Array.from({ length: QUADROS_TORCIDA }, (_, q) => {
      const [off, o] = novoCanvas(dpr, W, fim);
      fundoDaArquibancada(o, fim);
      for (const l of gente) desenharTorcedor(o, l.x, l.y, l.r, l.cor, l.h, 0, q, l.bandeira);
      placas(o, fim);
      return off;
    });
    let o: CanvasRenderingContext2D;
    [campo, o] = novoCanvas(dpr, W, H);
    desenharGramado(o);
    [rede, o] = novoCanvas(dpr, W, H);
    desenharRede(o, null);
  }

  function fundoDaArquibancada(o: CanvasRenderingContext2D, fim: number): void {
    const grad = o.createLinearGradient(0, 0, 0, fim);
    grad.addColorStop(0, '#04130a');
    grad.addColorStop(1, '#0d2b18');
    o.fillStyle = grad;
    o.fillRect(0, 0, W, fim);
    // Degraus da arquibancada.
    o.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 14; y < fim - 12; y += 10) o.fillRect(0, y, W, 1);
  }

  /** Placas lisas de beira de campo nas cores do time (sem marca, sem texto). */
  function placas(o: CanvasRenderingContext2D, fim: number): void {
    const alt = 12;
    const y = fim - alt;
    o.fillStyle = '#0a0a0a';
    o.fillRect(0, y - 1, W, alt + 1);
    const larg = 64;
    for (let x = 0, i = 0; x < W; x += larg, i++) {
      const grad = o.createLinearGradient(0, y, 0, y + alt);
      const cor = i % 2 ? time.cores[0] : time.cores[1];
      grad.addColorStop(0, cor);
      grad.addColorStop(1, 'rgba(0,0,0,0.35)');
      o.fillStyle = cor;
      o.fillRect(x + 1, y, larg - 2, alt);
      o.fillStyle = grad;
      o.fillRect(x + 1, y, larg - 2, alt);
    }
  }

  function desenharArquibancada(agora: number): void {
    const fim = fimArquibancada();
    const t = (agora - efeitos.ola) / DUR_OLA;
    const q = Math.floor(agora / 170) % QUADROS_TORCIDA;
    if (t < 0 || t > 1.4) {
      if (torcida[q]) c.drawImage(torcida[q], 0, 0, W, fim);
      return;
    }
    // Ola: a onda atravessa da esquerda para a direita e cada torcedor levanta por um instante.
    fundoDaArquibancada(c, fim);
    const largura = 0.3;
    const frente = t * (1 + largura * 2) - largura;
    for (const l of lugares()) {
      const d = Math.abs(l.x / W - frente) / largura;
      const lev = d < 1 ? Math.sin((1 - d) * (Math.PI / 2)) : 0;
      desenharTorcedor(c, l.x, l.y, l.r, l.cor, l.h, lev, q, l.bandeira);
    }
    placas(c, fim);
  }

  function desenharGramado(o: CanvasRenderingContext2D): void {
    const topo = fimArquibancada();
    o.fillStyle = '#0f4a26';
    o.fillRect(0, topo, W, H - topo);
    // Faixas do corte da grama, cada vez mais altas perto da câmera.
    for (let z = -12; chaoY(z) < H; z += 2.75) {
      const y0 = Math.max(topo, chaoY(z));
      const y1 = Math.min(H, chaoY(z + 2.75));
      if (y1 <= topo) continue;
      if (Math.round(z / 2.75) % 2 === 0) {
        o.fillStyle = '#145a2f';
        o.fillRect(0, y0, W, y1 - y0);
      }
    }
    // Textura: tufos claros e escuros, menores ao fundo.
    for (let i = 0; i < 2600; i++) {
      const y = topo + hash(i, 1) ** 1.4 * (H - topo);
      const x = hash(i, 2) * W;
      const k = 0.5 + ((y - topo) / (H - topo)) * 1.6;
      o.fillStyle = hash(i, 3) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.09)';
      o.fillRect(x, y, 1.4 * k, 2.4 * k);
    }
    // Sombra perto da arquibancada e luz no meio (refletor).
    const sombra = o.createLinearGradient(0, topo, 0, topo + 50);
    sombra.addColorStop(0, 'rgba(0,0,0,0.45)');
    sombra.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = sombra;
    o.fillRect(0, topo, W, 50);
    const luz = o.createRadialGradient(W / 2, g.bolaY - H * 0.15, 10, W / 2, g.bolaY - H * 0.15, H * 0.6);
    luz.addColorStop(0, 'rgba(255,255,220,0.07)');
    luz.addColorStop(1, 'rgba(0,0,0,0.22)');
    o.fillStyle = luz;
    o.fillRect(0, topo, W, H - topo);

    // Linhas: linha do gol, pequena área (laterais convergindo para o gol) e marca do pênalti.
    o.strokeStyle = 'rgba(245,245,240,0.8)';
    o.lineJoin = 'miter';
    o.lineWidth = 2.5;
    o.beginPath();
    o.moveTo(0, g.chao);
    o.lineTo(W, g.chao);
    o.moveTo(chaoX(-MEIA_PEQUENA_AREA, 0), g.chao);
    o.lineTo(chaoX(-MEIA_PEQUENA_AREA, PROF_PEQUENA_AREA), chaoY(PROF_PEQUENA_AREA));
    o.lineTo(chaoX(MEIA_PEQUENA_AREA, PROF_PEQUENA_AREA), chaoY(PROF_PEQUENA_AREA));
    o.lineTo(chaoX(MEIA_PEQUENA_AREA, 0), g.chao);
    o.stroke();
    // Laterais da grande área: entram pelos cantos de baixo, mais grossas perto da câmera.
    o.lineWidth = 3.5;
    o.beginPath();
    for (const lado of [-1, 1]) {
      const xm = lado * MEIA_PEQUENA_AREA * 1.95;
      o.moveTo(chaoX(xm, 6), chaoY(6));
      o.lineTo(chaoX(xm, 16), chaoY(16));
    }
    o.stroke();
    o.fillStyle = 'rgba(245,245,240,0.85)';
    o.beginPath();
    o.ellipse(g.bolaX, g.bolaY + g.raio * 0.55, g.raio * 0.6, g.raio * 0.22, 0, 0, Math.PI * 2);
    o.fill();
    // Sombra do gol no gramado.
    o.fillStyle = 'rgba(0,0,0,0.22)';
    o.beginPath();
    o.moveTo(g.gx, g.chao);
    o.lineTo(g.gx + g.gw, g.chao);
    o.lineTo(g.gx + g.gw + 18, g.chao + 10);
    o.lineTo(g.gx + 18, g.chao + 10);
    o.fill();
  }

  /** Deslocamento da rede quando a bola entra: a rede "afunda" perto do ponto e balança. */
  function balancoDaRede(agora: number) {
    const t = (agora - efeitos.rede.inicio) / DUR_REDE;
    if (t < 0 || t > 1) return null;
    const amp = (1 - t) * Math.cos(t * Math.PI * 3);
    const sigma = g.gw * 0.22;
    const { x: ix, y: iy } = efeitos.rede;
    return (p: { x: number; y: number }) => {
      const d2 = (p.x - ix) ** 2 + (p.y - iy) ** 2;
      const w = amp * Math.exp(-d2 / (2 * sigma * sigma)) * 0.05;
      return { x: W / 2 + (p.x - W / 2) * (1 - w), y: g.fugaY + (p.y - g.fugaY) * (1 - w) };
    };
  }

  function desenharRede(o: CanvasRenderingContext2D, mexe: ((p: { x: number; y: number }) => { x: number; y: number }) | null): void {
    const esq = g.gx;
    const dir = g.gx + g.gw;
    const topo = g.gy;
    const base = g.chao;
    const alturaFundo = 0.82; // a rede desce em direção ao fundo
    const fTE = fundo(esq, base - g.gh * alturaFundo);
    const fTD = fundo(dir, base - g.gh * alturaFundo);
    const fBE = fundo(esq, base);
    const fBD = fundo(dir, base);
    const p = (pt: { x: number; y: number }) => (mexe ? mexe(pt) : pt);
    const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });

    // Fundo escuro atrás da rede, para a malha aparecer como no exemplo de TV.
    o.fillStyle = 'rgba(0,0,0,0.22)';
    o.beginPath();
    o.moveTo(fTE.x, fTE.y);
    o.lineTo(fTD.x, fTD.y);
    o.lineTo(fBD.x, fBD.y);
    o.lineTo(fBE.x, fBE.y);
    o.fill();

    /** Malha de um painel da rede (4 cantos), com o balanço aplicado em cada ponto. */
    const malha = (a: { x: number; y: number }, b: { x: number; y: number }, cc: { x: number; y: number }, d: { x: number; y: number }, nu: number, nv: number) => {
      const passos = 10;
      o.beginPath();
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        for (let j = 0; j <= passos; j++) {
          const v = j / passos;
          const pt = p(lerp(lerp(a, b, u), lerp(d, cc, u), v));
          if (j === 0) o.moveTo(pt.x, pt.y);
          else o.lineTo(pt.x, pt.y);
        }
      }
      for (let j = 0; j <= nv; j++) {
        const v = j / nv;
        for (let i = 0; i <= passos; i++) {
          const u = i / passos;
          const pt = p(lerp(lerp(a, b, u), lerp(d, cc, u), v));
          if (i === 0) o.moveTo(pt.x, pt.y);
          else o.lineTo(pt.x, pt.y);
        }
      }
      o.stroke();
    };
    const nu = Math.round(g.gw / 10);
    const nv = Math.round(g.gh / 10);
    // Fio com sombra embaixo: a malha ganha volume.
    for (const [cor, dx] of [['rgba(0,0,0,0.35)', 1], ['rgba(240,240,235,0.42)', 0]] as const) {
      o.save();
      o.translate(dx, dx);
      o.strokeStyle = cor;
      o.lineWidth = 1.1;
      malha(fTE, fTD, fBD, fBE, nu, nv); // fundo
      malha({ x: esq, y: topo }, { x: dir, y: topo }, fTD, fTE, nu, 3); // teto
      malha({ x: esq, y: topo }, fTE, fBE, { x: esq, y: base }, 3, nv); // lado esquerdo
      malha({ x: dir, y: topo }, fTD, fBD, { x: dir, y: base }, 3, nv); // lado direito
      o.restore();
    }

    // Ferros de trás.
    o.strokeStyle = 'rgba(230,230,225,0.75)';
    o.lineWidth = 2.5;
    o.beginPath();
    o.moveTo(esq, topo);
    o.lineTo(fTE.x, fTE.y);
    o.lineTo(fBE.x, fBE.y);
    o.lineTo(fBD.x, fBD.y);
    o.lineTo(fTD.x, fTD.y);
    o.lineTo(dir, topo);
    o.stroke();
  }

  function desenharGol(agora: number): void {
    const mexe = balancoDaRede(agora);
    if (mexe) desenharRede(c, mexe);
    else if (rede) c.drawImage(rede, 0, 0, W, H);
  }

  /** Traves redondas: luz de um lado, sombra do outro. */
  function desenharTraves(): void {
    const esq = g.gx;
    const dir = g.gx + g.gw;
    const e = Math.max(6, g.gw * 0.022);
    const cilindro = (x0: number, y0: number, x1: number, y1: number, vertical: boolean) => {
      const grad = vertical ? c.createLinearGradient(x0 - e / 2, 0, x0 + e / 2, 0) : c.createLinearGradient(0, y0 - e / 2, 0, y0 + e / 2);
      grad.addColorStop(0, '#9a9a95');
      grad.addColorStop(0.35, '#ffffff');
      grad.addColorStop(1, '#b5b5b0');
      c.strokeStyle = grad;
      c.lineWidth = e;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    };
    cilindro(esq, g.chao, esq, g.gy, true);
    cilindro(dir, g.chao, dir, g.gy, true);
    cilindro(esq, g.gy, dir, g.gy, false);
  }

  // ---------- bonecos ----------
  /** Altura do goleiro na tela: ~80% da altura do gol. */
  const escGoleiro = () => (g.gh * 0.8) / 100;
  const escBatedor = () => g.raio / 15;

  function sombraNoChao(x: number, y: number, larg: number): void {
    c.fillStyle = 'rgba(0,0,0,0.32)';
    c.beginPath();
    c.ellipse(x, y, larg, larg * 0.24, 0, 0, Math.PI * 2);
    c.fill();
  }

  /**
   * Onde está o goleiro: parado balançando, ou no meio do pulo para a zona.
   * Devolve o centro do corpo, o giro, a pose e a posição das luvas (onde a bola para na defesa).
   */
  function goleiroNoQuadro(zona: number | null, t: number, agora: number) {
    const esc = escGoleiro();
    const repouso = { x: telaX(0), y: g.chao - 3 - 50 * esc };
    if (zona === null || zona < 0 || t <= 0) {
      const pose = poseGoleiroEsperando(agora);
      return { x: repouso.x, y: repouso.y, ang: 0, pose, luvas: luvas(repouso.x, repouso.y, 0, pose, esc) };
    }
    const e = facil(limitar01(t));
    const alvoTela = { x: telaX(centroZona(zona).x), y: telaY(centroZona(zona).y) };
    const col = coluna(zona);
    let ang = 0;
    let pose: Pose;
    let alvo: { x: number; y: number };
    if (col === 1 && linha(zona) === 0) {
      // Meio e embaixo: abafa no chão.
      pose = entre(GOLEIRO.pronto, GOLEIRO.abafa, e);
      alvo = repouso;
    } else {
      pose = entre(GOLEIRO.pronto, GOLEIRO.esticado, Math.min(1, e * 1.6));
      ang = col === 1 ? 0 : (col === 0 ? -1 : 1) * (linha(zona) === 1 ? 1.15 : 1.4);
      // As luvas (50 unidades acima do centro) chegam no ponto da zona.
      const alcance = 50 * esc;
      alvo = { x: alvoTela.x - Math.sin(ang) * alcance, y: alvoTela.y + Math.cos(ang) * alcance };
      alvo.y = Math.min(alvo.y, repouso.y + (col === 1 ? 0 : 20 * esc));
    }
    const x = repouso.x + (alvo.x - repouso.x) * e;
    const y = repouso.y + (alvo.y - repouso.y) * e - Math.sin(e * Math.PI) * 10 * esc;
    const a = ang * e;
    return { x, y, ang: a, pose, luvas: luvas(x, y, a, pose, esc) };
  }

  function luvas(x: number, y: number, ang: number, pose: Pose, esc: number) {
    const lx = ((pose.maoE[0] + pose.maoD[0]) / 2) * esc;
    const ly = ((pose.maoE[1] + pose.maoD[1]) / 2 + 50) * esc;
    return { x: x + lx * Math.cos(ang) - ly * Math.sin(ang), y: y + lx * Math.sin(ang) + ly * Math.cos(ang) };
  }

  function desenharGoleiroNoQuadro(u: Uniforme, zona: number | null, t: number, agora: number): void {
    const esc = escGoleiro();
    const q = goleiroNoQuadro(zona, t, agora);
    const alturaDoChao = g.chao - 3 - (q.y + 50 * esc);
    sombraNoChao(q.x, g.chao - 2, Math.max(10, 24 * esc - alturaDoChao * 0.1));
    c.save();
    c.translate(q.x, q.y);
    c.rotate(q.ang);
    c.scale(esc, esc);
    c.translate(0, 50);
    desenharGoleiro(c, q.pose, u);
    c.restore();
  }

  /** Batedor de costas na posição (x, y) dos pés. */
  function desenharBatedorEm(u: Uniforme, x: number, y: number, pose: Pose): void {
    const esc = escBatedor();
    sombraNoChao(x + 4 * esc, y + 1, 22 * esc);
    c.save();
    c.translate(x, y);
    c.scale(esc, esc);
    desenharBatedor(c, pose, u);
    c.restore();
  }

  /** Você batendo: mãos na cintura na mira; no chute, avança e bate (DUR_BATIDA até o pé encontrar a bola). */
  function desenharBatedorJogador(msChute: number | null, agora: number): void {
    const avanco = msChute === null ? 0 : facil(limitar01(msChute / DUR_BATIDA));
    const x = g.bolaX - g.raio * 3.3 + avanco * g.raio * 0.9;
    const y = g.bolaY + g.raio * 1.5 - avanco * g.raio * 0.2;
    desenharBatedorEm(uniformeJogador, x, y, msChute === null ? poseParado(agora) : poseChute(msChute));
  }

  /** Quem bate contra você: corre de trás, espera atrás da bola e bate. */
  function desenharBatedorAdversario(msCorrida: number, msChute: number | null, agora: number): void {
    const p = facil(limitar01(msCorrida / DUR_CORRIDA));
    const x0 = g.bolaX - g.raio * 5.5;
    const y0 = g.bolaY + g.raio * 4.5;
    const x1 = g.bolaX - g.raio * 3.3;
    const y1 = g.bolaY + g.raio * 1.5;
    const avanco = msChute === null ? 0 : facil(limitar01(msChute / DUR_BATIDA));
    const x = x0 + (x1 - x0) * p + avanco * g.raio * 0.9;
    const y = y0 + (y1 - y0) * p - avanco * g.raio * 0.2;
    let pose: Pose;
    if (msChute !== null) pose = poseChute(msChute);
    else if (msCorrida < DUR_CORRIDA) pose = poseCorrida(msCorrida);
    else pose = entre(poseCorrida(DUR_CORRIDA), poseParado(agora), limitar01((msCorrida - DUR_CORRIDA) / 200));
    desenharBatedorEm(uniformeBatedor, x, y, pose);
  }

  /** Pé de apoio (a dica), ao lado da bola, com um rastro no chão apontando o canto. */
  function desenharDica(dica: number): void {
    const ang = [-0.6, 0, 0.6][dica];
    const px = g.bolaX - g.raio * 1.7;
    const py = g.bolaY + g.raio * 0.2;
    c.save();
    c.translate(px, py);
    c.rotate(ang);
    c.strokeStyle = 'rgba(255,210,63,0.85)';
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

  // ---------- bola ----------
  function desenharBola(x: number, y: number, escala = 1, sombraY = y, giro = 0): void {
    const r = g.raio * escala;
    const altura = Math.max(0, sombraY - y);
    c.fillStyle = `rgba(0,0,0,${Math.max(0.12, 0.35 - altura / 600)})`;
    c.beginPath();
    c.ellipse(x + altura * 0.05, sombraY + r * 0.9, r * 0.95, r * 0.3, 0, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = '#f2f2ee';
    c.fillRect(x - r, y - r, r * 2, r * 2);
    // Gomos girando: o pentágono do meio e os vizinhos passam pela frente da bola.
    c.fillStyle = '#1b1b1b';
    for (let k = 0; k < 6; k++) {
      const a = giro + k * ((Math.PI * 2) / 5);
      const dist = k === 5 ? 0 : 0.78;
      const cx = x + Math.cos(a) * r * dist;
      const cy = y + Math.sin(a) * r * dist * 0.92;
      const tam = r * (k === 5 ? 0.33 : 0.27);
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const b = giro * 1.3 + -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const px = cx + Math.cos(b) * tam;
        const py = cy + Math.sin(b) * tam;
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.fill();
    }
    // Luz e sombra da esfera.
    const vol = c.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.05);
    vol.addColorStop(0, 'rgba(255,255,255,0.55)');
    vol.addColorStop(0.5, 'rgba(255,255,255,0)');
    vol.addColorStop(1, 'rgba(0,0,0,0.38)');
    c.fillStyle = vol;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
  }

  /** Bola em voo: rastro de borrão atrás (quadros anteriores) e giro. */
  function desenharBolaEmVoo(pos: (t: number) => { x: number; y: number; escala: number; sombraY: number }, t: number): void {
    if (t > 0 && t < 1) {
      for (const [atras, alfa] of [[0.09, 0.14], [0.05, 0.24]] as const) {
        const p = pos(Math.max(0, t - atras));
        c.fillStyle = `rgba(255,255,255,${alfa})`;
        c.beginPath();
        c.arc(p.x, p.y, g.raio * p.escala, 0, Math.PI * 2);
        c.fill();
      }
    }
    const p = pos(t);
    desenharBola(p.x, p.y, p.escala, p.sombraY, t * 14);
  }

  function desenharZonas(destaque: number | null): void {
    for (let z = 0; z < 6; z++) {
      const x0 = telaX(-1 + coluna(z) * (2 / 3));
      const y0 = telaY(linha(z) === 1 ? 1 : 0.5);
      const w = g.gw / 3;
      const h = g.gh / 2;
      c.fillStyle = z === destaque ? 'rgba(255,210,63,0.5)' : 'rgba(255,255,255,0.1)';
      c.fillRect(x0 + 3, y0 + 3, w - 6, h - 6);
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 1.5;
      c.setLineDash([5, 5]);
      c.strokeRect(x0 + 3, y0 + 3, w - 6, h - 6);
      c.setLineDash([]);
    }
  }

  /** Rastro amarelo seguindo o dedo: mais grosso e mais forte na ponta. */
  function desenharRastro(): void {
    if (rastro.length < 2) return;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.save();
    c.shadowColor = 'rgba(255,210,63,0.8)';
    c.shadowBlur = 12;
    const n = rastro.length;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      c.strokeStyle = `rgba(255,210,63,${0.25 + 0.7 * t})`;
      c.lineWidth = 3 + 7 * t;
      c.beginPath();
      c.moveTo(rastro[i - 1].x, rastro[i - 1].y);
      c.lineTo(rastro[i].x, rastro[i].y);
      c.stroke();
    }
    c.restore();
    const ponta = rastro[n - 1];
    c.fillStyle = '#ffd23f';
    c.beginPath();
    c.arc(ponta.x, ponta.y, 7, 0, Math.PI * 2);
    c.fill();
  }

  /** Posição da bola num chute com curva (bezier quadrática). */
  function trajetoria(alvoX: number, alvoY: number, efeito: number, t: number, alto: boolean) {
    const sx = g.bolaX;
    const sy = g.bolaY;
    const cx = (sx + alvoX) / 2 - (efeito / 100) * g.gw * 0.35;
    const cy = alto ? Math.min(sy, alvoY) - g.gh * 1.2 : (sy + alvoY) / 2;
    const u = 1 - t;
    // Sombra corre no chão, da bola até a linha do gol.
    const sombraY = sy + (g.chao - sy) * t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * alvoX,
      y: u * u * sy + 2 * u * t * cy + t * t * alvoY,
      escala: 1 - 0.5 * t,
      sombraY,
    };
  }

  /**
   * Progresso da cobrança (0 a 1) com a câmera lenta da cavadinha: o trecho de 60% a 80%
   * do caminho ganha 0,5 s a mais, logo antes de a bola entrar.
   */
  function progressoDoChute(r: ResultadoCobranca, decorrido: number): number {
    const dur = r.cavadinha ? DUR_CAVADINHA : DUR_CHUTE;
    if (!r.cavadinha || reduzido) return decorrido / dur;
    const a = dur * 0.6;
    const lento = dur * 0.2 + DUR_CAMERA_LENTA;
    if (decorrido < a) return decorrido / dur;
    if (decorrido < a + lento) return 0.6 + (0.2 * (decorrido - a)) / lento;
    return 0.8 + (decorrido - a - lento) / dur;
  }

  /** Câmera lenta: tarjas pretas de cinema enquanto dura. */
  function desenharCameraLenta(t: number): void {
    const forca = t > 0.55 && t < 0.85 ? Math.min(1, Math.min(t - 0.55, 0.85 - t) / 0.05) : 0;
    if (!forca) return;
    const h = 26 * forca;
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(0, 0, W, h);
    c.fillRect(0, H - h, W, h);
  }

  function desenharPontos(agora: number): void {
    efeitos.pontos = efeitos.pontos.filter((p) => agora - p.inicio < DUR_PONTOS);
    for (const p of efeitos.pontos) {
      const t = (agora - p.inicio) / DUR_PONTOS;
      // Sobe em 400 ms, segura e some.
      const sobe = facil(Math.min(1, (agora - p.inicio) / 400));
      const alfa = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      c.save();
      c.globalAlpha = alfa;
      c.font = `400 ${Math.round(g.raio * 1.5)}px Anton, Impact, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 5;
      c.strokeStyle = '#111111';
      const y = p.y - 10 - sobe * 46;
      c.strokeText(p.texto, p.x, y);
      c.fillStyle = '#ffd23f';
      c.fillText(p.texto, p.x, y);
      c.restore();
    }
  }

  /** Onde a bola fica parada depois do lance (luva, rede ou trave). */
  function bolaParada(x: number, y: number): void {
    desenharBola(x, y, 0.5, g.chao - g.raio * 0.5);
  }

  const temposDeQuadro: number[] = [];

  function quadro(agora: number): void {
    if (acabou) return;
    const inicioQuadro = performance.now();
    c.save();
    if (agora - efeitos.tremida < DUR_TREMIDA) {
      const f = 1 - (agora - efeitos.tremida) / DUR_TREMIDA;
      c.translate((Math.random() * 2 - 1) * 5 * f, (Math.random() * 2 - 1) * 5 * f);
    }
    if (campo) c.drawImage(campo, 0, 0, W, H);
    desenharArquibancada(agora);
    desenharGol(agora);

    if (fase.tipo === 'pausa') {
      if (agora >= fase.ate) fase.depois();
    }

    let lenta = -1;
    switch (fase.tipo) {
      case 'mirar': {
        desenharGoleiroNoQuadro(UNIFORME_MAQUINA, null, 0, agora);
        desenharTraves();
        desenharBatedorJogador(null, agora);
        desenharBola(g.bolaX, g.bolaY);
        desenharRastro();
        break;
      }
      case 'chute': {
        const { r, gesto } = fase;
        const ms = agora - fase.inicio;
        const dur = r.cavadinha ? DUR_CAVADINHA : DUR_CHUTE;
        // A bola só sai quando o pé encontra a bola.
        const t = limitar01(progressoDoChute(r, ms - DUR_BATIDA));
        if (r.cavadinha && !reduzido) lenta = t;
        // O goleiro segue o tempo da bola (fica lento junto na cavadinha).
        const tPulo = (t * dur - dur * 0.15) / DUR_PULO;
        desenharGoleiroNoQuadro(UNIFORME_MAQUINA, r.zonaGoleiro, tPulo, agora);
        desenharTraves();
        desenharBatedorJogador(ms, agora);
        // Bola defendida para na luva do goleiro.
        const luva = goleiroNoQuadro(r.zonaGoleiro, (dur - dur * 0.15) / DUR_PULO, agora).luvas;
        const destino = r.desfecho === 'defesa' ? luva : { x: telaX(r.x), y: telaY(r.y) };
        desenharBolaEmVoo((tt) => trajetoria(destino.x, destino.y, gesto.efeito, facil(tt), r.cavadinha), t);
        if (t >= 1) fimDoChute(r);
        break;
      }
      case 'corrida': {
        const ms = agora - fase.inicio;
        // Tempo para reagir depois da corrida: encurta ao longo da semana.
        const janela = 1900 - 700 * dificuldade;
        desenharZonas(fase.zona);
        const tPulo = fase.pulouEm === null ? 0 : (agora - fase.pulouEm) / DUR_PULO;
        desenharGoleiroNoQuadro(uniformeJogador, fase.zona, tPulo, agora);
        desenharTraves();
        if (ms >= DUR_CORRIDA * 0.55) desenharDica(fase.plano.dica);
        desenharBola(g.bolaX, g.bolaY);
        desenharBatedorAdversario(ms, null, agora);
        if (ms >= DUR_CORRIDA + janela) chuteDaMaquina(fase.zona ?? -1, fase.pulouEm ?? agora);
        break;
      }
      case 'chuteMaquina': {
        const { r } = fase;
        const ms = agora - fase.inicio;
        const t = limitar01((ms - DUR_BATIDA) / DUR_CHUTE);
        const tPulo = (agora - fase.pulouEm) / DUR_PULO;
        desenharGoleiroNoQuadro(uniformeJogador, r.zonaGoleiro, Math.max(tPulo, 0), agora);
        desenharTraves();
        const luva = goleiroNoQuadro(r.zonaGoleiro, 1, agora).luvas;
        const alvo =
          r.desfecho === 'fora'
            ? { x: telaX(coluna(r.alvo) === 0 ? -0.7 : coluna(r.alvo) === 2 ? 0.7 : 0.1), y: telaY(1.35) }
            : r.desfecho === 'defesa'
              ? luva
              : { x: telaX(centroZona(r.alvo).x), y: telaY(centroZona(r.alvo).y) };
        desenharBatedorAdversario(DUR_CORRIDA * 2, ms, agora);
        desenharBolaEmVoo((tt) => trajetoria(alvo.x, alvo.y, 0, facil(tt), false), t);
        if (t >= 1) fimDaDefesa(r);
        break;
      }
      case 'pausa': {
        const ultimaDefesa = defesas.length === cobrancas.length;
        if (ultimaDefesa && defesas.length) {
          const r = defesas[defesas.length - 1];
          desenharGoleiroNoQuadro(uniformeJogador, r.zonaGoleiro, 1, agora);
          desenharTraves();
          desenharBatedorAdversario(DUR_CORRIDA * 2, 2000, agora);
          if (r.desfecho === 'defesa') {
            const l = goleiroNoQuadro(r.zonaGoleiro, 1, agora).luvas;
            bolaParada(l.x, l.y);
          } else if (r.desfecho === 'gol') {
            const z = centroZona(r.alvo);
            bolaParada(telaX(z.x), telaY(z.y));
          }
        } else if (cobrancas.length) {
          const r = cobrancas[cobrancas.length - 1];
          desenharGoleiroNoQuadro(UNIFORME_MAQUINA, r.zonaGoleiro, 1, agora);
          desenharTraves();
          desenharBatedorJogador(2000, agora);
          if (r.desfecho === 'gol' || r.desfecho === 'trave') bolaParada(telaX(r.x), telaY(r.y));
          else if (r.desfecho === 'defesa') {
            const l = goleiroNoQuadro(r.zonaGoleiro, 1, agora).luvas;
            bolaParada(l.x, l.y);
          }
        }
        break;
      }
      case 'preparando':
      case 'parOuImpar': {
        desenharGoleiroNoQuadro(UNIFORME_MAQUINA, null, 0, agora);
        desenharTraves();
        desenharBatedorJogador(null, agora);
        desenharBola(g.bolaX, g.bolaY);
        break;
      }
    }
    desenharPontos(agora);
    c.restore();
    if (lenta >= 0) desenharCameraLenta(lenta);
    if (import.meta.env.DEV) {
      temposDeQuadro.push(performance.now() - inicioQuadro);
      if (temposDeQuadro.length > 120) temposDeQuadro.shift();
    }
    raf = proximoQuadro(quadro);
  }

  // ---------- ligações ----------
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__partida = { semente, dificuldade, cobrancas, defesas, gestosCobranca, gestosDefesa, fase: () => fase.tipo, tempos: () => temposDeQuadro, abrirParOuImpar: () => abrirParOuImpar() };
  }
  medir();
  atualizarHud();
  if (!jogadorPronto) abrirComoJogar();
  void preparar();
  let raf = proximoQuadro(quadro);

  const aoRedimensionar = () => medir();
  window.addEventListener('resize', aoRedimensionar);
  canvas.addEventListener('pointerdown', aoTocar);
  canvas.addEventListener('pointermove', aoMover);
  canvas.addEventListener('pointerup', aoSoltar);
  canvas.addEventListener('pointercancel', () => (rastro = []));
  root.querySelector('.voltar')?.addEventListener('click', () => irPara({ tela: 'inicio' }));
  root.querySelector('[data-cj-fechar]')!.addEventListener('click', fecharComoJogar);
  root.querySelector('.ajuda')!.addEventListener('click', () => {
    // Só abre quando nada corre contra o relógio (na mira ou antes do apito).
    if (fase.tipo === 'mirar' || fase.tipo === 'preparando') {
      rastro = [];
      jogadorPronto = false;
      abrirComoJogar();
    } else instruir('Dá pra ver as regras na hora da sua cobrança.');
  });
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
