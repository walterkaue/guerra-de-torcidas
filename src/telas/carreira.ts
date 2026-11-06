// Carreira do jogador na tela (docs/jogo.md, seção 5, "Longo prazo"): nível e barra no Perfil, "subiu pra
// Titular!" no resultado e, se a pessoa quiser, o nível no card. Só a própria: nada de lista nem apelido.
// O XP vem do servidor (minha_carreira); o aparelho só lembra o último XP visto, para saber o que mudou.

import { prefs } from '../estado';
import {
  linhaBonus,
  linhaFalta,
  linhaHoje,
  linhaResultado,
  nivelDe,
  type Carreira,
} from '../jogo/carreira';
import { minhaCarreira } from '../servidor/api';
import { barra, faixa, numero, placa, selo } from './blocos';
import { icone } from './icones';

const CHAVE = 'gdt:carreira';

function xpVisto(valor?: number): number | null {
  try {
    const antes = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as { xp?: number } | null;
    if (valor !== undefined) localStorage.setItem(CHAVE, JSON.stringify({ xp: valor }));
    return typeof antes?.xp === 'number' ? antes.xp : null;
  } catch {
    return null;
  }
}

/** Última leitura pedida ao servidor (o card do resultado espera por ela para sair com o nível novo). */
let ultima: Promise<Carreira | null> | null = null;
function buscar(): Promise<Carreira | null> {
  ultima = minhaCarreira().catch(() => null);
  return ultima;
}

/** A Home só anota o XP de agora: é dele que o resultado conta o "+10 XP" da próxima partida. */
export function anotarCarreira(): void {
  void buscar().then((c) => c && xpVisto(c.xp));
}

/** Bloco do Perfil: nível, barra até o próximo, quanto vale a próxima partida e bônus. */
export function carregarCarreiraPerfil(el: HTMLElement, saiu: () => boolean, ler: () => Promise<Carreira | null> = buscar): void {
  void ler().then((c) => {
    if (!c || saiu()) return;
    xpVisto(c.xp);
    const n = nivelDe(c.xp);
    const bonus = linhaBonus(c.bonus);
    el.innerHTML = `
      ${faixa('Carreira')}
      <div class="numeros dois">
        ${numero(n.nome, 'Nível', 'destaque')}
        ${numero(c.xp.toLocaleString('pt-BR'), 'XP')}
      </div>
      ${barra(n.fracao, linhaFalta(n))}
      <p class="carreira-falta">${linhaFalta(n)}</p>
      <p class="carreira-linha">${linhaHoje(c.partidasHoje)}</p>
      ${bonus ? `<p class="carreira-linha carreira-bonus">${bonus}</p>` : ''}`;
    el.hidden = false;
  });
}

/** Placa do resultado: nível, "+10 XP" (ou o selo "Subiu pra Titular!") e a barra até o próximo. Só com servidor. */
export function mostrarCarreiraNoResultado(
  el: HTMLElement | null,
  ler: () => Promise<Carreira | null> = buscar,
): Promise<ParDeXp | null> {
  return ler().then((c) => {
    if (!c) return null;
    // O "antes" é o último XP visto neste aparelho; xpVisto(c.xp) já grava o novo, então o par sai daqui.
    const antes = xpVisto(c.xp);
    const par: ParDeXp = { antes, depois: c.xp };
    const r = linhaResultado(antes, c.xp);
    if (!el || !r || antes === null) return par;
    const n = nivelDe(c.xp);
    el.innerHTML = placa(
      `<div class="carreira-res">
        <p class="carreira-nivel">${n.nome}</p>
        ${r.subiu ? selo(`${icone('estrela')} ${r.texto}`, 'ouro') : `<p class="carreira-ganho">+${(c.xp - antes).toLocaleString('pt-BR')} XP</p>`}
      </div>
      ${barra(n.fracao, linhaFalta(n))}
      <p class="carreira-falta">${linhaFalta(n)}</p>`,
      { titulo: 'Carreira', classe: 'aperta' },
    );
    el.hidden = false;
    return par;
  });
}

/** O XP visto antes da partida (null: aparelho que nunca viu) e o lido depois; o bloco "Peça nova" parte daqui. */
export interface ParDeXp {
  antes: number | null;
  depois: number;
}

/** Nível para o card, se a pessoa escolheu mostrar (espera a leitura do resultado por até 3 s). */
export async function nivelParaCard(): Promise<string | null> {
  if (!prefs.get().nivelNoCard) return null;
  const c = ultima ? await Promise.race([ultima, new Promise<null>((ok) => setTimeout(() => ok(null), 3000))]) : null;
  const xp = c?.xp ?? xpVisto();
  return xp === null ? null : nivelDe(xp).nome;
}
