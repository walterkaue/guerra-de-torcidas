// Preferências do jogador guardadas só neste aparelho (time, apelido, som).
// Nada aqui é obrigatório; tudo tem valor padrão.

import type { EstadoDoAquecimento } from './jogo/aquecimento';
import type { EstadoDasDicas } from './jogo/dicas';
import { ehFaixa, type FaixaEtaria } from './jogo/faixaEtaria';

const CHAVE = 'gdt:prefs';

/** Tamanho máximo do apelido (seção 3 do jogo.md). */
export const APELIDO_MAX = 20;

interface Prefs {
  time?: string;
  apelido?: string;
  mudo?: boolean;
  /** Gráficos: automático (padrão) ou um nível fixo (telas/qualidade.ts). */
  qualidade?: 'auto' | 'alta' | 'media' | 'leve';
  /** Desligou a vibração (telas/toque.ts). */
  semVibracao?: boolean;
  /** Escolheu mostrar o nível da carreira nos cards. */
  nivelNoCard?: boolean;
  /** "time|apelido" que o servidor já tem (para não regravar à toa). */
  sincronizado?: string;
  /** Resposta da triagem (docs/jogo.md, seção 13). Nunca aparece na tela nem no card. */
  faixa?: FaixaEtaria;
  /** Faixa que o servidor já tem (para não regravar à toa). */
  faixaSincronizada?: FaixaEtaria;
  /** Versão dos Termos que este aparelho já viu (jogo/termos.ts, avisoDosTermos). */
  termosVistos?: string;
  /** Dia (aaaa-mm-dd) em que o convite "Defende sua cidade também?" apareceu neste aparelho (uma vez só). */
  cidadeConvite?: string;
  /** Aquecimento (jogo.md, 14.4): andamento, se já viu, selo e desfecho por mandar. Uma vez por aparelho. */
  aquecimento?: EstadoDoAquecimento;
  /** Dicas da faixa de instrução já vistas e contadores de gatilho (jogo/dicas.ts). */
  dicas?: EstadoDasDicas;
  /** Este aparelho perdeu a conta (desconectado em outro aparelho ou conta apagada): a escolha do time avisa uma vez. */
  saiuDaConta?: boolean;
  /** Lances favoritos do álbum (jogo.md, 14.3): só neste aparelho, nunca vão para o servidor. */
  favoritosLances?: string[];
  /** Dia (AAAA-MM-DD) em que a Home lembrou da cidade pela última vez: no máximo 1 vez por semana. */
  cidadeLembrete?: string;
}

function ler(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Prefs;
  } catch {
    return {};
  }
}

function gravar(p: Prefs): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    // aba anônima ou armazenamento bloqueado: segue sem lembrar
  }
}

export const prefs = {
  get: ler,
  set(parcial: Prefs) {
    gravar({ ...ler(), ...parcial });
  },
};

// Sem armazenamento no aparelho, a resposta vale até fechar a aba (senão a triagem voltaria a cada tela).
let faixaDaAba: FaixaEtaria | undefined;

export function faixaDoAparelho(): FaixaEtaria | undefined {
  const faixa = ler().faixa;
  return ehFaixa(faixa) ? faixa : faixaDaAba;
}

export function guardarFaixa(faixa: FaixaEtaria): void {
  faixaDaAba = faixa;
  prefs.set({ faixa });
}

/**
 * Este aparelho deixa de ser o torcedor que era (saiu da conta, ou entrou em outra pelo código; jogo.md, 14.1):
 * esquece time, apelido e faixa, como um aparelho novo. Som e gráficos ficam.
 */
export function esquecerTorcedor(): void {
  faixaDaAba = undefined;
  prefs.set({ time: undefined, apelido: undefined, faixa: undefined, sincronizado: undefined, faixaSincronizada: undefined });
  // O que o aparelho guardou da conta de antes (XP visto, posições, duelo da Home): não vale para a conta nova.
  for (const chave of ['gdt:carreira', 'gdt:posicoes', 'gdt:minha-posicao', 'gdt:duelo']) {
    try {
      localStorage.removeItem(chave);
    } catch {
      // armazenamento bloqueado: não há o que limpar
    }
  }
}

/** Tudo o que o jogo guarda: as chaves gdt, mais a sessão do Supabase (sb-). */
export function chaveDoJogo(chave: string): boolean {
  return chave.startsWith('gdt') || chave.startsWith('sb-');
}

/** "Apagar meus dados": o aparelho volta a ser de quem nunca jogou. */
export function limparAparelho(): void {
  faixaDaAba = undefined;
  for (const armazem of ['localStorage', 'sessionStorage'] as const) {
    try {
      const guardado = window[armazem];
      for (const chave of Object.keys(guardado).filter(chaveDoJogo)) guardado.removeItem(chave);
    } catch {
      // armazenamento bloqueado: não há o que limpar
    }
  }
}
