// Vaga do momento da Home (docs/visual.md, "Início"): no máximo um aviso por abertura, logo abaixo do "Jogar agora".
// Puro. A ordem está numa lista só: quando a central de avisos entrar, o que não couber aqui vai para ela.
// Os outros avisos esperam a próxima abertura (cada um só sai da fila quando a pessoa o vê ou abre).

/** Os avisos que disputam a vaga, do mais importante ao menos. */
export const ORDEM_DA_VAGA = ['fim-do-mes', 'trofeu', 'termos'] as const;
export type AvisoDaVaga = (typeof ORDEM_DA_VAGA)[number];

/**
 * Quais avisos estão de pé nesta abertura: `true` tem, `false` não tem, `undefined` ainda não se sabe (chega tarde,
 * pela rede). Falha de rede conta como `false`.
 */
export type AvisosDaAbertura = Partial<Record<AvisoDaVaga, boolean>>;

/**
 * O aviso que ocupa a vaga; `null` = nenhum (a vaga não ocupa espaço); `undefined` = espera um aviso mais importante
 * que ainda não respondeu (assim um aviso menor nunca aparece e some em seguida).
 */
export function avisoDaVaga(a: AvisosDaAbertura): AvisoDaVaga | null | undefined {
  for (const aviso of ORDEM_DA_VAGA) {
    if (a[aviso] === undefined) return undefined;
    if (a[aviso]) return aviso;
  }
  return null;
}
