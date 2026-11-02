// Contas da proposta docs/propostas/calibragem-prova.md. Só leitura; não muda pontuação nem banco.
// Uso:
//   npm run calibragem-prova                 lê o retrato guardado em docs/propostas/calibragem-prova-dados.json
//   npm run calibragem-prova -- --banco      lê o projeto ligado (SELECT) e mostra as contas
//   npm run calibragem-prova -- --banco --gravar   também regrava o retrato (sem ids de pessoa)
// O retrato guardado existe porque o zerar da pré-temporada apaga as partidas.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CENARIOS,
  DEGRAU_DA_POSICAO,
  OPCOES,
  PROXIMA_ALAVANCA,
  REGRA_ATUAL,
  TABELA_DOBRADA,
  chanceDeChegarA,
  distribuicaoDePontos,
  fisher,
  mediaDaDistribuicao,
  perguntasEsperadas,
  pesoDaProva,
  pontosDaPartidaJogada,
  resumoDaDistribuicao,
  taxaParaMediana,
  taxasPorPosicao,
  wilson,
} from './calibragemProva.mjs';
import { FAIXA, distribuicao, percentil, resumir, tabelaTexto } from './estatisticas.mjs';

const RETRATO = fileURLToPath(new URL('../../docs/propostas/calibragem-prova-dados.json', import.meta.url));

// Uma consulta só. Sem ids de pessoa no resultado final: o retrato troca por j1, j2…
const SQL = `
select json_build_object(
  'partidas', (
    select coalesce(json_agg(json_build_object('pessoa', p.torcedor_id, 'pontos', p.pontos,
      'fim', p.resultado ->> 'fim', 'passos', p.resultado -> 'passos') order by p.criada_em), '[]')
    from public.partidas p where p.minigame = 'prova' and p.fechada_em is not null and not p.sob_suspeita),
  'respostas', (
    select coalesce(json_agg(json_build_object('pergunta', r.pergunta_id, 'pessoa', r.torcedor_id,
      'degrau', r.degrau, 'clube', q.clube, 'tema', q.tema, 'ok', r.acertou, 'tempo', r.escolha is null,
      'ms', r.ms, 'ajuda', r.ajuda, 'proprio', q.clube is not null and q.clube = t.time_id) order by r.id), '[]')
    from public.prova_respostas r
    join public.perguntas q on q.id = r.pergunta_id
    left join public.torcedores t on t.id = r.torcedor_id),
  'banco', (
    select coalesce(json_object_agg(degrau, n), '{}') from (
      select degrau, count(*) as n from public.perguntas where status = 'ativa' group by degrau) x),
  'semana', (
    select coalesce(json_object_agg(minigame, pontos), '{}') from (
      select x.minigame, sum(x.pontos) as pontos
      from (select distinct r.semana from public.ranking_semana r) s
      cross join lateral public.pontos_semana(s.semana) x
      group by x.minigame) y)
) as dados`;

function lerDoBanco() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const pasta = mkdtempSync(join(tmpdir(), 'calibragem-'));
  try {
    const arquivo = join(pasta, 'calibragem.sql');
    writeFileSync(arquivo, SQL);
    const saida = execFileSync(npx, ['supabase', 'db', 'query', '--linked', '-o', 'json', '-f', arquivo], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 256 * 1024 * 1024,
    });
    const linha = JSON.parse(saida.slice(saida.indexOf('{'))).rows[0];
    return typeof linha.dados === 'string' ? JSON.parse(linha.dados) : linha.dados;
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

/** Troca o id de pessoa por j1, j2… (ordem de aparição) e acrescenta a data do retrato. */
export function anonimizar(dados, geradoEm) {
  const nomes = new Map();
  const nome = (id) => {
    if (!nomes.has(id)) nomes.set(id, `j${nomes.size + 1}`);
    return nomes.get(id);
  };
  return {
    geradoEm,
    partidas: dados.partidas.map((p) => ({
      pessoa: nome(p.pessoa),
      pontos: p.pontos,
      fim: p.fim,
      passos: p.passos.map(({ degrau, desfecho, ajuda, ms }) => ({ degrau, desfecho, ajuda, ms })),
    })),
    respostas: dados.respostas.map((r) => ({ ...r, pessoa: nome(r.pessoa) })),
    banco: dados.banco,
    semana: dados.semana,
  };
}

