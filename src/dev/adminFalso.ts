// Só em desenvolvimento (npm run dev, abrir /?adminFalso#admin): imita o Supabase do painel #admin no próprio
// navegador, para conferir a tela sem banco nem login. Nunca entra no build de produção (o import fica atrás
// de import.meta.env.DEV em telas/admin.ts).
//   ?adminFalso            entra como administrador, com tudo preenchido
//   ?adminFalso&vazio      filas e feedbacks vazios, sem sincronização
//   ?adminFalso&erro       as leituras falham ("Tentar de novo")

const params = new URLSearchParams(location.search);
const VAZIO = params.has('vazio');
const ERRO = params.has('erro');
const h = (horas: number) => new Date(Date.now() + horas * 3600_000).toISOString();

const PARES: [string, string][] = [
  ['flamengo', 'palmeiras'],
  ['corinthians', 'atletico-mg'],
  ['bahia', 'vasco'],
  ['gremio', 'cruzeiro'],
  ['fluminense', 'botafogo'],
];

const JOGOS = PARES.map(([m, v], i) => {
  const jogado = i < 3;
  return {
    id: `j${i}`,
    rodada: 30,
    mandante_id: m,
    visitante_id: v,
    inicio: h(jogado ? -26 + i : 20 + i),
    status_api: jogado ? 'FINISHED' : 'TIMED',
    gols_api_mandante: jogado ? 2 - (i % 2) : null,
    gols_api_visitante: jogado ? i : null,
    gols_mandante: i === 0 ? 2 : null,
    gols_visitante: i === 0 ? 0 : null,
    confirmado_em: i === 0 ? h(-20) : null,
    corrigido_em: null,
    anulado: i === 2,
  };
});

const FEEDBACKS = [
  { id: 1, tipo: 'bug', texto: 'O botão de cravar não responde no meu celular depois da segunda rodada.', tela: 'palpites', aparelho: 'Android 14 · Chrome 130', lido: false, criado_em: h(-3) },
  { id: 2, tipo: 'ideia', texto: 'Queria ver o ranking só do meu grupo.\nPode ser?', tela: 'ranking', aparelho: 'iPhone iOS 18', lido: false, criado_em: h(-30) },
  { id: 3, tipo: 'outro', texto: 'Muito bom, só falta mais perguntas do meu time.', tela: 'prova', aparelho: 'Android 13', lido: true, criado_em: h(-90) },
];

const FILA_REVISAO = [1, 2].map((i) => ({
  id: i,
  clube: i === 1 ? 'cruzeiro' : 'geral',
  degrau: i === 1 ? 'media' : 'facil',
  tema: 'titulos',
  pergunta: 'Em 1966, o Cruzeiro conquistou a Taça Brasil vencendo qual clube na final?',
  certa: 'Santos',
  errada1: 'Flamengo',
  errada2: 'Palmeiras',
  errada3: 'Botafogo',
  fonte: 'https://www.lance.com.br/lancepedia/cruzeiro.html',
  trecho: 'Em 1966, o Cruzeiro bateu o Santos de Pelé na final da Taça Brasil.',
  auditoria_trecho: null,
  modelo: 'gemini',
  auditoria_modelo: null,
  na_fila: 2,
}));

const FILA_SUSPEITAS = [
  { minigame: 'penaltis', id: '00000000-0000-4000-8000-000000000001', torcedor: 'a1b2c3d4', time_id: 'bahia', dia: '2026-11-02', pontos: 90, motivo: 'defesas: 28 de 30', partidas_do_torcedor: 12, suspeitas_do_torcedor: 3, na_fila: 1 },
];

const COBERTURA = ['geral', 'flamengo', 'cruzeiro', 'bahia'].flatMap((clube) =>
  [1, 2, 3, 4]
    .filter((d) => !(clube === 'bahia' && d === 4))
    .map((degrau) => ({ clube, degrau, ativas: clube === 'cruzeiro' && degrau === 2 ? 1 : 3 - (degrau > 2 ? 1 : 0), respostas: 40, acerto: 80 - degrau * 12 })),
);

const SINC = [{ quando: h(-1), origem: 'cron', ok: true, jogos: 380, sem_par: ['Mirassol'], mensagem: null }];

const espera = <T>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(v), 150));

type Linha = Record<string, unknown>;

/** Consulta encadeável que, ao ser aguardada, devolve {data, error}. */
function consulta(tabela: string) {
  const dados: Record<string, Linha[]> = {
    jogos: VAZIO ? [] : JOGOS,
    sincronizacoes: VAZIO ? [] : SINC,
    feedbacks: VAZIO ? [] : FEEDBACKS,
  };
  const resultado = () =>
    ERRO && tabela === 'feedbacks'
      ? { data: null, error: { message: 'rede' } }
      : tabela === 'config_crava'
        ? { data: { valor: '99' }, error: null }
        : { data: dados[tabela] ?? [], error: null };
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'limit', 'eq', 'update']) q[m] = () => q;
  q.maybeSingle = () => espera(resultado());
  q.then = (ok: (v: unknown) => unknown, no?: (e: unknown) => unknown) => espera(resultado()).then(ok, no);
  return q;
}

export function clienteFalso() {
  const sessao = { session: { user: { email: 'kaue@exemplo.com' } } };
  return {
    auth: {
      getSession: () => espera({ data: sessao }),
      signInWithPassword: () => espera({ error: null }),
      signOut: () => espera({ error: null }),
    },
    from: (tabela: string) => consulta(tabela),
    rpc: (nome: string) => {
      if (nome === 'sou_admin') return espera({ data: true, error: null });
      if (ERRO && ['cobertura_perguntas', 'revisao_perguntas_fila', 'suspeitas_fila'].includes(nome)) {
        return espera({ data: null, error: { message: 'rede' } });
      }
      const dados: Record<string, unknown> = {
        cobertura_perguntas: VAZIO ? [] : COBERTURA,
        revisao_perguntas_fila: VAZIO ? [] : FILA_REVISAO,
        suspeitas_fila: VAZIO ? [] : FILA_SUSPEITAS,
        apelido_contar: 2,
        apelido_apagar: 2,
        apelidos_filtrados: VAZIO ? [] : [{ texto: 'Apelido Barrado', quantos: 2 }, { texto: 'Outro Barrado 10', quantos: 1 }],
      };
      return espera({ data: dados[nome] ?? null, error: null });
    },
    functions: { invoke: () => espera({ data: { ok: true, gravados: 0 }, error: null }) },
  };
}
