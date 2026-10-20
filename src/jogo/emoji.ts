// Placar em emoji para colar no grupo (docs/jogo.md, "Card de resultado"). Puro.

import { COBRANCAS, type ResultadoCobranca, type ResultadoDefesa, type ResultadoPartida } from './penaltis.ts';

export function emojiCobranca(c: ResultadoCobranca): string {
  if (c.desfecho !== 'gol') return '❌';
  if (c.cavadinha) return '✨';
  if (c.angulo) return '🎯';
  return '⚽';
}

export function emojiDefesa(d: ResultadoDefesa): string {
  if (d.desfecho === 'defesa') return '✅';
  if (d.desfecho === 'fora') return '💨';
  return '❌';
}

/** Os 5 do tempo normal, e a morte súbita depois de uma barra. */
const linha = <T>(lista: readonly T[], f: (x: T) => string) => {
  const normal = lista.slice(0, COBRANCAS).map(f).join('');
  const extra = lista.slice(COBRANCAS).map(f).join('');
  return extra ? `${normal} | ${extra}` : normal;
};

export interface DadosEmoji {
  resultado: ResultadoPartida;
  /** "Chapecoense" (ou "Eu", para "Outro time"). */
  nomeJogador: string;
  /** "Máquina" ou o apelido de quem desafiou. */
  nomeAdversario: string;
  /** "+85 pra Chapecoense" */
  linhaPontos: string;
  link: string;
}

export function placarEmoji(d: DadosEmoji): string {
  const r = d.resultado;
  const linhas = [
    '⚽ Guerra de Torcidas · Pênaltis',
    `${d.nomeJogador} ${r.golsJogador} x ${r.golsMaquina} ${d.nomeAdversario}`,
    `Cobranças: ${linha(r.cobrancas, emojiCobranca)}`,
    `Defesas:   ${linha(r.defesas, emojiDefesa)}`,
  ];
  if (r.parOuImpar) {
    linhas.push(`Par ou ímpar: ${r.parOuImpar.ganhou ? 'ganhei ✋' : 'perdi ✋'} (deu ${r.parOuImpar.soma})`);
  }
  linhas.push(d.linhaPontos, d.link);
  return linhas.join('\n');
}
