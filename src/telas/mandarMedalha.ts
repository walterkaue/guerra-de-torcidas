// "Mandar a medalha" (docs/jogo.md 7.3, "Card de medalha"): folha que abre de baixo, como a ficha do lance, com o
// card só da medalha (jogo/cardMedalha.ts), "Mandar no grupo" (texto com emoji antigo e o link do lance), Stories (o
// card como arquivo) e Link. Abre no resultado, quando a pessoa sobe de medalha, e ao tocar numa medalha nas Conquistas.

import '../estilos/trofeus.css';
import { esc } from '../app';
import { corDeTexto, proTime, timePorId, TIMES } from '../dados/times';
import { prefs } from '../estado';
import { mostrarCard, prontoParaDesenhar } from '../jogo/card';
import { desenharCardMedalha } from '../jogo/cardMedalha';
import type { Medalha } from '../jogo/lances';
import { fraseDaMedalha, itemDaMedalha, linkDaMedalha, textoDeMandarMedalha } from '../jogo/medalhaTextos';
import { icone } from './icones';

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Abre a folha da medalha `medalha` do item `itemId` (lance ou `penaltis:<disputa>`) dentro de `raiz`, que a leva
 * embora quando a tela troca. Item fora do catálogo: não abre (devolve null). Devolve a função que fecha.
 */
export function abrirMandarMedalha(o: { raiz: HTMLElement; itemId: string; medalha: Medalha }): (() => void) | null {
  const item = itemDaMedalha(o.itemId);
  if (!item) return null;
  const time = timePorId(prefs.get().time) ?? TIMES[TIMES.length - 1];
  const paraTime = proTime(time);
  const frase = fraseDaMedalha(o.medalha, item);
  const link = linkDaMedalha(item);
  const texto = textoDeMandarMedalha(o.medalha, item, paraTime, link);

  const d = document.createElement('dialog');
  d.className = 'ficha-lance mandar-medalha';
  d.setAttribute('style', `--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}`);
  d.setAttribute('aria-labelledby', 'mm-titulo');
  d.innerHTML = `<div class="ficha-corpo">
      <div class="ficha-topo">
        <h2 id="mm-titulo" class="mm-titulo"><span class="medalha ${o.medalha}" aria-hidden="true"></span>Mandar a medalha</h2>
        <button type="button" class="ficha-fechar" data-fechar aria-label="Fechar">✕</button>
      </div>
      <p class="mm-frase">${esc(frase)}</p>
      <div class="mm-card" aria-busy="true"><img class="card" alt="${esc(`Card da medalha: ${frase}`)}" /></div>
      <section class="mandar" aria-label="Compartilhar a medalha">
        <a class="botao botao-zap" data-sem-aviso target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(texto)}">Mandar no grupo</a>
        <div class="formatos dois">
          <button type="button" data-acao="share">${icone('celular')}Stories</button>
          <button type="button" data-acao="copiar">${icone('corrente')}Link</button>
        </div>
      </section>
    </div>`;
  o.raiz.append(d);

  const fechar = () => {
    if (d.open) d.close();
    d.remove();
  };
  d.addEventListener('close', () => d.remove());
  d.querySelector('[data-fechar]')!.addEventListener('click', fechar);
  // Toque fora do conteúdo (no fundo escuro) fecha, como na ficha.
  d.addEventListener('click', (e) => {
    if (e.target === d) fechar();
  });

  const card = (async () => {
    await prontoParaDesenhar();
    return desenharCardMedalha({
      time,
      apelido: prefs.get().apelido,
      paraTime,
      medalha: o.medalha,
      item,
      link: link.replace('https://', ''),
    });
  })();
  const caixa = d.querySelector<HTMLElement>('.mm-card')!;
  void card
    .then((canvas) => mostrarCard(caixa.querySelector('img')!, canvas))
    .catch(() => {})
    .finally(() => caixa.removeAttribute('aria-busy'));

  const avisar = (botao: HTMLButtonElement, aviso: string) => {
    const antes = botao.innerHTML;
    botao.textContent = aviso;
    setTimeout(() => (botao.innerHTML = antes), 1800);
  };
  const btnShare = d.querySelector<HTMLButtonElement>('[data-acao="share"]')!;
  btnShare.addEventListener('click', async () => {
    try {
      const canvas = await card;
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
      const arquivo = blob ? new File([blob], 'medalha-guerra-de-torcidas.png', { type: 'image/png' }) : null;
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) await navigator.share({ files: [arquivo], text: texto });
      else if (navigator.share) await navigator.share({ text: texto, url: link });
      else {
        await navigator.clipboard.writeText(texto);
        avisar(btnShare, 'Copiado!');
      }
    } catch {
      // cancelou o compartilhamento
    }
  });
  const btnCopiar = d.querySelector<HTMLButtonElement>('[data-acao="copiar"]')!;
  btnCopiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      avisar(btnCopiar, 'Copiado!');
    } catch {
      avisar(btnCopiar, 'Sem acesso');
    }
  });

  if (typeof d.showModal === 'function') d.showModal();
  else d.setAttribute('open', '');
  if (semMovimento()) d.style.animation = 'none';
  return fechar;
}

/** O botão "Mandar a medalha" que abre a folha (no resultado, na linha da medalha que subiu). */
export const botaoMandarMedalha = (itemId: string, medalha: Medalha): string =>
  `<button type="button" class="botao-linha mandar-medalha-btn ${medalha}" data-mandar-medalha="${esc(itemId)}" data-medalha="${medalha}">${icone('trofeu')}Mandar a medalha</button>`;

/** Liga os botões `data-mandar-medalha` de dentro de `el` (um ouvinte só). */
export function ligarMandarMedalha(el: HTMLElement, raiz: HTMLElement): void {
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-mandar-medalha]');
    const medalha = b?.dataset.medalha as Medalha | undefined;
    if (b?.dataset.mandarMedalha && medalha) abrirMandarMedalha({ raiz, itemId: b.dataset.mandarMedalha, medalha });
  });
}
