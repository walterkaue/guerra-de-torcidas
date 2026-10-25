// Lógica pura da Casa do [time] (docs/casa.md): nome da casa, prateleira de troféus, datas e recordes.
// Sem DOM: testada em logica.test.ts.

import { COMPETICOES, ORDEM_GRUPOS, competicaoPorId, type Taca } from '../../dados/competicoes';
import type { CasaDoClube, EstadioCasa, MantoCasa, RecordeCasa, TituloCasa } from '../../dados/casa/tipos';
import type { Time } from '../../dados/times';

/** "Casa do Flamengo", "Casa da Chapecoense". */
export function nomeDaCasa(t: Pick<Time, 'nome' | 'artigo'>): string {
  return `Casa ${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}`;
}

/** AAAA-MM-DD → DD/MM/AAAA; AAAA-MM → MM/AAAA; AAAA fica AAAA. */
export function dataBR(d: string): string {
  const [a, m, dia] = d.split('-');
  if (dia) return `${dia}/${m}/${a}`;
  if (m) return `${m}/${a}`;
  return a ?? '';
}

export const numeroBR = (n: number): string => n.toLocaleString('pt-BR');

/** "Estádio Cícero Pompeu de Toledo (Morumbi)"; sem nome popular, só o nome. */
export function nomeDoEstadio(e: Pick<EstadioCasa, 'nome' | 'nomePopular'>): string {
  return e.nomePopular && e.nomePopular !== e.nome ? `${e.nome} (${e.nomePopular})` : e.nome;
}

export interface Prateleira {
  /** id da competição; nos estaduais, `estadual:<nome>` (um clube pode ter mais de um estadual). */
  chave: string;
  nome: string;
  taca: Taca;
  anos: number[];
  /** Títulos que o clube reivindica e a entidade não lista, com a nota neutra. */
  notas: { ano: number; nota: string }[];
}

/**
 * Agrupa os títulos por competição, na ordem da sala de troféus: mundiais, continentais,
 * nacionais, regionais e estaduais; dentro do grupo, a ordem da lista de competições.
 * O título reivindicado conta no total do próprio clube (decisão de 21/10), com a nota.
 */
export function montarPrateleiras(titulos: readonly TituloCasa[]): Prateleira[] {
  const porChave = new Map<string, Prateleira & { ordem: number }>();
  for (const t of titulos) {
    const comp = competicaoPorId(t.competicao);
    if (!comp) continue;
    const estadual = comp.id === 'estadual';
    const nomeEstadual = estadual ? estadualDaNota(t.nota) : '';
    const chave = estadual ? `estadual:${nomeEstadual}` : comp.id;
    if (!porChave.has(chave)) {
      porChave.set(chave, {
        chave,
        nome: estadual ? nomeEstadual : comp.nome,
        taca: comp.taca,
        anos: [],
        notas: [],
        ordem: ORDEM_GRUPOS.indexOf(comp.grupo) * 100 + COMPETICOES.indexOf(comp),
      });
    }
    const p = porChave.get(chave)!;
    p.anos.push(t.ano);
    const nota = estadual ? t.nota.replace(nomeEstadual, '').replace(/^\s*\((.*)\)\s*$/, '$1').trim() : t.nota;
    if (!t.oficial || nota) p.notas.push({ ano: t.ano, nota });
  }
  return [...porChave.values()]
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
    .map(({ ordem: _ordem, ...p }) => ({ ...p, anos: [...p.anos].sort((x, y) => x - y), notas: p.notas.sort((x, y) => x.ano - y.ano) }));
}

/** Nos estaduais, a nota começa pelo nome do campeonato ("Campeonato Paulista (título dividido…)"). */
function estadualDaNota(nota: string): string {
  return nota.replace(/\s*\(.*\)\s*$/, '').trim() || 'Campeonato estadual';
}

/** Total de títulos (conta os reivindicados, como a Casa mostra). */
export const totalDeTitulos = (p: readonly Prateleira[]): number => p.reduce((s, x) => s + x.anos.length, 0);

/** Data mais recente das listas de recordes ("até DD/MM/AAAA"). */
export function dataDosRecordes(r: CasaDoClube['recordes']): string {
  const datas = [...r.gols, ...r.jogos].map((x: RecordeCasa) => x.dataReferencia).sort();
  return datas.length ? dataBR(datas[datas.length - 1]) : '';
}

/** Manto principal: o do período "tradicional" (ou o de menor ordem); os outros vão para o varal. */
export function separarMantos<M extends Pick<MantoCasa, 'ordem' | 'periodo'>>(mantos: readonly M[]): { principal?: M; varal: M[] } {
  const ordenados = [...mantos].sort((a, b) => a.ordem - b.ordem);
  const principal = ordenados.find((m) => m.periodo === 'tradicional') ?? ordenados[0];
  return { principal, varal: ordenados.filter((m) => m !== principal) };
}

/** "lance.com.br · maior-goleada-da-historia-do-cruzeiro": domínio e o fim do endereço, para distinguir páginas. */
export function rotuloDaFonte(url: string): string {
  try {
    const u = new URL(url);
    const fim = u.pathname.split('/').filter(Boolean).pop()?.replace(/\.(s?html?|php|aspx?)$/, '') ?? '';
    const curto = fim.length > 42 ? `${fim.slice(0, 40)}…` : fim;
    return curto ? `${dominio(url)} · ${decodeURIComponent(curto)}` : dominio(url);
  } catch {
    return url;
  }
}

/** Domínio curto para a lista de fontes ("lance.com.br"). */
export function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
