// Ficha do lance que abre de baixo (jogo.md, 14.3): favoritar, a ficha factual, a situação, a trilha de medalhas,
// os recriados, o que falta pro ouro, a prévia da linha do resultado, "Mandar esse lance" e "Jogar". Serve aos lances
// e às disputas de pênaltis da tela única (14.7; nas disputas, a barra de Vitórias, sem a prévia do gol). Um <dialog>
// com showModal: fecha no ✕, no toque fora, no Esc e no voltar do celular ou do navegador (S08: entra no history,
// telas/folhaNoHistorico.ts). Os números das medalhas vêm de quem abre.

import '../estilos/trofeus.css';
import { esc } from '../app';
import { contar } from '../servidor/funil';
import { textoParaCopiar } from '../jogo/mandarLance';
import { ehItemPenaltis, previaDoProximoGol, trilhaDoItem } from '../jogo/lancesTextos';
import { barra, trilha } from './blocos';
import { folhaNoHistorico } from './folhaNoHistorico';
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
  /** O botão "Jogar": roda depois que a ficha fechou e o history voltou (a disputa troca de tela). */
  aoJogar(): void;
  /** O botão "Mandar esse lance" (folha de compartilhar ou, sem ela, copia). */
  mandar?: { texto: string; link: string };
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
    ${ehItemPenaltis(id) ? '' : '<p class="ficha-ensina">Carimbar = gol na área marcada, onde o gol de verdade entrou. Vale pontos a mais.</p>'}
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
      <div class="lance-acoes${o.mandar ? ' com-mandar' : ' so-jogar'}">
        ${o.mandar ? `<button type="button" class="botao-linha" data-mandar>${icone('corrente')}<span>Mandar esse lance</span></button>` : ''}<button type="button" class="botao" data-jogar>Jogar</button>
      </div>
      ${o.mandar ? '<p class="ficha-mandar-aviso" role="status" aria-live="polite" data-mandar-aviso></p>' : ''}
    </div>`;
  o.raiz.append(d);

  // O voltar do celular fecha a ficha antes de sair da tela; fechar tocando desfaz o estado empurrado.
  const folha = folhaNoHistorico(() => {
    if (d.open) d.close();
    d.remove();
  });
  const fechar = (depois?: () => void) => folha.fechar(depois);
  // Esc fecha o <dialog> sozinho: passa pelo mesmo caminho, para o history voltar também.
  d.addEventListener('close', () => fechar());
  // O fundo escurecido é o próprio <dialog> (o corpo cobre o resto): clicar nele é tocar fora.
  d.addEventListener('click', (e) => {
    if (e.target === d) fechar();
  });
  d.querySelector('[data-fechar]')!.addEventListener('click', () => fechar());
  d.querySelector<HTMLElement>('[data-fav]')!.addEventListener('click', (e) => {
    favorito = !favorito;
    const b = e.currentTarget as HTMLElement;
    b.setAttribute('aria-pressed', String(favorito));
    b.querySelector('span')!.textContent = favorito ? 'Favorito' : 'Favoritar';
    o.aoFavoritar(favorito);
  });
  d.querySelector('[data-jogar]')!.addEventListener('click', () => fechar(() => o.aoJogar()));
  const btnMandar = d.querySelector<HTMLButtonElement>('[data-mandar]');
  if (btnMandar && o.mandar) {
    const { texto, link } = o.mandar;
    const aviso = d.querySelector<HTMLElement>('[data-mandar-aviso]')!;
    let tAviso = 0;
    const avisar = (t: string) => {
      aviso.textContent = t;
      clearTimeout(tAviso);
      tAviso = window.setTimeout(() => (aviso.textContent = ''), 3500);
    };
    let mandando = false; // toque duplo não chama a folha de compartilhar duas vezes
    btnMandar.addEventListener('click', async () => {
      if (mandando) return;
      mandando = true;
      // Funil: conta no toque; sem a folha de compartilhar do aparelho, o caminho é a cópia do link.
      contar({ ev: 'compartilhou', tipo: 'lance', meio: typeof navigator.share === 'function' ? 'grupo' : 'link' });
      btnMandar.disabled = true;
      const copiar = async () => {
        await navigator.clipboard.writeText(textoParaCopiar(texto, link));
        avisar('Link copiado.');
      };
      try {
        if (navigator.share) {
          try {
            await navigator.share({ text: texto, url: link });
          } catch (e) {
            // Cancelou: nada. Folha que existe mas falha (computador sem destino, permissão): copia o link.
            if ((e as { name?: string })?.name === 'AbortError') return;
            await copiar();
          }
        } else await copiar();
      } catch {
        avisar('Não deu pra compartilhar agora.');
      } finally {
        mandando = false;
        btnMandar.disabled = false;
      }
    });
  }
  if (o.medalhas instanceof Promise)
    void o.medalhas
      .catch(() => null)
      .then((n) => {
        const alvo = d.querySelector('[data-medalhas]');
        if (alvo && d.isConnected) alvo.innerHTML = blocoDasMedalhas(n, o.id);
      });
  d.showModal();
  return () => fechar();
}
