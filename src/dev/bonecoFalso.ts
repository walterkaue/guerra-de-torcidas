// Boneco de mentira (só em desenvolvimento) para a Home, o Perfil e os resultados falsos: o mesmo estado da fonte
// falsa do vestiário (&nivel=, &ouros=, &aquecido), no formato que a função `boneco` devolve.

import { proximaPeca } from '../jogo/vestiario';
import type { BonecoDoServidor } from '../servidor/boneco';
import { fonteFalsa } from '../telas/vestiario/fonteFalsa';

export async function bonecoFalso(): Promise<BonecoDoServidor> {
  const d = await fonteFalsa(new URLSearchParams(location.search)).ler();
  const p = proximaPeca(d.estado);
  return { vestimenta: d.vestimenta, liberadas: d.liberadas, proxima: p ? { id: p.peca.id, condicao: p.condicao } : null };
}