const pct = (f, casas = 0) => `${(f * 100).toFixed(casas)}%`;
const n1 = (v) => (Math.round(v * 10) / 10).toString();

function taxa(lista) {
  const ok = lista.filter((r) => r.ok).length;
  const [a, b] = wilson(ok, lista.length);
  return { n: lista.length, ok, f: lista.length ? ok / lista.length : 0, ic: `${pct(a)}–${pct(b)}` };
}

/** Texto com todas as contas, a partir do retrato. Separado do banco para dar para testar. */
export function relatorio(d) {
  const partidas = d.partidas;
  const respostas = d.respostas;
  const t = [];
  const secao = (titulo) => t.push(`\n## ${titulo}\n`);

  // -- Amostra
  const jogadores = new Set(partidas.map((p) => p.pessoa)).size;
  const pontosJogados = partidas.map((p) => p.pontos).sort((a, b) => a - b);
  const r0 = resumir(pontosJogados, { teto: 150, faixa: true });
  secao('Amostra');
  t.push(`${partidas.length} partidas fechadas, ${jogadores} jogadores, ${respostas.length} respostas (retrato de ${d.geradoEm}).`);
  t.push(`Pontos por partida: mediana ${r0.mediana}, quartis ${r0.q1} e ${r0.q3}, 90% ${r0.p90}, máximo ${r0.max}, média ${r0.media}.`);
  const porPessoa = new Map();
  for (const p of partidas) porPessoa.set(p.pessoa, (porPessoa.get(p.pessoa) ?? 0) + 1);
  t.push(`Partidas por jogador: ${[...porPessoa.values()].sort((a, b) => b - a).join(', ')}.`);

  // -- Como acaba
  secao('1. Como as partidas acabam');
  const fins = distribuicao(partidas.map((p) => p.fim));
  t.push(tabelaTexto(['Fim', 'Partidas', '%'], fins.map(([k, v]) => [k, v, pct(v / partidas.length)])));
  const chegou = distribuicao(partidas.map((p) => p.passos.length));
  t.push('');
  t.push(tabelaTexto(['Respondeu', 'Partidas', '%'], chegou.map(([k, v]) => [k, v, pct(v / partidas.length)])));
  const decisoes = partidas.filter((p) => p.passos.length >= 2 && p.passos.slice(0, 2).every((s) => s.desfecho === 'acertou'));
  const pararam = partidas.filter((p) => p.fim === 'parou').length;
  t.push(`\nChegaram à 1ª decisão de Parar ou Seguir (acertaram as 2 fáceis): ${decisoes.length}. Pararam: ${pararam}.`);

  // -- Acerto por posição da escada
  secao('2. Taxa de acerto por posição da escada');
  const linhasPos = [];
  for (let i = 0; i < 8; i++) {
    const quem = partidas.filter((p) => p.passos.length > i).map((p) => p.passos[i]);
    const ok = quem.filter((s) => s.desfecho === 'acertou').length;
    const [a, b] = wilson(ok, quem.length);
    linhasPos.push([i + 1, DEGRAU_DA_POSICAO[i], quem.length, ok, quem.length ? pct(ok / quem.length) : '', `${pct(a)}–${pct(b)}`]);
  }
  t.push(tabelaTexto(['Pergunta', 'Degrau', 'Respondidas', 'Certas', 'Acerto', 'IC 95%'], linhasPos));
  t.push('\nQuem chega à pergunta 5 já passou por um filtro (só os que acertaram as 4 primeiras), então as taxas de baixo estão infladas.');

  // -- Acerto por degrau (todas as respostas)
  secao('3. Taxa de acerto por degrau (todas as respostas) e meta do jogo.md');
  const metas = { 1: '≥ 75%', 2: '50–75%', 3: '30–50%', 4: '< 30%' };
  const linhasDeg = [1, 2, 3, 4].map((g) => {
    const x = taxa(respostas.filter((r) => r.degrau === g));
    return [g, x.n, x.ok, pct(x.f), x.ic, metas[g]];
  });
  t.push(tabelaTexto(['Degrau', 'Respostas', 'Certas', 'Acerto', 'IC 95%', 'Meta (jogo.md)'], linhasDeg));

  // -- Clube x geral, próprio clube, tema
  secao('4. O que os jogadores erram');
  const linhasOrigem = [];
  for (const g of [1, 2]) {
    for (const [nome, f] of [['de clube', (r) => r.clube], ['geral', (r) => !r.clube]]) {
      const x = taxa(respostas.filter((r) => r.degrau === g && f(r)));
      linhasOrigem.push([g === 1 ? 'Fácil' : 'Média', nome, x.n, x.ok, pct(x.f), x.ic]);
    }
  }
  t.push(tabelaTexto(['Degrau', 'Origem', 'Respostas', 'Certas', 'Acerto', 'IC 95%'], linhasOrigem));
  const fc = respostas.filter((r) => r.degrau === 1 && r.clube);
  const fg = respostas.filter((r) => r.degrau === 1 && !r.clube);
  const [a, b, c, e] = [fc.filter((r) => r.ok).length, fc.filter((r) => !r.ok).length, fg.filter((r) => r.ok).length, fg.filter((r) => !r.ok).length];
  t.push(`\nFácil de clube x fácil geral: ${a}/${fc.length} contra ${c}/${fg.length}; teste exato de Fisher, p = ${fisher(a, b, c, e).toFixed(4)}.`);
  const proprio = taxa(respostas.filter((r) => r.clube && r.proprio));
  const outro = taxa(respostas.filter((r) => r.clube && !r.proprio));
  t.push(`Pergunta do próprio clube: ${proprio.ok}/${proprio.n} (${pct(proprio.f)}); de outro clube: ${outro.ok}/${outro.n} (${pct(outro.f)}).`);
  const porTema = new Map();
  for (const r of respostas) porTema.set(r.tema, [...(porTema.get(r.tema) ?? []), r]);
  const temas = [...porTema].map(([k, v]) => [k, taxa(v)]).sort((x, y) => y[1].n - x[1].n);
  t.push('');
  t.push(tabelaTexto(['Tema', 'Respostas', 'Certas', 'Acerto'], temas.map(([k, x]) => [k, x.n, x.ok, pct(x.f)])));
  const erradas = respostas.filter((r) => !r.ok && !r.tempo);
  const tempo = respostas.filter((r) => r.tempo).length;
  const ms = (f) => {
    const l = respostas.filter(f).map((r) => r.ms).sort((x, y) => x - y);
    return l.length ? Math.round(percentil(l, 0.5)) : null;
  };
  t.push(`\nTempo esgotado: ${tempo} de ${respostas.length}. Mediana do tempo: ${ms((r) => r.ok)} ms quando acerta, ${ms((r) => !r.ok)} ms quando erra (limite 15000 ms).`);
  t.push(`Erros: ${erradas.length} escolhas erradas; usaram ajuda em ${respostas.filter((r) => r.ajuda).length} respostas.`);
  const porPergunta = new Map();
  for (const r of respostas) porPergunta.set(r.pergunta, (porPergunta.get(r.pergunta) ?? 0) + 1);
  const maxPorPergunta = Math.max(...porPergunta.values());
  t.push(`Perguntas diferentes respondidas: ${porPergunta.size} (de ${Object.values(d.banco).reduce((s, v) => s + v, 0)} ativas). Mais respondida: ${maxPorPergunta} vezes. A recalibragem por degrau do jogo.md só age com 50 ou mais respostas por pergunta.`);
  const porJogador = [...new Set(respostas.map((r) => r.pessoa))].map((p) => {
    const x = taxa(respostas.filter((r) => r.pessoa === p));
    return `${p}: ${x.ok}/${x.n} (${pct(x.f)})`;
  });
  t.push(`Acerto por jogador: ${porJogador.join('; ')}.`);

  // -- O desenho contra ele mesmo
  secao('5. A regra de hoje contra o alvo');
  const pNec = taxaParaMediana(REGRA_ATUAL);
  t.push(`Com a regra de hoje, a taxa de acerto igual em todas as perguntas para a mediana chegar a ${FAIXA.min} é ${pct(pNec, 1)}.`);
  const metaJogo = [0.75, 0.6, 0.4, 0.25];
  const distMeta = distribuicaoDePontos(taxasPorPosicao(metaJogo), REGRA_ATUAL);
  t.push(`Se o banco batesse exatamente as metas de acerto do jogo.md (75% / 60% / 40% / 25%), a mediana por partida seria ${resumoDaDistribuicao(distMeta).mediana} (média ${n1(mediaDaDistribuicao(distMeta))}).`);
  const dobrada = partidas.map((p) => pontosDaPartidaJogada(p.passos, TABELA_DOBRADA)).sort((x, y) => x - y);
  const rd = resumir(dobrada, {});
  t.push(`Só a tabela dobrada, sobre as ${partidas.length} partidas jogadas (exato): mediana ${rd.mediana}, 75% ${rd.q3}, máximo ${rd.max} (teto da partida passaria de 150 para 300).`);

  // -- Conferência: reproduzir as partidas jogadas com a regra de hoje dá os pontos gravados
  const iguais = partidas.every((p) => pontosDaPartidaJogada(p.passos, REGRA_ATUAL) === p.pontos);
  t.push(`Conferência: a reprodução com a regra de hoje bate com os pontos gravados em ${iguais ? 'todas' : 'NEM TODAS'} as partidas.`);

  // -- Opções: piso nas partidas jogadas
  secao('6. Opções sobre as partidas já jogadas (piso)');
  t.push('A partida jogada parou no primeiro erro; sob A, B e C ela teria continuado, mas não sabemos como. Aqui conta só até o erro: é o mínimo.');
  const linhasPiso = [REGRA_ATUAL, ...OPCOES].map((regra) => {
    const v = partidas.map((p) => pontosDaPartidaJogada(p.passos, regra)).sort((x, y) => x - y);
    const r = resumir(v, { teto: 150 });
    return [regra.nome, r.q1, r.mediana, r.q3, r.p90, r.max, n1(v.reduce((s, x) => s + x, 0) / v.length)];
  });
  t.push(tabelaTexto(['Regra', '25%', 'Mediana', '75%', '90%', 'Máx', 'Média'], linhasPiso));

  // -- Opções: modelo exato
  secao('7. Opções no modelo (taxa de acerto por degrau)');
  t.push(`Alvo: mediana entre ${FAIXA.min} e ${FAIXA.max}. "Faz ${FAIXA.min}+" = chance de a partida fazer ${FAIXA.min} pontos ou mais. Ninguém para: hoje só 1 de ${decisoes.length} para.`);
  const modeloHoje = distribuicaoDePontos(taxasPorPosicao(CENARIOS[0].porDegrau), REGRA_ATUAL);
  t.push(
    `Conferência do modelo com a regra de hoje: ${n1(perguntasEsperadas(taxasPorPosicao(CENARIOS[0].porDegrau), REGRA_ATUAL))} perguntas por partida (jogado: ${n1(respostas.length / partidas.length)}), ` +
      `mediana ${resumoDaDistribuicao(modeloHoje).mediana} (jogado: ${r0.mediana}), média ${n1(mediaDaDistribuicao(modeloHoje))} (jogado: ${r0.media}).`,
  );
  const baseModelo = new Map();
  for (const cen of CENARIOS) {
    t.push(`\n**${cen.nome}** · acerto fácil ${pct(cen.porDegrau[0])}, média ${pct(cen.porDegrau[1])}, difícil ${pct(cen.porDegrau[2])}, craque ${pct(cen.porDegrau[3])} (${cen.nota})`);
    const linhas = [REGRA_ATUAL, ...OPCOES, PROXIMA_ALAVANCA].map((regra) => {
      const dist = distribuicaoDePontos(taxasPorPosicao(cen.porDegrau), regra);
      const r = resumoDaDistribuicao(dist);
      if (regra === REGRA_ATUAL) baseModelo.set(cen.id, r.media);
      return [regra.nome, r.q1, r.mediana, r.q3, r.p90, n1(r.media), pct(r.zero), pct(r.naFaixa), n1(perguntasEsperadas(taxasPorPosicao(cen.porDegrau), regra))];
    });
    t.push(tabelaTexto(['Regra', '25%', 'Mediana', '75%', '90%', 'Média', 'Faz 0', `Faz ${FAIXA.min}+`, 'Perguntas'], linhas));
  }

  // -- Peso na semana
  secao('8. Peso da Prova na semana (estimativa)');
  const pesos = d.semana;
  const total = Object.values(pesos).reduce((s, v) => s + v, 0);
  t.push(`Pontos que contaram no ranking: ${Object.entries(pesos).map(([k, v]) => `${k} ${v}`).join(', ')} (total ${total}). Prova hoje: ${pct(pesos.prova / total, 1)}.`);
  t.push('Escala os pontos da Prova pela razão entre a média da opção e a média de hoje no mesmo cenário. Não conta quem passaria a jogar mais.');
  const linhasPeso = [];
  for (const cen of CENARIOS) {
    const hoje = baseModelo.get(cen.id);
    const cel = OPCOES.map((regra) => {
      const media = mediaDaDistribuicao(distribuicaoDePontos(taxasPorPosicao(cen.porDegrau), regra));
      const w = pesoDaProva(pesos, media / hoje);
      return `${pct(w.fatia, 0)} (${Math.round(w.prova)} pts)`;
    });
    linhasPeso.push([cen.nome, ...cel]);
  }
  t.push(tabelaTexto(['Cenário', ...OPCOES.map((o) => o.nome)], linhasPeso));

  // -- Anti-trapaça: quanto a regra paga a quem pesquisa
  secao('9. Quem pesquisa no Google contra quem joga limpo');
  t.push('Média de pontos por partida de quem acerta 90% de tudo (pesquisa) contra o banco de hoje (acerto 61/55/50/35%). A detecção do jogo.md (90% de acerto em 40 difíceis e de craque, tempo médio abaixo de 2,5 s) não muda em nenhuma opção.');
  const trapa = Array(8).fill(0.9);
  const limpo = taxasPorPosicao(CENARIOS[0].porDegrau);
  const linhasTrapa = [REGRA_ATUAL, ...OPCOES].map((regra) => {
    const mt = mediaDaDistribuicao(distribuicaoDePontos(trapa, regra));
    const ml = mediaDaDistribuicao(distribuicaoDePontos(limpo, regra));
    return [regra.nome, n1(mt), n1(ml), `${n1(mt / ml)}×`, pct(chanceDeChegarA(distribuicaoDePontos(trapa, regra), 150), 0)];
  });
  t.push(tabelaTexto(['Regra', 'Média com 90%', 'Média jogando limpo', 'Razão', 'Chance de 150'], linhasTrapa));
  return t.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  let dados;
  if (args.includes('--banco')) {
    const hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dados = anonimizar(lerDoBanco(), hoje);
    if (args.includes('--gravar')) {
      writeFileSync(RETRATO, `${JSON.stringify(dados)}\n`);
      console.log(`Retrato gravado em ${RETRATO}\n`);
    }
  } else if (existsSync(RETRATO)) {
    dados = JSON.parse(readFileSync(RETRATO, 'utf8'));
  } else {
    console.error('Sem retrato guardado. Rode com --banco --gravar.');
    process.exit(1);
  }
  console.log(relatorio(dados));
}
