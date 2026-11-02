// Gera perguntas da Prova de Boleiro com o Gemini, a partir de UMA página de fonte aceita
// (staging_gt.fontes_semente). O modelo só propõe; as travas de _shared/perguntas/geracao.mjs
// decidem: validador do CSV, trecho literal na página e resposta dentro do trecho.
// Quem passa vira `rascunho` em staging_gt.rascunhos_perguntas; quem não passa fica em recusas_perguntas.
// Só o cron chama (secret key do projeto). Nada vai ao jogo daqui.

import { admin, ErroHttp, lerCorpo, servir } from '../_shared/comum.ts';
import { baixar, MODELOS_GERADOR, perguntarJson, registrarUso, usoVazio } from '../_shared/gemini.ts';
import { avaliarPergunta, textoDaPagina } from '../_shared/perguntas/geracao.mjs';
import { escolherVaga } from '../_shared/perguntas/reposicao.mjs';
import { PALAVRAS_PROIBIDAS } from '../_shared/perguntas/validar.mjs';
import { temSegredo } from '../_shared/segredo.ts';

const LIMITE_PAGINA = 60_000;
const MAX_POR_RODADA = 8;
const PAGINAS_PADRAO = 3;
const MAX_PAGINAS = 5;
/** O cron espera 120 s: depois disto não começa outra página. */
const ORCAMENTO_MS = 100_000;
const DEGRAUS = ['facil', 'media', 'dificil', 'craque'];

const TEXTO_DO_DEGRAU: Record<string, string> = {
  facil: 'Só do degrau "facil": o que o torcedor comum do clube sabe de cabeça. Título e final grandes ou recentes, Libertadores, Mundial, ídolo e técnico campeão, apelido. Nada de estádio, nome de fundação, ano de título anterior, artilheiro de campanha ou final antiga contra adversário pequeno.',
  media: 'Só do degrau "media": o torcedor atento sabe (adversário de final, técnico campeão, ano de título).',
  dificil: 'Só do degrau "dificil": detalhe que só o torcedor fanático sabe (artilheiro de campanha, estádio, placar, ano menos famoso).',
  craque: 'Só do degrau "craque": detalhe raro, que quase ninguém sabe, mas que a página prova.',
};

const NOMES: Record<string, string> = {
  'athletico-pr': 'Athletico-PR', 'atletico-mg': 'Atlético-MG', bahia: 'Bahia', botafogo: 'Botafogo',
  bragantino: 'Bragantino', chapecoense: 'Chapecoense', corinthians: 'Corinthians', coritiba: 'Coritiba',
  cruzeiro: 'Cruzeiro', flamengo: 'Flamengo', fluminense: 'Fluminense', gremio: 'Grêmio', internacional: 'Internacional',
  mirassol: 'Mirassol', palmeiras: 'Palmeiras', remo: 'Remo', santos: 'Santos', 'sao-paulo': 'São Paulo',
  vasco: 'Vasco', vitoria: 'Vitória',
};

const instrucao = (alvo: string, n: number, degrau?: string) => `Você escreve perguntas de quiz de futebol em português do Brasil para um jogo gratuito, usando SÓ fatos do TEXTO DA PÁGINA (nada de memória).
Assunto: ${alvo}.${degrau ? `\n${TEXTO_DO_DEGRAU[degrau]}` : ''}
Escreva até ${n} perguntas variadas. Regras de cada uma:
- "pergunta": até 140 caracteres, termina com "?", cita um ano (ou o ano é a resposta). Fato fechado, sem opinião. Tem de fazer sentido sozinha, para quem nunca viu a página: nunca fale em "lista", "página", "matéria", "texto" ou "mencionado".
- "certa" e "errada1", "errada2", "errada3": até 40 caracteres cada, todas diferentes, do mesmo tipo (anos com anos, clubes com clubes, nomes com nomes). As erradas são plausíveis, mas a página NÃO pode dar nenhuma delas como resposta.
- "trecho": a frase EXATA da página que prova a resposta certa, copiada sem mudar nenhuma letra, de 20 a 300 caracteres, e que contém a resposta certa.
- "degrau": facil, media, dificil ou craque. "tema": uma palavra (titulos, idolos, estadio, historia, jogos).
- Proibido: as palavras ${PALAVRAS_PROIBIDAS.join(', ')}; tragédia, morte, acidente, rebaixamento, vexame, goleada sofrida, polêmica, vida pessoal, opinião sobre pessoa, atleta menor de idade; mascote, escudo, hino, patrocinador ou fornecedor; nome de estádio ou competição com marca de patrocínio (use o nome oficial sem a marca ou o apelido).
- Nome real de jogador ou técnico só como fato com data, sem adjetivo.
Se a página não tiver fatos bons para isso, devolva uma lista vazia.`;

const ESQUEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      degrau: { type: 'STRING' }, tema: { type: 'STRING' }, pergunta: { type: 'STRING' }, certa: { type: 'STRING' },
      errada1: { type: 'STRING' }, errada2: { type: 'STRING' }, errada3: { type: 'STRING' }, trecho: { type: 'STRING' },
    },
    required: ['degrau', 'tema', 'pergunta', 'certa', 'errada1', 'errada2', 'errada3', 'trecho'],
  },
};

interface Proposta {
  degrau: string; tema: string; pergunta: string; certa: string;
  errada1: string; errada2: string; errada3: string; trecho: string;
}

servir(async (req) => {
  if (!(await temSegredo(req))) throw new ErroHttp(401, 'sem_permissao');
  const corpo = await lerCorpo(req);
  const quantidade = Math.max(1, Math.min(MAX_POR_RODADA, Number(corpo.quantidade) || 6));
  const paginasMax = Math.max(1, Math.min(MAX_PAGINAS, Number(corpo.paginas) || PAGINAS_PADRAO));
  const inicio = Date.now();
  const sb = admin();
  const stg = sb.schema('staging_gt');

  // Alvo da rodada: clube e degrau pedidos, ou (modo "reposicao") a vaga que mais falta para a cota.
  let alvoClube = typeof corpo.clube === 'string' ? corpo.clube : null;
  let alvoDegrau = typeof corpo.degrau === 'string' && DEGRAUS.includes(corpo.degrau) ? corpo.degrau : null;
  let meta = quantidade;
  if (corpo.modo === 'reposicao' && !alvoClube && !alvoDegrau) {
    const [{ data: ativasNoJogo, error: e0 }, { data: pendentes, error: e1 }] = await Promise.all([
      sb.from('perguntas').select('clube, degrau').eq('status', 'ativa').not('clube', 'is', null),
      stg.from('rascunhos_perguntas').select('clube, degrau').in('status', ['rascunho', 'pre_aprovada']),
    ]);
    if (e0 || e1) throw e0 ?? e1;
    const vaga = escolherVaga(ativasNoJogo ?? [], pendentes ?? []);
    if (vaga) {
      alvoClube = vaga.clube;
      alvoDegrau = vaga.degrau;
      meta = Math.min(quantidade, vaga.falta + 2);
    }
  }

  // Sorteio entre TODAS as páginas de menor uso (antes eram as 30 primeiras, quase só do Athletico).
  // Página que não abre ou não rende pergunta: tenta outra, até `paginas` por rodada (padrão 3).
  let consulta = stg.from('fontes_semente').select('url, clube, usos, falhas').eq('ativa', true);
  if (alvoClube) consulta = consulta.eq('clube', alvoClube);
  const { data: ativas, error } = await consulta.limit(2000);
  if (error) throw error;
  if (!ativas?.length) return { ok: false, motivo: 'sem fonte-semente ativa', clube: alvoClube };
  const menorUso = Math.min(...ativas.map((a) => a.usos));
  const sorteadas = ativas.filter((a) => a.usos === menorUso).sort(() => Math.random() - 0.5);

  const rodadas = [];
  let total = 0;
  for (const semente of sorteadas.slice(0, paginasMax)) {
    if (rodadas.length && Date.now() - inicio > ORCAMENTO_MS) break;
    const pagina = await baixar(semente.url);
    const texto = pagina.html ? textoDaPagina(pagina.html) : '';
    if (pagina.erro || texto.length < 800) {
      const falhas = semente.falhas + 1;
      await stg.from('fontes_semente').update({ falhas, ativa: falhas < 3 }).eq('url', semente.url).eq('clube', semente.clube);
      rodadas.push({ fonte: semente.url, clube: semente.clube, erro: pagina.erro ?? 'página sem texto' });
      continue;
    }

    const alvo = semente.clube === 'geral' ? 'futebol brasileiro em geral (seleção, competições, regras e história)' : `o clube ${NOMES[semente.clube] ?? semente.clube}`;
    const uso = usoVazio();
    let resposta;
    try {
      resposta = await perguntarJson<Proposta[]>(
        MODELOS_GERADOR,
        instrucao(alvo, meta, alvoDegrau ?? undefined),
        `TEXTO DA PÁGINA (${semente.url}):
${texto.slice(0, LIMITE_PAGINA)}`,
        ESQUEMA,
        uso,
      );
    } catch (e) {
      await registrarUso(sb, { funcao: 'gerar-conteudo', modelo: null, clube: semente.clube, degrau: alvoDegrau }, uso);
      throw e;
    }
    const { modelo, dados } = resposta;
    await registrarUso(sb, { funcao: 'gerar-conteudo', modelo, clube: semente.clube, degrau: alvoDegrau }, uso);

    // Perguntas que já existem (staging e jogo), para não repetir.
    const [{ data: noStaging }, { data: noJogo }] = await Promise.all([
      stg.from('rascunhos_perguntas').select('pergunta').eq('clube', semente.clube),
      semente.clube === 'geral' ? sb.from('perguntas').select('texto').is('clube', null) : sb.from('perguntas').select('texto').eq('clube', semente.clube),
    ]);
    const existentes = [...(noStaging ?? []).map((x) => x.pergunta), ...(noJogo ?? []).map((x) => x.texto)];

    const aceitas = [];
    const recusas = [];
    for (const p of (Array.isArray(dados) ? dados : []).slice(0, meta)) {
      const motivo = alvoDegrau && p.degrau !== alvoDegrau
        ? `degrau diferente do pedido (${alvoDegrau})`
        : avaliarPergunta(p, { clube: semente.clube, fonte: semente.url, pagina: texto, existentes });
      if (motivo) {
        recusas.push({ clube: semente.clube, fonte: semente.url, proposta: p, motivo, modelo });
        continue;
      }
      existentes.push(p.pergunta);
      aceitas.push({
        clube: semente.clube, degrau: p.degrau, tema: p.tema, pergunta: p.pergunta.trim(), certa: p.certa.trim(),
        errada1: p.errada1.trim(), errada2: p.errada2.trim(), errada3: p.errada3.trim(), fonte: semente.url,
        trecho: p.trecho.trim(), modelo,
      });
    }
    if (aceitas.length) {
      const { error: e1 } = await stg.from('rascunhos_perguntas').insert(aceitas);
      if (e1) throw e1;
    }
    if (recusas.length) await stg.from('recusas_perguntas').insert(recusas);
    await stg
      .from('fontes_semente')
      .update({ usos: semente.usos + 1, falhas: 0, ultimo_uso: new Date().toISOString() })
      .eq('url', semente.url)
      .eq('clube', semente.clube);
    rodadas.push({ fonte: semente.url, clube: semente.clube, modelo, aceitas: aceitas.length, recusas: recusas.map((r) => r.motivo) });
    total += aceitas.length;
    if (total >= meta) break;
  }
  return { ok: true, aceitas: total, clube: alvoClube, degrau: alvoDegrau, paginas: rodadas };
});
