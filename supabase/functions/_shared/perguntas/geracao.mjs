// CÓPIA GERADA de scripts/perguntas por scripts/compartilhar.mjs. Não edite aqui: mude lá e rode `npm run compartilhar`.
// Travas do pipeline de perguntas geradas por IA (funções gerar-conteudo e auditar-conteudo).
// Puro (sem disco nem rede): copiado para supabase/functions/_shared/perguntas por `npm run compartilhar`
// e testado em geracao.test.ts. Regra: a IA só propõe; quem aprova é este código (e, no fim, uma pessoa).

import { MARCAS_PROIBIDAS, normalizar as semAcento, validarPergunta } from './validar.mjs';

/** Assuntos que o quiz não pergunta, além dos temas proibidos do validador (marca de clube, CLAUDE.md). */
export const ASSUNTOS_FORA = ['mascote', 'escudo', 'hino', 'patrocin', 'fornecedor', 'uniforme oficial'];

/** A pergunta tem de fazer sentido sozinha, sem falar da página de onde saiu. */
export const CITA_A_FONTE = ['lista', 'pagina', 'materia', 'texto', 'mencionado', 'mencionada', 'citado', 'citada', 'segundo a', 'de acordo com'];

const ENTIDADES = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', ordm: 'º', ordf: 'ª' };
const MARCAS = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈', cedil: '̧' };

/** HTML → texto corrido (sem script, estilo nem tags; entidades e acentos decodificados). */
export function textoDaPagina(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z])(acute|grave|circ|tilde|uml|cedil);/gi, (_, l, m) => (l + MARCAS[m.toLowerCase()]).normalize('NFC'))
    .replace(/&([a-z]+);/gi, (m, e) => ENTIDADES[e.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sem acento, minúsculas, só letras e números separados por um espaço. */
export const chave = (s) => semAcento(s).replace(/[^a-z0-9]+/g, ' ').trim();

/** O trecho está na página, letra por letra (ignorando acento, caixa e pontuação)? */
export const trechoNaPagina = (trecho, pagina) => chave(trecho).length >= 20 && ` ${chave(pagina)} `.includes(` ${chave(trecho)} `);

/** A resposta certa aparece no trecho (como palavras inteiras)? */
export const respostaNoTrecho = (certa, trecho) => chave(certa).length > 0 && ` ${chave(trecho)} `.includes(` ${chave(certa)} `);

const LETRA = { facil: 'f', media: 'm', dificil: 'd', craque: 'c' };

/**
 * Avalia uma pergunta proposta pela IA. Devolve null se passa em todas as travas, ou o motivo da recusa.
 * `p`: { degrau, tema, pergunta, certa, errada1, errada2, errada3, trecho }.
 */
export function avaliarPergunta(p, { clube, fonte, pagina, existentes = [] }) {
  const linha = {
    id: `${clube}-${LETRA[p.degrau] ?? 'f'}-01`,
    clube,
    degrau: p.degrau,
    tema: p.tema,
    pergunta: String(p.pergunta ?? '').trim(),
    certa: String(p.certa ?? '').trim(),
    errada1: String(p.errada1 ?? '').trim(),
    errada2: String(p.errada2 ?? '').trim(),
    errada3: String(p.errada3 ?? '').trim(),
    fonte,
    fonte2: '',
    verificada_em: '2026-01-01',
    status: 'rascunho',
  };
  const erros = validarPergunta(linha);
  if (erros.length) return `validador: ${erros.join('; ')}`;
  const texto = chave([linha.pergunta, linha.certa, linha.errada1, linha.errada2, linha.errada3].join(' '));
  const fora = ASSUNTOS_FORA.find((a) => ` ${texto}`.includes(` ${chave(a)}`));
  if (fora) return `assunto fora do quiz: ${fora}`;
  const marca = MARCAS_PROIBIDAS.find((m) => ` ${texto} `.includes(` ${chave(m)} `));
  if (marca) return `marca de terceiros: ${marca}`;
  const meta = CITA_A_FONTE.find((a) => ` ${chave(linha.pergunta)} `.includes(` ${a} `));
  if (meta) return `a pergunta cita a fonte ("${meta}"): tem de fazer sentido sozinha`;
  if (!trechoNaPagina(p.trecho ?? '', pagina)) return 'o trecho não está na página';
  if (!respostaNoTrecho(linha.certa, p.trecho)) return 'a resposta certa não aparece no trecho';
  const nova = chave(linha.pergunta);
  if (existentes.some((e) => chave(e) === nova)) return 'pergunta repetida';
  return null;
}

/** Embaralha as alternativas para o auditor (que não sabe qual é a certa). */
export function alternativasEmbaralhadas(p, aleatorio = Math.random) {
  const alts = [p.certa, p.errada1, p.errada2, p.errada3];
  for (let i = alts.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [alts[i], alts[j]] = [alts[j], alts[i]];
  }
  return alts;
}

/**
 * Veredito do auditor: ele recebeu a página, a pergunta e as 4 alternativas embaralhadas e disse
 * qual a página prova, com o trecho. Passa só se escolheu a certa, o trecho está na página e traz a resposta.
 */
export function vereditoAuditoria(p, resposta, pagina) {
  const escolhida = String(resposta?.escolhida ?? '').trim();
  if (!escolhida) return 'o auditor não achou a resposta na página';
  if (chave(escolhida) !== chave(p.certa)) return `o auditor escolheu outra alternativa (${escolhida})`;
  if (!trechoNaPagina(resposta.trecho ?? '', pagina)) return 'o trecho do auditor não está na página';
  if (!respostaNoTrecho(p.certa, resposta.trecho)) return 'o trecho do auditor não traz a resposta';
  if (resposta.outraTambemCerta) return 'o auditor viu outra alternativa também certa';
  return null;
}
