// Triagem de faixa etária (docs/jogo.md, seção 13): uma vez por aparelho, antes da 1ª partida.
// Neutra: os três botões têm o mesmo peso e nenhum texto diz o que cada resposta libera.

import { irPara, type Rota } from '../app';
import { guardarFaixa } from '../estado';
import { ehFaixa, soPara18Mais } from '../jogo/faixaEtaria';
import { sincronizarFaixa } from '../servidor/torcedor';
import { desligarAvisos } from './convitePush';

export function telaTriagem(root: HTMLElement, rota: Rota): void {
  root.innerHTML = `
    <main class="tela triagem">
      <h1 class="marca-pequena">Guerra <span>de Torcidas</span></h1>
      <div class="triagem-pergunta" role="group" aria-labelledby="triagem-titulo">
        <h2 id="triagem-titulo">Quantos anos você tem?</h2>
        <button class="botao botao-sec" type="button" data-faixa="menos_16">Menos de 16</button>
        <button class="botao botao-sec" type="button" data-faixa="16_17">16 ou 17</button>
        <button class="botao botao-sec" type="button" data-faixa="18_mais">18 ou mais</button>
      </div>
      <button class="link-feedback" type="button" data-acao="termos">Termos e privacidade</button>
    </main>`;

  root.querySelectorAll<HTMLButtonElement>('[data-faixa]').forEach((b) =>
    b.addEventListener('click', () => {
      const faixa = b.dataset.faixa;
      if (!ehFaixa(faixa)) return;
      guardarFaixa(faixa);
      void sincronizarFaixa();
      // Aparelho que já tinha o aviso ligado: o servidor apaga a inscrição, e aqui sai do navegador.
      if (!soPara18Mais(faixa)) void desligarAvisos().catch(() => {});
      irPara(rota.tela === 'triagem' ? rota.depois : { tela: 'inicio' });
    }),
  );
  root.querySelector('[data-acao="termos"]')!.addEventListener('click', () => irPara({ tela: 'termos', de: rota }));
}
