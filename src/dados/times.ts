// Times oficiais: Série A 2026 + "Outro time". Só nome e cores, nada de escudo.
// O id é estável (vai para o banco na etapa 3); nunca renomeie um id já publicado.

export interface Time {
  id: string;
  nome: string;
  /** Cores principais, da mais forte para a de apoio. */
  cores: [string, string] | [string, string, string];
  uf?: string;
}

export const TIMES: Time[] = [
  { id: 'athletico-pr', nome: 'Athletico-PR', cores: ['#c8102e', '#111111'], uf: 'PR' },
  { id: 'atletico-mg', nome: 'Atlético-MG', cores: ['#111111', '#ffffff'], uf: 'MG' },
  { id: 'bahia', nome: 'Bahia', cores: ['#0050a0', '#d4002a', '#ffffff'], uf: 'BA' },
  { id: 'botafogo', nome: 'Botafogo', cores: ['#111111', '#ffffff'], uf: 'RJ' },
  { id: 'bragantino', nome: 'Bragantino', cores: ['#ffffff', '#d4002a'], uf: 'SP' },
  { id: 'chapecoense', nome: 'Chapecoense', cores: ['#00843d', '#ffffff'], uf: 'SC' },
  { id: 'corinthians', nome: 'Corinthians', cores: ['#111111', '#ffffff'], uf: 'SP' },
  { id: 'coritiba', nome: 'Coritiba', cores: ['#00544f', '#ffffff'], uf: 'PR' },
  { id: 'cruzeiro', nome: 'Cruzeiro', cores: ['#003da5', '#ffffff'], uf: 'MG' },
  { id: 'flamengo', nome: 'Flamengo', cores: ['#c8102e', '#111111'], uf: 'RJ' },
  { id: 'fluminense', nome: 'Fluminense', cores: ['#7a1c2e', '#006341', '#ffffff'], uf: 'RJ' },
  { id: 'gremio', nome: 'Grêmio', cores: ['#0d80bf', '#111111', '#ffffff'], uf: 'RS' },
  { id: 'internacional', nome: 'Internacional', cores: ['#e30613', '#ffffff'], uf: 'RS' },
  { id: 'mirassol', nome: 'Mirassol', cores: ['#ffd200', '#00843d'], uf: 'SP' },
  { id: 'palmeiras', nome: 'Palmeiras', cores: ['#006437', '#ffffff'], uf: 'SP' },
  { id: 'remo', nome: 'Remo', cores: ['#0b2a5b', '#ffffff'], uf: 'PA' },
  { id: 'santos', nome: 'Santos', cores: ['#ffffff', '#111111'], uf: 'SP' },
  { id: 'sao-paulo', nome: 'São Paulo', cores: ['#ffffff', '#e30613', '#111111'], uf: 'SP' },
  { id: 'vasco', nome: 'Vasco', cores: ['#111111', '#ffffff'], uf: 'RJ' },
  { id: 'vitoria', nome: 'Vitória', cores: ['#e30613', '#111111'], uf: 'BA' },
  { id: 'outro', nome: 'Outro time', cores: ['#6b7280', '#f5f5f0'] },
];

export function timePorId(id: string | null | undefined): Time | undefined {
  return TIMES.find((t) => t.id === id);
}

/** Cor de texto legível sobre a cor principal do time. */
export function corDeTexto(fundo: string): string {
  const n = parseInt(fundo.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111111' : '#ffffff';
}
