// Audita os rascunhos do gerador (staging_gt.rascunhos_perguntas) com OUTRO modelo, que recebe a
// página, a pergunta e as 4 alternativas embaralhadas, sem saber qual é a certa. Passa a pre_aprovada
// só se ele escolhe a certa com um trecho que está na página e traz a resposta (vereditoAuditoria).
// Nunca aprova "de memória". Nada vira `revisada` aqui: isso é da revisão humana, no CSV.
// Só o cron chama (secret key do projeto).

import { admin, ErroHttp, servir } from '../_shared/comum.ts';
import { baixar, MODELOS_AUDITOR, perguntarJson } from '../_shared/gemini.ts';
import { alternativasEmbaralhadas, avaliarPergunta, textoDaPagina, vereditoAuditoria } from '../_shared/perguntas/geracao.mjs';
import { temSegredo } from '../_shared/segredo.ts';

const LIMITE_PAGINA = 60_000;
const POR_RODADA = 10;
const DIAS_PARA_DESISTIR = 7;

const INSTRUCAO = `Você confere uma pergunta de quiz contra o TEXTO DA PÁGINA, e só contra ele (nada de memória).
Diga qual das 4 alternativas a página prova como resposta da pergunta. Em "escolhida", copie a alternativa exatamente como veio; se a página não prova nenhuma, deixe vazio.
Em "trecho", copie a frase EXATA da página que prova a escolhida, sem mudar nenhuma letra (20 a 300 caracteres).
Em "outraTambemCerta", true se a página também tornaria outra alternativa uma resposta correta.`;

const ESQUEMA = {
  type: 'OBJECT',
  properties: { escolhida: { type: 'STRING' }, trecho: { type: 'STRING' }, outraTambemCerta: { type: 'BOOLEAN' } },
  required: ['escolhida', 'trecho', 'outraTambemCerta'],
};

servir(async (req) => {
  if (!(await temSegredo(req))) throw new ErroHttp(401, 'sem_permissao');
  const stg = admin().schema('staging_gt');
  const { data: fila, error } = await stg
    .from('rascunhos_perguntas')
    .select('id, clube, degrau, tema, pergunta, certa, errada1, errada2, errada3, fonte, trecho, criada_em')
    .eq('status', 'rascunho')
    .order('criada_em')
    .limit(POR_RODADA);
  if (error) throw error;
  if (!fila?.length) return { ok: true, auditadas: 0 };

  const paginas = new Map<string, string | null>();
  const resultado = { aprovadas: 0, reprovadas: 0, adiadas: 0, motivos: [] as string[] };
  for (const p of fila) {
    if (!paginas.has(p.fonte)) {
      const b = await baixar(p.fonte);
      const t = b.html ? textoDaPagina(b.html) : '';
      paginas.set(p.fonte, t.length >= 800 ? t : null);
    }
    const pagina = paginas.get(p.fonte);
    if (!pagina) {
      // Página fora do ar: tenta de novo amanhã; depois de uma semana, desiste.
      const velha = Date.now() - Date.parse(p.criada_em) > DIAS_PARA_DESISTIR * 86_400_000;
      if (velha) await stg.from('rascunhos_perguntas').update({ status: 'reprovada', motivo: 'a página da fonte não abriu por uma semana', auditada_em: new Date().toISOString() }).eq('id', p.id);
      else resultado.adiadas++;
      continue;
    }
    // As travas do gerador de novo (podem ter ficado mais rígidas depois que a pergunta entrou na fila).
    const trava = avaliarPergunta(p, { clube: p.clube, fonte: p.fonte, pagina });
    if (trava) {
      await stg.from('rascunhos_perguntas').update({ status: 'reprovada', motivo: trava, auditada_em: new Date().toISOString() }).eq('id', p.id);
      resultado.reprovadas++;
      resultado.motivos.push(trava);
      continue;
    }
    const alts = alternativasEmbaralhadas(p);
    let motivo: string | null;
    let auditoria: { modelo: string; dados: { escolhida: string; trecho: string; outraTambemCerta: boolean } } | null = null;
    try {
      auditoria = await perguntarJson(MODELOS_AUDITOR, INSTRUCAO, `PERGUNTA: ${p.pergunta}\nALTERNATIVAS:\n${alts.map((a) => `- ${a}`).join('\n')}\n\nTEXTO DA PÁGINA:\n${pagina.slice(0, LIMITE_PAGINA)}`, ESQUEMA);
      motivo = vereditoAuditoria(p, auditoria.dados, pagina);
    } catch (e) {
      resultado.adiadas++;
      resultado.motivos.push(String((e as Error).message));
      continue;
    }
    await stg
      .from('rascunhos_perguntas')
      .update({
        status: motivo ? 'reprovada' : 'pre_aprovada',
        motivo,
        auditoria_trecho: auditoria.dados.trecho ?? '',
        auditoria_modelo: auditoria.modelo,
        auditada_em: new Date().toISOString(),
      })
      .eq('id', p.id);
    if (motivo) {
      resultado.reprovadas++;
      resultado.motivos.push(motivo);
    } else resultado.aprovadas++;
  }
  return { ok: true, auditadas: fila.length, ...resultado };
});
