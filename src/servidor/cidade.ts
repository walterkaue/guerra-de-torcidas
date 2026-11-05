// A cidade do torcedor (docs/jogo.md, seção 3): escolher e ler. O servidor é quem guarda; este aparelho não
// guarda a cidade. Em desenvolvimento, ?cidadeFalsa=sem|com|erro troca o servidor por um de mentira.

import { ErroServidor, comTempoLimite, garantirSessao, supabase } from './api';
import { sincronizarTorcedor } from './torcedor';
import { prefs } from '../estado';
import type { Municipio } from '../jogo/cidade';

export interface CidadeEscolhida {
  codigo: number;
  nome: string;
  uf: string;
  desde: string;
}

const FALSA = import.meta.env.DEV ? new URLSearchParams(location.search).get('cidadeFalsa') : null;
export const cidadeFalsaLigada = (): boolean => FALSA !== null;

/** Cidade atual; null = sem cidade (ou sem sessão: não cria login só para olhar). */
export async function minhaCidade(): Promise<CidadeEscolhida | null> {
  if (FALSA !== null) return (await import('../dev/cidadeFalsa')).minhaCidadeFalsa(FALSA);
  const sb = await supabase();
  const { data: sessao } = await comTempoLimite(sb.auth.getSession());
  if (!sessao.session) return null;
  const { data, error } = await comTempoLimite(sb.rpc('minha_cidade'));
  if (error) throw new ErroServidor('falha');
  const linha = (Array.isArray(data) ? data[0] : data) as CidadeEscolhida | undefined;
  return linha ? { codigo: linha.codigo, nome: linha.nome, uf: linha.uf, desde: linha.desde } : null;
}

/** Grava a cidade (null tira). Erro `cidade_invalida` se o código não existe. */
export async function escolherCidade(codigo: number | null): Promise<void> {
  if (FALSA !== null) return (await import('../dev/cidadeFalsa')).escolherCidadeFalsa(FALSA, codigo);
  // Sem time não há torcedor no servidor: não cria login anônimo só para ouvir "sem_torcedor".
  if (!prefs.get().time) throw new ErroServidor('sem_torcedor');
  await garantirSessao();
  // O servidor só aceita a cidade de quem já tem torcedor gravado lá (time ou "Outro time").
  await sincronizarTorcedor().catch(() => {});
  const sb = await supabase();
  const { error } = await comTempoLimite(sb.rpc('escolher_cidade', { p_codigo: codigo }));
  if (error) {
    const codigoErro = ['cidade_invalida', 'sem_torcedor', 'sessao_encerrada', 'muitas_trocas'].find((c) => error.message.includes(c));
    throw new ErroServidor(codigoErro ?? (error.code === '42501' ? 'sessao_encerrada' : 'falha'));
  }
}

/** Lista do IBGE (public/dados/municipios.json), baixada só na tela de escolha. */
export async function baixarMunicipios(): Promise<Municipio[]> {
  const { lerLista } = await import('../jogo/cidade');
  if (FALSA !== null) return lerLista((await import('../dev/cidadeFalsa')).MUNICIPIOS_FALSOS);
  const r = await comTempoLimite(fetch(`${import.meta.env.BASE_URL}dados/municipios.json`), 15_000);
  if (!r.ok) throw new ErroServidor('falha');
  const lista = lerLista(await r.json());
  if (!lista.length) throw new ErroServidor('falha');
  return lista;
}
