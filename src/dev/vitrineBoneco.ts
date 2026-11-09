// Vitrine do boneco montável (só em desenvolvimento: abre com ?vitrineBoneco no endereço da raiz).
// Mostra as peças, os tamanhos, os uniformes, os fundos, as molduras e os times difíceis para o Kauê aprovar.
// Filtros: &so=<seção> (prancha, bustos, tamanhos, uniformes, fundos, molduras, times), &tam=<tamanho>
// (b40, b52, b84, b280, c76, c104, c390), &estado=novo|meio|tudo (o que a prancha mostra trancado), &time=<id> e
// &barra=dentro (camisa por dentro do calção, lida por bonecos.ts).

import '../style.css';
import { TIMES, type Time } from '../dados/times';
import {
  ABAS,
  CABELOS,
  FUNDOS,
  MOLDURAS,
  PADRAO,
  PECAS,
  pecasLiberadas,
  textoDaCondicao,
  type EstadoDoVestiario,
  type MedalhaDoItem,
  type Peca,
  type Vestimenta,
} from '../jogo/vestiario';
import { desenharBoneco, prepararFonteDoNumero, type Recorte } from '../telas/bonecoMontavel';
import { TONS_DE_PELE, CORES_DE_CABELO } from '../telas/bonecos';

const parametros = new URLSearchParams(location.search);
const secaoPedida = parametros.get('so');
const tamanhoPedido = parametros.get('tam');

// ---------- estados do vestiário ----------

const lance = (gols: number, recriados = 0, daSelecao = false): MedalhaDoItem => ({ tipo: 'lance', gols, recriados, vitorias: 0, daSelecao });
const disputa = (gols: number, vitorias: number): MedalhaDoItem => ({ tipo: 'disputa', gols, recriados: 0, vitorias, daSelecao: false });

const ESTADOS: Record<string, { nome: string; estado: EstadoDoVestiario }> = {
  novo: { nome: 'Conta nova', estado: { nivel: 0, medalhas: [], aquecido: false } },
  // Titular, um bronze e uma prata, sem aquecimento.
  meio: { nome: 'Titular, 1 bronze, 1 prata', estado: { nivel: 2, medalhas: [lance(5), lance(20)], aquecido: false } },
  tudo: {
    nome: 'Tudo liberado',
    estado: { nivel: 5, medalhas: [lance(50, 10, true), lance(50, 10), lance(50, 10), lance(50, 10), disputa(100, 10)], aquecido: true },
  },
};
const chaveDoEstado = ESTADOS[parametros.get('estado') ?? ''] ? (parametros.get('estado') as string) : 'meio';

// ---------- vestimentas ----------

const time: Time = TIMES.find((t) => t.id === parametros.get('time')) ?? TIMES.find((t) => t.id === 'flamengo')!;
const porId = (id: string): Time => TIMES.find((t) => t.id === id)!;

const BASE: Vestimenta = { ...PADRAO, pele: 3, cabelo: 'curto', corCabelo: 1, numero: '10' };
const com = (extra: Partial<Vestimenta>, base: Vestimenta = BASE): Vestimenta => ({ ...base, ...extra });

/** Gente variada e repetível: pele, cabelo, corpo, camisa e peças mudam de um para o outro. */
function gente(n: number): Vestimenta[] {
  const camisas = ['uni1', 'uni2', 'uni1', 'goleiro'] as const;
  const numeros = ['10', '7', '09', '23', '1', '99', '5', '00', '12', '8', '4', '17'];
  const cabecas = ['nenhum', 'testeira'] as const;
  return Array.from({ length: n }, (_, i): Vestimenta => ({
    ...PADRAO,
    corpo: i % 2 ? 'm' : 'h',
    pele: (i * 5 + 1) % 6 as Vestimenta['pele'],
    cabelo: CABELOS[(i * 3) % 7],
    corCabelo: (i * 2) % 6 as Vestimenta['corCabelo'],
    camisa: camisas[i % 4],
    numero: i % 7 === 6 ? null : numeros[i % numeros.length],
    cabeca: cabecas[(i >> 1) % 2],
    punho: (['nenhum', 'munhequeira', 'munhequeira_bronze'] as const)[i % 3],
    braco: i % 4 === 2 ? 'bracadeira' : 'nenhum',
    peito: i % 6 === 3 ? 'colete' : i % 9 === 5 ? 'faixa' : 'nenhum',
    pescoco: i % 5 === 4 ? 'apito' : 'nenhum',
    chuteira: (['neutra', 'time', 'dourada'] as const)[i % 3],
    pose: i % 8 === 7 ? 'bracos' : 'parado',
    fundo: FUNDOS[i % FUNDOS.length],
    moldura: i % 4 === 3 ? 'galeria' : i % 4 === 1 ? 'dourada' : 'nenhuma',
  }));
}

