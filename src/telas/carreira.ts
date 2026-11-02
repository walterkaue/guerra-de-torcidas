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
      <div class="carreira-topo">
        <p class="carreira-nivel">${n.nome}</p>
        <p class="carreira-xp">${c.xp.toLocaleString('pt-BR')} XP</p>
      </div>
      <div class="carreira-barra" role="progressbar" aria-label="${linhaFalta(n)}"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(n.fracao * 100)}">
        <span style="--enche:${n.fracao}"></span>
      </div>
      <p class="carreira-falta">${linhaFalta(n)}</p>
      <p class="carreira-linha">${linhaHoje(c.partidasHoje)}</p>
      ${bonus ? `<p class="carreira-linha carreira-bonus">${bonus}</p>` : ''}`;
    el.hidden = false;
  });
}

/** Linha do resultado: "+10 XP na carreira · Reserva" ou o selo "Subiu pra Titular!". Só com servidor. */
export function mostrarCarreiraNoResultado(el: HTMLElement | null): void {
  if (!el) return;
  void buscar().then((c) => {
    if (!c) return;
    const r = linhaResultado(xpVisto(c.xp), c.xp);
    if (!r) return;
    el.innerHTML = r.subiu
      ? `<span class="selo-recorde">${r.texto}</span>`
      : `<p>${r.texto}</p>`;
    el.hidden = false;
  });
}

/** Nível para o card, se a pessoa escolheu mostrar (espera a leitura do resultado por até 3 s). */
export async function nivelParaCard(): Promise<string | null> {
  if (!prefs.get().nivelNoCard) return null;
  const c = ultima ? await Promise.race([ultima, new Promise<null>((ok) => setTimeout(() => ok(null), 3000))]) : null;
  const xp = c?.xp ?? xpVisto();
  return xp === null ? null : nivelDe(xp).nome;
}
