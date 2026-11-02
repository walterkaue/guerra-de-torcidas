// Aviso de saída em todo link externo (docs/jogo.md, seção 13). Um só lugar: o toque em qualquer link
// para outro site passa por aqui, inclusive nos que forem criados depois. Fica de fora só o que tem
// `data-sem-aviso`: compartilhar no WhatsApp, o painel #admin e o "Seja sócio", que tem folha própria.

import { esc } from '../app';
import { dominioDoLink, ehLinkExterno } from '../jogo/saida';

function abrirFolha(href: string): void {
  const dominio = dominioDoLink(href);
  const folha = document.createElement('div');
  folha.className = 'folha';
  folha.setAttribute('role', 'dialog');
  folha.setAttribute('aria-modal', 'true');
  folha.setAttribute('aria-label', 'Saída do jogo');
  folha.innerHTML = `<div class="folha-caixa">
    <p>Você vai sair do Guerra de Torcidas e abrir ${dominio ? `<strong>${esc(dominio)}</strong>` : 'outro site'}.</p>
    <a class="botao" data-sem-aviso href="${esc(href)}" target="_blank" rel="noopener noreferrer">Ir para o site</a>
    <button class="botao botao-sec" type="button" data-ficar>Ficar no jogo</button>
  </div>`;
  const anterior = document.activeElement as HTMLElement | null;
  const fechar = () => {
    folha.remove();
    anterior?.focus();
  };
  folha.addEventListener('click', (e) => {
    const alvo = e.target as HTMLElement;
    if (alvo === folha || alvo.closest('[data-ficar]') || alvo.closest('a')) fechar();
  });
  document.body.append(folha);
  folha.querySelector('a')!.focus();
}

export function ligarAvisoDeSaida(): void {
  document.addEventListener(
    'click',
    (e) => {
      const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
      if (!link || link.hasAttribute('data-sem-aviso') || !ehLinkExterno(link.href, location.host)) return;
      e.preventDefault();
      abrirFolha(link.href);
    },
    true,
  );
}
