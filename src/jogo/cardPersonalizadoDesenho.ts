// Desenho dos cards personalizáveis (docs/jogo.md 14.6, docs/visual.md): recebe os dados e o plano já decidido
// (`planoDoCard`, em cardPersonalizado.ts) e devolve o canvas no tamanho do formato. Só desenha o que o plano manda.
// Telão = o card de hoje (cada jogo desenha o seu conteúdo dentro do telão); Placar seco fica em cardPlacarSeco.ts.

import { horaBrasilia } from '../servidor/tempo';
import {
  GEO_STORIES,
  adesivo,
  blocoDoNumero,
  conteudoPenaltis,
  fundo,
  pilulaDoNivel,
  rodape,
  seloRecorde,
  telao,
  textoDoTopo,
  topoDoTelao,
  viga,
  TELAO_L,
  TELAO_X,
  type Caixa,
  type Geo,
} from './card';
import { conteudoAcertos, conteudoPalpites, telaoMaiorDoCrava } from './cardCrava';
import { conteudoDia } from './cardDia';
import { conteudoLances } from './cardLances';
import { TELAO_MAIOR_DA_MEDALHA, conteudoMedalha } from './cardMedalha';
import type { DadosDoCard, PlanoDoCard } from './cardPersonalizado';
import { desenharCardPlacarSeco } from './cardPlacarSeco';
import { conteudoProva } from './cardProva';
import { luzDoHorario } from './home';

/** O que cada jogo desenha dentro do telão e quanto o telão sobe para caber. */
function conteudoDoTelao(d: DadosDoCard): { maior: number; desenhar: (c: CanvasRenderingContext2D, caixa: Caixa) => void } {
  const k = d.conteudo;
  switch (k.jogo) {
    case 'penaltis':
      return { maior: 0, desenhar: (c, caixa) => conteudoPenaltis(c, caixa, k.golsJogador, k.golsMaquina) };
    case 'lances':
      return { maior: 0, desenhar: (c, caixa) => conteudoLances(c, caixa, k) };
    case 'prova':
      return { maior: 0, desenhar: (c, caixa) => conteudoProva(c, caixa, k.resumo, k.escada) };
    case 'dia':
      return { maior: 0, desenhar: (c, caixa) => conteudoDia(c, caixa, k.placar, k.pistas) };
    case 'crava-meus':
      return { maior: telaoMaiorDoCrava(k.linhas.length), desenhar: (c, caixa) => conteudoPalpites(c, caixa, k.linhas) };
    case 'crava-resultado':
      return { maior: 0, desenhar: (c, caixa) => conteudoAcertos(c, caixa, k.resultados) };
    case 'medalha':
      return { maior: TELAO_MAIOR_DA_MEDALHA, desenhar: (c, caixa) => conteudoMedalha(c, caixa, k.medalha, d.time.cores, k.item) };
  }
}

/**
 * O Quadrado é o Stories compactado: o cenário fica mais baixo e o bloco do telão (moldura e conteúdo) é desenhado na
 * escala do Stories, reduzida, para cada jogo não precisar de outro tamanho de fonte.
 */
const ESCALA_QUADRADO = 0.66;
const GEO_QUADRADO: Geo = { altura: 1080, ceu: 96, altArq: 524, fimMeio: 862, rodape: 884 };
/** Mesmo ponto do cenário do Stories: onde o `ceu` do Stories (216) cai no Quadrado. */
const DESLOCA_QUADRADO = GEO_QUADRADO.ceu - ESCALA_QUADRADO * GEO_STORIES.ceu;

