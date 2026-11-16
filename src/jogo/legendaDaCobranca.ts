// Legenda do resultado de uma cobrança, embaixo do grito do narrador (docs/jogos/penaltis.md, "Pontuação"). Puro.
// No motor 2 (goleiro com alcance) o gol diz a colocação e os pontos, e a defesa diz como o goleiro pegou.

import type { FaixaDoGol, ResultadoCobranca } from './penaltis';

const NOME_DA_FAIXA: Record<FaixaDoGol, string> = { meio: 'No meio', colocado: 'Colocado', canto: 'No canto', angulo: 'No ângulo' };

export function legendaDaCobranca(r: ResultadoCobranca): string {
  if (r.desfecho === 'trave') return 'Na trave';
  if (r.desfecho === 'fora') return 'Pra fora';
  if (r.desfecho === 'defesa') return r.jeito === 'encaixou' ? 'Encaixou' : r.jeito === 'espalmou' ? 'Espalmou' : 'O goleiro pegou';
  const tipo = r.cavadinha ? 'Cavadinha' : r.faixa ? NOME_DA_FAIXA[r.faixa] : r.angulo ? 'No ângulo' : 'Gol';
  return `${tipo} · +${r.pontos}`;
}
