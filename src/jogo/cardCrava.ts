// Cards do Crava a Rodada, gerados no celular: "Meus palpites" (antes, sem porcentagem) e "Resultado da
// rodada" (os acertos, um por jogo), dentro do telão (card.ts). Os dois levam o aviso fixo.

import { AMARELO, FONTE, PLACAR, ROTULO, desenharModelo, modeloDePontos, type Caixa, type DadosBase, type ModeloCard } from './card';
import { resumoDosAcertos } from './cardTextos';
import { ordinalRodada, type Acerto, type PontosDoJogo } from './crava';
import { AVISO_RESENHA, type LinhaMeuPalpite } from './cravaTela';

export type DadosCardCrava =
  | (Omit<DadosBase, 'frase' | 'novoRecorde'> & { tipo: 'meus'; rodada: number; linhas: readonly LinhaMeuPalpite[] })
  | (DadosBase & {
      tipo: 'resultado';
      rodada: number;
      pontos: number;
      /** Um por jogo palpitado, na ordem da rodada. */
      resultados: readonly Pick<PontosDoJogo, 'acerto' | 'certeza'>[];
    });

const COR_DO_ACERTO: Record<Acerto, string> = { exato: AMARELO, saldo: '#2e9d4f', vencedor: '#d9d9d4', errou: '#ff5a3c' };
/** Lista longa: o telão sobe sobre a torcida para os palpites não ficarem miúdos. */
const LINHAS_NO_TELAO_NORMAL = 6;
const TELAO_MAIOR = 140;
/** Cada bolinha da grade de acertos. */
const PASSO_DOS_ACERTOS = 104;

/** Estrela do jogo da certeza, com contorno escuro para aparecer sobre qualquer bolinha. */
function estrela(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const raio = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.lineTo(x + Math.cos(a) * raio, y + Math.sin(a) * raio);
  }
  c.closePath();
  c.strokeStyle = '#070b10';
  c.lineWidth = r * 0.3;
  c.lineJoin = 'round';
  c.stroke();
  c.fillStyle = '#ffd23f';
  c.fill();
}

function palpites(c: CanvasRenderingContext2D, { x, y, l, a }: Caixa, todas: readonly LinhaMeuPalpite[]): void {
  const linhas = todas.slice(0, 10);
  const passo = Math.min(a / linhas.length, 62);
  const tamanho = Math.min(46, Math.round(passo * 0.86));
  const meio = x + l / 2;
  const yInicio = y + (a - passo * linhas.length) / 2 + passo * 0.78;
  c.textBaseline = 'alphabetic';
  c.font = `700 ${tamanho}px ${FONTE}`;
  linhas.forEach((p, i) => {
    const yLinha = yInicio + i * passo;
    c.fillStyle = '#ffffff';
    c.textAlign = 'right';
    c.fillText(p.mandante, meio - 76, yLinha, l / 2 - 76);
    c.textAlign = 'left';
    c.fillText(p.visitante, meio + 76, yLinha, l / 2 - 76 - (p.certeza ? 44 : 0));
    if (p.certeza) estrela(c, Math.min(meio + 76 + c.measureText(p.visitante).width + 30, x + l - 14), yLinha - tamanho * 0.34, tamanho * 0.42);
    c.textAlign = 'center';
    c.fillStyle = AMARELO;
    c.fillText(`${p.placar.m} x ${p.placar.v}`, meio, yLinha);
  });
}

function acertos(c: CanvasRenderingContext2D, { x, y, l, a }: Caixa, resultados: readonly Pick<PontosDoJogo, 'acerto' | 'certeza'>[]): void {
  const validos = resultados.filter((r) => r.acerto !== null);
  const certos = validos.filter((r) => r.acerto !== 'errou').length;
  const porLinha = 5;
  const areaBolinhas = a - 56;
  const passo = Math.min(PASSO_DOS_ACERTOS, areaBolinhas / Math.max(1, Math.ceil(validos.length / porLinha)));
  const raio = passo * 0.4;
  const larguraGrade = PASSO_DOS_ACERTOS * porLinha;
  const yGrade = y + (areaBolinhas - passo * Math.ceil(validos.length / porLinha)) / 2;
  validos.forEach((r, i) => {
    const cx = x + (i % porLinha) * PASSO_DOS_ACERTOS + PASSO_DOS_ACERTOS / 2;
    const cy = yGrade + Math.floor(i / porLinha) * passo + passo / 2;
    c.fillStyle = COR_DO_ACERTO[r.acerto!];
    c.beginPath();
    c.arc(cx, cy, raio, 0, Math.PI * 2);
    c.fill();
    if (r.acerto === 'errou') {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 7;
      c.lineCap = 'round';
      const t = raio * 0.42;
      c.beginPath();
      c.moveTo(cx - t, cy - t);
      c.lineTo(cx + t, cy + t);
      c.moveTo(cx + t, cy - t);
      c.lineTo(cx - t, cy + t);
      c.stroke();
    }
    if (r.certeza) estrela(c, cx + raio * 0.72, cy - raio * 0.72, raio * 0.5);
  });

  c.textBaseline = 'alphabetic';
  c.textAlign = 'center';
  c.fillStyle = '#ffffff';
  c.font = `400 150px ${PLACAR}`;
  c.fillText(`${certos}/${validos.length}`, x + larguraGrade + (l - larguraGrade) / 2, y + areaBolinhas / 2 + 54, l - larguraGrade - 10);
  c.font = `700 36px ${ROTULO}`;
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.fillText(resumoDosAcertos(validos.map((r) => r.acerto!)), x + l / 2, y + a - 6, l);
}

export function desenharCardCrava(d: DadosCardCrava): HTMLCanvasElement {
  const jogo = `Crava a Rodada · ${ordinalRodada(d.rodada)}`;
  const comum = { avisoFixo: AVISO_RESENHA };
  if (d.tipo === 'meus') {
    const n = d.linhas.length;
    const modelo: ModeloCard = {
      ...d,
      ...comum,
      jogo,
      destaque: `${n} ${n === 1 ? 'CRAVADO' : 'CRAVADOS'}`,
      quem: `Meus palpites${d.paraTime ? ` ${d.paraTime}` : ''}`,
      frase: '',
      novoRecorde: false,
      telaoMaior: n > LINHAS_NO_TELAO_NORMAL ? TELAO_MAIOR : 0,
    };
    return desenharModelo(modelo, (c, caixa) => palpites(c, caixa, d.linhas));
  }
  return desenharModelo({ ...modeloDePontos(d, jogo, d.pontos), ...comum }, (c, caixa) => acertos(c, caixa, d.resultados));
}
