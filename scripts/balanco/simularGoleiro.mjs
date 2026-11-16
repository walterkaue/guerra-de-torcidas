// Contas da calibragem do goleiro com alcance (motor 2) contra o goleiro de 6 zonas (motor 1), nas cobranças reais.
// Puro: recebe as partidas (dificuldade e gestos) e devolve as tabelas. Quem lê o banco é simular-goleiro.mjs.

import { criarAleatorio, misturar } from '../../src/jogo/aleatorio.ts';
import {
  PONTOS_GOLEIRO,
  PONTOS_UNIFICADOS,
  cavadinhasAntes,
  desfechoDoGoleiro,
  faixaDoGol,
  resolverCobranca,
  resolverCobrancaGoleiro,
  sortearGoleiro,
} from '../../src/jogo/penaltis.ts';

export const DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
/** Linhas da tabela por colocação: as 4 faixas, a cavadinha e o que não foi no gol. */
export const FAIXAS = ['meio', 'colocado', 'canto', 'angulo', 'cavadinha', 'fora'];

const vazio = () => ({ n: 0, gols1: 0, gols2: 0, pts1: 0, pts2: 0 });

/** Uma partida guardada: dificuldade do dia em que foi jogada e os gestos das cobranças, na ordem. */
// { dificuldade: number, cobrancas: { dir, forca, efeito }[] }

/** Lista plana das cobranças, cada uma com o índice na partida e quantas cavadinhas vieram antes dela. */
export function cobrancasDasPartidas(partidas) {
  const lista = [];
  for (const p of partidas) {
    const gestos = p.cobrancas ?? [];
    gestos.forEach((g, i) => lista.push({ i, gesto: g, dificuldade: Number(p.dificuldade), antes: cavadinhasAntes(gestos, i) }));
  }
  return lista;
}

/**
 * Joga cada cobrança `amostras` vezes nos dois motores, com as mesmas sementes. `dias`: 'iguais' joga cada uma nos 7
 * dias (dificuldade 0 a 1); 'real' usa a dificuldade da partida. Devolve o total, a curva por dia e as faixas.
 */
export function simular(cobrancas, { amostras = 400, dias = 'iguais' } = {}) {
  const total = vazio();
  const porDia = DIAS.map(vazio);
  const porFaixa = Object.fromEntries(FAIXAS.map((f) => [f, vazio()]));
  cobrancas.forEach((c, k) => {
    const dificuldades = dias === 'iguais' ? DIAS.map((_, d) => d / 6) : [c.dificuldade];
    for (const d of dificuldades) {
      const dia = Math.round(d * 6);
      for (let a = 0; a < amostras; a++) {
        const semente = misturar(0x5eed, k, a, dia);
        const r1 = resolverCobranca(semente, c.i, c.gesto, d, PONTOS_UNIFICADOS);
        const r2 = resolverCobrancaGoleiro(semente, c.i, c.gesto, d, PONTOS_GOLEIRO, c.antes);
        // A colocação é a da bola (o tremor é o mesmo nos dois motores, com a mesma semente).
        const faixa = r2.cavadinha ? 'cavadinha' : r2.faixa ?? 'fora';
        for (const alvo of [total, porDia[dia], porFaixa[faixa]]) {
          alvo.n++;
          if (r1.desfecho === 'gol') alvo.gols1++;
          if (r2.desfecho === 'gol') alvo.gols2++;
          alvo.pts1 += r1.pontos;
          alvo.pts2 += r2.pontos;
        }
      }
    }
  });
  return { total, porDia, porFaixa };
}

