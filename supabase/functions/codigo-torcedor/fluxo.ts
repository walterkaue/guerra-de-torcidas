// O caminho do código do torcedor (docs/jogo.md, seção 14.1), sem Supabase nem Cloudflare: quem fala com eles é o
// index.ts, pelos `Servicos`. Separado para o teste conferir a ordem (supabase/testes/codigoFluxo.test.ts).
//
// A ordem importa: o passe de uso único da conta do dono sai ANTES da junção. Se o passe falhar, nada foi juntado
// e o aparelho continua com a conta antiga. Se a junção falhar, o passe não sai daqui e vence sozinho.
// O código nunca é impresso nem gravado: só a impressão digital vai para o banco.

import { ehEmailTecnico, emailTecnicoDe, impressaoDoCodigo, normalizarCodigo, sortearCodigo } from '../_shared/jogo/codigoTorcedor.ts';

export class ErroCodigo extends Error {
  constructor(
    public status: number,
    public codigo: string,
  ) {
    super(codigo);
  }
}

interface ErroRpc {
  code?: string;
  message?: string;
}

export interface Servicos {
  /** Turnstile: true se a Cloudflare confirmou; 'sem_chave' se a chave secreta não está nas funções. */
  captcha(token: unknown): Promise<boolean | 'sem_chave'>;
  rpc(nome: string, args: Record<string, unknown>): Promise<{ data: unknown; error: ErroRpc | null }>;
  /** E-mail da conta (null se for anônima e nunca ligada). */
  emailDe(uid: string): Promise<string | null>;
  /** Dá à conta o e-mail técnico, já confirmado (sem mandar e-mail nenhum). */
  darEmail(uid: string, email: string): Promise<void>;
  /**
   * Passe de uso único (hashed_token do link mágico) da conta `dono`, que tem esse e-mail. Recusa se o link sair
   * para outra conta: com e-mail que não existe, o Auth cria uma conta nova em vez de dar erro.
   */
  passe(email: string, dono: string): Promise<string>;
  sortear(n: number): number;
  /** Segredo das funções para as impressões dos códigos e o e-mail técnico (nunca sai do servidor). */
  segredo: string;
}

export interface TorcedorJuntado {
  time_id: string;
  apelido: string | null;
  faixa_etaria: string | null;
}

export type RespostaEntrar =
  | { etapa: 'escolher_time'; timeDono: string; timeSeu: string }
  | { etapa: 'pronto'; tokenHash: string; torcedor: TorcedorJuntado | null };

const ERROS_GERAR: Record<string, number> = { sem_time: 409, muitos_codigos: 429, conta_nao_anonima: 403 };
const ERROS_JUNTAR: Record<string, number> = { codigo_invalido: 400, proprio: 409, conta_nao_anonima: 403, escolher_time: 409 };

function erroConhecido(error: ErroRpc, tabela: Record<string, number>): ErroCodigo | null {
  const codigo = Object.keys(tabela).find((c) => error.message?.includes(c));
  return codigo ? new ErroCodigo(tabela[codigo], codigo) : null;
}

/** Sorteia o código de `uid` e grava só a impressão. Impressão repetida (1 em centenas de bilhões): sorteia outro. */
export async function gerar(s: Servicos, uid: string): Promise<{ codigo: string; expiraEm: string }> {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const codigo = sortearCodigo(s.sortear);
    const { data, error } = await s.rpc('codigo_gerar', { p_dono: uid, p_impressao: await impressaoDoCodigo(codigo, s.segredo) });
    if (!error) return { codigo, expiraEm: String(data) };
    if (error.code === '23505') continue;
    throw erroConhecido(error, ERROS_GERAR) ?? new Error('codigo_gerar falhou');
  }
  throw new Error('codigo_gerar: impressão repetida 3 vezes');
}

/**
 * Confere o código digitado no aparelho `uid` e, se valer, junta a conta dele à do dono do código. Volta pedindo
 * a escolha do time quando os dois têm times diferentes e `time` não é um deles.
 */
export async function entrar(s: Servicos, uid: string, corpo: Record<string, unknown>): Promise<RespostaEntrar> {
  // CAPTCHA antes de tudo: sem ele, nem conta tentativa (senão daria para gastar o freio geral sem resolver nada).
  const captcha = await s.captcha(corpo.captcha);
  if (captcha === 'sem_chave') throw new ErroCodigo(503, 'captcha_indisponivel');
  if (!captcha) throw new ErroCodigo(403, 'captcha');

  const codigo = normalizarCodigo(corpo.codigo);
  if (!codigo) throw new ErroCodigo(400, 'codigo_invalido');
  const impressao = await impressaoDoCodigo(codigo, s.segredo);
  const time = typeof corpo.time === 'string' && /^[a-z0-9-]{2,40}$/.test(corpo.time) ? corpo.time : null;

  const { data, error } = await s.rpc('codigo_conferir', { p_usuario: uid, p_impressao: impressao });
  if (error) throw new Error('codigo_conferir falhou');
  const c = (data as { situacao: string; dono: string | null; time_dono: string | null; time_seu: string | null }[] | null)?.[0];
  switch (c?.situacao) {
    case 'valido':
      break;
    case 'muitas_tentativas':
    case 'pausa_geral':
      throw new ErroCodigo(429, c.situacao);
    case 'proprio':
      throw new ErroCodigo(409, 'proprio');
    case 'conta_nao_anonima':
      throw new ErroCodigo(403, 'conta_nao_anonima');
    default:
      throw new ErroCodigo(400, 'codigo_invalido');
  }
  if (!c.dono) throw new Error('codigo_conferir sem dono');
  if (c.time_dono && c.time_seu && c.time_dono !== c.time_seu && time !== c.time_dono && time !== c.time_seu) {
    return { etapa: 'escolher_time', timeDono: c.time_dono, timeSeu: c.time_seu };
  }

  // Identidade interna do dono: o e-mail técnico, uma vez só. Conta com e-mail de verdade não entra por aqui.
  let email = await s.emailDe(c.dono);
  if (!email) {
    email = await emailTecnicoDe(c.dono, s.segredo);
    await s.darEmail(c.dono, email);
  } else if (!ehEmailTecnico(email)) {
    throw new ErroCodigo(403, 'conta_nao_anonima');
  }
  const tokenHash = await s.passe(email, c.dono);

  const junta = await s.rpc('juntar_torcedores', { p_impressao: impressao, p_origem: uid, p_time: time });
  if (junta.error) throw erroConhecido(junta.error, ERROS_JUNTAR) ?? new Error('juntar_torcedores falhou');
  const torcedor = (junta.data as TorcedorJuntado[] | null)?.[0] ?? null;
  return { etapa: 'pronto', tokenHash, torcedor };
}
