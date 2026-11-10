// Convite do desafio por link (C06, docs/jogos/contas.md "Primeiro acesso"): a tela que ?d=, ?l= e ?p= abrem, sem a Home
// atrás. Abre na hora com a placa em "Buscando o desafio…" (altura reservada) e, quando o resumo chega, quem é novo
// escolhe a torcida numa faixa (a de quem chamou ou a do rival) e isso já aceita o desafio; quem já joga encara com
// 1 toque. As regras e os textos são puros (jogo/conviteDesafio.ts); aqui só tem DOM, pedido ao servidor e funil.
// Em desenvolvimento, usa as mesmas fontes falsas da Home de antes (?penaltiFalso ou ?homeFalsa para ?d=, ?homeFalsa
// ou ?lancesFalsos para ?l=, ?provaFalsa para ?p=; veja o comentário do topo de cada uma em src/dev).
// Nos Lances, a placa ganha a fita (3 casas) e o telão com os gols de quem chamou (docs/jogos/lances.md): o HTML e o
// gramado em CSS entram junto com a placa (telas/fitaDoDesafio.ts) e o desenho vem por import() depois do primeiro
// quadro do convite, para o caminho do link não pesar (E01). Em desenvolvimento, &semMovimento força o modo parado.

import '../estilos/convite.css';
import { esc, irPara, x1DoLink, type Rota } from '../app';
import { corDeTexto, ID_OUTRO, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import {
  acoesDoConvite,
  avisoDoConvite,
  COMO_PENALTIS,
  COMO_PROVA,
  destinoDoDesafio,
  DICA_DA_ESCOLHA,
  faixasDoConvite,
  LINHA_DA_FAIXA,
  linhaDeQuemJaJoga,
  listaDoConvite,
  LISTA_SEM_DESAFIO,
  rotuloDoConvite,
  situacaoDoResumo,
  TIPO_DO_FUNIL,
  TITULO_DA_ESCOLHA,
  textoDoConvitePenaltis,
  textoDoConviteProva,
  type SituacaoDoConvite,
  type TipoConvite,
} from '../jogo/conviteDesafio';
import { chamadaDaDisputa, type Disputa } from '../jogo/disputas';
import { linhaDosGolsContinuam, linhaNenhumGol, sequenciaDeGols, type ModoDoTelao } from '../jogo/golsDoDesafio';
import { textoDoConviteLances, tituloDoConviteLances } from '../jogo/home';
import type { Faixa, Lance } from '../jogo/lances';
import type { TentativaDoDesafio } from '../jogo/tentativasDoDesafio';
import {
  verDesafio,
  verDesafioLances,
  verDesafioProva,
  type ResumoDesafio,
  type ResumoDesafioLances,
  type ResumoDesafioProva,
} from '../servidor/api';
import { contar, etapa } from '../servidor/funil';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { bustoDoConvite } from './bustoDoConvite';
import { guardarDesafioAberto } from './desafioAberto';
import { htmlDaFita, htmlDoTelao, modoNesteAparelho } from './fitaDoDesafio';
import { ajustarNomesDeTime } from './nomesDeTime';
import { conviteResolvido } from './primeiraTela';

type Resumo = ResumoDesafio | ResumoDesafioLances | ResumoDesafioProva;

// Constantes `import.meta.env.DEV && …` (e não uma função): no build de produção viram `false` e os falsos saem do pacote.
const FALSO_PENALTI = import.meta.env.DEV && new URLSearchParams(location.search).has('penaltiFalso');
const FALSA_HOME = import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa');
const FALSOS_LANCES = import.meta.env.DEV && new URLSearchParams(location.search).has('lancesFalsos');
const FALSA_PROVA = import.meta.env.DEV && new URLSearchParams(location.search).has('provaFalsa');

/** O resumo do desafio no servidor (ou no falso de desenvolvimento). Falha de rede vira rejeição. */
function buscarResumo(tipo: TipoConvite, codigo: string): Promise<Resumo | null> {
  if (tipo === 'penaltis') return FALSO_PENALTI || FALSA_HOME ? import('../dev/penaltiFalso').then((m) => m.verDesafio(codigo)) : verDesafio(codigo);
  if (tipo === 'lances') {
    if (FALSA_HOME) return import('../dev/homeFalsa').then((m) => m.verDesafioLances(codigo));
    if (FALSOS_LANCES) return import('../dev/lancesFalsos').then((m) => m.verDesafioLances(codigo));
    return verDesafioLances(codigo);
  }
  return FALSA_PROVA ? import('../dev/provaFalsa').then((m) => m.verDesafioProva(codigo)) : verDesafioProva(codigo);
}

/** Tira ?d=, ?l= e ?p= do endereço (o resto da busca e o hash ficam), para a Home não reabrir o convite. */
function limparEndereco(): void {
  try {
    const url = new URL(location.href);
    ['d', 'l', 'p'].forEach((k) => url.searchParams.delete(k));
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // endereço que o navegador não deixa trocar: segue com ele como está
  }
}

const pelasCores = (t: Time | undefined): string => (t ? `--c1:${t.cores[0]};--c2:${t.cores[1]}` : '');

/** O telão não baixa de uma fração da largura: abaixo disso o travessão sai do quadro. */
const ALTURA_MINIMA_DO_TELAO = 0.36;

/** Depois do primeiro quadro pintado e com o navegador ocioso (teto de ~300 ms; sem requestIdleCallback, um pequeno atraso). */
function quandoOcioso(fn: () => void): void {
  requestAnimationFrame(() => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 300 });
    else setTimeout(fn, 150);
  });
}


