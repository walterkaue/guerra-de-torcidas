// Tipos do validador de perguntas (validar.mjs), para o painel #admin importar em TypeScript.

export interface LinhaPergunta {
  id: string;
  clube: string;
  degrau: string;
  tema: string;
  pergunta: string;
  certa: string;
  errada1: string;
  errada2: string;
  errada3: string;
  fonte: string;
  fonte2: string;
  verificada_em: string;
  status: string;
}

export const MAX_PERGUNTA: number;
export const MAX_ALTERNATIVA: number;
export function validarPergunta(p: LinhaPergunta): string[];
