// Últimas frases vistas neste aparelho, para o narrador não ficar repetitivo entre partidas.

const CHAVE = 'gdt:narrador:recentes';
export const MAX_RECENTES = 30;

export function lerRecentes(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function registrarVista(id: string): void {
  try {
    const lista = [id, ...lerRecentes().filter((x) => x !== id)].slice(0, MAX_RECENTES);
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // armazenamento bloqueado: segue sem lembrar
  }
}
