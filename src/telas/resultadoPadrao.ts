// Resultado padrão dos jogos de partida, em duas camadas (B02 + C02, Rota B de 09/11/2026; docs/visual.md, "Resultado").
// 1. Primeira dobra: título → placar → pontos com a linha curta de situação → UM destaque → prévia da mensagem →
//    "Desafiar a galera" (verde) → "Mostrar o resultado" (Card, Stories, Emoji, Link). Sem código de desafio, no lugar
//    da prévia e do botão verde fica o "Mandar no grupo" de hoje.
// 2. "Ver detalhes da partida" abre logo embaixo, na mesma tela: placas, as outras frases, selos, Carreira, peça nova.
// 3. Um convite por vez (aviso de domingo, apoio, cidade), depois dos detalhes. Início e "Mais uma" fixos no rodapé.
// O destaque segue jogo/resultadoDuasCamadas.ts; o que chega depois (peça nova, medalha da disputa) só passa na frente
// de um destaque que vem depois dele na ordem, e o que sai desce para os detalhes.
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
import {
  dividirDestaques,
  htmlDoBalao,
  linkDoWhatsApp,
  mensagemParaLeitor,
  passaNaFrente,
  type TipoDestaque,
} from '../jogo/resultadoDuasCamadas';
import { seloPre, selo } from './blocos';
import { abrirCardPersonalizado, desenharComAsEscolhas, prepararBonecoDoCard } from './cardPersonalizado';
import { medirBarraDeBaixo } from './alturaBarra';
import { convidarParaCidade } from './conviteCidade';
import { icone } from './icones';
import { qualidade } from './qualidade';
import { vibrar } from './toque';

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Um candidato a destaque, já em HTML. O que não vira destaque desce para os detalhes. */
export interface Destaque {
  tipo: Exclude<TipoDestaque, 'aviso' | 'frase'>;
  html: string;
  /** Resumo que só existe na dobra: a versão inteira já está nos detalhes, então, se não virar destaque, some. */
  soNaDobra?: boolean;
}

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
  /** Placar (HTML). */
  placar: string;
  /** Pontos pro time; null quando o jogo não dá pontos. */
  pontos: { total: number; paraTime: string | null } | null;
  /** Linha curta de situação embaixo dos pontos: o selo "Tá no placar" ou "Subindo pro placar…" (HTML). */
  situacao?: string;
  /** Detalhe em placas (HTML), em "Ver detalhes da partida". */
  detalhe: string;
  /** Frases do narrador (texto). A primeira é a candidata a destaque. */
  frases: readonly string[];
  /** Selos já prontos (HTML), nos detalhes. */
  selos?: string;
  /** Aviso de partida sem valer (sem rede, treino, sob suspeita…), em texto: o destaque que passa na frente de todos. */
  aviso?: { texto: string; forte: boolean } | null;
  /** Os outros candidatos a destaque (desafio recebido, medalha, recorde, 3 melhores do dia). */
  destaques?: readonly (Destaque | null)[];
  /** O texto que vai ao WhatsApp, inteiro (as funções do TEXTOS: textoShareLances, textoSharePenaltis…). */
  mensagem: string;
  /** A partida gerou código de desafio: prévia da mensagem e "Desafiar a galera". Sem: o "Mandar no grupo" de hoje. */
  comDesafio: boolean;
  /**
   * J16 (06/11/2026), só nos Lances: "Mandar no grupo" manda o card com o texto pela folha de compartilhar (o link do
   * WhatsApp fica de reserva) e o botão Emoji sai (o placar em emoji é um quadradinho da tela "Seu card").
   */
  mandarCard?: boolean;
  /** Texto do botão principal. */
  maisUma: string;
}

