// Só em desenvolvimento (?cidadeFalsa=sem|com|erro): imita minha_cidade e escolher_cidade, com uma lista pequena.
// Nunca entra no build de produção (import atrás de import.meta.env.DEV).

import { ErroServidor } from '../servidor/api';
import type { CidadeEscolhida } from '../servidor/cidade';

export const MUNICIPIOS_FALSOS: [number, string, string][] = [
  [3509502, 'Campinas', 'SP'],
  [3510609, 'Caraguatatuba', 'SP'],
  [3304557, 'Rio de Janeiro', 'RJ'],
  [4314902, 'Porto Alegre', 'RS'],
  [4106902, 'Santa Maria', 'RS'],
  [5006200, 'Santa Maria', 'DF'],
  [3550308, 'São Paulo', 'SP'],
  [2927408, 'São Francisco do Conde', 'BA'],
  [2927408 + 1, 'São Luís', 'MA'],
];

let atual: CidadeEscolhida | null | undefined;
const espera = <T>(v: T, ms = 250) => new Promise<T>((ok) => setTimeout(() => ok(v), ms));

export async function minhaCidadeFalsa(modo: string): Promise<CidadeEscolhida | null> {
  if (modo === 'erro') throw new ErroServidor('falha');
  atual ??= modo === 'com' ? { codigo: 3510609, nome: 'Caraguatatuba', uf: 'SP', desde: new Date().toISOString() } : null;
  return espera(atual);
}

export async function escolherCidadeFalsa(modo: string, codigo: number | null): Promise<void> {
  if (modo === 'erro') throw new ErroServidor('falha');
  await minhaCidadeFalsa(modo);
  const m = MUNICIPIOS_FALSOS.find((x) => x[0] === codigo);
  if (codigo !== null && !m) throw new ErroServidor('cidade_invalida');
  atual = m ? { codigo: m[0], nome: m[1], uf: m[2], desde: new Date().toISOString() } : null;
  await espera(undefined);
}
