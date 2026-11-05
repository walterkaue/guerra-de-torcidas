// "Ver meus dados" na #termos (docs/jogo.md, seção 13): o que o servidor guarda deste aparelho, em linguagem
// simples. Puro, sem DOM: recebe o que ver_meus_dados devolve. É a única tela que mostra a faixa de idade,
// porque é a da própria pessoa.

export interface MensagemGuardada {
  tipo: string;
  texto: string;
  tela: string | null;
  aparelho: string | null;
  criado_em: string;
}

export interface MeusDados {
  torcedor: { time_id: string; apelido: string | null; faixa_etaria: string | null; criado_em: string } | null;
  partidas: Record<string, number>;
  time_do_dia: number;
  desafios: number;
  palpites: number;
  carreira_xp: number | null;
  /** Gols guardados para as medalhas dos Lances (não zeram com a pré-temporada). Servidor antigo: ausente. */
  gols_lances?: number;
  /** Cidade escolhida (null = nenhuma). Servidor antigo: ausente. */
  cidade?: { codigo: number; nome: string; uf: string; desde: string } | null;
  /** Quantas vezes a cidade foi escolhida ou trocada. Servidor antigo: ausente. */
  escolhas_de_cidade?: number;
  avisos: number;
  /** Sessões ligadas à conta (código do torcedor, seção 14.1). Servidor antigo: ausente. */
  aparelhos?: number;
  mensagens: MensagemGuardada[];
}

export interface LinhaDosDados {
  rotulo: string;
  valor: string;
}

const FAIXA: Record<string, string> = { menos_16: 'menos de 16', '16_17': '16 ou 17', '18_mais': '18 ou mais' };
const MINIGAME: Record<string, string> = { penaltis: 'de pênaltis', prova: 'da Prova de Boleiro', lances: 'de faltas e cara a cara' };
const TIPO: Record<string, string> = { bug: 'Bug', ideia: 'Ideia', outro: 'Outro' };

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;

/** Data de Brasília, dd/mm/aaaa. */
export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export const NADA_GUARDADO = 'O servidor não guarda nada deste aparelho.';

/** Linhas da ficha. Vazio quando não há nada no servidor (sem sessão ou sem time escolhido). */
export function linhasDosMeusDados(d: MeusDados | null, nomeDoTime: (id: string) => string): LinhaDosDados[] {
  const t = d?.torcedor;
  if (!d || !t) return [];
  const total = Object.values(d.partidas).reduce((s, n) => s + n, 0);
  const porJogo = Object.entries(d.partidas)
    .filter(([, n]) => n > 0)
    .map(([m, n]) => `${n.toLocaleString('pt-BR')} ${MINIGAME[m] ?? m}`);
  return [
    { rotulo: 'Time', valor: nomeDoTime(t.time_id) },
    { rotulo: 'Apelido', valor: t.apelido ?? 'nenhum' },
    ...(d.cidade === undefined
      ? []
      : [
          { rotulo: 'Cidade', valor: d.cidade ? `${d.cidade.nome} · ${d.cidade.uf}` : 'nenhuma' },
          ...(d.escolhas_de_cidade ? [{ rotulo: 'Escolhas de cidade', valor: plural(d.escolhas_de_cidade, 'vez', 'vezes') }] : []),
        ]),
    { rotulo: 'Faixa de idade', valor: FAIXA[t.faixa_etaria ?? ''] ?? 'não respondeu' },
    { rotulo: 'No jogo desde', valor: dataCurta(t.criado_em) },
    { rotulo: 'Partidas', valor: total ? `${plural(total, 'partida', 'partidas')} (${porJogo.join(', ')})` : 'nenhuma' },
    { rotulo: 'Time do Dia', valor: d.time_do_dia ? plural(d.time_do_dia, 'dia jogado', 'dias jogados') : 'nenhum' },
    { rotulo: 'Desafios criados', valor: d.desafios ? plural(d.desafios, 'desafio', 'desafios') : 'nenhum' },
    { rotulo: 'Palpites do Crava', valor: d.palpites ? plural(d.palpites, 'palpite', 'palpites') : 'nenhum' },
    { rotulo: 'Carreira', valor: `${(d.carreira_xp ?? 0).toLocaleString('pt-BR')} XP` },
    { rotulo: 'Medalhas dos Lances', valor: d.gols_lances ? plural(d.gols_lances, 'gol guardado', 'gols guardados') : 'nenhuma' },
    { rotulo: 'Aviso de domingo', valor: d.avisos ? `ligado em ${plural(d.avisos, 'navegador', 'navegadores')}` : 'desligado' },
    ...(d.aparelhos ? [{ rotulo: 'Aparelhos ligados', valor: plural(d.aparelhos, 'aparelho', 'aparelhos') }] : []),
    {
      rotulo: 'Mensagens do "Achei um erro"',
      valor: d.mensagens.length ? plural(d.mensagens.length, 'mensagem', 'mensagens') : 'nenhuma',
    },
  ];
}

/** Uma mensagem guardada: quando, tipo, texto e o que foi junto (tela e navegador). */
export function resumoDaMensagem(m: MensagemGuardada): { cabeca: string; texto: string; junto: string } {
  const junto = [m.tela && `tela: ${m.tela}`, m.aparelho && `navegador: ${m.aparelho}`].filter(Boolean).join(' · ');
  return { cabeca: `${dataCurta(m.criado_em)} · ${TIPO[m.tipo] ?? m.tipo}`, texto: m.texto, junto };
}
