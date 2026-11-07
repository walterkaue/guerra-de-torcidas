// Os bustos do placar do X1 (docs/jogo.md 6, "Desafio por link", e 14.5, "Boneco em campo"): o seu e o de quem chamou, ao
// lado do apelido de cada um. Só visual. Sem boneco (ou com o interruptor "Meu boneco em campo" desligado), nada é
// inserido e o placar fica como sempre. Fora do bundle inicial: quem usa (resultado, lances) chama por import().
//
// O seu vem da cópia do aparelho, com o fundo e a moldura que a pessoa escolheu; o de quem chamou vem do resumo do
// desafio (só o que vai a campo), nas cores do time dele, com fundo e moldura padrão.

import { timePorId } from '../dados/times';
import { meuBonecoParaBusto } from './bonecoEmCampoCena';
import { pintarBoneco } from './bonecoDoAparelho';

/** Lado do busto no placar (cabe em 390 px de largura ao lado de um apelido). */
export const BUSTO_DO_DUELO = 40;

/** Põe o nome numa linha com altura de busto; com `pintar`, o busto entra antes do nome. */
function preparar(nome: HTMLElement, pintar: ((alvo: HTMLElement) => () => void) | null): void {
  const texto = document.createElement('b');
  texto.textContent = nome.textContent;
  nome.classList.add('com-busto');
  if (!pintar) {
    nome.replaceChildren(texto);
    return;
  }
  const alvo = document.createElement('span');
  alvo.className = 'busto-duelo';
  alvo.style.width = alvo.style.height = `${BUSTO_DO_DUELO}px`;
  nome.replaceChildren(alvo, texto);
  pintar(alvo);
}

/**
 * Põe os bustos nos nomes do duelo: `[data-nome-duelo="voce"]` e `[data-nome-duelo="outro"]` dentro de `raiz`.
 * `bonecoDeQuemChamou`: o `boneco` do resumo (null: sem busto dele); `timeDeQuemChamou`: o time_id dele, para as cores.
 * Sem busto nenhum, o placar fica como sempre; com busto só de um lado, o outro nome reserva a mesma altura.
 */
export function bustosDoDuelo(raiz: ParentNode, bonecoDeQuemChamou: unknown, timeDeQuemChamou: string | null | undefined): void {
  const voce = raiz.querySelector<HTMLElement>('[data-nome-duelo="voce"]');
  const outro = raiz.querySelector<HTMLElement>('[data-nome-duelo="outro"]');
  if (!voce || !outro) return;
  const meu = meuBonecoParaBusto();
  const paraMim = meu
    ? (alvo: HTMLElement) => pintarBoneco(alvo, { recorte: 'busto', largura: BUSTO_DO_DUELO, altura: BUSTO_DO_DUELO, vestimenta: meu })
    : null;
  const t = timePorId(timeDeQuemChamou);
  const cores: readonly [string, string] | undefined = t ? [t.cores[0], t.cores[1]] : undefined;
  const paraEle = bonecoDeQuemChamou
    ? (alvo: HTMLElement) => pintarBoneco(alvo, { recorte: 'busto', largura: BUSTO_DO_DUELO, altura: BUSTO_DO_DUELO, deCampo: bonecoDeQuemChamou, ...(cores ? { cores } : {}) })
    : null;
  if (!paraMim && !paraEle) return;
  preparar(voce, paraMim);
  preparar(outro, paraEle);
}

