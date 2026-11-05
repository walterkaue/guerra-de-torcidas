// Recalibra as faixas do catálogo inteiro pelo acerto real das pessoas (docs/jogo.md, seção 14.7): a faixa nova de
// cada lance sai da chance do robô de calibragem (`calibrar`) vezes o fator humano medido (gols das pessoas ÷ gols que
// o robô faria nos mesmos lances). Vale só para partidas criadas a partir de 09/11/2026 (`faixaUnificada`); a faixa
// de antes continua no CSV. Grava dados/lances/faixas-unificadas.json, que o `npm run catalogo-lances` junta ao
// catálogo, e mostra a lista de antes e depois.
// Uso:
//   node scripts/lances/recalibrar.mjs                       fator medido no retrato da proposta (sem rede)
//   node scripts/lances/recalibrar.mjs --tentativas a.json   fator medido num retrato novo: { tentativas: [[lanceId, desfecho], …] }
//   node scripts/lances/recalibrar.mjs --fator 0.5           fator dado na mão
// Depois: npm run catalogo-lances && npm run compartilhar

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calibrar, faixaPorChance } from '../../src/jogo/lances.ts';
import { cenaDoLance } from './validar.mjs';
import { lerTodos } from './catalogo.mjs';

export const DESTINO = new URL('../../dados/lances/faixas-unificadas.json', import.meta.url);
const RETRATO = new URL('../../docs/propostas/lances-unificados-dados.json', import.meta.url);

const publicados = (lances) => lances.filter((l) => l.status === 'revisada' || l.status === 'ativa');

/** Chance do robô de calibragem para cada lance publicado (a mesma conta que deu a faixa inicial). */
export function chancesDoRobo(lances) {
  return Object.fromEntries(publicados(lances).map((l) => [l.id, calibrar(cenaDoLance(l)).chance]));
}

/** Fator humano: gols das pessoas ÷ gols que o robô faria nas mesmas tentativas (lances fora do catálogo saem). */
export function fatorHumano(tentativas, chances) {
  const validas = tentativas.filter(([id]) => chances[id] !== undefined);
  const gols = validas.filter(([, d]) => d === 'gol').length;
  const esperado = validas.reduce((s, [id]) => s + chances[id], 0);
  return { fator: esperado > 0 ? gols / esperado : null, tentativas: validas.length, gols, esperado };
}

/** A faixa nova de cada lance publicado, com a de antes ao lado. */
export function recalibrar(lances, chances, fator) {
  return Object.fromEntries(
    publicados(lances).map((l) => {
      const chancePessoa = chances[l.id] * fator;
      return [l.id, { antes: cenaDoLance(l).faixa, unificada: faixaPorChance(chancePessoa), chanceRobo: round(chances[l.id]), chancePessoa: round(chancePessoa) }];
    }),
  );
}

const round = (v) => Math.round(v * 1000) / 1000;

function argumento(nome) {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const lances = lerTodos();
  const chances = chancesDoRobo(lances);
  let medida;
  const fatorNaMao = argumento('--fator');
  if (fatorNaMao) {
    medida = { fator: Number(fatorNaMao), tentativas: null, gols: null, esperado: null, origem: 'dado na mão' };
  } else {
    const arquivo = argumento('--tentativas');
    const tentativas = arquivo
      ? JSON.parse(readFileSync(arquivo, 'utf8')).tentativas
      : JSON.parse(readFileSync(RETRATO, 'utf8')).lances.flatMap((p) => p.l.map(([id, , desfecho]) => [id, desfecho]));
    medida = { ...fatorHumano(tentativas, chances), origem: arquivo ? 'retrato novo' : 'retrato da proposta (04/11/2026)' };
  }
  if (!(medida.fator > 0 && medida.fator <= 1.5)) throw new Error(`fator fora do esperado: ${medida.fator}`);
  const faixas = recalibrar(lances, chances, medida.fator);
  const saida = {
    aviso: 'GERADO por scripts/lances/recalibrar.mjs. Faixa dos Lances unificados (seção 14.7), só para partidas criadas a partir de 09/11/2026.',
    medidoEm: new Date().toISOString().slice(0, 10),
    fator: round(medida.fator),
    origem: medida.origem,
    tentativas: medida.tentativas,
    gols: medida.gols,
    golsDoRobo: medida.esperado === null ? null : round(medida.esperado),
    lances: faixas,
  };
  writeFileSync(DESTINO, `${JSON.stringify(saida, null, 2)}\n`);

  const ordem = ['facil', 'media', 'dificil', 'craque'];
  const conta = (k) => Object.fromEntries(ordem.map((f) => [f, Object.values(faixas).filter((x) => x[k] === f).length]));
  console.log(`Fator humano ${saida.fator} (${saida.origem}; ${saida.gols ?? '–'} gols em ${saida.tentativas ?? '–'} tentativas, o robô faria ${saida.golsDoRobo ?? '–'}).`);
  console.log('Antes:', conta('antes'), ' Depois:', conta('unificada'));
  console.log('\n| Lance | Antes | Depois | Chance do robô | Chance da pessoa |\n|---|---|---|---|---|');
  for (const [id, f] of Object.entries(faixas)) {
    console.log(`| ${id} | ${f.antes} | ${f.unificada}${f.antes === f.unificada ? '' : ' ←'} | ${Math.round(f.chanceRobo * 100)}% | ${Math.round(f.chancePessoa * 100)}% |`);
  }
}