/** Selos da posição naquele jogo (novo recorde, posição na semana, recorde). */
export function htmlSelosDaPosicao(d: Desempenho | null, minigame: Minigame): string {
  return selosDaPosicao(d, minigame)
    .map((s) => selo(s.tom === 'ouro' ? `${icone('estrela')} ${esc(s.texto)}` : esc(s.texto), s.tom))
    .join('');
}

/** O candidato "recorde novo": os selos da posição, quando a partida bateu o recorde (aí eles saem dos detalhes). */
export const destaqueDoRecorde = (d: Desempenho | null, minigame: Minigame): Destaque | null =>
  d?.novoRecorde ? { tipo: 'recorde', html: `<div class="selos">${htmlSelosDaPosicao(d, minigame)}</div>` } : null;

/**
 * O candidato "resultado do desafio recebido": uma linha só, você × quem desafiou (sem apelido, "Rival do dia"), com o
 * número de quem venceu em amarelo. A placa inteira do duelo (bustos, gols, frase) fica nos detalhes.
 */
export function destaqueDoDuelo(o: {
  voce: number;
  outro: number;
  nomeDoOutro: string | null;
  venceu: boolean;
  /** HTML opcional logo abaixo da linha (pênaltis: a fileira de onde quem chamou bateu). */
  abaixo?: string;
}): Destaque {
  const nome = o.nomeDoOutro?.trim() || 'Rival do dia';
  return {
    tipo: 'desafio',
    soNaDobra: true,
    html: `<p class="res-duelo-curto ${o.venceu ? 'venceu' : 'perdeu'}"><span class="so-leitor">${esc(`Desafio: você ${o.voce}, ${nome} ${o.outro}.`)}</span><span class="res-duelo-linha" aria-hidden="true">
        <span class="lado">Você</span><strong class="voce">${o.voce}</strong><em>x</em><strong class="outro">${o.outro}</strong><span class="lado">${esc(nome)}</span>
      </span></p>${o.abaixo ?? ''}`,
  };
}

/** Uma linha de destaque com a estrela: curta, para caber na dobra. */
const linhaDeDestaque = (texto: string) => `<p class="res-linha-destaque">${icone('estrela')}<span>${esc(texto)}</span></p>`;

/** O candidato "entrou nas 3 melhores do dia", com a lista de hoje. */
export const destaqueDoTop3 = (linha: string | null): Destaque | null => (linha ? { tipo: 'top3', html: linhaDeDestaque(linha) } : null);

/** Peça nova no vestiário, em uma linha (a placa com o boneco e o "Vestir agora" fica nos detalhes). */
export const destaqueDaPeca = (nomes: readonly string[]): Destaque => ({
  tipo: 'peca',
  soNaDobra: true,
  html: linhaDeDestaque(`Peça nova no vestiário: ${nomes.join(', ')}`),
});

/** Medalha nova da disputa, em uma linha (o rumo às medalhas, com o botão de mandar, fica nos detalhes). */
export const destaqueDaMedalha = (texto: string): Destaque => ({ tipo: 'medalha', soNaDobra: true, html: linhaDeDestaque(texto) });

/** Os botões de hoje (Card, Stories, Emoji onde existe, Link). */
const formatos = (comEmoji: boolean) => `
  <button type="button" data-acao="card">${icone('imagem')}Card</button>
  <button type="button" data-acao="share">${icone('celular')}Stories</button>
  ${comEmoji ? `<button type="button" data-acao="emoji">${icone('sorriso')}Emoji</button>` : ''}
  <button type="button" data-acao="copiar">${icone('corrente')}Link</button>`;

/** Dois tiques cinza da mensagem enviada. */
const TIQUES = '<svg class="res-msg-tiques" viewBox="0 0 18 11" aria-hidden="true"><path d="M1 6l3 3 6-7M7 8l1 1 6-7"/></svg>';

/**
 * Prévia da mensagem, "Desafiar a galera" e a linha "Mostrar o resultado". O balão é a mensagem de verdade (a mesma
 * do link do botão), fica escondido do leitor de tela e de quem navega por foco; o leitor lê a versão `so-leitor`,
 * uma vez, antes do botão. O espaço do balão já existe desde o começo (só fica invisível até entrar).
 */
