// Resultado padrão dos 5 jogos (docs/jogo.md 14.2, docs/visual.md 4.6), sempre nesta ordem:
// placar → pontos pro time → detalhe em placas → frase do narrador → selos → Carreira →
// "Mandar no grupo" com Card, Stories, Emoji e Link → Início e "Mais uma".
// O que cada jogo tem de próprio entra como placa no detalhe, sem quebrar a ordem.

import { esc } from '../app';
import { corDeTexto, type Time } from '../dados/times';
import { mostrarCard } from '../jogo/card';
import { selosDaPosicao, type Desempenho, type Minigame } from '../jogo/posicao';
import { seloPre, selo } from './blocos';
import { icone } from './icones';

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export interface PartesDoResultado {
  time: Time;
  /** Classe da tela (ex.: "resultado venceu"). */
  classe: string;
  /** Linha pequena em cima ("Na morte súbita", "Time do Dia #7"). */
  rotulo: string;
  /** "Vitória", "Derrota", "Achou!"… */
  titulo: string;
  /** Título em amarelo (ganhou) ou claro. */
  ganhou: boolean;
  /** 1. Placar (HTML). */
  placar: string;
  /** 2. Pontos pro time; null quando o jogo não dá pontos. */
  pontos: { total: number; paraTime: string | null } | null;
  /** 3. Detalhe em placas (HTML). */
  detalhe: string;
  /** 4. Frases do narrador (texto). */
  frases: readonly string[];
  /** 5. Selos já prontos (HTML), além dos da posição. */
  selos?: string;
  /** Aviso que troca o efeito no ranking (sem valer pontos, sob suspeita…), em texto. */
  aviso?: { texto: string; forte: boolean } | null;
  /** 7. Link do WhatsApp ("Mandar no grupo"). */
  zap: string;
  /** 8. Texto do botão principal. */
  maisUma: string;
  confete?: boolean;
}

/** Selos da posição naquele jogo (novo recorde, posição na semana, recorde). */
export function htmlSelosDaPosicao(d: Desempenho | null, minigame: Minigame): string {
  return selosDaPosicao(d, minigame)
    .map((s) => selo(s.tom === 'ouro' ? `${icone('estrela')} ${esc(s.texto)}` : esc(s.texto), s.tom))
    .join('');
}

export function htmlResultado(p: PartesDoResultado): string {
  const t = p.time;
  return `
    <main class="tela ${p.classe} res-padrao"
      style="--c1:${t.cores[0]};--c2:${t.cores[1]};--txt:${corDeTexto(t.cores[0])}">
      ${p.confete ? '<canvas class="confete" aria-hidden="true"></canvas>' : ''}

      <header class="res-topo">
        <div class="res-topo-linha"><p class="rotulo">${esc(p.rotulo)}</p>${seloPre()}</div>
        <h1 class="res-titulo${p.ganhou ? '' : ' neutro'}">${esc(p.titulo)}</h1>
      </header>

      ${p.placar}

      ${
        p.pontos
          ? `<p class="res-total"><strong data-contador>+${p.pontos.total}</strong>${
              p.pontos.paraTime ? `<span>${esc(p.pontos.paraTime)}</span>` : ''
            }</p>`
          : ''
      }

      ${p.detalhe}

      ${p.frases.map((f, i) => `<p class="adesivo${i ? ' segundo' : ''}">${esc(f)}</p>`).join('')}

      ${p.aviso ? `<p class="res-aviso${p.aviso.forte ? ' forte' : ''}" role="note">${esc(p.aviso.texto)}</p>` : ''}
      <section class="res-selos" aria-label="Seus números" aria-live="polite">
        <div class="selos" data-selos>${p.selos ?? ''}</div>
        <p class="res-nota" data-nota hidden></p>
      </section>

      <div data-carreira hidden></div>

      <section class="mandar" aria-label="Compartilhar">
        <a class="botao botao-zap" data-sem-aviso target="_blank" rel="noopener" href="${p.zap}">Mandar no grupo</a>
        <div class="formatos">
          <button type="button" data-acao="card" aria-expanded="false">${icone('imagem')}Card</button>
          <button type="button" data-acao="share">${icone('celular')}Stories</button>
          <button type="button" data-acao="emoji">${icone('sorriso')}Emoji</button>
          <button type="button" data-acao="copiar">${icone('corrente')}Link</button>
        </div>
        <div class="res-card" data-card hidden><img class="card" alt="Card do resultado" /></div>
      </section>

      <div data-convite-push></div>
      <div class="res-apoio" data-apoio></div>

      <div class="res-acoes">
        <button class="botao botao-sec" type="button" data-acao="inicio">Início</button>
        <button class="botao" type="button" data-acao="mais-uma">${esc(p.maisUma)}</button>
      </div>
    </main>`;
}

