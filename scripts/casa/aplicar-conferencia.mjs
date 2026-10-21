// Aplica no dados/casa/ a resposta de uma conferência feita fora do Claude Code (outra IA).
// Uso: node scripts/casa/aplicar-conferencia.mjs resposta.txt [--clubes=a,b,c] [--hoje=AAAA-MM-DD] [--seco]
// Formato da resposta: dados/casa/conferencia-outra-ia/prompt.md

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerCsv } from '../perguntas/validar.mjs';
import { ARQUIVOS, chaveDe, colunaClube, escreverTabela, lerTabela } from './tabela.mjs';

const PASTA = new URL('../../dados/casa/', import.meta.url);

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const nomeArquivo = (s) => {
  const m = String(s).toLowerCase().match(/\b(clubes|estadios|titulos|recordes|goleadas|mantos)(\.csv)?\b/);
  return m ? m[1] : null;
};

/** Texto da resposta → { corrigidas: {arquivo: [linhas CSV]}, apagar: [[...]], confirmadas: [[...]] } */
export function lerResposta(texto) {
  const r = { corrigidas: {}, apagar: [], confirmadas: [] };
  let secao = null;
  let arquivo = null;
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    const linha = bruta.trim();
    const sec = linha.match(/^[#=\s*]*(RESUMO|CORRIGIDAS|APAGAR|CONFIRMADAS)[#=\s*]*$/i);
    if (sec) {
      secao = sec[1].toUpperCase();
      arquivo = null;
      continue;
    }
    if (!secao || secao === 'RESUMO' || linha === '' || linha.startsWith('```')) continue;
    if (secao === 'CORRIGIDAS') {
      const titulo = linha.match(/^#+\s*(.+)$/);
      if (titulo) {
        arquivo = nomeArquivo(titulo[1]);
        continue;
      }
      if (!arquivo) {
        const solto = nomeArquivo(linha);
        if (solto && !linha.includes('"')) {
          arquivo = solto;
          continue;
        }
        throw new Error(`linha CSV sem arquivo antes: ${linha.slice(0, 60)}`);
      }
      (r.corrigidas[arquivo] ??= []).push(linha);
    } else {
      const campos = linha.replace(/^[-*•\d.)\s]+(?=\w+(\.csv)?\s*\|)/, '').split('|').map((c) => c.trim());
      if (campos.length < 2 || !nomeArquivo(campos[0])) continue;
      (secao === 'APAGAR' ? r.apagar : r.confirmadas).push(campos);
    }
  }
  return r;
}

/** Linhas de uma entrada de APAGAR/CONFIRMADAS → lista de funções que reconhecem a linha. */
function alvos(campos) {
  const arquivo = nomeArquivo(campos[0]);
  const [, clube, a, b] = campos;
  const sep = (s) => String(s ?? '').split(/[\s,;]+/).filter(Boolean);
  const igual = (x, y) => semAcento(x) === semAcento(y);
  if (arquivo === 'clubes') return { arquivo, bate: (l) => igual(l.id, clube) };
  if (arquivo === 'estadios') return { arquivo, bate: (l) => igual(l.clube, clube) };
  if (arquivo === 'titulos') {
    const anos = sep(b);
    return { arquivo, bate: (l) => igual(l.clube, clube) && igual(l.competicao, a) && (anos.length === 0 || anos.includes(l.ano)) };
  }
  if (arquivo === 'recordes') {
    const pos = sep(b);
    return { arquivo, bate: (l) => igual(l.clube, clube) && igual(l.lista, a) && (pos.length === 0 || pos.includes(l.posicao)) };
  }
  if (arquivo === 'goleadas') return { arquivo, bate: (l) => igual(l.clube, clube) && (!a || igual(l.adversario, a)) };
  return { arquivo, bate: (l) => igual(l.clube, clube) && (!a || sep(a).includes(l.ordem)) };
}

/**
 * Aplica a resposta nas tabelas { arquivo: texto do CSV }. Devolve os textos novos e o relatório.
 * `clubes`: se vier, linha de outro clube é recusada.
 */
export function aplicar(textos, resposta, { hoje, clubes = null } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hoje ?? '')) throw new Error('hoje deve ser AAAA-MM-DD');
  const tabelas = Object.fromEntries(ARQUIVOS.map((a) => [a, lerTabela(textos[a])]));
  const rel = { corrigidas: 0, adicionadas: 0, apagadas: 0, confirmadas: 0, avisos: [] };
  const permitido = (arquivo, l) => !clubes || clubes.includes(l[colunaClube(arquivo)]);

  for (const [arquivo, linhasCsv] of Object.entries(resposta.corrigidas)) {
    const t = tabelas[arquivo];
    const lidas = lerCsv(linhasCsv.join('\n')).filter((v) => !(v[0] === t.cab[0]));
    for (const v of lidas) {
      if (v.length !== t.cab.length) {
        rel.avisos.push(`${arquivo}: linha com ${v.length} campos (esperava ${t.cab.length}): ${v.slice(0, 3).join(' / ')}`);
        continue;
      }
      const nova = Object.fromEntries(t.cab.map((c, i) => [c, v[i]]));
      if (!permitido(arquivo, nova)) {
        rel.avisos.push(`${arquivo}: clube fora do lote, ignorado: ${nova[colunaClube(arquivo)]}`);
        continue;
      }
      nova.status = 'revisada';
      nova.verificada_em = hoje;
      const i = t.linhas.findIndex((l) => chaveDe(arquivo, l) === chaveDe(arquivo, nova));
      if (i >= 0) {
        t.linhas[i] = nova;
        rel.corrigidas++;
      } else {
        t.linhas.push(nova);
        rel.adicionadas++;
      }
    }
  }

  for (const campos of resposta.apagar) {
    const { arquivo, bate } = alvos(campos);
    const antes = tabelas[arquivo].linhas.length;
    tabelas[arquivo].linhas = tabelas[arquivo].linhas.filter((l) => !(bate(l) && permitido(arquivo, l)));
    const n = antes - tabelas[arquivo].linhas.length;
    rel.apagadas += n;
    if (n === 0) rel.avisos.push(`APAGAR sem linha correspondente: ${campos.join(' | ')}`);
  }

  for (const campos of resposta.confirmadas) {
    const { arquivo, bate } = alvos(campos);
    let n = 0;
    for (const l of tabelas[arquivo].linhas) {
      if (!bate(l) || !permitido(arquivo, l)) continue;
      if (l.status === 'rascunho') l.observacao = `${l.observacao} Conferido em ${hoje} (segunda sessão, outra IA).`.trim();
      l.status = 'revisada';
      l.verificada_em = hoje;
      n++;
    }
    rel.confirmadas += n;
    if (n === 0) rel.avisos.push(`CONFIRMADAS sem linha correspondente: ${campos.join(' | ')}`);
  }

  return { textos: Object.fromEntries(ARQUIVOS.map((a) => [a, escreverTabela(tabelas[a])])), rel };
}

