// Só em desenvolvimento (npm run dev, com ?lancesFalsos na URL): imita a função "lances" e as RPCs de medalhas
// no próprio navegador, com o motor local, para conferir as telas sem banco nem login.
//   ?lancesFalsos=limite   a 1ª partida já responde "limite_do_dia" (já jogou as 6 de hoje)
//   ?caiNoLance=2          o 2º lance de cada partida falha (confere o aviso de conexão caída)
//   ?latencia=800          demora da resposta (padrão 180 ms)
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import { LANCES } from '../dados/lances';
import { sementeNova } from '../jogo/aleatorio';
import type { Lance } from '../jogo/lances';
import {
  LANCES_PARTIDAS_POR_DIA,
  goleiroParaOCelular,
  fecharPartidaLances,
  jogarLanceDoJogo,
  type FechamentoLances,
  type GestosLances,
  type RespostaLanceDoJogo,
  type RespostaNovaLances,
} from '../jogo/lancesPartida';
import type { GestoCobranca } from '../jogo/penaltis';
import { ErroServidor, type LancesHoje, type MedalhaDoLance, type VitrineDoTime } from '../servidor/api';
import { semanaBrasilia } from '../servidor/tempo';

const parametros = new URLSearchParams(location.search);
const latencia = Number(parametros.get('latencia')) || 180;
const caiNoLance = Number(parametros.get('caiNoLance')) || 0;
const noLimite = parametros.get('lancesFalsos') === 'limite';
const espera = () => new Promise((ok) => setTimeout(ok, latencia));

let feitas = noLimite ? LANCES_PARTIDAS_POR_DIA : 0;
let melhor: number | null = null;
let recorde: number | null = null;
let estado: { cenas: Lance[]; gestos: GestosLances; chamadas: number } | null = null;

export async function novaPartidaLances(ids: string[]): Promise<RespostaNovaLances> {
  await espera();
  if (feitas >= LANCES_PARTIDAS_POR_DIA) throw new ErroServidor('limite_do_dia');
  const cenas = ids.map((id) => LANCES.find((l) => l.id === id)).filter((l): l is Lance => !!l);
  if (cenas.length !== 3) throw new ErroServidor('lances_invalidos');
  feitas++;
  const sementes = cenas.map(() => sementeNova());
  estado = { cenas, gestos: { lances: ids, sementes, cobrancas: [] }, chamadas: 0 };
  return {
    partidaId: 'falsa',
    expiraEm: new Date(Date.now() + 15 * 60_000).toISOString(),
    goleiroX: goleiroParaOCelular(sementes[0], 0, cenas[0]),
    restantesHoje: LANCES_PARTIDAS_POR_DIA - feitas,
  };
}

export async function lanceDoJogo(_id: string, i: number, gesto: GestoCobranca): Promise<RespostaLanceDoJogo> {
  await espera();
  const e = estado;
  if (!e) throw new ErroServidor('partida_nao_encontrada');
  if (++e.chamadas === caiNoLance) throw new ErroServidor('tempo_esgotado');
  const j = jogarLanceDoJogo(e.cenas, e.gestos, i, gesto);
  e.gestos = j.gestos;
  let fim: FechamentoLances | null = null;
  if (i === 2) {
    const resultado = fecharPartidaLances(e.gestos.sementes, e.cenas, e.gestos.cobrancas);
    const antes = melhor;
    const conta = antes === null || resultado.pontos > antes;
    if (conta) melhor = resultado.pontos;
    const novoRecorde = recorde !== null && resultado.pontos > recorde;
    recorde = Math.max(recorde ?? 0, resultado.pontos);
    fim = {
      resultado,
      semana: semanaBrasilia(),
      contaNoRanking: conta,
      sobSuspeita: false,
      melhorDoDia: melhor,
      ranking: { antes: null, depois: null },
      confirmadaEm: new Date().toISOString(),
      desempenho: { posicao: 3, total: 14, recorde, novo_recorde: novoRecorde },
      // Sempre uma medalha nova no 1º lance, para conferir o selo.
      medalhas: [{ lanceId: e.cenas[0].id, medalha: 'bronze' }],
      restantesHoje: LANCES_PARTIDAS_POR_DIA - feitas,
    };
  }
  return { lance: j.lance, goleiroProximo: j.goleiroProximo, fim };
}

export async function meusLancesHoje(): Promise<LancesHoje | null> {
  await espera();
  return { feitas, limite: LANCES_PARTIDAS_POR_DIA, melhor };
}

export async function minhasMedalhas(): Promise<MedalhaDoLance[]> {
  await espera();
  const ids = LANCES.slice(0, 5).map((l) => l.id);
  return [
    { lance_id: ids[0], gols: 5, recriados: 1, medalha: 'bronze' },
    { lance_id: ids[1], gols: 23, recriados: 4, medalha: 'prata' },
    { lance_id: ids[2], gols: 52, recriados: 11, medalha: 'ouro' },
    { lance_id: ids[3], gols: 2, recriados: 0, medalha: null },
    { lance_id: ids[4], gols: 50, recriados: 6, medalha: 'prata' },
  ];
}

export async function vitrineMedalhas(): Promise<VitrineDoTime[]> {
  await espera();
  return [
    { time_id: 'flamengo', bronze: 14, prata: 6, ouro: 2 },
    { time_id: 'palmeiras', bronze: 3, prata: 9, ouro: 2 },
    { time_id: 'remo', bronze: 4, prata: 0, ouro: 0 },
    { time_id: 'bahia', bronze: 0, prata: 0, ouro: 0 },
  ];
}
