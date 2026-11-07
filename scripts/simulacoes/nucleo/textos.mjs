// Listas de texto que o simulador procura em cada tela. As regras vêm do docs/jogo.md:
// seção 7 (palavras proibidas), seção 13 (sem urgência, sequência de dias e ofertas só para 18+) e
// seção 8 (nomes reais só nas fichas factuais).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Seção 7: aposta, apostar, bet, odd, cotação, banca, bolão valendo, "green", "red". */
export const PROIBIDAS = [
  { rotulo: 'aposta', re: '\\bapost(a|as|ar|ou|ando|e|em)\\b' },
  { rotulo: 'bet', re: '\\bbets?\\b' },
  { rotulo: 'odd', re: '\\bodds?\\b' },
  { rotulo: 'cotação', re: '\\bcota[cç](ão|ões|ao|oes)\\b' },
  { rotulo: 'banca', re: '\\bbancas?\\b' },
  { rotulo: 'bolão valendo', re: '\\bbol[aã]o valendo\\b' },
  { rotulo: 'green', re: '\\bgreen\\b' },
  { rotulo: 'red', re: '\\bred\\b' },
];

/** O aviso fixo e os Termos nomeiam a aposta para negá-la (as duas exceções da seção 7). */
export const AVISO_FIXO = 'Aqui é só resenha: sem aposta, sem dinheiro, sem prêmio em dinheiro. Nunca.';

/** Seção 13 e checklist do docs/narrador.md (seção 13 e 15): sequência de dias, urgência, pressão para voltar. */
export const URGENCIA = [
  { rotulo: 'sequência de dias', re: '\\bsequ[eê]ncia\\b|\\bdias? seguidos?\\b|\\bstreak\\b|\\bofensiva\\b|🔥\\s*\\d' },
  { rotulo: 'não perca / última chance', re: 'n[aã]o (perca|perde|deixe pra depois)|[uú]ltima chance|corra|corre que|s[oó] hoje|antes que acabe' },
  { rotulo: 'contagem para voltar', re: 'volte amanh[aã]|volta amanh[aã]|te esperamos|sentimos sua falta|faz tempo que voc[eê] n[aã]o' },
  // "Semana fecha em 5d 03h" no cabeçalho e o "fecha em" do Crava são previstos (docs/visual.md, seção 3): ficam de fora.
  { rotulo: 'contagem regressiva', re: '\\b(acaba|termina|expira|encerra) em \\d+\\s*(d|h|dias?|horas?|min|minutos?)\\b' },
];

/** Seção 13: só 18+ vê push, "Apoie o jogo", "Oferecido por" e "Seja sócio". */
export const SO_18 = [
  { rotulo: 'aviso de domingo (push)', re: 'aviso de domingo|ligar (o )?aviso|receber (o )?aviso|ativar notifica' },
  { rotulo: 'Apoie o jogo', re: 'apoie o jogo|apoiar o jogo|\\bpix\\b' },
  { rotulo: 'Oferecido por', re: 'oferecido por' },
  { rotulo: 'Seja sócio', re: 'seja s[oó]cio' },
];

/**
 * Nomes de jogadores famosos: a mesma lista do filtro de apelidos (migração 20261106100000). Nunca copiada para cá:
 * é lida na hora, normalizada como no servidor (minúsculas, sem acento, só a-z, sem espaço).
 */
export function nomesFamosos(raiz) {
  const sql = readFileSync(join(raiz, 'supabase', 'migrations', '20261106100000_apelidos_famosos.sql'), 'utf8');
  const nomes = new Set();
  for (const m of sql.matchAll(/\('([a-z]+)'\)/g)) nomes.add(m[1]);
  return [...nomes];
}
