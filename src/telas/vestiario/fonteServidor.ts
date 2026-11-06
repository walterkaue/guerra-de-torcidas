// Fonte do Vestiário no servidor (D5c2): a vestimenta e as peças liberadas vêm da função `boneco`; nível, XP e
// medalhas, de minha_carreira e minhas_medalhas, só para a folha da peça trancada mostrar quanto falta. O aparelho
// nunca vira a fonte da verdade: sem rede, `ler` e `salvar` rejeitam, e a tela avisa.

import { nivelDe } from '../../jogo/carreira';
import { itensDasMedalhas } from '../../jogo/pecaNova';
import { minhaCarreira, minhasMedalhas } from '../../servidor/api';
import { salvarBoneco } from '../../servidor/boneco';
import { guardarBoneco, marcarVistas } from '../bonecoDoAparelho';
import { lerDoServidor } from '../bonecoPintar';
import type { FonteDoVestiario } from './fonte';

export const fonteDoServidor: FonteDoVestiario = {
  async ler() {
    const [b, carreira, medalhas] = await Promise.all([
      lerDoServidor(),
      // Sem a carreira, a folha só não mostra a barra de XP: o vestiário abre do mesmo jeito.
      minhaCarreira().catch(() => null),
      // Sem as medalhas, a folha só não mostra quanto falta: o que está liberado veio do servidor do mesmo jeito.
      minhasMedalhas().catch(() => []),
    ]);
    const xp = carreira?.xp ?? 0;
    return {
      vestimenta: b.vestimenta,
      liberadas: b.liberadas,
      estado: { nivel: nivelDe(xp).indice, xp, medalhas: itensDasMedalhas(medalhas), aquecido: b.liberadas.includes('apito') },
    };
  },
  async salvar(vestimenta) {
    const r = await salvarBoneco(vestimenta);
    guardarBoneco(r.vestimenta);
    marcarVistas(r.liberadas);
    return r.vestimenta;
  },
};
