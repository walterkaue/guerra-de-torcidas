// Calibragem da Prova de Boleiro (docs/propostas/calibragem-prova.md): as contas, sem banco.
// Puro e testado. Não muda a pontuação do jogo: simula regras alternativas sobre as partidas já
// jogadas (reprodução) e sobre uma taxa de acerto por degrau (modelo exato, sem sorteio).
// O jogo de verdade fica em src/jogo/prova.ts.

import { FAIXA } from './estatisticas.mjs';

export const PERGUNTAS = 8;
/** Degrau de cada posição da escada (src/jogo/prova.ts): 2 fáceis, 2 médias, 2 difíceis, 2 de craque. */
export const DEGRAU_DA_POSICAO = [1, 1, 2, 2, 3, 3, 4, 4];
export const TETO_PARTIDA = 150;

/**
 * Uma regra = quantos erros encerram a partida, que fração do acumulado a pessoa leva ao errar
 * (arredondada para cima), os pontos por posição e o bônus de 8 de 8 sem nenhum erro.
 */
export const REGRA_ATUAL = {
  id: 'hoje',
  nome: 'Hoje',
  erros: 1,
  fracao: 0.5,
  tabela: [8, 8, 12, 12, 18, 18, 25, 25],
  bonus: 24,
};

/** As três opções para o Kauê. Tabela e bônus ficam como estão: com eles o teto continua 150. */
export const OPCOES = [
  { ...REGRA_ATUAL, id: 'A', nome: 'A · Segunda chance', erros: 2, fracao: 0.75 },
  { ...REGRA_ATUAL, id: 'B', nome: 'B · Três erros e fora', erros: 3, fracao: 0.75 },
  { ...REGRA_ATUAL, id: 'C', nome: 'C · Prova inteira', erros: PERGUNTAS, fracao: 1 },
];

/** Próxima alavanca se B ficar abaixo do alvo: mais um erro tolerado. Aparece no relatório, mas não é uma das opções. */
export const PROXIMA_ALAVANCA = { ...REGRA_ATUAL, id: 'B+', nome: "B′ · Quatro erros e fora (alavanca)", erros: 4, fracao: 0.75 };

/** Contraste: só a tabela (dobrada, com o bônus). Estoura o teto de 150; serve para mostrar que a tabela não é a causa. */
export const TABELA_DOBRADA = {
  ...REGRA_ATUAL,
  id: 'T',
  nome: 'Só a tabela ×2',
  tabela: REGRA_ATUAL.tabela.map((v) => v * 2),
  bonus: REGRA_ATUAL.bonus * 2,
};

/**
 * Taxa de acerto por degrau (fácil, média, difícil, craque). "Hoje" usa o observado nas
 * duas primeiras faixas; difícil e craque têm 5 e 2 respostas, então vêm de suposição (marcado).
 */
export const CENARIOS = [
  { id: 'hoje', nome: 'Banco de hoje', porDegrau: [0.61, 0.55, 0.5, 0.35], nota: 'fácil e média observados; difícil e craque supostos (5 e 2 respostas)' },
  { id: 'banco', nome: 'Banco recalibrado', porDegrau: [0.75, 0.65, 0.5, 0.35], nota: 'fácil no mínimo de 75% do jogo.md; resto suposto' },
  { id: 'otimista', nome: 'Pessoa que manda bem', porDegrau: [0.85, 0.8, 0.6, 0.45], nota: 'o que o jogo.md imaginava ao dizer "chega à 5ª"' },
];

export const taxasPorPosicao = (porDegrau) => DEGRAU_DA_POSICAO.map((d) => porDegrau[d - 1]);

// ---------------------------------------------------------------------------
// Reprodução das partidas já jogadas
// ---------------------------------------------------------------------------

/**
 * Pontos de uma partida já jogada sob outra regra. Exata para `erros: 1` (a partida jogada acaba
 * no primeiro erro, como a regra). Para `erros` maiores é um PISO: a partida jogada parou no
 * primeiro erro e não sabemos o que viria depois, então conta só até ali.
 * `passos`: [{ desfecho: 'acertou' | 'errou' | 'tempo' }] na ordem. Sem erro e com menos de 8 = parou.
 */
export function pontosDaPartidaJogada(passos, regra) {
  let base = 0;
  let errou = false;
  passos.forEach((p, i) => {
    if (p.desfecho === 'acertou') base += regra.tabela[i];
    else errou = true;
  });
  if (errou) return Math.ceil(regra.fracao * base);
  return passos.length >= PERGUNTAS ? base + regra.bonus : base;
}

// ---------------------------------------------------------------------------
// Modelo exato: a distribuição dos pontos com taxa de acerto `p` por posição
// ---------------------------------------------------------------------------

/**
 * Distribuição exata dos pontos de uma partida. `p`: probabilidade de acerto de cada posição.
 * `paraEm`: a pessoa para ao ter essa quantidade de acertos seguidos (null = nunca para; hoje só
 * 1 de 12 partidas que chegaram à decisão parou).
 * Devolve [[pontos, probabilidade]] crescente. Erro que não encerra a partida vale 0 naquela pergunta.
 */