// ---------- DOM ----------

const dpr = Math.min(window.devicePixelRatio || 1, 3);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function canvasDoBoneco(v: Vestimenta, cores: readonly [string, string], recorte: Recorte, w: number, h: number): HTMLCanvasElement {
  const canvas = el('canvas', 'cv');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const c = canvas.getContext('2d')!;
  c.scale(dpr, dpr);
  if (recorte === 'corpo') {
    c.save();
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
  }
  desenharBoneco(c, v, cores, recorte, w, h);
  if (recorte === 'corpo') c.restore();
  return canvas;
}

function item(canvas: HTMLElement, rotulo?: string, sub?: string): HTMLElement {
  const d = el('figure', 'item');
  d.append(canvas);
  if (rotulo) d.append(el('figcaption', 'rotulo', rotulo));
  if (sub) d.append(el('figcaption', 'sub', sub));
  return d;
}

function secao(id: string, titulo: string, aviso?: string): HTMLElement | null {
  if (secaoPedida && secaoPedida !== id) return null;
  const s = el('section', 'secao');
  s.id = id;
  s.append(el('h2', undefined, titulo));
  if (aviso) s.append(el('p', 'aviso', aviso));
  return s;
}

function grade(...filhos: HTMLElement[]): HTMLElement {
  const g = el('div', 'grade');
  g.append(...filhos);
  return g;
}

const CADEADO =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="#f4f1e8"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#f4f1e8" stroke-width="2.4"/></svg>';

// ---------- seções ----------

function prancha(): HTMLElement | null {
  const { nome, estado } = ESTADOS[chaveDoEstado];
  const s = secao('prancha', 'Prancha das peças', `Estado: ${nome}. Troque com &estado=novo|meio|tudo.`);
  if (!s) return null;
  let liberadas: Set<string> | null = null;
  try {
    liberadas = new Set(pecasLiberadas(estado));
  } catch {
    s.append(el('p', 'aviso', 'pecasLiberadas ainda não existe: nada trancado.'));
  }
  const condicao = (p: Peca): string => {
    try {
      return textoDaCondicao(p);
    } catch {
      return '(texto a fazer)';
    }
  };
  for (const aba of ABAS) {
    s.append(el('h3', undefined, aba.nome));
    const itens: HTMLElement[] = [];
    if (aba.id === 'corpo') {
      for (const corpo of ['h', 'm'] as const) itens.push(item(canvasDoBoneco(com({ corpo, pele: 2, cabelo: corpo === 'h' ? 'curto' : 'rabo' }), time.cores, 'corpo', 104, 154), `Corpo ${corpo === 'h' ? 'A' : 'B'}`, 'do começo'));
      TONS_DE_PELE.forEach((_, i) => itens.push(item(canvasDoBoneco(com({ pele: i as Vestimenta['pele'] }), time.cores, 'busto', 84, 84), `Pele ${i + 1}`, 'do começo')));
    }
    if (aba.id === 'cabelo') {
      CABELOS.forEach((cabelo) => itens.push(item(canvasDoBoneco(com({ cabelo, corpo: cabelo === 'rabo' || cabelo === 'coque' ? 'm' : 'h' }), time.cores, 'busto', 84, 84), cabelo, 'do começo')));
      CORES_DE_CABELO.forEach((_, i) => itens.push(item(canvasDoBoneco(com({ cabelo: 'comprido', corpo: 'm', corCabelo: i as Vestimenta['corCabelo'], pele: 1 }), time.cores, 'busto', 84, 84), `Cor ${i + 1}`, 'do começo')));
    }
    if (aba.id === 'camisa') {
      for (const n of ['7', '07', '10', '99', '0', '00', null]) itens.push(item(canvasDoBoneco(com({ numero: n }), time.cores, 'busto', 84, 84), n === null ? 'Sem número' : `Número ${n}`, 'do começo'));
    }
    for (const peca of PECAS.filter((p) => p.aba === aba.id)) {
      const trancada = liberadas !== null && !liberadas.has(peca.id);
      let v: Vestimenta = com({ [peca.campo]: peca.valor } as Partial<Vestimenta>);
      if (peca.campo === 'moldura') v = com({ moldura: peca.valor as Vestimenta['moldura'], fundo: 'estadio_noite' });
      const eBusto = peca.campo === 'moldura';
      const cv = eBusto ? canvasDoBoneco(v, time.cores, 'busto', 104, 104) : canvasDoBoneco(v, time.cores, 'corpo', 104, 154);
      const caixa = el('div', trancada ? 'peca trancada' : 'peca');
      caixa.append(cv);
      if (trancada) {
        const c = el('span', 'cadeado');
        c.innerHTML = CADEADO;
        caixa.append(c);
      }
      itens.push(item(caixa, peca.nome, condicao(peca)));
    }
    s.append(grade(...itens));
  }
  return s;
}

