// Só em desenvolvimento (npm run dev, com ?lancesFalsos na URL): imita a função "lances" e as RPCs de medalhas
// no próprio navegador, com o motor local, para conferir as telas sem banco nem login.
//   ?lancesFalsos=limite   a 1ª partida já responde "limite_do_dia" (já jogou as 6 de hoje)
//   ?caiNoLance=2          o 2º lance de cada partida falha (confere o aviso de conexão caída)
//   ?latencia=800          demora da resposta (padrão 180 ms)
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import { LANCES } from '../dados/lances';
import { sementeNova } from '../jogo/aleatorio';
import { medalhaDoLance, type Lance } from '../jogo/lances';
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
// Medalhas de mentira, nos lances do Flamengo primeiro (o time de teste): sem gol, bronze, 23 gols com 4 recriados,
// 52 com 6 (faltam recriados), ouro completo, e dois quase na próxima medalha (4 e 19 gols) para ver a subida.
// A partida falsa soma os gols dela aqui, então "+1 rumo ao…" e a comemoração aparecem de verdade.
const peso = (l: Lance) => (l.tipo !== 'falta' ? 0 : l.clube === 'flamengo' ? 2 : 1);
const ordemDoAlbum = [...LANCES].sort((a, b) => peso(b) - peso(a));
const medalhasFalsas = new Map<string, { gols: number; recriados: number }>(
  [
    [5, 1],
    [23, 4],
    [52, 11],
    [4, 0],
    [52, 6],
    [19, 3],
  ].map(([gols, recriados], i) => [ordemDoAlbum[i].id, { gols, recriados }]),
);

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
    const novas: { lanceId: string; medalha: 'bronze' | 'prata' | 'ouro' }[] = [];
    resultado.lances.forEach((r, k) => {
      if (r.desfecho !== 'gol') return;
      const id = e.cenas[k].id;
      const antes = medalhasFalsas.get(id) ?? { gols: 0, recriados: 0 };
      const depois = { gols: antes.gols + 1, recriados: antes.recriados + (r.recriou ? 1 : 0) };
      medalhasFalsas.set(id, depois);
      const m = medalhaDoLance(depois.gols, depois.recriados);
      if (m && m !== medalhaDoLance(antes.gols, antes.recriados)) novas.push({ lanceId: id, medalha: m });
    });
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
      medalhas: novas,
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
  return [...medalhasFalsas].map(([lance_id, n]) => ({ lance_id, ...n, medalha: medalhaDoLance(n.gols, n.recriados) }));
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
