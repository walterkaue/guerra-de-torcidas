// Lances do Jogo (docs/jogo.md, seção 7.3 e 14.7). Antes do corte de 09/11/2026 (0h de Brasília): hub com três abas. Pênaltis abre o jogo de sempre (telas/partida.ts,
// valendo pontos), livre (até 08/11) ou com o cenário de uma disputa histórica (seção 6); Faltas e Cara a cara têm o álbum
// (filtro de clube, ficha, partida de 3 e treino). A partida de 3 vale pontos na pré-temporada, lance a lance com
// o servidor (função `lances`, como os pênaltis): a semente nunca vem para o celular, cada chute manda o gesto e a
// bola só sai quando o resultado chega. Caiu a conexão: a partida segue aqui, sem valer pontos. O treino roda
// só no celular. Quem decide o lance é o motor puro (jogo/lances.ts); aqui é escolha, gesto e desenho,
// na cena 3D (telas/cena3d.ts) com a câmera de cada tipo (telas/camera.ts).
//
// Depois do corte (`lancesUnificados()`, telas/corte.ts): tela única com filtros (tipo, clube, troféus, ⭐), cada
// item só com "Jogar", partida de 3 tentativas do mesmo lance, X1 por link (`rota.desafio`), limite do dia que
// vira treino na mesma partida e "Seus 3 melhores de hoje". A regra do jogo vem do servidor; aqui é escolha e desenho.