function bustos(): HTMLElement | null {
  const s = secao('bustos', 'Peles × cabelos (busto de 84)', 'Cada linha uma pele, cada coluna um cabelo.');
  if (!s) return null;
  const itens: HTMLElement[] = [];
  TONS_DE_PELE.forEach((_, p) =>
    CABELOS.forEach((cabelo, i) => {
      const v = com({ pele: p as Vestimenta['pele'], cabelo, corpo: (p + i) % 2 ? 'm' : 'h', corCabelo: ((p + i) % 6) as Vestimenta['corCabelo'], fundo: FUNDOS[(p * 7 + i) % FUNDOS.length] });
      itens.push(item(canvasDoBoneco(v, time.cores, 'busto', 84, 84), `P${p + 1} · ${cabelo}`));
    }),
  );
  s.append(grade(...itens));
  return s;
}

function tamanhos(): HTMLElement | null {
  const s = secao('tamanhos', 'Tamanhos');
  if (!s) return null;
  const blocos: { id: string; titulo: string; recorte: Recorte; w: number; h: number; n: number }[] = [
    { id: 'b40', titulo: 'Busto 40', recorte: 'busto', w: 40, h: 40, n: 12 },
    { id: 'b52', titulo: 'Busto 52', recorte: 'busto', w: 52, h: 52, n: 12 },
    { id: 'b84', titulo: 'Busto 84', recorte: 'busto', w: 84, h: 84, n: 12 },
    { id: 'b280', titulo: 'Busto 280', recorte: 'busto', w: 280, h: 280, n: 1 },
    { id: 'c76', titulo: 'Corpo 76 × 112', recorte: 'corpo', w: 76, h: 112, n: 8 },
    { id: 'c104', titulo: 'Corpo 104 × 154', recorte: 'corpo', w: 104, h: 154, n: 9 },
    { id: 'c390', titulo: 'Corpo 390 × 404', recorte: 'corpo', w: 390, h: 404, n: 1 },
  ];
  const turma = gente(12);
  for (const b of blocos) {
    if (tamanhoPedido && tamanhoPedido !== b.id) continue;
    s.append(el('h3', undefined, b.titulo));
    const itens = Array.from({ length: b.n }, (_, i) => {
      const v = b.n === 1 ? com({ fundo: b.id === 'b280' ? 'estadio_noite' : 'arquibancada', moldura: b.recorte === 'busto' ? 'dourada' : 'nenhuma', peito: 'nenhum', cabeca: 'testeira', punho: 'munhequeira', chuteira: 'time' }) : turma[i];
      const cores = (b.n === 1 ? time : TIMES[(i * 5 + 3) % TIMES.length]).cores;
      return item(canvasDoBoneco(v, cores, b.recorte, b.w, b.h));
    });
    const g = grade(...itens);
    g.classList.add('livre');
    if (b.w >= 390) g.classList.add('sangrado');
    s.append(g);
  }
  return s;
}

function uniformes(): HTMLElement | null {
  const s = secao('uniformes', 'Uniformes', 'Uniforme 1, uniforme 2 e goleiro, com número.');
  if (!s) return null;
  for (const t of [time, porId('fluminense')]) {
    s.append(el('h3', undefined, t.nome));
    const itens: HTMLElement[] = [];
    for (const [camisa, nome] of [['uni1', 'Uniforme 1'], ['uni2', 'Uniforme 2'], ['goleiro', 'Goleiro']] as const) {
      const v = com({ camisa, numero: '10', pele: 2, chuteira: 'time' });
      itens.push(item(canvasDoBoneco(v, t.cores, 'corpo', 104, 154), nome));
      itens.push(item(canvasDoBoneco(com({ camisa, numero: '7' }), t.cores, 'busto', 84, 84), `${nome} · busto`));
    }
    s.append(grade(...itens));
  }
  return s;
}

function fundos(): HTMLElement | null {
  const s = secao('fundos', 'Os 11 fundos', 'Corpo 104 × 154 e busto 52.');
  if (!s) return null;
  const itens = FUNDOS.map((fundo, i) => {
    const nome = PECAS.find((p) => p.valor === fundo && p.campo === 'fundo')?.nome ?? fundo;
    const v = com({ fundo, pele: (i + 2) % 6 as Vestimenta['pele'] });
    const caixa = el('div', 'duplo');
    caixa.append(canvasDoBoneco(v, time.cores, 'corpo', 104, 154), canvasDoBoneco(v, time.cores, 'busto', 52, 52));
    return item(caixa, nome);
  });
  s.append(grade(...itens));
  return s;
}

