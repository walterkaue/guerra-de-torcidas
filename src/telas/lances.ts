// Lances do Jogo (docs/jogo.md, seção 7.3): hub com três abas. Pênaltis abre o jogo de sempre (telas/partida.ts,
// valendo pontos); Faltas e Cara a cara têm o álbum (filtro de clube, ficha, partida de 3 e treino), em teste e
// ainda sem valer pontos. Quem decide o lance é o motor puro (jogo/lances.ts); aqui é escolha, gesto e desenho,
// na cena 3D (telas/cena3d.ts) com a câmera de cada tipo (telas/camera.ts).

import { esc, irPara, type Rota } from '../app';
import { LANCES } from '../dados/lances';
import { TIMES, corDeTexto, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { sementeNova } from '../jogo/aleatorio';
import {
  BONUS_RECRIOU,
  LANCES_POR_PARTIDA,
  PONTOS_FAIXA,
  caminhoDoLance,
  goleiroAntesDoChute,
  resolverLance,
  type Faixa,
  type Lance,
  type ResultadoLance,
} from '../jogo/lances';
import { normalizarCobranca, type GestoCobranca } from '../jogo/penaltis';
import { destravarSom, somApito, somChute, somTorcida } from '../jogo/som';
import { etiquetasDoLance, eventoDoLance } from '../narrador/lance';
import { criarNarrador } from '../narrador/sessao';
import { coresDoAdversario, roupaDoBatedorGoleiro } from '../dados/coresDosLances';
import { criarBoneco, novaPose, type Boneco, poseChute, poseComemora, poseLamenta, poseParado, sortearAparencia, uniformesDaPartida } from './bonecos';
import { ENQUADRAMENTOS } from './camera';
import { facil, limitar01 } from './cena';
import { criarCena3d } from './cena3d';
import { ANTES_DO_CORTE, criarReplay, montarTarjaDoReplay, type Replay } from './replay';
import { icone, type NomeIcone } from './icones';
import { aoMudarQualidade, medirQuadros, qualidade } from './qualidade';

export const AVISO_EM_TESTE = 'Em teste: Faltas e Cara a cara ainda não valem pontos.';

export type AbaLances = 'penaltis' | 'falta' | 'finalizacao';
const ABAS: { id: AbaLances; rotulo: string; nota: string }[] = [
  { id: 'penaltis', rotulo: 'Pênaltis', nota: 'valendo' },
  { id: 'falta', rotulo: 'Faltas', nota: 'em teste' },
  { id: 'finalizacao', rotulo: 'Cara a cara', nota: 'em teste' },
];

/** A Seleção entra como coleção extra, aberta a todos (só nome e cores). */
const SELECAO = { nome: 'Seleção', cores: ['#ffd200', '#00843d'] as [string, string] };
const ROTULO_FAIXA: Record<Faixa, string> = { facil: 'Fácil', media: 'Média', dificil: 'Difícil', craque: 'Craque' };

const DUR_BATIDA = 190;
/** Velocidade do desenho da bola: metros por milissegundo (o voo de uma falta de 25 m leva ~1 s). */
const METROS_POR_MS = 0.026;
const DUR_PULO = 420;
const DUR_PAUSA = 1800;
/** Depois de um gol, o replay de TV entra antes (a frase do narrador continua por cima). */
const DUR_ANTES_DO_REPLAY = 1100;
/** "A jogada" no cara a cara: a bola chega até o pé antes do chute. */
const DUR_CHEGADA = 1300;

/** Nome e cores do clube de um lance (id de times.ts ou "selecao"). */
export function clubeDoLance(clube: string): { nome: string; cores: readonly [string, string] } {
  if (clube === 'selecao') return SELECAO;
  return timePorId(clube) ?? SELECAO;
}

const distanciaDoLance = (l: Lance) => Math.hypot(l.bola.x, l.bola.z);

/** Batedor nas cores do clube do lance, barreira e goleiro nas do adversário de verdade. */
function elencoDoLance(l: Lance): { batedor: Boneco; goleiro: Boneco; barreira: Boneco[] } {
  const u = uniformesDaPartida(clubeDoLance(l.clube).cores, coresDoAdversario(l.adversario), 0);
  return {
    batedor: criarBoneco(sortearAparencia(), roupaDoBatedorGoleiro(l.id) ?? u.jogador, false),
    goleiro: criarBoneco(sortearAparencia(), u.goleiroAdversario, true),
    barreira: Array.from({ length: 6 }, () => criarBoneco(sortearAparencia(), u.adversario, true)),
  };
}

/** Uma linha do que o lance pede: tipo, distância, lado e barreira ou goleiro. */
export function situacaoDoLance(l: Lance): string {
  const d = Math.round(distanciaDoLance(l));
  const lado = Math.abs(l.bola.x) < 3 ? 'de frente' : l.bola.x > 0 ? 'pela direita' : 'pela esquerda';
  if (l.tipo === 'falta') return `Falta a ${d} m, ${lado}, barreira de ${l.barreira?.jogadores ?? 0}`;
  return `Cara a cara a ${d} m, ${lado}${(l.goleiroSaida ?? 0) >= 3 ? ', goleiro saindo' : ''}`;
}

const pontosDaFaixa = (f: Faixa) => `${ROTULO_FAIXA[f]} · ${PONTOS_FAIXA[f]}`;

function legenda(r: ResultadoLance): string {
  if (r.desfecho === 'gol') return r.recriou ? `Recriou o lance! · +${r.pontos}` : `Gol · +${r.pontos}`;
  if (r.desfecho === 'barreira') return 'Na barreira';
  if (r.desfecho === 'defesa') return 'O goleiro pegou';
  return r.desfecho === 'trave' ? 'Na trave' : 'Pra fora';
}

const ICONE: Record<ResultadoLance['desfecho'], NomeIcone> = { gol: 'bola', defesa: 'mao', barreira: 'barreira', trave: 'xis', fora: 'xis' };

const relogio = () => performance.now();

export function telaLances(root: HTMLElement, rota: Rota): () => void {
  const time: Time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  const estilo = (cores: readonly [string, string]) => `--c1:${cores[0]};--c2:${cores[1]};--txt:${corDeTexto(cores[0])}`;
  let aba: AbaLances = rota.tela === 'lances' && rota.aba ? rota.aba : 'penaltis';
  let escolhidos: Lance[] = [];
  let filtroClube = LANCES.some((l) => l.clube === time.id) ? time.id : 'todos';
  let limparJogo: (() => void) | null = null;

  // ---------- hub ----------
  function hub(): void {
    limparJogo?.();
    limparJogo = null;
    root.innerHTML = `
      <main class="tela lances" style="${estilo(time.cores)}">
        <header class="cabecalho">
          <button class="voltar" type="button" aria-label="Voltar">‹</button>
          <h2>Lances do Jogo</h2>
        </header>
        <div class="lances-abas" role="tablist" aria-label="Tipo de lance">
          ${ABAS.map(
            (a) => `<button type="button" role="tab" aria-selected="${a.id === aba}" data-aba="${a.id}">${a.rotulo}<small>${a.nota}</small></button>`,
          ).join('')}
        </div>
        <div class="lances-conteudo"></div>
      </main>`;
    root.querySelectorAll<HTMLButtonElement>('[data-aba]').forEach((b) =>
      b.addEventListener('click', () => {
        aba = b.dataset.aba as AbaLances;
        root.querySelectorAll('[data-aba]').forEach((o) => o.setAttribute('aria-selected', String(o === b)));
        conteudo();
      }),
    );
    root.querySelector('.voltar')!.addEventListener('click', () => irPara({ tela: 'inicio' }));
    conteudo();
  }

  function conteudo(): void {
    const el = root.querySelector<HTMLElement>('.lances-conteudo')!;
    if (aba === 'penaltis') {
      el.innerHTML = `
        <p class="lances-aviso rotulo" role="note">Pênaltis valem pontos como sempre</p>
        <button type="button" class="lance-card" data-acao="disputa-livre">
          <span class="lance-titulo">Disputa livre</span>
          <span class="lance-meta">Bate 5, pega 5, contra a máquina. Empatou? Morte súbita.</span>
        </button>
        <p class="rotulo lances-secao">Disputas históricas</p>
        <p class="lance-card lance-card-breve">
          <span class="lance-titulo">Em breve</span>
          <span class="lance-meta">Disputas de pênaltis que o seu time venceu, contra o adversário de verdade, e as da Seleção.</span>
        </p>
        <button class="botao" type="button" data-acao="disputa-livre">Bater a disputa livre</button>`;
      el.querySelectorAll('[data-acao="disputa-livre"]').forEach((b) => b.addEventListener('click', () => irPara({ tela: 'partida' })));
      return;
    }
    const tipo = aba;
    const doTipo = LANCES.filter((l) => l.tipo === tipo);
    const clubes = [...new Set(doTipo.map((l) => l.clube))]
      .map((id) => ({ id, nome: clubeDoLance(id).nome }))
      .sort((a, b) => (a.id === 'selecao' ? 1 : b.id === 'selecao' ? -1 : a.nome.localeCompare(b.nome)));
    if (filtroClube !== 'todos' && !clubes.some((c) => c.id === filtroClube)) filtroClube = 'todos';
    el.innerHTML = `
      <p class="lances-intro">${
        tipo === 'falta'
          ? 'Passe por cima ou contorne a barreira e acerte o canto.'
          : 'A bola chega, o goleiro sai: escolha o canto ou tente a cavadinha.'
      } Monte uma partida de 3 (pode misturar faltas e cara a cara). Gol no canto do lance de verdade vale +${BONUS_RECRIOU}.</p>
      <p class="lances-aviso rotulo" role="note">${esc(AVISO_EM_TESTE)}</p>
      <label class="lances-clube">
        <span class="rotulo">Clube</span>
        <select data-filtro="clube">
          <option value="todos">Todos os clubes</option>
          ${clubes.map((c) => `<option value="${c.id}"${c.id === filtroClube ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
        </select>
      </label>
      <ul class="lista-lances" aria-live="polite"></ul>
      <section class="sua-partida" aria-label="Sua partida">
        <div class="slots"></div>
        <button class="botao" type="button" data-acao="jogar" disabled>Jogar os 3</button>
      </section>`;

    const lista = el.querySelector<HTMLElement>('.lista-lances')!;
    const slots = el.querySelector<HTMLElement>('.slots')!;
    const botaoJogar = el.querySelector<HTMLButtonElement>('[data-acao="jogar"]')!;

    function desenharLista(): void {
      const visiveis = doTipo.filter((l) => filtroClube === 'todos' || l.clube === filtroClube);
      lista.innerHTML = visiveis.length
        ? visiveis
            .map((l) => {
              const clube = clubeDoLance(l.clube);
              return `<li class="lance" style="${estilo(clube.cores)}">
                <button type="button" class="lance-topo" aria-expanded="false" data-id="${l.id}">
                  <span class="lance-titulo">${esc(l.titulo)}</span>
                  <span class="lance-meta">${esc(clube.nome)} · ${l.data.slice(0, 4)} · ${esc(situacaoDoLance(l).split(',')[0])}</span>
                  <span class="lance-pontos faixa-${l.faixa}">${pontosDaFaixa(l.faixa)}</span>
                </button>
                <div class="lance-ficha" hidden>
                  <p>${esc(l.ficha)}</p>
                  <p class="lance-situacao rotulo">${esc(situacaoDoLance(l))}</p>
                  <div class="dupla">
                    <button type="button" class="botao botao-sec" data-acao="treinar" data-id="${l.id}">Treinar</button>
                    <button type="button" class="botao" data-acao="por" data-id="${l.id}">Pôr na partida</button>
                  </div>
                </div>
              </li>`;
            })
            .join('')
        : '<li class="vazio">Nenhum lance desse clube ainda. Tenta outro!</li>';
    }

    function desenharSlots(): void {
      slots.innerHTML = Array.from({ length: LANCES_POR_PARTIDA }, (_, i) => {
        const l = escolhidos[i];
        return l
          ? `<button type="button" class="slot cheio" data-slot="${i}" style="${estilo(clubeDoLance(l.clube).cores)}" aria-label="Tirar ${esc(l.titulo)} da partida">${esc(l.titulo)}</button>`
          : `<span class="slot">Lance ${i + 1}</span>`;
      }).join('');
      botaoJogar.disabled = escolhidos.length < LANCES_POR_PARTIDA;
    }

    lista.addEventListener('click', (e) => {
      const alvo = (e.target as HTMLElement).closest<HTMLElement>('button');
      const lance = alvo && LANCES.find((l) => l.id === alvo.dataset.id);
      if (!alvo || !lance) return;
      if (alvo.classList.contains('lance-topo')) {
        const aberto = alvo.getAttribute('aria-expanded') === 'true';
        alvo.setAttribute('aria-expanded', String(!aberto));
        alvo.nextElementSibling?.toggleAttribute('hidden', aberto);
      } else if (alvo.dataset.acao === 'por') {
        if (escolhidos.length >= LANCES_POR_PARTIDA) escolhidos.shift();
        escolhidos.push(lance);
        desenharSlots();
      } else if (alvo.dataset.acao === 'treinar') jogo([lance], true);
    });
    slots.addEventListener('click', (e) => {
      const slot = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
      if (!slot) return;
      escolhidos.splice(Number(slot.dataset.slot), 1);
      desenharSlots();
    });
    el.querySelector('[data-filtro="clube"]')!.addEventListener('change', (e) => {
      filtroClube = (e.target as HTMLSelectElement).value;
      desenharLista();
    });
    botaoJogar.addEventListener('click', () => jogo([...escolhidos], false));
    desenharLista();
    desenharSlots();
  }

  // ---------- resultado ----------
  function resultado(lances: Lance[], resultados: ResultadoLance[], frase: string | null): void {
    limparJogo?.();
    limparJogo = null;
    const pontos = resultados.reduce((s, r) => s + r.pontos, 0);
    root.innerHTML = `
      <main class="tela lances-resultado" style="${estilo(time.cores)}">
        <header class="cabecalho">
          <button class="voltar" type="button" aria-label="Voltar">‹</button>
          <h2>Lances do Jogo</h2>
        </header>
        <section class="placar-lances faixa-tv">
          <p class="rotulo">Sua partida</p>
          <strong>${pontos}</strong>
          <span class="rotulo">pontos</span>
        </section>
        ${frase ? `<p class="adesivo">${esc(frase)}</p>` : ''}
        <ul class="resumo-lances">
          ${lances
            .map((l, i) => {
              const r = resultados[i];
              return `<li><span class="emoji">${icone(ICONE[r.desfecho])}</span>
                <span class="resumo-titulo">${esc(l.titulo)}<small>${esc(legenda(r))}</small></span>
                <strong>${r.pontos ? `+${r.pontos}` : '0'}</strong></li>`;
            })
            .join('')}
        </ul>
        <p class="lances-aviso rotulo" role="note">${esc(AVISO_EM_TESTE)}</p>
        <div class="dupla">
          <button type="button" class="botao botao-sec" data-acao="album">Escolher outros</button>
          <button type="button" class="botao" data-acao="denovo">Jogar de novo</button>
        </div>
      </main>`;
    root.querySelector('.voltar')!.addEventListener('click', hub);
    root.querySelector('[data-acao="album"]')!.addEventListener('click', hub);
    root.querySelector('[data-acao="denovo"]')!.addEventListener('click', () => jogo(lances, false));
  }

  // ---------- jogo ----------
  function jogo(lances: Lance[], treino: boolean): void {
    limparJogo?.();
    root.innerHTML = `
      <main class="partida lances-jogo" style="${estilo(time.cores)}">
        <header class="hud">
          <button class="voltar" type="button" aria-label="Voltar ao álbum">‹</button>
          <div class="lances-placar">
            <span class="rotulo" data-contagem></span>
            <strong data-pontos>${treino ? 'Treino' : '0'}</strong>
          </div>
          <button class="mudo" type="button" aria-label="Som"></button>
        </header>
        <canvas class="campo-jogo"></canvas>
        <p class="instrucao" aria-live="polite"></p>
        <div class="jogada" hidden><b class="rotulo">A jogada</b><span></span></div>
        <div class="grito" aria-live="assertive">
          <p class="grito-frase"></p>
          <p class="grito-sub rotulo"></p>
        </div>
      </main>`;

    const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
    const elInstrucao = root.querySelector<HTMLElement>('.instrucao')!;
    const elJogada = root.querySelector<HTMLElement>('.jogada')!;
    const elGrito = root.querySelector<HTMLElement>('.grito')!;
    const elFrase = root.querySelector<HTMLElement>('.grito-frase')!;
    const elSub = root.querySelector<HTMLElement>('.grito-sub')!;
    const elMudo = root.querySelector<HTMLButtonElement>('.mudo')!;
    const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cena = criarCena3d(canvas, { cores: time.cores, relogio, reduzido });
    const tarja = montarTarjaDoReplay(root.querySelector<HTMLElement>('main')!);
    const { c } = cena;
    const narrador = criarNarrador(time, prefs.get().apelido);

    // Cada lance veste os dois times dele; os rostos saem do gerador do visual (nunca da semente).
    let { batedor, goleiro, barreira } = elencoDoLance(lances[0]);
    let vestido = lances[0].id;
    const poseBatedor = novaPose();
    const poseBarreira = novaPose();

    let semente = sementeNova();
    let indice = 0;
    let tentativa = 0;
    const resultados: ResultadoLance[] = [];
    type Fase =
      | { tipo: 'chegada'; inicio: number }
      | { tipo: 'mirar'; inicio: number }
      | { tipo: 'chute'; inicio: number; r: ResultadoLance; em: (t: number) => { x: number; y: number; z: number }; dur: number }
      | { tipo: 'pausa'; inicio: number; r: ResultadoLance; em: (t: number) => { x: number; y: number; z: number }; dur: number }
      | { tipo: 'replay'; replay: Replay };
    let fase: Fase = { tipo: 'mirar', inicio: relogio() };
    let rastro: { x: number; y: number }[] = [];
    let acabou = false;

    const atual = () => lances[treino ? 0 : indice];
    /** Índice do sorteio: na partida é o lance; no treino, cada tentativa sorteia de novo. */
    const indiceDoSorteio = () => (treino ? tentativa : indice);
    /** Goleiro antes do chute: no lado sorteado (falta) ou adiantado na reta da bola (cara a cara). */
    function posicaoDoGoleiro(x0: number): { x: number; z: number } {
      const l = atual();
      const d = distanciaDoLance(l);
      const saida = l.goleiroSaida ?? 0.3;
      const gx = x0 * 3.66;
      return { x: gx + (l.bola.x - gx) * (saida / d), z: l.bola.z * (saida / d) };
    }

    function narrar(texto: string | null, sub = ''): void {
      if (!texto && !sub) return;
      elFrase.textContent = texto ?? sub;
      elSub.textContent = texto ? sub : '';
      elSub.hidden = !texto || !sub;
      elGrito.classList.remove('pulso');
      void elGrito.offsetWidth;
      elGrito.classList.add('pulso');
    }

    function atualizarHud(): void {
      root.querySelector('[data-contagem]')!.textContent = treino ? `Tentativa ${tentativa + 1}` : `Lance ${indice + 1} de ${lances.length}`;
      if (!treino) root.querySelector('[data-pontos]')!.textContent = `${resultados.reduce((s, r) => s + r.pontos, 0)} pts`;
      elMudo.innerHTML = icone(prefs.get().mudo ? 'mudo' : 'som');
    }

    /** Começa o lance: câmera do tipo, situação no topo e, no cara a cara, "A jogada" com a bola chegando. */
    function comecarLance(): void {
      if (atual().id !== vestido) {
        vestido = atual().id;
        ({ batedor, goleiro, barreira } = elencoDoLance(atual()));
      }
      const l = atual();
      cena.definirLance(l.bola, l.tipo === 'falta' ? ENQUADRAMENTOS.falta : ENQUADRAMENTOS.caraACara);
      rastro = [];
      elInstrucao.textContent = `${l.titulo} · ${situacaoDoLance(l)}`;
      if (l.tipo === 'finalizacao' && l.chegada && !reduzido) {
        fase = { tipo: 'chegada', inicio: relogio() };
        elJogada.querySelector('span')!.textContent = l.chegada;
        elJogada.hidden = false;
      } else {
        elJogada.hidden = true;
        fase = { tipo: 'mirar', inicio: relogio() };
      }
      atualizarHud();
    }

    function chutar(gesto: GestoCobranca): void {
      const gq = normalizarCobranca(gesto);
      const l = atual();
      const r = resolverLance(semente, indiceDoSorteio(), l, gq);
      const em = caminhoDoLance(l, gq, r);
      // Duração pelo tamanho do caminho (cavadinha e bola fraca, mais devagar).
      const dist = Math.hypot(em(r.tFim).x - l.bola.x, em(r.tFim).z - l.bola.z);
      const dur = Math.max(450, (dist / METROS_POR_MS) * (r.cavadinha || gq.forca < 32 ? 1.8 : 1));
      fase = { tipo: 'chute', inicio: relogio(), r, em, dur };
      elInstrucao.textContent = '';
      elJogada.hidden = true;
      somChute();
    }

    function fimDoChute(r: ResultadoLance, em: (t: number) => { x: number; y: number; z: number }, dur: number): void {
      fase = { tipo: 'pausa', inicio: relogio(), r, em, dur };
      narrar(narrador.falar(eventoDoLance(r), { etiquetas: etiquetasDoLance(r) }), legenda(r));
      if (r.desfecho === 'gol') {
        const q = cena.projetar(em(1));
        cena.comemorar(q.x, q.y, r.pontos);
      } else if (r.desfecho === 'trave') cena.baterNaTrave();
      somTorcida(r.desfecho === 'gol' ? 'festa' : 'uuuh');
      if (!treino) resultados.push(r);
      atualizarHud();
    }

    /** Replay de TV do gol: o mesmo chute, de trás do gol e em câmera lenta (telas/replay.ts). */
    function comecarReplay(r: ResultadoLance, em: (t: number) => { x: number; y: number; z: number }, dur: number): void {
      const l = atual();
      const k = posicaoDoGoleiro(r.goleiroX);
      const fim = em(r.tFim);
      const replay = criarReplay(
        cena,
        {
          bola: l.bola,
          enquadramento: l.tipo === 'falta' ? ENQUADRAMENTOS.falta : ENQUADRAMENTOS.caraACara,
          em: (t) => em(t * r.tFim),
          voo: dur,
          cavadinha: r.cavadinha,
          goleiro: { x: k.x, z: k.z, alvo: { x: fim.x, y: fim.y }, alcance: 0.55 },
          barreira: l.barreira,
          batedor,
          goleiroBoneco: goleiro,
          bonecosDaBarreira: barreira,
        },
        relogio(),
      );
      fase = { tipo: 'replay', replay };
    }

    function fimDoReplay(): void {
      if (fase.tipo !== 'replay') return;
      fase.replay.encerrar();
      tarja.sair();
      proximo();
    }

    function proximo(): void {
      if (treino) {
        tentativa++;
        semente = sementeNova();
        comecarLance();
        return;
      }
      indice++;
      if (indice < lances.length) comecarLance();
      else {
        acabou = true;
        somApito(true);
        const pontos = resultados.reduce((s, r) => s + r.pontos, 0);
        resultado(lances, resultados, narrador.falar('lance_fim', { pontos }));
      }
    }

    /** De onde a bola vem em "A jogada" (m): de trás, de um lado ou rebotando da área. */
    function origemDaChegada(l: Lance): { x: number; z: number; alto: number } {
      const { ux, uz, rx, rz } = cena.eixo();
      const b = l.bola;
      switch (l.chegadaDe) {
        case 'esquerda':
          return { x: b.x - rx * 12 - ux * 4, z: b.z - rz * 12 - uz * 4, alto: 2.5 };
        case 'direita':
          return { x: b.x + rx * 12 - ux * 4, z: b.z + rz * 12 - uz * 4, alto: 2.5 };
        case 'rebote':
          return { x: b.x * 0.3, z: 3, alto: 1.2 };
        default:
          return { x: b.x + ux * 5 - rx * 2, z: b.z + uz * 5 - rz * 2, alto: 0.6 };
      }
    }

    function quadro(agora: number): void {
      if (acabou) return;
      const inicioQuadro = performance.now();
      c.save();
      if (fase.tipo === 'replay') {
        const falta = fase.replay.quadro(agora);
        c.restore();
        if (falta <= ANTES_DO_CORTE) tarja.sair();
        if (falta <= 0) fimDoReplay();
        raf = requestAnimationFrame(() => quadro(relogio()));
        return;
      }
      cena.desenharFundo(agora);
      const l = atual();
      const x0 = goleiroAntesDoChute(semente, indiceDoSorteio(), l);
      switch (fase.tipo) {
        case 'chegada':
        case 'mirar': {
          const k = posicaoDoGoleiro(x0);
          cena.desenharGoleiro(goleiro, k.x, k.z, agora);
          cena.desenharTraves();
          if (l.barreira) cena.desenharBarreira(l.barreira, barreira, poseParado(agora, poseBarreira));
          cena.desenharBatedor(batedor, poseParado(agora, poseBatedor));
          if (fase.tipo === 'chegada') {
            const t = limitar01((agora - fase.inicio) / DUR_CHEGADA);
            const o = origemDaChegada(l);
            const e = facil(t);
            cena.desenharBola3d({ x: o.x + (l.bola.x - o.x) * e, y: Math.sin(e * Math.PI) * o.alto, z: o.z + (l.bola.z - o.z) * e }, t * 12);
            if (agora - fase.inicio >= DUR_CHEGADA + 700) {
              fase = { tipo: 'mirar', inicio: agora };
              elJogada.hidden = true;
            }
          } else {
            cena.desenharBola3d({ x: l.bola.x, y: 0, z: l.bola.z });
            cena.desenharRastro(rastro);
          }
          break;
        }
        case 'chute': {
          const { r, em, dur } = fase;
          const ms = agora - fase.inicio;
          const t = limitar01((ms - DUR_BATIDA) / dur);
          const tPulo = (t * dur - dur * 0.1) / DUR_PULO;
          const k = posicaoDoGoleiro(r.goleiroX);
          // Defesa: pula e alcança. Gol: pula, mas não chega. Barreira, trave e fora: fica.
          const fim = em(r.tFim);
          const alvo = r.desfecho === 'defesa' || r.desfecho === 'gol' ? { x: fim.x, y: fim.y } : null;
          cena.desenharGoleiro(goleiro, k.x, k.z, agora, alvo, tPulo, r.desfecho === 'gol' ? 0.55 : 1);
          cena.desenharTraves();
          if (l.barreira) cena.desenharBarreira(l.barreira, barreira, poseParado(agora, poseBarreira));
          const avanco = facil(limitar01(ms / DUR_BATIDA));
          cena.desenharBatedor(batedor, poseChute(ms, r.cavadinha, poseBatedor), avanco);
          const bola = em(t * r.tFim);
          cena.desenharBola3d(bola, t * 14);
          if (t >= 1) fimDoChute(r, em, dur);
          break;
        }
        case 'pausa': {
          const { r, em } = fase;
          const ms = agora - fase.inicio;
          const k = posicaoDoGoleiro(r.goleiroX);
          const fim = em(r.tFim);
          const pulou = r.desfecho === 'defesa' || r.desfecho === 'gol';
          cena.desenharGoleiro(goleiro, k.x, k.z, agora, pulou ? { x: fim.x, y: fim.y } : null, 1, r.desfecho === 'gol' ? 0.55 : 1, pulou ? ms : -1, r.desfecho === 'defesa');
          cena.desenharTraves();
          if (l.barreira) cena.desenharBarreira(l.barreira, barreira, poseParado(agora, poseBarreira));
          cena.desenharBatedor(batedor, r.desfecho === 'gol' ? poseComemora(ms, poseBatedor) : poseLamenta(ms, poseBatedor), 1);
          // A bola cai onde parou (na rede, na barreira, na luva) e fica no chão.
          const cai = limitar01(ms / 350);
          if (r.desfecho === 'trave' || r.desfecho === 'barreira') {
            // Volta para o campo quicando duas vezes, na direção de onde veio (só desenho).
            const t = limitar01(ms / 800);
            const e = facil(t);
            const volta = r.desfecho === 'trave' ? 4 : 2.5;
            const d = Math.hypot(l.bola.x - fim.x, l.bola.z - fim.z) || 1;
            cena.desenharBola3d(
              {
                x: fim.x + ((l.bola.x - fim.x) / d) * volta * e,
                y: fim.y * Math.abs(Math.cos(t * Math.PI * 1.5)) * (1 - t) * (1 - t),
                z: fim.z + ((l.bola.z - fim.z) / d) * volta * e,
              },
              t * 10,
            );
          } else if (r.desfecho !== 'fora') cena.desenharBola3d({ x: fim.x, y: fim.y * (1 - cai), z: r.desfecho === 'gol' ? -0.6 * cai : fim.z });
          const comReplay = r.desfecho === 'gol' && !reduzido && qualidade().replay;
          if (comReplay && ms >= DUR_ANTES_DO_REPLAY - ANTES_DO_CORTE) tarja.entrar();
          if (ms >= (comReplay ? DUR_ANTES_DO_REPLAY : DUR_PAUSA)) {
            if (comReplay) comecarReplay(r, fase.em, fase.dur);
            else proximo();
          }
          break;
        }
      }
      cena.desenharPontos(agora);
      c.restore();
      medidor.quadro(performance.now() - inicioQuadro);
      raf = requestAnimationFrame(() => quadro(relogio()));
    }

    // ---------- gestos ----------
    const ponto = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    canvas.addEventListener('pointerdown', (e) => {
      destravarSom();
      if (fase.tipo === 'replay') return fimDoReplay();
      if (fase.tipo !== 'mirar') return;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // alguns navegadores recusam a captura; o arraste segue funcionando
      }
      rastro = [ponto(e)];
    });
    canvas.addEventListener('pointermove', (e) => {
      if (fase.tipo !== 'mirar' || !rastro.length) return;
      const juntos = e.getCoalescedEvents?.() ?? [];
      for (const ev of juntos.length ? juntos : [e]) rastro.push(ponto(ev));
    });
    canvas.addEventListener('pointerup', (e) => {
      if (fase.tipo !== 'mirar' || !rastro.length) {
        rastro = [];
        return;
      }
      rastro.push(ponto(e));
      const gesto = cena.lerArraste(rastro);
      rastro = [];
      if (gesto) chutar(gesto);
      else elInstrucao.textContent = 'Arraste da bola na direção do gol.';
    });
    canvas.addEventListener('pointercancel', () => (rastro = []));

    root.querySelector('.voltar')!.addEventListener('click', hub);
    elMudo.addEventListener('click', () => {
      prefs.set({ mudo: !prefs.get().mudo });
      atualizarHud();
    });
    const aoRedimensionar = () => cena.medir();
    window.addEventListener('resize', aoRedimensionar);

    cena.medir();
    comecarLance();
    if (treino) narrar(null, 'Treino: tente quantas vezes quiser');
    else narrar(narrador.falar('lance_abertura'));
    somApito();
    // Qualidade automática: mede os quadros e, se o nível mudar, refaz o canvas.
    const medidor = medirQuadros();
    const pararDeOuvirQualidade = aoMudarQualidade(() => cena.medir());
    let raf = requestAnimationFrame(() => quadro(relogio()));
    limparJogo = () => {
      acabou = true;
      pararDeOuvirQualidade();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', aoRedimensionar);
    };
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__lances = { fase: () => fase.tipo, resultados };
    }
  }

  hub();
  return () => limparJogo?.();
}
