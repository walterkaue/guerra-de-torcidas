// Confete da vitória no resultado de todos os jogos (item E01 do roteiro; telas/resultadoPadrao.ts): quando
// solta, quantos pedaços e a regra de "uma vez por resultado". Puro: o desenho fica na tela.

export type MotivoDoConfete = 'vitoria' | 'recorde' | 'melhores_do_dia' | 'time_do_dia' | 'medalha' | 'peca';

export interface SinaisDoConfete {
  /** Pênaltis vencidos, X1 vencido, 8 de 8 na Prova. */
  venceu?: boolean;
  novoRecorde?: boolean;
  /** Regra de 09/11 (jogo.md 14.7): a partida entrou nas 3 melhores do dia. */
  entrouNasMelhores?: boolean;
  acertouTimeDoDia?: boolean;
  /** Subiu de bronze, prata ou ouro (Lances e disputas de pênaltis). */
  subiuMedalha?: boolean;
}

/** O primeiro motivo que o resultado tem para comemorar, ou null. A ordem só dá nome ao motivo: o confete é um só. */
export function motivoDoConfete(s: SinaisDoConfete): MotivoDoConfete | null {
  if (s.venceu) return 'vitoria';
  if (s.acertouTimeDoDia) return 'time_do_dia';
  if (s.subiuMedalha) return 'medalha';
  if (s.novoRecorde) return 'recorde';
  if (s.entrouNasMelhores) return 'melhores_do_dia';
  return null;
}

/** Pedaços pelo nível de qualidade (docs/visual.md 4.3); com movimento reduzido, nenhum. */
export function pedacosDoConfete(nivel: 'alta' | 'media' | 'leve', reduzido: boolean): number {
  if (reduzido) return 0;
  return nivel === 'alta' ? 90 : nivel === 'media' ? 60 : 36;
}

export interface AcoesDoConfete {
  /** Desenha o papel picado (a tela decide se pode: movimento reduzido não desenha). */
  desenhar(): void;
  /** Vibra (quem desligou a Vibração não sente nada: telas/toque.ts). */
  vibrar(): void;
}

/**
 * Comemoração de um resultado: o primeiro motivo solta o confete e a vibração; os seguintes (a medalha que chega
 * depois da leitura do servidor, por exemplo) não soltam de novo. Devolve se soltou agora.
 */
export function criarComemoracao(acoes: AcoesDoConfete): (motivo: MotivoDoConfete | null) => boolean {
  let soltou = false;
  return (motivo) => {
    if (!motivo || soltou) return false;
    soltou = true;
    acoes.vibrar();
    acoes.desenhar();
    return true;
  };
}
