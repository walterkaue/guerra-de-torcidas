// Cenas fáceis do Aquecimento (docs/jogo.md, 14.4): pênalti, defesa e falta com barreira.
// Puro: o sorteio vem de fora, para o teste ser exato. O aquecimento roda no aparelho, sem valer ponto:
// por isso escolhe, entre as sementes, uma em que o gesto do tutorial dá certo.

import { resolverLance, type CenaLance } from './lances';
import { coluna, planejarDefesa, resolverCobranca, type GestoCobranca } from './penaltis';

/** Procura uma semente que serve; sem achar em `tentativas`, devolve a primeira sorteada. */
export function sementeQueServe(sorteio: () => number, serve: (semente: number) => boolean, tentativas = 300): number {
  const primeira = Math.floor(sorteio() * 0xffffffff);
  if (serve(primeira)) return primeira;
  for (let i = 0; i < tentativas; i++) {
    const s = Math.floor(sorteio() * 0xffffffff);
    if (serve(s)) return s;
  }
  return primeira;
}

// ---------- estação 1: pênalti ----------
/** Chutes de força média e alta em qualquer canto: em todos eles o goleiro da sementeDoPenalti fica longe. */
const CHUTES_DO_PENALTI: GestoCobranca[] = [-60, -30, 0, 30, 60].map((dir) => ({ dir, forca: 70, efeito: 0 }));

/** Dificuldade do aquecimento: a de segunda-feira, a mais fácil. */
export const DIFICULDADE_DO_AQUECIMENTO = 0;
const DIFICULDADE = DIFICULDADE_DO_AQUECIMENTO;

export const sementeDoPenalti = (sorteio: () => number): number =>
  sementeQueServe(sorteio, (s) => CHUTES_DO_PENALTI.every((g) => resolverCobranca(s, 0, g, DIFICULDADE).desfecho === 'gol'));

// ---------- estação 2: defesa ----------
/** Batedor honesto (o pé de apoio aponta o canto certo) e que não isola: quem segue o pé amarelo tem chance. */
export const sementeDaDefesa = (sorteio: () => number): number =>
  sementeQueServe(sorteio, (s) => {
    const p = planejarDefesa(s, 0, DIFICULDADE);
    return !p.erra && p.dica === coluna(p.alvo);
  });


// ---------- estação 3: falta com barreira ----------
/** Falta frontal a 20 m, barreira de 3 no meio e o goleiro encostado na trave esquerda. */
export const CENA_DA_FALTA: CenaLance = {
  tipo: 'falta',
  bola: { x: 0, z: 20 },
  barreira: { jogadores: 3, miraX: 0 },
  goleiroX: -0.6,
  zonaHistorica: 2,
  faixa: 'facil',
};

/** O gesto da mão: chute médio no canto direito, ao lado da barreira. */
export const GESTO_DA_FALTA: GestoCobranca = { dir: 65, forca: 75, efeito: 0 };

export const sementeDaFalta = (sorteio: () => number): number =>
  sementeQueServe(sorteio, (s) => resolverLance(s, 0, CENA_DA_FALTA, GESTO_DA_FALTA).desfecho === 'gol');