/** A faixa de time: o card do time (cor 1, faixa da cor 2 embaixo, filete da 3ª) com a linha que diz o que o toque faz. */
function faixaDoTime(t: Time): string {
  const estilo = `--c1:${t.cores[0]};--c2:${t.cores[1]};--c3:${t.cor3 ?? t.cores[1]};--txt:${corDeTexto(t.cores[0])};--txt2:${corDeTexto(t.cores[1])}`;
  const linha = esc(LINHA_DA_FAIXA).replace(/ ›$/, '<span aria-hidden="true"> ›</span>');
  return `<button type="button" class="cartao-time faixa-do-convite${t.cores[0].toLowerCase() === '#ffffff' ? ' clara' : ''}" data-faixa-time="${t.id}" style="${estilo}">
      <span class="nome-time">${esc(t.nome)}</span>
      <span class="faixa-linha"><span>${linha}</span></span>
    </button>`;
}

/** O desafio já aberto: o que a placa mostra e o que as faixas e a triagem vão precisar. */
interface Aberto {
  html: string;
  /** O que a placa mostra depois do aviso quando o desafio está vencido (Lances com os gols de quem chamou). */
  htmlVencido?: string;
  /** O telão dos gols de quem chamou (Lances, com pelo menos 1 gol e o lance no catálogo). */
  telao?: { lance: Lance; tentativas: TentativaDoDesafio[]; quem: { apelido: string | null; boneco: unknown; timeId: string }; modo: ModoDoTelao };
  timeDeQuemChamou: Time | undefined;
  faixas: Time[];
  boneco: unknown;
  /** A disputa de quem chamou (pênaltis), que segue na rota para a partida abrir já no cenário dela. */
  disputa?: Disputa;
}

