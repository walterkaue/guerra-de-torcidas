// A fita (3 casas, uma por tentativa) e o telão (o campo pintado em CSS, onde o desenho entra depois) do desafio dos
// Lances. Só HTML e textos puros, para entrar no caminho do link sem peso (E01): a cena 3D, os bonecos e o replay
// vêm pelo import() de telas/telaoDoDesafio.ts, depois do convite pintado. Texto e regras: jogo/golsDoDesafio.ts.

import '../estilos/convite.css';
import { esc } from '../app';
import { BOTAO_VER_OS_GOLS, casaDaFita, modoDoTelao, tarjaDoReplay, type ModoDoTelao, type TentativaVista } from '../jogo/golsDoDesafio';
import { icone } from './icones';
import { qualidade } from './qualidade';

/**
 * As 3 casas lado a lado, na ordem das tentativas: ícone do desfecho, palavra curta e pontos. Casa de gol em âmbar; as
 * outras, cinza escuro. `rotulo` (opcional) vai em cima ("Você", "Camisa10"). O leitor de tela lê uma frase por casa.
 */
export function htmlDaFita(tentativas: readonly TentativaVista[], rotulo?: string): string {
  const casas = tentativas
    .map((t, i) => {
      const c = casaDaFita(t, i);
      return `<li><span class="fita-casa${c.gol ? ' gol' : ''}${c.carimbou ? ' carimbou' : ''}" data-casa="${i}" role="img" aria-label="${esc(c.rotulo)}">
          <span class="fita-ico">${icone(c.icone)}</span>
          <span class="fita-palavra">${c.palavra}</span>
          <strong class="fita-pontos">${c.pontos}</strong>
        </span></li>`;
    })
    .join('');
  return `<div class="fita-bloco" data-fita>
      ${rotulo ? `<p class="fita-rotulo">${esc(rotulo)}</p>` : ''}
      <ol class="fita">${casas}</ol>
    </div>`;
}

/**
 * O telão antes do desenho: 4:3 com o gramado pintado em CSS (nada pula quando o desenho chega), a tarja inclinada do
 * 1º gol e um pontinho por gol. `gols`: a sequência de gols (só o índice da tentativa importa aqui). Com a economia de
 * dados ligada, nada baixa sozinho: o botão "Ver os gols" busca o desenho.
 */
export function htmlDoTelao(gols: readonly { indice: number }[], modo: ModoDoTelao): string {
  // Três faixas, nenhuma por cima do desenho: o topo (tarja e pontinhos), o quadro (gramado e canvas) e o pé (legenda e botão).
  return `<figure class="telao" data-telao data-modo="${modo}">
      <div class="telao-topo" aria-hidden="true">
        <span class="telao-tarja"><span class="replay-selo" data-tarja>${tarjaDoReplay(gols[0].indice)}</span></span>
        <span class="telao-pontos">${gols.map((_, k) => `<i${k === 0 ? ' class="atual"' : ''}></i>`).join('')}</span>
      </div>
      <div class="telao-quadro" data-quadro></div>
      <div class="telao-pe" data-pe>${modo === 'sob_demanda' ? `<button type="button" class="telao-botao" data-telao-botao>${BOTAO_VER_OS_GOLS}</button>` : ''}</div>
    </figure>`;
}

/**
 * Como o telão se comporta neste aparelho (jogo/golsDoDesafio.ts, `modoDoTelao`). `soNoToque`: no convite, a economia de
 * dados espera o toque para baixar o desenho; no resultado a pessoa já pediu os gols, então só vale o movimento reduzido
 * (e a qualidade Leve cai no quadro parado dentro do próprio desenho). Em desenvolvimento, &semMovimento força o modo parado.
 */
export function modoNesteAparelho(soNoToque: boolean): ModoDoTelao {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('semMovimento')) return 'parado';
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return modoDoTelao({
    reduzido: matchMedia('(prefers-reduced-motion: reduce)').matches,
    economiaDeDados: soNoToque && !!nav.connection?.saveData,
    qualidadeLeve: soNoToque && qualidade().nivel === 'leve',
  });
}