export function distribuicaoDePontos(p, regra, { paraEm = null } = {}) {
  const soma = (mapa, chave, v) => mapa.set(chave, (mapa.get(chave) ?? 0) + v);
  const saida = new Map();
  let estado = new Map([['0|0', 1]]); // "erros|base" -> probabilidade
  for (let pos = 0; pos < PERGUNTAS; pos++) {
    const proximo = new Map();
    for (const [chave, pr] of estado) {
      const [erros, base] = chave.split('|').map(Number);
      if (paraEm !== null && pos === paraEm && erros === 0) {
        soma(saida, base, pr);
        continue;
      }
      soma(proximo, `${erros}|${base + regra.tabela[pos]}`, pr * p[pos]);
      if (erros + 1 >= regra.erros) soma(saida, Math.ceil(regra.fracao * base), pr * (1 - p[pos]));
      else soma(proximo, `${erros + 1}|${base}`, pr * (1 - p[pos]));
    }
    estado = proximo;
  }
  for (const [chave, pr] of estado) {
    const [erros, base] = chave.split('|').map(Number);
    soma(saida, base + (erros === 0 ? regra.bonus : 0), pr);
  }
  return [...saida].filter(([, pr]) => pr > 0).sort((a, b) => a[0] - b[0]);
}

/**
 * Quantas perguntas a pessoa responde em média: soma, posição por posição, da chance de a
 * partida ainda estar viva. Mesmo `paraEm` de distribuicaoDePontos (null = nunca para).
 */
export function perguntasEsperadas(p, regra, { paraEm = null } = {}) {
  let vivos = new Map([[0, 1]]); // erros -> probabilidade
  let total = 0;
  for (let pos = 0; pos < PERGUNTAS; pos++) {
    const proximo = new Map();
    for (const [erros, pr] of vivos) {
      if (paraEm !== null && pos === paraEm && erros === 0) continue;
      total += pr;
      proximo.set(erros, (proximo.get(erros) ?? 0) + pr * p[pos]);
      if (erros + 1 < regra.erros) proximo.set(erros + 1, (proximo.get(erros + 1) ?? 0) + pr * (1 - p[pos]));
    }
    vivos = proximo;
  }
  return total;
}

/** Menor valor cuja probabilidade acumulada chega a `f` (quantil de distribuição discreta). */
export function quantil(dist, f) {
  let acum = 0;
  for (const [v, pr] of dist) {
    acum += pr;
    if (acum >= f - 1e-12) return v;
  }
  return dist[dist.length - 1][0];
}

export const mediaDaDistribuicao = (dist) => dist.reduce((s, [v, pr]) => s + v * pr, 0);
export const chanceDeChegarA = (dist, minimo) => dist.filter(([v]) => v >= minimo).reduce((s, [, pr]) => s + pr, 0);

export function resumoDaDistribuicao(dist) {
  return {
    q1: quantil(dist, 0.25),
    mediana: quantil(dist, 0.5),
    q3: quantil(dist, 0.75),
    p90: quantil(dist, 0.9),
    max: dist[dist.length - 1][0],
    media: mediaDaDistribuicao(dist),
    zero: chanceDeChegarA(dist, 0) - chanceDeChegarA(dist, 1),
    naFaixa: chanceDeChegarA(dist, FAIXA.min),
  };
}

/** Menor taxa de acerto igual em todas as perguntas para a mediana chegar a `alvo` (busca binária). */
export function taxaParaMediana(regra, alvo = FAIXA.min) {
  let baixo = 0;
  let alto = 1;
  for (let i = 0; i < 40; i++) {
    const meio = (baixo + alto) / 2;
    const mediana = quantil(distribuicaoDePontos(Array(PERGUNTAS).fill(meio), regra), 0.5);
    if (mediana >= alvo) alto = meio;
    else baixo = meio;
  }
  return alto;
}

/**
 * Peso da Prova na semana se a média por partida mudar na mesma proporção que no modelo.
 * Não muda quantas partidas as pessoas jogam (jogar mais ao pagar mais não está no cálculo).
 */
export function pesoDaProva(pontosPorMinigame, razaoDaMedia) {
  const total = Object.values(pontosPorMinigame).reduce((s, v) => s + v, 0);
  const prova = pontosPorMinigame.prova * razaoDaMedia;
  return { prova, fatia: prova / (total - pontosPorMinigame.prova + prova) };
}

// ---------------------------------------------------------------------------
// Estatística das respostas
// ---------------------------------------------------------------------------

/** Intervalo de Wilson (95%) para `acertos` em `n`. Com n pequeno ele é largo; é a ideia. */
export function wilson(acertos, n, z = 1.96) {
  if (!n) return [0, 1];
  const f = acertos / n;
  const centro = (f + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const meia = (z * Math.sqrt((f * (1 - f)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
  return [Math.max(0, centro - meia), Math.min(1, centro + meia)];
}

const logFatorial = (n) => {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
};

/** Teste exato de Fisher (duas caudas) para [[a, b], [c, d]]: p-valor de a diferença entre duas taxas. */
export function fisher(a, b, c, d) {
  const n = a + b + c + d;
  const linha1 = a + b;
  const col1 = a + c;
  // Probabilidade de cada tabela com as mesmas margens: x acertos no grupo 1.
  const prob = (x) => {
    const y = col1 - x; // acertos no grupo 2
    if (x < 0 || y < 0 || x > linha1 || y > c + d) return 0;
    return Math.exp(
      logFatorial(linha1) + logFatorial(c + d) + logFatorial(col1) + logFatorial(n - col1) -
        logFatorial(n) - logFatorial(x) - logFatorial(linha1 - x) - logFatorial(y) - logFatorial(c + d - y),
    );
  };
  const observada = prob(a);
  let p = 0;
  for (let x = 0; x <= linha1; x++) {
    const px = prob(x);
    if (px <= observada * (1 + 1e-9)) p += px;
  }
  return Math.min(1, p);
}