function htmlDoDesafio(p: PartesDoResultado): string {
  return `<section class="res-desafio" aria-label="Desafiar a galera">
      <div class="res-msg espera" data-msg>
        <p class="res-msg-rotulo" aria-hidden="true">Vai junto no WhatsApp</p>
        <p class="so-leitor">${esc(mensagemParaLeitor(p.mensagem))}</p>
        <div class="res-msg-caixa" aria-hidden="true">
          <p class="res-msg-balao"><span class="res-msg-texto">${htmlDoBalao(p.mensagem, esc)}</span><span class="res-msg-hora">agora${TIQUES}</span></p>
          <span class="res-msg-digitando"><i></i><i></i><i></i></span>
        </div>
      </div>
      <a class="botao botao-desafiar" data-desafiar data-sem-aviso target="_blank" rel="noopener" href="${linkDoWhatsApp(p.mensagem)}">${icone('balao')}Desafiar a galera</a>
      <div class="res-mostrar" role="group" aria-label="Mostrar o resultado">
        <p class="res-mostrar-rotulo" aria-hidden="true">Mostrar o resultado</p>
        <div class="res-mostrar-botoes">${formatos(!p.mandarCard)}</div>
      </div>
    </section>`;
}

/** O "Mandar no grupo" de hoje (sem código de desafio). */
const htmlDoMandar = (p: PartesDoResultado) => `<section class="mandar" aria-label="Compartilhar">
      <a class="botao botao-zap" data-sem-aviso${p.mandarCard ? ' data-mandar-card' : ''} target="_blank" rel="noopener" href="${linkDoWhatsApp(p.mensagem)}">Mandar no grupo</a>
      <div class="formatos${p.mandarCard ? ' tres' : ''}">${formatos(!p.mandarCard)}</div>
    </section>`;

