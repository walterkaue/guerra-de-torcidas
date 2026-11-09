// O caminho do boneco montável (docs/jogo.md, seção 14.5), sem Supabase: quem fala com o banco é o index.ts, pelos
// `Servicos`. Separado para o teste rodar contra o SQL de verdade (supabase/testes/boneco.test.ts).
//
// A regra das peças é a de src/jogo/vestiario.ts (cópia em _shared, npm run compartilhar), num lugar só. Os dados
// vêm do que o servidor já guarda (boneco_estado): XP da Carreira, medalhas por item e o Aquecimento. A Seleção sai
// do catálogo do servidor. Nada do que o celular calcula é confiado: ele manda só a vestimenta que quer vestir.

import { nivelDe } from '../_shared/jogo/carreira.ts';
import { ID_SELECAO } from '../_shared/jogo/disputas.ts';
import {
  conferirFormato,
  pecasLiberadas,
  proximaPeca,
  sortearDoComeco,
  validar,
  type EstadoDoVestiario,
  type MedalhaDoItem,
  type Vestimenta,
} from '../_shared/jogo/vestiario.ts';
import { DISPUTAS } from '../_shared/dados/disputas.ts';
import { LANCES } from '../_shared/dados/lances.ts';

export class ErroBoneco extends Error {
  constructor(
    public status: number,
    public codigo: string,
  ) {
    super(codigo);
  }
}

export interface Servicos {
  rpc(nome: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message?: string } | null }>;
  /** Número em [0, 1) para o sorteio da conta nova. */
  sortear(): number;
}

/** O que meu_boneco e salvar_boneco devolvem ao aparelho. */
export interface RespostaBoneco {
  vestimenta: Vestimenta;
  /** Ids das peças liberadas (src/jogo/vestiario.ts, PECAS), as do começo inclusive. */
  liberadas: string[];
  /** A próxima peça a liberar, para o bloco do Perfil; null quando todas já liberaram. */
  proxima: { id: string; condicao: string } | null;
  /** O interruptor "Meu boneco em campo" do Perfil (docs/jogo.md 14.5, "Boneco em campo"); ligado por padrão. */
  emCampo: boolean;
}

export interface RespostaSalvar extends RespostaBoneco {
  /** Alguma peça trancada voltou ao padrão antes de gravar. */
  trocou: boolean;
}

interface MedalhaDoBanco {
  item: string;
  gols: number;
  recriados: number;
  vitorias: number;
}

interface EstadoDoBanco {
  vestimenta: unknown;
  /** null quando ainda não há boneco (o padrão é ligado). */
  em_campo?: boolean | null;
  xp: number;
  aquecido: boolean;
  medalhas: MedalhaDoBanco[];
}

const PREFIXO_DISPUTA = 'penaltis:';
const CLUBE_DO_LANCE = new Map(LANCES.map((l) => [l.id, l.clube]));
const CLUBE_DA_DISPUTA = new Map(DISPUTAS.map((d) => [d.id, d.clube]));

/** Monta o estado da regra a partir do banco. Item fora do catálogo conta medalha, mas não é da Seleção. */
export function estadoDoVestiario(b: EstadoDoBanco): EstadoDoVestiario {
  const medalhas: MedalhaDoItem[] = (Array.isArray(b.medalhas) ? b.medalhas : []).map((m) => {
    const item = String(m.item);
    const disputa = item.startsWith(PREFIXO_DISPUTA);
    const clube = disputa ? CLUBE_DA_DISPUTA.get(item.slice(PREFIXO_DISPUTA.length)) : CLUBE_DO_LANCE.get(item);
    return {
      tipo: disputa ? 'disputa' : 'lance',
      gols: Number(m.gols) || 0,
      recriados: Number(m.recriados) || 0,
      vitorias: Number(m.vitorias) || 0,
      daSelecao: clube === ID_SELECAO,
    };
  });
  return { nivel: nivelDe(Number(b.xp) || 0).indice, medalhas, aquecido: b.aquecido === true };
}

const ERROS: Record<string, [number, string]> = {
  sessao: [401, 'sessao'],
  sem_torcedor: [404, 'sem_torcedor'],
  limite: [429, 'limite'],
  sem_boneco: [409, 'sem_boneco'],
};

/** O que boneco_em_campo devolve à função: o interruptor como ficou gravado. */
export interface RespostaEmCampo {
  emCampo: boolean;
}

