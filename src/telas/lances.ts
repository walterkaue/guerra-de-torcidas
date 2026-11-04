// Lances do Jogo (docs/jogo.md, seção 7.3): hub com três abas. Pênaltis abre o jogo de sempre (telas/partida.ts,
// valendo pontos), livre ou com o cenário de uma disputa histórica (seção 6); Faltas e Cara a cara têm o álbum
// (filtro de clube, ficha, partida de 3 e treino). A partida de 3 vale pontos na pré-temporada, lance a lance com
// o servidor (função `lances`, como os pênaltis): a semente nunca vem para o celular, cada chute manda o gesto e a
// bola só sai quando o resultado chega. Caiu a conexão: a partida segue aqui, sem valer pontos. O treino roda
// só no celular. Quem decide o lance é o motor puro (jogo/lances.ts); aqui é escolha, gesto e desenho,
// na cena 3D (telas/cena3d.ts) com a câmera de cada tipo (telas/camera.ts).

import { esc, irPara, type Rota } from '../app';
import { LANCES } from '../dados/lances';
import { ID_OUTRO, TIMES, corDeTexto, proTime, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { sementeNova } from '../jogo/aleatorio';
import { desenharCardLances } from '../jogo/cardLances';
import { prontoParaDesenhar, seloNivel } from '../jogo/card';
import type { FechamentoLances } from '../jogo/lancesPartida';
import {
  AVISO_LIMITE_DO_DIA,
  emojisDaPartida,
  linhaValendoHoje,
  situacaoDoResultado,
  textoDaMedalhaNova,
  textoDeCompartilhar,
} from '../jogo/lancesTextos';
import type { Desempenho } from '../jogo/posicao';
import * as SERVIDOR from '../servidor/api';
import { ErroServidor } from '../servidor/api';
import { comMotivo } from '../servidor/motivo';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { mostrarCarreiraNoResultado, nivelParaCard } from './carreira';
import { abas, aoTocarNoEstado, cabecalhoTela, estado, faixa, marcarAba, numero, placa, selo } from './blocos';
import { ligarEfeitoNoRanking } from './efeitoRanking';
import { contar, htmlResultado, htmlSelosDaPosicao, ligarResultado } from './resultadoPadrao';
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
import { SELECAO, TORCIDA_SELECAO, coresDoAdversario, roupaDoBatedorGoleiro } from '../dados/coresDosLances';
import { contraAdversario } from '../dados/adversarios';
import { DISPUTAS } from '../dados/disputas';
import { chamadaDaDisputa, disputasDoTorcedor, type Disputa } from '../jogo/disputas';
import { criarBoneco, novaPose, type Boneco, poseChute, poseComemora, poseLamenta, poseParado, sortearAparencia, uniformesDaPartida } from './bonecos';
import { ENQUADRAMENTOS } from './camera';
import { facil, limitar01 } from './cena';
import { criarCena3d } from './cena3d';
import { ANTES_DO_CORTE, criarReplay, montarTarjaDoReplay, type Replay } from './replay';
import { icone, type NomeIcone } from './icones';
import { aoMudarQualidade, medirQuadros, qualidade } from './qualidade';

// Em desenvolvimento, ?lancesFalsos troca o servidor por um de mentira (src/dev/lancesFalsos.ts).
const FALSO = import.meta.env.DEV && new URLSearchParams(location.search).has('lancesFalsos');
type Servidor = Pick<typeof SERVIDOR, 'novaPartidaLances' | 'lanceDoJogo' | 'meusLancesHoje'>;
const servidor = (): Promise<Servidor> => (FALSO ? import('../dev/lancesFalsos') : Promise.resolve(SERVIDOR));

// O código do motivo vai no fim (servidor/motivo.ts), como nos pênaltis.
export const AVISO_SEM_PONTOS = 'Sem conexão: essa partida não vale pontos.';
export const AVISO_CAIU = 'Caiu a conexão: essa partida não vale mais pontos.';
const SITE = 'https://torcida.kauewalter.com.br';

export type AbaLances = 'penaltis' | 'falta' | 'finalizacao';
const ABAS: { id: AbaLances; texto: string }[] = [
  { id: 'penaltis', texto: 'Pênaltis' },
  { id: 'falta', texto: 'Faltas' },
  { id: 'finalizacao', texto: 'Cara a cara' },
];

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
  // ?disputasFalsas enche a lista em desenvolvimento, enquanto o catálogo está em rascunho (src/dev/disputasFalsas.ts).
  let catalogoDisputas: readonly Disputa[] = DISPUTAS;
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('disputasFalsas')) {
    void import('../dev/disputasFalsas').then((m) => {
      catalogoDisputas = m.DISPUTAS_FALSAS;
      if (aba === 'penaltis' && root.querySelector('.lances-conteudo')) conteudo();
    });
  }

  /** Uma disputa da lista: tocar abre a ficha e o botão de jogar, como no álbum. */
  function itemDaDisputa(d: Disputa): string {
    const clube = clubeDoLance(d.clube);
    return `<li class="lance placa filete" style="${estilo(clube.cores)}">
      <button type="button" class="lance-topo" aria-expanded="false">
        <span class="lance-titulo">${esc(d.titulo)}</span>
        <span class="lance-meta">${esc(contraAdversario(d.adversario))} · ${d.data.slice(0, 4)}</span>
        <span class="lance-pontos disputa-placar">${esc(d.placar)}</span>
      </button>
      <div class="lance-ficha" hidden>
        <p>${esc(d.ficha)}</p>
        <p class="lance-situacao">${esc(chamadaDaDisputa(d))}</p>
        <button type="button" class="botao botao-sec" data-disputa="${esc(d.id)}">Jogar essa disputa</button>
      </div>
    </li>`;
  }

  // ---------- hub ----------
  function hub(): void {
    limparJogo?.();
    limparJogo = null;
    root.innerHTML = `
      <main class="tela lances" style="${estilo(time.cores)}">
        ${cabecalhoTela({ titulo: 'Lances do Jogo', voltar: true })}
        ${abas('aba', ABAS, aba, 1)}
        <div class="lances-conteudo"></div>
      </main>`;
    root.querySelectorAll<HTMLButtonElement>('[data-aba]').forEach((b) =>
      b.addEventListener('click', () => {
        aba = b.dataset.aba as AbaLances;
        marcarAba(root, 'aba', aba);
        conteudo();
      }),
    );
    root.querySelector('[data-voltar]')!.addEventListener('click', () => irPara({ tela: 'inicio' }));
    conteudo();
  }

  function conteudo(): void {
    const el = root.querySelector<HTMLElement>('.lances-conteudo')!;
    if (aba === 'penaltis') {
      const { doTime, daSelecao } = disputasDoTorcedor(catalogoDisputas, time.id);
      const secao = (rotulo: string, lista: Disputa[]) =>
        lista.length ? `<div class="lances-bloco">${faixa(rotulo, 'h3')}<ul class="lista-lances">${lista.map(itemDaDisputa).join('')}</ul></div>` : '';
      const historicas =
        secao(`Disputas históricas ${time.artigo === 'a' ? 'da' : 'do'} ${time.nome}`, doTime) + secao('Disputas históricas da Seleção', daSelecao);
      el.innerHTML = `
        <p class="lances-linha">Pênaltis valem pontos como sempre.</p>
        ${placa(
          `<div>
            <p class="lance-titulo">Disputa livre</p>
            <p class="lance-meta">Bate 5, pega 5, contra a máquina. Empatou? Morte súbita.</p>
          </div>
          <button class="botao" type="button" data-acao="disputa-livre">Bater a disputa livre</button>`,
          { filete: true },
        )}
        ${
          historicas ||
          `<div class="lances-bloco">${faixa('Disputas históricas', 'h3')}${placa(
            estado('vazio', 'Em breve', {
              detalhe: 'Disputas de pênaltis que o seu time venceu, contra o adversário de verdade, e as da Seleção.',
            }),
          )}</div>`
        }`;
      el.querySelectorAll('[data-acao="disputa-livre"]').forEach((b) => b.addEventListener('click', () => irPara({ tela: 'partida' })));
      el.querySelectorAll<HTMLButtonElement>('.lance-topo').forEach((b) =>
        b.addEventListener('click', () => {
          const aberto = b.getAttribute('aria-expanded') === 'true';
          b.setAttribute('aria-expanded', String(!aberto));
          b.nextElementSibling?.toggleAttribute('hidden', aberto);
        }),
      );
      el.querySelectorAll<HTMLButtonElement>('[data-disputa]').forEach((b) =>
        b.addEventListener('click', () => {
          const disputa = catalogoDisputas.find((d) => d.id === b.dataset.disputa);
          if (disputa) irPara({ tela: 'partida', disputa });
        }),
      );
      return;
    }
    const tipo = aba;
    const doTipo = LANCES.filter((l) => l.tipo === tipo);
    const clubes = [...new Set(doTipo.map((l) => l.clube))]
      .map((id) => ({ id, nome: clubeDoLance(id).nome }))
      .sort((a, b) => (a.id === 'selecao' ? 1 : b.id === 'selecao' ? -1 : a.nome.localeCompare(b.nome)));
    if (filtroClube !== 'todos' && !clubes.some((c) => c.id === filtroClube)) filtroClube = 'todos';
    el.innerHTML = `
      <p class="lances-linha">Monte uma partida de 3. Gol no canto do lance de verdade vale +${BONUS_RECRIOU}.</p>
      <label class="lances-clube">
        <span>Clube</span>
        <select data-filtro="clube">
          <option value="todos">Todos os clubes</option>
          ${clubes.map((c) => `<option value="${c.id}"${c.id === filtroClube ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
        </select>
      </label>
      <ul class="lista-lances" aria-live="polite"></ul>
      ${placa(
        `<p class="valendo-hoje" data-valendo-hoje hidden></p>
        <div class="slots"></div>
        <button class="botao" type="button" data-acao="jogar" disabled>Jogar os 3</button>`,
        { classe: 'sua-partida aperta', attrs: 'aria-label="Sua partida"' },
      )}`;

    const lista = el.querySelector<HTMLElement>('.lista-lances')!;
    const slots = el.querySelector<HTMLElement>('.slots')!;
    const botaoJogar = el.querySelector<HTMLButtonElement>('[data-acao="jogar"]')!;

    function desenharLista(): void {
      const visiveis = doTipo.filter((l) => filtroClube === 'todos' || l.clube === filtroClube);
      lista.innerHTML = visiveis.length
        ? visiveis
            .map((l) => {
              const clube = clubeDoLance(l.clube);
              return `<li class="lance placa filete" style="${estilo(clube.cores)}">
                <button type="button" class="lance-topo" aria-expanded="false" data-id="${l.id}">
                  <span class="lance-titulo">${esc(l.titulo)}</span>
                  <span class="lance-meta">${esc(clube.nome)} · ${l.data.slice(0, 4)} · ${esc(situacaoDoLance(l).split(',')[0])}</span>
                  <span class="lance-pontos faixa-${l.faixa}">${pontosDaFaixa(l.faixa)}</span>
                </button>
                <div class="lance-ficha" hidden>
                  <p>${esc(l.ficha)}</p>
                  <div class="numeros dois">
                    ${numero(`${Math.round(distanciaDoLance(l))}<small>m</small>`, 'Distância')}
                    ${numero(`+${PONTOS_FAIXA[l.faixa]}`, `Gol ${ROTULO_FAIXA[l.faixa].toLowerCase()}`, 'destaque')}
                  </div>
                  <p class="lance-situacao">${esc(situacaoDoLance(l))}</p>
                  <div class="lance-acoes">
                    <button type="button" class="botao-linha" data-acao="treinar" data-id="${l.id}">Treinar</button>
                    <button type="button" class="botao botao-sec" data-acao="por" data-id="${l.id}">Pôr na partida</button>
                  </div>
                </div>
              </li>`;
            })
            .join('')
        : `<li>${estado('vazio', 'Nenhum lance desse clube ainda.', { detalhe: 'Tenta outro!', acao: 'Ver todos os clubes' })}</li>`;
      aoTocarNoEstado(lista, () => {
        filtroClube = 'todos';
        el.querySelector<HTMLSelectElement>('[data-filtro="clube"]')!.value = 'todos';
        desenharLista();
      });
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
    // "Valendo hoje: 2 de 6": sem resposta do servidor, a linha não aparece.
    const elHoje = el.querySelector<HTMLElement>('[data-valendo-hoje]')!;
    void servidor()
      .then((s) => s.meusLancesHoje())
      .then((h) => {
        const linha = linhaValendoHoje(h);
        if (linha && elHoje.isConnected) {
          elHoje.textContent = linha;
          elHoje.hidden = false;
        }
      })
      .catch(() => {});
  }

  // ---------- resultado ----------
  function resultado(lances: Lance[], resultados: ResultadoLance[], frase: string | null, fim: FechamentoLances | null, aviso: string | null): void {
    limparJogo?.();
    limparJogo = null;
    const pontos = resultados.reduce((s, r) => s + r.pontos, 0);
    const valendo = !!fim;
    const outro = time.id === ID_OUTRO;
    const paraTime = proTime(time);
    const apelido = prefs.get().apelido;
    const desempenho: Desempenho | null = fim?.desempenho
      ? { posicao: fim.desempenho.posicao, total: fim.desempenho.total, recorde: fim.desempenho.recorde, novoRecorde: fim.desempenho.novo_recorde }
      : null;
    const situacao = situacaoDoResultado({
      fechou: valendo,
      aviso: aviso ?? undefined,
      contaNoRanking: fim?.contaNoRanking ?? false,
      sobSuspeita: fim?.sobSuspeita ?? false,
      melhorDoDia: fim?.melhorDoDia ?? null,
    });
    const tituloDe = (id: string) => (lances.find((l) => l.id === id) ?? LANCES.find((l) => l.id === id))?.titulo ?? 'do jogo';
    const medalhas = (fim?.medalhas ?? []).map((m) => textoDaMedalhaNova(m.medalha, tituloDe(m.lanceId)));
    const link = `${SITE}/?time=${time.id}`;
    const textoShare = textoDeCompartilhar({
      desfechos: resultados.map((r) => r.desfecho),
      pontos,
      paraTime,
      link,
      medalha: medalhas[0] ?? null,
    });

    const gols = resultados.filter((r) => r.desfecho === 'gol').length;
    const recriou = resultados.filter((r) => r.recriou).length;
    const esperaRanking = !!fim && situacao.tipo === 'ranking' && !outro;
    const emoji = [
      '⚽ Guerra de Torcidas · Lances do Jogo',
      `${emojisDaPartida(resultados.map((r) => r.desfecho))} · ${pontos} ${pontos === 1 ? 'ponto' : 'pontos'}${paraTime ? ` ${paraTime}` : ''}`,
      link,
    ].join('\n');

    root.innerHTML = htmlResultado({
      time,
      classe: `resultado lances-resultado ${gols > 0 ? 'venceu' : 'perdeu'}`,
      rotulo: 'Lances do Jogo',
      titulo: 'Fim de jogo',
      ganhou: gols > 0,
      placar: `<section class="res-placar faixa-tv" aria-label="Gols">
          <div><span class="rotulo">Gols</span><strong>${gols}</strong></div>
          <em>de</em>
          <div><span class="rotulo">Lances</span><strong>${lances.length}</strong></div>
        </section>`,
      pontos: { total: pontos, paraTime },
      detalhe: placa(
        `<ul class="resumo-lances">
          ${lances
            .map((l, i) => {
              const r = resultados[i];
              return `<li><span class="emoji">${icone(ICONE[r.desfecho])}</span>
                <span class="resumo-titulo">${esc(l.titulo)}<small>${esc(legenda(r))}</small></span>
                <strong>${r.pontos ? `+${r.pontos}` : '0'}</strong></li>`;
            })
            .join('')}
        </ul>
        ${recriou ? `<div class="numeros dois">${numero(String(recriou), recriou === 1 ? 'Lance recriado' : 'Lances recriados', 'destaque')}</div>` : ''}
        <button type="button" class="botao-linha" data-acao="album">Escolher outros</button>`,
        { titulo: `Seus ${lances.length} lances`, filete: true },
      ),
      frases: frase ? [frase] : [],
      aviso: situacao.texto ? { texto: situacao.texto, forte: !valendo } : null,
      selos:
        htmlSelosDaPosicao(desempenho, 'lances') +
        medalhas.map((t) => selo(`${icone('estrela')} ${esc(t)}`, 'ouro')).join('') +
        (esperaRanking ? selo('No ranking em 1 min', undefined, 'data-selo-ranking') : '') +
        (valendo && situacao.tipo === 'ranking' && outro ? selo('Contou pro ranking') : ''),
      zap: `https://wa.me/?text=${encodeURIComponent(textoShare)}`,
      maisUma: 'Jogar de novo',
    });
    contar(root.querySelector<HTMLElement>('[data-contador]'), pontos);
    root.querySelector('[data-acao="album"]')!.addEventListener('click', hub);

    // XP da carreira e posição: só quando o servidor fechou a partida (o XP sai de lá).
    if (fim)
      mostrarCarreiraNoResultado(
        root.querySelector<HTMLElement>('[data-carreira]'),
        // Em desenvolvimento, ?homeFalsa lê a carreira de mentira (src/dev/homeFalsa.ts).
        import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa')
          ? () => import('../dev/homeFalsa').then((m) => m.minhaCarreira())
          : undefined,
      );
    // Efeito no ranking: selo "No ranking em 1 min" que vira "Subiu de 5º pra 3º" (mesmo fluxo dos pênaltis).
    let pararEfeito: (() => void) | null = null;
    if (esperaRanking && fim) {
      pararEfeito = ligarEfeitoNoRanking(
        { selo: root.querySelector<HTMLElement>('[data-selo-ranking]'), nota: root.querySelector<HTMLElement>('[data-nota]')! },
        { timeId: time.id, semana: fim.semana, confirmadaEm: fim.confirmadaEm, antes: fim.ranking.antes },
      );
    }
    limparJogo = () => pararEfeito?.();

    // Card "Telão do estádio": o Card, o Stories e o Link saem do resultado padrão.
    const card = (async () => {
      await prontoParaDesenhar();
      const canvas = desenharCardLances({
        time,
        apelido,
        paraTime,
        frase: frase ?? '',
        novoRecorde: !!desempenho?.novoRecorde,
        link: link.replace('https://', ''),
        pontos,
        lances: lances.map((l, i) => ({ titulo: l.titulo, desfecho: resultados[i].desfecho, recriou: resultados[i].recriou, pontos: resultados[i].pontos })),
        medalha: medalhas[0] ?? null,
      });
      const nivel = await nivelParaCard();
      if (nivel) seloNivel(canvas, nivel);
      return canvas;
    })();
    ligarResultado(root, {
      card,
      textoShare,
      link,
      emoji,
      maisUma: () => jogo(lances, false),
      inicio: () => irPara({ tela: 'inicio' }),
    });
  }

  /** Já jogou as partidas valendo de hoje: avisa e oferece o treino (que segue liberado). */
  function limiteDoDia(lances: Lance[]): void {
    limparJogo?.();
    limparJogo = null;
    const distintos = lances.filter((l, i) => lances.findIndex((o) => o.id === l.id) === i);
    root.innerHTML = `
      <main class="tela lances-limite" style="${estilo(time.cores)}">
        ${cabecalhoTela({ titulo: 'Lances do Jogo', voltar: true })}
        <p class="res-aviso forte" role="status">${esc(AVISO_LIMITE_DO_DIA)}</p>
        <div class="lances-bloco">
          ${faixa('Treinar', 'h3')}
          <ul class="lista-lances">
            ${distintos
              .map(
                (l) => `<li class="lance placa filete" style="${estilo(clubeDoLance(l.clube).cores)}">
                  <button type="button" class="lance-topo" data-treinar="${esc(l.id)}">
                    <span class="lance-titulo">${esc(l.titulo)}</span>
                    <span class="lance-meta">${esc(clubeDoLance(l.clube).nome)} · ${esc(situacaoDoLance(l).split(',')[0])}</span>
                  </button>
                </li>`,
              )
              .join('')}
          </ul>
        </div>
        <button type="button" class="botao" data-acao="album">Escolher outros</button>
      </main>`;
    root.querySelector('[data-voltar]')!.addEventListener('click', hub);
    root.querySelector('[data-acao="album"]')!.addEventListener('click', hub);
    root.querySelectorAll<HTMLButtonElement>('[data-treinar]').forEach((b) =>
      b.addEventListener('click', () => {
        const l = lances.find((o) => o.id === b.dataset.treinar);
        if (l) jogo([l], true);
      }),
    );
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
        <p class="aviso-partida" hidden></p>
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
    // Valendo: lance a lance com o servidor (a semente fica lá). Sem servidor, ou se cair a conexão no meio,
    // o motor local assume com a semente de cima e a partida fica sem valer pontos.
    let preparando = !treino;
    let servidorOk = false;
    let partidaId: string | null = null;
    let goleiroServidor: number | null = null;
    let goleiroProximo: number | null = null;
    let fechamento: FechamentoLances | null = null;
    let aviso: string | null = null;
    let indice = 0;
    let tentativa = 0;
    const resultados: ResultadoLance[] = [];
    type Fase =
      | { tipo: 'chegada'; inicio: number }
      | { tipo: 'mirar'; inicio: number }
      /** Esperando o servidor: ao preparar a partida ou, com `chutando`, o resultado do chute (o pé já corre). */
      | { tipo: 'espera'; inicio: number; chutando: boolean }
      | { tipo: 'chute'; inicio: number; r: ResultadoLance; em: (t: number) => { x: number; y: number; z: number }; dur: number }
      | { tipo: 'pausa'; inicio: number; r: ResultadoLance; em: (t: number) => { x: number; y: number; z: number }; dur: number }
      | { tipo: 'replay'; replay: Replay };
    let fase: Fase = treino ? { tipo: 'mirar', inicio: relogio() } : { tipo: 'espera', inicio: relogio(), chutando: false };
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
      cena.trocarTorcida(l.clube === 'selecao' ? TORCIDA_SELECAO : undefined);
      cena.definirLance(l.bola, l.tipo === 'falta' ? ENQUADRAMENTOS.falta : ENQUADRAMENTOS.caraACara);
      rastro = [];
      elInstrucao.textContent = `${l.titulo} · ${situacaoDoLance(l)}`;
      if (preparando) {
        fase = { tipo: 'espera', inicio: relogio(), chutando: false };
        elJogada.hidden = true;
        elInstrucao.textContent = 'Preparando a partida…';
      } else if (l.tipo === 'finalizacao' && l.chegada && !reduzido) {
        fase = { tipo: 'chegada', inicio: relogio() };
        elJogada.querySelector('span')!.textContent = l.chegada;
        elJogada.hidden = false;
      } else {
        elJogada.hidden = true;
        fase = { tipo: 'mirar', inicio: relogio() };
      }
      atualizarHud();
    }

    function mostrarAviso(texto: string): void {
      aviso = texto;
      const el = root.querySelector<HTMLElement>('.aviso-partida')!;
      el.textContent = texto;
      el.hidden = false;
    }

    /** O servidor não respondeu: a partida segue aqui, sem valer pontos, com o código do motivo. */
    function caiuALigacao(e: unknown): void {
      console.warn('Lances sem servidor:', e instanceof ErroServidor ? e.codigo : e);
      servidorOk = false;
      fechamento = null;
      mostrarAviso(comMotivo(AVISO_CAIU, e));
    }

    /** Anima o chute com o resultado já decidido (do servidor ou do motor local). `esperaMs`: o pé já estava correndo. */
    function comecarChute(r: ResultadoLance, gq: GestoCobranca, l: Lance, esperaMs: number): void {
      const em = caminhoDoLance(l, gq, r);
      // Duração pelo tamanho do caminho (cavadinha e bola fraca, mais devagar).
      const dist = Math.hypot(em(r.tFim).x - l.bola.x, em(r.tFim).z - l.bola.z);
      const dur = Math.max(450, (dist / METROS_POR_MS) * (r.cavadinha || gq.forca < 32 ? 1.8 : 1));
      fase = { tipo: 'chute', inicio: relogio() - Math.min(esperaMs, DUR_BATIDA), r, em, dur };
      elInstrucao.textContent = '';
      elJogada.hidden = true;
      somChute();
    }

    /** Valendo: manda o gesto e só solta a bola quando o resultado chega (a espera cabe no pé encontrando a bola). */
    async function pedirAoServidor(gq: GestoCobranca, l: Lance, i: number): Promise<void> {
      const antes = relogio();
      fase = { tipo: 'espera', inicio: antes, chutando: true };
      elInstrucao.textContent = '';
      elJogada.hidden = true;
      try {
        const resp = await (await servidor()).lanceDoJogo(partidaId!, i, gq);
        if (acabou) return;
        if (i === LANCES_POR_PARTIDA - 1) {
          if (!resp.fim) throw new ErroServidor('sem_resultado');
          fechamento = resp.fim;
        }
        goleiroProximo = resp.goleiroProximo;
        comecarChute(resp.lance, gq, l, relogio() - antes);
      } catch (e) {
        if (acabou) return;
        caiuALigacao(e);
        comecarChute(resolverLance(semente, indice, l, gq), gq, l, relogio() - antes);
      }
    }

    function chutar(gesto: GestoCobranca): void {
      const gq = normalizarCobranca(gesto);
      const l = atual();
      if (!treino && servidorOk && partidaId) void pedirAoServidor(gq, l, indice);
      else comecarChute(resolverLance(semente, indiceDoSorteio(), l, gq), gq, l, 0);
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
      if (indice < lances.length) {
        if (servidorOk && goleiroProximo !== null) goleiroServidor = goleiroProximo;
        comecarLance();
      } else {
        acabou = true;
        somApito(true);
        const pontos = resultados.reduce((s, r) => s + r.pontos, 0);
        resultado(lances, resultados, narrador.falar('lance_fim', { pontos }), servidorOk ? fechamento : null, aviso);
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
      // Valendo, onde o goleiro começa vem do servidor (a semente não está aqui); antes da resposta, no meio.
      const x0 = !treino && (preparando || servidorOk) ? (goleiroServidor ?? 0) : goleiroAntesDoChute(semente, indiceDoSorteio(), l);
      switch (fase.tipo) {
        case 'chegada':
        case 'espera':
        case 'mirar': {
          const k = posicaoDoGoleiro(x0);
          cena.desenharGoleiro(goleiro, k.x, k.z, agora);
          cena.desenharTraves();
          if (l.barreira) cena.desenharBarreira(l.barreira, barreira, poseParado(agora, poseBarreira));
          if (fase.tipo === 'espera' && fase.chutando) {
            const ms = agora - fase.inicio;
            cena.desenharBatedor(batedor, poseChute(Math.min(ms, DUR_BATIDA), false, poseBatedor), facil(limitar01(ms / DUR_BATIDA)));
          } else cena.desenharBatedor(batedor, poseParado(agora, poseBatedor));
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

    /** Valendo: pede a partida ao servidor. Sem resposta, segue local e sem valer pontos. */
    async function iniciarValendo(): Promise<void> {
      try {
        const api = await servidor();
        const ids = lances.map((l) => l.id);
        // Time e apelido precisam estar no servidor; sessão nova (aparelho limpo) regrava.
        if (!FALSO) await sincronizarTorcedor();
        let r;
        try {
          r = await api.novaPartidaLances(ids);
        } catch (e) {
          if (!(e instanceof ErroServidor) || e.codigo !== 'sem_time') throw e;
          await sincronizarTorcedor(true);
          r = await api.novaPartidaLances(ids);
        }
        if (acabou) return;
        partidaId = r.partidaId;
        goleiroServidor = r.goleiroX;
        servidorOk = true;
      } catch (e) {
        if (acabou) return;
        if (e instanceof ErroServidor && e.codigo === 'saiu_da_conta') return;
        if (e instanceof ErroServidor && e.codigo === 'limite_do_dia') return limiteDoDia(lances);
        console.warn('Partida sem valer pontos:', e instanceof ErroServidor ? e.codigo : e);
        mostrarAviso(
          e instanceof ErroServidor && e.codigo === 'muitas_partidas'
            ? 'Calma! Muitas partidas em 1 minuto: esta não vale pontos.'
            : comMotivo(AVISO_SEM_PONTOS, e),
        );
      }
      preparando = false;
      comecarLance();
    }

    cena.medir();
    comecarLance();
    if (treino) narrar(null, 'Treino: tente quantas vezes quiser');
    else narrar(narrador.falar('lance_abertura'));
    somApito();
    if (!treino) void iniciarValendo();
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

  // Em desenvolvimento, deixa abrir o resultado com dados de mentira pelo console (conferência visual).
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__lancesResultado = resultado;
  hub();
  return () => limparJogo?.();
}
