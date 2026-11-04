// Só em desenvolvimento (npm run dev, com ?aquecimentoFalso na URL): imita o servidor do Aquecimento no próprio
// navegador, para conferir a tela sem banco nem login. Nunca entra no build de produção (o import fica atrás
// de import.meta.env.DEV).
//   &semCrava       sem jogo do time na rodada (a barrinha passa a /4)
//   &estacao=N      abre direto na estação N (1 a 5); &estacao=fim abre no fim
//   &semRede        o palpite e o desfecho falham (testa o erro curto e o pendente)

import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { XP_AQUECIMENTO } from '../jogo/aquecimento';
import type { Placar } from '../jogo/crava';
import type { Jogo } from '../servidor/crava';

const params = new URLSearchParams(location.search);
const espera = () => new Promise((ok) => setTimeout(ok, 150));

export async function jogosDoCrava(): Promise<Jogo[]> {
  await espera();
  if (params.has('semCrava')) return [];
  const id = prefs.get().time;
  const time = timePorId(id);
  if (!time || time.id === ID_OUTRO) return [];
  const adversario = timePorId(time.rival) ?? timePorId(time.id === 'palmeiras' ? 'flamengo' : 'palmeiras')!;
  return [
    {
      id: 'jogo-falso',
      rodada: 33,
      mandante_id: time.id,
      visitante_id: adversario.id,
      inicio: new Date(Date.now() + 30 * 3600_000).toISOString(),
      status_api: 'TIMED',
      gols_api_mandante: null,
      gols_api_visitante: null,
      gols_mandante: null,
      gols_visitante: null,
      confirmado_em: null,
      corrigido_em: null,
      anulado: false,
    },
  ];
}

export async function cravar(_jogoId: string, _placar: Placar): Promise<void> {
  await espera();
  if (params.has('semRede')) throw new Error('rede');
}

export async function registrarAquecimento(_desfecho: 'completou' | 'pulou' | 'parou', _estacao: number | null): Promise<number> {
  await espera();
  if (params.has('semRede')) throw new Error('rede');
  return XP_AQUECIMENTO;
}
