// O busto de quem chamou, 40 px nas cores do time dele, ao lado do texto da placa do convite e da triagem
// (docs/jogo.md 14.5, "Boneco em campo"). Sem boneco (ou com o interruptor desligado no servidor), nada é desenhado.

import type { Time } from '../dados/times';
import { pintarBoneco } from './bonecoDoAparelho';

export function bustoDoConvite(alvo: HTMLElement | null, boneco: unknown, cores?: Time['cores']): void {
  if (alvo && boneco) pintarBoneco(alvo, { recorte: 'busto', largura: 40, altura: 40, deCampo: boneco, cores, aoLado: true });
}
