// Lances do Jogo (docs/jogo.md, seção 7.3): álbum com filtros, partida de 3 lances e treino.
// Em teste: roda só no celular e ainda não vale pontos (o servidor entra depois). Quem decide o lance é o
// motor puro (jogo/lances.ts); aqui é escolha, gesto e desenho, na mesma cena dos pênaltis (telas/cena.ts).

import { esc, irPara, type Rota } from '../app';
import { LANCES } from '../dados/lances';
import { TIMES, corDeTexto, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { sementeNova } from '../jogo/aleatorio';
import {
  BONUS_RECRIOU,
  LANCES_POR_PARTIDA,
  PONTOS_FAIXA,
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
import {
  criarBoneco,
  desenharBoneco,
  novaPose,
  poseChute,
  poseComemora,
  poseLamenta,
  poseParado,
  sortearAparencia,
  uniformesDaPartida,
} from './bonecos';
import { criarCena, facil, limitar01 } from './cena';

export const AVISO_EM_TESTE = 'Em teste: os Lances ainda não valem pontos.';

/** A Seleção entra como coleção extra, aberta a todos (só nome e cores). */
const SELECAO = { nome: 'Seleção', cores: ['#ffd200', '#00843d'] as [string, string] };
const ROTULO_FAIXA: Record<Faixa, string> = { facil: 'Fácil', media: 'Média', dificil: 'Difícil', craque: 'Craque' };
type FiltroTipo = 'todos' | Lance['tipo'];
const TIPOS: { id: FiltroTipo; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'falta', rotulo: 'Faltas' },
  { id: 'finalizacao', rotulo: 'Cara a cara' },
];

const DUR_BATIDA = 190;
const DUR_CHUTE = 700;
const DUR_CAVADINHA = 1050;
const DUR_PULO = 420;
const DUR_PAUSA = 1800;
const DIST_BARREIRA = 9.15;

/** Nome e cores do clube de um lance (id de times.ts ou "selecao"). */
export function clubeDoLance(clube: string): { nome: string; cores: readonly [string, string] } {
  if (clube === 'selecao') return SELECAO;
  return timePorId(clube) ?? SELECAO;
}

const distanciaDoLance = (l: Lance) => Math.hypot(l.bola.x, l.bola.z);

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

const EMOJI: Record<ResultadoLance['desfecho'], string> = { gol: '⚽', defesa: '🧤', barreira: '🧱', trave: '❌', fora: '❌' };

const relogio = () => performance.now();

export function telaLances(root: HTMLElement, _rota: Rota): () => void {
  const time: Time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  const estilo = (cores: readonly [string, string]) => `--c1:${cores[0]};--c2:${cores[1]};--txt:${corDeTexto(cores[0])}`;
  let escolhidos: Lance[] = [];
  let filtroClube = LANCES.some((l) => l.clube === time.id) ? time.id : 'todos';
  let filtroTipo: FiltroTipo = 'todos';
  let limparJogo: (() => void) | null = null;

  // ---------- álbum ----------
  function album(): void {
    limparJogo?.();
    limparJogo = null;
    const clubes = [...new Set(LANCES.map((l) => l.clube))]
      .map((id) => ({ id, nome: clubeDoLance(id).nome }))
      .sort((a, b) => (a.id === 'selecao' ? 1 : b.id === 'selecao' ? -1 : a.nome.localeCompare(b.nome)));
    root.innerHTML = `
      <main class="tela lances" style="${estilo(time.cores)}">
        <header class="cabecalho">
          <button class="voltar" type="button" aria-label="Voltar">‹</button>
          <h2>Lances do Jogo</h2>
        </header>
        <p class="lances-intro">Escolha 3 lances (pode repetir) e recrie a história. Gol no mesmo canto do lance de verdade vale +${BONUS_RECRIOU}.</p>
        <p class="lances-aviso rotulo" role="note">${esc(AVISO_EM_TESTE)}</p>
        <div class="lances-filtros">
          <label class="lances-clube">
            <span class="rotulo">Clube</span>
            <select data-filtro="clube">
              <option value="todos">Todos os clubes</option>
              ${clubes.map((c) => `<option value="${c.id}"${c.id === filtroClube ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
            </select>
          </label>
          <div class="lances-tipos" role="radiogroup" aria-label="Tipo de lance">
            ${TIPOS.map((t) => `<button type="button" role="radio" aria-checked="${t.id === filtroTipo}" data-tipo="${t.id}">${t.rotulo}</button>`).join('')}
          </div>
        </div>
        <ul class="lista-lances" aria-live="polite"></ul>
        <section class="sua-partida" aria-label="Sua partida">
          <div class="slots"></div>
          <button class="botao" type="button" data-acao="jogar" disabled>Jogar os 3</button>
        </section>
      </main>`;

    const lista = root.querySelector<HTMLElement>('.lista-lances')!;
    const slots = root.querySelector<HTMLElement>('.slots')!;
    const botaoJogar = root.querySelector<HTMLButtonElement>('[data-acao="jogar"]')!;

    function desenharLista(): void {
      const visiveis = LANCES.filter((l) => (filtroClube === 'todos' || l.clube === filtroClube) && (filtroTipo === 'todos' || l.tipo === filtroTipo));
      lista.innerHTML = visiveis.length
        ? visiveis
            .map((l) => {
              const clube = clubeDoLance(l.clube);
              return `<li class="lance" style="${estilo(clube.cores)}">
                <button type="button" class="lance-topo" aria-expanded="false" data-id="${l.id}">
                  <span class="lance-titulo">${esc(l.titulo)}</span>
                  <span class="lance-meta">${esc(clube.nome)} · ${l.data.slice(0, 4)} · ${l.tipo === 'falta' ? 'Falta' : 'Cara a cara'}</span>
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
        : '<li class="vazio">Nenhum lance com esses filtros ainda. Tenta outro clube!</li>';
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
      if (!alvo) return;
      const lance = LANCES.find((l) => l.id === alvo.dataset.id);
      if (!lance) return;
      if (alvo.classList.contains('lance-topo')) {
        const aberto = alvo.getAttribute('aria-expanded') === 'true';
        alvo.setAttribute('aria-expanded', String(!aberto));
        alvo.nextElementSibling?.toggleAttribute('hidden', aberto);
      } else if (alvo.dataset.acao === 'por') {
        if (escolhidos.length >= LANCES_POR_PARTIDA) escolhidos.shift();
        escolhidos.push(lance);
        desenharSlots();
      } else if (alvo.dataset.acao === 'treinar') {
        jogo([lance], true);
      }
    });
    slots.addEventListener('click', (e) => {
      const slot = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
      if (!slot) return;
      escolhidos.splice(Number(slot.dataset.slot), 1);
      desenharSlots();
    });
    root.querySelector('[data-filtro="clube"]')!.addEventListener('change', (e) => {
      filtroClube = (e.target as HTMLSelectElement).value;
      desenharLista();
    });
    root.querySelectorAll<HTMLButtonElement>('[data-tipo]').forEach((b) =>
      b.addEventListener('click', () => {
        filtroTipo = b.dataset.tipo as FiltroTipo;
        root.querySelectorAll('[data-tipo]').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
        desenharLista();
      }),
    );
    botaoJogar.addEventListener('click', () => jogo([...escolhidos], false));
    root.querySelector('.voltar')!.addEventListener('click', () => irPara({ tela: 'inicio' }));
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
              return `<li><span class="emoji" aria-hidden="true">${EMOJI[r.desfecho]}</span>
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
    root.querySelector('.voltar')!.addEventListener('click', album);
    root.querySelector('[data-acao="album"]')!.addEventListener('click', album);
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
        <div class="grito" aria-live="assertive">
          <p class="grito-frase"></p>
          <p class="grito-sub rotulo"></p>
        </div>
      </main>`;

    const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
    const elInstrucao = root.querySelector<HTMLElement>('.instrucao')!;
    const elGrito = root.querySelector<HTMLElement>('.grito')!;
    const elFrase = root.querySelector<HTMLElement>('.grito-frase')!;
    const elSub = root.querySelector<HTMLElement>('.grito-sub')!;
    const elMudo = root.querySelector<HTMLButtonElement>('.mudo')!;
    const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cena = criarCena(canvas, { cores: time.cores, relogio, reduzido });
    const { c, g, efeitos, telaX, telaY, lerArraste, comemorar, desenharTraves, goleiroNoQuadro, desenharGoleiroNoQuadro } = cena;
    const { escBatedor, desenharBatedorEm, desenharBola, desenharBolaEmVoo, desenharRastro, trajetoria, desenharPontos } = cena;
    const narrador = criarNarrador(time, prefs.get().apelido);

    // Elenco sorteado com o gerador do visual (nunca a semente): você contra a máquina.
    const u = uniformesDaPartida(time.cores, null, Math.random() < 0.5 ? 0 : 1);
    const batedor = criarBoneco(sortearAparencia(), u.jogador, false);
    const goleiro = criarBoneco(sortearAparencia(), u.goleiroAdversario, true);
    const barreira = Array.from({ length: 6 }, () => criarBoneco(sortearAparencia(), u.adversario, true));
    const poseBatedor = novaPose();
    const poseBarreira = novaPose();

    let semente = sementeNova();
    let indice = 0;
    let tentativa = 0;
    const resultados: ResultadoLance[] = [];
    type Fase =
      | { tipo: 'mirar'; inicio: number }
      | { tipo: 'chute'; inicio: number; r: ResultadoLance; gesto: GestoCobranca }
      | { tipo: 'pausa'; inicio: number; r: ResultadoLance };
    let fase: Fase = { tipo: 'mirar', inicio: relogio() };
    let rastro: { x: number; y: number }[] = [];
    let acabou = false;

    const atual = () => lances[treino ? 0 : indice];
    /** Índice do sorteio: na partida é o lance; no treino, cada tentativa sorteia de novo. */
    const indiceDoSorteio = () => (treino ? tentativa : indice);

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
      elMudo.textContent = prefs.get().mudo ? '🔇' : '🔊';
    }

    function mirar(): void {
      fase = { tipo: 'mirar', inicio: relogio() };
      rastro = [];
      const l = atual();
      elInstrucao.textContent = `${l.titulo} · ${situacaoDoLance(l)}`;
      atualizarHud();
    }

    function chutar(gesto: GestoCobranca): void {
      const gq = normalizarCobranca(gesto);
      const r = resolverLance(semente, indiceDoSorteio(), atual(), gq);
      fase = { tipo: 'chute', inicio: relogio(), r, gesto: gq };
      elInstrucao.textContent = '';
      somChute();
    }

    function fimDoChute(r: ResultadoLance, alvo: { x: number; y: number }): void {
      fase = { tipo: 'pausa', inicio: relogio(), r };
      narrar(narrador.falar(eventoDoLance(r), { etiquetas: etiquetasDoLance(r) }), legenda(r));
      if (r.desfecho === 'gol') comemorar(alvo.x, alvo.y, r.pontos, true);
      somTorcida(r.desfecho === 'gol' ? 'festa' : 'uuuh');
      if (!treino) resultados.push(r);
      atualizarHud();
    }

    function proximo(): void {
      if (treino) {
        tentativa++;
        semente = sementeNova();
        mirar();
        return;
      }
      indice++;
      if (indice < lances.length) mirar();
      else {
        acabou = true;
        somApito(true);
        const pontos = resultados.reduce((s, r) => s + r.pontos, 0);
        resultado(lances, resultados, narrador.falar('lance_fim', { pontos }));
      }
    }

    // ---------- desenho do lance ----------
    /** Goleiro adiantado (cara a cara) fica maior e mais perto; na falta, no lado sorteado. */
    function transformarGoleiro(x0: number) {
      const l = atual();
      const frac = Math.min(0.6, (l.goleiroSaida ?? 0) / distanciaDoLance(l));
      const k = 1 + frac * 1.4;
      const cx = telaX(0);
      const dx = telaX(x0) - cx;
      const dy = (g.bolaY - g.chao) * frac * 0.9;
      return {
        aplicar: () => {
          c.translate(cx + dx, g.chao + dy);
          c.scale(k, k);
          c.translate(-cx, -g.chao);
        },
        ponto: (p: { x: number; y: number }) => ({ x: cx + dx + (p.x - cx) * k, y: g.chao + dy + (p.y - g.chao) * k }),
      };
    }

    function desenharGoleiro(x0: number, zona: number | null, t: number, agora: number, queda = -1, pegou = false): void {
      const tr = transformarGoleiro(x0);
      c.save();
      tr.aplicar();
      desenharGoleiroNoQuadro(goleiro, zona, t, agora, queda, pegou);
      c.restore();
    }

    /** Onde a barreira aparece: a 9,15 m da bola, na linha entre a bola e o ponto do gol que ela tapa. */
    function barreiraNaTela() {
      const l = atual();
      if (!l.barreira) return null;
      const t = Math.min(0.8, DIST_BARREIRA / distanciaDoLance(l));
      const alvoX = telaX(Math.max(-1, Math.min(1, l.barreira.miraX / 3.66)));
      const escGoleiro = (g.gh * 0.8) / 100;
      const escala = escBatedor() + (escGoleiro - escBatedor()) * t;
      return {
        x: g.bolaX + (alvoX - g.bolaX) * t,
        base: g.bolaY + (g.chao - g.bolaY) * t,
        escala,
        n: l.barreira.jogadores,
      };
    }

    function desenharBarreira(agora: number): void {
      const b = barreiraNaTela();
      if (!b) return;
      poseParado(agora, poseBarreira);
      const passo = 22 * b.escala;
      for (let k = 0; k < b.n; k++) {
        const x = b.x + (k - (b.n - 1) / 2) * passo;
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.beginPath();
        c.ellipse(x, b.base + 1, 13 * b.escala, 3 * b.escala, 0, 0, Math.PI * 2);
        c.fill();
        c.save();
        c.translate(x, b.base);
        c.scale(b.escala, b.escala);
        desenharBoneco(c, barreira[k], poseBarreira);
        c.restore();
      }
    }

    const batedorX = (avanco: number) => g.bolaX - g.raio * (3.3 - 0.9 * avanco);
    const batedorY = (avanco: number) => g.bolaY + g.raio * (1.5 - 0.2 * avanco);

    /** Para onde a bola vai na tela: luva, barreira ou o ponto do motor. */
    function alvoDaBola(r: ResultadoLance, agora: number, dur: number) {
      if (r.desfecho === 'defesa') {
        const tr = transformarGoleiro(r.goleiroX);
        const q = goleiroNoQuadro(goleiro, r.zonaBola, (dur - dur * 0.15) / DUR_PULO, agora);
        return tr.ponto({ x: q.luvaX, y: q.luvaY });
      }
      if (r.desfecho === 'barreira') {
        const b = barreiraNaTela()!;
        return { x: b.x + (telaX(r.x) - g.bolaX) * 0.15, y: b.base - 75 * b.escala };
      }
      return { x: telaX(r.x), y: telaY(r.y) };
    }

    function quadro(agora: number): void {
      if (acabou) return;
      c.save();
      cena.desenharFundo(agora);
      const l = atual();
      switch (fase.tipo) {
        case 'mirar': {
          desenharGoleiro(goleiroAntesDoChute(semente, indiceDoSorteio(), l), null, 0, agora);
          desenharTraves();
          desenharBarreira(agora);
          desenharBola(g.bolaX, g.bolaY);
          desenharBatedorEm(batedor, batedorX(0), batedorY(0), poseParado(agora, poseBatedor));
          desenharRastro(rastro);
          break;
        }
        case 'chute': {
          const { r, gesto } = fase;
          const ms = agora - fase.inicio;
          const dur = r.cavadinha ? DUR_CAVADINHA : DUR_CHUTE;
          const t = limitar01((ms - DUR_BATIDA) / dur);
          const tPulo = (t * dur - dur * 0.15) / DUR_PULO;
          // Defesa: pula e alcança. Gol: pula, mas não chega. Barreira, trave e fora: fica.
          const zona = r.desfecho === 'defesa' || r.desfecho === 'gol' ? r.zonaBola : null;
          desenharGoleiro(r.goleiroX, zona, r.desfecho === 'gol' ? Math.min(tPulo, 0.55) : tPulo, agora);
          desenharTraves();
          desenharBarreira(agora);
          const avanco = facil(limitar01(ms / DUR_BATIDA));
          desenharBatedorEm(batedor, batedorX(avanco), batedorY(avanco), poseChute(ms, r.cavadinha, poseBatedor));
          const alvo = alvoDaBola(r, agora, dur);
          desenharBolaEmVoo((tt) => trajetoria(alvo.x, alvo.y, gesto.efeito, facil(tt), r.cavadinha), t);
          if (t >= 1) fimDoChute(r, alvo);
          break;
        }
        case 'pausa': {
          const { r } = fase;
          const ms = agora - fase.inicio;
          const pegou = r.desfecho === 'defesa';
          const zona = r.desfecho === 'defesa' || r.desfecho === 'gol' ? r.zonaBola : null;
          desenharGoleiro(r.goleiroX, zona, r.desfecho === 'gol' ? 0.55 : 1, agora, zona === null ? -1 : ms, pegou);
          desenharTraves();
          desenharBarreira(agora);
          desenharBatedorEm(batedor, batedorX(1), batedorY(1), r.desfecho === 'gol' ? poseComemora(ms, poseBatedor) : poseLamenta(ms, poseBatedor));
          const alvo = alvoDaBola(r, agora, DUR_CHUTE);
          if (r.desfecho === 'barreira') desenharBola(alvo.x, barreiraNaTela()!.base - g.raio * 0.4, 0.6, barreiraNaTela()!.base - g.raio * 0.4);
          else if (r.desfecho !== 'fora') cena.bolaParada(alvo.x, alvo.y);
          if (ms >= DUR_PAUSA) proximo();
          break;
        }
      }
      desenharPontos(agora);
      c.restore();
      raf = requestAnimationFrame(() => quadro(relogio()));
    }

    // ---------- gestos ----------
    const ponto = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    canvas.addEventListener('pointerdown', (e) => {
      destravarSom();
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
      const gesto = lerArraste(rastro);
      rastro = [];
      if (gesto) chutar(gesto);
      else elInstrucao.textContent = 'Arraste da bola pra cima, na direção do gol.';
    });
    canvas.addEventListener('pointercancel', () => (rastro = []));

    root.querySelector('.voltar')!.addEventListener('click', album);
    elMudo.addEventListener('click', () => {
      prefs.set({ mudo: !prefs.get().mudo });
      atualizarHud();
    });
    const aoRedimensionar = () => cena.medir();
    window.addEventListener('resize', aoRedimensionar);

    cena.medir();
    mirar();
    if (treino) narrar(null, 'Treino: tente quantas vezes quiser');
    else narrar(narrador.falar('lance_abertura'));
    somApito();
    efeitos.ola = -Infinity;
    let raf = requestAnimationFrame(() => quadro(relogio()));
    limparJogo = () => {
      acabou = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', aoRedimensionar);
    };
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__lances = { fase: () => fase.tipo, resultados };
    }
  }

  album();
  return () => limparJogo?.();
}
