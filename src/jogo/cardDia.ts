// Card do Time do Dia, gerado no celular: a grade de bolinhas de pista dentro do telão (card.ts).
// Nunca mostra o nome de nenhum clube (nada de spoiler para o grupo).

import { APAGADO, PLACAR, ROTULO, desenharModelo, modeloDePontos, type DadosBase } from './card';
import { NOMES_PISTAS, TENTATIVAS, type Pistas, type Tom } from './timeDoDia';

export interface DadosCardDia extends DadosBase {
  numero: number;
  /** "4/6" ou "X/6" */
  placar: string;
  /** Uma linha por tentativa: só os tons, nunca o clube chutado. */
  pistas: readonly Pistas[];
  pontos: number;
}

/** As cores das células do Time do Dia (estilos/timeDoDia.css). */
const COR_DA_PISTA: Record<Tom, string> = { certo: '#2e9d4f', perto: '#e3b416', longe: '#d9d9d4' };

export function desenharCardDia(d: DadosCardDia): HTMLCanvasElement {
  return desenharModelo(modeloDePontos(d, `Time do Dia #${d.numero}`, d.pontos), (c, { x, y, l, a }) => {
    const passo = Math.min((a - 4) / TENTATIVAS, 60);
    const raio = passo * 0.42;
    const larguraGrade = passo * NOMES_PISTAS.length;
    const xGrade = x + 20;
    const yGrade = y + (a - passo * TENTATIVAS) / 2;
    for (let linha = 0; linha < TENTATIVAS; linha++) {
      NOMES_PISTAS.forEach((nome, coluna) => {
        const pista = d.pistas[linha]?.[nome];
        c.fillStyle = pista ? COR_DA_PISTA[pista.tom] : APAGADO;
        c.beginPath();
        c.arc(xGrade + coluna * passo + passo / 2, yGrade + linha * passo + passo / 2, raio, 0, Math.PI * 2);
        c.fill();
      });
    }

    const meio = xGrade + larguraGrade + (l - 20 - larguraGrade) / 2;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'center';
    c.fillStyle = '#ffffff';
    c.font = `400 170px ${PLACAR}`;
    c.fillText(d.placar, meio, y + a / 2 + 42, l - larguraGrade - 50);
    c.font = `700 38px ${ROTULO}`;
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillText('CHUTES', meio, y + a / 2 + 102);
  });
}