export function htmlResultado(p: PartesDoResultado): string {
  const t = p.time;
  const candidatos: { tipo: TipoDestaque; html: string; soNaDobra?: boolean }[] = [
    ...(p.aviso
      ? [{ tipo: 'aviso' as const, html: `<p class="res-aviso${p.aviso.forte ? ' forte' : ''}" role="note">${htmlDoAviso(p.aviso.texto, esc)}</p>` }]
      : []),
    ...(p.destaques ?? []).filter((d): d is Destaque => !!d),
    ...(p.frases.length ? [{ tipo: 'frase' as const, html: `<p class="adesivo">${esc(p.frases[0])}</p>` }] : []),
  ];
  // A frase que não virou destaque continua na lista das frases; os outros descem para o topo dos detalhes.
  const { destaque, resto: desce } = dividirDestaques(candidatos);
  const tipo = destaque?.tipo ?? null;
  const resto = desce.map((c) => c.html).join('');
  const frases = tipo === 'frase' ? p.frases.slice(1) : p.frases;
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
          ? `<div class="res-pontos">
              <p class="res-total"><strong data-contador>+${p.pontos.total}</strong>${p.pontos.paraTime ? `<span>${esc(p.pontos.paraTime)}</span>` : ''}</p>
              ${p.situacao ? `<div class="res-situacao" aria-live="polite">${p.situacao}</div>` : ''}
            </div>`
          : ''
      }

      <div class="res-destaque" data-destaque${tipo ? ` data-tipo="${tipo}"` : ''}${destaque?.soNaDobra ? ' data-so-na-dobra' : ''}>${destaque?.html ?? ''}</div>

      ${p.comDesafio ? htmlDoDesafio(p) : htmlDoMandar(p)}

      <div class="res-detalhes-caixa">
        <button type="button" class="res-ver" data-acao="detalhes" aria-expanded="false" aria-controls="res-detalhes">Ver detalhes da partida</button>
        <section id="res-detalhes" class="res-detalhes" aria-label="Detalhes da partida" hidden>
          <div class="res-detalhes-resto" data-destaque-resto>${resto}</div>
          ${p.detalhe}
          ${frases.map((f, i) => `<p class="adesivo${i ? ' segundo' : ''}">${esc(f)}</p>`).join('')}
          <section class="res-selos" aria-label="Seus números" aria-live="polite">
            <div class="selos" data-selos>${p.selos ?? ''}</div>
            <p class="res-nota" data-nota hidden></p>
          </section>
          <div data-carreira hidden></div>
          <div data-peca-nova hidden></div>
        </section>
      </div>

      <!-- Convites: um por vez (umConvite), depois dos detalhes, nunca na primeira dobra. -->
      <div class="res-convites">
        <div data-convite="push"></div>
        <div class="res-apoio" data-convite="apoio"></div>
        <div data-convite="cidade"></div>
      </div>

      <div class="res-acoes">
        <button class="botao botao-sec" type="button" data-acao="inicio">Início</button>
        <button class="botao" type="button" data-acao="mais-uma">${esc(p.maisUma)}</button>
      </div>
    </main>`;
}

/**
 * Onde pôr um convite (aviso de domingo, apoio ou cidade): o lugar dele, ou null se outro convite já está na tela.
 * Um convite por vez: o primeiro que aparece fica, os outros esperam a próxima partida (sem gastar a vez deles).
 */
export function umConvite(root: HTMLElement, qual: 'push' | 'apoio' | 'cidade'): HTMLElement | null {
  const lugares = [...root.querySelectorAll<HTMLElement>('[data-convite]')];
  if (lugares.some((el) => el.dataset.convite !== qual && el.childElementCount > 0)) return null;
  return lugares.find((el) => el.dataset.convite === qual) ?? null;
}

/**
 * Destaque que chegou depois (peça nova no vestiário, medalha da disputa): toma o lugar do destaque da dobra se vem
 * antes dele na ordem; o que estava lá desce para o topo dos detalhes. Devolve se passou na frente. Só o destaque
 * muda de altura; o balão e o botão verde descem juntos, sem pular de novo.
 */
export function promoverDestaque(root: HTMLElement, d: Destaque): boolean {
  const lugar = root.querySelector<HTMLElement>('[data-destaque]');
  const resto = root.querySelector<HTMLElement>('[data-destaque-resto]');
  if (!lugar || !resto || !lugar.isConnected) return false;
  const atual = (lugar.dataset.tipo as TipoDestaque | undefined) ?? null;
  if (!passaNaFrente(d.tipo, atual)) return false;
  // O resumo que só existe na dobra some; o resto desce para o topo dos detalhes.
  if (lugar.dataset.soNaDobra === undefined) resto.prepend(...lugar.childNodes);
  lugar.innerHTML = d.html;
  lugar.dataset.tipo = d.tipo;
  lugar.toggleAttribute('data-so-na-dobra', !!d.soNaDobra);
  ajustarDobra(root);
  return true;
}

/**
 * A primeira dobra (360 × 740 com a fonte do sistema em 130%). O balão e o "Desafiar a galera" inteiros nela: se o
 * botão passa da dobra, aperta em degraus (`data-aperto`, resultado.css) — primeiro o destaque e os espaços, depois a
 * letra do balão (14 px, e no fim 13 px). E nenhum convite nela: em tela curta, ele desce para depois da dobra.
 */
export function ajustarDobra(root: HTMLElement): void {
  const tela = root.querySelector<HTMLElement>('.res-padrao');
  const rodape = root.querySelector<HTMLElement>('.res-acoes');
  if (!tela || !rodape || !tela.isConnected) return;
  // O rodapé numa linha antes de medir a dobra: ele não cresce e não cobre o "Mostrar o resultado".
  for (const b of rodape.querySelectorAll<HTMLElement>('.botao')) caberNumaLinha(b);
  const dobra = () => innerHeight - rodape.getBoundingClientRect().height;
  const fundo = (el: Element) => el.getBoundingClientRect().bottom + scrollY;
  const botao = root.querySelector<HTMLElement>('[data-desafiar]');
  if (botao) {
    let n = 0;
    for (; n <= 3; n++) {
      tela.dataset.aperto = String(n);
      if (fundo(botao) <= dobra()) break;
    }
    // "Mostrar o resultado" inteiro na dobra, se o 1º degrau (só espaços) bastar; senão a tela não aperta por ele.
    const mostrar = root.querySelector<HTMLElement>('.res-mostrar');
    if (n === 0 && mostrar && fundo(mostrar) > dobra()) {
      tela.dataset.aperto = '1';
      if (fundo(mostrar) > dobra()) tela.dataset.aperto = '0';
    }
  }
  // Nada cortado pela barra de baixo: o bloco de toque que a dobra cortaria ao meio ("Mostrar o resultado", "Ver
  // detalhes") desce até começar nela, inteiro para baixo. Convite nunca na primeira dobra: em tela curta (sem
  // desafio, sem rede), ele desce até logo depois dela.
  const topo = (el: Element) => el.getBoundingClientRect().top + scrollY;
  const convites = root.querySelector<HTMLElement>('.res-convites');
  const blocos: [HTMLElement | null, Element | null][] = [
    [root.querySelector<HTMLElement>('.res-mostrar'), root.querySelector('.res-mostrar')],
    [root.querySelector<HTMLElement>('.res-detalhes-caixa'), root.querySelector('.res-ver')],
  ];
  for (const [bloco] of blocos) if (bloco) bloco.style.marginTop = '';
  if (convites) convites.style.marginTop = '';
  for (const [bloco, medida] of blocos) {
    if (!bloco || !medida) continue;
    const falta = dobra() - topo(medida);
    if (falta > 0 && fundo(medida) > dobra()) bloco.style.marginTop = `${Math.ceil(falta)}px`;
  }
  if (!convites || ![...convites.children].some((c) => c.childElementCount > 0)) return;
  const falta = dobra() - topo(convites);
  if (falta > 0) convites.style.marginTop = `${Math.ceil(falta) + 12}px`;
}

/**
 * O texto do botão do rodapé sempre numa linha ("Jogo de volta" a 360 px com a fonte do sistema em 130%): sem quebra
 * (resultado.css), a letra diminui de 1 em 1 px até caber, nunca abaixo de 14 px e sem reticências. `important`
 * porque a fonte grande do sistema, nas simulações, também vem como estilo do próprio elemento.
 */
function caberNumaLinha(b: HTMLElement): void {
  let px = parseFloat(getComputedStyle(b).fontSize);
  while (b.scrollWidth > b.clientWidth + 1 && px > 14) {
    px -= 1;
    b.style.setProperty('font-size', `${px}px`, 'important');
  }
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

/** Evento que o contador solta quando chega ao total (o balão da mensagem entra nessa hora). */
const CONTOU = 'contador-fim';

/** Conta de 0 até `total` em ~700 ms (sem animação para quem pediu menos movimento). No fim, `data-contou`. */
export function contar(el: HTMLElement | null, total: number): void {
  if (!el) return;
  const acabou = () => {
    el.dataset.contou = '';
    el.dispatchEvent(new Event(CONTOU, { bubbles: true }));
  };
  if (semMovimento() || total <= 0) {
    el.textContent = `+${total}`;
    acabou();
    return;
  }
  el.textContent = '+0';
  const inicio = performance.now();
  const passo = (agora: number) => {
    const t = Math.min(1, (agora - inicio) / 700);
    el.textContent = `+${Math.round(total * (1 - (1 - t) ** 3))}`;
    if (t < 1) requestAnimationFrame(passo);
    else acabou();
  };
  requestAnimationFrame(passo);
}

/**
 * O balão entra quando o contador de pontos termina: três pontinhos de "digitando" por ~0,6 s e um pulinho
 * (escala 0,96 → 1, ~180 ms). Com movimento reduzido, aparece direto. O espaço já estava reservado.
 */
function entrarComOBalao(root: HTMLElement, msg: HTMLElement): void {
  const mostrar = () => msg.classList.remove('espera', 'digitando');
  if (semMovimento()) return mostrar();
  let foi = false;
  const digitar = () => {
    if (foi || !msg.isConnected) return;
    foi = true;
    msg.classList.add('digitando');
    window.setTimeout(() => {
      if (!msg.isConnected) return;
      mostrar();
      msg.classList.add('entra');
    }, 600);
  };
  const contador = root.querySelector<HTMLElement>('[data-contador]');
  if (!contador || contador.dataset.contou !== undefined) return void window.setTimeout(digitar, 200);
  contador.addEventListener(CONTOU, digitar, { once: true });
  window.setTimeout(digitar, 1500); // contador que não terminou (aba no fundo): o balão não fica esperando
}

/** Desliga o ajuste da dobra do último resultado (um por vez). */
let pararDeAjustar: (() => void) | null = null;

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

/** Liga "Desafiar a galera", "Mandar no grupo", Card, Stories, Emoji, Link, os detalhes, Início e "Mais uma". */
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

  // Resultado da 1ª partida de qualquer jogo: convite para a cidade (uma vez por aparelho), se nenhum outro já está na tela.
  void convidarParaCidade(umConvite(root, 'cidade'));

  // Pôster ou "Meu boneco" guardados: lê o boneco já, para o Stories não esperar a rede no toque (14.6).
  prepararBonecoDoCard();

  // "Ver detalhes da partida": abre logo embaixo, na mesma tela.
  const ver = botao('detalhes');
  const detalhes = root.querySelector<HTMLElement>('#res-detalhes')!;
  ver.addEventListener('click', () => {
    const abrir = detalhes.hidden;
    detalhes.hidden = !abrir;
    ver.setAttribute('aria-expanded', String(abrir));
  });

  // "Desafiar a galera": o link do wa.me com a mensagem inteira, direto do toque (sem await nem share com o card), para
  // o link do desafio ir sempre. O toque só conta (meio "grupo", com o tipo do desafio).
  // A dobra se ajusta já (antes do balão aparecer: o espaço dele já está ali) e de novo quando a tela ou um convite
  // muda de tamanho: a fonte chegou, a letra do sistema cresceu, o aparelho girou, o convite entrou. O ajuste sai num
  // setTimeout curto, fora da entrega do ResizeObserver (sem laço) e sem depender de quadro de animação. Um observador por vez: o do resultado anterior
  // sai aqui (o root é o do app inteiro e não avisa a saída).
  ajustarDobra(root);
  pararDeAjustar?.();
  const tela = root.querySelector<HTMLElement>('.res-padrao');
  let quadro = 0;
  const observador =
    typeof ResizeObserver === 'undefined' || !tela
      ? null
      : new ResizeObserver(() => {
          clearTimeout(quadro);
          quadro = window.setTimeout(() => (tela.isConnected ? ajustarDobra(root) : pararDeAjustar?.()), 30);
        });
  if (tela) for (const el of [tela, ...tela.querySelectorAll('.res-convites > *')]) observador?.observe(el);
  pararDeAjustar = () => {
    clearTimeout(quadro);
    observador?.disconnect();
    pararDeAjustar = null;
  };
  const msg = root.querySelector<HTMLElement>('[data-msg]');
  if (msg) entrarComOBalao(root, msg);
  root.querySelector('[data-desafiar]')?.addEventListener('click', () => contarMeio('grupo'));

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
