// Tela "SEU CARD" (docs/jogo.md 14.6): folha de tela cheia que abre do botão Card de todo resultado e do "Mandar a
// medalha". O card no meio, com as pontas dos outros estilos dos lados (deslizar troca), 5 quadradinhos de ligar e
// desligar, 3 de ação (sortear, escrever a própria frase, trocar estilo), Salvar imagem e Compartilhar. A conta do que
// entra no card é pura (`jogo/cardPersonalizado.ts`); aqui só há tela. A frase própria vale só para este card: não vai
// para prefs, localStorage nem servidor.

import '../estilos/trofeus.css';
import '../estilos/cardPersonalizado.css';
import { esc } from '../app';
import { corDeTexto } from '../dados/times';
import { APELIDO_MAX, prefs } from '../estado';
import { prontoParaDesenhar } from '../jogo/card';
import {
  ACOES,
  AVISO_IPHONE,
  ESTILOS,
  FORMATOS,
  TAMANHO_DO_CARD,
  TIPOS_DE_CARD,
  alternar,
  estiloVizinho,
  lerEscolhas,
  ligados as ligadosDe,
  nomeDoArquivo,
  planoDoCard,
  salvaPelaFolha,
  textoDoCompartilhar,
  type Acao,
  type Chave,
  type Contexto,
  type DadosDoCard,
  type EscolhasDoCard,
  type EstiloCard,
  type FormatoCard,
} from '../jogo/cardPersonalizado';
import { desenharCardPersonalizado } from '../jogo/cardPersonalizadoDesenho';
import { FRASE_MAX, TEXTOS_DA_FRASE, conferirFrasePropria, letrasDaFrase, limparFrase } from '../jogo/filtroDeFrase';
import { escolherFrase, type ContextoNarrador } from '../narrador/escolher';
import type { EventoNarrador } from '../narrador/frases';
import { lerRecentes, registrarVista } from '../narrador/historico';
import { ErroServidor, salvarTorcedor } from '../servidor/api';
import { nivelParaCard } from './carreira';
import { icone, type NomeIcone } from './icones';

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Espaço entre o card do meio e as pontas dos vizinhos, em pixels. */
const VAO = 12;
/** O mínimo que precisa aparecer de cada vizinho, em pixels (limita a largura do Quadrado). */
const PONTA = 28;
const DICA = 'deslize pra trocar';

export interface OpcoesDoCard {
  /** O dialog entra aqui e some quando a tela é trocada. */
  raiz: HTMLElement;
  /** Os dados do card; pode ainda estar chegando (o nível da Carreira, por exemplo). */
  dados: DadosDoCard | Promise<DadosDoCard>;
  /** Texto que vai junto da imagem (emoji antigo, seção 6 do jogo.md). */
  texto: string;
  /** Link do jogo, como aparece dentro de `texto`. */
  link: string;
  /** Sorteia outra frase do narrador para este resultado; sem ela, "Sortear outra frase" fica desligado. */
  sortearFrase?: () => string | null;
  /** Refaz a linha de quem fez com o apelido recém-escolhido (a escolha do apelido sem sair da tela). */
  quemComApelido?: (apelido: string) => string;
  /** Só para os prints em desenvolvimento: já abre a folha da frase (e, com `enviar`, toca em "Pôr no card"). */
  inicial?: { folhaDaFrase?: { texto: string; enviar: boolean } };
}

/** O que está guardado no aparelho, para quem desenha sem abrir a tela (o botão Stories do resultado). */
export function escolhasGuardadas(tipo: DadosDoCard['tipo']): { escolhas: EscolhasDoCard; ctx: Contexto; ligados: ReadonlySet<Chave> } {
  const p = prefs.get();
  const escolhas = lerEscolhas(p.card);
  const ctx: Contexto = { temApelido: !!p.apelido, nivelNoCard: !!p.nivelNoCard };
  return { escolhas, ctx, ligados: ligadosDe(tipo, escolhas, ctx) };
}

