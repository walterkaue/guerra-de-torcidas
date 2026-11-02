// Apoie o jogo (docs/jogo.md, seção 7.5): página #apoie e os botões que levam até ela.
// Apoiar não dá vantagem nenhuma. Tudo fica atrás do interruptor `apoio_ligado` (src/config/apoio.ts)
// e é só para 18+ (seção 13): quem não marcou 18_mais não vê os botões, e #apoie volta para a Home.

import '../estilos/apoio.css';
import { esc, irPara, type Rota } from '../app';
import { APOIO } from '../config/apoio';
import { faixaDoAparelho } from '../estado';
import { apoioDisponivel, chaveLimpa, confirmacaoValida, linkSeguro, passouUmaSemana } from '../jogo/apoio';
import { podeVerApoio } from '../jogo/faixaEtaria';

const CHAVE_OFERTA = 'gdt:apoio-oferta';
const CHAVE_CONFIRMACAO = 'gdt:apoio-confirmado';
// Em desenvolvimento, ?apoioFalso liga o apoio com dados de mentira (só para ver as telas).
const CONFIG =
  import.meta.env.DEV && new URLSearchParams(location.search).has('apoioFalso')
    ? { apoio_ligado: true, linkApoioMensal: 'https://exemplo.org/apoie', chavePix: 'chave-de-teste' }
    : APOIO;

/** Ligado, com um jeito de apoiar e para quem marcou 18+. */
export function apoioLiberado(): boolean {
  return apoioDisponivel(CONFIG) && podeVerApoio(faixaDoAparelho());
}

function lerConfirmacao(): number | null {
  try {
    const v = Number(localStorage.getItem(CHAVE_CONFIRMACAO));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

function marcarConfirmacao(): void {
  try {
    localStorage.setItem(CHAVE_CONFIRMACAO, String(Date.now()));
  } catch {
    // sem memória no aparelho: a confirmação volta na próxima visita
  }
}

function lerUltimaOferta(): number | null {
  try {
    const v = Number(localStorage.getItem(CHAVE_OFERTA));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

function marcarOferta(): void {
  try {
    localStorage.setItem(CHAVE_OFERTA, String(Date.now()));
  } catch {
    // sem memória no aparelho: o botão pode voltar mais de uma vez por semana, sem dano
  }
}

const BOTAO = '<button class="link-feedback link-apoio" type="button" data-acao="apoie">Apoie o jogo</button>';

/** Botão discreto do rodapé (Home e Conquistas). Vazio quando o apoio está desligado. */
export function htmlBotaoApoio(): string {
  return apoioLiberado() ? BOTAO : '';
}

/** Liga o toque dos botões "Apoie o jogo" que estiverem dentro de `root`. */
export function ligarBotaoApoio(root: ParentNode): void {
  root.querySelectorAll('[data-acao="apoie"]').forEach((b) => b.addEventListener('click', () => irPara({ tela: 'apoie' })));
}

/**
 * Tela de resultado: só depois de um bom momento e no máximo uma vez por semana neste aparelho.
 * Nunca no meio da partida nem no card.
 */
export function oferecerApoio(destino: HTMLElement | null, bomMomento: boolean): void {
  if (!destino || !bomMomento || !apoioLiberado() || !passouUmaSemana(lerUltimaOferta(), Date.now())) return;
  destino.innerHTML = BOTAO;
  ligarBotaoApoio(destino);
  marcarOferta();
}

export function telaApoio(root: HTMLElement, _rota: Rota): void {
  if (!apoioLiberado()) {
    if (location.hash === '#apoie') history.replaceState(null, '', `${location.pathname}${location.search}`);
    irPara({ tela: 'inicio' });
    return;
  }
  if (location.hash !== '#apoie') history.replaceState(null, '', `${location.pathname}${location.search}#apoie`);

  const sair = () => {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    irPara({ tela: 'inicio' });
  };

  if (confirmacaoValida(lerConfirmacao(), Date.now())) {
    desenharApoio(root, sair);
    return;
  }
  // A confirmação vem antes do Pix e do link: até aqui, nada deles aparece.
  root.innerHTML = `
    <main class="tela apoio">
      <header class="cabecalho">
        <button class="voltar" type="button" aria-label="Voltar">‹</button>
        <h2 class="titulo-placar">Apoie o jogo</h2>
      </header>
      <p class="apoio-confirma">Sou maior de 18 ou responsável</p>
      <button class="botao" type="button" data-acao="confirmar">Confirmar</button>
      <button class="botao botao-sec" type="button" data-acao="voltar">Voltar</button>
    </main>`;
  root.querySelector('.voltar')!.addEventListener('click', sair);
  root.querySelector('[data-acao="voltar"]')!.addEventListener('click', sair);
  root.querySelector('[data-acao="confirmar"]')!.addEventListener('click', () => {
    marcarConfirmacao();
    desenharApoio(root, sair);
  });
}

function desenharApoio(root: HTMLElement, sair: () => void): void {
  const link = linkSeguro(CONFIG.linkApoioMensal);
  const pix = chaveLimpa(CONFIG.chavePix);

  root.innerHTML = `
    <main class="tela apoio">
      <header class="cabecalho">
        <button class="voltar" type="button" aria-label="Voltar">‹</button>
        <h2 class="titulo-placar">Apoie o jogo</h2>
      </header>
      <p>O Guerra de Torcidas é independente: sem rede de anúncios, sem rastreio e sem propaganda de jogo de azar. Ele se mantém com quem curte. Se o jogo rende resenha no seu grupo, dá pra ajudar a mantê-lo no ar.</p>
      ${link ? `<a class="botao" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Apoiar todo mês</a>` : ''}
      ${
        pix
          ? `<section class="apoio-pix" aria-label="Pix">
              <p class="rotulo">Ou manda um Pix</p>
              <code class="apoio-chave">${esc(pix)}</code>
              <button class="botao botao-sec" type="button" data-acao="copiar">Copiar</button>
            </section>`
          : ''
      }
      <p class="nota">Apoiar não dá vantagem nenhuma no jogo: nada de ponto, XP, selo ou nome na tela. É só ajuda mesmo.</p>
    </main>`;

  root.querySelector('.voltar')!.addEventListener('click', sair);

  const copiar = root.querySelector<HTMLButtonElement>('[data-acao="copiar"]');
  copiar?.addEventListener('click', async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(pix);
      ok = true;
    } catch {
      // sem permissão de área de transferência: seleciona a chave para copiar na mão
      const sel = getSelection();
      const alvo = root.querySelector('.apoio-chave');
      if (sel && alvo) {
        sel.removeAllRanges();
        const r = document.createRange();
        r.selectNodeContents(alvo);
        sel.addRange(r);
      }
    }
    copiar.textContent = ok ? 'Copiado!' : 'Segure na chave e copie';
    setTimeout(() => (copiar.textContent = 'Copiar'), 2200);
  });
}
