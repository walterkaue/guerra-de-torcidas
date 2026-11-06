// Bloco "Peça nova no vestiário" do resultado padrão de todos os jogos (docs/jogo.md 14.5, "Tela (Rota 2)").
// Lazy: o resultado chama por import(), então nada daqui pesa no bundle inicial. O que anunciar sai de
// jogo/pecaNova.ts (puro); aqui ficam a decisão com as vistas do aparelho e o desenho.
// Só aparece quando o servidor fechou a partida e ela contou (treino, sem conexão e sob suspeita não mostram).
// Cada peça é anunciada uma vez por aparelho; com movimento reduzido nada se move e não há papel picado.

import { esc } from '../app';
import type { MotivoDoConfete } from '../jogo/confete';
import {
  gruposDaPecaNova,
  paraAnunciar,
  pecaParaVestir,
  pecasDaPartida,
  vestirAsNovas,
  type JogadaNoItem,
  type LinhaDeMedalha,
  type PartidaParaPeca,
} from '../jogo/pecaNova';
import { nivelDe } from '../jogo/carreira';
import type { Peca, Vestimenta } from '../jogo/vestiario';
import { placa } from './blocos';
import { marcarVistas, pecasVistas, pintarBoneco } from './bonecoDoAparelho';
import type { ParDeXp } from './carreira';
import { abrirVestiario } from './vestiario/abrir';

const LARGURA = 96;
const ALTURA = 140;

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export interface EntradaDoBloco extends PartidaParaPeca {
  /** O servidor fechou a partida e ela contou (valendo, sem suspeita). */
  contou: boolean;
}

/**
 * As peças a anunciar neste resultado: as que a partida liberou e este aparelho ainda não viu. Partida que não
 * contou não anuncia nada. Puro: as vistas vêm de fora.
 */
export function pecasParaAnunciar(e: EntradaDoBloco, vistas: ReadonlySet<string>): Peca[] {
  if (!e.contou) return [];
  return paraAnunciar(pecasDaPartida(e), vistas);
}

/** A pose de braços pra cima fica no boneco do bloco só quando está entre as novas ou já liberada (nível 2 ou mais). */
export function poseDeBracos(novas: readonly Peca[], xpDepois: number): boolean {
  return novas.some((p) => p.id === 'pose_bracos') || nivelDe(xpDepois).indice >= 2;
}

export function htmlDoBloco(novas: readonly Peca[], comBoneco: boolean): string {
  const grupos = gruposDaPecaNova(novas)
    .map(
      (g) => `<div class="peca-grupo"><p class="peca-conquista">${esc(g.titulo)}</p>
        <ul>${g.pecas.map((p) => `<li>${esc(p.nome)}</li>`).join('')}</ul></div>`,
    )
    .join('');
  return placa(
    `<div class="peca-nova${comBoneco ? '' : ' sem-boneco'}">
        ${comBoneco ? `<div class="peca-boneco" data-peca-boneco style="width:${LARGURA}px;height:${ALTURA}px"></div>` : ''}
        <div class="peca-lista">${grupos}</div>
      </div>
      <button type="button" class="botao-linha" data-acao="vestir-agora">Vestir agora</button>`,
    { titulo: 'Peça nova no vestiário', filete: true, classe: 'peca-placa' },
  );
}

export interface PedidoDoBloco extends EntradaDoBloco {
  /** Papel picado e vibração do resultado (uma vez por resultado). */
  comemorar: (motivo: MotivoDoConfete | null) => boolean;
  /** Em desenvolvimento (&pecaNova): ignora as vistas e não marca nada, para o print sair sempre. */
  ignorarVistas?: boolean;
}

