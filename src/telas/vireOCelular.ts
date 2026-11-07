// "Vire o celular pra jogar" (J10, decidido em 06/11/2026; docs/jogo.md 14.7): com o celular deitado, os
// pênaltis e os Lances cobrem a partida com o aviso até a pessoa virar. Quem usa pausa o relógio da partida
// enquanto o aviso estiver na tela. Tablet e computador nunca veem (jogo/telaDaPartida.ts, celularDeitado).

import { celularDeitado } from '../jogo/telaDaPartida';

const DESENHO = `<svg class="vire-celular" viewBox="0 0 80 80" aria-hidden="true">
  <path class="vire-seta" d="M62 22a30 30 0 0 0-26-12" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <path class="vire-seta" d="M64 12v11H53" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="vire-aparelho">
    <rect x="27" y="18" width="26" height="46" rx="5" fill="none" stroke="currentColor" stroke-width="4"/>
    <rect x="35" y="57" width="10" height="3" rx="1.5" fill="currentColor"/>
  </g>
</svg>`;

/** Põe o aviso dentro da partida e chama `aoMudar` quando o celular deita ou levanta. Devolve o desligamento. */
export function vigiarCelularDeitado(partida: HTMLElement, aoMudar: (deitado: boolean) => void): () => void {
  const aviso = document.createElement('div');
  aviso.className = 'vire-o-celular';
  aviso.hidden = true;
  aviso.setAttribute('role', 'status');
  aviso.innerHTML = `${DESENHO}<p class="vire-titulo">Vire o celular pra jogar</p><p class="vire-sub">A partida espera você.</p>`;
  partida.append(aviso);

  const toque = window.matchMedia?.('(pointer: coarse)');
  let deitado = false;
  const conferir = () => {
    const agora = celularDeitado({ largura: window.innerWidth, altura: window.innerHeight, toque: !!toque?.matches });
    if (agora === deitado) return;
    deitado = agora;
    aviso.hidden = !agora;
    aoMudar(agora);
  };
  // O toque no aviso não chega ao campo (nem vira chute nem pulo do goleiro).
  aviso.addEventListener('pointerdown', (e) => e.preventDefault());
  window.addEventListener('resize', conferir);
  window.addEventListener('orientationchange', conferir);
  toque?.addEventListener?.('change', conferir);
  conferir();
  return () => {
    window.removeEventListener('resize', conferir);
    window.removeEventListener('orientationchange', conferir);
    toque?.removeEventListener?.('change', conferir);
    aviso.remove();
  };
}
