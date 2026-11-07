// A parte pesada do "Mandar no grupo" do fim do mês (docs/jogo.md seção 5 e 14.6): junta a frase, os pontos do mês, o
// nível e o texto por Promise e abre a tela SEU CARD. Só carrega no toque (`mandarTemporada.ts` o importa por
// `import()`), para o bundle inicial não crescer.

import { apelidoDoCard } from '../estado';
import { contextoDoFimDoMes, dadosDoCardDoMes, fraseDoFimDoMes, somouNoMes, sorteadorDeFraseDoFim, textoDoCardDoMes } from '../jogo/cardTemporadaDados';
import { LINK_DO_JOGO, quemNoTrofeu } from '../jogo/galeria';
import { segundasDoMes } from '../jogo/temporada';
import { minhaPosicaoSemana } from '../servidor/api';
import { abrirCardPersonalizado } from './cardPersonalizado';
import { nivelParaCard } from './carreira';
import { mandarSoOTextoDoMes, type EntradaDoCardDoMes, type OpcoesDoMandarTemporada } from './mandarTemporada';

/** Os modos falsos de desenvolvimento (?temporadaFalsa): nada vai para o Supabase. Nunca entra no build de produção. */
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('temporadaFalsa');

/**
 * A pessoa somou no mês? Soma `minhaPosicaoSemana` de cada segunda do mês (em paralelo, só com sessão). Se falhar, falso.
 * Limite conhecido, o mesmo da Galeria: a função soma os pontos de todos os times da pessoa, não só os do time do coração.
 */
async function somouNoMesDoServidor(mes: string): Promise<boolean> {
  if (FALSA) return new URLSearchParams(location.search).get('somou') !== '0';
  try {
    const semanas = await Promise.all(segundasDoMes(mes).map((s) => minhaPosicaoSemana(s).catch(() => null)));
    return somouNoMes(semanas.map((p) => p?.pontos));
  } catch {
    return false;
  }
}

export function abrirCardDoMes(e: EntradaDoCardDoMes, o: OpcoesDoMandarTemporada): void {
  const linha = e.linhas.find((l) => l.time_id === e.time.id);
  if (!linha) return void mandarSoOTextoDoMes(e);
  const { ctx, rivalCaiu } = contextoDoFimDoMes(linha, e.linhas, e.time, e.temporada.mes);
  const frase = e.frase?.trim() || fraseDoFimDoMes(e.destino, ctx, rivalCaiu);
  const montado = Promise.all([somouNoMesDoServidor(e.temporada.mes), nivelParaCard().catch(() => null)]).then(([somou, nivel]) => ({
    dados: dadosDoCardDoMes({
      temporada: e.temporada,
      linhas: e.linhas,
      linha,
      time: e.time,
      destino: e.destino,
      frase,
      somou,
      apelido: apelidoDoCard(),
      nivel,
    }),
    texto: textoDoCardDoMes(e.destino, e.time, e.temporada.mes, somou),
  }));
  // No modo falso, o boneco também é de mentira (o padrão lê do servidor).
  const boneco = FALSA ? import('../dev/temporadaCardFalso').then((m) => m.bonecoDeMentira()) : undefined;
  abrirCardPersonalizado({
    raiz: o.raiz,
    dados: montado.then((m) => m.dados),
    texto: montado.then((m) => m.texto),
    link: LINK_DO_JOGO,
    sortearFrase: sorteadorDeFraseDoFim(e.destino, ctx, rivalCaiu, frase || null),
    quemComApelido: (a) => quemNoTrofeu(a),
    ...(boneco ? { boneco } : {}),
  });
}