/** Mostra o bloco em `alvo`, se houver peça nova de verdade. Devolve as peças anunciadas. */
export async function mostrarPecaNova(alvo: HTMLElement | null, o: PedidoDoBloco): Promise<Peca[]> {
  if (!alvo) return [];
  const novas = pecasParaAnunciar(o, o.ignorarVistas ? new Set() : pecasVistas());
  if (!novas.length) return [];
  if (!o.ignorarVistas) marcarVistas(novas.map((p) => p.id));

  const pintura = await import('./bonecoPintar');
  let guardada: Vestimenta | null = pintura.vestimentaGuardada();
  if (!guardada && import.meta.env.DEV && o.ignorarVistas) guardada = (await (await import('../dev/bonecoFalso')).bonecoFalso()).vestimenta;
  if (!alvo.isConnected) return novas;

  alvo.innerHTML = htmlDoBloco(novas, !!guardada);
  alvo.hidden = false;
  alvo.querySelector('[data-acao="vestir-agora"]')!.addEventListener('click', () => abrirVestiario(pecaParaVestir(novas)?.id));

  const box = alvo.querySelector<HTMLElement>('[data-peca-boneco]');
  if (guardada && box) {
    const vestido = vestirAsNovas(guardada, novas);
    const reduzido = semMovimento();
    const bracos = poseDeBracos(novas, o.xpDepois);
    const pintar = (v: Vestimenta) => pintarBoneco(box, { recorte: 'corpo', largura: LARGURA, altura: ALTURA, vestimenta: v, rotulo: 'Seu boneco com a peça nova' });
    if (reduzido) pintar(vestido);
    else {
      // Primeiro parado; depois, com a pose liberada, braços pra cima e um pulinho curto.
      pintar({ ...vestido, pose: 'parado' });
      window.setTimeout(() => {
        if (!box.isConnected) return;
        if (bracos) pintar({ ...vestido, pose: 'bracos' });
        box.classList.add('pulo');
      }, 450);
    }
  }
  o.comemorar('peca');
  return novas;
}

/** Em desenvolvimento, &pecaNova força uma subida pra Titular (990 → 1.010 XP) e, nos Lances, um 1º bronze. */
export const pecaNovaForcada = (): boolean => import.meta.env.DEV && new URLSearchParams(location.search).has('pecaNova');

export interface DoResultado {
  alvo: HTMLElement | null;
  /** O servidor fechou a partida e ela contou. */
  contou: boolean;
  /** O par de XP que a Carreira do resultado já leu (sem segunda chamada ao servidor). */
  carreira: Promise<ParDeXp | null>;
  /** As medalhas que o resultado já lê (Lances e Pênaltis); jogos sem medalha não passam. */
  medalhas?: Promise<readonly LinhaDeMedalha[]>;
  jogadas?: readonly JogadaNoItem[];
  comemorar: (motivo: MotivoDoConfete | null) => boolean;
  /** Dev (&pecaNova): inclui um 1º bronze nos Lances. */
  bronzeNoDev?: boolean;
}

/** Liga o bloco a um resultado: espera o que o resultado já lê e mostra. Nunca estoura (o bloco só enfeita). */
export async function pecaNovaDoResultado(r: DoResultado): Promise<void> {
  try {
    if (pecaNovaForcada()) {
      const dev = r.bronzeNoDev ? { lance_id: 'dev-lance', gols: 5, recriados: 0, vitorias: 0 } : null;
      await mostrarPecaNova(r.alvo, {
        contou: true,
        xpAntes: 990,
        xpDepois: 1010,
        medalhasDepois: dev ? [dev] : [],
        jogadas: dev ? [{ item: dev.lance_id, gols: 5, recriados: 0, vitorias: 0 }] : [],
        comemorar: r.comemorar,
        ignorarVistas: true,
      });
      return;
    }
    if (!r.contou) return;
    const par = await r.carreira;
    if (!par) return;
    const medalhasDepois = r.medalhas ? await r.medalhas.catch(() => []) : [];
    await mostrarPecaNova(r.alvo, {
      contou: true,
      xpAntes: par.antes,
      xpDepois: par.depois,
      medalhasDepois,
      jogadas: r.jogadas ?? [],
      comemorar: r.comemorar,
    });
  } catch {
    // sem o bloco, o resultado segue igual
  }
}
