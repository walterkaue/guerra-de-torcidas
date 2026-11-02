// Tela da partida em canvas: alterna cobrança e defesa, 5 de cada.
// Toda decisão de resultado vem do motor puro (jogo/penaltis.ts); aqui é só gesto e desenho.

import { esc, irPara, type Rota } from '../app';
import { SELECAO, TORCIDA_SELECAO, coresDoAdversario } from '../dados/adversarios';
import { corDeTexto, proTime, timePorId, TIMES, type Time } from '../dados/times';
import { prefs } from '../estado';
import { sementeNova } from '../jogo/aleatorio';
import { ID_SELECAO, chamadaDaDisputa } from '../jogo/disputas';
import { etiquetasDaCobranca, etiquetasDaDefesa, eventoDaCobranca, eventoDaDefesa, eventosDoFim } from '../narrador/lance';
import { criarNarrador } from '../narrador/sessao';
import {
  COBRANCAS,
  RODADAS_EXTRAS_MAX,
  coluna,
  linha,
  dificuldadePorDia,
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
  type ResultadoCobranca,
  type ResultadoDefesa,
} from '../jogo/penaltis';
import { pedirNumeroDoNarrador } from '../jogo/numeroNarrador';
import * as SERVIDOR from '../servidor/api';
import {
  ErroServidor,
  type DesafioRecebido,
  type FechamentoDoServidor,
} from '../servidor/api';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { criarCena, facil, limitar01, suave } from './cena';
import { criarCena3d, type Cena3d } from './cena3d';
import { ENQUADRAMENTOS } from './camera';
import { inicioDoVoo, latenciaInicial, novaLatencia, tempoDaBatida } from './tempoDoChute';
import { ANTES_DO_CORTE, criarReplay, montarTarjaDoReplay, type Replay } from './replay';
import { caminhoDoChute } from '../jogo/lances';
import { destravarSom, somApito, somChute, somTorcida } from '../jogo/som';
import {
  DUR_AJEITAR,
  apontarPeDeApoio,
  criarBoneco,
  novaPose,
  poseAjeitando,
  poseChute,
  poseChuteMaquina,
  poseComemora,
  poseCorrida,
  poseEspera,
  poseLamenta,
  poseParado,
  sortearAparencia,
  uniformesDaPartida,
  type Boneco,
} from './bonecos';
import { icone } from './icones';
import { aoMudarQualidade, medirQuadros, qualidade } from './qualidade';

type Fase =
  | { tipo: 'mirar'; inicio: number }
  // r nulo: esperando o servidor resolver o lance (lance a lance).
  | { tipo: 'chute'; inicio: number; r: ResultadoCobranca | null; gesto: GestoCobranca }
  | { tipo: 'corrida'; inicio: number; dica: number; zona: number | null; pulouEm: number | null }
  | { tipo: 'chuteMaquina'; inicio: number; r: ResultadoDefesa | null; zona: number; pulouEm: number; dica: number }
  | { tipo: 'pausa'; inicio: number; ate: number; depois: () => void }
  | { tipo: 'parOuImpar' }
  | { tipo: 'replay'; replay: Replay; depois: () => void }
  | { tipo: 'preparando' };

/** Direção do pé de apoio (a dica) para cada coluna do gol, em radianos a partir da vertical. */
const ANG_DICA = [-0.6, 0, 0.6];
const TRACO_DA_DICA = [6, 6];
const SEM_TRACO: number[] = [];

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
// ?penaltiFalso troca o servidor por um de mentira, lance a lance (src/dev/penaltiFalso.ts).
const FALSO = import.meta.env.DEV && parametros.has('penaltiFalso');
const servidor = (): Promise<Pick<typeof SERVIDOR, 'novaPartida' | 'lancePenalti' | 'fecharPartida'>> =>
  FALSO ? import('../dev/penaltiFalso') : Promise.resolve(SERVIDOR);
const proximoQuadro = (fn: (t: number) => void): number =>
  usarTimer ? window.setTimeout(() => fn(relogio()), 16) : requestAnimationFrame(() => fn(relogio()));

const DUR_CHUTE = 650;
const DUR_CAVADINHA = 1050;
const DUR_PULO = 420;
const DUR_CORRIDA = 900;
/** Do início do chute até o pé encontrar a bola (a bola só sai depois). */
const DUR_BATIDA = 190;