export function telaConvite(root: HTMLElement, rota: Rota): () => void {
  if (rota.tela !== 'convite') return () => {};
  const { tipo, codigo } = rota;
  // Quem é novo ainda não tem torcida. (O `?time=` do link não vale aqui: o convite é quem oferece as faixas.)
  const novo = !prefs.get().time;
  let situacao: SituacaoDoConvite = 'buscando';
  let aberto: Aberto | null = null;
  let saiu = false;
  let telao: { parar(): void } | null = null;
  // Os catálogos continuam fora do bundle inicial: começam a baixar junto com o resumo.
  const catalogoDisputas = tipo === 'penaltis' ? import('../dados/disputas').catch(() => null) : null;
  const catalogoLances = tipo === 'lances' ? import('../dados/lances').catch(() => null) : null;

  root.innerHTML = `
    <main class="tela convite" data-tipo="${tipo}">
      <h1 class="marca-pequena">Guerra <span>de Torcidas</span></h1>
      <section class="placa filete placa-convite" data-placa data-situacao="buscando" aria-live="polite"></section>
      <div class="convite-acoes" data-acoes></div>
    </main>`;
  const elPlaca = root.querySelector<HTMLElement>('[data-placa]')!;
  const elAcoes = root.querySelector<HTMLElement>('[data-acoes]')!;

  /** O texto da placa quando o desafio está aberto (cada jogo diz o seu). */
  async function montar(d: Resumo): Promise<Aberto> {
    const t = timePorId(d.time_id);
    const nomeDoTime = t && t.id !== ID_OUTRO ? t.nome : null;
    let rotulo = rotuloDoConvite(d.apelido);
    let texto = '';
    let extra = '';
    let como = '';
    let disputa: Disputa | undefined;
    let gols = '';
    let aVerOsGols: Aberto['telao'];
    let temGol = false;
    if (tipo === 'penaltis') {
      const p = d as ResumoDesafio;
      texto = textoDoConvitePenaltis({ apelido: p.apelido, time_id: p.time_id, pontos: p.pontos, gols_jogador: p.gols_jogador, gols_maquina: p.gols_maquina });
      // A ficha da disputa de quem chamou; fora do catálogo, o convite segue sem ela.
      disputa = p.disputa_id ? (await catalogoDisputas)?.DISPUTAS.find((x) => x.id === p.disputa_id) : undefined;
      if (disputa) extra = `<p class="convite-como">Disputa: ${esc(disputa.titulo)}. ${esc(chamadaDaDisputa(disputa))}</p>`;
      como = COMO_PENALTIS;
    } else if (tipo === 'lances') {
      const l = d as ResumoDesafioLances;
      const lance = (await catalogoLances)?.LANCES.find((x) => x.id === l.lance_id);
      const titulo = lance?.titulo ?? null;
      rotulo = tituloDoConviteLances(l.apelido);
      texto = textoDoConviteLances({ quem: l.apelido, time: nomeDoTime, pontos: l.pontos, titulo });
      // Os gols de quem chamou (servidor novo, partida com as 3 tentativas): telão (se houver gol) e fita; sem gol, a linha da faixa.
      const tentativas = l.tentativas ?? null;
      if (tentativas) {
        const sequencia = sequenciaDeGols(tentativas);
        temGol = sequencia.length > 0;
        const modo = modoNesteAparelho(true);
        if (lance && temGol) {
          gols += htmlDoTelao(sequencia, modo);
          aVerOsGols = { lance, tentativas, quem: { apelido: l.apelido, boneco: l.boneco ?? null, timeId: l.time_id }, modo };
        }
        gols += htmlDaFita(tentativas);
        if (!temGol) {
          // Os pontos do gol na faixa vêm da tabela do motor, que só se baixa neste caso (sem gol).
          const pontosDoGol = await import('../jogo/lances').then((m) => m.TABELA_LANCES_UNIFICADA.faixa[l.faixa as Faixa]).catch(() => null);
          gols += `<p class="convite-nenhum-gol">${esc(linhaNenhumGol(l.faixa, pontosDoGol))}</p>`;
        }
      }
    } else {
      const p = d as ResumoDesafioProva;
      texto = textoDoConviteProva({ apelido: p.apelido, time_id: p.time_id, pontos: p.pontos, resumo: p.resumo });
      extra = `<p class="escada-emoji">${esc(p.escada)}</p>`;
      como = COMO_PROVA;
    }
    return {
      html: `<p class="rotulo">${esc(rotulo)}</p>
        <p class="convite-texto">${esc(texto)}</p>
        ${extra}
        ${como ? `<p class="convite-como">${esc(como)}</p>` : ''}
        ${gols}`,
      htmlVencido: gols ? `${temGol ? `<p class="convite-texto">${esc(linhaDosGolsContinuam(d.apelido))}</p>` : ''}${gols}` : undefined,
      telao: aVerOsGols,
      timeDeQuemChamou: t,
      faixas: faixasDoConvite(d.time_id),
      boneco: 'boneco' in d ? d.boneco : undefined,
      disputa,
    };
  }

  function pintarPlaca(): void {
    elPlaca.dataset.situacao = situacao;
    const comAsCores = situacao === 'aberto' || (situacao === 'vencido' && !!aberto?.htmlVencido);
    elPlaca.setAttribute('style', comAsCores ? pelasCores(aberto?.timeDeQuemChamou) : '');
    if (situacao === 'buscando') {
      elPlaca.innerHTML = '<p class="rotulo">Te desafiaram</p><p class="convite-texto">Buscando o desafio…</p>';
    } else if (situacao === 'aberto' && aberto) {
      elPlaca.innerHTML = aberto.html;
      bustoDoConvite(elPlaca.querySelector<HTMLElement>('.convite-texto'), aberto.boneco, aberto.timeDeQuemChamou?.cores);
    } else {
      elPlaca.innerHTML = `<p class="convite-aviso">${esc(avisoDoConvite(situacao) ?? '')}</p>${situacao === 'vencido' ? (aberto?.htmlVencido ?? '') : ''}`;
    }
  }

  function pintarAcoes(): void {
    const a = acoesDoConvite(situacao, novo, aberto?.faixas.length ?? 0);
    const botao = (acao: string, texto: string, amarelo: boolean) =>
      `<button class="botao${amarelo ? '' : ' botao-sec'}" type="button" data-acao="${acao}">${texto}</button>`;
    const html: string[] = [];
    if (a.encarar) html.push(`<p class="convite-joga">${esc(linhaDeQuemJaJoga(prefs.get().time))}</p>`);
    if (a.faixas && aberto)
      html.push(
        `<h2 class="convite-escolha">${esc(TITULO_DA_ESCOLHA)}</h2>`,
        `<div class="convite-faixas" data-n="${aberto.faixas.length}">${aberto.faixas.map(faixaDoTime).join('')}</div>`,
      );
    if (a.amarelo === 'escolher') html.push(botao('escolher-time', 'Escolher meu time', true));
    if (a.amarelo === 'encarar') html.push(botao('encarar', 'Encarar o desafio', true));
    if (a.amarelo === 'tentar') html.push(botao('tentar', 'Tentar de novo', true));
    if (a.amarelo === 'inicio') html.push(botao('ir-inicio', 'Ir pro início', true));
    if (a.escolher === 'outro_time') html.push(botao('outro-time', 'Outro time', false));
    if (a.inicio && a.amarelo !== 'inicio') html.push(botao('ir-inicio', 'Ir pro início', false));
    if (a.faixas) html.push(`<p class="convite-dica">${esc(DICA_DA_ESCOLHA)}</p>`);
    if (a.outroAparelho) html.push('<button class="link-feedback" type="button" data-acao="outro-aparelho">Já jogo em outro aparelho</button>');
    elAcoes.innerHTML = html.join('');
    ajustarNomesDeTime(elAcoes);
    // Desistência: a escolha da torcida é a etapa (quem já joga não escolhe nada, então não entra).
    if (novo && (a.faixas || a.escolher)) etapa({ tipo: 'escolha_time', x1: x1DoLink() });
  }

  /**
   * O telão nunca empurra as faixas de time nem o "Outro time" para fora da tela: se faltar espaço (celular baixo, fonte do
   * sistema grande), ele baixa, até um mínimo em que o gol continua inteiro (o canvas fica alinhado embaixo).
   */
  function caberNaTela(): void {
    const figura = elPlaca.querySelector<HTMLElement>('[data-telao]');
    if (!figura) return;
    figura.style.removeProperty('height');
    figura.style.removeProperty('aspect-ratio');
    const ultimo = [...elAcoes.querySelectorAll<HTMLElement>('[data-acao="outro-time"], [data-acao="escolher-time"], [data-acao="encarar"], [data-acao="ir-inicio"]')].pop();
    if (!ultimo) return;
    const falta = ultimo.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    if (falta <= 0) return;
    const { width, height } = figura.getBoundingClientRect();
    const nova = Math.max(Math.round(width * ALTURA_MINIMA_DO_TELAO), Math.floor(height - falta));
    if (nova < height) {
      figura.style.aspectRatio = 'auto';
      figura.style.height = `${nova}px`;
    }
  }
  window.addEventListener('resize', caberNaTela);
  void document.fonts?.ready.then(caberNaTela);

  function pintar(): void {
    pintarPlaca();
    pintarAcoes();
    caberNaTela();
    // De novo no quadro seguinte: o tamanho da letra (fonte do sistema, Barlow chegando) pode mudar depois da pintura.
    requestAnimationFrame(caberNaTela);
  }

  /** O desenho do telão vem depois do convite pintado e resolvido (E01); com economia de dados, só no toque. */
  function agendarTelao(): void {
    const t = aberto?.telao;
    const figura = elPlaca.querySelector<HTMLElement>('[data-telao]');
    if (!t || !figura || saiu || (situacao !== 'aberto' && situacao !== 'vencido')) return;
    let carregando = false;
    const iniciar = (): void => {
      if (carregando || saiu || !figura.isConnected) return;
      carregando = true;
      void import('./telaoDoDesafio')
        .then((m) => {
          if (saiu || !figura.isConnected) return;
          telao = m.iniciarTelao({
            figura,
            lance: t.lance,
            tentativas: t.tentativas,
            codigo,
            quem: t.quem,
            fita: elPlaca.querySelector('[data-fita]'),
            modo: t.modo,
            aoVerOPrimeiroGol: () => contar({ ev: 'viu_gols', tipo: 'x1_lances', x1: codigo }),
          });
        })
        .catch(() => {
          // Sem o desenho (rede caiu): com o telão que ia rodar sozinho, some; sob demanda, o botão deixa tentar de novo.
          carregando = false;
          if (t.modo !== 'sob_demanda') figura.hidden = true;
        });
    };
    if (t.modo === 'sob_demanda') figura.querySelector('[data-telao-botao]')?.addEventListener('click', iniciar);
    else quandoOcioso(iniciar);
  }

  function buscar(): void {
    telao?.parar();
    telao = null;
    situacao = 'buscando';
    aberto = null;
    pintar();
    buscarResumo(tipo, codigo)
      .then(async (r) => {
        if (saiu) return;
        const s = situacaoDoResumo(r);
        if (s === 'aberto' && r) {
          const a = await montar(r);
          if (saiu) return;
          aberto = a;
          guardarDesafioAberto({ tipo, codigo, apelido: r.apelido, pontos: r.pontos, timeId: r.time_id, boneco: a.boneco });
        } else if (s === 'vencido' && r && tipo === 'lances' && (r as ResumoDesafioLances).tentativas) {
          // Vencido: o aviso fica e os gols continuam aqui. Não guarda o desafio como aberto nem oferece as faixas.
          const a = await montar(r);
          if (saiu) return;
          aberto = a;
        }
        situacao = s;
        pintar();
      })
      .catch(() => {
        if (saiu) return;
        situacao = 'sem_rede';
        pintar();
      })
      .finally(() => {
        conviteResolvido();
        agendarTelao();
      });
  }

  // Um aceite só: o 2º toque rápido (a troca de tela é adiada pela transição) não conta de novo nem troca de tela outra vez.
  let aceitou = false;
  const encarar = () => {
    if (aceitou) return;
    aceitou = true;
    contar({ ev: 'aceitou', tipo: TIPO_DO_FUNIL[tipo], x1: codigo });
    const destino = destinoDoDesafio(tipo, codigo);
    irPara(destino.tela === 'partida' && aberto?.disputa ? { ...destino, disputa: aberto.disputa } : destino);
  };

  /** Tocar numa faixa escolhe a torcida e já aceita o desafio: o aquecimento fica para depois (card na Home). */
  function escolherFaixa(timeId: string): void {
    if (aceitou) return;
    prefs.set({ time: timeId });
    void sincronizarTorcedor().catch(() => {}); // sem rede, o time fica salvo no aparelho e sobe na próxima partida
    etapa(null);
    const aquecimento = prefs.get().aquecimento ?? {};
    if (!aquecimento.visto && !aquecimento.cardNaHome) prefs.set({ aquecimento: { ...aquecimento, cardNaHome: true } });
    encarar();
  }

  const main = root.querySelector<HTMLElement>('main')!;
  main.addEventListener('click', (e) => {
    const alvo = (e.target as Element).closest<HTMLElement>('[data-acao], [data-faixa-time]');
    if (!alvo || !main.contains(alvo)) return;
    if (alvo.dataset.faixaTime) return escolherFaixa(alvo.dataset.faixaTime);
    switch (alvo.dataset.acao) {
      case 'encarar':
        return encarar();
      case 'outro-time':
        etapa(null); // a lista abre a etapa dela
        return irPara(listaDoConvite(tipo, codigo));
      case 'escolher-time':
        etapa(null);
        // Com o desafio aberto, a lista do convite; vencido ou inexistente, a lista de sempre (triagem, aquecimento, Home).
        if (situacao === 'aberto') return irPara(listaDoConvite(tipo, codigo));
        limparEndereco();
        return irPara(LISTA_SEM_DESAFIO);
      case 'ir-inicio':
        limparEndereco();
        return irPara({ tela: 'inicio' });
      case 'tentar':
        return buscar();
      case 'outro-aparelho':
        return irPara({ tela: 'entrar', de: 'convite' });
    }
  });

  buscar();

  return () => {
    saiu = true;
    telao?.parar();
    telao = null;
    window.removeEventListener('resize', caberNaTela);
    // Saiu antes de o resumo chegar (rede pendurada): o resto da Home não precisa mais esperar o convite.
    conviteResolvido();
  };
}
