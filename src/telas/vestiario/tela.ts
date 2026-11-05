// Tela do Vestiário (docs/jogo.md 14.5, "Tela (Rota 2)"): o boneco grande em corpo inteiro no topo, as 5 abas,
// o conteúdo da aba (só ele rola) e o rodapé com Sortear e Salvar. A conta fica em src/jogo/vestiarioTela.ts;
// de onde ler e para onde gravar vem de fonte.ts. Só baixa quando alguém abre (import() em main.ts).

import '../../estilos/vestiario.css';
import { irPara, type Rota } from '../../app';
import { ID_OUTRO, timePorId, type Time } from '../../dados/times';
import { prefs } from '../../estado';
import {
  ABAS,
  CABELOS,
  CORPOS,
  PELES,
  CORES_DE_CABELO,
  type Aba,
  type Peca,
  type Vestimenta,
} from '../../jogo/vestiario';
import {
  AJUDA_DO_NUMERO,
  NOMES_DOS_CABELOS,
  NOMES_DOS_CORPOS,
  aoVoltar,
  gruposDaAba,
  pecaVestida,
  quadrosDoNumero,
  sortearNaTela,
  teclarNumero,
  temPeca,
  textoDoContador,
  tocarPeca,
  vestirPeca,
  type EstadoDaTela,
  type TeclaDoNumero,
} from '../../jogo/vestiarioTela';
import { aoTocarNoEstado, estado as blocoDeEstado } from '../blocos';
import { desenharFundo, type IdDoFundo } from '../bonecoFundos';
import { desenharBoneco, prepararFonteDoNumero } from '../bonecoMontavel';
import { CORES_DE_CABELO as HEX_DO_CABELO, TONS_DE_PELE } from '../bonecos';
import { telaCarregando } from '../esqueleto';
import { icone, type NomeIcone } from '../icones';
import { abrirFolhaTrancada } from './folhaTrancada';
import { fonteDoVestiario } from './fonte';
import { criarVoltar } from './voltar';

const ICONE_DA_ABA: Record<Aba, NomeIcone> = {
  corpo: 'pessoa',
  cabelo: 'cabelo',
  camisa: 'camisa',
  acessorio: 'apito',
  fundo: 'campo',
};

const TECLAS_DO_NUMERO: readonly TeclaDoNumero[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const semMovimento = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.semMovimento === '1';

function e<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texto?: string): HTMLElementTagNameMap[K] {
  const x = document.createElement(tag);
  if (classe) x.className = classe;
  if (texto !== undefined) x.textContent = texto;
  return x;
}

function botao(classe: string, rotulo?: string): HTMLButtonElement {
  const b = e('button', classe);
  b.type = 'button';
  if (rotulo) b.setAttribute('aria-label', rotulo);
  return b;
}

/** O time das cores: o do Perfil, ou "Outro time" se não houver. Em dev, &time=<id> troca só na memória. */
function timeDaTela(): Time {
  if (import.meta.env.DEV) {
    const pedido = timePorId(new URLSearchParams(location.search).get('time'));
    if (pedido) return pedido;
  }
  return timePorId(prefs.get().time) ?? timePorId(ID_OUTRO)!;
}

function abaInicial(): Aba {
  if (import.meta.env.DEV) {
    const pedida = new URLSearchParams(location.search).get('aba');
    const aba = ABAS.find((a) => a.id === pedida);
    if (aba) return aba.id;
  }
  return 'corpo';
}

interface Miniatura {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  desenhar(c: CanvasRenderingContext2D): void;
}

export function telaVestiario(root: HTMLElement, _rota: Rota): () => void {
  const fonte = fonteDoVestiario();
  if (!fonte) {
    // Produção, nesta etapa: ainda não existe fonte do servidor. Volta ao Perfil.
    irPara({ tela: 'perfil' });
    return () => {};
  }

  let fim = false;
  let limpezaDaTela: () => void = () => {};
  const limpar = () => {
    fim = true;
    limpezaDaTela();
  };

  const carregar = () => {
    root.innerHTML = telaCarregando('Abrindo o vestiário…');
    fonte.ler().then(
      (dados) => {
        if (fim) return;
        limpezaDaTela = montar(root, dados.vestimenta, new Set(dados.liberadas), dados.estado);
      },
      () => {
        if (fim) return;
        root.innerHTML = `<main class="tela vest-erro">
          ${blocoDeEstado('erro', 'Não deu pra abrir o vestiário agora.', { detalhe: 'Confere a conexão e tenta de novo.' })}
          <button class="botao-linha" type="button" data-voltar>Voltar</button>
        </main>`;
        aoTocarNoEstado(root, carregar);
        root.querySelector('[data-voltar]')!.addEventListener('click', () => irPara({ tela: 'perfil' }));
      },
    );
  };
  carregar();
  return limpar;
}

