// Competições da Casa do [time] (docs/casa.md, seção 6). O dado aponta para o id; o nome sai daqui.
// Nome da entidade organizadora, sem patrocinador. O id é estável: os CSVs de dados/casa/ apontam para ele.

export type Taca = 'ouro' | 'prata' | 'bronze';
/** Ordem da prateleira: mundiais, continentais, nacionais, regionais, estaduais. */
export type GrupoCompeticao = 'mundial' | 'continental' | 'nacional' | 'regional' | 'estadual';

export interface Competicao {
  id: string;
  nome: string;
  entidade: string;
  taca: Taca;
  grupo: GrupoCompeticao;
}

export const COMPETICOES: readonly Competicao[] = [
  { id: 'mundial-clubes', nome: 'Copa do Mundo de Clubes da FIFA', entidade: 'FIFA', taca: 'ouro', grupo: 'mundial' },
  { id: 'intercontinental', nome: 'Copa Intercontinental (reconhecida pela FIFA como título mundial)', entidade: 'FIFA', taca: 'ouro', grupo: 'mundial' },
  { id: 'libertadores', nome: 'CONMEBOL Libertadores', entidade: 'CONMEBOL', taca: 'ouro', grupo: 'continental' },
  { id: 'sul-americana', nome: 'CONMEBOL Sul-Americana', entidade: 'CONMEBOL', taca: 'ouro', grupo: 'continental' },
  { id: 'recopa', nome: 'CONMEBOL Recopa', entidade: 'CONMEBOL', taca: 'ouro', grupo: 'continental' },
  { id: 'copa-conmebol', nome: 'Copa CONMEBOL (1992–1999)', entidade: 'CONMEBOL', taca: 'ouro', grupo: 'continental' },
  { id: 'supercopa-libertadores', nome: 'Supercopa Libertadores (1988–1997)', entidade: 'CONMEBOL', taca: 'ouro', grupo: 'continental' },
  { id: 'brasileiro-a', nome: 'Campeonato Brasileiro Série A', entidade: 'CBF', taca: 'ouro', grupo: 'nacional' },
  { id: 'copa-do-brasil', nome: 'Copa do Brasil', entidade: 'CBF', taca: 'prata', grupo: 'nacional' },
  { id: 'supercopa-do-brasil', nome: 'Supercopa do Brasil', entidade: 'CBF', taca: 'prata', grupo: 'nacional' },
  { id: 'copa-do-nordeste', nome: 'Copa do Nordeste', entidade: 'CBF', taca: 'prata', grupo: 'regional' },
  { id: 'copa-verde', nome: 'Copa Verde', entidade: 'CBF', taca: 'prata', grupo: 'regional' },
  { id: 'brasileiro-b', nome: 'Campeonato Brasileiro Série B', entidade: 'CBF', taca: 'bronze', grupo: 'nacional' },
  { id: 'brasileiro-c', nome: 'Campeonato Brasileiro Série C', entidade: 'CBF', taca: 'bronze', grupo: 'nacional' },
  { id: 'brasileiro-d', nome: 'Campeonato Brasileiro Série D', entidade: 'CBF', taca: 'bronze', grupo: 'nacional' },
  { id: 'estadual', nome: 'Campeonato estadual', entidade: 'Federação estadual', taca: 'bronze', grupo: 'estadual' },
];

export const ORDEM_GRUPOS: readonly GrupoCompeticao[] = ['mundial', 'continental', 'nacional', 'regional', 'estadual'];

export const IDS_COMPETICAO: readonly string[] = COMPETICOES.map((c) => c.id);

export function competicaoPorId(id: string): Competicao | undefined {
  return COMPETICOES.find((c) => c.id === id);
}
