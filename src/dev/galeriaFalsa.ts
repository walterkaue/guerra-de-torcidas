// Só em desenvolvimento (npm run dev): imita o servidor da Galeria, das 52 semanas e das Campeãs, para conferir as
// telas e a placa da Home sem banco nem login. Nunca entra no build de produção (import atrás de import.meta.env.DEV).
// ?galeriaFalsa= cheia (temporada rodando, troféus de vários tipos, placa na Home) | pre (pré-temporada: Galeria
// vazia de verdade, 52 semanas de teste) | vazia (logo depois do zerar: nada ganho ainda) | erro (falha de rede).
// As datas andam com o relógio: o troféu mais novo é da semana passada, para a placa da Home aparecer.

import { ID_OUTRO, TIMES } from '../dados/times';
import { semanaBrasilia } from '../servidor/tempo';
import type { CampeaDeEstado, Linha52, LinhaDaSemana, LinhaDoMes, SerieDoMes, Trofeu } from '../jogo/galeria';
import type { Serie } from '../jogo/temporada';
import type { DadosDaFicha, ServidorDaGaleria } from '../servidor/galeria';

const IDS = TIMES.filter((t) => t.id !== ID_OUTRO).map((t) => t.id);
const DIA = 24 * 3600_000;
const ms = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const SEGUNDA = semanaBrasilia();
const semanaAtras = (n: number) => iso(ms(SEGUNDA) - n * 7 * DIA);
const MES = `${SEGUNDA.slice(0, 7)}-01`;
const mesAtras = (n: number) => iso(Date.UTC(Number(MES.slice(0, 4)), Number(MES.slice(5, 7)) - 1 - n, 1));

const semana = (time_id: string, s: string, serie: Serie, trofeu: Trofeu['trofeu'] = 'campeao_semana'): Trofeu => ({
  trofeu,
  prateleira: trofeu === 'maior_torcida' ? 'vitrine' : 'trofeus',
  time_id,
  semana: s,
  mes: null,
  serie: trofeu === 'maior_torcida' ? null : serie,
});
const doMes = (time_id: string, mes: string, trofeu: Trofeu['trofeu'], serie: Serie): Trofeu => ({
  trofeu,
  prateleira: 'trofeus',
  time_id,
  semana: null,
  mes,
  serie,
});

/**
 * A história de um time em "cheia": estreia há 5 meses, campeão da A há 4, caiu há 3, campeão da B e acesso há 2,
 * campeão da A no mês passado; flâmulas e megafones espalhados, os mais novos da semana passada.
 */
function historia(id: string): Trofeu[] {
  const completo = IDS.indexOf(id) % 2 === 0 || id === IDS[0];
  const base = [semana(id, semanaAtras(1), 'a'), semana(id, semanaAtras(1), 'a', 'maior_torcida'), semana(id, semanaAtras(3), 'a', 'maior_torcida')];
  if (!completo) return [semana(id, semanaAtras(2), 'a'), semana(id, semanaAtras(9), 'b')];
  return [
    ...base,
    semana(id, semanaAtras(2), 'a'),
    semana(id, semanaAtras(9), 'b'),
    semana(id, semanaAtras(14), 'a', 'maior_torcida'),
    semana(id, semanaAtras(21), 'unica'),
    doMes(id, mesAtras(1), 'campeao_temporada', 'a'),
    doMes(id, mesAtras(2), 'campeao_serie_b', 'b'),
    doMes(id, mesAtras(2), 'acesso', 'b'),
    doMes(id, mesAtras(3), 'rebaixamento', 'a'),
    doMes(id, mesAtras(4), 'campeao_temporada', 'a'),
    doMes(id, mesAtras(5), 'campeao_estreia', 'unica'),
  ];
}

