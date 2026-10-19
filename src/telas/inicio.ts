// Tela inicial (docs/visual.md, "Início" e "No MVP"): AO VIVO com contagem, bloco do time,
// cabo de guerra contra o rival, mini tabela do ranking geral, teto do dia e barra de navegação.

import { desafioDoLink, esc, irPara, type Rota } from '../app';
import { ID_OUTRO, TIMES, corDeTexto, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { escolherFrase } from '../narrador/escolher';
import { rivalDaSemana, situacaoDoDuelo } from '../narrador/rival';
import { contextoDoTime } from '../narrador/sessao';
import { ouvirRanking, partidasFechadasHoje, rankingDaSemana, verDesafio, type LinhaRanking } from '../servidor/api';
import { diaBrasilia, msAteZerarSemana, semanaBrasilia } from '../servidor/tempo';
import { barraNavegacao, ligarBarraNavegacao } from './navegacao';

export const TETO_DIARIO = 5;
const CHAVE_DUELO = 'gdt:duelo';
const CHAVE_POSICOES = 'gdt:posicoes';

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
        <p class="bloco-time-pos" data-minha-posicao>${time.id === ID_OUTRO ? '"Outro time" não entra no ranking de times.' : 'Carregando a posição…'}</p>
        <button class="link-trocar" type="button" data-acao="trocar">trocar</button>
      </section>`
    : `<section class="bloco-time sem-time">
        <p class="rotulo">Qual é a sua torcida?</p>
        <button class="botao botao-sec" type="button" data-acao="trocar">Escolher meu time</button>
      </section>`;

  root.innerHTML = `
    <main class="inicio">
      <header class="barra-ao-vivo">
        <span class="ao-vivo rotulo"><i aria-hidden="true"></i>Ao vivo</span>
        <span class="contagem rotulo">Semana zera em <strong data-contagem>${formatarContagem(msAteZerarSemana())}</strong></span>
      </header>

      <h1 class="marca-pequena">Guerra <span>de Torcidas</span></h1>

      <section class="convite-desafio" hidden></section>

      ${blocoTime}

      <section class="cabo" hidden aria-label="Cabo de guerra contra o rival">
        <p class="rotulo cabo-titulo">Cabo de guerra <small>· média dos 30 melhores</small></p>
        <div class="cabo-nomes">
          <span><strong data-cabo-v-eu></strong><span data-cabo-eu></span></span>
          <span><span data-cabo-rival></span><strong data-cabo-v-rival></strong></span>
        </div>
        <div class="cabo-barra"><span data-cabo-lado="eu"></span><span data-cabo-lado="rival"></span></div>
        <p class="adesivo" data-frase-rival hidden></p>
      </section>

      <section class="mini-tabela" aria-label="Ranking da semana" aria-live="polite">
        <header>
          <p class="rotulo">Campeão da semana</p>
          <button class="rotulo link-ver" type="button" data-acao="ranking">Ver tudo</button>
        </header>
        <div class="mini-linhas"><p class="vazio">Carregando o ranking…</p></div>
      </section>

      <section class="jogar" aria-label="Jogos">
        <button class="botao" type="button" data-acao="jogar">
          Bate Contra Mim
          <small>5 cobranças · 5 defesas</small>
        </button>
        <p class="teto" data-teto>Sem cadastro. Abre e joga.</p>
        <div class="jogos-em-breve">
          <div class="jogo-em-breve" aria-disabled="true">
            <span class="em-breve">em breve</span>
            <strong>Prova de Boleiro</strong>
            <small>8 perguntas · para ou segue</small>
          </div>
          <div class="jogo-em-breve" aria-disabled="true">
            <span class="em-breve">em breve</span>
            <strong>Time do Dia</strong>
            <small>1 clube secreto · 6 chutes</small>
          </div>
        </div>
        <button class="link-crava" type="button" data-acao="palpites">
          <span class="rotulo">Crava a Rodada</span> Palpita o placar dos jogos do Brasileirão →
        </button>
        <button class="link-feedback" type="button" data-acao="feedback">💬 Feedback ou bug? Conta pra gente</button>
      </section>

      ${barraNavegacao('jogar')}
    </main>
  `;

  const jogar = (desafio?: string) =>
    irPara(time ? { tela: 'partida', desafio } : { tela: 'times', depois: 'partida', desafio });
  root.querySelector('[data-acao="jogar"]')?.addEventListener('click', () => jogar());
  root.querySelectorAll('[data-acao="trocar"]').forEach((b) =>
    b.addEventListener('click', () => irPara({ tela: 'times', depois: 'inicio' })),
  );
  root.querySelector('[data-acao="ranking"]')?.addEventListener('click', () => irPara({ tela: 'ranking' }));
  root.querySelector('[data-acao="palpites"]')?.addEventListener('click', () => irPara({ tela: 'palpites' }));
  root.querySelector('[data-acao="feedback"]')?.addEventListener('click', () => irPara({ tela: 'feedback', de: 'inicio' }));
  ligarBarraNavegacao(root);

  // ---------- contagem até zerar a semana ----------
  const elContagem = root.querySelector<HTMLElement>('[data-contagem]')!;
  const relogio = window.setInterval(() => (elContagem.textContent = formatarContagem(msAteZerarSemana())), 1000);

  // ---------- teto do dia ----------
  const elTeto = root.querySelector<HTMLElement>('[data-teto]')!;
  if (time) {
    partidasFechadasHoje(diaBrasilia())
      .then((n) => {
        if (saiu) return;
        const faltam = TETO_DIARIO - n;
        elTeto.innerHTML =
          faltam > 0
            ? `Hoje contam mais <strong>${faltam}</strong> ${faltam === 1 ? 'partida' : 'partidas'} pro ranking.`
            : `Hoje só as <strong>5 melhores</strong> contam: supera a pior pra subir.`;
      })
      .catch(() => {
        // sem internet: fica o texto padrão
      });
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
          <p class="rotulo">Desafio na área</p>
          <p><strong>${quem}</strong>${t && t.id !== ID_OUTRO ? ` (${esc(t.nome)})` : ''} te desafiou:
          <strong>${d.pontos} pontos</strong>, ${d.gols_jogador} x ${d.gols_maquina} contra a máquina.</p>
          <button class="botao" type="button" data-acao="desafio">Aceitar o desafio</button>`;
        caixa.hidden = false;
        caixa.querySelector('[data-acao="desafio"]')!.addEventListener('click', () => jogar(d.id));
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
          ? `<strong>${meu.posicao_campeao}º</strong> no Campeão da semana · média <strong>${numero(meu.media30)}</strong>`
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
    elCabo.style.setProperty('--txt-eu', corDeTexto(time.cores[0]));
    elCabo.style.setProperty('--cor-rival', tRival.cores[0] === time.cores[0] ? tRival.cores[1] : tRival.cores[0]);
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

  const carregar = () =>
    rankingDaSemana(semana)
      .then((l) => !saiu && desenhar(l.length ? l : TIMES.filter((t) => t.id !== ID_OUTRO).map((t, i) => ({
        time_id: t.id, ativos: 0, soma: 0, media30: 0, posicao_campeao: i + 1, posicao_soma: i + 1,
      }))))
      .catch(() => {
        if (!saiu) elLinhas.innerHTML = '<p class="vazio">Sem conexão com o placar agora. Dá pra jogar mesmo assim.</p>';
        if (elPos && !saiu) elPos.textContent = 'Sem conexão com o placar agora.';
      });
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
