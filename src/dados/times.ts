// Times oficiais: Série A 2026 + "Outro time". Só nome, 2 cores, artigo e rival.
// O id é estável (vai para o banco na etapa 3); nunca renomeie um id já publicado.

import type { Artigo } from '../narrador/escolher';

export interface Time {
  id: string;
  nome: string;
  /** Cor principal e cor de apoio. */
  cores: [string, string];
  /** 3ª cor opcional: filete entre as duas cores no card do time (faixa de placar). */
  cor3?: string;
  /** "o" ou "a": o narrador usa para acertar do/da, pro/pra. */
  artigo: Artigo;
  /**
   * Id do clássico. null = sem clássico na lista: o rival passa a ser o vizinho no
   * ranking geral da semana (seções 5 e 8 do jogo.md). Não precisa ser recíproco.
   */
  rival: string | null;
  uf?: string;
}

export const ID_OUTRO = 'outro';

export const TIMES: Time[] = [
  { id: 'athletico-pr', nome: 'Athletico-PR', cores: ['#c8102e', '#111111'], artigo: 'o', rival: 'coritiba', uf: 'PR' },
  { id: 'atletico-mg', nome: 'Atlético-MG', cores: ['#111111', '#ffffff'], artigo: 'o', rival: 'cruzeiro', uf: 'MG' },
  { id: 'bahia', nome: 'Bahia', cores: ['#0050a0', '#d4002a'], cor3: '#ffffff', artigo: 'o', rival: 'vitoria', uf: 'BA' },
  { id: 'botafogo', nome: 'Botafogo', cores: ['#111111', '#ffffff'], artigo: 'o', rival: 'flamengo', uf: 'RJ' },
  { id: 'bragantino', nome: 'Bragantino', cores: ['#ffffff', '#d4002a'], artigo: 'o', rival: null, uf: 'SP' },
  { id: 'chapecoense', nome: 'Chapecoense', cores: ['#00843d', '#ffffff'], artigo: 'a', rival: null, uf: 'SC' },
  { id: 'corinthians', nome: 'Corinthians', cores: ['#111111', '#ffffff'], artigo: 'o', rival: 'palmeiras', uf: 'SP' },
  { id: 'coritiba', nome: 'Coritiba', cores: ['#00544f', '#ffffff'], artigo: 'o', rival: 'athletico-pr', uf: 'PR' },
  { id: 'cruzeiro', nome: 'Cruzeiro', cores: ['#003da5', '#ffffff'], artigo: 'o', rival: 'atletico-mg', uf: 'MG' },
  { id: 'flamengo', nome: 'Flamengo', cores: ['#c8102e', '#111111'], artigo: 'o', rival: 'fluminense', uf: 'RJ' },
  { id: 'fluminense', nome: 'Fluminense', cores: ['#7a1c2e', '#006341'], cor3: '#ffffff', artigo: 'o', rival: 'flamengo', uf: 'RJ' },
  { id: 'gremio', nome: 'Grêmio', cores: ['#0d80bf', '#111111'], cor3: '#ffffff', artigo: 'o', rival: 'internacional', uf: 'RS' },
  { id: 'internacional', nome: 'Internacional', cores: ['#e30613', '#ffffff'], artigo: 'o', rival: 'gremio', uf: 'RS' },
  { id: 'mirassol', nome: 'Mirassol', cores: ['#ffd200', '#00843d'], artigo: 'o', rival: null, uf: 'SP' },
  { id: 'palmeiras', nome: 'Palmeiras', cores: ['#006437', '#ffffff'], artigo: 'o', rival: 'corinthians', uf: 'SP' },
  { id: 'remo', nome: 'Remo', cores: ['#0b2a5b', '#ffffff'], artigo: 'o', rival: null, uf: 'PA' },
  { id: 'santos', nome: 'Santos', cores: ['#ffffff', '#111111'], artigo: 'o', rival: 'corinthians', uf: 'SP' },
  { id: 'sao-paulo', nome: 'São Paulo', cores: ['#ffffff', '#e30613'], cor3: '#111111', artigo: 'o', rival: 'palmeiras', uf: 'SP' },
  { id: 'vasco', nome: 'Vasco', cores: ['#111111', '#ffffff'], artigo: 'o', rival: 'flamengo', uf: 'RJ' },
  { id: 'vitoria', nome: 'Vitória', cores: ['#e30613', '#111111'], artigo: 'o', rival: 'bahia', uf: 'BA' },
  { id: ID_OUTRO, nome: 'Outro time', cores: ['#6b7280', '#f5f5f0'], artigo: 'o', rival: null },
];

export function timePorId(id: string | null | undefined): Time | undefined {
  return TIMES.find((t) => t.id === id);
}

/** "pro Flamengo" / "pra Chapecoense"; null para "Outro time". */
export function proTime(t: Time): string | null {
  if (t.id === ID_OUTRO) return null;
  return `${t.artigo === 'a' ? 'pra' : 'pro'} ${t.nome}`;
}

export function rivalDe(t: Time): Time | undefined {
  return t.rival ? timePorId(t.rival) : undefined;
}

/** Cor de texto legível sobre a cor principal do time. */
export function corDeTexto(fundo: string): string {
  const n = parseInt(fundo.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111111' : '#ffffff';
}
