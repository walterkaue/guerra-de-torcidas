// Ficha do lance que abre de baixo (jogo.md, 14.3): favoritar, a ficha factual, a situação, a trilha de medalhas,
// os recriados, o que falta pro ouro, a prévia da linha do resultado e os botões Treinar e Pôr na partida.
// Na tela única (14.7, depois do corte) a ficha serve também às disputas de pênaltis (barra de
// Vitórias, sem a prévia do gol) e só tem ⭐ e "Jogar". Um <dialog> com showModal: fecha no ✕, no toque fora e
// no Esc. Os números das medalhas vêm de quem abre.

import '../estilos/trofeus.css';
import { esc } from '../app';
import { ehItemPenaltis, previaDoProximoGol, trilhaDoItem } from '../jogo/lancesTextos';
import { barra, trilha } from './blocos';
import { icone } from './icones';

export interface NumerosDoLance {
  gols: number;
  recriados: number;
  /** Disputas de pênaltis: vitórias (o ouro pede 10). */
  vitorias?: number;
}

export interface OpcoesDaFicha {
  /** Id do item nas medalhas: o do lance, `penaltis:<disputa>`. */
  id: string;
  titulo: string;
  /** A ficha factual (texto corrido). */
  texto: string;
  /** O dialog entra aqui (a tela dos Lances) e some quando a tela é trocada. */
  raiz: HTMLElement;
  /** Variáveis --c1/--c2 do clube do lance. */
  estilo: string;
  /** "Clube · 2019 · Difícil · 30": a linha de cima do título. */
  meta: string;
  /** Uma linha do que o item pede; vazia, some. */
  situacao: string;
  favorito: boolean;
  /** Os números das medalhas: já chegaram (zerados se nunca marcou), ainda vêm (promessa) ou falharam (null). */
  medalhas: NumerosDoLance | null | Promise<NumerosDoLance | null>;
  aoFavoritar(favorito: boolean): void;
  /** Tela única: o botão "Jogar" (e só ele). Sem isso, a ficha antiga com Treinar e Pôr na partida. */
  aoJogar?(): void;
  aoTreinar?(): void;
  aoPor?(): void;
}

/** O bloco das medalhas da ficha: trilha com marcos, barra de recriados, o que falta e a prévia. */
export function blocoDasMedalhas(n: NumerosDoLance | null | 'carregando', id = ''): string {
  if (n === 'carregando') return '<p class="ficha-aviso" aria-busy="true">Buscando as medalhas…</p>';
  if (!n) return '<p class="ficha-aviso">Sem conexão com as medalhas agora.</p>';
  const t = trilhaDoItem(id, n);
  const { rotulo, feitos, pede } = t.extraDoOuro;
  return `<div class="ficha-trilha">${trilha(t)}</div>
    <div class="ficha-recriados">
      <p class="ficha-recriados-rotulo"><span>${rotulo}</span><strong>${feitos}/${pede}</strong></p>
      ${barra(feitos / pede, `${rotulo} ${feitos}/${pede}`)}
    </div>
    <p class="ficha-falta">${esc(t.faltaProOuro)}</p>
    ${ehItemPenaltis(id) ? '' : `<p class="ficha-previa"><span>No próximo gol:</span> ${esc(previaDoProximoGol(n.gols, n.recriados))}</p>`}`;
}

/** Abre a ficha. Devolve a função que fecha. */
export function abrirFicha(o: OpcoesDaFicha): () => void {
  const d = document.createElement('dialog');
  d.className = 'ficha-lance';
  d.setAttribute('style', o.estilo);
  d.setAttribute('aria-labelledby', 'ficha-titulo');
  let favorito = o.favorito;
  d.innerHTML = `<div class="ficha-corpo">
      <div class="ficha-topo">
        <button type="button" class="ficha-fav" data-fav aria-pressed="${favorito}">${icone('estrela')}<span>${favorito ? 'Favorito' : 'Favoritar'}</span></button>
        <button type="button" class="ficha-fechar" data-fechar aria-label="Fechar">✕</button>
      </div>
      <header class="ficha-cab">
        <p class="ficha-meta">${esc(o.meta)}</p>
        <h2 id="ficha-titulo" class="ficha-titulo">${esc(o.titulo)}</h2>
      </header>
      <p class="ficha-texto">${esc(o.texto)}</p>
      ${o.situacao ? `<p class="lance-situacao">${esc(o.situacao)}</p>` : ''}
      <div class="ficha-medalhas" data-medalhas>${blocoDasMedalhas(o.medalhas instanceof Promise ? 'carregando' : o.medalhas, o.id)}</div>
      <div class="lance-acoes${o.aoJogar ? ' so-jogar' : ''}">
        ${
          o.aoJogar
            ? '<button type="button" class="botao" data-jogar>Jogar</button>'
            : '<button type="button" class="botao-linha" data-treinar>Treinar</button><button type="button" class="botao" data-por>Pôr na partida</button>'
        }
      </div>
    </div>`;
  o.raiz.append(d);

  const fechar = () => {
    if (d.open) d.close();
    d.remove();
  };
  d.addEventListener('close', () => d.remove());
  // O fundo escurecido é o próprio <dialog> (o corpo cobre o resto): clicar nele é tocar fora.
  d.addEventListener('click', (e) => {
    if (e.target === d) fechar();
  });
  d.querySelector('[data-fechar]')!.addEventListener('click', fechar);
  d.querySelector<HTMLElement>('[data-fav]')!.addEventListener('click', (e) => {
    favorito = !favorito;
    const b = e.currentTarget as HTMLElement;
    b.setAttribute('aria-pressed', String(favorito));
    b.querySelector('span')!.textContent = favorito ? 'Favorito' : 'Favoritar';
    o.aoFavoritar(favorito);
  });
  d.querySelector('[data-jogar]')?.addEventListener('click', () => {
    fechar();
    o.aoJogar?.();
  });
  d.querySelector('[data-treinar]')?.addEventListener('click', () => {
    fechar();
    o.aoTreinar?.();
  });
  d.querySelector('[data-por]')?.addEventListener('click', () => {
    o.aoPor?.();
    fechar();
  });
  if (o.medalhas instanceof Promise)
    void o.medalhas
      .catch(() => null)
      .then((n) => {
        const alvo = d.querySelector('[data-medalhas]');
        if (alvo && d.isConnected) alvo.innerHTML = blocoDasMedalhas(n, o.id);
      });
  d.showModal();
  return fechar;
}
