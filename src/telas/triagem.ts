// Triagem de faixa etária (docs/jogo.md, seção 13): uma vez por aparelho, antes da 1ª partida.
// Neutra: os três botões têm o mesmo peso e nenhum texto diz o que cada resposta libera.

import '../estilos/convite.css';
import { esc, irPara, x1DoLink, type Rota } from '../app';
import { timePorId } from '../dados/times';
import { guardarFaixa, prefs } from '../estado';
import { placaDaTriagem } from '../jogo/conviteDesafio';
import { ehFaixa, soPara18Mais } from '../jogo/faixaEtaria';
import { etapa } from '../servidor/funil';
import { sincronizarFaixa } from '../servidor/torcedor';
import { desligarAvisos } from './convitePush';
import { bustoDoConvite } from './bustoDoConvite';
import { desafioDaTriagem } from './desafioAberto';

/** Vindo do convite do desafio (telas/convite.ts), o topo ganha uma placa curta com quem chamou e os pontos a bater. */
function placaDoConvite(rota: Rota): string {
  const d = rota.tela === 'triagem' ? desafioDaTriagem(rota.depois) : undefined;
  if (!d) return '';
  const p = placaDaTriagem({ tipo: d.tipo, apelido: d.apelido, pontos: d.pontos, timeId: prefs.get().time });
  const t = timePorId(d.timeId);
  const cores = t ? ` style="--c1:${t.cores[0]};--c2:${t.cores[1]}"` : '';
  return `<section class="placa filete placa-triagem" data-placa-triagem${cores}>
        <p><strong>${esc(p.titulo)}</strong><span>${esc(p.linha)}</span></p>
      </section>`;
}

export function telaTriagem(root: HTMLElement, rota: Rota): void {
  root.innerHTML = `
    <main class="tela triagem">
      <h1 class="marca-pequena">Guerra <span>de Torcidas</span></h1>
      ${placaDoConvite(rota)}
      <div class="triagem-pergunta" role="group" aria-labelledby="triagem-titulo">
        <h2 id="triagem-titulo">Quantos anos você tem?</h2>
        <p class="campo-dica">Só pra deixar o jogo certo pra sua idade.</p>
        <button class="botao botao-sec" type="button" data-faixa="menos_16">Menos de 16</button>
        <button class="botao botao-sec" type="button" data-faixa="16_17">16 ou 17</button>
        <button class="botao botao-sec" type="button" data-faixa="18_mais">18 ou mais</button>
      </div>
      <button class="link-feedback" type="button" data-acao="termos">Termos e privacidade</button>
    </main>`;

  if (rota.tela === 'triagem') {
    const d = desafioDaTriagem(rota.depois);
    if (d) bustoDoConvite(root.querySelector<HTMLElement>('[data-placa-triagem] p'), d.boneco, timePorId(d.timeId)?.cores);
  }

  // Desistência: a triagem é a etapa; conclui ao responder a faixa.
  etapa({ tipo: 'triagem', x1: x1DoLink() });
  root.querySelectorAll<HTMLButtonElement>('[data-faixa]').forEach((b) =>
    b.addEventListener('click', () => {
      const faixa = b.dataset.faixa;
      if (!ehFaixa(faixa)) return;
      etapa(null);
      guardarFaixa(faixa);
      void sincronizarFaixa();
      // Aparelho que já tinha o aviso ligado: o servidor apaga a inscrição, e aqui sai do navegador.
      if (!soPara18Mais(faixa)) void desligarAvisos().catch(() => {});
      irPara(rota.tela === 'triagem' ? rota.depois : { tela: 'inicio' });
    }),
  );
  root.querySelector('[data-acao="termos"]')!.addEventListener('click', () => irPara({ tela: 'termos', de: rota }));
}
