// Contas da proposta docs/propostas/lances-unificados.md (Lances do Jogo unificados, seção 14.7 do jogo.md).
// Só leitura: não muda pontuação, banco nem telas. Simula tabelas novas sobre as partidas já jogadas
// (reprodução exata) e sobre modelos (motor determinístico + robô de calibragem).
// O jogo de verdade fica em src/jogo/penaltis.ts e src/jogo/lances.ts.

import { criarAleatorio, misturar } from '../../src/jogo/aleatorio.ts';
import { ERRO_DE_MAO, resolverLance } from '../../src/jogo/lances.ts';

// ---------- estatística ----------
/** Quantil interpolado de uma lista (como o `npm run balanco`). */
export function quantil(valores, p) {
  const s = [...valores].sort((a, b) => a - b);
  if (!s.length) return null;
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

/** Quantil de uma distribuição [[valor, prob], …]: o menor valor que cobre a fração. */
export function quantilDist(dist, f) {
  const s = [...dist].sort((a, b) => a[0] - b[0]);
  let acc = 0;
  for (const [v, p] of s) {
    acc += p;
    if (acc >= f - 1e-12) return v;
  }
  return s[s.length - 1][0];
}

export function resumoLista(valores, teto = 150) {
  const n = valores.length;
  const media = valores.reduce((a, b) => a + b, 0) / n;
  return {
    n,
    q25: quantil(valores, 0.25),
    mediana: quantil(valores, 0.5),
    q75: quantil(valores, 0.75),
    q90: quantil(valores, 0.9),
    media,
    max: Math.max(...valores),
    teto: valores.filter((v) => v >= teto).length / n,
  };
}

export function resumoDist(dist, teto = 150) {
  return {
    q25: quantilDist(dist, 0.25),
    mediana: quantilDist(dist, 0.5),
    q75: quantilDist(dist, 0.75),
    q90: quantilDist(dist, 0.9),
    media: dist.reduce((s, [v, p]) => s + v * p, 0),
    max: Math.max(...dist.filter(([, p]) => p > 0).map(([v]) => v)),
    teto: dist.filter(([v]) => v >= teto).reduce((s, [, p]) => s + p, 0),
  };
}

/** Junta valores iguais de uma distribuição. */
export function compactar(dist) {
  const m = new Map();
  for (const [v, p] of dist) m.set(v, (m.get(v) ?? 0) + p);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

/** Mistura de distribuições com pesos iguais. */
export const misturarDists = (dists) => compactar(dists.flatMap((d) => d.map(([v, p]) => [v, p / dists.length])));

// ---------- pênaltis ----------
/** Tabela de hoje (src/jogo/penaltis.ts, PONTOS). */
export const PEN_HOJE = { id: 'hoje', nome: 'Hoje', gol: 10, angulo: 5, cavadinha: 10, defesa: 10, vitoria: 20, cinco: 25 };

/**
 * O maior total possível com uma tabela. Dois caminhos disputam o máximo:
 * - tempo normal perfeito: 5 gols com cavadinha, 5 defesas, vitória e os dois 5 de 5;
 * - empate em 5 x 5 (5 de 5 nas cobranças) e mais 3 rodadas de morte súbita, a última com gol e defesa:
 *   8 gols com cavadinha, 1 defesa, 1 bônus de 5 de 5 e vitória.
 * (O par ou ímpar depois de 8 x 8 dá 8 gols e nenhuma defesa: menos que o segundo caminho.)
 */
export function tetoPenaltis(t) {
  const golMax = t.gol + Math.max(t.angulo, t.cavadinha);
  const normal = 5 * golMax + 5 * t.defesa + t.vitoria + 2 * t.cinco;
  const morteSubita = 8 * golMax + t.defesa + t.cinco + t.vitoria;
  return Math.max(normal, morteSubita);
}

/**
 * Pontos de uma partida jogada (retrato do banco) com outra tabela. Exato: a tabela só muda o valor de cada
 * evento, e a ordem da disputa (morte súbita, par ou ímpar) não depende dela.
 */
export function pontosPenaltisJogada(p, t) {
  const gols = p.cob.filter((c) => c[0] === 'gol');
  const angulos = gols.filter((c) => c[1]).length;
  const cavadinhas = gols.filter((c) => c[2]).length;
  // Defesa que vale ponto: no desafio, defender chute gravado fraco não rende (pt.defesas já desconta).
  const defesas = p.pt.defesas / PEN_HOJE.defesa;
  const cincoCob = p.cob.slice(0, 5).every((c) => c[0] === 'gol');
  const cincoDef = p.pt.cincoDeCinco - (cincoCob ? PEN_HOJE.cinco : 0) > 0;
  return (
    gols.length * t.gol +
    angulos * t.angulo +
    cavadinhas * t.cavadinha +
    defesas * t.defesa +
    (p.venceu ? t.vitoria : 0) +
    ((cincoCob ? 1 : 0) + (cincoDef ? 1 : 0)) * t.cinco
  );
}

/** Taxas de uma pessoa: gol por cobrança, ângulo e cavadinha entre os gols, defesa e "fora" da máquina por defesa. */
export function taxasPenaltis(partidas) {
  let cob = 0, gol = 0, ang = 0, cav = 0, def = 0, defT = 0, fora = 0;
  for (const p of partidas) {
    for (const c of p.cob) {
      cob++;
      if (c[0] === 'gol') {
        gol++;
        if (c[1]) ang++;
        if (c[2]) cav++;
      }
    }
    for (const d of p.def) {
      defT++;
      if (d === 'defesa') def++;
      if (d === 'fora') fora++;
    }
  }
  return { gol: gol / cob, angulo: ang / gol, cavadinha: cav / gol, defesa: def / defT, fora: fora / defT };
}

/**
 * Modelo da disputa inteira (com morte súbita e par ou ímpar), por sorteio. Cada cobrança e cada defesa
 * segue a taxa da pessoa; a ordem é a de `simularPartida` (src/jogo/penaltis.ts).
 * Devolve a distribuição dos pontos e, à parte, gols por partida e chance de vitória (para as medalhas).
 */
export function modeloPenaltis(taxas, t, n = 200_000, semente = 0x9e1) {
  const rnd = criarAleatorio(semente);
  const contagem = new Map();
  let somaGols = 0, vitorias = 0;
  const golsDist = new Map();
  for (let k = 0; k < n; k++) {
    let gj = 0, gm = 0, pts = 0, cincoCob = 0, cincoDef = 0, rodada = 0;
    const jogarRodada = () => {
      if (rnd() < taxas.gol) {
        gj++;
        pts += t.gol;
        const r = rnd();
        if (r < taxas.angulo) pts += t.angulo;
        else if (r < taxas.angulo + taxas.cavadinha) pts += t.cavadinha;
        if (rodada < 5) cincoCob++;
      }
      const r = rnd();
      if (r < taxas.defesa) {
        pts += t.defesa;
        if (rodada < 5) cincoDef++;
      } else if (r >= taxas.defesa + taxas.fora) gm++;
      rodada++;
    };
    for (let i = 0; i < 5; i++) jogarRodada();
    while (gj === gm && rodada < 8) jogarRodada();
    const venceu = gj === gm ? rnd() < 0.5 : gj > gm;
    if (venceu) {
      pts += t.vitoria;
      vitorias++;
    }
    if (cincoCob === 5) pts += t.cinco;
    if (cincoDef === 5) pts += t.cinco;
    contagem.set(pts, (contagem.get(pts) ?? 0) + 1);
    somaGols += gj;
    golsDist.set(gj, (golsDist.get(gj) ?? 0) + 1);
  }
  const dist = [...contagem.entries()].map(([v, c]) => [v, c / n]).sort((a, b) => a[0] - b[0]);
  return {
    dist,
    golsPorPartida: somaGols / n,
    golsDist: [...golsDist.entries()].map(([v, c]) => [v, c / n]),
    vitoria: vitorias / n,
  };
}

// ---------- faltas e cara a cara ----------
/** Hoje: gol por faixa e bônus de recriar (src/jogo/lances.ts, PONTOS_FAIXA e BONUS_RECRIOU). */
export const LANCES_HOJE = { id: 'hoje', nome: 'Hoje (por lance)', facil: 10, media: 18, dificil: 26, craque: 34, recriou: 6 };

export const tetoLances = (t, tentativas = 3) => tentativas * (Math.max(t.facil, t.media, t.dificil, t.craque) + t.recriou);

/** Pontos de uma partida jogada (3 lances do retrato) com outra tabela. Exato por tentativa. */
export function pontosLancesJogada(p, t) {
  return p.l.reduce((s, [, faixa, desfecho, recriou]) => s + (desfecho === 'gol' ? t[faixa] + (recriou ? t.recriou : 0) : 0), 0);
}

const PASSO = { dir: 5, forca: 4, efeito: 20 };
const EIXO_DIR = Array.from({ length: 41 }, (_, k) => -100 + k * PASSO.dir);
const EIXO_FORCA = Array.from({ length: 26 }, (_, k) => k * PASSO.forca);
const EIXO_EFEITO = Array.from({ length: 11 }, (_, k) => -100 + k * PASSO.efeito);

function pesos(sigma) {
  const p = [-2, -1, 0, 1, 2].map((k) => Math.exp(-(k * k) / (2 * sigma * sigma)));
  const soma = p.reduce((a, b) => a + b, 0);
  return p.map((v) => v / soma);
}

function espalhar(bruto) {
  const nD = EIXO_DIR.length, nF = EIXO_FORCA.length, nE = EIXO_EFEITO.length;
  const idx = (a, b, c) => (a * nF + b) * nE + c;
  const kernels = [pesos(ERRO_DE_MAO.dir / PASSO.dir), pesos(ERRO_DE_MAO.forca / PASSO.forca), pesos(ERRO_DE_MAO.efeito / PASSO.efeito)];
  const dims = [nD, nF, nE];
  let atual = bruto;
  for (let eixo = 0; eixo < 3; eixo++) {
    const novo = new Float64Array(atual.length);
    for (let a = 0; a < nD; a++)
      for (let b = 0; b < nF; b++)
        for (let c = 0; c < nE; c++) {
          const pos = [a, b, c];
          let v = 0;
          for (let k = -2; k <= 2; k++) {
            const q = pos[eixo] + k;
            if (q < 0 || q >= dims[eixo]) continue;
            const p2 = [...pos];
            p2[eixo] = q;
            v += kernels[eixo][k + 2] * atual[idx(p2[0], p2[1], p2[2])];
          }
          novo[idx(a, b, c)] = v;
        }
    atual = novo;
  }
  return atual;
}

/**
 * Robô de calibragem com duas miras, como `calibrar` (src/jogo/lances.ts), mas contando também o "recriou":
 * - mira no gol: o gesto com a maior chance de gol (o mesmo de `calibrar`);
 * - mira na zona histórica: o gesto com a maior chance de recriar o lance.
 * Para cada mira, mede de novo com sementes e erros de mão que a busca não viu.
 */
export function roboDoLance(cena, sementes = 16, tentativas = 1000) {
  const nF = EIXO_FORCA.length, nE = EIXO_EFEITO.length;
  const total = EIXO_DIR.length * nF * nE;
  const gol = new Float64Array(total);
  const rec = new Float64Array(total);
  for (let a = 0; a < EIXO_DIR.length; a++)
    for (let b = 0; b < nF; b++)
      for (let c = 0; c < nE; c++) {
        let g = 0, r = 0;
        for (let s = 0; s < sementes; s++) {
          const x = resolverLance(misturar(0xca1, s), 0, cena, { dir: EIXO_DIR[a], forca: EIXO_FORCA[b], efeito: EIXO_EFEITO[c] });
          if (x.desfecho === 'gol') g++;
          if (x.recriou) r++;
        }
        const i = (a * nF + b) * nE + c;
        gol[i] = g / sementes;
        rec[i] = r / sementes;
      }
  const gEsp = espalhar(gol);
  const rEsp = espalhar(rec);
  const gesto = (i) => ({ dir: EIXO_DIR[Math.floor(i / (nE * nF))], forca: EIXO_FORCA[Math.floor(i / nE) % nF], efeito: EIXO_EFEITO[i % nE] });
  const argmax = (arr) => {
    let m = 0;
    for (let i = 1; i < arr.length; i++) if (arr[i] > arr[m]) m = i;
    return m;
  };
  const medir = (mira) => {
    const rnd = criarAleatorio(0x5e7);
    const normal = () => (rnd() + rnd() + rnd() + rnd() - 2) * Math.sqrt(3);
    let g = 0, r = 0;
    for (let k = 0; k < tentativas; k++) {
      const x = resolverLance(misturar(0x7e5, k), 0, cena, {
        dir: mira.dir + normal() * ERRO_DE_MAO.dir,
        forca: mira.forca + normal() * ERRO_DE_MAO.forca,
        efeito: mira.efeito + normal() * ERRO_DE_MAO.efeito,
      });
      if (x.desfecho === 'gol') g++;
      if (x.recriou) r++;
    }
    return { gol: g / tentativas, recriou: r / tentativas, mira };
  };
  return { noGol: medir(gesto(argmax(gEsp))), naZona: medir(gesto(argmax(rEsp))) };
}

/**
 * Distribuição exata dos pontos de 3 tentativas iguais de um lance: cada uma é recriou (gol na zona),
 * gol fora da zona ou nada.
 */
export function distTresTentativas(pGol, pRec, valorGol, bonus, tentativas = 3) {
  const saidas = [
    [valorGol + bonus, pRec],
    [valorGol, Math.max(0, pGol - pRec)],
    [0, Math.max(0, 1 - pGol)],
  ];
  let dist = [[0, 1]];
  for (let k = 0; k < tentativas; k++) dist = compactar(dist.flatMap(([v, p]) => saidas.map(([s, q]) => [v + s, p * q])));
  return dist;
}

/** A mira que dá mais pontos esperados com a tabela (a pessoa escolhe mirar no gol ou na zona). */
export function melhorMira(robo, valorGol, bonus) {
  const e = (m) => m.gol * valorGol + m.recriou * bonus;
  return e(robo.naZona) > e(robo.noGol) ? robo.naZona : robo.noGol;
}

// ---------- melhor-de-N ----------
/** Soma das k maiores entre n partidas tiradas da distribuição (por sorteio). */
export function melhoresDoDia(dist, n, k, amostras = 20_000, semente = 0xd1a) {
  const rnd = criarAleatorio(semente);
  const acum = [];
  let a = 0;
  for (const [v, p] of dist) {
    a += p;
    acum.push([a, v]);
  }
  const tirar = () => {
    const r = rnd() * a;
    for (const [lim, v] of acum) if (r < lim) return v;
    return acum[acum.length - 1][1];
  };
  const somas = [];
  for (let s = 0; s < amostras; s++) {
    const x = Array.from({ length: n }, tirar).sort((p, q) => q - p);
    somas.push(x.slice(0, k).reduce((p, q) => p + q, 0));
  }
  return somas.reduce((p, q) => p + q, 0) / amostras;
}

/** Partidas até a medalha (mediana, por sorteio): gols por partida em `golsDist`, e outra condição opcional. */
export function partidasAteMedalha(golsDist, gols, extra = null, amostras = 20_000, semente = 0x3ed) {
  const rnd = criarAleatorio(semente);
  const tirar = (dist) => {
    const r = rnd();
    let a = 0;
    for (const [v, p] of dist) {
      a += p;
      if (r < a) return v;
    }
    return dist[dist.length - 1][0];
  };
  const ns = [];
  for (let s = 0; s < amostras; s++) {
    let g = 0, e = 0, n = 0;
    while (g < gols || (extra && e < extra.meta)) {
      n++;
      const x = tirar(golsDist);
      g += x;
      if (extra) e += extra.porPartida(x, rnd);
      if (n > 5000) break;
    }
    ns.push(n);
  }
  return quantil(ns, 0.5);
}