function desenharTelao(d: DadosDoCard, plano: PlanoDoCard, busto: HTMLCanvasElement | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = plano.largura;
  canvas.height = plano.altura;
  const c = canvas.getContext('2d')!;
  const luz = d.luz ?? luzDoHorario(horaBrasilia());
  const quadrado = plano.formato === 'quadrado';
  const geo = quadrado ? GEO_QUADRADO : GEO_STORIES;

  fundo(c, d.time, luz, geo);
  if (quadrado) textoDoTopo(c, plano.topo, luz, 64, 32, 900);
  else textoDoTopo(c, plano.topo, luz);
  viga(c, geo.ceu);

  const { maior, desenhar } = conteudoDoTelao(d);
  const soNome = !plano.telaoComPlacar;
  c.save();
  if (quadrado) {
    // A coluna central do Stories vira a do Quadrado: x' = 540 + s·(x − 540), y' = deslocamento + s·y.
    c.translate(plano.largura / 2, DESLOCA_QUADRADO);
    c.scale(ESCALA_QUADRADO, ESCALA_QUADRADO);
    c.translate(-540, 0);
  }
  const caixa = telao(c, d.time, maior, soNome);
  if (!soNome) {
    c.save();
    desenhar(c, caixa);
    c.restore();
  }
  if (plano.novoRecorde) seloRecorde(c, TELAO_X + TELAO_L - 110, topoDoTelao(maior, soNome) - 26);
  c.restore();

  if (quadrado) {
    blocoDoNumero(c, plano.destaque, plano.quem, 688, 124, 34, busto);
    if (plano.frase) adesivo(c, d.time, plano.frase, busto ? 850 : 800, 26);
    // Com o busto, a pílula e o rodapé descem um pouco para não encostar no adesivo.
    if (plano.nivel) pilulaDoNivel(c, plano.nivel, busto ? 910 : geo.rodape, 30);
    rodape(c, plano.link, plano.avisoFixo, busto ? 968 : 948, 0.8);
  } else {
    blocoDoNumero(c, plano.destaque, plano.quem, 1178, 212, 54, busto);
    if (plano.frase) adesivo(c, d.time, plano.frase, busto ? 1462 : 1395);
    if (plano.nivel) pilulaDoNivel(c, plano.nivel, geo.rodape);
    rodape(c, plano.link, plano.avisoFixo);
  }
  return canvas;
}

/**
 * Lado do canvas do busto: 200 px no Stories (52 px na tela), proporcional no Quadrado. O Telão desenha no tamanho do
 * canvas; o Placar seco reduz até caber, então recebe o maior lado que usa (130 no Quadrado), para não esticar.
 */
const LADO_DO_BUSTO = { telao: { stories: 200, quadrado: 104 }, placar: { stories: 200, quadrado: 130 } };

/**
 * O busto (círculo com fundo e moldura) num canvas quadrado, ou null sem busto no plano. O boneco só carrega aqui; se o
 * pedaço do boneco não baixar, o card sai sem o busto.
 */
async function bustoDoCard(d: DadosDoCard, plano: PlanoDoCard): Promise<HTMLCanvasElement | null> {
  const v = plano.busto;
  if (!v) return null;
  try {
    const { desenharBoneco, numeroVisivel, prepararFonteDoNumero } = await import('../telas/bonecoMontavel');
    if (numeroVisivel(v) !== null) await prepararFonteDoNumero();
    const lado = LADO_DO_BUSTO[plano.estilo === 'telao' ? 'telao' : 'placar'][plano.formato];
    const canvas = document.createElement('canvas');
    canvas.width = lado;
    canvas.height = lado;
    desenharBoneco(canvas.getContext('2d')!, v, d.time.cores, 'busto', lado, lado);
    return canvas;
  } catch {
    return null;
  }
}

/** Assíncrono porque o Pôster e o busto do boneco carregam por `import()` só quando entram no card. */
export async function desenharCardPersonalizado(d: DadosDoCard, plano: PlanoDoCard): Promise<HTMLCanvasElement> {
  if (plano.poster) {
    const { desenharCardPoster } = await import('./cardPoster');
    return desenharCardPoster(d, plano);
  }
  const busto = await bustoDoCard(d, plano);
  return plano.estilo === 'telao' ? desenharTelao(d, plano, busto) : desenharCardPlacarSeco(d, plano, busto);
}
