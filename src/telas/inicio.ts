// Tela inicial (docs/visual.md, seção 3): cabeçalho com avatar, arquibancada do time, cabo de guerra contra o
// rival com a sua posição, "Jogar agora", cards dos jogos com desenho e estado vivo, e o giro da semana.

import { desafioDoLink, desafioProvaDoLink, esc, irPara, type Rota } from '../app';
import { ID_OUTRO, TIMES, corDeTexto, corDoRivalNoDuelo, timePorId, type Time } from '../dados/times';
import { faixaDoAparelho, prefs } from '../estado';
import { AVISO_RESENHA } from '../jogo/cravaTela';
import { podeVerPush } from '../jogo/faixaEtaria';
import {
  degrausDoRecorde,
  fechaSemPalpite,
  frasesDoGiro,
  linhaDoDia,
  luzDoHorario,
  motivoDoJogo,
  placarCravado,
  proximoJogo,
  tonsDosChutes,
  type JogoDaHome,
  type SituacaoDoDia,
} from '../jogo/home';
import { AVISO_PRE_TEMPORADA, linhaPosicaoSemana, linhaRecorde, setaDaPosicao } from '../jogo/posicao';
import { linhaPenaltis, statusCrava } from '../jogo/statusJogos';
import { escolherFrase } from '../narrador/escolher';
import { rivalDaSemana, situacaoDoDuelo } from '../narrador/rival';
import { contextoDoTime } from '../narrador/sessao';
import {
  estadoDoDia,
  meusRecordes,
  minhaPosicaoSemana,
  ouvirRanking,
  partidasFechadasHoje,
  rankingDaSemana,
  verDesafio,
  verDesafioProva,
  type LinhaRanking,
} from '../servidor/api';
import { jogosDoCrava, meusDadosDoCrava, type Jogo } from '../servidor/crava';
import { diaBrasilia, horaBrasilia, msAteZerarSemana, semanaBrasilia } from '../servidor/tempo';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { htmlBotaoApoio, ligarBotaoApoio } from './apoio';
import { ligarArquibancada } from './arquibancada';
import { anotarCarreira } from './carreira';
import { arteEscada, arteGrade, htmlDosCards } from './cardsJogos';
import { estadoDoAviso, painelDoAviso } from './convitePush';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';
import { icone } from './icones';
import { qualidade } from './qualidade';

export const TETO_DIARIO = 5;
const SERVIDOR = { rankingDaSemana, minhaPosicaoSemana, partidasFechadasHoje, estadoDoDia, jogosDoCrava, meusDadosDoCrava, meusRecordes };
// Em desenvolvimento, ?homeFalsa troca o servidor por um de mentira (src/dev/homeFalsa.ts) e ?diaFalso
// usa o Time do Dia de mentira também no card (src/dev/diaFalso.ts).
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa');
const FALSA_DIA = import.meta.env.DEV && new URLSearchParams(location.search).has('diaFalso');
const servidor = async (): Promise<typeof SERVIDOR> => {
  if (FALSA) return import('../dev/homeFalsa');
  return FALSA_DIA ? { ...SERVIDOR, estadoDoDia: (await import('../dev/diaFalso')).estadoDoDia } : SERVIDOR;
};
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

/** Tarja da arquibancada: o time de quem joga, ou a pergunta de quem ainda não escolheu. */
function tarjaDoTime(time: Time | undefined): string {
  if (!time) {
    return `<div class="bloco-time-faixa faixa-tv sem-time">
        <p class="rotulo">Sem cadastro. Abre e joga.</p>
        <h2>Qual é a sua torcida?</h2>
      </div>
      <button class="link-trocar" type="button" data-acao="trocar">Escolher meu time</button>`;
  }
  return `<div class="bloco-time-faixa faixa-tv">
        <p class="rotulo">${time.id === ID_OUTRO ? 'Você joga pelo' : `Você joga ${pelo(time)}`}</p>
        <h2>${esc(time.id === ID_OUTRO ? 'Seu time' : time.nome)}</h2>
      </div>
      <button class="link-trocar" type="button" data-acao="trocar">trocar</button>`;
}

