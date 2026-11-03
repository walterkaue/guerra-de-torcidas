// De onde as telas do código do torcedor tiram o servidor: o de verdade, ou (só em desenvolvimento, com
// ?codigoFalso) o de mentira de src/dev/codigoFalso.ts, que não entra no build de produção.

import { desconectarAparelho, gerarCodigo, meusAparelhos, statusDoCodigo } from '../servidor/api';
import { entrarComCodigo, puxarTorcedor } from '../servidor/torcedor';

const REAL = { gerarCodigo, statusDoCodigo, meusAparelhos, desconectarAparelho, entrarComCodigo, puxarTorcedor };
const FALSO =
  import.meta.env.DEV && ['codigoFalso', 'homeFalsa'].some((p) => new URLSearchParams(location.search).has(p));

export const servidorDoCodigo = (): Promise<typeof REAL> => (FALSO ? import('../dev/codigoFalso') : Promise.resolve(REAL));
