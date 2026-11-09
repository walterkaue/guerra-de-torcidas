// O caminho da função `funil`, sem Supabase: quem fala com o Auth e o banco é o index.ts, pelos `Servicos`.
// Separado para o teste rodar contra o SQL de verdade (supabase/testes/funil.test.ts).
// O código do X1 só passa por aqui para virar impressão; nunca é gravado nem impresso.

import { chaveDoLimite, conferirLote, impressaoDoX1 } from '../_shared/jogo/funil.ts';

/** Corpo maior que isto não é de 20 eventos: é descartado sem ler. */
export const MAX_BYTES = 8 * 1024;

export interface EventoParaGravar {
  evento: string;
  tipo: string;
  meio: string;
  jogo: string;
  impressao: string | null;
}

export interface Servicos {
  /** Id da sessão (o aparelho) se o token for válido; null se não for, ou se não veio token. */
  sessaoDoToken(token: string): Promise<string | null>;
  /** funil_registrar: devolve quantos eventos o banco contou. `semSessao`: a chave é do IP (teto próprio). */
  registrar(chave: string, eventos: EventoParaGravar[], semSessao: boolean): Promise<number>;
  /** Segredo das funções para as impressões (nunca sai do servidor). */
  segredo: string;
}

/**
 * Lê o lote do celular ({ t?: token, e: eventos }), confere a lista fechada, troca o código do X1 pela impressão e
 * grava. Devolve quantos o banco contou (0 se nada servia). Sem sessão e sem IP, não há como limitar: não grava.
 */
export async function processar(s: Servicos, texto: string, ip: string | null): Promise<number> {
  if (!texto || texto.length > MAX_BYTES) return 0;
  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return 0;
  }
  if (!corpo || typeof corpo !== 'object') return 0;
  const { t, e } = corpo as { t?: unknown; e?: unknown };
  const lote = conferirLote(e);
  if (!lote.length) return 0;

  const sessao = typeof t === 'string' && t && t.length <= 4096 ? await s.sessaoDoToken(t) : null;
  if (!sessao && !ip) return 0;
  const chave = await chaveDoLimite(sessao ? { sessao } : { ip: ip as string }, s.segredo);

  const eventos = await Promise.all(
    lote.map(async (ev) => ({
      evento: ev.evento,
      tipo: ev.tipo,
      meio: ev.meio,
      jogo: ev.jogo,
      impressao: ev.x1 ? await impressaoDoX1(ev.x1, s.segredo) : null,
    })),
  );
  return s.registrar(chave, eventos, !sessao);
}