/** Conta de 0 até `total` em ~700 ms (sem animação para quem pediu menos movimento). */
export function contar(el: HTMLElement | null, total: number): void {
  if (!el) return;
  if (semMovimento() || total <= 0) {
    el.textContent = `+${total}`;
    return;
  }
  el.textContent = '+0';
  const inicio = performance.now();
  const passo = (agora: number) => {
    const t = Math.min(1, (agora - inicio) / 700);
    el.textContent = `+${Math.round(total * (1 - (1 - t) ** 3))}`;
    if (t < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

export interface Compartilhar {
  /** Card desenhado (o Card mostra, o Stories manda o arquivo). */
  card: Promise<HTMLCanvasElement>;
  textoShare: string;
  link: string;
  emoji: string;
  maisUma: () => void;
  inicio: () => void;
}

/** Liga Card, Stories, Emoji, Link, Início e "Mais uma". */
export function ligarResultado(root: HTMLElement, o: Compartilhar): void {
  const avisar = (botao: HTMLButtonElement, texto: string) => {
    const antes = botao.innerHTML;
    botao.textContent = texto;
    setTimeout(() => (botao.innerHTML = antes), 1800);
  };
  const botao = (acao: string) => root.querySelector<HTMLButtonElement>(`[data-acao="${acao}"]`)!;

  const caixa = root.querySelector<HTMLElement>('[data-card]')!;
  const img = caixa.querySelector<HTMLImageElement>('img')!;
  let desenhado = false;
  const btnCard = botao('card');
  btnCard.addEventListener('click', async () => {
    const abrir = caixa.hidden;
    caixa.hidden = !abrir;
    btnCard.setAttribute('aria-expanded', String(abrir));
    if (abrir && !desenhado) {
      desenhado = true;
      await mostrarCard(img, await o.card).catch(() => {});
    }
    if (abrir) caixa.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'nearest' });
  });

  const btnShare = botao('share');
  btnShare.addEventListener('click', async () => {
    try {
      const canvas = await o.card;
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
      const arquivo = blob ? new File([blob], 'guerra-de-torcidas.png', { type: 'image/png' }) : null;
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], text: o.textoShare });
      } else if (navigator.share) {
        await navigator.share({ text: o.textoShare, url: o.link });
      } else {
        await navigator.clipboard.writeText(o.textoShare);
        avisar(btnShare, 'Copiado!');
      }
    } catch {
      // cancelou o compartilhamento
    }
  });

  const btnEmoji = botao('emoji');
  btnEmoji.addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ text: o.emoji });
      else {
        await navigator.clipboard.writeText(o.emoji);
        avisar(btnEmoji, 'Copiado!');
      }
    } catch {
      // cancelou
    }
  });

  const btnCopiar = botao('copiar');
  btnCopiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(o.link);
      avisar(btnCopiar, 'Copiado!');
    } catch {
      avisar(btnCopiar, 'Sem acesso');
    }
  });

  botao('mais-uma').addEventListener('click', o.maisUma);
  botao('inicio').addEventListener('click', o.inicio);
}
