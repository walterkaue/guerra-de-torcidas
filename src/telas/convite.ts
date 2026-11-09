// Convite do desafio por link (C06, docs/jogos/contas.md "Primeiro acesso"): a tela que ?d=, ?l= e ?p= abrem, sem a Home
// atrás. Abre na hora com a placa em "Buscando o desafio…" (altura reservada) e, quando o resumo chega, quem é novo
// escolhe a torcida numa faixa (a de quem chamou ou a do rival) e isso já aceita o desafio; quem já joga encara com
// 1 toque. As regras e os textos são puros (jogo/conviteDesafio.ts); aqui só tem DOM, pedido ao servidor e funil.
// Em desenvolvimento, usa as mesmas fontes falsas da Home de antes (?penaltiFalso ou ?homeFalsa para ?d=, ?homeFalsa
// ou ?lancesFalsos para ?l=, ?provaFalsa para ?p=; veja o comentário do topo de cada uma em src/dev).

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
import { chamadaDaDisputa } from '../jogo/disputas';
import { textoDoConviteLances, tituloDoConviteLances } from '../jogo/home';
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
  timeDeQuemChamou: Time | undefined;
  faixas: Time[];
  boneco: unknown;
}

export function telaConvite(root: HTMLElement, rota: Rota): () => void {
  if (rota.tela !== 'convite') return () => {};
  const { tipo, codigo } = rota;
  // Quem é novo ainda não tem torcida. (O `?time=` do link não vale aqui: o convite é quem oferece as faixas.)
  const novo = !prefs.get().time;
  let situacao: SituacaoDoConvite = 'buscando';
  let aberto: Aberto | null = null;
  let saiu = false;
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
    if (tipo === 'penaltis') {
      const p = d as ResumoDesafio;
      texto = textoDoConvitePenaltis({ apelido: p.apelido, time_id: p.time_id, pontos: p.pontos, gols_jogador: p.gols_jogador, gols_maquina: p.gols_maquina });
      // A ficha da disputa de quem chamou; fora do catálogo, o convite segue sem ela.
      const disputa = p.disputa_id ? (await catalogoDisputas)?.DISPUTAS.find((x) => x.id === p.disputa_id) : undefined;
      if (disputa) extra = `<p class="convite-como">Disputa: ${esc(disputa.titulo)}. ${esc(chamadaDaDisputa(disputa))}</p>`;
      como = COMO_PENALTIS;
    } else if (tipo === 'lances') {
      const l = d as ResumoDesafioLances;
      const titulo = (await catalogoLances)?.LANCES.find((x) => x.id === l.lance_id)?.titulo ?? null;
      rotulo = tituloDoConviteLances(l.apelido);
      texto = textoDoConviteLances({ quem: l.apelido, time: nomeDoTime, pontos: l.pontos, titulo });
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
        ${como ? `<p class="convite-como">${esc(como)}</p>` : ''}`,
      timeDeQuemChamou: t,
      faixas: faixasDoConvite(d.time_id),
      boneco: 'boneco' in d ? d.boneco : undefined,
    };
  }

  function pintarPlaca(): void {
    elPlaca.dataset.situacao = situacao;
    elPlaca.setAttribute('style', situacao === 'aberto' ? pelasCores(aberto?.timeDeQuemChamou) : '');
    if (situacao === 'buscando') {
      elPlaca.innerHTML = '<p class="rotulo">Te desafiaram</p><p class="convite-texto">Buscando o desafio…</p>';
    } else if (situacao === 'aberto' && aberto) {
      elPlaca.innerHTML = aberto.html;
      bustoDoConvite(elPlaca.querySelector<HTMLElement>('.convite-texto'), aberto.boneco, aberto.timeDeQuemChamou?.cores);
    } else {
      elPlaca.innerHTML = `<p class="convite-aviso">${esc(avisoDoConvite(situacao) ?? '')}</p>`;
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

  function pintar(): void {
    pintarPlaca();
    pintarAcoes();
  }

  function buscar(): void {
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
        }
        situacao = s;
        pintar();
      })
      .catch(() => {
        if (saiu) return;
        situacao = 'sem_rede';
        pintar();
      })
      .finally(conviteResolvido);
  }

  const encarar = () => {
    contar({ ev: 'aceitou', tipo: TIPO_DO_FUNIL[tipo], x1: codigo });
    irPara(destinoDoDesafio(tipo, codigo));
  };

  /** Tocar numa faixa escolhe a torcida e já aceita o desafio: o aquecimento fica para depois (card na Home). */
  function escolherFaixa(timeId: string): void {
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
        return irPara({ tela: 'entrar', de: 'times' });
    }
  });

  buscar();

  return () => {
    saiu = true;
  };
}