function linhas52(cenario: string): Linha52[] {
  const vazia = cenario === 'vazia';
  return IDS.map((time_id, i) => ({
    posicao: i + 1,
    time_id,
    pontos: vazia ? 0 : Math.max(0, 230 - i * 11 - (i % 3) * 2),
    vitorias: vazia ? 0 : Math.max(0, 4 - i),
    ultima_posicao: vazia ? null : ((i * 7) % 20) + 1,
    semanas: vazia ? 0 : 10,
    desde: vazia ? null : semanaAtras(10),
    ate: vazia ? null : semanaAtras(1),
  }));
}

const CIDADES: Record<string, { codigo: number; nome: string }[]> = {
  SP: [
    { codigo: 3548500, nome: 'Santos' },
    { codigo: 3509502, nome: 'Campinas' },
    { codigo: 3550308, nome: 'São Paulo' },
    { codigo: 3506003, nome: 'Bauru' },
  ],
  RJ: [
    { codigo: 3304557, nome: 'Rio de Janeiro' },
    { codigo: 3303302, nome: 'Niterói' },
  ],
};

function campeas(uf: string): CampeaDeEstado[] {
  const cidades = CIDADES[uf] ?? [];
  if (!cidades.length) return [];
  const ordem = [1, 0, 1, 2, 1, 0, 3, 1];
  return ordem.map((k, i) => ({ semana: semanaAtras(i + 1), uf, ...cidades[k % cidades.length] }));
}

function ficha(t: Trofeu): DadosDaFicha {
  if (t.semana) {
    const outros = IDS.filter((id) => id !== t.time_id);
    const ordem = [t.time_id, ...outros];
    const semana: LinhaDaSemana[] = ordem.map((time_id, i) => ({
      time_id,
      ativos: Math.max(1, 48 - i * 2),
      soma: Math.max(10, 6830 - i * 310),
      media30: Math.round((142.3 - i * 4.15) * 100) / 100,
      posicao_campeao: i + 1,
      posicao_soma: i + 1,
    }));
    const serie = t.serie ?? 'unica';
    const series = new Map<string, Serie>(
      serie === 'unica' ? [] : ordem.map((id, i) => [id, i === 0 ? serie : i % 2 === 0 ? serie : serie === 'a' ? 'b' : 'a']),
    );
    return { semana, series, meusPontos: 340 };
  }
  const mes: LinhaDoMes[] = [t.time_id, ...IDS.filter((id) => id !== t.time_id)].map((time_id, i) => ({
    time_id,
    serie: t.serie ?? 'unica',
    posicao: i + 1,
    pontos: Math.max(0, 86 - i * 9),
    vitorias: Math.max(0, 3 - i),
  }));
  return { mes, meusPontos: null };
}

export function servidorFalso(cenario: string): ServidorDaGaleria {
  const espera = <T>(v: T, atraso = 200) =>
    new Promise<T>((ok, falha) => setTimeout(() => (cenario === 'erro' ? falha(new Error('falha')) : ok(v)), atraso));
  const cheia = cenario === 'cheia' || cenario === '';
  return {
    trofeusDoTime: (id) => espera(cheia ? historia(id) : []),
    ranking52: () => espera(linhas52(cenario)),
    campeasDoEstado: (uf) => espera(cheia ? campeas(uf) : []),
    temporadas: () => espera(cenario === 'pre' ? [{ mes: MES, pre_temporada: true }] : [{ mes: MES, pre_temporada: false }]),
    historicoDeSeries: (): Promise<SerieDoMes[]> =>
      espera(
        cheia
          ? [
              { mes: mesAtras(5), serie: 'unica' },
              { mes: mesAtras(4), serie: 'a' },
              { mes: mesAtras(3), serie: 'a' },
              { mes: mesAtras(2), serie: 'b' },
              { mes: mesAtras(1), serie: 'a' },
              { mes: MES, serie: 'a' },
            ]
          : [],
      ),
    dadosDaFicha: (t) => espera(ficha(t), 350),
    minhaCidade: () => espera(cheia ? { codigo: 3509502, uf: 'SP' } : null),
  };
}
