// Número do narrador no par ou ímpar.
// PROVISÓRIO (bloco A): sorteado no próprio celular. No bloco B ele passa a vir do servidor,
// gerado com um segredo que o celular não conhece e revelado só depois da escolha do jogador.

import type { EscolhaParOuImpar } from './penaltis';

export async function pedirNumeroDoNarrador(_escolha: EscolhaParOuImpar): Promise<number> {
  const buf = new Uint8Array(1);
  // Rejeita 252..255 para os 6 números saírem com a mesma chance.
  do crypto.getRandomValues(buf);
  while (buf[0] >= 252);
  // Pausa curta para o "narrador tá pensando…" aparecer, como vai acontecer com o servidor.
  await new Promise((ok) => setTimeout(ok, 900));
  return buf[0] % 6;
}
