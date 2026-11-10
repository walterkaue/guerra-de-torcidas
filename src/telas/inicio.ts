// Tela inicial (docs/visual.md, seção 3): cabeçalho com avatar, arquibancada do time, cabo de guerra contra o
// rival com a sua posição, "Jogar agora", cards dos jogos com desenho e estado vivo, e o giro da semana.

import { esc, irPara, type Rota } from '../app';
import { LANCES_POR_CLUBE } from '../dados/lancesResumo';
import { ID_OUTRO, TIMES, corDeTexto, corDoRivalNoDuelo, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { fecharAbandonado, limparPendente } from '../jogo/aquecimento';
import { AVISO_RESENHA } from '../jogo/cravaTela';
import { arrumar, avisosDaCaixa, idDoTermos, lerEstado, numeroDoSininho, rotuloDoSininho, type EntradaDaCaixa } from '../jogo/avisosCaixa';
import { avisoDosTermos, DATA_DA_VERSAO } from '../jogo/termos';
import { barraDoTime, TEXTO_SEM_REDE, type BarraDoTime, type LinhaDaSemana } from '../jogo/barraDoTime';
import { avisoDaVaga, ORDEM_DA_VAGA, type AvisoDaVaga, type AvisosDaAbertura } from '../jogo/vagaDoMomento';
import type { BlocoDasDivisoes } from '../jogo/temporada';
import {
  degrausDoRecorde,
  fechaSemPalpite,
  frasesDoGiro,
  linhaDoDia,
  linhaDosLances,
  luzDoHorario,
  motivoDoJogo,
  placarCravado,
  proximoJogo,
  rotuloDoLanceDoDia,
  tituloDaCasa,
  tonsDosChutes,
  type JogoDaHome,
  type SituacaoDoDia,
} from '../jogo/home';
import { linhaPosicaoSemana, linhaRecorde, setaDaPosicao } from '../jogo/posicao';
import { linhaMelhoresDoDia } from '../jogo/lancesTextos';
import { LANCES_PARTIDAS_POR_DIA_UNIFICADO, MELHORES_DO_DIA, itemPenaltis, lanceDoDia } from '../jogo/regraLances';
import { idsDoLanceDoDia } from '../jogo/lancesTelaUnica';
import { faltamDosLances, linhaLancesUnificados, statusCrava } from '../jogo/statusJogos';
import { escolherFrase } from '../narrador/escolher';
import { rivalDaSemana, situacaoDoDuelo } from '../narrador/rival';
import { contextoDoTime } from '../narrador/sessao';
import {
  estadoDoDia,
  meusLancesHoje,
  meusRecordes,
  minhaPosicaoSemana,
  ouvirRanking,
  partidasFechadasHoje,
  rankingDaSemana,
  registrarAquecimento,
  type LinhaRanking,
} from '../servidor/api';
import { jogosDoCrava, meusDadosDoCrava, type Jogo } from '../servidor/crava';
import { diaBrasilia, horaBrasilia, msAteZerarSemana, semanaBrasilia } from '../servidor/tempo';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { htmlBotaoApoio, ligarBotaoApoio } from './apoio';
import { ligarArquibancada } from './arquibancada';
import { anotarCarreira, xpGuardado } from './carreira';
import { depoisDoConvite } from './primeiraTela';
import * as realCidade from '../servidor/rankingCidades';
import { acimaNaUltimaVisita, guardarCidadeVista, linhaDaCidadeNaHome, type CidadeVista, type MinhaCidade } from '../jogo/rankingCidades';
import { fraseDaCidade } from '../narrador/cidade';
import { seloPre, faixa, numero as numeroBloco, posicaoHtml } from './blocos';
import { arteEscada, arteGrade, htmlDaCasa, htmlDoLanceDoDia, htmlDosCards } from './cardsJogos';
import { registrarAviso } from './avisosDoAparelho';
import { pintarAvatar } from './bonecoDoAparelho';
import type { FraseDoMes } from './blocoDivisoes';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';
import { icone } from './icones';
import { qualidade } from './qualidade';

const SERVIDOR = { rankingDaSemana, minhaPosicaoSemana, partidasFechadasHoje, estadoDoDia, jogosDoCrava, meusDadosDoCrava, meusRecordes, meusLancesHoje };
// Em desenvolvimento, ?homeFalsa troca o servidor por um de mentira (src/dev/homeFalsa.ts) e ?diaFalso
// usa o Time do Dia de mentira também no card (src/dev/diaFalso.ts).
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa');
/** O resultado da sincronização fica guardado: redesenha só uma vez por carregamento, senão repetiria sem fim. */
let jaRedesenhou = false;
// Em desenvolvimento, ?cidadesFalsas=com|sem|faltam|vazia|erro troca o servidor da cidade por um de mentira.
const FALSA_CIDADE = import.meta.env.DEV && new URLSearchParams(location.search).has('cidadesFalsas');
const CHAVE_CIDADE_VISTA = 'gdt:cidade-acima';
const servidorCidade = async (): Promise<typeof realCidade> => (FALSA_CIDADE ? import('../dev/cidadesFalsas') : realCidade);
const FALSA_DIA = import.meta.env.DEV && new URLSearchParams(location.search).has('diaFalso');
const servidorJa = async (): Promise<typeof SERVIDOR> => {
  if (FALSA) return import('../dev/homeFalsa');
  return FALSA_DIA ? { ...SERVIDOR, estadoDoDia: (await import('../dev/diaFalso')).estadoDoDia } : SERVIDOR;
};
/** Altura da arquibancada (px de desenho e de tela): com time escolhido ela cresce para abrigar a barra do time. */
const ALTURA_COM_BARRA = 196;
/** Em desenvolvimento, ?hora=20 escolhe a luz da arquibancada. */
const horaDaLuz = () => (import.meta.env.DEV && Number(new URLSearchParams(location.search).get('hora'))) || horaBrasilia();

const CHAVE_DUELO = 'gdt:duelo';
const CHAVE_POSICOES = 'gdt:posicoes';
const CHAVE_MINHA_POSICAO = 'gdt:minha-posicao';
/** O giro troca de frase a cada 5 s, com um esmaecer curto. */
const GIRO_SEGUNDOS = 5;
const GIRO_ESMAECER_MS = 260;

/** Lê/grava um pedacinho de memória do aparelho (sempre com try/catch). */
function memoria<T>(chave: string, valor?: T): T | null {
  try {
    const antes = JSON.parse(localStorage.getItem(chave) ?? 'null') as T | null;
    if (valor !== undefined) localStorage.setItem(chave, JSON.stringify(valor));
    return antes;
  } catch {
    return null;
  }
}

export function formatarContagem(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const dois = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${dois(h)}h ${dois(m)}m` : `${dois(h)}h ${dois(m)}m ${dois(seg)}s`;
}

const numero = (n: number) => Math.round(n).toLocaleString('pt-BR');
const pelo = (t: Time) => (t.artigo === 'a' ? 'pela' : 'pelo');

/** O "º" fora da Anton (ela o desenha como um zero elevado). */
const posicaoGrande = (posicao: string): string => (posicao.endsWith('º') ? `${esc(posicao.slice(0, -1))}<i>º</i>` : esc(posicao));

const ROTULO_DA_BARRA = 'Tabela ›';
const ROTULO_DA_CIDADE = 'Escolher ›';

/** A barra do time por dentro: filete nas duas cores, posição grande, duas linhas e o rótulo à direita. */
function htmlDaBarra(b: BarraDoTime): string {
  const filete = '<i class="barra-filete" aria-hidden="true"></i>';
  const grande = b.grande ? `<strong class="barra-grande" aria-hidden="true">${posicaoGrande(b.grande)}</strong>` : '';
  const texto = `<span class="barra-texto"><b>${esc(b.linha1)}</b>${b.linha2 ? `<span>${esc(b.linha2)}</span>` : ''}</span>`;
  if (!b.destino) return `<div class="barra-time" role="status">${filete}${grande}${texto}</div>`;
  const rotulo = b.destino === 'escolher-cidade' ? ROTULO_DA_CIDADE : ROTULO_DA_BARRA;
  return `<button class="barra-time" type="button" data-destino="${b.destino}" aria-label="${esc(b.leitor)}">${filete}${grande}${texto}<span class="barra-rotulo" aria-hidden="true">${rotulo}</span></button>`;
}

/** Tarja da arquibancada: o time de quem joga, ou a pergunta de quem ainda não escolheu. */
function tarjaDoTime(time: Time | undefined): string {
  if (!time) {
    // A faixa inteira é o botão (antes era um link pequeno embaixo dela, que passava batido).
    return `<button class="bloco-time-faixa faixa-tv sem-time" type="button" data-acao="trocar">
        <span class="rotulo">Sem cadastro. Abre e joga.</span>
        <span class="faixa-titulo">Qual é a sua torcida?</span>
        <span class="faixa-convite">Escolher meu time ›</span>
      </button>`;
  }
  return `<div class="bloco-time-faixa faixa-tv">
        <p class="rotulo">${time.id === ID_OUTRO ? 'Você joga pelo' : `Você joga ${pelo(time)}`}</p>
        <h2>${esc(time.id === ID_OUTRO ? 'Seu time' : time.nome)}</h2>
      </div>
      <button class="link-trocar" type="button" data-acao="trocar">trocar</button>`;
}

/**
 * Seção "Como tá a guerra" (fim da Home): o placar do clássico, as divisões, a cidade, e o giro, nessa ordem.
 * Se nenhum bloco aparecer, o rótulo some junto (a regra está no CSS, com :has).
 */
function secaoDaGuerra(time: Time | undefined): string {
  const comTime = time && time.id !== ID_OUTRO ? time : undefined;
  return `<div class="secao-guerra">
      <h2 class="secao-rotulo">Como tá a guerra</h2>

      <section class="cabo placa" aria-label="Placar do clássico" hidden>
        <div class="cabo-duelo" data-duelo hidden>
          ${faixa('Placar do clássico')}
          <div class="cabo-nomes">
            <p><strong data-cabo-v-eu></strong><span data-cabo-eu></span></p>
            <p><strong data-cabo-v-rival></strong><span data-cabo-rival></span></p>
          </div>
          <div class="cabo-corda">
            <div class="cabo-barra"><span data-cabo-lado="eu"></span><span data-cabo-lado="rival"></span></div>
            <span class="cabo-no" aria-hidden="true"></span>
          </div>
          <p class="adesivo" data-frase-rival hidden></p>
        </div>
        <p class="cabo-voce" data-posicao-semana aria-live="polite" hidden></p>
      </section>

      ${comTime ? `<section class="bloco-divisoes placa" data-divisoes aria-label="Tabela do mês" style="--c1:${comTime.cores[0]};--c2:${comTime.cores[1]}"></section>` : ''}

      <section class="bloco-cidade" data-cidade aria-live="polite" hidden></section>

      <button class="giro faixa-tv" type="button" data-acao="ranking" hidden>
        <span class="giro-selo rotulo">Giro</span><span class="giro-frase" data-giro></span><span class="so-leitor">. Ver a tabela da semana</span>
      </button>

    </div>`;
}

export function telaInicio(root: HTMLElement, _rota: Rota): () => void {
  const time = timePorId(prefs.get().time);
  const semana = semanaBrasilia();
  let pararRanking: (() => void) | null = null;
  let saiu = false;
  // O resto da Home espera o convite de quem chegou por link de desafio (telas/primeiraTela.ts; a tela do convite o
  // libera) e não sai se a pessoa já deixou a Home nesse meio-tempo (todos os pedidos abaixo tratam a falha).
  const naHome = (): Promise<void> => depoisDoConvite().then(() => (saiu ? Promise.reject(new Error('saiu da Home')) : undefined));
  const servidor = (): Promise<typeof SERVIDOR> => naHome().then(servidorJa);

  const estiloTime = (t: Time) => `--c1:${t.cores[0]};--c2:${t.cores[1]};--txt:${corDeTexto(t.cores[0])}`;

  const dono = time ?? timePorId(ID_OUTRO)!;

  // Termos mudaram desde a última visita: faixa discreta até abrir #termos, sem bloquear o jogo.
  const termos = avisoDosTermos(prefs.get().termosVistos);
  if (termos === 'guardar') prefs.set({ termosVistos: DATA_DA_VERSAO });

  root.innerHTML = `
    <main class="inicio">
      <header class="cabecalho">
        <div class="cabecalho-linha">
          <button class="avatar" type="button" data-acao="perfil" aria-label="Abrir meu perfil" style="${estiloTime(dono)}">${icone('pessoa')}</button>
          <h1 class="marca-pequena">Guerra <span>de Torcidas</span></h1>
          <button class="sininho" type="button" data-acao="sininho" aria-label="Avisos" aria-haspopup="dialog">
            ${icone('sino')}<span class="sininho-num" data-sininho-num aria-hidden="true" hidden></span>
          </button>
        </div>
        <div class="contagem rotulo">${seloPre()}<span>Semana fecha em <strong data-contagem>${formatarContagem(msAteZerarSemana())}</strong></span></div>
      </header>

      <section class="arquibancada${time ? ' com-barra' : ''}" style="${estiloTime(dono)}" aria-label="Sua torcida">
        <canvas class="arquibancada-tela" aria-hidden="true"></canvas>
        ${tarjaDoTime(time)}
        ${time ? '<div class="barra-slot" data-barra></div>' : ''}
      </section>

      <button class="botao botao-jogar" type="button" data-acao="jogar-agora">Jogar agora<small data-motivo>&nbsp;</small></button>

      <!-- A vaga do momento: um aviso por abertura (jogo/vagaDoMomento.ts). Vazia, não ocupa espaço. -->
      <div class="vaga" data-vaga></div>

      <section class="grade-jogos" aria-label="Jogos"${time && time.id !== ID_OUTRO ? ` style="${estiloTime(time)}"` : ''}>
        ${htmlDosCards(esc(linhaDosLances(time, LANCES_POR_CLUBE)), linhaLancesUnificados(null, MELHORES_DO_DIA), htmlDoLanceDoDia())}
      </section>

      <div class="casa-secao"${time && time.id !== ID_OUTRO ? ` style="${estiloTime(time)}"` : ''}>${htmlDaCasa(esc(tituloDaCasa(time)))}</div>

      ${secaoDaGuerra(time)}

      <button class="link-feedback" type="button" data-acao="feedback">${icone('balao')} Pediu VAR? Conta o que aconteceu</button>
      ${htmlBotaoApoio()}
      <button class="link-feedback" type="button" data-acao="termos">Termos e privacidade</button>

      <p class="rodape-resenha" role="note">${esc(AVISO_RESENHA)} Jogo 100% grátis.</p>

      ${barraNavegacao('jogar')}
    </main>
  `;

  // Aquecimento: quem fechou o app no meio "parou" naquela estação; e o desfecho que não chegou é mandado de novo (em silêncio).
  const aqu = prefs.get().aquecimento;
  const fechado = aqu && fecharAbandonado(aqu);
  if (fechado) prefs.set({ aquecimento: fechado });
  const pendente = prefs.get().aquecimento?.pendente;
  if (pendente && !FALSA) {
    registrarAquecimento(pendente.desfecho, pendente.estacao)
      .then(() => {
        const agora = prefs.get().aquecimento;
        prefs.set({ aquecimento: { ...agora, pendente: limparPendente(agora?.pendente, pendente) } });
      })
      .catch(() => {});
  }

  const pararArquibancada = ligarArquibancada(root.querySelector('canvas')!, dono.cores, luzDoHorario(horaDaLuz()), time ? ALTURA_COM_BARRA : undefined);

  const abrir: Record<JogoDaHome, () => void> = {
    // O card dos Lances abre o hub (Pênaltis, Faltas e Cara a cara).
    penaltis: () => irPara(time ? { tela: 'lances' } : { tela: 'times', depois: 'lances' }),
    prova: () => irPara(time ? { tela: 'prova' } : { tela: 'times', depois: 'prova' }),
    dia: () => irPara(time ? { tela: 'timeDoDia' } : { tela: 'times', depois: 'timeDoDia' }),
    // Palpites funciona sem time (pede o time só na hora de cravar), como antes.
    crava: () => irPara({ tela: 'palpites' }),
  };
  root.querySelectorAll<HTMLElement>('[data-jogo]').forEach((b) =>
    b.addEventListener('click', () => abrir[b.dataset.jogo as JogoDaHome]()),
  );
  root.querySelector('[data-acao="jogar-agora"]')?.addEventListener('click', () => {
    const proximo = proximoJogo(situacao);
    // "Jogar agora" nos Lances abre a tela única no filtro Pênaltis (não há Disputa livre).
    if (proximo === 'penaltis') irPara(time ? { tela: 'lances', aba: 'penaltis' } : { tela: 'times', depois: 'lances' });
    else abrir[proximo]();
  });
  const botaoPerfil = root.querySelector<HTMLElement>('[data-acao="perfil"]');
  botaoPerfil?.addEventListener('click', () => irPara({ tela: 'perfil' }));
  // Busto do boneco (52 px) no lugar do ícone; sem time não há boneco, e o ícone fica.
  const pararAvatar = botaoPerfil && time ? pintarAvatar(botaoPerfil, 52) : () => {};
  root.querySelectorAll('[data-acao="trocar"]').forEach((b) =>
    b.addEventListener('click', () => irPara({ tela: 'times', depois: 'inicio' })),
  );
  // Sem time, a arquibancada inteira também leva à escolha (a faixa é o botão de verdade, para teclado e leitor).
  // O toque no próprio botão já navegou: o clique que sobe até a seção não navega de novo.
  if (!time)
    root.querySelector('.arquibancada')?.addEventListener('click', (e) => {
      if (!(e.target as Element).closest('button')) irPara({ tela: 'times', depois: 'inicio' });
    });
  root.querySelector('[data-acao="ranking"]')?.addEventListener('click', () => irPara({ tela: 'ranking' }));
  // Casa do [time]: abre a do seu time (se ainda não estiver pronta, a tela mostra o índice).
  root.querySelector('[data-acao="casa"]')?.addEventListener('click', () =>
    irPara({ tela: 'casa', id: time && time.id !== ID_OUTRO ? time.id : undefined }),
  );
  root.querySelector('[data-acao="feedback"]')?.addEventListener('click', () => irPara({ tela: 'feedback', de: 'inicio' }));
  root.querySelectorAll('[data-acao="termos"]').forEach((b) => b.addEventListener('click', () => irPara({ tela: 'termos' })));
  // A faixa dos Termos nasce depois, dentro da vaga do momento: um clique no pai pega a dela também.
  root.querySelector('[data-vaga]')!.addEventListener('click', (e) => {
    if ((e.target as Element).closest('.faixa-termos')) irPara({ tela: 'termos' });
  });
  ligarBotaoApoio(root);
  ligarBarraNavegacao(root);

  // Sininho: a caixa de avisos do jogo (jogo/avisosCaixa.ts), para todo mundo. O número é o de avisos novos; a folha
  // (telas/centralAvisos.ts) baixa só no toque.
  const sininho = root.querySelector<HTMLButtonElement>('[data-acao="sininho"]')!;
  const elNumeroSininho = root.querySelector<HTMLElement>('[data-sininho-num]')!;
  /** Já jogou, não tem cidade e a sessão vale (lido em carregarCidade). `undefined`: ainda não sabe (rede). */
  let semCidade: boolean | undefined;
  const entradaDaCaixa = (): EntradaDaCaixa => ({
    hoje: diaBrasilia(),
    termos: { atual: DATA_DA_VERSAO, vista: prefs.get().termosVistos },
    aquecimento: prefs.get().aquecimento,
    semCidade,
  });
  /** Refaz o número e o rótulo do sininho (sem animar) e arruma o que venceu no aparelho. */
  const atualizarSininho = (): void => {
    const entrada = entradaDaCaixa();
    let estado = lerEstado(prefs.get().avisos);
    const arrumado = arrumar(estado, entrada);
    if (arrumado !== estado) {
      prefs.set({ avisos: arrumado });
      estado = arrumado;
    }
    const novos = avisosDaCaixa(estado, entrada).novos.length;
    const texto = numeroDoSininho(novos);
    elNumeroSininho.textContent = texto ?? '';
    elNumeroSininho.hidden = texto === null;
    sininho.setAttribute('aria-label', rotuloDoSininho(novos));
  };
  atualizarSininho();
  let fecharCentral: (() => void) | null = null;
  let abrindoCentral = false;
  sininho.addEventListener('click', () => {
    if (abrindoCentral || document.querySelector('[data-central-avisos]')) return;
    abrindoCentral = true;
    void import('./centralAvisos')
      .then((m) => {
        if (!saiu) fecharCentral = m.abrirCentral({ gatilho: sininho, entrada: entradaDaCaixa, aoMudar: atualizarSininho });
      })
      .catch(() => {})
      .finally(() => (abrindoCentral = false));
  });

  // ---------- status vivo dos cards e "Jogar agora" ----------
  const elCard = (jogo: JogoDaHome) => root.querySelector<HTMLElement>(`[data-jogo="${jogo}"]`)!;
  /** Troca a linha de status; `feito` pinta a linha de verde. */
  const status = (jogo: JogoDaHome, linha?: string, feito = false) => {
    if (linha !== undefined) elCard(jogo).querySelector<HTMLElement>('.status-jogo')!.textContent = linha;
    elCard(jogo).classList.toggle('feito', feito);
  };
  const arte = (jogo: JogoDaHome, html: string) => (elCard(jogo).querySelector<HTMLElement>('[data-arte]')!.innerHTML = html);

  // Sem time ainda, ninguém jogou nada: vale a ordem normal, com a escolha do time na frente.
  const situacao: SituacaoDoDia = {
    cravaFechaEm: null,
    chutesDoDia: time ? null : 0,
    faltamPartidas: time ? null : LANCES_PARTIDAS_POR_DIA_UNIFICADO,
  };
  // A linha do botão só aparece com as respostas na mão, para não trocar de jogo diante dos olhos.
  let respostas = time ? 3 : 0;
  const elMotivo = root.querySelector<HTMLElement>('[data-motivo]')!;
  const atualizarBotao = () => {
    if (respostas === 0) elMotivo.textContent = motivoDoJogo(proximoJogo(situacao), situacao);
  };
  const respondeu = () => {
    respostas = Math.max(0, respostas - 1);
    atualizarRelogios();
  };

  let dia: { chutes: number; fim: boolean; acertou: boolean; volta: number } | null = null;
  let crava: { jogos: Jogo[]; palpites: ReadonlyMap<string, { m: number; v: number }> | null } | null = null;

  function atualizarRelogios(): void {
    if (dia) status('dia', linhaDoDia(dia, dia.volta - Date.now()), dia.fim);
    if (crava) {
      const agora = new Date();
      const palpites = crava.palpites && new Set(crava.palpites.keys());
      const s = statusCrava(crava.jogos, palpites, agora);
      if (s) status('crava', s.linha, s.cravado);
      situacao.cravaFechaEm = fechaSemPalpite(crava.jogos, palpites, agora);
      const placar = placarCravado(crava.jogos, crava.palpites, agora);
      if (placar) root.querySelector<HTMLElement>('[data-placar]')!.textContent = `${placar.m} x ${placar.v}`;
    }
    atualizarBotao();
  }
  atualizarBotao();

  // ---------- contagem até zerar a semana ----------
  const elContagem = root.querySelector<HTMLElement>('[data-contagem]')!;
  let tique = 0;
  const relogio = window.setInterval(() => {
    elContagem.textContent = formatarContagem(msAteZerarSemana());
    if (++tique % 20 === 0) atualizarRelogios();
    if (tique % GIRO_SEGUNDOS === 0) girar();
  }, 1000);

  // Lances: as 10 partidas valendo por dia (pênaltis, faltas e cara a cara somados) e as 3 melhores.
  if (time) {
    servidor()
      .then((api) => api.meusLancesHoje())
      .then((h) => {
        if (saiu || !h) return;
        const faltam = faltamDosLances(h);
        situacao.faltamPartidas = faltam;
        status('penaltis', linhaMelhoresDoDia(h.melhores) ?? linhaLancesUnificados(faltam, MELHORES_DO_DIA));
      })
      .catch(() => {
        // sem internet: fica a regra geral
      })
      .finally(() => !saiu && respondeu());
  }

  // Time do Dia: chutes de hoje ou o resultado (precisa do time, como o próprio jogo).
  if (time) {
    (async () => {
      const api = await servidor();
      // Outro aparelho trocou time, apelido ou faixa: redesenha uma vez com o time novo.
      if (!FALSA && !FALSA_DIA && (await sincronizarTorcedor()) && !saiu && !jaRedesenhou) {
        jaRedesenhou = true;
        irPara({ tela: 'inicio' });
        return;
      }
      const e = await api.estadoDoDia();
      if (saiu || !e.pronto) return;
      dia = { chutes: e.tentativas.length, fim: e.fim, acertou: e.acertou, volta: Date.parse(e.proximoEm) };
      situacao.chutesDoDia = e.fim ? null : e.tentativas.length;
      arte('dia', arteGrade(tonsDosChutes(e.tentativas)));
    })()
      .catch(() => {
        // sem internet: fica só o que é
      })
      .finally(() => !saiu && respondeu());
  }

  // Crava a Rodada: rodada em foco, quanto falta pro próximo palpite trancar e se já cravou tudo.
  servidor()
    .then((api) =>
      Promise.all([api.jogosDoCrava(), time ? api.meusDadosDoCrava().then((m) => m.palpites).catch(() => null) : Promise.resolve(null)]),
    )
    .then(([jogos, palpites]) => {
      if (!saiu) crava = { jogos, palpites };
    })
    .catch(() => {
      // sem internet: fica sem a rodada
    })
    .finally(() => !saiu && respondeu());

  // Prova de Boleiro: o recorde acende a escada.
  if (time) {
    servidor()
      .then((api) => api.meusRecordes())
      .then((r) => {
        if (saiu) return;
        const recorde = r.prova ?? null;
        status('prova', linhaRecorde(recorde) ?? 'Sem recorde ainda');
        arte('prova', arteEscada(degrausDoRecorde(recorde)));
      })
      .catch(() => {
        // sem internet: a escada fica apagada
      });
  }

  // ---------- Lance do Dia (14.7) ----------
  // O catálogo dos lances fica fora do bundle da Home: vem depois de desenhar. O mesmo lance para todos, sem bônus.
  const botaoDoDia = root.querySelector<HTMLButtonElement>('[data-acao="lance-do-dia"]');
  // Depois que a Home desenha (e, com link de desafio, depois do convite).
  const baixarCatalogo = () => Promise.all([import('../dados/lances'), import('../dados/adversarios'), import('../dados/disputas')]);
  const catalogoDosLances = naHome().then(baixarCatalogo);
  catalogoDosLances.catch(() => {}); // sem botão do Lance do Dia, ninguém mais olha a falha
  if (botaoDoDia && catalogoDosLances) {
    catalogoDosLances
      .then(([{ LANCES }, { SELECAO }, { DISPUTAS }]) => {
        // Todos os itens da tela única entram no sorteio (disputas e lances), a mesma lista da tela dos Lances.
        const id = lanceDoDia(diaBrasilia(), idsDoLanceDoDia(LANCES, DISPUTAS));
        const lance = LANCES.find((l) => l.id === id) ?? DISPUTAS.find((d) => itemPenaltis(d.id) === id);
        if (saiu || !lance || !id) {
          botaoDoDia.hidden = true;
          return;
        }
        const clube = lance.clube === 'selecao' ? SELECAO.nome : (timePorId(lance.clube)?.nome ?? '');
        const rotulo = rotuloDoLanceDoDia(lance.titulo, clube);
        botaoDoDia.querySelector<HTMLElement>('[data-lance-do-dia]')!.textContent = rotulo.split(' · ').slice(1).join(' · ');
        botaoDoDia.disabled = false;
        botaoDoDia.addEventListener('click', () => irPara(time ? { tela: 'lances', lance: id } : { tela: 'times', depois: 'lances', lance: id }));
      })
      .catch(() => {
        // sem o catálogo (rede): o botão some
        botaoDoDia.hidden = true;
      });
  }

  // ---------- barra do time (no pé da arquibancada) ----------
  // A altura é reservada desde a abertura: a barra fica vazia até as respostas chegarem e se redesenha a cada uma
  // (barraDoTime decide; sem contagem regressiva e sem piscar: só troca quando o conteúdo muda).
  const slotBarra = root.querySelector<HTMLElement>('[data-barra]');
  let jogou: boolean | undefined = !FALSA && (xpGuardado() ?? 0) > 0 ? true : undefined;
  let mes: BlocoDasDivisoes | null | undefined;
  /** A tabela do mês pode levar até 15 s por pedido: com a semana na mão e o mês 2 s atrasado, a barra mostra a semana. */
  let mesAtrasado = false;
  let esperaDoMes = 0;
  let semanaDaBarra: readonly LinhaDaSemana[] | null | undefined;
  let cidadeDaBarra: MinhaCidade | null | undefined;
  let falhouRanking = false;
  let falhouCarreira = false;
  let falhouCidade = false;
  let barraPintada = '';
  function pintarBarra(): void {
    if (!slotBarra || !time || saiu) return;
    const b = barraDoTime({
      time: { id: time.id, nome: time.nome, artigo: time.artigo },
      semRede: falhouRanking || falhouCarreira || (time.id === ID_OUTRO && falhouCidade),
      jogou,
      mes: time.id === ID_OUTRO ? null : mes === undefined && mesAtrasado ? null : mes,
      semana: semanaDaBarra,
      cidade: cidadeDaBarra,
      timePorId: (id) => timePorId(id),
    });
    const chave = JSON.stringify(b);
    if (chave === barraPintada) return;
    barraPintada = chave;
    slotBarra.innerHTML = b ? htmlDaBarra(b) : '';
  }
  slotBarra?.addEventListener('click', (e) => {
    const destino = (e.target as Element).closest<HTMLElement>('[data-destino]')?.dataset.destino;
    if (destino === 'semana') irPara({ tela: 'ranking' });
    else if (destino === 'temporada') irPara({ tela: 'ranking', aba: 'temporada' });
    else if (destino === 'cidades') irPara({ tela: 'ranking', aba: 'cidades' });
    else if (destino === 'escolher-cidade') irPara({ tela: 'cidade', depois: { tela: 'inicio' } });
  });
  if (time) {
    // Já jogou? O XP guardado no aparelho responde na hora; senão, a leitura da carreira (a mesma que anota o XP
    // para o "+10 XP" do resultado, sem 2º pedido). Falha conta como sem rede.
    const carreira = FALSA ? import('../dev/homeFalsa').then((m) => m.minhaCarreira()) : naHome().then(anotarCarreira);
    void carreira
      .then((c) => {
        if (saiu) return;
        if (!c) falhouCarreira = true;
        else jogou = jogou === true || c.xp > 0;
      })
      .catch(() => {
        falhouCarreira = true;
      })
      .finally(pintarBarra);
    // O mês aberto (só os 20 times): sem mês ou sem tabela, a barra cai para a semana.
    if (time.id !== ID_OUTRO) {
      void naHome()
        .then(() => import('./blocoDivisoes'))
        .then((m) => m.blocoDoMes(time))
        .then((b) => {
          mes = b;
        })
        .catch(() => {
          mes = null;
        })
        .finally(pintarBarra);
    }
  }

  // ---------- ranking ao vivo ----------
  const elCabo = root.querySelector<HTMLElement>('.cabo')!;
  const elDuelo = root.querySelector<HTMLElement>('[data-duelo]')!;
  const elMinha = root.querySelector<HTMLElement>('[data-posicao-semana]')!;
  /** O bloco aparece com o duelo, com a sua posição ou com as duas coisas. */
  const mostrarCabo = () => {
    elCabo.hidden = elDuelo.hidden && elMinha.hidden;
  };

  // ---------- giro da semana ----------
  const elGiro = root.querySelector<HTMLElement>('.giro')!;
  const elFraseGiro = root.querySelector<HTMLElement>('[data-giro]')!;
  // Movimento reduzido ou Leve: fica uma frase parada.
  const giroVivo = qualidade().nivel !== 'leve' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frasesGiro: string[] = [];
  let fraseAtual = 0;

  function girar(): void {
    if (!giroVivo || frasesGiro.length < 2 || document.hidden) return;
    elFraseGiro.classList.add('esmaecida');
    setTimeout(() => {
      if (saiu) return;
      fraseAtual = (fraseAtual + 1) % frasesGiro.length;
      elFraseGiro.textContent = frasesGiro[fraseAtual];
      elFraseGiro.classList.remove('esmaecida');
    }, GIRO_ESMAECER_MS);
  }

  // Posições de cada torcida na última visita desta semana (lidas uma vez, ao abrir a Home).
  const vistas = memoria<{ semana: string; pos: Record<string, number> }>(CHAVE_POSICOES);
  const posicoesAntes = vistas?.semana === semana ? vistas.pos : {};

  // Bloco das divisões: pedaço carregado depois; a cada ranking novo ele refaz a projeção da semana.
  const elDivisoes = root.querySelector<HTMLElement>('[data-divisoes]');
  let semanaAoVivo: LinhaRanking[] | null = null;
  let atualizarDivisoes: ((l: LinhaRanking[]) => FraseDoMes | null) | null = null;
  if (elDivisoes && time) {
    void naHome()
      .then(() => import('./blocoDivisoes'))
      .then((m) => m.ligarBlocoDivisoes(elDivisoes, time, semana, () => saiu))
      .then((atualizar) => {
        atualizarDivisoes = atualizar;
        if (!semanaAoVivo || saiu) return;
        fraseDoMes = atualizar(semanaAoVivo);
        pintarFrase();
      })
      .catch(() => elDivisoes.remove());
  }

  // Adesivo do cabo: a frase do duelo ou a do mês (bloco das divisões). A do mês entra quando o time é líder, está no
  // acesso ou na zona, ou quando o duelo não tem frase; virada sobre o rival (passou/passado) é sempre do duelo.
  let fraseDoDuelo: { evento: string; texto: string | null } | null = null;
  let fraseDoMes: FraseDoMes | null = null;
  function pintarFrase(): void {
    const elFrase = elCabo.querySelector<HTMLElement>('[data-frase-rival]')!;
    const virada = fraseDoDuelo?.evento === 'rival_passou' || fraseDoDuelo?.evento === 'rival_passado';
    const doMes = !virada && fraseDoMes && (fraseDoMes.destaque || !fraseDoDuelo?.texto) ? fraseDoMes.texto : null;
    const texto = doMes ?? fraseDoDuelo?.texto ?? null;
    elFrase.textContent = texto ?? '';
    elFrase.hidden = !texto;
  }

  /** `vazia`: o ranking veio vazio e `linhas` é a ordem da tabela, inventada; o bloco das divisões não projeta com ela. */
  function desenhar(linhas: LinhaRanking[], vazia = false): void {
    semanaAoVivo = vazia ? [] : linhas;
    falhouRanking = false;
    semanaDaBarra = vazia ? null : linhas;
    if (mes === undefined && !esperaDoMes)
      esperaDoMes = window.setTimeout(() => {
        mesAtrasado = true;
        pintarBarra();
      }, 2000);
    pintarBarra();
    // Um erro no bloco não pode parar o duelo, o giro e a frase (revisão de 07/11/2026).
    if (atualizarDivisoes) {
      try {
        fraseDoMes = atualizarDivisoes(semanaAoVivo);
      } catch {
        fraseDoMes = null;
      }
    }
    memoria(CHAVE_POSICOES, { semana, pos: Object.fromEntries(linhas.map((l) => [l.time_id, l.posicao_campeao])) });

    frasesGiro = frasesDoGiro(linhas, posicoesAntes, timePorId, time?.id);
    fraseAtual = Math.min(fraseAtual, Math.max(0, frasesGiro.length - 1));
    elFraseGiro.textContent = frasesGiro[fraseAtual] ?? '';
    elGiro.hidden = !frasesGiro.length;

    const meu = time ? linhas.find((l) => l.time_id === time.id) : undefined;
    const rivalId = time && time.id !== ID_OUTRO ? rivalDaSemana(time.id, time.rival, linhas) : null;

    // Cabo de guerra + frase do narrador do momento.
    const rival = rivalId ? linhas.find((l) => l.time_id === rivalId) : undefined;
    const tRival = rivalId ? timePorId(rivalId) : undefined;
    if (!time || !meu || !rival || !tRival) {
      elDuelo.hidden = true;
      mostrarCabo();
      return;
    }
    const total = meu.media30 + rival.media30;
    const fracao = total > 0 ? meu.media30 / total : 0.5;
    elCabo.style.setProperty('--cor-eu', time.cores[0]);
    elCabo.style.setProperty('--cor-rival', corDoRivalNoDuelo(time.cores[0], tRival.cores));
    // Faixa do adesivo: em time de cor 1 clara (São Paulo, Santos), a cor 2, para não sumir no papel.
    elCabo.style.setProperty('--cor-faixa', corDeTexto(time.cores[0]) === '#111111' ? time.cores[1] : time.cores[0]);
    elCabo.style.setProperty('--fracao', String(Math.min(0.92, Math.max(0.08, fracao))));
    elCabo.querySelector('[data-cabo-eu]')!.textContent = time.nome;
    elCabo.querySelector('[data-cabo-rival]')!.textContent = tRival.nome;
    elCabo.querySelector('[data-cabo-v-eu]')!.textContent = numero(meu.media30);
    elCabo.querySelector('[data-cabo-v-rival]')!.textContent = numero(rival.media30);
    elDuelo.hidden = false;
    mostrarCabo();

    const chave = `${time.id}>${rival.time_id}`;
    const vistos = memoria<Record<string, boolean>>(CHAVE_DUELO) ?? {};
    const duelo = situacaoDoDuelo(meu, rival, chave in vistos ? vistos[chave] : null);
    if (duelo) {
      memoria(CHAVE_DUELO, { [chave]: duelo.frente });
      const ctx = { ...contextoDoTime(time), rival: { nome: tRival.nome, artigo: tRival.artigo }, dif: duelo.dif, etiquetas: duelo.etiquetas };
      fraseDoDuelo = { evento: duelo.evento, texto: escolherFrase(duelo.evento, ctx, Math.random)?.texto ?? null };
    } else {
      fraseDoDuelo = null;
    }
    pintarFrase();
  }

  // ---------- sua posição na semana (só a própria, entre todos os torcedores) ----------
  // Seta: compara com a posição da última visita nesta semana (lida uma vez, ao abrir a Home).
  const vista = memoria<{ semana: string; posicao: number | null }>(CHAVE_MINHA_POSICAO);
  const posicaoAntes = vista?.semana === semana ? vista.posicao : null;
  const carregarMinhaPosicao = () => {
    // Sem time ainda, não cria login só para isso.
    if (!time) return;
    servidor()
      .then((api) => api.minhaPosicaoSemana(semana))
      .then((p) => {
        if (saiu || !p) return;
        memoria(CHAVE_MINHA_POSICAO, { semana, posicao: p.posicao });
        const seta = setaDaPosicao(posicaoAntes, p.posicao);
        elMinha.innerHTML =
          p.posicao === null
            ? esc(linhaPosicaoSemana(p))
            : `<div class="numeros um">${numeroBloco(
                `${seta === 'subiu' ? '<span class="seta subiu" title="Subiu">▲</span>' : seta === 'caiu' ? '<span class="seta caiu" title="Caiu">▼</span>' : ''}${posicaoHtml(p.posicao, p.total)}`,
                'Sua posição na semana',
                'destaque',
              )}</div>`;
        elMinha.hidden = false;
        mostrarCabo();
      })
      .catch(() => {
        // sem internet: fica sem a linha
      });
  };

  // ---------- sua cidade (um bloco só: posição, "Faltam N" ou o lembrete de escolher) ----------
  const elCidade = root.querySelector<HTMLElement>('[data-cidade]')!;
  let semCidadeLido = false;
  const carregarCidade = () => {
    // Sem time ainda, não cria login só para isso.
    if (!time || semCidadeLido) return;
    naHome()
      .then(servidorCidade)
      .then(async (api) => ({ api, minha: await api.minhaCidadeSemana(semana) }))
      .then(async ({ api, minha }) => {
        if (saiu) return;
        if (minha) {
          cidadeDaBarra = minha;
          semCidade = false;
          atualizarSininho();
          falhouCidade = false;
          pintarBarra();
          // O rival guardado só vale na mesma semana: de outra semana, não há "SUBIU!".
          const guardado = memoria<CidadeVista>(CHAVE_CIDADE_VISTA);
          const antes = acimaNaUltimaVisita(guardado, semana, minha.codigo);
          if (minha.rival_acima !== null) memoria(CHAVE_CIDADE_VISTA, guardarCidadeVista(guardado, semana, minha.codigo, minha.rival_acima));
          const frase = fraseDaCidade(minha, antes);
          elCidade.innerHTML = `<a class="bloco-cidade-link" href="#ranking-cidades" data-acao="ver-cidades"><strong>${esc(linhaDaCidadeNaHome(minha))}</strong>${frase ? `<span class="adesivo">${esc(frase)}</span>` : ''}</a>`;
          elCidade.hidden = false;
          return;
        }
        // Quem joga por "Outro time" e não tem cidade: o convite mora na barra do time (sempre), não aqui.
        // Sem sessão válida (encerrada em outro aparelho) também: esta conta não tem cidade, e a barra não fica vazia.
        if (time.id === ID_OUTRO) {
          semCidade = false;
          atualizarSininho();
          cidadeDaBarra = null;
          falhouCidade = false;
          pintarBarra();
          return;
        }
        // Sem cidade: o convite mora na central de avisos (volta no máximo uma vez por semana, depois da 1ª partida).
        const jogou = FALSA_CIDADE || (((await (await import('../servidor/api')).minhaCarreira().catch(() => null))?.xp ?? 0) > 0);
        if (saiu) return;
        // Sessão encerrada em outro aparelho também volta "sem cidade": sem sessão válida, não convida.
        const valeASessao = jogou && (await api.sessaoValida());
        if (saiu) return;
        semCidade = !!valeASessao;
        semCidadeLido = semCidade;
        atualizarSininho();
      })
      .catch(() => {
        // sem internet: fica sem o bloco (e, para "Outro time", a barra diz que está sem conexão)
        falhouCidade = true;
        pintarBarra();
      });
  };
  elCidade.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-acao]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.acao === 'ver-cidades') irPara({ tela: 'ranking', aba: 'cidades' });
    else irPara({ tela: 'cidade', depois: { tela: 'inicio' } });
  });

  const carregar = () => {
    carregarMinhaPosicao();
    carregarCidade();
    return servidor()
      .then((api) => api.rankingDaSemana(semana))
      .then((l) => !saiu && desenhar(l.length ? l : TIMES.filter((t) => t.id !== ID_OUTRO).map((t, i) => ({
        time_id: t.id, ativos: 0, soma: 0, media30: 0, posicao_campeao: i + 1, posicao_soma: i + 1,
      })), l.length === 0))
      .catch(() => {
        if (saiu) return;
        falhouRanking = true;
        pintarBarra();
        // Com barra, é ela quem avisa; sem time, o aviso fica no cabo.
        if (time) return;
        elMinha.textContent = TEXTO_SEM_REDE;
        elMinha.hidden = false;
        mostrarCabo();
      });
  };
  void carregar();
  // ---------- vaga do momento (logo abaixo do "Jogar agora") ----------
  // Um aviso por abertura, na ordem de ORDEM_DA_VAGA. Cada aviso responde se tem algo para mostrar (falha de rede conta
  // como não) e só o escolhido é desenhado; os outros esperam a próxima abertura. O que já foi mostrado mora na central
  // de avisos (o sininho), que o aviso registra ao ser desenhado.
  const elVaga = root.querySelector<HTMLElement>('[data-vaga]')!;
  const comPlaca = !!time && time.id !== ID_OUTRO;
  const novaPlaca = (): HTMLElement => {
    const el = document.createElement('section');
    el.className = 'bloco-placa-trofeu';
    el.dataset.placaTrofeu = '';
    el.hidden = true;
    elVaga.append(el);
    return el;
  };
  const AVISOS: Record<AvisoDaVaga, { tem: () => Promise<boolean>; mostrar: () => Promise<void> | void }> = {
    'fim-do-mes': {
      tem: () => (comPlaca ? import('./placaTemporada').then((m) => m.haPlacaDoMes(time!.id)) : Promise.resolve(false)),
      mostrar: () => import('./placaTemporada').then((m) => m.mostrarPlacaDoMes(novaPlaca(), time?.id, () => saiu)),
    },
    trofeu: {
      tem: () => (comPlaca ? import('./placaTrofeu').then((m) => m.haPlacaDoTrofeu(time!.id)) : Promise.resolve(false)),
      mostrar: () => import('./placaTrofeu').then((m) => m.mostrarPlacaTrofeu(novaPlaca(), time?.id, () => saiu)),
    },
    termos: {
      tem: () => Promise.resolve(termos === 'mostrar'),
      mostrar: () => {
        elVaga.insertAdjacentHTML('beforeend', '<button class="faixa-termos" type="button">Os Termos mudaram <span>Ler</span></button>');
        registrarAviso([idDoTermos(DATA_DA_VERSAO)]);
      },
    },
  };
  /** O que não coube na vaga nesta abertura espera a próxima; o que já foi mostrado mora na central de avisos. */
  const oQueSobrou = (_avisos: AvisoDaVaga[]): void => {};
  const preencherVaga = async (): Promise<void> => {
    await depoisDoConvite();
    const respostas: AvisosDaAbertura = {};
    for (const aviso of ORDEM_DA_VAGA) {
      respostas[aviso] = await AVISOS[aviso].tem().catch(() => false);
      if (saiu) return;
      const escolhido = avisoDaVaga(respostas);
      if (escolhido === undefined) continue;
      if (escolhido) {
        oQueSobrou(ORDEM_DA_VAGA.filter((x) => x !== escolhido));
        await AVISOS[escolhido].mostrar();
        // A placa ou a faixa pode ter posto um aviso na caixa.
        if (!saiu) atualizarSininho();
      }
      return;
    }
  };
  void preencherVaga().catch(() => {});
  if (!FALSA) {
    naHome()
      .then(() => ouvirRanking(semana, () => void carregar()))
      .then((f) => (saiu ? f() : (pararRanking = f)))
      .catch(() => {
        // sem Realtime: fica a foto do momento
      });
  }

  return () => {
    saiu = true;
    pararAvatar();
    clearInterval(relogio);
    clearTimeout(esperaDoMes);
    pararArquibancada();
    fecharCentral?.();
    pararRanking?.();
  };
}
