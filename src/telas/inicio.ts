import { desafioDoLink, esc, irPara, type Rota } from '../app';
import { ID_OUTRO, corDeTexto, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { escolherFrase } from '../narrador/escolher';
import { rivalDaSemana, situacaoDoDuelo } from '../narrador/rival';
import { contextoDoTime } from '../narrador/sessao';
import { ouvirRanking, rankingDaSemana, verDesafio, type LinhaRanking } from '../servidor/api';
import { semanaBrasilia } from '../servidor/tempo';

const FRASES = [
  'Joga 30 segundos e bota sua torcida na frente do rival.',
  'Cada gol seu é um ponto pro seu time. Cada defesa também.',
  'O rival tá na frente? Vai deixar?',
];

const CHAVE_DUELO = 'gdt:duelo';

/** O que o aparelho viu do duelo da última vez ("time>rival": estava na frente?). */
function lembrarDuelo(chave: string, frente?: boolean): boolean | null {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_DUELO) ?? '{}') as Record<string, boolean>;
    const antes = chave in salvo ? salvo[chave] : null;
    if (frente !== undefined) localStorage.setItem(CHAVE_DUELO, JSON.stringify({ [chave]: frente }));
    return antes;
  } catch {
    return null;
  }
}

export function telaInicio(root: HTMLElement, _rota: Rota): () => void {
  const frase = FRASES[Math.floor(Math.random() * FRASES.length)];
  const time = timePorId(prefs.get().time);
  const codigoDesafio = desafioDoLink();
  const semana = semanaBrasilia();
  let parar: (() => void) | null = null;
  let saiu = false;

  const blocoTime = time
    ? `<button class="time-atual" type="button" data-acao="trocar"
         style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
         <span class="faixa"></span>
         <span>${time.id === ID_OUTRO ? 'Você joga pelo' : `Você joga ${time.artigo === 'a' ? 'pela' : 'pelo'}`} <strong>${esc(time.id === ID_OUTRO ? 'seu time' : time.nome)}</strong></span>
         <small>trocar</small>
       </button>`
    : '';

  root.innerHTML = `
    <main class="inicio">
      <header class="topo">
        <span class="selo">Temporada da semana</span>
      </header>

      <section class="marca">
        <h1>Guerra<br /><span>de Torcidas</span></h1>
        <p class="frase">${frase}</p>
      </section>

      <section class="convite-desafio" hidden></section>

      <section class="placar" aria-label="Ranking da semana" aria-live="polite">
        <p class="placar-titulo">Campeão da semana</p>
        <div class="placar-linhas"><p class="placar-vazio">Carregando o ranking…</p></div>
        <p class="frase-rival" hidden></p>
      </section>

      <section class="acoes">
        ${blocoTime}
        <button class="botao" type="button" data-acao="jogar">
          Bate Contra Mim
          <small>5 cobranças · 5 defesas</small>
        </button>
        <p class="nota">Sem cadastro. Abre e joga.</p>
      </section>
    </main>
  `;

  const jogar = (desafio?: string) =>
    irPara(time ? { tela: 'partida', desafio } : { tela: 'times', depois: 'partida', desafio });
  root.querySelector('[data-acao="jogar"]')?.addEventListener('click', () => jogar());
  root.querySelector('[data-acao="trocar"]')?.addEventListener('click', () => {
    irPara({ tela: 'times', depois: 'inicio' });
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
          <p><strong>${quem}</strong> ${t && t.id !== ID_OUTRO ? `(${esc(t.nome)}) ` : ''}te desafiou:
          <strong>${d.pontos} pontos</strong>, ${d.gols_jogador} x ${d.gols_maquina} contra a máquina.</p>
          <button class="botao" type="button" data-acao="desafio">Aceitar o desafio</button>`;
        caixa.hidden = false;
        caixa.querySelector('[data-acao="desafio"]')!.addEventListener('click', () => jogar(d.id));
      })
      .catch(() => {
        // sem internet: o desafio fica para quando voltar
      });
  }

  // ---------- ranking da semana ao vivo ----------
  const elLinhas = root.querySelector<HTMLElement>('.placar-linhas')!;
  const elRival = root.querySelector<HTMLElement>('.frase-rival')!;

  function desenhar(linhas: LinhaRanking[]): void {
    const jogando = linhas.filter((l) => l.ativos > 0);
    if (!jogando.length) {
      elLinhas.innerHTML = '<p class="placar-vazio">Ninguém jogou ainda nesta semana. Abre o placar!</p>';
      elRival.hidden = true;
      return;
    }
    const meu = time ? linhas.find((l) => l.time_id === time.id) : undefined;
    const rivalId = time && time.id !== ID_OUTRO ? rivalDaSemana(time.id, time.rival, linhas) : null;
    const visiveis = linhas.filter((l) => l.posicao_campeao <= 5 || l.time_id === meu?.time_id || l.time_id === rivalId);
    elLinhas.innerHTML = visiveis
      .map((l) => {
        const t = timePorId(l.time_id);
        const classe = l.time_id === meu?.time_id ? ' meu' : l.time_id === rivalId ? ' rival' : '';
        return `<div class="linha${classe}">
          <span class="pos">${l.posicao_campeao}º</span>
          <span class="faixa" style="--c1:${t?.cores[0] ?? '#666'};--c2:${t?.cores[1] ?? '#999'}"></span>
          <span class="nome">${esc(t?.nome ?? l.time_id)}</span>
          <span class="pts">${l.media30.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
        </div>`;
      })
      .join('');

    // Frase do rival do momento (Outro time não recebe provocação de time).
    const rival = rivalId ? linhas.find((l) => l.time_id === rivalId) : undefined;
    const tRival = rivalId ? timePorId(rivalId) : undefined;
    if (!time || !meu || !rival || !tRival) {
      elRival.hidden = true;
      return;
    }
    const chave = `${time.id}>${rival.time_id}`;
    const duelo = situacaoDoDuelo(meu, rival, lembrarDuelo(chave));
    if (!duelo) {
      elRival.hidden = true;
      return;
    }
    lembrarDuelo(chave, duelo.frente);
    const ctx = { ...contextoDoTime(time), rival: { nome: tRival.nome, artigo: tRival.artigo }, dif: duelo.dif };
    const texto = escolherFrase(duelo.evento, ctx, Math.random)?.texto;
    elRival.textContent = texto ?? '';
    elRival.hidden = !texto;
  }

  const carregar = () =>
    rankingDaSemana(semana)
      .then((l) => !saiu && desenhar(l))
      .catch(() => {
        if (!saiu) elLinhas.innerHTML = '<p class="placar-vazio">Sem conexão com o placar agora. Dá pra jogar mesmo assim.</p>';
      });
  void carregar();
  ouvirRanking(semana, () => void carregar())
    .then((f) => (saiu ? f() : (parar = f)))
    .catch(() => {
      // sem Realtime: fica a foto do momento
    });

  return () => {
    saiu = true;
    parar?.();
  };
}