async function chamar(s: Servicos, nome: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await s.rpc(nome, args);
  // A mensagem do banco vai só para o log da função (servir responde 500 interno, sem detalhe).
  if (error || !data || typeof data !== 'object') throw new Error(`${nome} falhou: ${error?.message ?? 'sem resposta'}`);
  const r = data as Record<string, unknown>;
  if (typeof r.erro === 'string') {
    const [status, codigo] = ERROS[r.erro] ?? [500, 'interno'];
    throw new ErroBoneco(status, codigo);
  }
  return r;
}

function resposta(vestimenta: unknown, estado: EstadoDoVestiario, emCampo: unknown): RespostaBoneco {
  const liberadas = pecasLiberadas(estado);
  const p = proximaPeca(estado);
  // Revalida também na leitura: o que está gravado já passou pela regra, mas nunca sai do servidor fora dela.
  return {
    vestimenta: validar(vestimenta, liberadas),
    liberadas,
    proxima: p ? { id: p.peca.id, condicao: p.condicao } : null,
    emCampo: emCampo !== false,
  };
}

/** A vestimenta da própria pessoa, o que ela tem liberado e a próxima peça. Conta sem boneco ganha o sorteado. */
export async function meuBoneco(s: Servicos, uid: string, sessao: string): Promise<RespostaBoneco> {
  const args = { p_torcedor: uid, p_sessao: sessao };
  const banco = (await chamar(s, 'boneco_estado', args)) as unknown as EstadoDoBanco;
  let guardada = banco.vestimenta;
  if (guardada === null || guardada === undefined) {
    const criado = await chamar(s, 'boneco_criar', { ...args, p_vestimenta: sortearDoComeco(s.sortear) });
    guardada = criado.vestimenta;
  }
  return resposta(guardada, estadoDoVestiario(banco), banco.em_campo);
}

/**
 * Grava a vestimenta pedida. Formato fora do catálogo é recusado (400 formato); peça trancada volta à padrão sem erro.
 * O que está liberado é calculado aqui, com os dados do banco, nunca com o que o aparelho diz.
 */
export async function salvarBoneco(s: Servicos, uid: string, sessao: string, corpo: Record<string, unknown>): Promise<RespostaSalvar> {
  const pedida = corpo.vestimenta;
  if (!conferirFormato(pedida)) throw new ErroBoneco(400, 'formato');
  const args = { p_torcedor: uid, p_sessao: sessao };
  const banco = (await chamar(s, 'boneco_estado', args)) as unknown as EstadoDoBanco;
  const estado = estadoDoVestiario(banco);
  // Site antigo manda sem `barra` (o formato de antes): fica a barra já gravada ('fora' sem boneco), e isso não é
  // troca de peça. Barra não é peça: o `validar` só confere se é do catálogo.
  const completa: Vestimenta = { barra: validar(banco.vestimenta, []).barra, ...pedida };
  const final = validar(completa, pecasLiberadas(estado));
  const trocou = (Object.keys(final) as (keyof Vestimenta)[]).some((k) => final[k] !== completa[k]);
  const gravado = await chamar(s, 'boneco_gravar', { ...args, p_vestimenta: final });
  return { ...resposta(gravado.vestimenta, estado, banco.em_campo), trocou };
}

/**
 * Liga ou desliga o boneco em campo (o interruptor do Perfil). Vale também para o X1: com ele desligado, quem recebe
 * um desafio vê batedores sorteados e nenhum busto. Conta no mesmo limite por hora do salvar. Conta sem boneco
 * ganha o sorteado antes (como na primeira leitura), para o interruptor ter onde ficar.
 */
export async function ligarEmCampo(s: Servicos, uid: string, sessao: string, corpo: Record<string, unknown>): Promise<RespostaEmCampo> {
  if (typeof corpo.ligado !== 'boolean') throw new ErroBoneco(400, 'formato');
  const args = { p_torcedor: uid, p_sessao: sessao, p_ligado: corpo.ligado };
  let r: Record<string, unknown>;
  try {
    r = await chamar(s, 'boneco_em_campo', args);
  } catch (e) {
    if (!(e instanceof ErroBoneco && e.codigo === 'sem_boneco')) throw e;
    await chamar(s, 'boneco_criar', { p_torcedor: uid, p_sessao: sessao, p_vestimenta: sortearDoComeco(s.sortear) });
    r = await chamar(s, 'boneco_em_campo', args);
  }
  return { emCampo: r.em_campo === true };
}