/** Câmera lenta da cavadinha: 0,5 s a mais no trecho final, antes de a bola entrar. */
const DUR_CAMERA_LENTA = 500;

/** Golaço (ângulo, cavadinha ou raspando a trave) ganha replay de TV; o replay entra este tempo depois do gol. */
const DUR_ANTES_DO_REPLAY = 1000;

export const AVISO_SEM_PONTOS = 'Sem internet: essa partida não vale pontos.';
export const AVISO_CAIU = 'Caiu a conexão: essa partida não vale mais pontos.';

export function telaPartida(root: HTMLElement, rota: Rota): () => void {
  const time: Time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  const codigoDesafio = rota.tela === 'partida' ? rota.desafio : undefined;
  // Disputa histórica: só cenário (adversário e chamada). O resto é a partida de sempre; desafio por link não tem cenário.
  const disputa = rota.tela === 'partida' && !codigoDesafio ? rota.disputa : undefined;
  const pelaSelecao = disputa?.clube === ID_SELECAO;
  const nomeDoLado = pelaSelecao ? SELECAO.nome : time.nome;
  const coresDoLado = pelaSelecao ? SELECAO.cores : time.cores;
  // Valores locais (partida sem valer pontos); trocados pelos do servidor quando ele responde.
  let semente = sementeNova();
  let dificuldade = dificuldadePorDia(diaEmBrasilia());
  let partidaId: string | null = null;
  // Lance a lance: a semente fica no servidor, que resolve cada lance e manda a dica da próxima defesa.
  let lanceALance = false;
  let dicaDoServidor: number | null = null;
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
          <div class="lado lado-jogador"><span class="sigla">${esc(nomeDoLado)}</span><span class="bolinhas" data-lado="jogador"></span></div>
          <strong class="gols"><span data-gols="jogador">0</span><em>x</em><span data-gols="maquina">0</span></strong>
          <div class="lado lado-maquina"><span class="sigla">${esc(disputa?.adversario ?? 'Máquina')}</span><span class="bolinhas" data-lado="maquina"></span></div>
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
            <li><span class="cj-icone">${icone('bola')}</span><p><strong>Cobrar.</strong> Arraste o dedo da bola na direção do gol. Arraste longo = chute forte; forte demais vai por cima.</p></li>
            <li><span class="cj-icone">${icone('curva')}</span><p><strong>Efeito.</strong> Curve o fim do arraste pra bola fazer curva. Arraste curtinho e reto é cavadinha.</p></li>
            <li><span class="cj-icone">${icone('mao')}</span><p><strong>Defender.</strong> O batedor corre. Olhe o pé de apoio, em amarelo, e toque no gol onde pular. Ele nem sempre é honesto!</p></li>
            <li><span class="cj-icone">${icone('trofeu')}</span><p><strong>Pontos ${esc(paraTime)}.</strong> Gol 10, ângulo +5, cavadinha +10, defesa 10, vitória +20, 5 de 5 +25.</p></li>
          </ul>
          <p class="cj-nota">5 cobranças e 5 defesas, alternadas. Empatou? Morte súbita.</p>
          <label class="cj-check"><input type="checkbox" data-cj-pular> Não exibir novamente</label>
          <button class="botao" type="button" data-cj-fechar>Bora jogar!</button>
        </div>
      </section>
    </main>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const torcidaDaPartida = pelaSelecao ? TORCIDA_SELECAO : undefined;
  const cena = criarCena(canvas, { cores: time.cores, torcida: torcidaDaPartida, relogio, reduzido });
  const {
    c,
    g,
    efeitos,
    goleiro,
    medir,
    telaX,
    telaY,
    zonaX,
    zonaY,
    centroZona,
    lerArraste,
    zonaTocada,
    comemorar,
    desenharTraves,
    goleiroNoQuadro,
    desenharGoleiroNoQuadro,
    escBatedor,
    desenharBatedorEm,
    desenharBola,
    desenharBolaEmVoo,
    desenharZonas,
    desenharRastro,
    trajetoria,
    desenharCameraLenta,
    desenharPontos,
    bolaParada,
  } = cena;
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
  /** Se o chute saiu com o batedor ainda ajeitando a bola (1) ou já no lugar (0). Só desenho. */
  let pertoNoChute = 0;
  let acabou = false;

  // Quem entra em campo é sorteado a cada partida, com o sorteio do visual (nunca a semente):
  // cada lado tem 5 batedores, um por cobrança (na morte súbita volta o primeiro), e um goleiro
  // (docs/bonecos.md, seção 3).
  // Uniforme 1 ou 2 também é sorteado; o adversário troca se as camisetas ficarem parecidas.
  const uniformePreferido: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
  const sortearBatedores = () => Array.from({ length: COBRANCAS }, sortearAparencia);
  const elenco = { jogador: sortearBatedores(), goleiroJogador: sortearAparencia(), maquina: sortearBatedores(), goleiroMaquina: sortearAparencia() };
  let batedoresJogador: Boneco[] = [];
  let goleiroJogador!: Boneco;
  /** Quem bate contra você: a máquina ou, no desafio por link, o time de quem desafiou. */
  let batedoresMaquina: Boneco[] = [];
  let goleiroMaquina!: Boneco;
  /** Veste todo mundo para enfrentar a máquina (null) ou o time de quem desafiou. */
  function vestir(coresAdversario: readonly [string, string] | null): void {
    const u = uniformesDaPartida(coresDoLado, coresAdversario, uniformePreferido);
    batedoresJogador = elenco.jogador.map((a) => criarBoneco(a, u.jogador, false));
    goleiroJogador = criarBoneco(elenco.goleiroJogador, u.goleiroJogador, true);
    batedoresMaquina = elenco.maquina.map((a) => criarBoneco(a, u.adversario, false));
    goleiroMaquina = criarBoneco(elenco.goleiroMaquina, u.goleiroAdversario, true);
  }
  vestir(disputa ? coresDoAdversario(disputa.adversario) : null);
  /** O batedor da cobrança (ou da defesa) i. */
  const batedor = (lista: Boneco[], i: number) => lista[Math.max(0, i) % lista.length];

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
    elMudo.innerHTML = icone(prefs.get().mudo ? 'mudo' : 'som');
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
    fase = { tipo: 'mirar', inicio: relogio() };
    rastro = [];
    const extra = rodada - COBRANCAS + 1;
    instruir(
      rodada === 0
        ? 'Arraste da bola pro gol. Mais longo = mais forte. Curve no fim para dar efeito.'
        : extra > 0
          ? `${extra === 1 ? 'Empatou! ' : ''}Morte súbita: rodada extra ${extra} de ${RODADAS_EXTRAS_MAX}.`
          : `Cobrança ${rodada + 1} de ${COBRANCAS}. Arraste para chutar.`,
    );
    if (rodada === 0) narrar(narrador.falar('abertura'), disputa && chamadaDaDisputa(disputa));
    else if (rodada === COBRANCAS) narrar(narrador.falar('morte_subita', { placar: placarAtual() }));
    else if (cobrancaDecisiva()) narrar(narrador.falar('decisiva', { etiquetas: new Set(['cobranca']) }));
  }

  function comecarDefesa(): void {
    const dica =
      emLanceALance() && dicaDoServidor !== null
        ? dicaDoServidor
        : planejarDefesa(semente, rodada, dificuldade, desafio?.cobrancas?.[rodada]).dica;
    dicaDoServidor = null;
    fase = { tipo: 'corrida', inicio: relogio(), dica, zona: null, pulouEm: null };
    instruir('Sua vez de defender! Olhe o pé de apoio e toque onde pular.');
    if (defesaDecisiva()) narrar(narrador.falar('decisiva', { etiquetas: new Set(['defesa']) }));
  }

  function depoisDe(ms: number, fn: () => void): void {
    const agora = relogio();
    fase = { tipo: 'pausa', inicio: agora, ate: agora + ms, depois: fn };
  }

  const emLanceALance = () => lanceALance && !!partidaId && !aviso;

  /** O servidor não respondeu um lance: a partida segue no celular, sem valer pontos. */
  function caiuALigacao(e?: unknown): void {
    if (e) console.warn('Lance sem servidor:', e instanceof ErroServidor ? e.codigo : e);
    if (!aviso) mostrarAviso(AVISO_CAIU);
  }

  async function resultadoDaCobranca(gq: GestoCobranca, i: number): Promise<ResultadoCobranca> {
    if (emLanceALance()) {
      try {
        const resp = await (await servidor()).lancePenalti(partidaId!, { tipo: 'cobranca', gesto: gq });
        if (resp.cobranca) {
          dicaDoServidor = resp.proximo.tipo === 'defesa' ? resp.proximo.dica : null;
          return resp.cobranca;
        }
      } catch (e) {
        caiuALigacao(e);
      }
      caiuALigacao();
    }
    return resolverCobranca(semente, i, gq, dificuldade);
  }

  async function resultadoDaDefesa(zona: number, i: number): Promise<ResultadoDefesa> {
    if (emLanceALance()) {
      try {
        const resp = await (await servidor()).lancePenalti(partidaId!, { tipo: 'defesa', zona });
        if (resp.defesa) return resp.defesa;
      } catch (e) {
        caiuALigacao(e);
      }
      caiuALigacao();
    }
    return resolverDefesa(semente, i, zona, dificuldade, desafio?.cobrancas?.[i]);
  }

  let latencia = latenciaInicial();

  function chutar(gesto: GestoCobranca): void {
    const gq = normalizarCobranca(gesto);
    gestosCobranca.push(gq);
    if (fase.tipo === 'mirar') pertoNoChute = pertoDaBola(relogio() - fase.inicio);
    const chute: Fase & { tipo: 'chute' } = { tipo: 'chute', inicio: relogio(), r: null, gesto: gq };
    fase = chute;
    instruir('');
    void resultadoDaCobranca(gq, rodada).then((r) => {
      if (acabou || fase !== chute) return;
      const agora = relogio();
      latencia = novaLatencia(latencia, agora - chute.inicio);
      chute.r = r;
      // A bola sai assim que o resultado chega (o pé já está na bola), e o som sai com ela.
      chute.inicio = inicioDoVoo(chute.inicio, agora, DUR_BATIDA);
      window.setTimeout(() => !acabou && somChute(), Math.max(0, chute.inicio + DUR_BATIDA - agora));
    });
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
    narrar(narrador.falar(eventoDaCobranca(r), { etiquetas: etiquetasDaCobranca(r) }), legendaDaCobranca(r));
    if (r.desfecho === 'gol') comemorar(telaX(r.x), telaY(r.y), r.pontos, true);
    else if (r.desfecho === 'trave') cena.baterNaTrave(telaX(r.x), telaY(r.y));
    somTorcida(r.desfecho === 'gol' ? 'festa' : 'uuuh');
    const golaco = r.desfecho === 'gol' && (r.angulo || r.cavadinha || r.raspouTrave);
    if (golaco && !reduzido && qualidade().replay) {
      const gesto = gestosCobranca[gestosCobranca.length - 1];
      window.setTimeout(() => !acabou && tarja.entrar(), DUR_ANTES_DO_REPLAY - ANTES_DO_CORTE);
      depoisDe(DUR_ANTES_DO_REPLAY, () => comecarReplay(r, gesto, comecarDefesa));
    } else depoisDe(1500, comecarDefesa);
  }

  // ---------- replay de TV do golaço (telas/replay.ts) ----------
  // A cena dos pênaltis é a de TV, em 2D; o replay usa a cena 3D dos Lances num canvas por cima,
  // criado só no primeiro golaço.
  let cena3d: Cena3d | null = null;
  let telaReplay: HTMLCanvasElement | null = null;
  const tarja = montarTarjaDoReplay(root.querySelector<HTMLElement>('main')!);

  function comecarReplay(r: ResultadoCobranca, gesto: GestoCobranca, depois: () => void): void {
    if (!telaReplay) {
      telaReplay = document.createElement('canvas');
      telaReplay.className = 'tela-replay';
      telaReplay.addEventListener('pointerdown', () => fimDoReplay());
      canvas.after(telaReplay);
    }
    telaReplay.style.top = `${canvas.offsetTop}px`;
    telaReplay.style.height = `${canvas.offsetHeight}px`;
    telaReplay.hidden = false;
    if (!cena3d) {
      cena3d = criarCena3d(telaReplay, { cores: time.cores, relogio, reduzido });
      cena3d.trocarTorcida(torcidaDaPartida);
    }
    cena3d.medir();
    const bola = { x: 0, z: 11 };
    const z = centroZona(r.zonaGoleiro);
    const replay = criarReplay(
      cena3d,
      {
        bola,
        enquadramento: ENQUADRAMENTOS.penalti,
        em: caminhoDoChute(bola, gesto, r.x, r.y, r.cavadinha),
        voo: r.cavadinha ? DUR_CAVADINHA : DUR_CHUTE,
        cavadinha: r.cavadinha,
        // No ângulo com o goleiro no canto certo, ele quase chega.
        goleiro: { x: 0, z: 0.3, alvo: { x: z.x * 3.66, y: z.y * 2.44 }, alcance: r.zonaGoleiro === r.zonaBola ? 0.9 : 0.55 },
        batedor: batedor(batedoresJogador, cobrancas.length - 1),
        goleiroBoneco: goleiroMaquina,
      },
      relogio(),
    );
    fase = { tipo: 'replay', replay, depois };
  }

  function fimDoReplay(): void {
    if (fase.tipo !== 'replay') return;
    const { replay, depois } = fase;
    replay.encerrar();
    tarja.sair();
    if (telaReplay) telaReplay.hidden = true;
    depois();
  }

  function chuteDaMaquina(zona: number, pulouEm: number, dica: number): void {
    gestosDefesa.push(zona);
    const chute: Fase & { tipo: 'chuteMaquina' } = { tipo: 'chuteMaquina', inicio: relogio(), r: null, zona, pulouEm, dica };
    fase = chute;
    instruir('');
    void resultadoDaDefesa(zona, rodada).then((r) => {
      if (acabou || fase !== chute) return;
      chute.r = r;
      chute.inicio = relogio();
      somChute();
    });
  }

  function fimDaDefesa(r: ResultadoDefesa, dica: number): void {
    defesas.push(r);
    atualizarHud();
    const legenda =
      r.desfecho === 'defesa' ? (r.pontos ? `Defesa · +${r.pontos}` : 'Defesa') : r.desfecho === 'gol' ? 'Gol do adversário' : 'Pra fora';
    narrar(narrador.falar(eventoDaDefesa(r), { etiquetas: etiquetasDaDefesa(r, dica) }), legenda);
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
        if (FALSO) return (await servidor()).novaPartida(codigo);
        await sincronizarTorcedor();
        try {
          return await SERVIDOR.novaPartida(codigo, disputa?.id);
        } catch (e) {
          if (!(e instanceof ErroServidor) || e.codigo !== 'sem_time') throw e;
          await sincronizarTorcedor(true);
          return SERVIDOR.novaPartida(codigo, disputa?.id);
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
      // Servidor antigo manda a semente; no lance a lance ela fica lá (a local só serve se cair a conexão).
      if (typeof p.semente === 'number') semente = p.semente;
      lanceALance = !!p.lanceALance;
      dificuldade = p.dificuldade;
      partidaId = p.partidaId;
      desafio = p.desafio;
      if (desafio) {
        // O convite já foi aceito: tira o ?d= do endereço para não oferecer de novo.
        history.replaceState(null, '', location.pathname);
        root.querySelector('.placar-jogo .lado:last-child .sigla')!.textContent = desafio.apelido ?? 'X1';
        const t = timePorId(desafio.timeId);
        if (t) vestir(t.cores);
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
    fechamento ??= servidor().then((s) => s.fecharPartida(partidaId!, gestosAtuais(escolha)));
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
      instruir('Mandando seus pontos pra torcida…');
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
        disputa,
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

  // Reaproveitada a cada quadro: nada de objeto novo no loop (docs/bonecos.md, seção 5).
  const poseBatedor = novaPose();
  /** Lugar da cobrança: atrás e à esquerda da bola; com `avanco` 1 o pé do chute alcança a bola. */
  const batedorX = (avanco: number) => g.bolaX - g.raio * (3.3 - 0.9 * avanco);
  const batedorY = (avanco: number) => g.bolaY + g.raio * (1.5 - 0.2 * avanco);
  /** Ajeitando a bola, o batedor fica logo atrás dela; depois recua para o lugar da cobrança. */
  const RECUO = 2.4;
  /** 1 = ainda ajeitando, perto da bola; 0 = já no lugar da cobrança. */
  const pertoDaBola = (msMira: number) => 1 - suave(limitar01((msMira - 620) / (DUR_AJEITAR - 620)));

  /** Você na mira: ajeita a bola, recua e espera de mãos na cintura. */
  function desenharBatedorNaMira(msMira: number, agora: number): void {
    if (msMira < DUR_AJEITAR) poseAjeitando(msMira, poseBatedor);
    else poseParado(agora, poseBatedor);
    desenharBatedorEm(batedor(batedoresJogador, cobrancas.length), batedorX(0) + pertoDaBola(msMira) * g.raio * RECUO, batedorY(0), poseBatedor);
  }

  /** Você batendo: avança e bate (o pé encontra a bola em DUR_BATIDA). */
  function desenharBatedorChutando(ms: number, cavadinha: boolean): void {
    const avanco = facil(limitar01(ms / DUR_BATIDA));
    const x = batedorX(avanco) + pertoNoChute * (1 - avanco) * g.raio * RECUO;
    desenharBatedorEm(batedor(batedoresJogador, cobrancas.length), x, batedorY(avanco), poseChute(ms, cavadinha, poseBatedor));
  }

  /** Depois do lance: comemora o gol ou põe as mãos na cabeça. */
  function desenharBatedorDepois(b: Boneco, ms: number, gol: boolean): void {
    desenharBatedorEm(b, batedorX(1), batedorY(1), gol ? poseComemora(ms, poseBatedor) : poseLamenta(ms, poseBatedor));
  }

  /** Quem bate contra você: 3 passos de corrida e crava o pé de apoio apontando o canto (a dica). */
  function desenharMaquinaCorrendo(ms: number, agora: number, dica: number): void {
    const p = facil(limitar01(ms / DUR_CORRIDA));
    const x0 = g.bolaX - g.raio * 5.5;
    const y0 = g.bolaY + g.raio * 4.5;
    if (ms < DUR_CORRIDA) poseCorrida(ms, DUR_CORRIDA, poseBatedor);
    else poseEspera(agora, poseBatedor);
    apontarPeDeApoio(poseBatedor, ANG_DICA[dica], suave(limitar01((ms - DUR_CORRIDA * 0.6) / (DUR_CORRIDA * 0.4))));
    desenharBatedorEm(batedor(batedoresMaquina, defesas.length), x0 + (batedorX(1) - x0) * p, y0 + (batedorY(1) - y0) * p, poseBatedor, ms >= DUR_CORRIDA * 0.85);
  }

  /** A máquina bate com o pé de apoio ainda apontando o canto da dica, bem visível. */
  function desenharMaquinaChutando(ms: number, dica: number): void {
    poseChuteMaquina(ms, poseBatedor);
    apontarPeDeApoio(poseBatedor, ANG_DICA[dica], 1);
    desenharBatedorEm(batedor(batedoresMaquina, defesas.length), batedorX(1), batedorY(1), poseBatedor, true);
  }

  /** A dica no chão: onde o pé de apoio vai cravar e para que canto aponta. Sem desfoque. */
  function desenharDica(dica: number): void {
    const esc = escBatedor();
    const apoio = batedor(batedoresMaquina, defesas.length).apoio;
    const px = batedorX(1) + apoio.x * esc;
    const py = batedorY(1) + (apoio.y + 1.5) * esc;
    c.save();
    c.translate(px, py);
    c.rotate(ANG_DICA[dica]);
    c.fillStyle = 'rgba(255,210,63,0.22)';
    c.beginPath();
    c.ellipse(0, 0, g.raio * 0.85, g.raio * 1.3, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,210,63,0.5)';
    c.beginPath();
    c.ellipse(0, 0, g.raio * 0.5, g.raio * 0.95, 0, 0, Math.PI * 2);
    c.fill();
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,210,63,0.25)';
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(0, -g.raio * 1.5);
    c.lineTo(0, -g.raio * 5);
    c.stroke();
    c.strokeStyle = 'rgba(255,210,63,0.9)';
    c.lineWidth = 4;
    c.setLineDash(TRACO_DA_DICA);
    c.stroke();
    c.setLineDash(SEM_TRACO);
    c.restore();
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

  const temposDeQuadro: number[] = [];

  function quadro(agora: number): void {
    if (acabou) return;
    if (fase.tipo === 'replay' && cena3d) {
      cena3d.c.save();
      const falta = fase.replay.quadro(agora);
      cena3d.c.restore();
      if (falta <= ANTES_DO_CORTE) tarja.sair();
      if (falta <= 0) fimDoReplay();
      raf = proximoQuadro(quadro);
      return;
    }
    const inicioQuadro = performance.now();
    c.save();
    cena.desenharFundo(agora);

    if (fase.tipo === 'pausa') {
      if (agora >= fase.ate) fase.depois();
    }

    let lenta = -1;
    switch (fase.tipo) {
      case 'mirar': {
        desenharGoleiroNoQuadro(goleiroMaquina, null, 0, agora);
        desenharTraves();
        // A bola antes: ajeitando, o batedor fica entre a câmera e a bola.
        desenharBola(g.bolaX, g.bolaY);
        desenharBatedorNaMira(agora - fase.inicio, agora);
        desenharRastro(rastro);
        break;
      }
      case 'chute': {
        const { r, gesto } = fase;
        const ms = agora - fase.inicio;
        if (!r) {
          // Esperando o servidor: o pé chega na bola e a bola espera.
          desenharGoleiroNoQuadro(goleiroMaquina, null, 0, agora);
          desenharTraves();
          desenharBatedorChutando(tempoDaBatida(ms, latencia, DUR_BATIDA), false);
          desenharBola(g.bolaX, g.bolaY);
          break;
        }
        const dur = r.cavadinha ? DUR_CAVADINHA : DUR_CHUTE;
        // A bola só sai quando o pé encontra a bola.
        const t = limitar01(progressoDoChute(r, ms - DUR_BATIDA));
        if (r.cavadinha && !reduzido) lenta = t;
        // O goleiro segue o tempo da bola (fica lento junto na cavadinha).
        const tPulo = (t * dur - dur * 0.15) / DUR_PULO;
        desenharGoleiroNoQuadro(goleiroMaquina, r.zonaGoleiro, tPulo, agora);
        desenharTraves();
        desenharBatedorChutando(ms, r.cavadinha);
        // Bola defendida para na luva do goleiro.
        const defendeu = r.desfecho === 'defesa';
        const luva = goleiroNoQuadro(goleiroMaquina, r.zonaGoleiro, (dur - dur * 0.15) / DUR_PULO, agora);
        const dx = defendeu ? luva.luvaX : telaX(r.x);
        const dy = defendeu ? luva.luvaY : telaY(r.y);
        desenharBolaEmVoo((tt) => trajetoria(dx, dy, gesto.efeito, facil(tt), r.cavadinha), t);
        if (t >= 1) fimDoChute(r);
        break;
      }
      case 'corrida': {
        const ms = agora - fase.inicio;
        // Tempo para reagir depois da corrida: encurta ao longo da semana.
        const janela = 1900 - 700 * dificuldade;
        desenharZonas(fase.zona);
        const tPulo = fase.pulouEm === null ? 0 : (agora - fase.pulouEm) / DUR_PULO;
        desenharGoleiroNoQuadro(goleiroJogador, fase.zona, tPulo, agora);
        desenharTraves();
        if (ms >= DUR_CORRIDA * 0.55) desenharDica(fase.dica);
        desenharBola(g.bolaX, g.bolaY);
        desenharMaquinaCorrendo(ms, agora, fase.dica);
        if (ms >= DUR_CORRIDA + janela) chuteDaMaquina(fase.zona ?? -1, fase.pulouEm ?? agora, fase.dica);
        break;
      }
      case 'chuteMaquina': {
        const { r } = fase;
        const ms = agora - fase.inicio;
        if (!r) {
          // Esperando o servidor: o goleiro já pulou e o batedor está na bola.
          desenharGoleiroNoQuadro(goleiroJogador, fase.zona < 0 ? null : fase.zona, Math.max((agora - fase.pulouEm) / DUR_PULO, 0), agora);
          desenharTraves();
          desenharMaquinaChutando(0, fase.dica);
          desenharBola(g.bolaX, g.bolaY);
          break;
        }
        const t = limitar01((ms - DUR_BATIDA) / DUR_CHUTE);
        const tPulo = (agora - fase.pulouEm) / DUR_PULO;
        desenharGoleiroNoQuadro(goleiroJogador, r.zonaGoleiro, Math.max(tPulo, 0), agora);
        desenharTraves();
        const luva = goleiroNoQuadro(goleiroJogador, r.zonaGoleiro, 1, agora);
        const ax =
          r.desfecho === 'fora'
            ? telaX(coluna(r.alvo) === 0 ? -0.7 : coluna(r.alvo) === 2 ? 0.7 : 0.1)
            : r.desfecho === 'defesa'
              ? luva.luvaX
              : telaX(zonaX(r.alvo));
        const ay = r.desfecho === 'fora' ? telaY(1.35) : r.desfecho === 'defesa' ? luva.luvaY : telaY(zonaY(r.alvo));
        desenharMaquinaChutando(ms, fase.dica);
        desenharBolaEmVoo((tt) => trajetoria(ax, ay, 0, facil(tt), false), t);
        if (t >= 1) fimDaDefesa(r, fase.dica);
        break;
      }
      case 'pausa': {
        const ms = agora - fase.inicio;
        const ultimaDefesa = defesas.length === cobrancas.length;
        if (ultimaDefesa && defesas.length) {
          const r = defesas[defesas.length - 1];
          const pegou = r.desfecho === 'defesa';
          desenharGoleiroNoQuadro(goleiroJogador, r.zonaGoleiro, 1, agora, ms, pegou);
          const lx = goleiro.luvaX;
          const ly = goleiro.luvaY;
          desenharTraves();
          desenharBatedorDepois(batedor(batedoresMaquina, defesas.length - 1), ms, r.desfecho === 'gol');
          // Bola alta defendida sai espalmada; baixa fica encaixada na luva.
          if (pegou && linha(r.alvo) === 1) cena.bolaEspalmada(lx, ly, ms);
          else if (pegou) bolaParada(lx, ly);
          else if (r.desfecho === 'gol') bolaParada(telaX(zonaX(r.alvo)), telaY(zonaY(r.alvo)));
        } else if (cobrancas.length) {
          const r = cobrancas[cobrancas.length - 1];
          const pegou = r.desfecho === 'defesa';
          desenharGoleiroNoQuadro(goleiroMaquina, r.zonaGoleiro, 1, agora, ms, pegou);
          const lx = goleiro.luvaX;
          const ly = goleiro.luvaY;
          desenharTraves();
          desenharBatedorDepois(batedor(batedoresJogador, cobrancas.length - 1), ms, r.desfecho === 'gol');
          if (r.desfecho === 'gol') bolaParada(telaX(r.x), telaY(r.y));
          else if (r.desfecho === 'trave') cena.bolaNaTrave(telaX(r.x), telaY(r.y), ms);
          else if (pegou && linha(r.zonaBola) === 1) cena.bolaEspalmada(lx, ly, ms);
          else if (pegou) bolaParada(lx, ly);
        }
        break;
      }
      case 'preparando':
      case 'parOuImpar': {
        desenharGoleiroNoQuadro(goleiroMaquina, null, 0, agora);
        desenharTraves();
        desenharBatedorEm(batedor(batedoresJogador, cobrancas.length), batedorX(0), batedorY(0), poseParado(agora, poseBatedor));
        desenharBola(g.bolaX, g.bolaY);
        break;
      }
    }
    cena.desenharBatidaNaTrave(agora);
    desenharPontos(agora);
    c.restore();
    if (lenta >= 0) desenharCameraLenta(lenta);
    const trabalho = performance.now() - inicioQuadro;
    medidor.quadro(trabalho);
    if (import.meta.env.DEV) {
      temposDeQuadro.push(trabalho);
      if (temposDeQuadro.length > 120) temposDeQuadro.shift();
    }
    raf = proximoQuadro(quadro);
  }

  // Qualidade automática: mede os quadros e, se o nível mudar, refaz os canvas abertos.
  const medidor = medirQuadros();
  const pararDeOuvirQualidade = aoMudarQualidade(() => {
    medir();
    if (cena3d && telaReplay && !telaReplay.hidden) cena3d.medir();
  });

  // ---------- ligações ----------
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__partida = { semente, dificuldade, cobrancas, defesas, gestosCobranca, gestosDefesa, fase: () => fase.tipo, estado: () => fase, tempos: () => temposDeQuadro, abrirParOuImpar: () => abrirParOuImpar() };
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
  root.querySelector('.voltar')?.addEventListener('click', () => irPara({ tela: 'lances', aba: 'penaltis' }));
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
    pararDeOuvirQualidade();
    if (usarTimer) clearTimeout(raf);
    else cancelAnimationFrame(raf);
    window.removeEventListener('resize', aoRedimensionar);
  };
}
