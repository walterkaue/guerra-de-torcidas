// Resultado padrão dos 5 jogos (docs/jogo.md 14.2, docs/visual.md 4.6), sempre nesta ordem:
// placar → pontos pro time → detalhe em placas → frase do narrador → selos → Carreira →
// "Mandar no grupo" com Card (abre a tela "Seu card"), Stories, Emoji e Link → Início e "Mais uma".
// O que cada jogo tem de próprio entra como placa no detalhe, sem quebrar a ordem.
// Comemoração (ligarConfete): papel picado nas cores do time e vibração, uma vez por resultado, em vitória, recorde
// novo, partida nas 3 melhores do dia, Time do Dia acertado e medalha nova (jogo/confete.ts).

import { esc } from '../app';
import { prefs } from '../estado';
import { contar as contarFunil } from '../servidor/funil';
import { htmlDoAviso } from '../servidor/motivo';
import { corDeTexto, type Time } from '../dados/times';
import type { JogoFunil, Meio, TipoX1 } from '../jogo/funil';
import { textoDoCompartilhar, type DadosDoCard } from '../jogo/cardPersonalizado';
import { criarComemoracao, pedacosDoConfete, type MotivoDoConfete } from '../jogo/confete';
import { selosDaPosicao, type Desempenho, type Minigame } from '../jogo/posicao';
import { seloPre, selo } from './blocos';
import { abrirCardPersonalizado, desenharComAsEscolhas, prepararBonecoDoCard } from './cardPersonalizado';
import { medirBarraDeBaixo } from './alturaBarra';
import { convidarParaCidade } from './conviteCidade';
import { icone } from './icones';
import { qualidade } from './qualidade';
import { vibrar } from './toque';

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
  /**
   * J16 (06/11/2026), só nos Lances: "Mandar no grupo" manda o card com o texto pela folha de compartilhar (o link do
   * WhatsApp fica de reserva) e o botão Emoji sai (o placar em emoji é um quadradinho da tela "Seu card").
   */
  mandarCard?: boolean;
  /** 8. Texto do botão principal. */
  maisUma: string;
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

      ${p.aviso ? `<p class="res-aviso${p.aviso.forte ? ' forte' : ''}" role="note">${htmlDoAviso(p.aviso.texto, esc)}</p>` : ''}
      <section class="res-selos" aria-label="Seus números" aria-live="polite">
        <div class="selos" data-selos>${p.selos ?? ''}</div>
        <p class="res-nota" data-nota hidden></p>
      </section>

      <div data-carreira hidden></div>
      <div data-peca-nova hidden></div>

      <section class="mandar" aria-label="Compartilhar">
        <a class="botao botao-zap" data-sem-aviso${p.mandarCard ? ' data-mandar-card' : ''} target="_blank" rel="noopener" href="${p.zap}">Mandar no grupo</a>
        <div class="formatos">
          <button type="button" data-acao="card">${icone('imagem')}Card</button>
          <button type="button" data-acao="share">${icone('celular')}Stories</button>
          ${p.mandarCard ? '' : `<button type="button" data-acao="emoji">${icone('sorriso')}Emoji</button>`}
          <button type="button" data-acao="copiar">${icone('corrente')}Link</button>
        </div>
      </section>

      <div data-convite-push></div>
      <div class="res-apoio" data-apoio></div>

      <div class="res-acoes">
        <button class="botao botao-sec" type="button" data-acao="inicio">Início</button>
        <button class="botao" type="button" data-acao="mais-uma">${esc(p.maisUma)}</button>
      </div>

      <!-- No fim da página, depois de tudo: entra tarde (rede) e não empurra nada. -->
      <div data-convite-cidade></div>
    </main>`;
}

/**
 * Papel picado que cai do alto da tela nas cores do time (o da vitória dos Pênaltis, agora de todos os jogos).
 * Um canvas por cima de tudo, criado na hora e removido no fim (~1,6 s). Movimento reduzido: nada.
 */
function papelDaVitoria(root: HTMLElement, cores: readonly string[]): void {
  const n = pedacosDoConfete(qualidade().nivel, semMovimento());
  if (!n) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confete';
  canvas.setAttribute('aria-hidden', 'true');
  (root.querySelector('.res-padrao') ?? root).prepend(canvas);
  const c = canvas.getContext('2d');
  if (!c) {
    canvas.remove();
    return;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, qualidade().dprMax, 2);
  const W = (canvas.width = innerWidth * dpr);
  const H = (canvas.height = innerHeight * dpr);
  const pedacos = Array.from({ length: n }, () => ({
    x: Math.random() * W,
    y: -Math.random() * H * 0.4,
    vx: (Math.random() - 0.5) * 3 * dpr,
    vy: (2 + Math.random() * 3) * dpr,
    giro: Math.random() * Math.PI,
    cor: cores[Math.floor(Math.random() * cores.length)],
    t: (6 + Math.random() * 6) * dpr,
  }));
  const inicio = performance.now();
  const quadro = (agora: number) => {
    if (!canvas.isConnected) return;
    const passou = agora - inicio;
    c.clearRect(0, 0, W, H);
    c.globalAlpha = passou > 1200 ? Math.max(0, 1 - (passou - 1200) / 400) : 1;
    for (const p of pedacos) {
      p.x += p.vx;
      p.y += p.vy;
      p.giro += 0.15;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.giro);
      c.fillStyle = p.cor;
      c.fillRect(-p.t / 2, -p.t / 4, p.t, p.t / 2);
      c.restore();
    }
    if (passou < 1600) requestAnimationFrame(quadro);
    else canvas.remove();
  };
  requestAnimationFrame(quadro);
}

/** Cores do confete: as duas do time e o amarelo do placar. */
export const coresDoConfete = (t: Time): string[] => [t.cores[0], t.cores[1], '#ffd23f'];

/**
 * Comemoração do resultado: devolve `soltar(motivo)`, que solta o confete e a vibração no primeiro motivo e ignora
 * os seguintes (uma vez por resultado). Tela que já saiu não comemora.
 */
export function ligarConfete(root: HTMLElement, time: Time): (motivo: MotivoDoConfete | null) => boolean {
  const soltar = criarComemoracao({
    desenhar: () => papelDaVitoria(root, coresDoConfete(time)),
    vibrar: () => vibrar('gol'),
  });
  return (motivo) => root.isConnected && soltar(motivo);
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
  /** O que o card pode mostrar (o Card abre a tela "Seu card", o Stories manda o card com as escolhas guardadas). */
  dados: Promise<DadosDoCard>;
  /** Sorteia outra frase do narrador para este resultado; sem ela, "Sortear outra frase" fica desligado. */
  sortearFrase?: () => string | null;
  /** Refaz a linha de quem fez com um apelido escolhido na própria tela do card. */
  quemComApelido?: (apelido: string) => string;
  textoShare: string;
  link: string;
  emoji: string;
  maisUma: () => void;
  inicio: () => void;
  /** Funil do X1: o que este resultado é para a contagem. `x1` é o código novo desta partida (o do link compartilhado). */
  funil: { tipo: TipoX1; x1: string } | { tipo: 'resultado'; jogo: JogoFunil };
}

/** Liga Card, Stories, Emoji, Link, Início e "Mais uma". */
export function ligarResultado(root: HTMLElement, o: Compartilhar): void {
  const avisar = (botao: HTMLButtonElement, texto: string) => {
    const antes = botao.innerHTML;
    botao.textContent = texto;
    setTimeout(() => (botao.innerHTML = antes), 1800);
  };
  const botao = (acao: string) => root.querySelector<HTMLButtonElement>(`[data-acao="${acao}"]`)!;
  /** Conta no toque, antes de qualquer await. */
  const contarMeio = (meio: Meio) => contarFunil({ ev: 'compartilhou', meio, ...o.funil } as Parameters<typeof contarFunil>[0]);

  medirBarraDeBaixo(root.querySelector<HTMLElement>('.res-acoes'));

  // Resultado da 1ª partida de qualquer jogo: convite para a cidade (uma vez por aparelho).
  void convidarParaCidade(root.querySelector<HTMLElement>('[data-convite-cidade]'));

  // Pôster ou "Meu boneco" guardados: lê o boneco já, para o Stories não esperar a rede no toque (14.6).
  prepararBonecoDoCard();

  botao('card').addEventListener('click', () => {
    contarMeio('card');
    abrirCardPersonalizado({
      raiz: root,
      dados: o.dados,
      texto: o.textoShare,
      link: o.link,
      sortearFrase: o.sortearFrase,
      quemComApelido: o.quemComApelido,
    });
  });

  /** O card com as escolhas guardadas, como arquivo e com o texto que vai junto. */
  const cardPronto = async () => {
    const { canvas, comLink } = await desenharComAsEscolhas(await o.dados);
    const texto = textoDoCompartilhar(o.textoShare, o.link, comLink);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
    const arquivo = blob ? new File([blob], 'guerra-de-torcidas.png', { type: 'image/png' }) : null;
    return { arquivo, texto, comLink };
  };

  // "Mandar no grupo" com o card (Lances, J16). O card fica pronto de antemão porque, no iPhone, o share tem de sair
  // direto do toque, sem await antes. Sem card pronto ou sem share com arquivo, o link do wa.me segue como sempre.
  // O link do WhatsApp (ou o share com o card) só conta; o comportamento segue com quem trata o toque.
  root.querySelector('.botao-zap')?.addEventListener('click', () => contarMeio('grupo'));
  const zap = root.querySelector<HTMLAnchorElement>('[data-mandar-card]');
  if (zap) {
    let pronto: { arquivo: File; texto: string; assinatura: string } | null = null;
    const assinatura = () => JSON.stringify([prefs.get().card, prefs.get().apelido, prefs.get().nivelNoCard]);
    const preparar = () => {
      const marca = assinatura();
      void cardPronto()
        .then((c) => {
          if (c.arquivo && marca === assinatura()) pronto = { arquivo: c.arquivo, texto: c.texto, assinatura: marca };
        })
        .catch(() => {
          // sem card pronto: fica o link do WhatsApp
        });
    };
    preparar();
    // Voltou da tela "Seu card": as escolhas podem ter mudado.
    root.addEventListener('close', () => { pronto = null; preparar(); }, true);
    zap.addEventListener('click', (e) => {
      const p = pronto;
      if (!p || p.assinatura !== assinatura() || !navigator.canShare?.({ files: [p.arquivo] })) {
        if (p && p.assinatura !== assinatura()) { pronto = null; preparar(); }
        return; // segue o link do WhatsApp
      }
      e.preventDefault();
      navigator.share({ files: [p.arquivo], text: p.texto }).catch(() => {
        // cancelou
      });
    });
  }

  const btnShare = botao('share');
  btnShare.addEventListener('click', async () => {
    contarMeio('stories');
    try {
      const { arquivo, texto, comLink } = await cardPronto();
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], text: texto });
      } else if (navigator.share) {
        await navigator.share(comLink ? { text: texto, url: o.link } : { text: texto });
      } else {
        await navigator.clipboard.writeText(texto);
        avisar(btnShare, 'Copiado!');
      }
    } catch {
      // cancelou o compartilhamento
    }
  });

  const btnEmoji = root.querySelector<HTMLButtonElement>('[data-acao="emoji"]');
  btnEmoji?.addEventListener('click', async () => {
    contarMeio('emoji');
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
    contarMeio('link');
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