/** Desenha o card com as escolhas guardadas (estilo, formato e o que está ligado), sem frase própria. */
export async function desenharComAsEscolhas(dados: DadosDoCard): Promise<{ canvas: HTMLCanvasElement; comLink: boolean }> {
  await prontoParaDesenhar();
  const { escolhas, ligados } = escolhasGuardadas(dados.tipo);
  const plano = planoDoCard(dados, { estilo: escolhas.estilo, formato: escolhas.formato, ligados });
  return { canvas: desenharCardPersonalizado(dados, plano), comLink: ligados.has('link') };
}

/**
 * O "Sortear outra frase" de um resultado: sorteia do mesmo evento do narrador que a tela usou para a frase dele, sem
 * repetir as que já saíram por este sorteador. Devolve null quando o evento não tem frase para o contexto.
 */
export function sorteadorDeFrase(evento: EventoNarrador, contexto: ContextoNarrador): () => string | null {
  const usadas = new Set<string>();
  return () => {
    const f = escolherFrase(evento, { ...contexto, usadas, recentes: lerRecentes() }, Math.random);
    if (!f) return null;
    usadas.add(f.id);
    registrarVista(f.id);
    return f.texto;
  };
}

interface Pronto {
  blob: Blob | null;
  url: string;
}

const noBlob = (canvas: HTMLCanvasElement) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));

