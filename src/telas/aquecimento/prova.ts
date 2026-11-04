// Estação 4 (Prova) do Aquecimento: a pergunta fácil própria do aquecimento, 4 botões e relógio de 15 s,
// no visual da Prova. Tempo esgotado conta como errou. Ninguém grava nada: roda no aparelho.

import { esc } from '../../app';
import { PERGUNTA_AQUECIMENTO } from '../../jogo/aquecimento';
import { centroNoPalco, demonstrar } from './mao';
import type { Estacao } from './tipos';

const LETRAS = ['A', 'B', 'C', 'D'];

export const estacaoProva: Estacao = (ctx) => {
  const { palco, reduzido } = ctx;
  const p = PERGUNTA_AQUECIMENTO;
  const secao = document.createElement('section');
  secao.className = 'aq-prova';
  secao.innerHTML = `
    <div class="relogio correndo" style="--dur:${p.tempo}s" role="timer" aria-label="Tempo da pergunta">
      <span class="relogio-barra"></span><strong data-seg>${p.tempo}</strong>
    </div>
    <article class="placa filete cartao-pergunta">
      <p class="faixa">Pergunta do aquecimento</p>
      <h2 class="pergunta-texto">${esc(p.texto)}</h2>
      <div class="alternativas">
        ${p.alternativas
          .map((a, k) => `<button type="button" class="alt" data-alt="${k}"><span class="letra">${LETRAS[k]}</span><span class="alt-texto">${esc(a)}</span></button>`)
          .join('')}
      </div>
    </article>`;
  palco.append(secao);

  const relogio = secao.querySelector<HTMLElement>('.relogio')!;
  const seg = secao.querySelector<HTMLElement>('[data-seg]')!;
  const botoes = [...secao.querySelectorAll<HTMLButtonElement>('[data-alt]')];
  let restam = p.tempo;
  let respondida = false;
  let acabou = false;
  let tiraMao: (() => void) | null = null;

  const intervalo = window.setInterval(() => {
    restam -= 1;
    seg.textContent = String(Math.max(0, restam));
    if (restam <= 5) relogio.classList.add('acabando');
    if (restam <= 0) responder(null);
  }, 1000);

  function responder(k: number | null): void {
    if (respondida || acabou) return;
    respondida = true;
    window.clearInterval(intervalo);
    tiraMao?.();
    relogio.classList.remove('correndo');
    botoes.forEach((b) => (b.disabled = true));
    botoes[p.certa].classList.add('certa');
    if (k !== null && k !== p.certa) botoes[k].classList.add('errada');
    if (k !== null) botoes[k].classList.add('escolhida');
    ctx.concluir(k === p.certa);
  }
  botoes.forEach((b, k) => b.addEventListener('click', () => responder(k)));

  // A mão toca na resposta certa.
  const timer = window.setTimeout(() => {
    if (acabou || respondida) return;
    tiraMao = demonstrar(palco, { tipo: 'toca', em: [centroNoPalco(palco, botoes[p.certa])] }, reduzido);
  }, 600);

  return () => {
    acabou = true;
    window.clearInterval(intervalo);
    window.clearTimeout(timer);
    tiraMao?.();
  };
};
