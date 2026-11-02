// O ranking da semana sai na rotina do minuto. A tela de resultado só conta "subiu de 5º pra 3º"
// quando a tabela foi calculada depois que a partida já estava gravada.

/** Espera máxima pela tabela nova: um minuto da rotina e mais uma folga. */
export const ESPERA_RANKING_MS = 75_000;

/**
 * calculadoEm: início da conta que gerou a tabela (ranking_aviso). confirmadaEm: hora do servidor logo
 * depois de gravar a partida. Conta que começou antes pode não ter visto a partida.
 */
export function tabelaIncluiPartida(calculadoEm: string | null, confirmadaEm: string | undefined): boolean {
  if (!calculadoEm || !confirmadaEm) return false;
  const conta = Date.parse(calculadoEm);
  const partida = Date.parse(confirmadaEm);
  return Number.isFinite(conta) && Number.isFinite(partida) && conta > partida;
}
