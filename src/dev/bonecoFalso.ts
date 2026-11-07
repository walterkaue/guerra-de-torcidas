// Boneco de mentira (só em desenvolvimento) para a Home, o Perfil e os resultados falsos: o mesmo estado da fonte
// falsa do vestiário (&nivel=, &ouros=, &aquecido), no formato que a função `boneco` devolve.

import { proximaPeca } from '../jogo/vestiario';
import type { BonecoDoServidor } from '../servidor/boneco';
import { fonteFalsa } from '../telas/vestiario/fonteFalsa';

export async function bonecoFalso(): Promise<BonecoDoServidor> {
  const d = await fonteFalsa(new URLSearchParams(location.search)).ler();
  const p = proximaPeca(d.estado);
  // &emCampo=0|1 imita o servidor mandando o interruptor "Meu boneco em campo"; sem o parâmetro, é a função antiga (não manda).
  const emCampo = new URLSearchParams(location.search).get('emCampo');
  return {
    vestimenta: d.vestimenta,
    liberadas: d.liberadas,
    proxima: p ? { id: p.peca.id, condicao: p.condicao } : null,
    ...(emCampo === null ? {} : { emCampo: emCampo !== '0' }),
  };
}