function molduras(): HTMLElement | null {
  const s = secao('molduras', 'Molduras do busto');
  if (!s) return null;
  const itens: HTMLElement[] = [];
  for (const m of MOLDURAS) {
    const nome = m === 'nenhuma' ? 'Sem moldura' : m === 'dourada' ? 'Dourada' : 'Galeria';
    itens.push(item(canvasDoBoneco(com({ moldura: m, fundo: 'estadio_noite' }), time.cores, 'busto', 84, 84), nome, '84'));
    itens.push(item(canvasDoBoneco(com({ moldura: m, fundo: 'arquibancada', corpo: 'm', cabelo: 'coque' }), time.cores, 'busto', 52, 52), nome, '52'));
    itens.push(item(canvasDoBoneco(com({ moldura: m, fundo: 'gramado', pele: 1, cabelo: 'crespo' }), time.cores, 'busto', 40, 40), nome, '40'));
  }
  s.append(grade(...itens));
  return s;
}

function times(): HTMLElement | null {
  const s = secao('times', 'Times difíceis', 'Botafogo (preto e branco), Santos (camisa branca) e Palmeiras (verde).');
  if (!s) return null;
  for (const id of ['botafogo', 'santos', 'palmeiras']) {
    const t = porId(id);
    s.append(el('h3', undefined, t.nome));
    const itens: HTMLElement[] = [];
    for (const [camisa, nome] of [['uni1', 'Uniforme 1'], ['uni2', 'Uniforme 2'], ['goleiro', 'Goleiro']] as const) {
      const v = com({ camisa, numero: '9', pele: 1, cabeca: 'testeira', punho: 'munhequeira', chuteira: 'time', fundo: camisa === 'uni1' ? 'arquibancada' : camisa === 'uni2' ? 'telao' : 'papel_picado' });
      itens.push(item(canvasDoBoneco(v, t.cores, 'busto', 52, 52), nome, '52'));
      itens.push(item(canvasDoBoneco(v, t.cores, 'busto', 84, 84), nome, '84'));
      itens.push(item(canvasDoBoneco(v, t.cores, 'corpo', 104, 154), nome, '104 × 154'));
    }
    s.append(grade(...itens));
  }
  return s;
}

const CSS = `
  body { background: #0b0e14; margin: 0; color: #e9e6dc; font: 14px/1.35 'Barlow', system-ui, sans-serif; }
  #app { max-width: 430px; margin: 0 auto; padding: 0; }
  header.topo { padding: 14px 12px 4px; }
  header.topo h1 { font: 400 26px 'Anton', Impact, sans-serif; letter-spacing: .02em; margin: 0 0 4px; }
  header.topo p { margin: 0; color: #9aa1b2; font-size: 12px; }
  .secao { padding: 6px 12px 18px; border-top: 1px solid #1c2230; margin-top: 10px; }
  .secao h2 { font: 400 22px 'Anton', Impact, sans-serif; margin: 10px 0 2px; }
  .secao h3 { font: 700 13px 'Barlow Condensed', sans-serif; text-transform: uppercase; letter-spacing: .08em; color: #ffd23f; margin: 14px 0 6px; }
  .aviso { color: #9aa1b2; font-size: 12px; margin: 0 0 6px; }
  .grade { display: flex; flex-wrap: wrap; gap: 10px 8px; align-items: flex-start; }
  .grade.sangrado { margin: 0 -12px; gap: 6px; }
  .grade:not(.livre) .item { width: 112px; }
  .item { margin: 0; display: flex; flex-direction: column; align-items: center; }
  .item .rotulo { font-size: 11px; font-weight: 700; margin-top: 3px; text-align: center; max-width: 112px; }
  .item .sub { font-size: 10px; color: #8d94a6; text-align: center; max-width: 112px; }
  .cv { display: block; }
  .duplo { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .peca { position: relative; }
  .peca.trancada .cv { opacity: .38; }
  .peca .cadeado { position: absolute; right: 4px; top: 4px; background: #000a; border-radius: 6px; padding: 3px 3px 1px; }
`;

export async function montarVitrine(raiz: HTMLElement): Promise<void> {
  document.title = 'Vitrine do boneco montável';
  const estilo = el('style');
  estilo.textContent = CSS;
  document.head.append(estilo);
  // Os números usam a Anton: espera a fonte antes de desenhar (senão a imagem não vai para o cache).
  await prepararFonteDoNumero();
  raiz.replaceChildren();
  const topo = el('header', 'topo');
  topo.append(el('h1', undefined, 'Vitrine do boneco montável'), el('p', undefined, `Time: ${time.nome}. Seções: prancha, bustos, tamanhos, uniformes, fundos, molduras, times.`));
  raiz.append(topo);
  for (const montar of [prancha, bustos, tamanhos, uniformes, fundos, molduras, times]) {
    const s = montar();
    if (s) raiz.append(s);
  }
  document.documentElement.dataset.pronto = '1';
}