function montar(
  root: HTMLElement,
  gravadaInicial: Vestimenta,
  liberadas: ReadonlySet<string>,
  estadoDaTela: EstadoDaTela,
): () => void {
  const fonte = fonteDoVestiario()!;
  const time = timeDaTela();
  const cores: readonly [string, string] = [time.cores[0], time.cores[1]];
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  // Tirar o #vestiario do endereço: recarregar a página não deve cair de novo aqui por causa do hash.
  if (location.hash === '#vestiario') history.replaceState(null, '', `${location.pathname}${location.search}`);

  let gravada = gravadaInicial;
  let atual = gravadaInicial;
  let aba: Aba = abaInicial();
  let salvando = false;
  let encerrada = false;
  let miniaturas: Miniatura[] = [];
  let marcadores: (() => void)[] = [];
  let tAviso = 0;

  root.innerHTML = `<main class="tela vest" style="--c1:${time.cores[0]};--c2:${time.cores[1]}">
      <section class="vest-topo" data-topo>
        <div class="vest-boneco" data-boneco><canvas aria-hidden="true"></canvas></div>
        <header class="vest-cab">
          <button type="button" class="voltar" data-voltar aria-label="Voltar">‹</button>
          <h1 class="vest-titulo">Vestiário</h1>
          <p class="vest-contador" data-contador>${textoDoContador(liberadas)}</p>
          <span class="vest-previa" data-previa role="img" aria-label="Como o boneco aparece na Home"><canvas></canvas></span>
        </header>
      </section>
      <nav class="abas-tv vest-abas" role="tablist" aria-label="Partes do boneco">
        ${ABAS.map(
          (a) =>
            `<button type="button" role="tab" id="vest-aba-${a.id}" aria-controls="vest-painel" aria-selected="${a.id === aba}" data-aba="${a.id}">${icone(ICONE_DA_ABA[a.id])}<span>${a.nome}</span></button>`,
        ).join('')}
      </nav>
      <div class="vest-conteudo" id="vest-painel" role="tabpanel" data-conteudo></div>
      <footer class="vest-rodape">
        <p class="vest-aviso" role="status" aria-live="polite" data-aviso></p>
        <div class="vest-botoes">
          <button type="button" class="vest-sortear" data-sortear>Sortear</button>
          <button type="button" class="vest-salvar" data-salvar>Salvar</button>
        </div>
      </footer>
    </main>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const topo = $('[data-topo]');
  const bonecoBox = $('[data-boneco]');
  const canvasGrande = $<HTMLCanvasElement>('[data-boneco] canvas');
  const previa = $('[data-previa]');
  const canvasPrevia = $<HTMLCanvasElement>('[data-previa] canvas');
  const conteudo = $('[data-conteudo]');
  const aviso = $('[data-aviso]');
  const btnSortear = $<HTMLButtonElement>('[data-sortear]');
  const btnSalvar = $<HTMLButtonElement>('[data-salvar]');

  // ---------- desenho ----------

  /** No vestiário o boneco fica sempre parado, mesmo com a pose de braços pra cima vestida. */
  const parado = (v: Vestimenta): Vestimenta => ({ ...v, pose: 'parado' });

  function ajustar(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const c = canvas.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    return c;
  }

  function desenharGrande(): void {
    const w = Math.floor(bonecoBox.clientWidth);
    // 8 px a mais embaixo (cortados pela caixa): no pulinho, o fundo sobe junto sem abrir faixa vazia.
    const h = Math.floor(bonecoBox.clientHeight) + 8;
    if (w < 40 || h < 40) return;
    const c = ajustar(canvasGrande, w, h);
    c.save();
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
    desenharBoneco(c, parado(atual), cores, 'corpo', w, h);
    c.restore();
  }

  function desenharPrevia(): void {
    const c = ajustar(canvasPrevia, 52, 52);
    desenharBoneco(c, atual, cores, 'busto', 52, 52);
  }

  function pintar(m: Miniatura): void {
    const c = ajustar(m.canvas, m.w, m.h);
    c.save();
    c.beginPath();
    c.rect(0, 0, m.w, m.h);
    c.clip();
    m.desenhar(c);
    c.restore();
  }

  /** Cria o canvas de uma miniatura e o guarda para ser redesenhado a cada mudança. */
  function miniatura(w: number, h: number, desenhar: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    const canvas = e('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const m: Miniatura = { canvas, w, h, desenhar };
    miniaturas.push(m);
    pintar(m);
    return canvas;
  }

  function pulinho(): void {
    if (semMovimento()) return;
    for (const alvo of [canvasGrande, previa]) {
      alvo.classList.remove('pula');
      void alvo.offsetWidth;
      alvo.classList.add('pula');
    }
  }

  function atualizar(pular: boolean): void {
    desenharGrande();
    desenharPrevia();
    for (const marca of marcadores) marca();
    for (const m of miniaturas) pintar(m);
    if (pular) pulinho();
  }

  /** Toda troca de peça, cor, número ou sorteio passa por aqui (nada é gravado até o Salvar). */
  function mudar(nova: Vestimenta): void {
    if (salvando || encerrada) return;
    atual = nova;
    avisar('');
    atualizar(true);
  }

  function avisar(texto: string): void {
    clearTimeout(tAviso);
    aviso.textContent = texto;
  }

  // ---------- abas ----------

  const titulo = (texto: string, nota?: string) => {
    const h = e('div', 'vest-grupo-cab');
    h.append(e('h2', 'vest-grupo-titulo', texto));
    if (nota) h.append(e('p', 'vest-nota', nota));
    return h;
  };

  function amostra(cor: string, rotulo: string, marcado: () => boolean, aoTocar: () => void): HTMLButtonElement {
    const b = botao('vest-amostra', rotulo);
    b.style.setProperty('--cor', cor);
    marcadores.push(() => b.setAttribute('aria-pressed', String(marcado())));
    b.setAttribute('aria-pressed', String(marcado()));
    b.addEventListener('click', aoTocar);
    return b;
  }

  function itemDaGrade(nome: string, rotuloExtra: string | null, canvas: HTMLCanvasElement, marcado: (() => boolean) | null, aoTocar: () => void, trancada = false): HTMLButtonElement {
    const b = botao('vest-item');
    if (rotuloExtra) b.setAttribute('aria-label', rotuloExtra);
    const mini = e('span', 'vest-mini');
    mini.append(canvas);
    if (trancada) {
      b.classList.add('trancada');
      const cad = e('span', 'vest-cadeado');
      cad.innerHTML = icone('cadeado');
      mini.append(cad);
    }
    b.append(mini, e('span', 'vest-nome', nome));
    if (marcado) {
      const marca = () => b.setAttribute('aria-pressed', String(marcado()));
      marca();
      marcadores.push(marca);
    }
    b.addEventListener('click', aoTocar);
    return b;
  }

  function abaDoCorpo(): void {
    conteudo.append(titulo('Corpo'));
    const linha = e('div', 'vest-grade vest-grade-2');
    for (const id of CORPOS) {
      const canvas = miniatura(76, 112, (c) => desenharBoneco(c, parado({ ...atual, corpo: id }), cores, 'corpo', 76, 112));
      linha.append(itemDaGrade(NOMES_DOS_CORPOS[id], NOMES_DOS_CORPOS[id], canvas, () => atual.corpo === id, () => mudar({ ...atual, corpo: id })));
    }
    conteudo.append(linha);
    conteudo.append(titulo('Pele'));
    const peles = e('div', 'vest-amostras');
    for (const p of PELES) peles.append(amostra(TONS_DE_PELE[p], `Pele ${p + 1}`, () => atual.pele === p, () => mudar({ ...atual, pele: p })));
    conteudo.append(peles);
  }

  function abaDoCabelo(): void {
    conteudo.append(titulo('Estilo'));
    const grade = e('div', 'vest-grade');
    for (const id of CABELOS) {
      const canvas = miniatura(64, 64, (c) => desenharBoneco(c, { ...atual, cabelo: id, pose: 'parado' }, cores, 'busto', 64, 64));
      grade.append(itemDaGrade(NOMES_DOS_CABELOS[id], null, canvas, () => atual.cabelo === id, () => mudar({ ...atual, cabelo: id })));
    }
    conteudo.append(grade);
    conteudo.append(titulo('Cor'));
    const cs = e('div', 'vest-amostras');
    for (const i of CORES_DE_CABELO) cs.append(amostra(HEX_DO_CABELO[i], `Cor ${i + 1}`, () => atual.corCabelo === i, () => mudar({ ...atual, corCabelo: i })));
    conteudo.append(cs);
  }

  function itemDePeca(p: Peca): HTMLButtonElement {
    const livre = temPeca(p, liberadas);
    const canvas = miniaturaDaPeca(p);
    return itemDaGrade(
      p.nome,
      livre ? null : `${p.nome}, trancada`,
      canvas,
      livre ? () => pecaVestida(atual, p) : null,
      () => {
        const t = tocarPeca(atual, p, liberadas);
        if (t.tipo === 'vestiu') mudar(t.vestimenta);
        else abrirFolha(t.peca);
      },
      !livre,
    );
  }

  function tamanhoDaPeca(p: Peca): [number, number] {
    return p.campo === 'fundo' || p.campo === 'moldura' ? [76, 76] : [76, 112];
  }

  /** Desenha a peça: fundo é só o fundo; moldura, o busto com ela; o resto, o boneco atual vestindo a peça. */
  function desenharPeca(c: CanvasRenderingContext2D, p: Peca, w: number, h: number): void {
    if (p.campo === 'fundo') desenharFundo(c, p.valor as IdDoFundo, w, h, cores);
    else if (p.campo === 'moldura') desenharBoneco(c, vestirPeca(parado(atual), p), cores, 'busto', w, h);
    else desenharBoneco(c, vestirPeca(parado(atual), p), cores, 'corpo', w, h);
  }

  function miniaturaDaPeca(p: Peca): HTMLCanvasElement {
    const [w, h] = tamanhoDaPeca(p);
    return miniatura(w, h, (c) => desenharPeca(c, p, w, h));
  }

  function grupos(a: Aba): void {
    for (const g of gruposDaAba(a)) {
      conteudo.append(titulo(g.titulo, g.nota));
      const grade = e('div', 'vest-grade');
      for (const p of g.pecas) grade.append(itemDePeca(p));
      conteudo.append(grade);
    }
  }

  function abaDaCamisa(): void {
    grupos('camisa');
    conteudo.append(titulo('Número'));
    const quadros = e('div', 'vest-numero');
    quadros.setAttribute('role', 'img');
    const q1 = e('span', 'vest-quadro');
    const q2 = e('span', 'vest-quadro');
    quadros.append(q1, q2);
    const teclado = e('div', 'vest-teclado');
    const ajuda = e('p', 'vest-nota', AJUDA_DO_NUMERO);
    const semNumero = botao('vest-tecla vest-sem');
    semNumero.textContent = 'Sem número';
    const apagar = botao('vest-tecla vest-apagar', 'Apagar');
    apagar.innerHTML = '⌫';
    const pintarNumero = () => {
      const { quadros: qs, usados } = quadrosDoNumero(atual.numero);
      q1.textContent = qs[0];
      q2.textContent = qs[1];
      q1.classList.toggle('vazio', usados < 1);
      q2.classList.toggle('vazio', usados < 2);
      quadros.setAttribute('aria-label', atual.numero === null ? 'Sem número na camisa' : `Número da camisa: ${atual.numero}`);
      semNumero.setAttribute('aria-pressed', String(atual.numero === null));
      apagar.disabled = atual.numero === null;
    };
    marcadores.push(pintarNumero);
    pintarNumero();
    for (const t of TECLAS_DO_NUMERO) {
      const b = botao('vest-tecla');
      b.textContent = t;
      b.addEventListener('click', () => mudar({ ...atual, numero: teclarNumero(atual.numero, t) }));
      teclado.append(b);
    }
    apagar.addEventListener('click', () => mudar({ ...atual, numero: teclarNumero(atual.numero, 'apagar') }));
    semNumero.addEventListener('click', () => mudar({ ...atual, numero: null }));
    const linhaFinal = e('div', 'vest-teclado-fim');
    linhaFinal.append(apagar, semNumero);
    conteudo.append(quadros, teclado, linhaFinal, ajuda);
  }

  function mostrarAba(nova: Aba): void {
    aba = nova;
    miniaturas = [];
    marcadores = [];
    conteudo.replaceChildren();
    conteudo.scrollTop = 0;
    root.querySelectorAll<HTMLElement>('[data-aba]').forEach((b) => {
      const ativa = b.dataset.aba === aba;
      b.setAttribute('aria-selected', String(ativa));
      b.tabIndex = ativa ? 0 : -1;
    });
    conteudo.setAttribute('aria-labelledby', `vest-aba-${aba}`);
    if (aba === 'corpo') abaDoCorpo();
    else if (aba === 'cabelo') abaDoCabelo();
    else if (aba === 'camisa') abaDaCamisa();
    else grupos(aba);
  }

  root.querySelectorAll<HTMLElement>('[data-aba]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.aba !== aba) mostrarAba(b.dataset.aba as Aba);
    }),
  );

  // ---------- voltar, camadas e folhas ----------

  const estilo = `--c1:${time.cores[0]};--c2:${time.cores[1]}`;

  const voltar = criarVoltar(() => {
    // O voltar do Android: sem mudança sai; com mudança o estado é devolvido e a pergunta aparece.
    if (aoVoltar(gravada, atual) === 'sair') sair();
    else {
      voltar.restaurarBase();
      perguntar();
    }
  });

  function sair(): void {
    encerrada = true;
    voltar.sair();
    irPara({ tela: 'perfil' });
  }

  function abrirFolha(peca: Peca): void {
    const [w, h] = tamanhoDaPeca(peca);
    abrirFolhaTrancada({
      raiz: root,
      peca,
      estado: estadoDaTela,
      estilo,
      tamanho: [Math.round(w * 1.3), Math.round(h * 1.3)],
      desenhar: (canvas, largura, altura) => {
        const c = ajustar(canvas, largura, altura);
        desenharPeca(c, peca, largura, altura);
      },
      camada: (fechar) => voltar.camada(fechar),
    });
  }

  function perguntar(): void {
    if (root.querySelector('.vest-folha.sair')) return;
    const d = e('dialog', 'vest-folha sair');
    d.setAttribute('style', estilo);
    d.setAttribute('aria-labelledby', 'vest-sair-titulo');
    d.innerHTML = `<div class="vest-folha-corpo">
        <h2 id="vest-sair-titulo" class="vest-folha-nome">Sair sem salvar?</h2>
        <p class="vest-falta">Você mexeu no boneco e ainda não salvou.</p>
        <div class="vest-folha-botoes">
          <button type="button" class="botao" data-salvar-sair>Salvar</button>
          <button type="button" class="botao-linha" data-sair>Sair</button>
        </div>
      </div>`;
    root.append(d);
    let desmontada = false;
    const desmontar = () => {
      if (desmontada) return;
      desmontada = true;
      if (d.open) d.close();
      d.remove();
    };
    const porToque = voltar.camada(desmontar);
    d.addEventListener('cancel', (ev) => {
      ev.preventDefault();
      porToque();
    });
    d.addEventListener('click', (ev) => {
      if (ev.target === d) porToque();
    });
    const btnSalvarSair = d.querySelector<HTMLButtonElement>('[data-salvar-sair]')!;
    const btnSair = d.querySelector<HTMLButtonElement>('[data-sair]')!;
    btnSair.addEventListener('click', sair);
    btnSalvarSair.addEventListener('click', () => {
      btnSalvarSair.disabled = true;
      btnSair.disabled = true;
      btnSalvarSair.textContent = 'Salvando…';
      void salvar().then((ok) => {
        if (encerrada) return;
        if (ok) sair();
        else porToque();
      });
    });
    d.showModal();
  }

  // ---------- rodapé ----------

  function marcarBotoes(): void {
    btnSalvar.disabled = salvando;
    btnSortear.disabled = salvando;
    btnSalvar.textContent = salvando ? 'Salvando…' : 'Salvar';
  }

  /** Grava pelo servidor. Devolve se deu certo; em erro, a escolha fica na tela para tentar de novo. */
  async function salvar(): Promise<boolean> {
    if (salvando) return false;
    salvando = true;
    marcarBotoes();
    avisar('');
    try {
      const voltou = await fonte.salvar(atual);
      if (encerrada) return true;
      gravada = voltou;
      // O servidor pode trocar uma peça: mostra o que voltou.
      const mudouAoVoltar = JSON.stringify(voltou) !== JSON.stringify(atual);
      atual = voltou;
      salvando = false;
      marcarBotoes();
      if (mudouAoVoltar) atualizar(false);
      avisar('Salvo.');
      tAviso = window.setTimeout(() => (aviso.textContent = ''), 2500);
      return true;
    } catch {
      if (encerrada) return false;
      salvando = false;
      marcarBotoes();
      avisar('Não deu pra salvar. Tenta de novo.');
      return false;
    }
  }

  btnSalvar.addEventListener('click', () => void salvar());
  btnSortear.addEventListener('click', () => mudar(sortearNaTela(atual, liberadas)));
  $('[data-voltar]').addEventListener('click', () => {
    if (aoVoltar(gravada, atual) === 'sair') sair();
    else perguntar();
  });

  // ---------- começa ----------

  mostrarAba(aba);
  atualizar(false);
  void prepararFonteDoNumero().then(() => {
    if (!encerrada) atualizar(false);
  });
  const observador = new ResizeObserver(() => {
    if (!encerrada) desenharGrande();
  });
  observador.observe(topo);

  return () => {
    encerrada = true;
    clearTimeout(tAviso);
    observador.disconnect();
    voltar.desligar();
  };
}
