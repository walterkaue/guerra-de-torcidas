// Preferências do jogador guardadas só neste aparelho (time, apelido, som).
// Nada aqui é obrigatório; tudo tem valor padrão.

const CHAVE = 'gdt:prefs';

/** Tamanho máximo do apelido (seção 3 do jogo.md). */
export const APELIDO_MAX = 20;

interface Prefs {
  time?: string;
  apelido?: string;
  mudo?: boolean;
  /** "time|apelido" que o servidor já tem (para não regravar à toa). */
  sincronizado?: string;
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
