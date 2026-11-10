// Jogos especiais no #admin: parte pura (corpo da chamada, horário de Brasília, texto dos erros). A tela mora em admin.ts.
// Contrato da função jogos-especiais: supabase/functions/jogos-especiais/index.ts.

export type LadoEspecial = { id: string } | { fora: string };

export interface FormEspecial {
  competicao: string;
  fase: string;
  /** Id de um dos 20, ou FORA para "Time de fora". */
  mandante: string;
  mandanteFora: string;
  visitante: string;
  visitanteFora: string;
  /** AAAA-MM-DD e HH:MM, em horário de Brasília. */
  dia: string;
  hora: string;
}

export const FORA = '__fora';
export const MAX_TITULO = 40;
export const MAX_NOME = 30;

export const DICA_ESPECIAL =
  'Vale o placar dos 90 minutos. Prorrogação e pênaltis não contam. Adiado: mude o horário. Não disputado: anule.';

const MOTIVOS: Record<string, string> = {
  sem_titulo: 'Falta a competição.',
  titulo_longo: `Competição e fase aceitam até ${MAX_TITULO} caracteres.`,
  nome_longo: `O nome do time de fora aceita até ${MAX_NOME} caracteres.`,
  lado_invalido: 'Escolha o time ou o nome do time de fora.',
  sem_time_dos_20: 'Pelo menos um dos times tem de ser um dos 20.',
  mesmo_time: 'Mandante e visitante não podem ser o mesmo time.',
  time_invalido: 'Time inválido: escolha na lista.',
  fora_e_dos_20: 'Esse é um dos 20: escolha na lista.',
  texto_proibido: 'Texto com palavra proibida. Troque o texto.',
  texto_invalido: 'Texto inválido: tire símbolos estranhos.',
  inicio_no_passado: 'O horário tem de ser no futuro.',
  inicio_invalido: 'Dia ou hora inválidos.',
  especial_nao_encontrado: 'Esse jogo não existe mais. Recarregue a página.',
  jogo_fechado: 'Esse jogo já foi encerrado.',
  ja_comecou: 'Depois do início, só dá para mudar o horário (jogo adiado).',
  tem_palpite: 'Já tem palpite nesse jogo: anule em vez de apagar. Com palpite, os times não mudam.',
  nao_admin: 'Esta conta não é de administrador.',
};

/** Frase curta em português para o motivo que a função devolve; o que não conhece sai como veio. */
export function textoDoErro(motivo: string | null | undefined): string {
  if (!motivo) return 'Não deu certo. Tente de novo.';
  return MOTIVOS[motivo] ?? `Não deu certo (${motivo}).`;
}

/** ISO com o fuso de Brasília (-03:00), a partir do dia e da hora digitados. */
export function inicioDeBrasilia(dia: string, hora: string): string {
  return `${dia}T${hora}:00-03:00`;
}

/** Separa um instante ISO em dia (AAAA-MM-DD) e hora (HH:MM) de Brasília, para preencher o formulário. */
export function diaEHoraDeBrasilia(inicio: string): { dia: string; hora: string } {
  const d = new Date(Date.parse(inicio) - 3 * 3600_000).toISOString();
  return { dia: d.slice(0, 10), hora: d.slice(11, 16) };
}

export function tituloEspecial(j: { competicao: string | null; fase: string | null }): string {
  const c = j.competicao ?? '';
  return j.fase ? `${c} · ${j.fase}` : c;
}

function lado(escolha: string, fora: string): LadoEspecial {
  return escolha === FORA ? { fora: fora.trim() } : { id: escolha };
}

/** Confere o que dá para conferir no aparelho; o banco confere de novo. Devolve a frase do erro, ou null. */
export function validarForm(f: FormEspecial): string | null {
  if (!f.competicao.trim()) return MOTIVOS.sem_titulo;
  if (f.competicao.trim().length > MAX_TITULO || f.fase.trim().length > MAX_TITULO) return MOTIVOS.titulo_longo;
  if (!f.mandante || !f.visitante) return MOTIVOS.lado_invalido;
  if (f.mandante === FORA && !f.mandanteFora.trim()) return 'Falta o nome do mandante.';
  if (f.visitante === FORA && !f.visitanteFora.trim()) return 'Falta o nome do visitante.';
  if (f.mandante === FORA && f.visitante === FORA) return MOTIVOS.sem_time_dos_20;
  if (f.mandante !== FORA && f.mandante === f.visitante) return MOTIVOS.mesmo_time;
  if ((f.mandante === FORA && f.mandanteFora.trim().length > MAX_NOME) || (f.visitante === FORA && f.visitanteFora.trim().length > MAX_NOME)) {
    return MOTIVOS.nome_longo;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dia) || !/^\d{2}:\d{2}$/.test(f.hora)) return MOTIVOS.inicio_invalido;
  return null;
}

/** Corpo da chamada criar/editar para a função jogos-especiais. */
export function corpoEspecial(acao: 'criar' | 'editar', f: FormEspecial, jogoId?: string): Record<string, unknown> {
  return {
    acao,
    ...(jogoId ? { jogoId } : {}),
    competicao: f.competicao.trim(),
    fase: f.fase.trim(),
    mandante: lado(f.mandante, f.mandanteFora),
    visitante: lado(f.visitante, f.visitanteFora),
    inicio: inicioDeBrasilia(f.dia, f.hora),
  };
}

/** Formulário preenchido a partir de um jogo já cadastrado (Editar). */
export function formDoJogo(j: {
  competicao: string | null;
  fase: string | null;
  mandante_id: string | null;
  visitante_id: string | null;
  mandante_fora: string | null;
  visitante_fora: string | null;
  inicio: string;
}): FormEspecial {
  return {
    competicao: j.competicao ?? '',
    fase: j.fase ?? '',
    mandante: j.mandante_id ?? FORA,
    mandanteFora: j.mandante_fora ?? '',
    visitante: j.visitante_id ?? FORA,
    visitanteFora: j.visitante_fora ?? '',
    ...diaEHoraDeBrasilia(j.inicio),
  };
}
