// Placa "Rumo às medalhas" no resultado dos Lances (jogo.md, 14.3): uma linha por lance ("+1 rumo ao ouro · 24/50")
// com a trilha compacta. Lê minhas_medalhas() depois da partida, quando o gatilho já anotou os gols. Ao subir de
// medalha: papel picado nas cores do time, vibração e o selo da medalha. Falhou a leitura: a placa não aparece.

import '../estilos/trofeus.css';
import { esc } from '../app';
import type { Medalha } from '../jogo/lances';
import { NOME_DA_MEDALHA, linhasRumoDaPartida, trilhaDoLance, type LinhaMedalha } from '../jogo/lancesTextos';
import { placa, trilha } from './blocos';
import { papelPicadoNaTela } from './papelPicado';
import { vibrar } from './toque';

export interface LanceJogado {
  id: string;
  titulo: string;
  gol: boolean;
  recriou: boolean;
}

/** O selo da medalha na cor dela, com o nome por escrito. */
export const seloDaMedalha = (m: Medalha): string =>
  `<span class="selo-medalha"><span class="medalha ${m}" aria-hidden="true"></span>${NOME_DA_MEDALHA[m]}</span>`;

/** Monta a placa (ou null se não há lance) e diz se alguma medalha subiu. Puro: só HTML. */
export function placaRumo(
  jogados: readonly LanceJogado[],
  depois: readonly LinhaMedalha[],
  novas: readonly { lanceId: string; medalha: Medalha }[],
): { html: string; subiu: boolean } | null {
  const linhas = linhasRumoDaPartida(jogados, depois);
  if (!linhas.length) return null;
  let subiu = false;
  const itens = linhas.map(({ lanceId, linha }) => {
    const jogado = jogados.find((j) => j.id === lanceId)!;
    const doLance = depois.find((l) => l.lance_id === lanceId);
    const daqui = jogados.filter((j) => j.id === lanceId && j.gol);
    const t = trilhaDoLance(doLance?.gols ?? daqui.length, doLance?.recriados ?? daqui.filter((j) => j.recriou).length);
    const medalha = linha.subiu ?? novas.find((n) => n.lanceId === lanceId)?.medalha ?? null;
    if (medalha) subiu = true;
    return `<li class="rumo-linha">
        <div class="rumo-topo"><span class="rumo-titulo">${esc(jogado.titulo)}</span>${medalha ? seloDaMedalha(medalha) : ''}</div>
        <p class="rumo-texto">${esc(linha.texto)}</p>
        ${trilha(t, { compacta: true })}
      </li>`;
  });
  return { html: `<ul class="rumo-lista">${itens.join('')}</ul>`, subiu: subiu || novas.length > 0 };
}

/**
 * Preenche `alvo` (um espaço vazio logo depois do detalhe dos 3 lances). Só chame com partida que contou
 * (`fim` e sem suspeita). Se a leitura falhar ou a tela já mudou, não mostra nada.
 */
export async function mostrarRumoDasMedalhas(o: {
  alvo: HTMLElement;
  jogados: readonly LanceJogado[];
  novas: readonly { lanceId: string; medalha: Medalha }[];
  cores: readonly string[];
  ler: () => Promise<readonly LinhaMedalha[]>;
}): Promise<void> {
  let depois: readonly LinhaMedalha[];
  try {
    depois = await o.ler();
  } catch {
    return;
  }
  if (!o.alvo.isConnected) return;
  const p = placaRumo(o.jogados, depois, o.novas);
  if (!p) return;
  o.alvo.innerHTML = placa(p.html, { titulo: 'Rumo às medalhas', filete: true, classe: 'rumo-placa' });
  o.alvo.hidden = false;
  if (p.subiu) {
    vibrar('gol');
    papelPicadoNaTela(o.alvo, o.cores);
  }
}
