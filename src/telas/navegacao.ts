// Barra de navegação do rodapé: Jogar, Palpites, Ranking e Carreira (com selo "em breve",
// sem tela vazia; docs/visual.md, "No MVP").

import { irPara } from '../app';

type Aba = 'jogar' | 'palpites' | 'ranking';

const ITENS: { id: string; rotulo: string; icone: string; emBreve?: boolean }[] = [
  { id: 'jogar', rotulo: 'Jogar', icone: '⚽' },
  { id: 'palpites', rotulo: 'Palpites', icone: '✎' },
  { id: 'ranking', rotulo: 'Ranking', icone: '▲' },
  { id: 'carreira', rotulo: 'Carreira', icone: '★', emBreve: true },
];

export function barraNavegacao(ativa: Aba): string {
  return `<nav class="barra-nav" aria-label="Navegação">
    ${ITENS.map(
      (i) => `<button type="button" class="rotulo${i.id === ativa ? ' ativa' : ''}" data-aba="${i.id}"
        ${i.emBreve ? 'aria-disabled="true"' : ''} ${i.id === ativa ? 'aria-current="page"' : ''}>
        <span class="icone" aria-hidden="true">${i.icone}</span>${i.rotulo}
        ${i.emBreve ? '<span class="em-breve">em breve</span>' : ''}
      </button>`,
    ).join('')}
  </nav>`;
}

export function ligarBarraNavegacao(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>('.barra-nav [data-aba]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true' || b.classList.contains('ativa')) return;
      const aba = b.dataset.aba;
      irPara(aba === 'ranking' ? { tela: 'ranking' } : aba === 'palpites' ? { tela: 'palpites' } : { tela: 'inicio' });
    }),
  );
}
