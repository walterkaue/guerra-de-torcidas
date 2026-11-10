// Jogos especiais do Palpite da Rodada (docs/jogos/crava.md, "Entressafra e jogos especiais"): o #admin cria, edita
// e apaga. Só quem está em administradores. A regra mora no banco (especial_criar, especial_editar, especial_apagar,
// só da chave secreta): times, tamanhos, palavras proibidas, horário e palpites já feitos.
// Confirmar, corrigir e anular o placar seguem pela confirmar-placar, com o mesmo cálculo das rodadas.
// Corpo: { acao: 'criar' | 'editar' | 'apagar', jogoId?, competicao, fase, mandante, visitante, inicio }
//   mandante e visitante: { id: '<um dos 20>' } ou { fora: '<nome do time de fora>' }; inicio em ISO.

import { admin, ErroHttp, lerCorpo, servir, usuario } from '../_shared/comum.ts';

/** Os motivos que o banco devolve e que o #admin sabe explicar. */
const MOTIVOS = new Set([
  'sem_titulo', 'titulo_longo', 'nome_longo', 'lado_invalido', 'sem_time_dos_20', 'mesmo_time', 'time_invalido',
  'fora_e_dos_20', 'texto_proibido', 'texto_invalido', 'inicio_no_passado', 'especial_nao_encontrado', 'jogo_fechado',
  'ja_comecou', 'tem_palpite', 'ja_existe', 'inicio_longe',
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);

function lado(v: unknown): { id: string | null; fora: string | null } {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { id: texto(o.id), fora: texto(o.fora) };
}

function inicio(v: unknown): string {
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) throw new ErroHttp(400, 'inicio_invalido');
  return new Date(v).toISOString();
}

servir(async (req) => {
  const sb = admin();
  const uid = await usuario(req, sb);
  const { data: adm, error: eA } = await sb.from('administradores').select('usuario_id').eq('usuario_id', uid).maybeSingle();
  if (eA) throw eA;
  if (!adm) throw new ErroHttp(403, 'nao_admin');

  const corpo = await lerCorpo(req);
  const jogoId = texto(corpo.jogoId);
  if (jogoId !== null && !UUID.test(jogoId)) throw new ErroHttp(400, 'sem_jogo');
  let chamada: PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  if (corpo.acao === 'apagar') {
    if (!jogoId) throw new ErroHttp(400, 'sem_jogo');
    chamada = sb.rpc('especial_apagar', { p_jogo: jogoId });
  } else if (corpo.acao === 'criar' || corpo.acao === 'editar') {
    const m = lado(corpo.mandante);
    const v = lado(corpo.visitante);
    const args = {
      p_competicao: texto(corpo.competicao),
      p_fase: texto(corpo.fase),
      p_mandante_id: m.id,
      p_mandante_fora: m.fora,
      p_visitante_id: v.id,
      p_visitante_fora: v.fora,
      p_inicio: inicio(corpo.inicio),
    };
    if (corpo.acao === 'criar') {
      chamada = sb.rpc('especial_criar', args);
    } else {
      if (!jogoId) throw new ErroHttp(400, 'sem_jogo');
      chamada = sb.rpc('especial_editar', { p_jogo: jogoId, ...args });
    }
  } else {
    throw new ErroHttp(400, 'acao_invalida');
  }

  const { data, error } = await chamada;
  if (error) {
    if (error.message && MOTIVOS.has(error.message)) throw new ErroHttp(400, error.message);
    throw error;
  }
  return { ok: true, jogoId: corpo.acao === 'criar' ? data : jogoId };
});