/** Linhas do lote que continuam em rascunho depois de aplicar (para o revisor ver o que faltou). */
export function pendentes(textos, clubes) {
  const faltam = [];
  for (const a of ARQUIVOS) {
    for (const l of lerTabela(textos[a]).linhas) {
      if (l.status === 'rascunho' && (!clubes || clubes.includes(l[colunaClube(a)]))) faltam.push(`${a}: ${chaveDe(a, l)}`);
    }
  }
  return faltam;
}

function principal() {
  const args = process.argv.slice(2);
  const arq = args.find((a) => !a.startsWith('--'));
  const opc = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1];
  if (!arq) {
    console.error('Uso: node scripts/casa/aplicar-conferencia.mjs resposta.txt [--clubes=a,b,c] [--hoje=AAAA-MM-DD] [--seco]');
    process.exit(1);
  }
  const hoje = opc('hoje') ?? new Date().toISOString().slice(0, 10);
  const clubes = opc('clubes')?.split(',').map((c) => c.trim()) ?? null;
  const textos = Object.fromEntries(ARQUIVOS.map((a) => [a, readFileSync(new URL(`${a}.csv`, PASTA), 'utf8')]));
  const { textos: novos, rel } = aplicar(textos, lerResposta(readFileSync(arq, 'utf8')), { hoje, clubes });
  console.log(`corrigidas ${rel.corrigidas}, adicionadas ${rel.adicionadas}, apagadas ${rel.apagadas}, confirmadas ${rel.confirmadas}`);
  for (const a of rel.avisos) console.log(`AVISO: ${a}`);
  const faltam = pendentes(novos, clubes);
  console.log(faltam.length ? `Ainda em rascunho (${faltam.length}):\n  ${faltam.slice(0, 40).join('\n  ')}${faltam.length > 40 ? '\n  …' : ''}` : 'Nenhuma linha do lote ficou em rascunho.');
  if (args.includes('--seco')) return console.log('(simulação: nada foi gravado)');
  for (const a of ARQUIVOS) writeFileSync(new URL(`${a}.csv`, PASTA), novos[a]);
  console.log('Gravado em dados/casa/. Rode npm test e revise o git diff.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) principal();