export function telaInicio(root: HTMLElement, _rota: Rota): () => void {
  const time = timePorId(prefs.get().time);
  const codigoDesafio = desafioDoLink();
  const codigoProva = desafioProvaDoLink();
  const semana = semanaBrasilia();
  let pararRanking: (() => void) | null = null;
  let saiu = false;

  const estiloTime = (t: Time) => `--c1:${t.cores[0]};--c2:${t.cores[1]};--txt:${corDeTexto(t.cores[0])}`;

  const dono = time ?? timePorId(ID_OUTRO)!;

  root.innerHTML = `
    <main class="inicio">
      <header class="cabecalho">
        <div class="cabecalho-linha">
          <button class="avatar" type="button" data-acao="perfil" aria-label="Abrir meu perfil" style="${estiloTime(dono)}">${icone('pessoa')}</button>
          <h1 class="marca-pequena">Guerra <span>de Torcidas</span></h1>
          ${
            podeVerPush(faixaDoAparelho())
              ? `<button class="sininho" type="button" data-acao="sininho" aria-label="Aviso de domingo" aria-expanded="false">
            ${icone('sino')}
          </button>`
              : ''
          }
        </div>
        <p class="contagem rotulo"><span class="etiqueta-fase">Pré-temporada</span>Semana fecha em <strong data-contagem>${formatarContagem(msAteZerarSemana())}</strong></p>
      </header>

      <div data-painel-push></div>

      <section class="convite-desafio" hidden></section>

      <section class="arquibancada" style="${estiloTime(dono)}" aria-label="Sua torcida">
        <canvas class="arquibancada-tela" aria-hidden="true"></canvas>
        ${tarjaDoTime(time)}
      </section>

      <section class="cabo" aria-label="Duelo com o rival"${time?.id === ID_OUTRO ? '' : ' hidden'}>
        <div class="cabo-duelo" data-duelo hidden>
          <p class="rotulo cabo-titulo">Duelo com o rival</p>
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
        ${time?.id === ID_OUTRO ? '<p class="cabo-nota">Quem joga por "Outro time" fica fora do ranking das torcidas.</p>' : ''}
        <p class="cabo-voce" data-posicao-semana aria-live="polite" hidden></p>
      </section>

      <button class="botao botao-jogar" type="button" data-acao="jogar-agora">Jogar agora<small data-motivo>&nbsp;</small></button>

      <section class="grade-jogos" aria-label="Jogos"${time && time.id !== ID_OUTRO ? ` style="${estiloTime(time)}"` : ''}>
        ${htmlDosCards(linhaPenaltis(null, TETO_DIARIO))}
      </section>

      <button class="giro faixa-tv" type="button" data-acao="ranking" aria-label="Ver o ranking da semana" hidden>
        <span class="giro-selo rotulo">Giro</span><span class="giro-frase" data-giro></span>
      </button>

      <p class="aviso-pre" role="note">${esc(AVISO_PRE_TEMPORADA)}</p>

      <button class="link-casa" type="button" data-acao="casa">
        <span class="rotulo">Casa dos clubes</span>
        <small>Estádio, troféus, recordes e cores de cada clube</small>
      </button>

      <button class="link-feedback" type="button" data-acao="feedback">${icone('balao')} Feedback ou bug? Conta pra gente</button>
      ${htmlBotaoApoio()}
      <button class="link-feedback" type="button" data-acao="termos">Termos e privacidade</button>

      <p class="rodape-resenha" role="note">${esc(AVISO_RESENHA)} Jogo 100% grátis.</p>

      ${barraNavegacao('jogar')}
    </main>
  `;

  const pararArquibancada = ligarArquibancada(root.querySelector('canvas')!, dono.cores, luzDoHorario(horaDaLuz()));

  const jogar = (desafio?: string) =>
    irPara(time ? { tela: 'partida', desafio } : { tela: 'times', depois: 'partida', desafio });
  const jogarProva = (desafio?: string) =>
    irPara(time ? { tela: 'prova', desafio } : { tela: 'times', depois: 'prova', desafio });
  const abrir: Record<JogoDaHome, () => void> = {
    // O card dos Lances abre o hub (Pênaltis, Faltas e Cara a cara); o convite de X1 continua indo direto para a partida.
    penaltis: () => irPara(time ? { tela: 'lances' } : { tela: 'times', depois: 'lances' }),
    prova: () => jogarProva(),
    dia: () => irPara(time ? { tela: 'timeDoDia' } : { tela: 'times', depois: 'timeDoDia' }),
    // Palpites funciona sem time (pede o time só na hora de cravar), como antes.
    crava: () => irPara({ tela: 'palpites' }),
  };
  root.querySelectorAll<HTMLElement>('[data-jogo]').forEach((b) =>
    b.addEventListener('click', () => abrir[b.dataset.jogo as JogoDaHome]()),
  );
  root.querySelector('[data-acao="jogar-agora"]')?.addEventListener('click', () => abrir[proximoJogo(situacao)]());
  root.querySelector('[data-acao="perfil"]')?.addEventListener('click', () => irPara({ tela: 'perfil' }));
  root.querySelectorAll('[data-acao="trocar"]').forEach((b) =>
    b.addEventListener('click', () => irPara({ tela: 'times', depois: 'inicio' })),
  );
  root.querySelector('[data-acao="ranking"]')?.addEventListener('click', () => irPara({ tela: 'ranking' }));
  // Casa do [time]: abre a do seu time (se ainda não estiver pronta, a tela mostra o índice).
  root.querySelector('[data-acao="casa"]')?.addEventListener('click', () =>
    irPara({ tela: 'casa', id: time && time.id !== ID_OUTRO ? time.id : undefined }),
  );
  root.querySelector('[data-acao="feedback"]')?.addEventListener('click', () => irPara({ tela: 'feedback', de: 'inicio' }));
  root.querySelector('[data-acao="termos"]')?.addEventListener('click', () => irPara({ tela: 'termos' }));
  ligarBotaoApoio(root);
  ligarBarraNavegacao(root);

  // Sininho: liga, desliga ou explica o aviso de domingo (push). Aceso quando o aviso está ligado.
  const sininho = root.querySelector<HTMLButtonElement>('[data-acao="sininho"]');
  if (sininho) {
    const painelPush = root.querySelector<HTMLElement>('[data-painel-push]')!;
    const acender = (ligado: boolean) => {
      sininho.classList.toggle('ligado', ligado);
      sininho.setAttribute('aria-label', ligado ? 'Aviso de domingo ligado' : 'Aviso de domingo');
    };
    void estadoDoAviso().then((e) => !saiu && acender(e === 'ligado'));
    sininho.addEventListener('click', () => {
      if (painelPush.innerHTML.trim()) {
        painelPush.innerHTML = '';
        sininho.setAttribute('aria-expanded', 'false');
        return;
      }
      sininho.setAttribute('aria-expanded', 'true');
      void painelDoAviso(painelPush, acender);
    });
  }

  // ---------- status vivo dos cards e "Jogar agora" ----------
  const elCard = (jogo: JogoDaHome) => root.querySelector<HTMLElement>(`[data-jogo="${jogo}"]`)!;
  /** Troca a linha de status; `feito` pinta a linha de verde. */
  const status = (jogo: JogoDaHome, linha?: string, feito = false) => {
    if (linha !== undefined) elCard(jogo).querySelector<HTMLElement>('.status-jogo')!.textContent = linha;
    elCard(jogo).classList.toggle('feito', feito);
  };
  const arte = (jogo: JogoDaHome, html: string) => (elCard(jogo).querySelector<HTMLElement>('[data-arte]')!.innerHTML = html);

  // Sem time ainda, ninguém jogou nada: vale a ordem normal, com a escolha do time na frente.
  const situacao: SituacaoDoDia = { cravaFechaEm: null, chutesDoDia: time ? null : 0, faltamPartidas: time ? null : TETO_DIARIO };
  // A linha do botão só aparece com as respostas na mão, para não trocar de jogo diante dos olhos.
  let respostas = time ? 3 : 0;
  const elMotivo = root.querySelector<HTMLElement>('[data-motivo]')!;
  const atualizarBotao = () => {
    if (respostas === 0) elMotivo.textContent = motivoDoJogo(proximoJogo(situacao), situacao, TETO_DIARIO);
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

  // Lances: o teto do dia (somado com a Prova).
  if (time) {
    servidor()
      .then((api) => api.partidasFechadasHoje(diaBrasilia()))
      .then((n) => {
        if (saiu) return;
        situacao.faltamPartidas = TETO_DIARIO - n;
        status('penaltis', linhaPenaltis(TETO_DIARIO - n, TETO_DIARIO));
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
      if (!FALSA && !FALSA_DIA) await sincronizarTorcedor();
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
    // O resultado da próxima partida conta o "+10 XP" a partir daqui.
    if (!FALSA) anotarCarreira();
  }

  // ---------- convite de desafio (link ?d=) ----------
  if (codigoDesafio) {
    const caixa = root.querySelector<HTMLElement>('.convite-desafio')!;
    verDesafio(codigoDesafio)
      .then((d) => {
        if (!d || saiu) return;
        const t = timePorId(d.time_id);
        const quem = d.apelido ? esc(d.apelido) : 'Alguém';
        caixa.innerHTML = `
          <p class="rotulo">Te chamaram no X1</p>
          <p><strong>${quem}</strong>${t && t.id !== ID_OUTRO ? ` (${esc(t.nome)})` : ''} te chamou no X1:
          <strong>${d.pontos} pontos</strong>, ${d.gols_jogador} x ${d.gols_maquina} contra a máquina.</p>
          <button class="botao" type="button" data-acao="desafio">Aceitar o X1</button>`;
        caixa.hidden = false;
        caixa.querySelector('[data-acao="desafio"]')!.addEventListener('click', () => jogar(d.id));
      })
      .catch(() => {
        // sem internet: o desafio fica para quando voltar
      });
  }

  // ---------- convite de desafio da Prova de Boleiro (link ?p=) ----------
  if (codigoProva) {
    const caixa = root.querySelector<HTMLElement>('.convite-desafio')!;
    verDesafioProva(codigoProva)
      .then((d) => {
        if (!d || saiu) return;
        const t = timePorId(d.time_id);
        const quem = d.apelido ? esc(d.apelido) : 'Alguém';
        caixa.innerHTML = `
          <p class="rotulo">Te chamaram no X1 na Prova de Boleiro</p>
          <p><strong>${quem}</strong>${t && t.id !== ID_OUTRO ? ` (${esc(t.nome)})` : ''}: ${esc(d.resumo)},
          <strong>${d.pontos} pontos</strong>. Mesmas 8 perguntas, faz mais?</p>
          <p class="escada-emoji">${esc(d.escada)}</p>
          <button class="botao" type="button" data-acao="desafio-prova">Aceitar o X1</button>`;
        caixa.hidden = false;
        caixa.querySelector('[data-acao="desafio-prova"]')!.addEventListener('click', () => jogarProva(d.id));
      })
      .catch(() => {
        // sem internet: o desafio fica para quando voltar
      });
  }

  // ---------- ranking ao vivo ----------
  const elCabo = root.querySelector<HTMLElement>('.cabo')!;
  const elDuelo = root.querySelector<HTMLElement>('[data-duelo]')!;
  const elMinha = root.querySelector<HTMLElement>('[data-posicao-semana]')!;
  /** O bloco aparece com o duelo, com a sua posição ou com as duas coisas. */
  const mostrarCabo = () => {
    if (time?.id !== ID_OUTRO) elCabo.hidden = elDuelo.hidden && elMinha.hidden;
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

  function desenhar(linhas: LinhaRanking[]): void {
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

    const elFrase = elCabo.querySelector<HTMLElement>('[data-frase-rival]')!;
    const chave = `${time.id}>${rival.time_id}`;
    const vistos = memoria<Record<string, boolean>>(CHAVE_DUELO) ?? {};
    const duelo = situacaoDoDuelo(meu, rival, chave in vistos ? vistos[chave] : null);
    if (!duelo) {
      elFrase.hidden = true;
      return;
    }
    memoria(CHAVE_DUELO, { [chave]: duelo.frente });
    const ctx = { ...contextoDoTime(time), rival: { nome: tRival.nome, artigo: tRival.artigo }, dif: duelo.dif };
    const texto = escolherFrase(duelo.evento, ctx, Math.random)?.texto;
    elFrase.textContent = texto ?? '';
    elFrase.hidden = !texto;
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
          (seta === 'subiu'
            ? '<span class="seta subiu" title="Subiu">▲</span> '
            : seta === 'caiu'
              ? '<span class="seta caiu" title="Caiu">▼</span> '
              : '') + esc(linhaPosicaoSemana(p));
        elMinha.hidden = false;
        mostrarCabo();
      })
      .catch(() => {
        // sem internet: fica sem a linha
      });
  };

  const carregar = () => {
    carregarMinhaPosicao();
    return servidor()
      .then((api) => api.rankingDaSemana(semana))
      .then((l) => !saiu && desenhar(l.length ? l : TIMES.filter((t) => t.id !== ID_OUTRO).map((t, i) => ({
        time_id: t.id, ativos: 0, soma: 0, media30: 0, posicao_campeao: i + 1, posicao_soma: i + 1,
      }))))
      .catch(() => {
        if (saiu) return;
        elMinha.textContent = 'Sem conexão com o placar agora. Dá pra jogar mesmo assim.';
        elMinha.hidden = false;
        mostrarCabo();
      });
  };
  void carregar();
  if (!FALSA) {
    ouvirRanking(semana, () => void carregar())
      .then((f) => (saiu ? f() : (pararRanking = f)))
      .catch(() => {
        // sem Realtime: fica a foto do momento
      });
  }

  return () => {
    saiu = true;
    clearInterval(relogio);
    pararArquibancada();
    pararRanking?.();
  };
}
