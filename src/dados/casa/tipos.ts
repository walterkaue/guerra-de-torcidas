// Tipos da Casa do [time] (docs/casa.md). O módulo dados.gerado.ts é GERADO por
// scripts/casa/importar.mjs a partir de dados/casa/*.csv: só entram linhas "revisada" ou "ativa".

export type FormatoEstadio = 'oval' | 'retangular' | 'ferradura';
export type PadraoManto = 'lisa' | 'listras-v' | 'aros' | 'faixa-diagonal' | 'faixa-peito';

export interface EstadioCasa {
  nome: string;
  nomePopular: string;
  /** AAAA, AAAA-MM ou AAAA-MM-DD */
  inauguracao: string;
  capacidade: number | null;
  formato: FormatoEstadio;
  /** "105 x 68" quando há fonte; vazio quando não. */
  gramado: string;
  recorde: null | {
    publico: number;
    tipo: 'pagante' | 'presente';
    /** Pode vir vazio (ex.: placar de derrota fica de fora). */
    partida: string;
    data: string;
  };
  fonte: string;
  fonteCapacidade: string;
  fonteRecorde: string;
}

export interface TituloCasa {
  competicao: string;
  ano: number;
  /** false = o clube reivindica e a entidade não lista (conta no total do próprio clube, com a nota). */
  oficial: boolean;
  nota: string;
  fonte: string;
}

export interface RecordeCasa {
  /** 1 a 3; empate repete a posição. */
  posicao: number;
  nome: string;
  valor: number;
  /** AAAA-MM-DD */
  dataReferencia: string;
  fonte: string;
}

export interface GoleadaCasa {
  placar: string;
  adversario: string;
  /** AAAA, AAAA-MM ou AAAA-MM-DD */
  data: string;
  competicao: string;
  fonte: string;
}

export interface MantoCasa {
  ordem: number;
  periodo: string;
  padrao: PadraoManto;
  /** Hex, na ordem do desenho. */
  cores: string[];
  /** Número aproximado de listras; null quando não há fonte. */
  listras: number | null;
  descricao: string;
  fonte: string;
}

/** Programa oficial de sócio torcedor ("Seja sócio", docs/jogo.md 7.4). */
export interface SocioDoClube {
  programa: string;
  url: string;
}

export interface CasaDoClube {
  id: string;
  /** AAAA-MM-DD */
  fundacao: string;
  cidade: string;
  uf: string;
  apelidos: string[];
  historiaCores: string;
  estadio: EstadioCasa | null;
  titulos: TituloCasa[];
  recordes: { gols: RecordeCasa[]; jogos: RecordeCasa[] };
  goleadas: GoleadaCasa[];
  mantos: MantoCasa[];
  /** Todos os links usados, sem repetir (para "ver fontes"). */
  fontes: string[];
  /** Data da última conferência (AAAA-MM-DD): "Dados até …". */
  dadosAte: string;
}
