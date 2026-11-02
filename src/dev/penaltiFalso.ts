// Só em desenvolvimento (npm run dev, com ?penaltiFalso na URL): imita nova-partida, lance-penalti e
// fechar-partida no próprio navegador, lance a lance, para conferir a tela sem banco nem login.
// ?caiNoLance=3 faz o 3º lance falhar (confere o aviso de conexão caída).
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import { sementeNova } from '../jogo/aleatorio';
import { simularPartida, type Gestos } from '../jogo/penaltis';
import { jogarLance, type Lance } from '../jogo/penaltisLance';
import { ErroServidor, type FechamentoDoServidor, type LanceDoServidor, type PartidaDoServidor } from '../servidor/api';

// ?latencia=800 imita o servidor real, que costuma demorar mais que o pé para chegar na bola.
const latencia = Number(new URLSearchParams(location.search).get('latencia')) || 180;
const espera = () => new Promise((ok) => setTimeout(ok, latencia));
const caiNoLance = Number(new URLSearchParams(location.search).get('caiNoLance')) || 0;

let estado: { semente: number; dificuldade: number; gestos: Gestos; lances: number } | null = null;

export async function novaPartida(): Promise<PartidaDoServidor> {
  await espera();
  estado = { semente: sementeNova(), dificuldade: 0.5, gestos: { cobrancas: [], defesas: [] }, lances: 0 };
  return {
    partidaId: 'falsa',
    lanceALance: true,
    proximo: { tipo: 'cobranca', i: 0 },
    dificuldade: 0.5,
    expiraEm: new Date(Date.now() + 15 * 60_000).toISOString(),
    desafio: null,
  };
}

export async function lancePenalti(_id: string, lance: Lance): Promise<LanceDoServidor> {
  await espera();
  const e = estado!;
  if (++e.lances === caiNoLance) throw new ErroServidor('tempo_esgotado');
  const j = jogarLance(e.semente, e.gestos, lance, e.dificuldade);
  e.gestos = j.gestos;
  return { cobranca: j.cobranca ?? null, defesa: j.defesa ?? null, proximo: j.proximo };
}

export async function fecharPartida(_id: string, gestos: Gestos): Promise<FechamentoDoServidor> {
  await espera();
  const e = estado!;
  const resultado = simularPartida(e.semente, { ...e.gestos, ...(gestos.parOuImpar ? { parOuImpar: gestos.parOuImpar } : {}) }, e.dificuldade, 3);
  return {
    resultado,
    numeroNarrador: resultado.parOuImpar?.numeroNarrador ?? null,
    semana: '2026-10-26',
    contaNoRanking: true,
    sobSuspeita: false,
    ranking: { antes: null, depois: null },
    desempenho: null,
    desafio: { codigo: 'falso123' },
    comparacao: null,
  };
}
