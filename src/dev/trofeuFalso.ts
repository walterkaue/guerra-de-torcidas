// Só em desenvolvimento: troféus de mentira para conferir o card do troféu (?cardFalso&tipo=trofeu e
// /dev/cards.html?personalizados), sem servidor. Nunca entra no build de produção.

import type { Time } from '../dados/times';
import { dadosDoCardDoTrofeu } from '../jogo/cardTrofeuDados';
import type { DadosDoCard } from '../jogo/cardPersonalizado';
import type { NumeroDaFicha, Trofeu } from '../jogo/galeria';
import { fraseDaGaleria } from '../narrador/galeria';

export type AmostraDeTrofeu = 'semana' | 'mes' | 'vitrine' | 'estreia';

const SEMANA: NumeroDaFicha[] = [
  { valor: '88,4', rotulo: 'média dos 30' },
  { valor: '214', rotulo: 'jogaram' },
  { valor: '+12,6', rotulo: 'sobre o 2º' },
];

export function trofeuDeAmostra(amostra: AmostraDeTrofeu, timeId: string): { trofeu: Trofeu; numeros: NumeroDaFicha[] } {
  const base = { prateleira: 'trofeus' as const, time_id: timeId, semana: null, mes: null };
  switch (amostra) {
    case 'mes':
      return {
        trofeu: { ...base, trofeu: 'campeao_temporada', mes: '2027-03-01', serie: 'a' },
        numeros: [{ valor: '1.240', rotulo: 'pontos' }, { valor: '3', rotulo: 'vitórias de semana' }, { valor: '1º', rotulo: 'posição' }],
      };
    case 'vitrine':
      return {
        trofeu: { ...base, prateleira: 'vitrine', trofeu: 'maior_torcida', semana: '2026-11-02', serie: null },
        numeros: [{ valor: '18.420', rotulo: 'pontos somados' }, { valor: '531', rotulo: 'jogaram' }, { valor: '+2.310', rotulo: 'sobre o 2º' }],
      };
    case 'estreia':
      return {
        trofeu: { ...base, trofeu: 'campeao_estreia', mes: '2026-12-01', serie: 'unica' },
        numeros: [{ valor: '2.015', rotulo: 'pontos' }, { valor: '4', rotulo: 'vitórias de semana' }, { valor: '1º', rotulo: 'posição' }],
      };
    default:
      return { trofeu: { ...base, trofeu: 'campeao_semana', semana: '2026-11-02', serie: 'a' }, numeros: SEMANA };
  }
}

/** Os dados do card de um troféu de amostra. `somou`: a pessoa somou na semana (só conta em troféu de semana do próprio time). */
export function dadosDeAmostraDoTrofeu(
  amostra: AmostraDeTrofeu,
  time: Time,
  o: { somou: boolean; outroTime?: boolean; apelido?: string | null; nivel?: string | null; luz?: DadosDoCard['luz'] },
): DadosDoCard {
  const { trofeu, numeros } = trofeuDeAmostra(amostra, time.id);
  const d = dadosDoCardDoTrofeu({
    trofeu,
    time,
    numeros,
    meusPontos: o.somou ? 340 : null,
    ehDoMeuTime: !o.outroTime,
    apelido: o.apelido,
    frase: fraseDaGaleria(trofeu.trofeu, time, () => 0) ?? '',
    nivel: o.nivel ?? 'Craque',
  });
  return o.luz ? { ...d, luz: o.luz } : d;
}
