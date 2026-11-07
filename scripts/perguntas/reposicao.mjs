// Reposição do banco de perguntas pelo gerador (função gerar-conteudo, modo "reposicao").
// Puro (sem disco nem rede): copiado para supabase/functions/_shared/perguntas por `npm run compartilhar`
// e testado em reposicao.test.ts. Acha o clube × degrau que mais falta para a cota (docs/jogo.md, 7.1).

import { CLUBES } from './validar.mjs';

/**
 * Cota por clube: a meta do lançamento, 30 por clube (docs/jogo.md, 7.1). É só a mira do robô: pergunta válida
 * não é aposentada por o clube já ter passado dela (decidido em 06/11/2026).
 */
export const COTA = { facil: 9, media: 9, dificil: 6, craque: 6 };
const DEGRAU_POR_NUMERO = { 1: 'facil', 2: 'media', 3: 'dificil', 4: 'craque' };
const ORDEM = Object.keys(COTA);

/** Degrau em texto ('facil'…'craque') a partir do número do banco (1 a 4) ou do próprio texto. */
const nomeDoDegrau = (d) => DEGRAU_POR_NUMERO[d] ?? d;

/**
 * Vagas em aberto, da maior falta para a menor (empate: fácil antes, depois ordem dos clubes).
 * `ativas`: { clube, degrau } das perguntas ativas (degrau 1 a 4); `pendentes`: { clube, degrau } dos
 * rascunhos e pré-aprovadas ainda sem revisão (degrau em texto). Clube "geral" não tem cota aqui.
 */
export function vagasEmAberto(ativas, pendentes = [], cota = COTA) {
  const contagem = new Map();
  for (const p of [...ativas, ...pendentes]) {
    const chave = `${p.clube}|${nomeDoDegrau(p.degrau)}`;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  const vagas = [];
  for (const clube of CLUBES) {
    for (const degrau of ORDEM) {
      const falta = cota[degrau] - (contagem.get(`${clube}|${degrau}`) ?? 0);
      if (falta > 0) vagas.push({ clube, degrau, falta });
    }
  }
  return vagas.sort((a, b) => b.falta - a.falta || ORDEM.indexOf(a.degrau) - ORDEM.indexOf(b.degrau) || CLUBES.indexOf(a.clube) - CLUBES.indexOf(b.clube));
}

/** Uma vaga entre as de maior falta (sorteio no empate, para não insistir sempre no mesmo clube); null se a cota está cheia. */
export function escolherVaga(ativas, pendentes = [], sorteio = Math.random, cota = COTA) {
  const vagas = vagasEmAberto(ativas, pendentes, cota);
  if (!vagas.length) return null;
  const topo = vagas.filter((v) => v.falta === vagas[0].falta);
  return topo[Math.min(topo.length - 1, Math.floor(sorteio() * topo.length))];
}