/** Abre a tela. Devolve a função que fecha. */
export function abrirCardPersonalizado(o: OpcoesDoCard): () => void {
  if (o.raiz.querySelector('.cc')) return () => {};

  const d = document.createElement('dialog');
  d.className = 'cc';
  d.setAttribute('aria-labelledby', 'cc-titulo');
  d.innerHTML = `<div class="cc-corpo">
      <header class="cc-topo">
        <button type="button" class="cc-fechar" data-fechar aria-label="Fechar">✕</button>
        <h2 id="cc-titulo" class="cc-titulo">Seu card</h2>
        <div class="cc-formatos" role="radiogroup" aria-label="Formato do card">
          ${FORMATOS.map((f) => `<button type="button" role="radio" data-formato="${f.id}" aria-checked="false">${esc(f.nome)}</button>`).join('')}
        </div>
      </header>
      <div class="cc-palco" data-palco tabindex="0" role="group" aria-roledescription="carrossel" aria-label="Estilos do card" aria-busy="true">
        <div class="cc-trilho" data-trilho>
          ${[-1, 0, 1].map((p) => `<div class="cc-slide" style="--p:${p}" data-pos="${p}"><img alt="" draggable="false" /></div>`).join('')}
        </div>
        <p class="cc-montando" data-montando>Montando o card…</p>
      </div>
      <div class="cc-pontos" data-pontos>
        ${ESTILOS.map((e) => `<span data-ponto="${e.id}">${esc(e.nome)}</span>`).join('')}
      </div>
      <p class="cc-dica" data-dica role="status" aria-live="polite">${DICA}</p>
      <div class="cc-grade" data-grade></div>
      <div class="cc-acoes">
        <button type="button" class="cc-salvar" data-salvar>${icone('imagem')}<span>Salvar imagem</span></button>
        <button type="button" class="cc-compartilhar" data-compartilhar>${icone('celular')}<span>Compartilhar</span></button>
      </div>
    </div>`;
  o.raiz.append(d);

  const $ = <T extends HTMLElement>(sel: string) => d.querySelector<T>(sel)!;
  const palco = $('[data-palco]');
  const trilho = $('[data-trilho]');
  const slides = [...d.querySelectorAll<HTMLElement>('.cc-slide')];
  const dica = $('[data-dica]');
  const grade = $('[data-grade]');
  const btnSalvar = $<HTMLButtonElement>('[data-salvar]');
  const btnCompartilhar = $<HTMLButtonElement>('[data-compartilhar]');

  let dados: DadosDoCard | null = null;
  let escolhas = lerEscolhas(prefs.get().card);
  let nivelNoCard = !!prefs.get().nivelNoCard;
  let frasePropria: string | null = null;
  const prontos = new Map<EstiloCard, Pronto>();
  let geracao = 0;
  let fechado = false;

  const contexto = (): Contexto => ({ temApelido: !!prefs.get().apelido, nivelNoCard });
  const ligados = () => ligadosDe(dados!.tipo, escolhas, contexto());
  const guardar = () => prefs.set({ card: escolhas, nivelNoCard });

  // ---------- avisos ----------
  let tAviso = 0;
  const avisar = (texto: string, ms = 3500) => {
    dica.textContent = texto;
    clearTimeout(tAviso);
    tAviso = window.setTimeout(() => (dica.textContent = DICA), ms);
  };

  // ---------- fechar ----------
  const soltarUrls = () => {
    for (const p of prontos.values()) if (p.url.startsWith('blob:')) URL.revokeObjectURL(p.url);
    prontos.clear();
  };
  const fechar = () => {
    fechado = true;
    geracao++;
    clearTimeout(tAviso);
    if (d.open) d.close();
    d.remove();
    soltarUrls();
  };
  d.addEventListener('close', () => {
    if (!fechado) fechar();
  });
  $('[data-fechar]').addEventListener('click', fechar);

  // ---------- tamanho do card e posição dos slides ----------
  let largura = 0;
  let altura = 0;
  function medir(): void {
    const H = palco.clientHeight;
    const W = palco.clientWidth;
    if (!H || !W) return;
    const { l, a } = TAMANHO_DO_CARD[escolhas.formato];
    const proporcao = l / a;
    const h = Math.min(H, (W - 2 * (VAO + PONTA)) / proporcao);
    altura = Math.floor(h);
    largura = Math.floor(h * proporcao);
    trilho.style.setProperty('--cw', `${largura}px`);
    trilho.style.setProperty('--ch', `${altura}px`);
    trilho.style.setProperty('--vao', `${VAO}px`);
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(medir).observe(palco);
  window.addEventListener('resize', medir);
  d.addEventListener('close', () => window.removeEventListener('resize', medir));

  /** Põe a imagem de cada estilo no slide certo: o do meio é o atual, as pontas são os vizinhos. */
  function pintar(): void {
    const atual = escolhas.estilo;
    const estiloDe = (pos: number): EstiloCard => (pos === 0 ? atual : estiloVizinho(atual, pos < 0 ? -1 : 1));
    for (const s of slides) {
      const pos = Number(s.dataset.pos);
      const estilo = estiloDe(pos);
      const img = s.querySelector('img')!;
      const url = prontos.get(estilo)?.url;
      if (url) img.src = url;
      else img.removeAttribute('src');
      img.alt = pos === 0 ? `Seu card no estilo ${ESTILOS.find((e) => e.id === estilo)!.nome}` : '';
      s.setAttribute('aria-hidden', String(pos !== 0));
    }
    for (const p of d.querySelectorAll<HTMLElement>('[data-ponto]')) {
      const on = p.dataset.ponto === atual;
      p.classList.toggle('on', on);
      if (on) p.setAttribute('aria-current', 'true');
      else p.removeAttribute('aria-current');
    }
    const cheio = prontos.has(atual);
    palco.toggleAttribute('data-vazio', !cheio);
    palco.setAttribute('aria-busy', String(!cheio));
  }

  // ---------- desenho ----------
  async function redesenhar(): Promise<void> {
    if (!dados || fechado) return;
    const minha = ++geracao;
    try {
      await prontoParaDesenhar();
      const L = ligados();
      const ordem = [escolhas.estilo, ...ESTILOS.map((e) => e.id).filter((e) => e !== escolhas.estilo)];
      for (const estilo of ordem) {
        const plano = planoDoCard(dados, { estilo, formato: escolhas.formato, ligados: L, frasePropria });
        const canvas = desenharCardPersonalizado(dados, plano);
        const blob = await noBlob(canvas);
        if (minha !== geracao || fechado) return;
        // O de agora aparece assim que fica pronto; os vizinhos chegam em seguida (até lá, com a imagem anterior).
        const antigo = prontos.get(estilo);
        prontos.set(estilo, { blob, url: blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png') });
        pintar();
        if (antigo?.url.startsWith('blob:')) URL.revokeObjectURL(antigo.url);
      }
    } catch {
      if (minha === geracao) avisar('Não deu pra desenhar o card agora. Tenta de novo.');
    }
  }

  // ---------- quadradinhos ----------
  const html = (q: { nome: string; icone: string }) =>
    `${icone(q.icone as NomeIcone)}<span class="cc-nome">${q.nome.split('\n').map(esc).join('<br>')}</span>`;

  function montarGrade(): void {
    grade.innerHTML =
      TIPOS_DE_CARD[dados!.tipo]
        .map((q) => `<button type="button" class="cc-q cc-liga" data-chave="${q.chave}" aria-pressed="false">${html(q)}<span class="cc-check" aria-hidden="true">✓</span></button>`)
        .join('') +
      ACOES.map((q) => `<button type="button" class="cc-q cc-acao" data-acao="${q.chave}">${html(q)}</button>`).join('');
    atualizarGrade();
  }
  function atualizarGrade(): void {
    const L = ligados();
    for (const b of grade.querySelectorAll<HTMLButtonElement>('[data-chave]')) b.setAttribute('aria-pressed', String(L.has(b.dataset.chave as Chave)));
    grade.querySelector<HTMLButtonElement>('[data-acao="sortear"]')!.disabled = !o.sortearFrase;
  }

  async function aoLigar(chave: Chave): Promise<void> {
    if (!dados) return;
    if (chave === 'apelido' && !prefs.get().apelido) {
      abrirFolhaDoApelido();
      return;
    }
    const r = alternar(escolhas, chave, contexto());
    escolhas = r.escolhas;
    nivelNoCard = r.nivelNoCard;
    guardar();
    atualizarGrade();
    // O nível só foi lido se a pessoa já queria vê-lo: ao ligar agora, busca.
    if (chave === 'nivel' && nivelNoCard && !dados.nivel) {
      dados.nivel = await nivelParaCard().catch(() => null);
      if (fechado) return;
    }
    void redesenhar();
  }

  function trocarEstilo(passo: 1 | -1): void {
    escolhas = { ...escolhas, estilo: estiloVizinho(escolhas.estilo, passo) };
    guardar();
    pintar();
  }

  function sortear(): void {
    if (!o.sortearFrase || !dados) return;
    let nova: string | null = null;
    // Tenta de novo se o sorteio devolver a mesma frase que já está no card.
    for (let i = 0; i < 4; i++) {
      nova = o.sortearFrase();
      if (!nova || nova !== dados.frase) break;
    }
    if (!nova) {
      avisar('Não tem outra frase pra esse resultado.');
      return;
    }
    dados.frase = nova;
    frasePropria = null;
    escolhas = { ...escolhas, desligados: escolhas.desligados.filter((c) => c !== 'frase') };
    guardar();
    atualizarGrade();
    void redesenhar();
  }

  grade.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || b.disabled) return;
    if (b.dataset.chave) void aoLigar(b.dataset.chave as Chave);
    else if (b.dataset.acao) {
      const a = b.dataset.acao as Acao;
      if (a === 'sortear') sortear();
      else if (a === 'escrever') abrirFolhaDaFrase();
      else trocarEstilo(1);
    }
  });

  // ---------- formato ----------
  function marcarFormato(): void {
    for (const b of d.querySelectorAll<HTMLButtonElement>('[data-formato]')) b.setAttribute('aria-checked', String(b.dataset.formato === escolhas.formato));
  }
  $('.cc-formatos').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-formato]');
    const formato = b?.dataset.formato as FormatoCard | undefined;
    if (!formato || formato === escolhas.formato || !dados) return;
    escolhas = { ...escolhas, formato };
    guardar();
    marcarFormato();
    medir();
    // As imagens são do formato anterior: some até chegarem as novas.
    soltarUrls();
    pintar();
    void redesenhar();
  });

  // ---------- deslizar ----------
  let toque: { id: number; x0: number; t0: number; dx: number } | null = null;
  const passo = () => largura + VAO;
  const mover = (dx: number) => trilho.style.setProperty('--dx', `${dx}px`);

  palco.addEventListener('pointerdown', (e) => {
    if (!dados || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || trilho.classList.contains('anima')) return;
    toque = { id: e.pointerId, x0: e.clientX, t0: e.timeStamp, dx: 0 };
    palco.setPointerCapture(e.pointerId);
    palco.classList.add('arrasta');
  });
  palco.addEventListener('pointermove', (e) => {
    if (!toque || e.pointerId !== toque.id) return;
    toque.dx = Math.max(-passo(), Math.min(passo(), e.clientX - toque.x0));
    mover(toque.dx);
  });
  const soltar = (e: PointerEvent) => {
    if (!toque || e.pointerId !== toque.id) return;
    const { dx, t0 } = toque;
    toque = null;
    palco.classList.remove('arrasta');
    const veloz = Math.abs(dx) > 24 && Math.abs(dx) / Math.max(1, e.timeStamp - t0) > 0.5;
    const troca = e.type !== 'pointercancel' && (Math.abs(dx) > largura * 0.22 || veloz);
    if (!troca) {
      if (dx) deslizarAte(0, 0);
      return;
    }
    deslizarAte(dx < 0 ? 1 : -1, dx < 0 ? -passo() : passo());
  };
  palco.addEventListener('pointerup', soltar);
  palco.addEventListener('pointercancel', soltar);

  /** Termina o deslizar: `lado` 0 volta ao lugar; ±1 troca de estilo depois do movimento (sem movimento, na hora). */
  function deslizarAte(lado: 0 | 1 | -1, alvo: number): void {
    let tFim = 0;
    const fim = () => {
      trilho.removeEventListener('transitionend', aoFim);
      clearTimeout(tFim);
      trilho.classList.remove('anima');
      if (lado) {
        escolhas = { ...escolhas, estilo: estiloVizinho(escolhas.estilo, lado) };
        guardar();
        pintar();
      }
      mover(0);
    };
    const aoFim = (e: TransitionEvent) => {
      if (e.target === trilho || (e.target as HTMLElement).classList?.contains('cc-slide')) fim();
    };
    if (semMovimento()) {
      fim();
      return;
    }
    trilho.classList.add('anima');
    trilho.addEventListener('transitionend', aoFim);
    tFim = window.setTimeout(fim, 400);
    // Um quadro depois, para a transição pegar o valor de agora.
    requestAnimationFrame(() => mover(alvo));
  }

  palco.addEventListener('keydown', (e) => {
    if (!dados || trilho.classList.contains('anima')) return;
    if (e.key === 'ArrowLeft') trocarEstilo(-1);
    else if (e.key === 'ArrowRight') trocarEstilo(1);
  });

  // ---------- salvar e compartilhar ----------
  const arquivoAtual = (): File | null => {
    const p = prontos.get(escolhas.estilo);
    return p?.blob ? new File([p.blob], nomeDoArquivo(escolhas.estilo, escolhas.formato), { type: 'image/png' }) : null;
  };
  const rotuloDoBotao = (b: HTMLButtonElement, texto: string) => {
    const s = b.querySelector('span')!;
    const antes = s.textContent;
    s.textContent = texto;
    setTimeout(() => (s.textContent = antes), 1800);
  };

  btnSalvar.addEventListener('click', async () => {
    const pronto = prontos.get(escolhas.estilo);
    if (!dados || !pronto) {
      avisar('O card ainda tá saindo. Espera um instante.');
      return;
    }
    if (salvaPelaFolha(navigator.userAgent, navigator.maxTouchPoints)) {
      avisar(AVISO_IPHONE, 7000);
      const arquivo = arquivoAtual();
      try {
        if (arquivo && navigator.canShare?.({ files: [arquivo] })) await navigator.share({ files: [arquivo] });
      } catch {
        // cancelou
      }
      return;
    }
    const a = document.createElement('a');
    a.href = pronto.url;
    a.download = nomeDoArquivo(escolhas.estilo, escolhas.formato);
    d.append(a);
    a.click();
    a.remove();
    rotuloDoBotao(btnSalvar, 'Salvo!');
  });

  btnCompartilhar.addEventListener('click', async () => {
    if (!dados) return;
    const texto = textoDoCompartilhar(o.texto, o.link, ligados().has('link'));
    const arquivo = arquivoAtual();
    try {
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) await navigator.share({ files: [arquivo], text: texto });
      else if (navigator.share) await navigator.share({ text: texto });
      else {
        await navigator.clipboard.writeText(texto);
        avisar('Copiado!');
        rotuloDoBotao(btnCompartilhar, 'Copiado!');
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') avisar('Não deu pra compartilhar agora.');
    }
  });

  // ---------- folhas (de baixo, por cima da tela) ----------
  const estiloDoTime = () => {
    const t = dados!.time;
    return `--c1:${t.cores[0]};--c2:${t.cores[1]};--txt:${corDeTexto(t.cores[0])}`;
  };

  function abrirFolha(corpo: string, titulo: string, idTitulo: string): { f: HTMLDialogElement; sai: () => void } {
    const f = document.createElement('dialog');
    f.className = 'ficha-lance cc-folha';
    f.setAttribute('style', estiloDoTime());
    f.setAttribute('aria-labelledby', idTitulo);
    f.innerHTML = `<div class="ficha-corpo">
        <div class="ficha-topo">
          <h2 id="${idTitulo}" class="cc-folha-titulo">${esc(titulo)}</h2>
          <button type="button" class="ficha-fechar" data-fechar-folha aria-label="Fechar">✕</button>
        </div>
        ${corpo}
      </div>`;
    d.append(f);
    const sai = () => {
      if (f.open) f.close();
      f.remove();
    };
    f.addEventListener('close', () => f.remove());
    f.querySelector('[data-fechar-folha]')!.addEventListener('click', sai);
    f.addEventListener('click', (e) => {
      if (e.target === f) sai();
    });
    f.showModal();
    if (semMovimento()) f.style.animation = 'none';
    return { f, sai };
  }

  function abrirFolhaDaFrase(inicial?: { texto: string; enviar: boolean }): void {
    const { f, sai } = abrirFolha(
      `<label class="cc-rotulo" for="cc-frase">${esc(TEXTOS_DA_FRASE.regra)}</label>
       <input id="cc-frase" class="cc-campo" type="text" autocomplete="off" enterkeyhint="done" value="${esc(inicial?.texto ?? frasePropria ?? '')}" />
       <p class="cc-contador" data-contador aria-live="polite"></p>
       <p class="cc-erro" role="alert" data-barrada hidden>${esc(TEXTOS_DA_FRASE.barrada)}</p>
       <p class="cc-privacidade">${icone('info')}<span>${esc(TEXTOS_DA_FRASE.privacidade)}</span></p>
       <div class="cc-folha-botoes">
         <button type="button" class="cc-principal" data-por>${esc(TEXTOS_DA_FRASE.porNoCard)}</button>
         <button type="button" class="cc-linha" data-narrador>${esc(TEXTOS_DA_FRASE.usarNarrador)}</button>
       </div>`,
      TEXTOS_DA_FRASE.titulo,
      'cc-frase-titulo',
    );
    const campo = f.querySelector<HTMLInputElement>('#cc-frase')!;
    const conta = f.querySelector<HTMLElement>('[data-contador]')!;
    const barrada = f.querySelector<HTMLElement>('[data-barrada]')!;
    const por = f.querySelector<HTMLButtonElement>('[data-por]')!;
    const atualizar = () => {
      const n = letrasDaFrase(campo.value);
      const passou = n > FRASE_MAX;
      conta.textContent = passou ? `${n}/${FRASE_MAX} · passou do limite` : `${n}/${FRASE_MAX}`;
      conta.classList.toggle('passou', passou);
      por.disabled = passou || !limparFrase(campo.value);
    };
    campo.addEventListener('input', () => {
      barrada.hidden = true;
      atualizar();
    });
    atualizar();
    const colocar = () => {
      const r = conferirFrasePropria(campo.value);
      if (r.ok) {
        frasePropria = r.frase;
        escolhas = { ...escolhas, desligados: escolhas.desligados.filter((c) => c !== 'frase') };
        guardar();
        atualizarGrade();
        void redesenhar();
        sai();
      } else if (r.motivo === 'filtro') {
        barrada.hidden = false;
      }
    };
    por.addEventListener('click', colocar);
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !por.disabled) colocar();
    });
    f.querySelector('[data-narrador]')!.addEventListener('click', () => {
      frasePropria = null;
      void redesenhar();
      sai();
    });
    if (inicial?.enviar) por.click();
  }

  function abrirFolhaDoApelido(): void {
    const { f, sai } = abrirFolha(
      `<label class="cc-rotulo" for="cc-apelido">Ele vai no card que você manda</label>
       <input id="cc-apelido" class="cc-campo" type="text" maxlength="${APELIDO_MAX}" autocomplete="off" placeholder="Ex.: Zé da Geral" />
       <p class="cc-erro" role="alert" data-erro hidden></p>
       <div class="cc-folha-botoes">
         <button type="button" class="cc-principal" data-salvar-apelido>Salvar apelido</button>
         <button type="button" class="cc-linha" data-agora-nao>Agora não</button>
       </div>`,
      'Escolha seu apelido',
      'cc-apelido-titulo',
    );
    const campo = f.querySelector<HTMLInputElement>('#cc-apelido')!;
    const erro = f.querySelector<HTMLElement>('[data-erro]')!;
    const salvar = f.querySelector<HTMLButtonElement>('[data-salvar-apelido]')!;
    const mostrarErro = (t: string) => {
      erro.textContent = t;
      erro.hidden = false;
    };
    campo.addEventListener('input', () => (erro.hidden = true));
    const gravar = async () => {
      const apelido = campo.value.trim().replace(/\s+/g, ' ').slice(0, APELIDO_MAX);
      if (!apelido) {
        mostrarErro('Escreva um apelido ou toque em Agora não.');
        return;
      }
      salvar.disabled = true;
      salvar.textContent = 'Salvando…';
      try {
        await salvarTorcedor(prefs.get().time ?? dados!.time.id, apelido);
      } catch (e) {
        salvar.disabled = false;
        salvar.textContent = 'Salvar apelido';
        mostrarErro(
          e instanceof ErroServidor && e.codigo === 'apelido_bloqueado'
            ? 'Esse apelido não passa no filtro. Tenta outro?'
            : 'Sem conexão agora. Tenta de novo daqui a pouco.',
        );
        return;
      }
      if (fechado) return;
      prefs.set({ apelido });
      escolhas = { ...escolhas, desligados: escolhas.desligados.filter((c) => c !== 'apelido') };
      guardar();
      if (o.quemComApelido) dados!.quem = { ...dados!.quem, comApelido: o.quemComApelido(apelido) };
      atualizarGrade();
      void redesenhar();
      sai();
    };
    salvar.addEventListener('click', () => void gravar());
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void gravar();
    });
    f.querySelector('[data-agora-nao]')!.addEventListener('click', () => sai());
  }

  // ---------- começa ----------
  marcarFormato();
  if (typeof d.showModal === 'function') d.showModal();
  else d.setAttribute('open', '');
  medir();

  void Promise.resolve(o.dados)
    .then((pronto) => {
      if (fechado) return;
      dados = pronto;
      d.setAttribute('style', estiloDoTime());
      $('[data-montando]').remove();
      montarGrade();
      medir();
      pintar();
      void redesenhar();
      if (o.inicial?.folhaDaFrase) abrirFolhaDaFrase(o.inicial.folhaDaFrase);
    })
    .catch(() => {
      if (fechado) return;
      $('[data-montando]').textContent = 'Não deu pra montar o card agora.';
      palco.setAttribute('aria-busy', 'false');
      btnSalvar.disabled = true;
      btnCompartilhar.disabled = true;
    });

  return fechar;
}
