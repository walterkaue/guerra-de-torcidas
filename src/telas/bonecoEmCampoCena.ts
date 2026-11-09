// Liga o boneco da pessoa às cenas dos jogos (pênaltis, Lances, treino e aquecimento): devolve o batedor DELA, pronto
// para criarBoneco/desenharBoneco, ou null (aí a cena sorteia o batedor como sempre). Só visual, só no aparelho.
//
// Lê só o que o aparelho já guarda (a cópia da vestimenta e o interruptor): nada de rede antes do apito.
// Desempenho: o Boneco (Path2D) e as camadas nascem UMA vez por cena; o número é um sprite desenhado uma vez.
// A conta de quem aparece e com quê é pura e testada em bonecoEmCampo.ts; o desenho das peças é o do vestiário.

import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { bonecoGuardado } from './bonecoDoAparelho';
import { emCampoLigado } from './bonecoEmCampoGuardado';
import { batedorEmCampo } from './bonecoEmCampo';
import { camadasDeCampo, criarSpriteDoNumero } from './bonecoMontavel';
import { comFormato, type Vestimenta } from '../jogo/vestiario';
import { criarBoneco, type Boneco, type Uniforme } from './bonecos';

/** De onde vem a cópia e o interruptor. Em dev, os jogos falsos trocam isto (src/dev/bonecoDeCampoFalso.ts). */
export interface FonteDoBoneco {
  vestimenta: unknown;
  ligado: boolean;
}

const doAparelho = (): FonteDoBoneco => ({ vestimenta: bonecoGuardado(), ligado: emCampoLigado() });
let fonte: () => FonteDoBoneco = doAparelho;

/** Só para o desenvolvimento (jogos falsos): troca a fonte; sem argumento volta à do aparelho. */
export function definirFonteDoBoneco(nova?: () => FonteDoBoneco): void {
  fonte = nova ?? doAparelho;
}

/** As cores do time do coração de agora (em dev, `?time=` ganha). */
function coresDoCoracao(): readonly [string, string] {
  const pedido = import.meta.env.DEV ? timePorId(new URLSearchParams(location.search).get('time')) : undefined;
  const t = pedido ?? timePorId(prefs.get().time) ?? timePorId(ID_OUTRO)!;
  return [t.cores[0], t.cores[1]];
}

/**
 * Um boneco de campo (o da pessoa ou o de quem chamou o X1) vestido com a roupa da cena, de costas, ou null para a cena
 * sortear. `virar()` devolve o mesmo batedor de frente, com o número e a braçadeira certos para o replay.
 */
export function bonecoDeCampo(vestimenta: unknown, ligado: boolean, roupaDaCena: Uniforme, coresDoCoracao: readonly [string, string]): Boneco | null {
  const b = batedorEmCampo(vestimenta, ligado, roupaDaCena, coresDoCoracao);
  if (!b) return null;
  const sprite = b.pecas.numero !== null && b.pecas.corDoNumero !== null ? criarSpriteDoNumero(b.pecas.numero, b.pecas.corDoNumero) : null;
  // `espelhado` só vale de frente: é o replay, em que a câmera de trás do gol desenha o boneco espelhado.
  const montar = (deFrente: boolean): Boneco => {
    const boneco = criarBoneco(b.aparencia, b.uniforme, deFrente);
    boneco.camadas = camadasDeCampo(b.pecas, sprite, 0, deFrente);
    boneco.virar = () => montar(!deFrente);
    return boneco;
  };
  return montar(false);
}

/** O batedor da pessoa (cópia do aparelho + interruptor) vestido com a roupa da cena, ou null para sortear. */
export function bonecoDaPessoaEmCampo(roupaDaCena: Uniforme): Boneco | null {
  const { vestimenta, ligado } = fonte();
  return bonecoDeCampo(vestimenta, ligado, roupaDaCena, coresDoCoracao());
}

/**
 * O batedor de quem chamou o X1 (o `boneco` do resumo do desafio, já em Vestimenta), nas cores do time dele: testeira,
 * munhequeira e chuteira "do time" usam as cores de `coresDoTimeDele`; a roupa é a da cena. null: sorteia.
 */
export function bonecoDeQuemChamouEmCampo(vestimenta: Vestimenta | null, roupaDaCena: Uniforme, coresDoTimeDele: readonly [string, string]): Boneco | null {
  return vestimenta ? bonecoDeCampo(vestimenta, true, roupaDaCena, coresDoTimeDele) : null;
}

/** A vestimenta da pessoa para o busto do placar do X1 (cópia do aparelho, interruptor ligado), ou null (sem busto). */
export function meuBonecoParaBusto(): Vestimenta | null {
  const { vestimenta, ligado } = fonte();
  return ligado ? comFormato(vestimenta) : null;
}
