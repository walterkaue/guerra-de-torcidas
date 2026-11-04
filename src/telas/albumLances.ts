// Álbum dos Lances com troféus (jogo.md, 14.3): card-botão com a trilha compacta, filtros "Todos", "Meus troféus" e
// "Perto do próximo", favoritos só no aparelho e a leitura das medalhas (uma vez ao abrir o álbum).

import '../estilos/trofeus.css';
import { esc } from '../app';
import { prefs } from '../estado';
import { trilhaDoLance, type FiltroAlbum, type LinhaMedalha } from '../jogo/lancesTextos';
import { abas, trilha } from './blocos';
import type { NumerosDoLance } from './fichaLance';
import { icone } from './icones';

export const FILTROS_DO_ALBUM: { id: FiltroAlbum; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'meus', texto: 'Meus troféus' },
  { id: 'perto', texto: 'Perto do próximo' },
];

export const htmlFiltrosDoAlbum = (escolhido: FiltroAlbum): string => abas('album', FILTROS_DO_ALBUM, escolhido, 2);

// ---------- favoritos (só no aparelho) ----------
export const favoritosDoAparelho = (): Set<string> => new Set(prefs.get().favoritosLances ?? []);

/** Liga ou desliga o ⭐ de um lance e grava no aparelho. */
export function marcarFavorito(id: string, favorito: boolean): void {
  const f = favoritosDoAparelho();
  if (favorito) f.add(id);
  else f.delete(id);
  prefs.set({ favoritosLances: [...f] });
}

// ---------- medalhas do álbum ----------
export type EstadoDasMedalhas = 'carregando' | 'ok' | 'erro';

/** Lê minhas_medalhas() uma vez por vez que o álbum abre; enquanto carrega ou se falhar, o álbum segue sem trilha. */
export function criarMedalhasDoAlbum(ler: () => Promise<readonly LinhaMedalha[]>) {
  let situacao: EstadoDasMedalhas = 'carregando';
  let mapa = new Map<string, NumerosDoLance>();
  let promessa: Promise<void> | null = null;
  const carregar = (): Promise<void> => {
    promessa ??= ler().then(
      (linhas) => {
        mapa = new Map(linhas.map((l) => [l.lance_id, { gols: l.gols, recriados: l.recriados }]));
        situacao = 'ok';
      },
      () => {
        situacao = 'erro';
      },
    );
    return promessa;
  };
  return {
    estado: () => situacao,
    mapa: () => mapa,
    carregar,
    /** Esquece o que leu (depois de uma partida) e lê de novo na próxima vez. */
    esquecer() {
      promessa = null;
      situacao = 'carregando';
    },
    /** Os números de um lance para a ficha: já lidos, a caminho (promessa) ou null se falhou. */
    paraAFicha(id: string): NumerosDoLance | null | Promise<NumerosDoLance | null> {
      const dele = () => mapa.get(id) ?? { gols: 0, recriados: 0 };
      if (situacao === 'ok') return dele();
      if (situacao === 'erro') return null;
      return carregar().then(() => (situacao === 'ok' ? dele() : null));
    },
  };
}

export type MedalhasDoAlbum = ReturnType<typeof criarMedalhasDoAlbum>;

export interface DadosDoCard {
  id: string;
  titulo: string;
  meta: string;
  pontos: string;
  faixa: string;
  estilo: string;
  favorito: boolean;
  /** null: medalhas ainda não chegaram ou falharam (card sem trilha). */
  numeros: NumerosDoLance | null;
}

/** O card do álbum: um botão que abre a ficha, com a trilha compacta embaixo do título e da meta. */
export function cardDoAlbum(d: DadosDoCard): string {
  return `<li class="lance placa filete" style="${d.estilo}">
      <button type="button" class="lance-topo lance-card" aria-haspopup="dialog" data-ficha="${esc(d.id)}">
        <span class="lance-titulo">${d.favorito ? `<span class="lance-estrela" role="img" aria-label="Favorito">${icone('estrela')}</span>` : ''}${esc(d.titulo)}</span>
        <span class="lance-meta">${esc(d.meta)}</span>
        <span class="lance-pontos faixa-${d.faixa}">${esc(d.pontos)}</span>
        ${d.numeros ? trilha(trilhaDoLance(d.numeros.gols, d.numeros.recriados), { compacta: true }) : ''}
      </button>
    </li>`;
}