/** Pontos de conferência do motor 2: bola exata, sem tremor, chance de gol por Monte Carlo nos sorteios. */
export const CONFERENCIA = [
  { nome: 'meio à meia altura', bola: { x: 0, y: 0.5 }, alvo: 72 },
  { nome: 'colocado', bola: { x: 0.6, y: 0.5 }, alvo: 66 },
  { nome: 'no canto', bola: { x: 0.8, y: 0.5 }, alvo: 71 },
  { nome: 'rente à trave', bola: { x: 0.95, y: 0.5 }, alvo: 85 },
  { nome: 'rasteiro no canto', bola: { x: 0.8, y: 0.07 }, alvo: 84 },
  { nome: 'ângulo', bola: { x: 0.9, y: 0.9 }, alvo: 85 },
  { nome: 'bola fraca no canto', bola: { x: 0.9, y: 0.05, fraca: true }, alvo: 42 },
  { nome: '1ª cavadinha da partida', bola: { x: 0, y: 0.8, cavadinha: true }, antes: 0, alvo: 61 },
  { nome: '2ª cavadinha', bola: { x: 0, y: 0.8, cavadinha: true }, antes: 1, alvo: 42 },
  { nome: '3ª cavadinha', bola: { x: 0, y: 0.8, cavadinha: true }, antes: 2, alvo: 23 },
  { nome: '4ª cavadinha', bola: { x: 0, y: 0.8, cavadinha: true }, antes: 3, alvo: 4 },
];

/** Chance de gol (0 a 100) de uma bola exata contra o motor 2, na dificuldade dada. */
export function chanceDeGol({ bola, antes = 0 }, { amostras = 200_000, dificuldade = 0.5, sal = 1 } = {}) {
  const rnd = criarAleatorio(misturar(0xc0f, sal));
  const b = { x: bola.x, y: bola.y, cavadinha: !!bola.cavadinha, fraca: !!bola.fraca };
  let gols = 0;
  for (let a = 0; a < amostras; a++) if (desfechoDoGoleiro(b, sortearGoleiro(rnd), dificuldade, PONTOS_GOLEIRO, antes).desfecho === 'gol') gols++;
  return (100 * gols) / amostras;
}

/** "Colocado" ou "No canto" etc., com a faixa onde a bola cai (para conferir os pontos de conferência). */
export const faixaDaBola = (bola) => (bola.cavadinha ? 'cavadinha' : faixaDoGol(bola.x, bola.y, false));

// ---------- texto ----------
const pct = (a, n) => (n ? `${((100 * a) / n).toFixed(1)}%` : '—');
const med = (a, n) => (n ? (a / n).toFixed(2) : '—');

export function tabelaDoTotal(r, titulo) {
  const { total: t } = r;
  return [
    `### ${titulo}`,
    '',
    '| | Motor 1 (6 zonas) | Motor 2 (alcance) |',
    '|---|---|---|',
    `| Gols | ${pct(t.gols1, t.n)} | ${pct(t.gols2, t.n)} |`,
    `| Pontos por cobrança | ${med(t.pts1, t.n)} | ${med(t.pts2, t.n)} |`,
    '',
    '| Dia | Gols M1 | Gols M2 | Pontos M1 | Pontos M2 |',
    '|---|---|---|---|---|',
    ...r.porDia.filter((d) => d.n).map((d) => `| ${DIAS[r.porDia.indexOf(d)]} | ${pct(d.gols1, d.n)} | ${pct(d.gols2, d.n)} | ${med(d.pts1, d.n)} | ${med(d.pts2, d.n)} |`),
    '',
    '| Colocação | Cobranças | Gols M1 | Gols M2 | Pontos M1 | Pontos M2 |',
    '|---|---|---|---|---|---|',
    ...FAIXAS.map((f) => {
      const x = r.porFaixa[f];
      return `| ${f} | ${pct(x.n, t.n)} | ${pct(x.gols1, x.n)} | ${pct(x.gols2, x.n)} | ${med(x.pts1, x.n)} | ${med(x.pts2, x.n)} |`;
    }),
  ].join('\n');
}

/** Igualdade campo a campo (o banco guarda o jsonb com as chaves em outra ordem). */
export function igual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => igual(a[k], b[k]));
}