import { esc, irPara, type Rota } from '../app';
import { LANCES } from '../dados/lances';
import { ID_OUTRO, TIMES, corDeTexto, proTime, timePorId, type Time } from '../dados/times';
import { apelidoDoCard, prefs } from '../estado';
import { sementeNova } from '../jogo/aleatorio';
import { lancesUnificados } from './corte';
import { tipoDoJogo, type DadosDoCard } from '../jogo/cardPersonalizado';
import { linhaDoTorcedor } from '../jogo/cardTextos';
import { motivoDoConfete } from '../jogo/confete';
import type { FechamentoLances } from '../jogo/lancesPartida';
import {
  AVISO_LIMITE_DO_DIA,
  avisoLimiteDoDia,
  emojisDaPartida,
  faixaNaTela,
  linhaMelhoresDoDia,
  linhaValendoHoje,
  ordenarTelaUnica,
  situacaoDoResultado,
  textoDaMedalhaNova,
  textoDeCompartilhar,
} from '../jogo/lancesTextos';
import {
  LINHA_DO_HUB,
  TIPOS_DA_TELA,
  alvoDoX1,
  avisoDoErroDoX1,
  clubeInicial,
  clubeValido,
  clubesDoTipo,
  conviteLances,
  fraseNeutraDoX1,
  idsDoLanceDoDia,
  itensDaTelaUnica,
  itensDoFiltro,
  placarDoX1,
  rotuloDaTentativa,
  textoDaTentativa,
  tipoDaAba,
  type ItemUnico,
  type TipoDaTela,
} from '../jogo/lancesTelaUnica';
import { itemPenaltis, lanceDoDia } from '../jogo/regraLances';
import { diaBrasilia } from '../servidor/tempo';
import { escolherFrase } from '../narrador/escolher';
import { contextoDoTime } from '../narrador/sessao';
import type { Desempenho } from '../jogo/posicao';
import * as SERVIDOR from '../servidor/api';
import { ErroServidor, type PedidoLances } from '../servidor/api';
import { comMotivo, preencherAviso } from '../servidor/motivo';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { sorteadorDeFrase } from './cardPersonalizado';
import { mostrarCarreiraNoResultado, nivelParaCard } from './carreira';
import { abas, aoTocarNoEstado, cabecalhoTela, estado, faixa, marcarAba, numero, placa, selo, trilha } from './blocos';
import { ligarEfeitoNoRanking } from './efeitoRanking';
import { contar, htmlResultado, htmlSelosDaPosicao, ligarConfete, ligarResultado } from './resultadoPadrao';
import {
  BONUS_RECRIOU,
  LANCES_POR_PARTIDA,
  PONTOS_FAIXA,
  TABELA_LANCES_UNIFICADA,
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
import { criarRelogioPausavel } from '../jogo/telaDaPartida';
import { vigiarCelularDeitado } from './vireOCelular';
import { DICAS } from '../jogo/dicas';
import {
  bolaNaBarreira,
  cantosDaZona,
  cavadinhaPegaSemSair,
  goleiroPegouNoMeio,
  goleiroSaiu,
  golSemRecriar,
  primeiraDica,
} from '../jogo/dicasGatilhos';
import { dicasDoAparelho, mostrarDica, tirarDica } from './dicas';
import { abrirRegras } from './regras';
import { cardDoAlbum, criarMedalhasDoAlbum, favoritosDoAparelho, htmlFiltrosDoAlbum, marcarFavorito } from './albumLances';
import { abrirFicha, blocoDasMedalhas, type NumerosDoLance } from './fichaLance';
import { mostrarRumoDasMedalhas } from './rumoMedalhas';
import { filtrarAlbum, trilhaDoItem, type FiltroAlbum } from '../jogo/lancesTextos';
import { linkDoItem, textoDaDisputaParaMandar, textoDoLanceParaMandar } from '../jogo/mandarLance';

// Em desenvolvimento, ?lancesFalsos troca o servidor por um de mentira (src/dev/lancesFalsos.ts).
const FALSO = import.meta.env.DEV && new URLSearchParams(location.search).has('lancesFalsos');
type Servidor = Pick<typeof SERVIDOR, 'novaPartidaLances' | 'lanceDoJogo' | 'meusLancesHoje' | 'minhasMedalhas' | 'verDesafioLances'>;
const servidor = (): Promise<Servidor> => (FALSO ? import('../dev/lancesFalsos') : Promise.resolve(SERVIDOR));

// O código do motivo vai no fim (servidor/motivo.ts), como nos pênaltis.
export const AVISO_SEM_PONTOS = 'Sem conexão: essa partida não vale pontos.';
export const AVISO_CAIU = 'Caiu a conexão: essa não vale mais pontos. Joga de novo quando a rede voltar.';
const SITE = 'https://torcida.kauewalter.com.br';

/**
 * O servidor disse `atualize_o_app`: ele já está na regra nova e o relógio do aparelho atrasou. Daí em diante a tela
 * única vale, mesmo com o relógio antigo. Fica no módulo (vale até recarregar a página).
 */
let forcarTelaUnica = false;
const unificada = (): boolean => forcarTelaUnica || lancesUnificados();

/** Tira o código do X1 (`?l=`) do endereço, sem mexer no resto (em desenvolvimento, os ?lancesFalsos e ?corte ficam). */
function tirarCodigoDoEndereco(): void {
  try {
    const q = new URLSearchParams(location.search);
    q.delete('l');
    const resto = q.toString();
    history.replaceState(null, '', location.pathname + (resto ? `?${resto}` : '') + location.hash);
  } catch {
    // sem histórico (teste ou navegador restrito): o código fica no endereço, sem estrago
  }
}

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

const relogioDoAparelho = () => performance.now();

export function telaLances(root: HTMLElement, rota: Rota): () => void {
  const time: Time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  const estilo = (cores: readonly [string, string]) => `--c1:${cores[0]};--c2:${cores[1]};--txt:${corDeTexto(cores[0])}`;
  let aba: AbaLances = rota.tela === 'lances' && rota.aba ? rota.aba : 'penaltis';
  /** Tela única (depois do corte): o tipo do filtro abre pela aba da rota; sem aba, Todos. */
  let tipoTela: TipoDaTela = tipoDaAba(rota.tela === 'lances' ? rota.aba : undefined);
  /** null: ainda não escolheu; abre no clube da pessoa se ele tiver item. */
  let clubeTela: string | null = null;
  let refazerListaUnica: (() => void) | null = null;
  let fichaDaRotaAberta = false;
  let telaViva = true;
  let escolhidos: Lance[] = [];
  let filtroClube = LANCES.some((l) => l.clube === time.id) ? time.id : 'todos';
  let limparJogo: (() => void) | null = null;
  let filtroAlbum: FiltroAlbum = 'todos';
  const medalhasDoAlbum = criarMedalhasDoAlbum(() => servidor().then((s) => s.minhasMedalhas()));
  /** As partidas valendo do dia já foram (o servidor disse; 6 até 08/11, 10 depois): o treino e o álbum avisam. */
  let valendoEsgotado = false;
  // ?disputasFalsas enche a lista em desenvolvimento, enquanto o catálogo está em rascunho (src/dev/disputasFalsas.ts).
  let catalogoDisputas: readonly Disputa[] = DISPUTAS;
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('disputasFalsas')) {
    void import('../dev/disputasFalsas').then((m) => {
      catalogoDisputas = m.DISPUTAS_FALSAS;
      if (unificada()) refazerListaUnica?.();
      else if (aba === 'penaltis' && root.querySelector('.lances-conteudo')) conteudo();
    });
  }

  /** Os números da disputa nas medalhas, ou null se ainda não chegaram (ou falharam). */
  const numerosDaDisputa = (d: Disputa): NumerosDoLance | null =>
    medalhasDoAlbum.estado() === 'ok' ? (medalhasDoAlbum.mapa().get(itemPenaltis(d.id)) ?? { gols: 0, recriados: 0, vitorias: 0 }) : null;

  /** O bloco das medalhas da ficha da disputa: trilha, barra de Vitórias e o que falta pro ouro. */
  function medalhasDaFichaDaDisputa(d: Disputa): string {
    const situacao = medalhasDoAlbum.estado();
    return blocoDasMedalhas(situacao === 'carregando' ? 'carregando' : numerosDaDisputa(d), itemPenaltis(d.id));
  }

  /** Preenche (ou refaz) a trilha do card e o bloco da ficha de cada disputa da lista, sem fechar nenhuma ficha aberta. */
  function pintarMedalhasDasDisputas(el: ParentNode): void {
    el.querySelectorAll<HTMLElement>('[data-trilha-disputa]').forEach((alvo) => {
      const d = catalogoDisputas.find((x) => x.id === alvo.dataset.trilhaDisputa);
      const n = d && numerosDaDisputa(d);
      alvo.innerHTML = n ? trilha(trilhaDoItem(itemPenaltis(d.id), n), { compacta: true }) : '';
    });
    el.querySelectorAll<HTMLElement>('[data-medalhas-disputa]').forEach((alvo) => {
      const d = catalogoDisputas.find((x) => x.id === alvo.dataset.medalhasDisputa);
      if (d) alvo.innerHTML = medalhasDaFichaDaDisputa(d);
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
        <span data-trilha-disputa="${esc(d.id)}">${(() => {
          const n = numerosDaDisputa(d);
          return n ? trilha(trilhaDoItem(itemPenaltis(d.id), n), { compacta: true }) : '';
        })()}</span>
      </button>
      <div class="lance-ficha" hidden>
        <p>${esc(d.ficha)}</p>
        <p class="lance-situacao">${esc(chamadaDaDisputa(d))}</p>
        <div class="ficha-medalhas" data-medalhas-disputa="${esc(d.id)}">${medalhasDaFichaDaDisputa(d)}</div>
        <button type="button" class="botao botao-sec" data-disputa="${esc(d.id)}">Jogar essa disputa</button>
      </div>
    </li>`;
  }

  // ---------- hub ----------
  /** Antes do corte, o hub de 3 abas de sempre; depois, a tela única. */
  function hub(): void {
    if (unificada()) hubUnico();
    else hubAntes();
  }

  function hubAntes(): void {
    limparJogo?.();
    limparJogo = null;
    root.innerHTML = `
      <main class="tela lances" style="${estilo(time.cores)}">
        ${cabecalhoTela({
          titulo: 'Lances do Jogo',
          voltar: true,
          extra: '<button class="ajuda" type="button" data-regras aria-label="Regras e pontos">?</button>',
        })}
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
    root.querySelector('[data-regras]')!.addEventListener('click', () => abrirRegras(root, 'lances'));
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
      // As medalhas chegam depois: a trilha entra nos cards e nas fichas sem refazer a lista.
      if (historicas) {
        void medalhasDoAlbum.carregar().then(() => {
          if (el.isConnected && aba === 'penaltis') pintarMedalhasDasDisputas(el);
        });
      }
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
      ${htmlFiltrosDoAlbum(filtroAlbum)}
      <ul class="lista-lances" aria-live="polite"></ul>
      ${placa(
        `<p class="valendo-hoje" data-valendo-hoje hidden></p>
        <p class="faixa-dica" data-dica hidden aria-live="polite"></p>
        <div class="slots"></div>
        <button class="botao" type="button" data-acao="jogar" disabled>Jogar os 3</button>`,
        { classe: 'sua-partida aperta', attrs: 'aria-label="Sua partida"' },
      )}`;

    const lista = el.querySelector<HTMLElement>('.lista-lances')!;
    const slots = el.querySelector<HTMLElement>('.slots')!;
    const botaoJogar = el.querySelector<HTMLButtonElement>('[data-acao="jogar"]')!;

    function desenharLista(): void {
      const doClube = doTipo.filter((l) => filtroClube === 'todos' || l.clube === filtroClube);
      const situacaoMedalhas = medalhasDoAlbum.estado();
      const mapa = medalhasDoAlbum.mapa();
      const favs = favoritosDoAparelho();
      // Sem as medalhas lidas, "Todos" mostra o álbum sem trilha; os outros filtros esperam por elas.
      const semMedalhas = filtroAlbum !== 'todos' && situacaoMedalhas !== 'ok';
      const visiveis = semMedalhas ? [] : filtrarAlbum(doClube, situacaoMedalhas === 'ok' ? mapa : new Map(), filtroAlbum, favs);
      let acao: (() => void) | null = null;
      if (semMedalhas) {
        lista.innerHTML =
          situacaoMedalhas === 'erro'
            ? `<li>${estado('erro', 'Sem conexão com as medalhas agora.')}</li>`
            : `<li>${estado('carregando', 'Buscando as medalhas…')}</li>`;
        acao = () => {
          medalhasDoAlbum.esquecer();
          void carregarMedalhas();
          desenharLista();
        };
      } else if (visiveis.length) {
        lista.innerHTML = visiveis
          .map((l) => {
            const clube = clubeDoLance(l.clube);
            return cardDoAlbum({
              id: l.id,
              titulo: l.titulo,
              meta: `${clube.nome} · ${l.data.slice(0, 4)} · ${situacaoDoLance(l).split(',')[0]}`,
              pontos: pontosDaFaixa(l.faixa),
              faixa: l.faixa,
              estilo: estilo(clube.cores),
              favorito: favs.has(l.id),
              numeros: situacaoMedalhas === 'ok' ? (mapa.get(l.id) ?? { gols: 0, recriados: 0 }) : null,
            });
          })
          .join('');
      } else if (filtroAlbum === 'meus' && doClube.length) {
        lista.innerHTML = `<li>${estado('vazio', 'Nenhum troféu por aqui ainda.', { detalhe: 'Cinco gols no mesmo lance, em partida valendo, já dão o bronze.', acao: 'Ver todos os lances' })}</li>`;
        acao = () => {
          filtroAlbum = 'todos';
          marcarAba(el, 'album', 'todos');
          desenharLista();
        };
      } else {
        lista.innerHTML = `<li>${estado('vazio', 'Nenhum lance desse clube ainda.', { detalhe: 'Tenta outro!', acao: 'Ver todos os clubes' })}</li>`;
        acao = () => {
          filtroClube = 'todos';
          el.querySelector<HTMLSelectElement>('[data-filtro="clube"]')!.value = 'todos';
          desenharLista();
        };
      }
      if (acao) aoTocarNoEstado(lista, acao);
    }

    /** Lê as medalhas uma vez ao abrir o álbum; quando chegam (ou falham), a lista se refaz com as trilhas. */
    async function carregarMedalhas(): Promise<void> {
      await medalhasDoAlbum.carregar();
      if (lista.isConnected) desenharLista();
    }

    function abrirFichaDe(lance: Lance): void {
      const clube = clubeDoLance(lance.clube);
      abrirFicha({
        id: lance.id,
        titulo: lance.titulo,
        texto: lance.ficha,
        raiz: root,
        estilo: estilo(clube.cores),
        meta: `${clube.nome} · ${lance.data.slice(0, 4)} · ${pontosDaFaixa(lance.faixa)}`,
        situacao: situacaoDoLance(lance),
        favorito: favoritosDoAparelho().has(lance.id),
        medalhas: medalhasDoAlbum.paraAFicha(lance.id),
        aoFavoritar: (f) => {
          marcarFavorito(lance.id, f);
          if (lista.isConnected) desenharLista();
        },
        aoTreinar: () => jogo([lance], true),
        aoPor: () => {
          if (escolhidos.length >= LANCES_POR_PARTIDA) escolhidos.shift();
          escolhidos.push(lance);
          desenharSlots();
        },
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
      const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-ficha]');
      const lance = alvo && LANCES.find((l) => l.id === alvo.dataset.ficha);
      if (lance) abrirFichaDe(lance);
    });
    el.querySelector('[data-album]')?.parentElement?.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-album]');
      if (!b) return;
      filtroAlbum = b.dataset.album as FiltroAlbum;
      marcarAba(el, 'album', filtroAlbum);
      desenharLista();
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
    void carregarMedalhas();
    // "Valendo hoje: 2 de 6": sem resposta do servidor, a linha não aparece.
    const elHoje = el.querySelector<HTMLElement>('[data-valendo-hoje]')!;
    void servidor()
      .then((s) => s.meusLancesHoje())
      .then((h) => {
        const linha = linhaValendoHoje(h);
        if (linha && elHoje.isConnected) {
          elHoje.textContent = linha;
          elHoje.hidden = false;
          if (h && h.limite > 0 && h.feitas >= h.limite) {
            valendoEsgotado = true;
            const dicasDoHub = dicasDoAparelho();
            mostrarDica(el.querySelector<HTMLElement>('[data-dica]')!, dicasDoHub.pedir('lan_seis_valendo'));
          }
        }
      })
      .catch(() => {});
  }

  // ---------- tela única (depois do corte, jogo.md 14.7) ----------
  const itensDaTela = (): ItemUnico[] => itensDaTelaUnica(LANCES, catalogoDisputas);
  /** O Lance do Dia sorteia entre todos os itens: disputas e lances (a mesma lista da Home). */
  const idDoLanceDoDia = (): string | null => lanceDoDia(diaBrasilia(), idsDoLanceDoDia(LANCES, catalogoDisputas));
  const disputaDoItem = (id: string): Disputa | undefined => catalogoDisputas.find((d) => itemPenaltis(d.id) === id);
  const faixaDoCard = (l: Lance): string => {
    const f = faixaNaTela(l, true);
    return `${ROTULO_FAIXA[f.faixa]} · ${f.pontos}`;
  };
  const metaDaDisputa = (d: Disputa): string => `${clubeDoLance(d.clube).nome} · ${contraAdversario(d.adversario)} · ${d.data.slice(0, 4)}`;

  /** "Seus 3 melhores de hoje": três números; casa vazia, "Vaga" (decidido em 05/11/2026); sem resposta do servidor, "—". */
  function blocosDasMelhores(melhores: readonly number[] | null): string {
    const rotulos = ['Melhor', '2ª melhor', '3ª melhor'];
    return rotulos
      .map((rotulo, i) => {
        const v = melhores?.[i];
        return numero(v === undefined ? (melhores ? 'Vaga' : '—') : String(v), rotulo, v === undefined ? 'apagado' : i === 0 ? 'destaque' : undefined);
      })
      .join('');
  }

  function cardDoItem(it: ItemUnico, favs: ReadonlySet<string>, numeros: NumerosDoLance | null, idDoDia: string | null): string {
    const base = { id: it.id, favorito: favs.has(it.id), numeros };
    const d = disputaDoItem(it.id);
    if (d) {
      return cardDoAlbum({
        ...base,
        titulo: d.titulo,
        meta: metaDaDisputa(d),
        pontos: d.placar,
        pontosClasse: 'disputa-placar',
        selo: it.id === idDoDia ? 'Lance do Dia' : undefined,
        estilo: estilo(clubeDoLance(d.clube).cores),
      });
    }
    const l = LANCES.find((o) => o.id === it.id)!;
    const clube = clubeDoLance(l.clube);
    return cardDoAlbum({
      ...base,
      titulo: l.titulo,
      meta: `${clube.nome} · ${l.data.slice(0, 4)} · ${situacaoDoLance(l).split(',')[0]}`,
      pontos: faixaDoCard(l),
      faixa: faixaNaTela(l, true).faixa,
      selo: l.id === idDoDia ? 'Lance do Dia' : undefined,
      estilo: estilo(clube.cores),
    });
  }

  /** A partida valendo de um lance: 3 tentativas do mesmo lance. */
  const jogarLance = (l: Lance): void => jogo([l, l, l], false);

  function abrirFichaDoItem(id: string): void {
    const favorito = favoritosDoAparelho().has(id);
    const comum = {
      id,
      raiz: root,
      favorito,
      medalhas: medalhasDoAlbum.paraAFicha(id),
      aoFavoritar: (f: boolean) => {
        marcarFavorito(id, f);
        refazerListaUnica?.();
      },
    };
    const d = disputaDoItem(id);
    if (d) {
      abrirFicha({
        ...comum,
        titulo: d.titulo,
        texto: d.ficha,
        estilo: estilo(clubeDoLance(d.clube).cores),
        meta: `${metaDaDisputa(d)} · ${d.placar}`,
        situacao: chamadaDaDisputa(d),
        aoJogar: () => irPara({ tela: 'partida', disputa: d }),
        mandar: { texto: textoDaDisputaParaMandar(d.titulo), link: linkDoItem(id) },
      });
      return;
    }
    const l = LANCES.find((o) => o.id === id);
    if (!l) return;
    const clube = clubeDoLance(l.clube);
    abrirFicha({
      ...comum,
      titulo: l.titulo,
      texto: l.ficha,
      estilo: estilo(clube.cores),
      meta: `${clube.nome} · ${l.data.slice(0, 4)} · ${faixaDoCard(l)}`,
      situacao: situacaoDoLance(l),
      aoJogar: () => jogarLance(l),
      mandar: {
        texto: textoDoLanceParaMandar({ titulo: l.titulo, clube: clube.nome, adversario: l.adversario, data: l.data }),
        link: linkDoItem(id),
      },
    });
  }

  function hubUnico(): void {
    limparJogo?.();
    limparJogo = null;
    root.innerHTML = `
      <main class="tela lances lances-unica" style="${estilo(time.cores)}">
        ${cabecalhoTela({
          titulo: 'Lances do Jogo',
          voltar: true,
          extra: '<button class="ajuda" type="button" data-regras aria-label="Regras e pontos">?</button>',
        })}
        ${placa(
          `<div class="numeros tres" data-melhores>${blocosDasMelhores(null)}</div>
          <p class="valendo-hoje" data-valendo-hoje hidden></p>
          <p class="faixa-dica" data-dica hidden aria-live="polite"></p>`,
          { titulo: 'Seus 3 melhores de hoje', filete: true, classe: 'melhores-hoje' },
        )}
        <p class="lances-linha">${esc(LINHA_DO_HUB)}</p>
        ${abas('tipo', TIPOS_DA_TELA, tipoTela, 1)}
        <label class="lances-clube">
          <span>Clube</span>
          <select data-filtro="clube"></select>
        </label>
        ${htmlFiltrosDoAlbum(filtroAlbum)}
        <ul class="lista-lances" aria-live="polite"></ul>
      </main>`;
    const lista = root.querySelector<HTMLElement>('.lista-lances')!;
    const seletor = root.querySelector<HTMLSelectElement>('[data-filtro="clube"]')!;

    function desenharClubes(): void {
      const todos = itensDaTela();
      clubeTela = clubeValido(todos, tipoTela, clubeTela ?? clubeInicial(todos, time.id));
      const clubes = clubesDoTipo(todos, tipoTela)
        .map((id) => ({ id, nome: clubeDoLance(id).nome }))
        .sort((a, b) => (a.id === 'selecao' ? 1 : b.id === 'selecao' ? -1 : a.nome.localeCompare(b.nome)));
      seletor.innerHTML = `<option value="todos">Todos os clubes</option>${clubes
        .map((c) => `<option value="${esc(c.id)}"${c.id === clubeTela ? ' selected' : ''}>${esc(c.nome)}</option>`)
        .join('')}`;
    }

    function desenharLista(): void {
      if (!lista.isConnected) return;
      const base = itensDoFiltro(itensDaTela(), tipoTela, clubeTela ?? 'todos');
      const situacaoMedalhas = medalhasDoAlbum.estado();
      const mapa = medalhasDoAlbum.mapa();
      const favs = favoritosDoAparelho();
      // Sem as medalhas lidas, "Todos" mostra a lista sem trilha; os outros filtros esperam por elas.
      const semMedalhas = filtroAlbum !== 'todos' && situacaoMedalhas !== 'ok';
      const visiveis = semMedalhas ? [] : ordenarTelaUnica(base, situacaoMedalhas === 'ok' ? mapa : new Map(), filtroAlbum, favs, time.id);
      const idDoDia = idDoLanceDoDia();
      let acao: (() => void) | null = null;
      if (semMedalhas) {
        lista.innerHTML =
          situacaoMedalhas === 'erro'
            ? `<li>${estado('erro', 'Sem conexão com as medalhas agora.')}</li>`
            : `<li>${estado('carregando', 'Buscando as medalhas…')}</li>`;
        acao = () => {
          medalhasDoAlbum.esquecer();
          void carregarMedalhas();
          desenharLista();
        };
      } else if (visiveis.length) {
        lista.innerHTML = visiveis
          .map((it) => cardDoItem(it, favs, situacaoMedalhas === 'ok' ? (mapa.get(it.id) ?? { gols: 0, recriados: 0, vitorias: 0 }) : null, idDoDia))
          .join('');
      } else if (filtroAlbum === 'meus' && base.length) {
        lista.innerHTML = `<li>${estado('vazio', 'Nenhum troféu por aqui ainda.', { detalhe: 'Gols em partida valendo já dão o bronze.', acao: 'Ver todos' })}</li>`;
        acao = () => {
          filtroAlbum = 'todos';
          marcarAba(root, 'album', 'todos');
          desenharLista();
        };
      } else {
        lista.innerHTML = `<li>${estado('vazio', 'Nada desse clube nesse tipo ainda.', { detalhe: 'Tenta outro!', acao: 'Ver todos os clubes' })}</li>`;
        acao = () => {
          clubeTela = 'todos';
          seletor.value = 'todos';
          desenharLista();
        };
      }
      if (acao) aoTocarNoEstado(lista, acao);
    }

    async function carregarMedalhas(): Promise<void> {
      await medalhasDoAlbum.carregar();
      desenharLista();
    }

    refazerListaUnica = () => {
      if (!lista.isConnected) return;
      desenharClubes();
      desenharLista();
    };
    lista.addEventListener('click', (e) => {
      const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-ficha]');
      if (alvo?.dataset.ficha) abrirFichaDoItem(alvo.dataset.ficha);
    });
    root.querySelectorAll<HTMLButtonElement>('[data-tipo]').forEach((b) =>
      b.addEventListener('click', () => {
        tipoTela = b.dataset.tipo as TipoDaTela;
        marcarAba(root, 'tipo', tipoTela);
        desenharClubes();
        desenharLista();
      }),
    );
    root.querySelector('[data-album]')?.parentElement?.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-album]');
      if (!b) return;
      filtroAlbum = b.dataset.album as FiltroAlbum;
      marcarAba(root, 'album', filtroAlbum);
      desenharLista();
    });
    seletor.addEventListener('change', () => {
      clubeTela = seletor.value;
      desenharLista();
    });
    root.querySelector('[data-voltar]')!.addEventListener('click', () => irPara({ tela: 'inicio' }));
    root.querySelector('[data-regras]')!.addEventListener('click', () => abrirRegras(root, 'lances'));
    desenharClubes();
    desenharLista();
    void carregarMedalhas();

    // "Seus 3 melhores de hoje" e "Valendo hoje: 2 de 10": sem resposta do servidor, o bloco fica neutro, sem erro.
    void servidor()
      .then((s) => s.meusLancesHoje())
      .then((h) => {
        const elMelhores = root.querySelector<HTMLElement>('[data-melhores]');
        if (!h || !elMelhores?.isConnected) return;
        if (h.melhores) elMelhores.innerHTML = blocosDasMelhores(h.melhores);
        const linha = linhaValendoHoje(h);
        const elHoje = root.querySelector<HTMLElement>('[data-valendo-hoje]')!;
        if (linha) {
          elHoje.textContent = linha;
          elHoje.hidden = false;
        }
        if (h.limite > 0 && h.feitas >= h.limite) {
          valendoEsgotado = true;
          mostrarDica(root.querySelector<HTMLElement>('[data-dica]')!, dicasDoAparelho().pedir('lan_dez_valendo'));
        }
      })
      .catch(() => {});

    // O Lance do Dia da Home abre a ficha desse lance (uma vez).
    if (rota.tela === 'lances' && rota.lance && !fichaDaRotaAberta) {
      fichaDaRotaAberta = true;
      if (LANCES.some((l) => l.id === rota.lance) || disputaDoItem(rota.lance)) abrirFichaDoItem(rota.lance);
    }
  }

  /** X1 por link (`?l=`): acha o lance e começa a partida; link quebrado ou erro, vai ao hub sem aviso. */
  async function comecarX1(codigo: string): Promise<void> {
    root.innerHTML = `
      <main class="tela lances" style="${estilo(time.cores)}">
        ${cabecalhoTela({ titulo: 'Lances do Jogo', voltar: true })}
        ${estado('carregando', 'Buscando o X1…')}
      </main>`;
    root.querySelector('[data-voltar]')!.addEventListener('click', () => {
      tirarCodigoDoEndereco();
      irPara({ tela: 'inicio' });
    });
    let resumo: Awaited<ReturnType<Servidor['verDesafioLances']>> = null;
    try {
      resumo = await (await servidor()).verDesafioLances(codigo);
    } catch {
      resumo = null;
    }
    if (!telaViva) return;
    const lance = resumo ? LANCES.find((l) => l.id === resumo!.lance_id) : undefined;
    if (!resumo || !lance) {
      tirarCodigoDoEndereco();
      hub();
      return;
    }
    jogo([lance, lance, lance], false, { x1: codigo, alvoX1: { apelido: resumo.apelido, pontos: resumo.pontos } });
  }

  // ---------- resultado ----------
  /** `nova`: a regra com que a partida começou (vem de `jogo()`; a meia-noite pode ter passado no meio). */
  function resultado(
    lances: Lance[],
    resultados: ResultadoLance[],
    frase: string | null,
    fim: FechamentoLances | null,
    aviso: string | null,
    nova: boolean = unificada(),
  ): void {
    limparJogo?.();
    limparJogo = null;
    const pontos = resultados.reduce((s, r) => s + r.pontos, 0);
    const valendo = !!fim;
    const outro = time.id === ID_OUTRO;
    const paraTime = proTime(time);
    const apelido = apelidoDoCard();
    const desempenho: Desempenho | null = fim?.desempenho
      ? { posicao: fim.desempenho.posicao, total: fim.desempenho.total, recorde: fim.desempenho.recorde, novoRecorde: fim.desempenho.novo_recorde }
      : null;
    const situacao = situacaoDoResultado({
      fechou: valendo,
      aviso: aviso ?? undefined,
      contaNoRanking: fim?.contaNoRanking ?? false,
      sobSuspeita: fim?.sobSuspeita ?? false,
      melhorDoDia: fim?.melhorDoDia ?? null,
      // Regra nova: o dia vale as 3 melhores partidas de Lances.
      ...(nova ? { melhoresDoDia: fim?.melhoresDoDia ?? null } : {}),
    });
    const tituloDe = (id: string) => (lances.find((l) => l.id === id) ?? LANCES.find((l) => l.id === id))?.titulo ?? 'do jogo';
    const medalhas = (fim?.medalhas ?? []).map((m) => textoDaMedalhaNova(m.medalha, tituloDe(m.lanceId)));
    // Regra nova: o link é o do X1 que esta partida gerou (?l=); sem código, o do time de hoje.
    const codigoX1 = nova ? (fim?.desafio?.codigo ?? null) : null;
    const link = codigoX1 ? `${SITE}/?l=${codigoX1}` : `${SITE}/?time=${time.id}`;
    const desfechos = resultados.map((r) => r.desfecho);
    const textoShare = nova
      ? [conviteLances(pontos, paraTime, !!codigoX1), emojisDaPartida(desfechos), ...(medalhas[0] ? [medalhas[0]] : []), link].join('\n')
      : textoDeCompartilhar({ desfechos, pontos, paraTime, link, medalha: medalhas[0] ?? null });
    // Telão e lista: as 3 tentativas do mesmo lance, o título do lance uma vez só.
    const tituloDoLance = lances[0].titulo;
    const cmp = nova ? (fim?.comparacao ?? null) : null;
    // O X1 recebido não gera outro código, e as frases de derrota do narrador (feitas para os pênaltis) chamam pro X1
    // ou pro link dali: na derrota, a frase neutra, que leva a jogar de novo para ter o próprio link.
    const doNarrador =
      cmp?.venceu
        ? escolherFrase('desafio_vitoria', { ...contextoDoTime(time, apelido), desafiante: cmp.desafiante ?? 'quem te chamou' }, Math.random)?.texto
        : undefined;
    const fraseX1 = cmp ? (doNarrador ?? fraseNeutraDoX1(cmp.venceu)) : null;
    const duelo = cmp
      ? (() => {
          const p = placarDoX1(pontos, cmp);
          return placa(
            `<div class="duelo-desafio">
              <div><span>Você</span><strong>${p.voce}</strong></div>
              <em>x</em>
              <div><span>${esc(p.nomeDoOutro)}</span><strong>${p.outro}</strong></div>
              <p class="adesivo">${esc(fraseX1 ?? '')}</p>
            </div>`,
            { titulo: 'X1', filete: true },
          );
        })()
      : '';
    const linhaMelhores = nova && fim?.melhoresDoDia ? linhaMelhoresDoDia(fim.melhoresDoDia) : null;

    const gols = resultados.filter((r) => r.desfecho === 'gol').length;
    const recriou = resultados.filter((r) => r.recriou).length;
    // Rumo às medalhas: só quando o servidor fechou a partida e ela contou (sob suspeita ou sem conexão, não).
    const contouProMedalha = !!fim && !fim.sobSuspeita;
    medalhasDoAlbum.esquecer();
    const esperaRanking = !!fim && situacao.tipo === 'ranking' && !outro;
    const emoji = [
      '⚽ Guerra de Torcidas · Lances do Jogo',
      `${emojisDaPartida(desfechos)} · ${pontos} ${pontos === 1 ? 'ponto' : 'pontos'}${paraTime ? ` ${paraTime}` : ''}`,
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
          <div><span class="rotulo">${nova ? 'Tentativas' : 'Lances'}</span><strong>${lances.length}</strong></div>
        </section>`,
      // Sem valer pontos (limite do dia, sem conexão), a regra nova não mostra o total: o aviso explica.
      pontos: nova && !valendo ? null : { total: pontos, paraTime },
      detalhe: placa(
        `<ul class="resumo-lances">
          ${lances
            .map((l, i) => {
              const r = resultados[i];
              return `<li><span class="emoji">${icone(ICONE[r.desfecho])}</span>
                <span class="resumo-titulo">${esc(nova ? rotuloDaTentativa(i) : l.titulo)}<small>${esc(legenda(r))}</small></span>
                <strong>${r.pontos ? `+${r.pontos}` : '0'}</strong></li>`;
            })
            .join('')}
        </ul>
        ${recriou ? `<div class="numeros dois">${numero(String(recriou), recriou === 1 ? 'Lance recriado' : 'Lances recriados', 'destaque')}</div>` : ''}
        ${linhaMelhores ? `<p class="melhores-linha">${esc(linhaMelhores)}</p>` : ''}
        <button type="button" class="botao-linha" data-acao="album">${nova ? 'Ver os lances' : 'Escolher outros'}</button>`,
        { titulo: nova ? tituloDoLance : `Seus ${lances.length} lances`, filete: true },
      ) + duelo + (contouProMedalha ? '<div data-rumo hidden></div>' : ''),
      frases: frase ? [frase] : [],
      aviso: situacao.texto ? { texto: situacao.texto, forte: !valendo } : null,
      selos:
        htmlSelosDaPosicao(desempenho, 'lances') +
        medalhas.map((t) => selo(`${icone('estrela')} ${esc(t)}`, 'ouro')).join('') +
        (esperaRanking ? selo('No ranking em 1 min', undefined, 'data-selo-ranking') : '') +
        (valendo && situacao.tipo === 'ranking' && outro ? selo('Contou pro ranking') : ''),
      zap: `https://wa.me/?text=${encodeURIComponent(textoShare)}`,
      mandarCard: true,
      maisUma: 'Jogar de novo',
    });
    contar(root.querySelector<HTMLElement>('[data-contador]'), pontos);
    root.querySelector('[data-acao="album"]')!.addEventListener('click', hub);

    // XP da carreira e posição: só quando o servidor fechou a partida (o XP sai de lá).
    const carreira = fim
      ? mostrarCarreiraNoResultado(
        root.querySelector<HTMLElement>('[data-carreira]'),
        // Em desenvolvimento, ?homeFalsa lê a carreira de mentira (src/dev/homeFalsa.ts).
        import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa')
          ? () => import('../dev/homeFalsa').then((m) => m.minhaCarreira())
          : undefined,
      )
      : Promise.resolve(null);
    // Confete e vibração, uma vez por resultado: X1 vencido, recorde novo, entrou nas 3 melhores do dia ou medalha nova.
    const comemorar = ligarConfete(root, time);
    comemorar(
      motivoDoConfete({
        venceu: !!cmp?.venceu,
        novoRecorde: !!desempenho?.novoRecorde,
        entrouNasMelhores: nova && !!fim && situacao.tipo === 'ranking',
        subiuMedalha: contouProMedalha && medalhas.length > 0,
      }),
    );
    // As medalhas são lidas uma vez e servem ao "Rumo às medalhas" e à "Peça nova no vestiário".
    const medalhasLidas = fim && contouProMedalha ? servidor().then((s) => s.minhasMedalhas()) : undefined;
    if (fim && contouProMedalha)
      void mostrarRumoDasMedalhas({
        alvo: root.querySelector<HTMLElement>('[data-rumo]')!,
        jogados: lances.map((l, i) => ({ id: l.id, titulo: l.titulo, gol: resultados[i].desfecho === 'gol', recriou: resultados[i].recriou })),
        novas: fim.medalhas,
        aoSubir: () => comemorar('medalha'),
        ler: () => medalhasLidas!,
      });
    // Peça nova no vestiário: só com a partida fechada pelo servidor e que contou (import() lazy: fora do bundle inicial).
    void import('./pecaNovaBloco').then((m) =>
      m.pecaNovaDoResultado({
        alvo: root.querySelector<HTMLElement>('[data-peca-nova]'),
        contou: !!fim && contouProMedalha,
        carreira,
        medalhas: medalhasLidas,
        jogadas: lances.map((l, i) => ({ item: l.id, gols: resultados[i].desfecho === 'gol' ? 1 : 0, recriados: resultados[i].recriou ? 1 : 0, vitorias: 0 })),
        comemorar,
        bronzeNoDev: true,
      }),
    ).catch(() => {});
    // Efeito no ranking: selo "No ranking em 1 min" que vira "Subiu de 5º pra 3º" (mesmo fluxo dos pênaltis).
    let pararEfeito: (() => void) | null = null;
    if (esperaRanking && fim) {
      pararEfeito = ligarEfeitoNoRanking(
        { selo: root.querySelector<HTMLElement>('[data-selo-ranking]'), nota: root.querySelector<HTMLElement>('[data-nota]')! },
        { timeId: time.id, semana: fim.semana, confirmadaEm: fim.confirmadaEm, antes: fim.ranking.antes },
      );
    }
    limparJogo = () => pararEfeito?.();

    // Card personalizável (jogo.md 14.6): o Card abre a tela "Seu card" e o Stories manda o card com as escolhas guardadas.
    const dados = (async (): Promise<DadosDoCard> => ({
      tipo: tipoDoJogo(!!codigoX1),
      time,
      jogo: 'Lances do Jogo',
      destaque: `+${pontos}`,
      quem: { comApelido: linhaDoTorcedor(apelido, pontos, paraTime), semApelido: linhaDoTorcedor(undefined, pontos, paraTime) },
      lance: nova ? tituloDoLance : `Seus ${lances.length} lances`,
      placarEmoji: emojisDaPartida(desfechos),
      frase: frase ?? '',
      novoRecorde: !!desempenho?.novoRecorde,
      link: link.replace('https://', ''),
      nivel: await nivelParaCard(),
      conteudo: {
        jogo: 'lances',
        lances: lances.map((l, i) => ({
          titulo: nova ? rotuloDaTentativa(i) : l.titulo,
          desfecho: resultados[i].desfecho,
          recriou: resultados[i].recriou,
          pontos: resultados[i].pontos,
        })),
        tituloUnico: nova ? tituloDoLance : null,
        medalha: medalhas[0] ?? null,
      },
    }))();
    ligarResultado(root, {
      dados,
      sortearFrase: sorteadorDeFrase('lance_fim', { ...contextoDoTime(time, apelido), pontos }),
      quemComApelido: (a) => linhaDoTorcedor(a, pontos, paraTime),
      textoShare,
      link,
      emoji,
      // Regra nova: o mesmo lance, partida normal (também depois de um X1).
      maisUma: () => {
        const base = LANCES.find((o) => o.id === lances[0].id) ?? lances[0];
        if (nova) jogarLance(base);
        else jogo(lances, false);
      },
      inicio: () => irPara({ tela: 'inicio' }),
    });
  }

  /** Já jogou as partidas valendo de hoje: avisa e oferece o treino (que segue liberado). */
  function limiteDoDia(lances: Lance[]): void {
    valendoEsgotado = true;
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
  /**
   * `x1`: o código do X1 recebido (só na regra nova), com `alvoX1`, quem desafiou e os pontos a bater, para o HUD.
   * Na regra nova a partida são 3 tentativas do mesmo lance (`lances = [l, l, l]`).
   */
  function jogo(lances: Lance[], treino: boolean, op: { x1?: string; alvoX1?: { apelido: string | null; pontos: number } } = {}): void {
    // A regra sai do formato da partida, decidido aqui e levado até o resultado. Três lances diferentes vêm do hub
    // de antes (aberto no domingo e usado depois da meia-noite): seguem o formato antigo, e o servidor responde 426
    // depois do corte, o que leva à tela única. Mandar `{ lance }` com A, B e C na tela trocaria a cena dos chutes.
    const mesmoLance = lances.every((l) => l.id === lances[0].id);
    const nova = unificada() && (treino || mesmoLance);
    // Regra nova: a faixa de cada lance é a do catálogo recalibrado; o servidor confirma a que vale ao começar.
    if (nova) lances = lances.map((l) => ({ ...l, faixa: faixaNaTela(l, true).faixa }));
    const tabela = nova ? TABELA_LANCES_UNIFICADA : undefined;
    let codigoX1 = nova ? (op.x1 ?? null) : null;
    limparJogo?.();
    root.innerHTML = `
      <main class="partida lances-jogo" style="${estilo(time.cores)}">
        <header class="hud">
          <button class="voltar" type="button" aria-label="Voltar ao álbum">‹</button>
          <div class="lances-placar">
            <span class="rotulo" data-contagem></span>
            <strong data-pontos>${treino ? 'Treino' : '0'}</strong>
            <small class="x1-alvo" data-alvo-x1 ${op.alvoX1 && codigoX1 ? '' : 'hidden'}>${op.alvoX1 && codigoX1 ? esc(alvoDoX1(op.alvoX1.apelido, op.alvoX1.pontos)) : ''}</small>
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
    // Relógio da partida: para enquanto o aviso de virar o celular está na tela (J10). "A jogada" do cara a cara e
    // as animações correm nele, no aparelho; o servidor não mede tempo, então pontos e sementes não mudam.
    const tempo = criarRelogioPausavel(relogioDoAparelho);
    const relogio = tempo.agora;
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
    /** Regra nova: bateu no limite do dia; a mesma partida segue como treino, sem ponto nem medalha. */
    let limiteTreino = false;
    let avisoX1: string | null = null;
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

    // Dicas na hora do erro (jogo.md, 14.4): "1º ..." vale por partida; o limite por aparelho fica em jogo/dicas.ts.
    const dicas = dicasDoAparelho();
    let dicaGuardada: string | null = null;
    let barreirasNaPartida = 0;
    let partidasComBarreira = 0;
    const vistas = { saiu: false, cara: false, recriar: false, seis: false };
    /** Regra nova: +8 e 10 partidas (dicas.ts); antes do corte, +6 e 6. */
    const dicaRecriar = nova ? 'lan_recriar_oito' : 'lan_recriar';
    const dicaValendo = nova ? 'lan_dez_valendo' : 'lan_seis_valendo';
    /** Zona do gol de verdade pintada no gol depois de um gol que não recriou. */
    let zonaMarcada: { zona: number; ate: number } | null = null;
    let pausaLonga = false;
    const DUR_ZONA = 3200;
    function instruir(texto: string): void {
      tirarDica(elInstrucao);
      elInstrucao.textContent = texto;
    }
    /** Dicas do começo do lance (o goleiro que saiu, o cara a cara, o treino depois das partidas valendo do dia). */
    function dicaDoComeco(l: Lance): void {
      if (dicaGuardada) {
        mostrarDica(elInstrucao, dicaGuardada);
        dicaGuardada = null;
        return;
      }
      const cara = l.tipo === 'finalizacao';
      const texto = primeiraDica(dicas, [
        [(treino || limiteTreino) && valendoEsgotado && !vistas.seis, dicaValendo],
        [cara && goleiroSaiu(l) && !vistas.saiu, 'lan_goleiro_saiu'],
        [cara && !vistas.cara, 'lan_cara_a_cara'],
      ]);
      if (!mostrarDica(elInstrucao, texto)) return;
      if (texto === DICAS[dicaValendo]) vistas.seis = true;
      else if (texto === DICAS.lan_goleiro_saiu) vistas.saiu = true;
      else vistas.cara = true;
    }
    function dicaDoResultado(r: ResultadoLance, l: Lance): void {
      if (bolaNaBarreira(r) && ++barreirasNaPartida === 1) partidasComBarreira = dicas.marco('barreira_partidas');
      const primeiraBarreira = bolaNaBarreira(r) && barreirasNaPartida === 1;
      const recriar = golSemRecriar(r) && !vistas.recriar;
      const texto = primeiraDica(dicas, [
        [primeiraBarreira && partidasComBarreira === 2, 'lan_barreira_de_novo'],
        [primeiraBarreira && partidasComBarreira === 1, 'lan_barreira'],
        [cavadinhaPegaSemSair(r, l), 'lan_cavadinha_sem_sair'],
        [goleiroPegouNoMeio(r), 'lan_goleiro_no_meio'],
        [recriar, dicaRecriar],
      ]);
      if (!mostrarDica(elInstrucao, texto)) return;
      dicaGuardada = texto;
      if (texto === DICAS[dicaRecriar]) {
        vistas.recriar = true;
        pausaLonga = true;
        zonaMarcada = { zona: l.zonaHistorica, ate: relogio() + DUR_ZONA };
      }
    }
    /** Pinta a zona onde entrou o gol de verdade (por uns segundos; parada com movimento reduzido). */
    function desenharZonaMarcada(): void {
      if (!zonaMarcada || relogio() > zonaMarcada.ate) return;
      const k = cantosDaZona(zonaMarcada.zona);
      const q = [
        [k.x0, k.y0],
        [k.x1, k.y0],
        [k.x1, k.y1],
        [k.x0, k.y1],
      ].map(([x, y]) => cena.projetar({ x, y, z: 0 }));
      const pulso = reduzido ? 1 : 0.75 + 0.25 * Math.sin(relogio() / 180);
      c.save();
      c.beginPath();
      q.forEach((o, i) => (i ? c.lineTo(o.x, o.y) : c.moveTo(o.x, o.y)));
      c.closePath();
      c.fillStyle = `rgba(255,210,63,${0.32 * pulso})`;
      c.fill();
      c.strokeStyle = 'rgba(255,210,63,0.95)';
      c.lineWidth = 3;
      c.setLineDash([8, 6]);
      c.stroke();
      c.restore();
    }

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
      root.querySelector('[data-contagem]')!.textContent = treino
        ? `Tentativa ${tentativa + 1}`
        : nova
          ? textoDaTentativa(indice, lances.length)
          : `Lance ${indice + 1} de ${lances.length}`;
      if (!treino) root.querySelector('[data-pontos]')!.textContent = `${resultados.reduce((s, r) => s + r.pontos, 0)} pts`;
      elMudo.innerHTML = icone(prefs.get().mudo ? 'mudo' : 'som');
    }

    /** Começa o lance: câmera do tipo, situação no topo e, no cara a cara, "A jogada" com a bola chegando. */
    function comecarLance(): void {
      dicas.novoLance();
      zonaMarcada = null;
      pausaLonga = false;
      if (atual().id !== vestido) {
        vestido = atual().id;
        ({ batedor, goleiro, barreira } = elencoDoLance(atual()));
      }
      const l = atual();
      cena.trocarTorcida(l.clube === 'selecao' ? TORCIDA_SELECAO : undefined);
      cena.definirLance(l.bola, l.tipo === 'falta' ? ENQUADRAMENTOS.falta : ENQUADRAMENTOS.caraACara);
      rastro = [];
      instruir(`${l.titulo} · ${situacaoDoLance(l)}`);
      if (preparando) {
        fase = { tipo: 'espera', inicio: relogio(), chutando: false };
        elJogada.hidden = true;
        instruir('Preparando a partida…');
      } else if (l.tipo === 'finalizacao' && l.chegada && !reduzido) {
        fase = { tipo: 'chegada', inicio: relogio() };
        elJogada.querySelector('span')!.textContent = l.chegada;
        elJogada.hidden = false;
      } else {
        elJogada.hidden = true;
        fase = { tipo: 'mirar', inicio: relogio() };
        dicaDoComeco(l);
      }
      atualizarHud();
    }

    function mostrarAviso(texto: string): void {
      aviso = texto;
      const el = root.querySelector<HTMLElement>('.aviso-partida')!;
      preencherAviso(el, texto);
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
      instruir('');
      elJogada.hidden = true;
      somChute();
    }

    /** Valendo: manda o gesto e só solta a bola quando o resultado chega (a espera cabe no pé encontrando a bola). */
    async function pedirAoServidor(gq: GestoCobranca, l: Lance, i: number): Promise<void> {
      const antes = relogio();
      fase = { tipo: 'espera', inicio: antes, chutando: true };
      instruir('');
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
        comecarChute(resolverLance(semente, indice, l, gq, tabela), gq, l, relogio() - antes);
      }
    }

    function chutar(gesto: GestoCobranca): void {
      const gq = normalizarCobranca(gesto);
      const l = atual();
      if (!treino && servidorOk && partidaId) void pedirAoServidor(gq, l, indice);
      else comecarChute(resolverLance(semente, indiceDoSorteio(), l, gq, tabela), gq, l, 0);
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
      dicaDoResultado(r, atual());
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
        resultado(lances, resultados, narrador.falar('lance_fim', { pontos }), servidorOk ? fechamento : null, aviso, nova);
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
      // Celular deitado: o aviso cobre o campo e o tempo está parado; não precisa redesenhar.
      if (tempo.pausado()) {
        raf = requestAnimationFrame(() => quadro(relogio()));
        return;
      }
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
              dicaDoComeco(l);
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
          desenharZonaMarcada();
          const comReplay = r.desfecho === 'gol' && !reduzido && qualidade().replay && !pausaLonga;
          if (comReplay && ms >= DUR_ANTES_DO_REPLAY - ANTES_DO_CORTE) tarja.entrar();
          if (ms >= (comReplay ? DUR_ANTES_DO_REPLAY : pausaLonga ? DUR_ZONA : DUR_PAUSA)) {
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
      else instruir('Arraste da bola na direção do gol.');
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
        const pedir = async (pedido: PedidoLances | string[]) => {
          try {
            return await api.novaPartidaLances(pedido);
          } catch (e) {
            if (!(e instanceof ErroServidor) || e.codigo !== 'sem_time') throw e;
            await sincronizarTorcedor(true);
            return await api.novaPartidaLances(pedido);
          }
        };
        let r;
        try {
          r = await pedir(nova ? (codigoX1 ? { desafio: codigoX1 } : { lance: lances[0].id }) : ids);
        } catch (e) {
          // X1 que não vale (não existe, é seu ou expirou): partida normal do mesmo lance, com uma linha do narrador.
          const linha = e instanceof ErroServidor && codigoX1 ? avisoDoErroDoX1(e.codigo) : null;
          if (!linha) throw e;
          codigoX1 = null;
          avisoX1 = linha;
          r = await pedir({ lance: lances[0].id });
        }
        if (acabou) return;
        if (op.x1) tirarCodigoDoEndereco();
        if (!codigoX1) root.querySelector<HTMLElement>('[data-alvo-x1]')?.setAttribute('hidden', '');
        // Regra nova: a faixa que vale nesta partida (a do catálogo, ou uma abaixo pela taxa real).
        const faixaDoServidor = nova ? r.faixas?.[0] : undefined;
        if (faixaDoServidor) lances = lances.map((l) => ({ ...l, faixa: faixaDoServidor }));
        partidaId = r.partidaId;
        goleiroServidor = r.goleiroX;
        servidorOk = true;
        if (avisoX1) narrar(narrador.falar('lance_abertura'), avisoX1);
      } catch (e) {
        if (acabou) return;
        if (op.x1) tirarCodigoDoEndereco();
        if (e instanceof ErroServidor && e.codigo === 'saiu_da_conta') return;
        // O servidor já está na regra nova e o relógio do aparelho atrasou: a tela única vale daqui em diante.
        if (e instanceof ErroServidor && e.codigo === 'atualize_o_app') {
          forcarTelaUnica = true;
          return hub();
        }
        if (e instanceof ErroServidor && e.codigo === 'limite_do_dia') {
          if (!nova) return limiteDoDia(lances);
          // Regra nova: a mesma partida segue como treino, no aparelho, sem tela separada.
          valendoEsgotado = true;
          limiteTreino = true;
          mostrarAviso(avisoLimiteDoDia(true));
        } else {
          console.warn('Partida sem valer pontos:', e instanceof ErroServidor ? e.codigo : e);
          mostrarAviso(
            e instanceof ErroServidor && e.codigo === 'muitas_partidas'
              ? 'Calma! Muitas partidas em 1 minuto: esta não vale pontos.'
              : comMotivo(AVISO_SEM_PONTOS, e),
          );
        }
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
    // Deitado: pausa (e solta o arraste que estava no meio); ao virar, segue de onde parou.
    const pararDeVigiar = vigiarCelularDeitado(root.querySelector<HTMLElement>('main')!, (deitado) => {
      if (deitado) {
        tempo.pausar();
        rastro = [];
      } else tempo.retomar();
    });
    limparJogo = () => {
      acabou = true;
      pararDeOuvirQualidade();
      pararDeVigiar();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', aoRedimensionar);
    };
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__lances = { fase: () => fase.tipo, resultados };
    }
  }

  // Em desenvolvimento, deixa abrir o resultado com dados de mentira pelo console (conferência visual).
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__lancesResultado = resultado;
  if (unificada() && rota.tela === 'lances' && rota.desafio) void comecarX1(rota.desafio);
  else hub();
  return () => {
    telaViva = false;
    limparJogo?.();
  };
}
