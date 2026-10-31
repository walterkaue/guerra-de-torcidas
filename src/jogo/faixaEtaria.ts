// Faixa etária (docs/jogo.md, seção 13). Puro: sem DOM nem relógio. Copiado para as funções do
// servidor por `npm run compartilhar`. A faixa só decide o que é para 18+: nunca aparece na tela, no
// card nem nas métricas por pessoa.

export const FAIXAS = ['menos_16', '16_17', '18_mais'] as const;

export type FaixaEtaria = (typeof FAIXAS)[number];

export function ehFaixa(v: unknown): v is FaixaEtaria {
  return FAIXAS.includes(v as FaixaEtaria);
}

/** Regra única do que é só para 18+. Sem resposta conta como não: quem não respondeu não vê. */
export function soPara18Mais(faixa: FaixaEtaria | string | null | undefined): boolean {
  return faixa === '18_mais';
}

/** Oferta de push e sininho. */
export const podeVerPush = soPara18Mais;
/** "Apoie o jogo": botões e #apoie. */
export const podeVerApoio = soPara18Mais;
/** "Oferecido por" (seção 7.5): quando o selo existir, ele passa por aqui. */
export const podeVerOferecidoPor = soPara18Mais;

/** Telas de jogo: a triagem vem antes de qualquer uma delas, inclusive pelo link de desafio. */
const TELAS_DE_JOGO: readonly string[] = ['partida', 'prova', 'timeDoDia', 'lances', 'palpites'];

export function precisaDaTriagem(tela: string, faixa: FaixaEtaria | null | undefined): boolean {
  return !faixa && TELAS_DE_JOGO.includes(tela);
}

/**
 * O que o envio do push faz com uma inscrição. Só 18+ recebe. Quem marcou outra faixa é desinscrito;
 * quem ainda não respondeu (inscrito antes da triagem) fica sem receber até responder na próxima visita.
 */
export function destinoDaInscricao(faixa: string | null | undefined): 'enviar' | 'esperar' | 'desinscrever' {
  if (soPara18Mais(faixa)) return 'enviar';
  return faixa ? 'desinscrever' : 'esperar';
}
