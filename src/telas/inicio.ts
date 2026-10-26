// Tela inicial (docs/jogo.md, seção 9, "Home"): título com a contagem da semana, bloco do time com o cabo de
// guerra contra o rival, sua posição na semana, os 4 jogos em grade (com status vivo), mini tabela e feedback.

import { desafioDoLink, desafioProvaDoLink, esc, irPara, type Rota } from '../app';
import { ID_OUTRO, TIMES, corDeTexto, corDoRivalNoDuelo, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { AVISO_RESENHA } from '../jogo/cravaTela';
import { AVISO_PRE_TEMPORADA, linhaPosicaoSemana, setaDaPosicao } from '../jogo/posicao';
import { formatarVolta, linhaPenaltis, statusCrava } from '../jogo/statusJogos';
import { escolherFrase } from '../narrador/escolher';
import { rivalDaSemana, situacaoDoDuelo } from '../narrador/rival';
import { contextoDoTime } from '../narrador/sessao';
import {
  estadoDoDia,
  minhaPosicaoSemana,
  ouvirRanking,
  partidasFechadasHoje,
  rankingDaSemana,
  verDesafio,
  verDesafioProva,
  type LinhaRanking,
} from '../servidor/api';
import { jogosDoCrava, meusDadosDoCrava, type Jogo } from '../servidor/crava';
import { diaBrasilia, msAteZerarSemana, semanaBrasilia } from '../servidor/tempo';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { estadoDoAviso, painelDoAviso } from './convitePush';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';
import { icone } from './icones';

export const TETO_DIARIO = 5;
// Em desenvolvimento, ?diaFalso usa o Time do Dia de mentira também no card (src/dev/diaFalso.ts).
const FALSA_DIA = import.meta.env.DEV && new URLSearchParams(location.search).has('diaFalso');

type JogoDaHome = 'penaltis' | 'prova' | 'dia' | 'crava';

/** Card da grade: nome, uma linha do que é e a linha de status (preenchida depois). */
function cardJogo(id: JogoDaHome, nome: string, oQueE: string, linha = ''): string {
  return `<button class="card-jogo" type="button" data-jogo="${id}">
    <span class="nome-jogo">${nome}</span>
    <span class="o-que-e">${oQueE}</span>
    <span class="status-jogo rotulo" aria-live="polite">${linha}</span>
  </button>`;
}
const CHAVE_DUELO = 'gdt:duelo';
const CHAVE_POSICOES = 'gdt:posicoes';
const CHAVE_MINHA_POSICAO = 'gdt:minha-posicao';

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

export function telaInicio(root: HTMLElement, _rota: Rota): () => void {
  const time = timePorId(prefs.get().time);
  const codigoDesafio = desafioDoLink();
  const codigoProva = desafioProvaDoLink();
  const semana = semanaBrasilia();
  let pararRanking: (() => void) | null = null;
  let saiu = false;

  const estiloTime = (t: Time) => `--c1:${t.cores[0]};--c2:${t.cores[1]};--txt:${corDeTexto(t.cores[0])}`;

  const blocoTime = time
    ? `<section class="bloco-time" style="${estiloTime(time)}">
        <div class="bloco-time-faixa faixa-tv">
          <p class="rotulo">${time.id === ID_OUTRO ? 'Você joga pelo' : `Você joga ${pelo(time)}`}</p>
          <h2>${esc(time.id === ID_OUTRO ? 'Seu time' : time.nome)}</h2>
        </div>
        <p class="bloco-time-pos" data-minha-posicao>${time.id === ID_OUTRO ? 'Quem joga por "Outro time" fica fora do ranking das torcidas.' : 'Carregando a posição…'}</p>
        <button class="link-trocar" type="button" data-acao="trocar">trocar</button>
      </section>`
    : `<section class="bloco-time sem-time">
        <p class="rotulo">Qual é a sua torcida?</p>
        <p class="sem-time-nota">Sem cadastro. Abre e joga.</p>
        <button class="botao botao-sec" type="button" data-acao="trocar">Escolher meu time</button>
      </section>`;

  root.innerHTML = `
    <main class="inicio">
      <header class="cabecalho">
        <h1 class="marca-pequena">Guerra <span>de Torcidas</span></h1>
        <button class="sininho" type="button" data-acao="sininho" aria-label="Aviso de domingo" aria-expanded="false">
          ${icone('sino')}
        </button>
        <p class="contagem rotulo"><span class="etiqueta-fase">Pré-temporada</span>Semana fecha em <strong data-contagem>${formatarContagem(msAteZerarSemana())}</strong></p>
      </header>

      <div data-painel-push></div>

      <section class="convite-desafio" hidden></section>

      ${blocoTime}

      <section class="cabo" hidden aria-label="Duelo com o rival">
        <p class="rotulo cabo-titulo">Duelo com o rival</p>
        <div class="cabo-nomes">
          <span><strong data-cabo-v-eu></strong><span data-cabo-eu></span></span>
          <span><span data-cabo-rival></span><strong data-cabo-v-rival></strong></span>
        </div>
        <div class="cabo-barra"><span data-cabo-lado="eu"></span><span data-cabo-lado="rival"></span></div>
        <p class="adesivo" data-frase-rival hidden></p>
      </section>

      <p class="minha-posicao" data-posicao-semana aria-live="polite" hidden></p>

      <section class="grade-jogos" aria-label="Jogos"${time && time.id !== ID_OUTRO ? ` style="${estiloTime(time)}"` : ''}>
        ${cardJogo('penaltis', 'Lances do Jogo', 'Pênaltis, faltas e cara a cara', linhaPenaltis(null, TETO_DIARIO))}
        ${cardJogo('prova', 'Prova de Boleiro', '8 perguntas · para quando quiser')}
        ${cardJogo('dia', 'Time do Dia', 'Adivinha o clube em 6 chutes')}
        ${cardJogo('crava', 'Crava a Rodada', 'Palpita o placar do Brasileirão')}
      </section>
      <p class="aviso-pre" role="note">${esc(AVISO_PRE_TEMPORADA)}</p>

      <button class="link-casa" type="button" data-acao="casa">
        <span class="rotulo">Casa dos clubes</span>
        <small>Estádio, troféus, recordes e cores de cada clube</small>
      </button>

      <section class="mini-tabela" aria-label="Ranking da semana" aria-live="polite">
        <header>
          <p class="rotulo">Campeão da semana</p>
          <button class="rotulo link-ver" type="button" data-acao="ranking">Ver tudo</button>
        </header>
        <div class="mini-linhas"><p class="vazio">Carregando o ranking…</p></div>
      </section>

      <button class="link-feedback" type="button" data-acao="feedback">${icone('balao')} Feedback ou bug? Conta pra gente</button>

      <p class="rodape-resenha" role="note">${esc(AVISO_RESENHA)} Jogo 100% grátis.</p>

      ${barraNavegacao('jogar')}
    </main>
  `;

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
  root.querySelectorAll('[data-acao="trocar"]').forEach((b) =>
    b.addEventListener('click', () => irPara({ tela: 'times', depois: 'inicio' })),
  );
  root.querySelector('[data-acao="ranking"]')?.addEventListener('click', () => irPara({ tela: 'ranking' }));
  // Casa do [time]: abre a do seu time (se ainda não estiver pronta, a tela mostra o índice).
  root.querySelector('[data-acao="casa"]')?.addEventListener('click', () =>
    irPara({ tela: 'casa', id: time && time.id !== ID_OUTRO ? time.id : undefined }),
  );
  root.querySelector('[data-acao="feedback"]')?.addEventListener('click', () => irPara({ tela: 'feedback', de: 'inicio' }));
  ligarBarraNavegacao(root);

  // Sininho: liga, desliga ou explica o aviso de domingo (push). Aceso quando o aviso está ligado.
  const sininho = root.querySelector<HTMLButtonElement>('[data-acao="sininho"]')!;
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

  // ---------- status vivo dos cards ----------
  /** Troca a linha de status; `feito` pinta a linha de verde. */
  const status = (jogo: JogoDaHome, linha?: string, feito = false) => {
    const card = root.querySelector<HTMLElement>(`[data-jogo="${jogo}"]`)!;
    if (linha !== undefined) card.querySelector<HTMLElement>('.status-jogo')!.textContent = linha;
    card.classList.toggle('feito', feito);
  };
  let voltaDoDia: number | null = null;
  let crava: { jogos: Jogo[]; palpites: Set<string> | null } | null = null;

  function atualizarRelogios(): void {
    if (voltaDoDia !== null) status('dia', `Feito ✓ · volta em ${formatarVolta(voltaDoDia - Date.now())}`, true);
    if (crava) {
      const s = statusCrava(crava.jogos, crava.palpites, new Date());
      if (s) status('crava', s.linha, s.cravado);
    }
  }

  // ---------- contagem até zerar a semana ----------
  const elContagem = root.querySelector<HTMLElement>('[data-contagem]')!;
  let tique = 0;
  const relogio = window.setInterval(() => {
    elContagem.textContent = formatarContagem(msAteZerarSemana());
    if (++tique % 20 === 0) atualizarRelogios();
  }, 1000);

  // Pênaltis: o teto do dia (somado com a Prova).
  if (time) {
    partidasFechadasHoje(diaBrasilia())
      .then((n) => !saiu && status('penaltis', linhaPenaltis(TETO_DIARIO - n, TETO_DIARIO)))
      .catch(() => {
        // sem internet: fica a regra geral
      });
  }

  // Time do Dia: feito hoje? (precisa do time, como o próprio jogo)
  if (time) {
    (async () => {
      const api = FALSA_DIA ? await import('../dev/diaFalso') : { estadoDoDia };
      if (!FALSA_DIA) await sincronizarTorcedor();
      const e = await api.estadoDoDia();
      if (saiu || !e.pronto) return;
      if (e.fim) {
        voltaDoDia = Date.parse(e.proximoEm);
        atualizarRelogios();
      }
    })().catch(() => {
      // sem internet: fica só o que é
    });
  }

  // Crava a Rodada: rodada em foco, quanto falta pro próximo palpite trancar e se já cravou tudo.
  Promise.all([
    jogosDoCrava(),
    time ? meusDadosDoCrava().then((m) => new Set(m.palpites.keys())).catch(() => null) : Promise.resolve(null),
  ])
    .then(([jogos, palpites]) => {
      if (saiu) return;
      crava = { jogos, palpites };
      atualizarRelogios();
    })
    .catch(() => {
      // sem internet: fica sem a rodada
    });

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
  const elLinhas = root.querySelector<HTMLElement>('.mini-linhas')!;
  const elCabo = root.querySelector<HTMLElement>('.cabo')!;
  const elPos = root.querySelector<HTMLElement>('[data-minha-posicao]');

  function desenhar(linhas: LinhaRanking[]): void {
    // Setas: comparam com a posição que o aparelho viu da última vez nesta semana.
    const vistas = memoria<{ semana: string; pos: Record<string, number> }>(CHAVE_POSICOES);
    const antes = vistas?.semana === semana ? vistas.pos : {};
    memoria(CHAVE_POSICOES, { semana, pos: Object.fromEntries(linhas.map((l) => [l.time_id, l.posicao_campeao])) });

    const jogando = linhas.filter((l) => l.ativos > 0);
    const meu = time ? linhas.find((l) => l.time_id === time.id) : undefined;
    const rivalId = time && time.id !== ID_OUTRO ? rivalDaSemana(time.id, time.rival, linhas) : null;

    if (elPos && meu) {
      elPos.innerHTML =
        meu.ativos > 0
          ? `<strong>${meu.posicao_campeao}º</strong> na semana · <strong>${numero(meu.media30)}</strong> de média`
          : 'Ninguém da sua torcida jogou ainda nesta semana. Abre o placar!';
    }

    if (!jogando.length) {
      elLinhas.innerHTML = '<p class="vazio">Ninguém jogou ainda nesta semana. Abre o placar!</p>';
    } else {
      const visiveis = linhas.filter(
        (l) => (l.posicao_campeao <= 5 && l.ativos > 0) || l.time_id === meu?.time_id || l.time_id === rivalId,
      );
      elLinhas.innerHTML = visiveis
        .map((l) => {
          const t = timePorId(l.time_id);
          const anterior = antes[l.time_id];
          const seta =
            anterior === undefined || anterior === l.posicao_campeao
              ? '<span class="seta" aria-hidden="true"></span>'
              : anterior > l.posicao_campeao
                ? '<span class="seta subiu" title="Subiu">▲</span>'
                : '<span class="seta caiu" title="Caiu">▼</span>';
          const classes = ['mini-linha'];
          if (l.posicao_campeao === 1 && l.ativos > 0) classes.push('lider');
          if (l.time_id === meu?.time_id) classes.push('meu');
          if (l.time_id === rivalId) classes.push('rival');
          return `<div class="${classes.join(' ')}">
            <span class="pos">${l.posicao_campeao}º</span>${seta}
            <span class="cor" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}"></span>
            <span class="nome">${esc(t?.nome ?? l.time_id)}${l.time_id === rivalId ? '<small> rival</small>' : ''}</span>
            <span class="valor">${numero(l.media30)}</span>
          </div>`;
        })
        .join('');
    }

    // Cabo de guerra + frase do narrador do momento.
    const rival = rivalId ? linhas.find((l) => l.time_id === rivalId) : undefined;
    const tRival = rivalId ? timePorId(rivalId) : undefined;
    if (!time || !meu || !rival || !tRival) {
      elCabo.hidden = true;
      return;
    }
    const total = meu.media30 + rival.media30;
    const fracao = total > 0 ? meu.media30 / total : 0.5;
    elCabo.style.setProperty('--cor-eu', time.cores[0]);
    elCabo.style.setProperty('--cor-rival', corDoRivalNoDuelo(time.cores[0], tRival.cores));
    elCabo.style.setProperty('--fracao', String(Math.min(0.92, Math.max(0.08, fracao))));
    elCabo.querySelector('[data-cabo-eu]')!.textContent = time.nome;
    elCabo.querySelector('[data-cabo-rival]')!.textContent = tRival.nome;
    elCabo.querySelector('[data-cabo-v-eu]')!.textContent = numero(meu.media30);
    elCabo.querySelector('[data-cabo-v-rival]')!.textContent = numero(rival.media30);
    elCabo.hidden = false;

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
  const elMinha = root.querySelector<HTMLElement>('[data-posicao-semana]')!;
  // Seta: compara com a posição da última visita nesta semana (lida uma vez, ao abrir a Home).
  const vista = memoria<{ semana: string; posicao: number | null }>(CHAVE_MINHA_POSICAO);
  const posicaoAntes = vista?.semana === semana ? vista.posicao : null;
  const carregarMinhaPosicao = () => {
    // Sem time ainda, não cria login só para isso.
    if (!time) return;
    minhaPosicaoSemana(semana)
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
      })
      .catch(() => {
        // sem internet: fica sem a linha
      });
  };

  const carregar = () => {
    carregarMinhaPosicao();
    return rankingDaSemana(semana)
      .then((l) => !saiu && desenhar(l.length ? l : TIMES.filter((t) => t.id !== ID_OUTRO).map((t, i) => ({
        time_id: t.id, ativos: 0, soma: 0, media30: 0, posicao_campeao: i + 1, posicao_soma: i + 1,
      }))))
      .catch(() => {
        if (!saiu) elLinhas.innerHTML = '<p class="vazio">Sem conexão com o placar agora. Dá pra jogar mesmo assim.</p>';
        if (elPos && !saiu) elPos.textContent = 'Sem conexão com o placar agora.';
      });
  };
  void carregar();
  ouvirRanking(semana, () => void carregar())
    .then((f) => (saiu ? f() : (pararRanking = f)))
    .catch(() => {
      // sem Realtime: fica a foto do momento
    });

  return () => {
    saiu = true;
    clearInterval(relogio);
    pararRanking?.();
  };
}
