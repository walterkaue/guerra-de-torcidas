// Apelido no card (docs/jogo.md, seção 3, "Apelido"; J26 de 06/11/2026): o card só mostra o apelido depois que o servidor
// o aceitou (o filtro de famosos e de palavrões mora lá). Regra pura; o aparelho guarda `apelidoConferido` em gdt:prefs.

export interface PrefsDoApelido {
  apelido?: string;
  /** false = digitado aqui e ainda não aceito pelo servidor. Ausente = apelido de antes desta regra: conta como conferido. */
  apelidoConferido?: boolean;
}

/** O apelido que o card pode mostrar: o conferido pelo servidor; do contrário, nenhum (o card usa "Torcedor do …"). */
export function apelidoParaCard(p: PrefsDoApelido): string | undefined {
  return p.apelido && p.apelidoConferido !== false ? p.apelido : undefined;
}

/** Valor de `apelidoConferido` ao salvar o apelido na escolha do time: o mesmo apelido mantém, um novo espera o servidor. */
export function conferidoAoSalvar(anterior: PrefsDoApelido, novo: string | undefined): boolean | undefined {
  if (!novo) return undefined;
  if (novo === anterior.apelido) return anterior.apelidoConferido;
  return false;
}
