// Lances do Jogo (docs/jogo.md, seções 7.3 e 14.7): a tela única desde 08/11/2026. Filtros (tipo, clube, troféus,
// ⭐), cada item só com "Jogar", partida de 3 tentativas do mesmo lance, X1 por link (`rota.desafio`), limite do dia
// que vira treino na mesma partida e "Seus 3 melhores de hoje". As disputas de pênaltis abrem o jogo de sempre
// (telas/partida.ts) com o cenário da disputa (seção 6).
// A partida vale pontos lance a lance com o servidor (função `lances`, como os pênaltis): a semente nunca vem para o
// celular, cada chute manda o gesto e a bola só sai quando o resultado chega. Caiu a conexão: a partida segue aqui,
// sem valer pontos. Quem decide o lance é o motor puro (jogo/lances.ts); aqui é escolha, gesto e desenho, na cena 3D
// (telas/cena3d.ts) com a câmera de cada tipo (telas/camera.ts).

import { esc, irPara, type Rota } from '../app';
import { contar as contarFunil, etapa, sairDaEtapa } from '../servidor/funil';
import { LANCES } from '../dados/lances';
import { ID_OUTRO, TIMES, corDeTexto, proTime, timePorId, type Time } from '../dados/times';
import { apelidoDoCard, prefs } from '../estado';
import { sementeNova } from '../jogo/aleatorio';
import { tipoDoJogo, type DadosDoCard } from '../jogo/cardPersonalizado';
import { linhaDoTorcedor } from '../jogo/cardTextos';
import { motivoDoConfete } from '../jogo/confete';
import type { FechamentoLances } from '../jogo/lancesPartida';
import {
  AVISO_LIMITE_DO_DIA,
  emojisDaPartida,
  faixaNaTela,
  linhaMelhoresDoDia,
  linhaValendoHoje,
  ordenarTelaUnica,
  situacaoDoResultado,
  textoDaMedalhaNova,
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
  textoShareLances,
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
import { abas, aoTocarNoEstado, cabecalhoTela, estado, marcarAba, numero, placa, selo } from './blocos';
import { ligarEfeitoNoRanking } from './efeitoRanking';
import {
  contar,
  destaqueDaPeca,
  destaqueDoDuelo,
  destaqueDoRecorde,
  destaqueDoTop3,
  htmlResultado,
  htmlSelosDaPosicao,
  ligarConfete,
  ligarResultado,
  promoverDestaque,
} from './resultadoPadrao';
import {
  LANCES_POR_PARTIDA,
  TABELA_LANCES_UNIFICADA,
  caminhoDoLance,
  goleiroAntesDoChute,
  resolverLance,
  type Faixa,
  type Lance,
  type ResultadoLance,
} from '../jogo/lances';
import { normalizarCobranca, type GestoCobranca } from '../jogo/penaltis';
import {
  destravarSom,
  jeitoDaDefesa,
  latenciaDoSom,
  somApito,
  somBarreira,
  somChute,
  somDefesa,
  somLargada,
  somRede,
  somTorcida,
} from '../jogo/som';
import { vibrar } from './toque';
import { etiquetasDoLance, eventoDoLance } from '../narrador/lance';
import { criarNarrador } from '../narrador/sessao';
import { TORCIDA_SELECAO } from '../dados/coresDosLances';
import { contraAdversario } from '../dados/adversarios';
import { DISPUTAS } from '../dados/disputas';
import { chamadaDaDisputa, type Disputa } from '../jogo/disputas';
import { clubeDoLance, distanciaDoLance, duracaoDoVoo, elencoDoLance, posicaoDoGoleiro as posicaoDoGoleiroDoLance } from './elencoDoLance';
import { novaPose, poseChute, poseComemora, poseLamenta, poseParado } from './bonecos';
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
import { abrirFicha, type NumerosDoLance } from './fichaLance';
import { htmlDaFita, htmlDoTelao, modoNesteAparelho } from './fitaDoDesafio';
import { folhaNoHistorico } from './folhaNoHistorico';
import { botaoVerOsGols, quemChamou, rotuloDaFitaDele, sequenciaDeGols } from '../jogo/golsDoDesafio';
import type { TentativaDoDesafio } from '../jogo/tentativasDoDesafio';
import { mostrarRumoDasMedalhas } from './rumoMedalhas';
import type { FiltroAlbum } from '../jogo/lancesTextos';
import { linkDoItem, textoDaDisputaParaMandar, textoDoLanceParaMandar } from '../jogo/mandarLance';

// Em desenvolvimento, ?lancesFalsos troca o servidor por um de mentira (src/dev/lancesFalsos.ts).
const FALSO = import.meta.env.DEV && new URLSearchParams(location.search).has('lancesFalsos');
type Servidor = Pick<typeof SERVIDOR, 'novaPartidaLances' | 'lanceDoJogo' | 'meusLancesHoje' | 'minhasMedalhas' | 'verDesafioLances'>;
const servidor = (): Promise<Servidor> => (FALSO ? import('../dev/lancesFalsos') : Promise.resolve(SERVIDOR));

// O código do motivo vai no fim (servidor/motivo.ts), como nos pênaltis.
export const AVISO_SEM_PONTOS = 'Sem conexão: essa partida não vale pontos.';
export const AVISO_CAIU = 'Caiu a conexão: essa não vale mais pontos. Joga de novo quando a rede voltar.';
const SITE = 'https://torcida.kauewalter.com.br';

/** Tira o código do X1 (`?l=`) do endereço, sem mexer no resto (em desenvolvimento, o ?lancesFalsos fica). */
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

export { clubeDoLance };

export type AbaLances = 'penaltis' | 'falta' | 'finalizacao';

const ROTULO_FAIXA: Record<Faixa, string> = { facil: 'Fácil', media: 'Média', dificil: 'Difícil', craque: 'Craque' };

const DUR_BATIDA = 190;
const DUR_PULO = 420;
const DUR_PAUSA = 1800;
/** Depois de um gol, o replay de TV entra antes (a frase do narrador continua por cima). */
const DUR_ANTES_DO_REPLAY = 1100;
/** "A jogada" no cara a cara: a bola chega até o pé antes do chute. */
const DUR_CHEGADA = 1300;

/** Uma linha do que o lance pede: tipo, distância, lado e barreira ou goleiro. */
export function situacaoDoLance(l: Lance): string {
  const d = Math.round(distanciaDoLance(l));
  const lado = Math.abs(l.bola.x) < 3 ? 'de frente' : l.bola.x > 0 ? 'pela direita' : 'pela esquerda';
  if (l.tipo === 'falta') return `Falta a ${d} m, ${lado}, barreira de ${l.barreira?.jogadores ?? 0}`;
  return `Cara a cara a ${d} m, ${lado}${(l.goleiroSaida ?? 0) >= 3 ? ', goleiro saindo' : ''}`;
}

function legenda(r: ResultadoLance): string {
  if (r.desfecho === 'gol') return r.recriou ? `Carimbou o lance! · +${r.pontos}` : `Gol · +${r.pontos}`;
  if (r.desfecho === 'barreira') return 'Na barreira';
  if (r.desfecho === 'defesa') return 'O goleiro pegou';
  return r.desfecho === 'trave' ? 'Na trave' : 'Pra fora';
}

const ICONE: Record<ResultadoLance['desfecho'], NomeIcone> = { gol: 'bola', defesa: 'mao', barreira: 'barreira', trave: 'xis', fora: 'xis' };

const relogioDoAparelho = () => performance.now();

export function telaLances(root: HTMLElement, rota: Rota): () => void {
  const time: Time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  const estilo = (cores: readonly [string, string]) => `--c1:${cores[0]};--c2:${cores[1]};--txt:${corDeTexto(cores[0])}`;
  /** O tipo do filtro abre pela aba da rota; sem aba, Todos. */
  let tipoTela: TipoDaTela = tipoDaAba(rota.tela === 'lances' ? rota.aba : undefined);
  /** null: ainda não escolheu; abre no clube da pessoa se ele tiver item. */
  let clubeTela: string | null = null;
  let refazerListaUnica: (() => void) | null = null;
  let fichaDaRotaAberta = false;
  let telaViva = true;
  /** Quem chamou o X1 recebido (o `boneco` e o time do resumo), para o busto no placar do resultado. */
  let quemChamouX1: { boneco: unknown; timeId: string; apelido: string | null; tentativas: TentativaDoDesafio[] | null } | null = null;
  let limparJogo: (() => void) | null = null;
  let filtroAlbum: FiltroAlbum = 'todos';
  const medalhasDoAlbum = criarMedalhasDoAlbum(() => servidor().then((s) => s.minhasMedalhas()));
  /** As partidas valendo do dia já foram (o servidor disse): a partida avisa que vai de treino. */
  let valendoEsgotado = false;
  // ?disputasFalsas enche a lista em desenvolvimento, enquanto o catálogo está em rascunho (src/dev/disputasFalsas.ts).
  let catalogoDisputas: readonly Disputa[] = DISPUTAS;
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('disputasFalsas')) {
    void import('../dev/disputasFalsas').then((m) => {
      catalogoDisputas = m.DISPUTAS_FALSAS;
      refazerListaUnica?.();
    });
  }

  // ---------- tela única (jogo.md 14.7) ----------
  const itensDaTela = (): ItemUnico[] => itensDaTelaUnica(LANCES, catalogoDisputas);
  /** O Lance do Dia sorteia entre todos os itens: disputas e lances (a mesma lista da Home). */
  const idDoLanceDoDia = (): string | null => lanceDoDia(diaBrasilia(), idsDoLanceDoDia(LANCES, catalogoDisputas));
  const disputaDoItem = (id: string): Disputa | undefined => catalogoDisputas.find((d) => itemPenaltis(d.id) === id);
  const faixaDoCard = (l: Lance): string => {
    const f = faixaNaTela(l);
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
      faixa: faixaNaTela(l).faixa,
      selo: l.id === idDoDia ? 'Lance do Dia' : undefined,
      estilo: estilo(clube.cores),
    });
  }

  /** A partida valendo de um lance: 3 tentativas do mesmo lance. */
  const jogarLance = (l: Lance): void => jogo([l, l, l]);

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
        ${estado('carregando', 'Buscando o desafio…')}
      </main>`;
    root.querySelector('[data-voltar]')!.addEventListener('click', () => {
      sairDaEtapa();
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
      hubUnico();
      return;
    }
    quemChamouX1 = { boneco: resumo.boneco ?? null, timeId: resumo.time_id, apelido: resumo.apelido, tentativas: resumo.tentativas ?? null };
    jogo([lance, lance, lance], { x1: codigo, alvoX1: { apelido: resumo.apelido, pontos: resumo.pontos } });
  }

  /**
   * Os gols de quem chamou, numa folha de baixo (resultado do desafio recebido): o mesmo telão e a mesma fita do convite.
   * Entra no histórico do navegador (o voltar fecha a folha) e, ao fechar, o telão para.
   */
  function abrirOsGolsDele(lance: Lance, tentativas: TentativaDoDesafio[], nome: string | null, codigo: string): void {
    const sequencia = sequenciaDeGols(tentativas);
    if (!sequencia.length) return;
    const dele = timePorId(quemChamouX1?.timeId);
    const d = document.createElement('dialog');
    d.className = 'ficha-lance';
    d.setAttribute('style', estilo((dele ?? time).cores));
    d.setAttribute('aria-labelledby', 'gols-dele-titulo');
    d.innerHTML = `<div class="ficha-corpo">
        <div class="ficha-topo">
          <span class="ficha-meta">${esc(lance.titulo)}</span>
          <button type="button" class="ficha-fechar" data-fechar aria-label="Fechar">✕</button>
        </div>
        <h2 id="gols-dele-titulo" class="ficha-titulo">Os gols de ${esc(quemChamou(nome))}</h2>
        ${htmlDoTelao(sequencia, modoNesteAparelho(false))}
        ${htmlDaFita(tentativas)}
      </div>`;
    root.append(d);
    let parar: (() => void) | null = null;
    const folha = folhaNoHistorico(() => {
      parar?.();
      if (d.open) d.close();
      d.remove();
    });
    d.addEventListener('close', () => folha.fechar());
    d.addEventListener('click', (e) => {
      if (e.target === d) folha.fechar();
    });
    d.querySelector('[data-fechar]')!.addEventListener('click', () => folha.fechar());
    d.showModal();
    void import('./telaoDoDesafio')
      .then((m) => {
        const figura = d.querySelector<HTMLElement>('[data-telao]');
        if (!figura || !d.isConnected) return;
        parar = m.iniciarTelao({
          figura,
          lance,
          tentativas,
          codigo,
          quem: { apelido: nome, boneco: quemChamouX1?.boneco ?? null, timeId: quemChamouX1?.timeId },
          fita: d.querySelector('[data-fita]'),
          modo: modoNesteAparelho(false),
        }).parar;
      })
      .catch(() => {
        // Sem o desenho (rede caiu): o telão fica só com o gramado e a fita conta o que houve.
      });
  }

  // ---------- resultado ----------
  function resultado(
    lances: Lance[],
    resultados: ResultadoLance[],
    frase: string | null,
    fim: FechamentoLances | null,
    aviso: string | null,
    x1Recebido: string | null = null,
    // As 3 tentativas de quem chamou, do resumo que comecarX1 leu (em desenvolvimento, __lancesResultado aceita este 7º parâmetro).
    tentativasDele: TentativaDoDesafio[] | null = quemChamouX1?.tentativas ?? null,
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
      // O dia vale as 3 melhores partidas de Lances.
      melhoresDoDia: fim?.melhoresDoDia ?? null,
    });
    const tituloDe = (id: string) => (lances.find((l) => l.id === id) ?? LANCES.find((l) => l.id === id))?.titulo ?? 'do jogo';
    const medalhas = (fim?.medalhas ?? []).map((m) => textoDaMedalhaNova(m.medalha, tituloDe(m.lanceId)));
    // O link é o do X1 que esta partida gerou (?l=); sem código, o do time de hoje.
    const codigoX1 = fim?.desafio?.codigo ?? null;
    const link = codigoX1 ? `${SITE}/?l=${codigoX1}` : `${SITE}/?time=${time.id}`;
    // Funil do X1: terminou a partida de um X1 recebido (resultado() roda uma vez por partida).
    if (x1Recebido) contarFunil({ ev: 'terminou', tipo: 'x1_lances', x1: x1Recebido });
    const desfechos = resultados.map((r) => r.desfecho);
    const textoShare = textoShareLances(conviteLances(pontos, paraTime, !!codigoX1), emojisDaPartida(desfechos), medalhas[0] ?? null, link);
    // Telão e lista: as 3 tentativas do mesmo lance, o título do lance uma vez só.
    const tituloDoLance = lances[0].titulo;
    const cmp = fim?.comparacao ?? null;
    // O X1 recebido não gera outro código, e as frases de derrota do narrador (feitas para os pênaltis) chamam pro X1
    // ou pro link dali: na derrota, a frase neutra, que leva a jogar de novo para ter o próprio link.
    const doNarrador =
      cmp?.venceu
        ? escolherFrase('desafio_vitoria', { ...contextoDoTime(time, apelido), desafiante: cmp.desafiante ?? 'quem te desafiou' }, Math.random)?.texto
        : undefined;
    const fraseX1 = cmp ? (doNarrador ?? fraseNeutraDoX1(cmp.venceu)) : null;
    // Quem chamou: as duas fitas (a sua e a dele) e o botão que abre os gols dele, só com as tentativas dele (servidor novo).
    const nomeDele = cmp?.desafiante ?? quemChamouX1?.apelido ?? null;
    const golsDele = sequenciaDeGols(tentativasDele);
    const fitas =
      cmp && tentativasDele
        ? `<div class="duelo-fitas">
            ${htmlDaFita(resultados, 'Você')}
            ${htmlDaFita(tentativasDele, rotuloDaFitaDele(nomeDele))}
            ${golsDele.length ? `<button type="button" class="botao-linha" data-acao="gols-dele">${esc(botaoVerOsGols(nomeDele))}</button>` : ''}
          </div>`
        : '';
    const duelo = cmp
      ? (() => {
          const p = placarDoX1(pontos, cmp);
          return placa(
            `<div class="duelo-desafio">
              <div><span data-nome-duelo="voce">Você</span><strong>${p.voce}</strong></div>
              <em>x</em>
              <div><span data-nome-duelo="outro">${esc(p.nomeDoOutro)}</span><strong>${p.outro}</strong></div>
              <p class="adesivo">${esc(fraseX1 ?? '')}</p>
            </div>${fitas}`,
            { titulo: 'Desafio', filete: true },
          );
        })()
      : '';
    const linhaMelhores = fim?.melhoresDoDia ? linhaMelhoresDoDia(fim.melhoresDoDia) : null;

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
          <div><span class="rotulo">Tentativas</span><strong>${lances.length}</strong></div>
        </section>`,
      // Sem valer pontos (limite do dia, sem conexão), não mostra o total: o aviso explica.
      pontos: !valendo ? null : { total: pontos, paraTime },
      detalhe: placa(
        `<ul class="resumo-lances">
          ${lances
            .map((_, i) => {
              const r = resultados[i];
              return `<li><span class="emoji">${icone(ICONE[r.desfecho])}</span>
                <span class="resumo-titulo">${esc(rotuloDaTentativa(i))}<small>${esc(legenda(r))}</small></span>
                <strong>${r.pontos ? `+${r.pontos}` : '0'}</strong></li>`;
            })
            .join('')}
        </ul>
        ${recriou ? `<div class="numeros dois">${numero(String(recriou), recriou === 1 ? 'Lance carimbado' : 'Lances carimbados', 'destaque')}</div>` : ''}
        <button type="button" class="botao-linha" data-acao="album">Ver os lances</button>`,
        { titulo: tituloDoLance, filete: true },
      ) + duelo + (contouProMedalha ? '<div data-rumo hidden></div>' : ''),
      frases: frase ? [frase] : [],
      aviso: situacao.texto ? { texto: situacao.texto, forte: !valendo } : null,
      situacao: esperaRanking
        ? selo('Subindo pro placar…', undefined, 'data-selo-ranking')
        : valendo && situacao.tipo === 'ranking' && outro
          ? selo('Tá no placar')
          : '',
      // Destaque da dobra: o desafio recebido, a medalha nova, o recorde ou as 3 melhores do dia (a peça chega depois).
      destaques: [
        cmp ? (() => {
          const x = placarDoX1(pontos, cmp);
          return destaqueDoDuelo({ voce: x.voce, outro: x.outro, nomeDoOutro: x.nomeDoOutro, venceu: x.venceu });
        })() : null,
        medalhas.length
          ? { tipo: 'medalha', html: `<div class="selos">${medalhas.map((t) => selo(`${icone('estrela')} ${esc(t)}`, 'ouro')).join('')}</div>` }
          : null,
        destaqueDoRecorde(desempenho, 'lances'),
        destaqueDoTop3(linhaMelhores),
      ],
      selos: desempenho?.novoRecorde ? '' : htmlSelosDaPosicao(desempenho, 'lances'),
      mensagem: textoShare,
      // O desafio recebido não gera código; sem rede ou sem valer, também não: o "Mandar no grupo" de hoje, com o card.
      comDesafio: !!codigoX1 && valendo,
      mandarCard: true,
      maisUma: 'Mais uma',
    });
    if (cmp) void import('./bustosDoDuelo').then((m) => m.bustosDoDuelo(root, quemChamouX1?.boneco, quemChamouX1?.timeId));
    contar(root.querySelector<HTMLElement>('[data-contador]'), pontos);
    root.querySelector('[data-acao="album"]')!.addEventListener('click', hubUnico);
    root.querySelector('[data-acao="gols-dele"]')?.addEventListener('click', () => {
      if (tentativasDele) abrirOsGolsDele(lances[0], tentativasDele, nomeDele, x1Recebido ?? 'desafio');
    });

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
        entrouNasMelhores: !!fim && situacao.tipo === 'ranking',
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
    )
      .then((novas) => novas.length && promoverDestaque(root, destaqueDaPeca(novas.map((p) => p.nome))))
      .catch(() => {});
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
      lance: tituloDoLance,
      placarEmoji: emojisDaPartida(desfechos),
      frase: frase ?? '',
      novoRecorde: !!desempenho?.novoRecorde,
      link: link.replace('https://', ''),
      nivel: await nivelParaCard(),
      conteudo: {
        jogo: 'lances',
        lances: lances.map((_, i) => ({
          titulo: rotuloDaTentativa(i),
          desfecho: resultados[i].desfecho,
          recriou: resultados[i].recriou,
          pontos: resultados[i].pontos,
        })),
        tituloUnico: tituloDoLance,
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
      funil: codigoX1 ? { tipo: 'x1_lances', x1: codigoX1 } : { tipo: 'resultado', jogo: 'lances' },
      // O mesmo lance, partida normal (também depois de um X1).
      maisUma: () => jogarLance(LANCES.find((o) => o.id === lances[0].id) ?? lances[0]),
      inicio: () => irPara({ tela: 'inicio' }),
    });
  }

  // ---------- jogo ----------
  /**
   * `x1`: o código do X1 recebido, com `alvoX1`, quem desafiou e os pontos a bater, para o HUD.
   * A partida são 3 tentativas do mesmo lance (`lances = [l, l, l]`).
   */
  function jogo(lances: Lance[], op: { x1?: string; alvoX1?: { apelido: string | null; pontos: number } } = {}): void {
    // A faixa de cada lance é a do catálogo recalibrado; o servidor confirma a que vale ao começar.
    lances = lances.map((l) => ({ ...l, faixa: faixaNaTela(l).faixa }));
    const tabela = TABELA_LANCES_UNIFICADA;
    let codigoX1 = op.x1 ?? null;
    limparJogo?.();
    // Desistência: a partida (não o hub) é a etapa; conclui em proximo() quando acaba.
    etapa({ tipo: 'partida', jogo: 'lances', ...(op.x1 ? { x1: op.x1 } : {}) });
    root.innerHTML = `
      <main class="partida lances-jogo" style="${estilo(time.cores)}">
        <header class="hud">
          <button class="voltar" type="button" aria-label="Voltar ao álbum">‹</button>
          <div class="lances-placar">
            <span class="rotulo" data-contagem></span>
            <strong data-pontos>0</strong>
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
    let preparando = true;
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
    const resultados: ResultadoLance[] = [];
    type Fase =
      | { tipo: 'chegada'; inicio: number }
      | { tipo: 'mirar'; inicio: number }
      /** Esperando o servidor: ao preparar a partida ou, com `chutando`, o resultado do chute (o pé já corre). */
      | { tipo: 'espera'; inicio: number; chutando: boolean }
      | { tipo: 'chute'; inicio: number; r: ResultadoLance; em: (t: number) => { x: number; y: number; z: number }; dur: number }
      | { tipo: 'pausa'; inicio: number; r: ResultadoLance; em: (t: number) => { x: number; y: number; z: number }; dur: number }
      | { tipo: 'replay'; replay: Replay };
    let fase: Fase = { tipo: 'espera', inicio: relogio(), chutando: false };
    let rastro: { x: number; y: number }[] = [];
    let acabou = false;

    // Dicas na hora do erro (jogo.md, 14.4): "1º ..." vale por partida; o limite por aparelho fica em jogo/dicas.ts.
    const dicas = dicasDoAparelho();
    let dicaGuardada: string | null = null;
    let barreirasNaPartida = 0;
    let partidasComBarreira = 0;
    const vistas = { saiu: false, cara: false, recriar: false, seis: false };
    const dicaRecriar = 'lan_recriar_oito';
    const dicaValendo = 'lan_dez_valendo';
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
        [limiteTreino && valendoEsgotado && !vistas.seis, dicaValendo],
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

    const atual = () => lances[indice];
    /** Goleiro antes do chute (a conta é a de telas/elencoDoLance.ts, a mesma do telão do desafio). */
    const posicaoDoGoleiro = (x0: number): { x: number; z: number } => posicaoDoGoleiroDoLance(atual(), x0);

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
      root.querySelector('[data-contagem]')!.textContent = textoDaTentativa(indice, lances.length);
      root.querySelector('[data-pontos]')!.textContent = `${resultados.reduce((s, r) => s + r.pontos, 0)} pts`;
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
        if (indice > 0) somLargada(); // o 1º chute da partida já tem o apito de começo
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
      const dur = duracaoDoVoo(l.bola, em(r.tFim), r.cavadinha, gq.forca);
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
      // Funil do X1: só o 1º chute de um X1 recebido (codigoX1 vira null se o servidor recusou o X1).
      if (codigoX1 && indice === 0 && resultados.length === 0) contarFunil({ ev: 'primeiro_chute', tipo: 'x1_lances', x1: codigoX1 });
      const gq = normalizarCobranca(gesto);
      const l = atual();
      if (servidorOk && partidaId) void pedirAoServidor(gq, l, indice);
      else comecarChute(resolverLance(semente, indice, l, gq, tabela), gq, l, 0);
    }

    function fimDoChute(r: ResultadoLance, em: (t: number) => { x: number; y: number; z: number }, dur: number): void {
      fase = { tipo: 'pausa', inicio: relogio(), r, em, dur };
      narrar(narrador.falar(eventoDoLance(r), { etiquetas: etiquetasDoLance(r) }), legenda(r));
      if (r.desfecho === 'gol') {
        const q = cena.projetar(em(1));
        cena.comemorar(q.x, q.y, r.pontos);
      } else if (r.desfecho === 'trave') cena.baterNaTrave();
      if (r.desfecho === 'gol') somRede();
      if (r.desfecho === 'defesa') somDefesa(jeitoDaDefesa({ x: r.x }));
      else if (r.desfecho === 'barreira') somBarreira();
      somTorcida(r.desfecho === 'gol' ? 'festa' : 'uuuh');
      resultados.push(r);
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
      indice++;
      if (indice < lances.length) {
        if (servidorOk && goleiroProximo !== null) goleiroServidor = goleiroProximo;
        comecarLance();
      } else {
        acabou = true;
        etapa(null);
        somApito(true);
        setTimeout(() => vibrar('apitoFinal'), latenciaDoSom() * 1000);
        const pontos = resultados.reduce((s, r) => s + r.pontos, 0);
        resultado(lances, resultados, narrador.falar('lance_fim', { pontos }), servidorOk ? fechamento : null, aviso, codigoX1);
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
      const x0 = preparando || servidorOk ? (goleiroServidor ?? 0) : goleiroAntesDoChute(semente, indice, l);
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
              if (indice > 0) somLargada();
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

    root.querySelector('.voltar')!.addEventListener('click', () => {
      sairDaEtapa();
      hubUnico();
    });
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
        // Time e apelido precisam estar no servidor; sessão nova (aparelho limpo) regrava.
        if (!FALSO) await sincronizarTorcedor();
        const pedir = async (pedido: PedidoLances) => {
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
          r = await pedir(codigoX1 ? { desafio: codigoX1 } : { lance: lances[0].id });
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
        // A faixa que vale nesta partida (a do catálogo, ou uma abaixo pela taxa real).
        const faixaDoServidor = r.faixas?.[0];
        if (faixaDoServidor) lances = lances.map((l) => ({ ...l, faixa: faixaDoServidor }));
        partidaId = r.partidaId;
        goleiroServidor = r.goleiroX;
        servidorOk = true;
        if (avisoX1) narrar(narrador.falar('lance_abertura'), avisoX1);
      } catch (e) {
        if (acabou) return;
        if (op.x1) tirarCodigoDoEndereco();
        if (e instanceof ErroServidor && e.codigo === 'saiu_da_conta') return;
        if (e instanceof ErroServidor && e.codigo === 'limite_do_dia') {
          // A mesma partida segue como treino, no aparelho, sem tela separada.
          valendoEsgotado = true;
          limiteTreino = true;
          mostrarAviso(AVISO_LIMITE_DO_DIA);
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
    narrar(narrador.falar('lance_abertura'));
    somApito();
    void iniciarValendo();
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
  if (rota.tela === 'lances' && rota.desafio) void comecarX1(rota.desafio);
  else hubUnico();
  return () => {
    telaViva = false;
    limparJogo?.();
  };
}
