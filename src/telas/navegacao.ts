// Barra de navegação do rodapé: Jogar, Palpites, Ranking e Perfil.

import { irPara } from '../app';
import { icone, type NomeIcone } from './icones';

type Aba = 'jogar' | 'palpites' | 'ranking' | 'perfil';

const ITENS: { id: Aba; rotulo: string; icone: NomeIcone }[] = [
  { id: 'jogar', rotulo: 'Jogar', icone: 'bola' },
  { id: 'palpites', rotulo: 'Palpites', icone: 'lapis' },
  { id: 'ranking', rotulo: 'Ranking', icone: 'podio' },
  { id: 'perfil', rotulo: 'Perfil', icone: 'pessoa' },
];

export function barraNavegacao(ativa: Aba): string {
  return `<nav class="barra-nav" aria-label="Navegação">
    ${ITENS.map(
      (i) => `<button type="button" class="rotulo${i.id === ativa ? ' ativa' : ''}" data-aba="${i.id}"
        ${i.id === ativa ? 'aria-current="page"' : ''}>
        <span class="icone">${icone(i.icone)}</span>${i.rotulo}
      </button>`,
    ).join('')}
  </nav>`;
}

export function ligarBarraNavegacao(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>('.barra-nav [data-aba]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.classList.contains('ativa')) return;
      const aba = b.dataset.aba as Aba;
      irPara({ tela: aba === 'jogar' ? 'inicio' : aba });
    }),
  );
}
