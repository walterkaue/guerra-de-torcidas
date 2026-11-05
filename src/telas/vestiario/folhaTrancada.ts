// Folha da peça trancada (docs/jogo.md 14.5, "Peça trancada"): abre de baixo, mostra a peça meio apagada, o nome,
// a condição, a barra de XP (peça de nível) ou o que falta (medalha, ouros, Aquecimento), o que mais libera junto
// e um botão só, "Entendi". Nada de compra, sorteio, prazo ou "só hoje". Um <dialog> com showModal: fecha no
// toque fora, no Esc, no "Entendi" e no voltar do Android (a camada vem de voltar.ts).

import { esc } from '../../app';
import { folhaDaTrancada, type EstadoDaTela } from '../../jogo/vestiarioTela';
import type { Peca } from '../../jogo/vestiario';
import { barra } from '../blocos';
import { icone } from '../icones';

export interface OpcoesDaFolha {
  /** O dialog entra aqui e some quando a tela é trocada. */
  raiz: HTMLElement;
  peca: Peca;
  estado: EstadoDaTela;
  /** Desenha a peça (a mesma miniatura da grade, maior) no canvas, que já vem com o tamanho certo. */
  desenhar(canvas: HTMLCanvasElement, largura: number, altura: number): void;
  /** Largura e altura da miniatura grande. */
  tamanho: [number, number];
  /** Registra a folha no voltar do Android; devolve o que fecha tocando. Sem isso, fecha direto. */
  camada?(fechar: () => void): () => void;
  /** Variáveis --c1/--c2 do time. */
  estilo: string;
  aoFechar?(): void;
}

/** Abre a folha. Devolve a função que fecha (sem mexer no history: é a da limpeza da tela). */
export function abrirFolhaTrancada(o: OpcoesDaFolha): () => void {
  const f = folhaDaTrancada(o.peca, o.estado);
  const [w, h] = o.tamanho;
  const d = document.createElement('dialog');
  d.className = 'vest-folha';
  d.setAttribute('style', o.estilo);
  d.setAttribute('aria-labelledby', 'vest-folha-nome');
  const linhas = f.barra
    ? `<div class="vest-xp">
         ${barra(f.barra.fracao, `${f.barra.voce}. ${f.barra.faltam}`)}
         <p class="vest-xp-linha"><span>${esc(f.barra.voce)}</span><strong>${esc(f.barra.faltam)}</strong></p>
       </div>`
    : (f.falta ?? []).map((l) => `<p class="vest-falta">${esc(l)}</p>`).join('');
  d.innerHTML = `<div class="vest-folha-corpo">
      <div class="vest-folha-peca">
        <span class="vest-folha-mini" style="width:${w}px;height:${h}px"><canvas></canvas></span>
        <div class="vest-folha-texto">
          <h2 id="vest-folha-nome" class="vest-folha-nome">${esc(f.nome)}</h2>
          <p class="vest-folha-condicao">${icone('cadeado')}<span>${esc(f.condicao)}</span></p>
        </div>
      </div>
      ${linhas}
      ${f.junto.length > 0 ? `<p class="vest-junto"><span>Libera junto:</span> ${f.junto.map(esc).join(' · ')}</p>` : ''}
      <button type="button" class="botao" data-entendi>Entendi</button>
    </div>`;
  o.raiz.append(d);

  const canvas = d.querySelector('canvas')!;
  let fechada = false;
  const desmontar = () => {
    if (fechada) return;
    fechada = true;
    if (d.open) d.close();
    d.remove();
    o.aoFechar?.();
  };
  const porToque = o.camada ? o.camada(desmontar) : desmontar;
  d.addEventListener('cancel', (e) => {
    e.preventDefault();
    porToque();
  });
  d.addEventListener('click', (e) => {
    if (e.target === d) porToque();
  });
  d.querySelector('[data-entendi]')!.addEventListener('click', porToque);
  // Se o navegador fechar o dialog sem `cancel` (voltar do Android pelo CloseWatcher), a camada sai junto.
  d.addEventListener('close', () => porToque());
  d.showModal();
  o.desenhar(canvas, w, h);
  return desmontar;
}
