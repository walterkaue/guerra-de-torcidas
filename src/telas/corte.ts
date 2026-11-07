// Qual tela dos Lances mostrar: a de hoje ou a dos Lances unificados (docs/jogo.md, seção 14.7), que entram na
// domingo 08/11/2026, 0h de Brasília. Decide pelo relógio do aparelho. Se ele estiver errado, o servidor corrige:
// a lista antiga de 3 lances depois do corte recebe 426 `atualize_o_app` (a tela redesenha no formato novo), e o
// formato novo antes do corte é aceito com a tabela antiga. Os pontos saem sempre da hora de criação no servidor.
//
// Em desenvolvimento, ?corte=depois (ou ?corte=antes) finge o relógio do lado de lá, para conferir as duas telas.

import { ehUnificada } from '../jogo/regraLances';

export function lancesUnificados(agora: Date = new Date()): boolean {
  if (import.meta.env.DEV) {
    const c = new URLSearchParams(location.search).get('corte');
    if (c === 'depois') return true;
    if (c === 'antes') return false;
  }
  return ehUnificada(agora);
}
