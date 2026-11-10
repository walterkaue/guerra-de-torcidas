// Só em desenvolvimento (npm run dev, com ?lancesFalsos na URL): imita a função "lances" e as RPCs de medalhas
// no próprio navegador, com o motor local, para conferir as telas sem banco nem login: `{ lance }` (3 tentativas do
// mesmo lance, tabela de 08/11/2026, limite 10, 3 melhores do dia) e o X1.
//   ?lancesFalsos=limite   a 1ª partida já responde "limite_do_dia" (já jogou as de hoje)
//   &x1=ok|proprio|expirado|nao   como o X1 por link (?l=CODIGO) responde (padrão ok): aceita, 409, 410 ou 404
//   ?caiNoLance=2          o 2º lance de cada partida falha (confere o aviso de conexão caída)
//   ?latencia=800          demora da resposta (padrão 180 ms)
// Tela do convite (?d=, ?l= e ?p=, telas/convite.ts): o resumo do X1 dos Lances (?l=) aceita,
//   &chamouTime=<id>  o time de quem chamou (define as faixas do convite: ele e o rival dele; &chamouTime=outro: sem faixas)
//   &x1Vencido        o resumo vem com vencido (a placa vira o aviso de 7 dias)
//   &x1NaoExiste      o resumo vem null (o código não existe)
//   &x1SemGols, &x1SemTentativas   as tentativas de quem chamou (src/dev/tentativasFalsas.ts)
//   &chamouSemApelido  quem chamou não tem apelido (menos de 16 ou sem apelido): "de quem te chamou"
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import { LANCES } from '../dados/lances';
import { bonecoFalsoDeQuemChamou, timeFalsoDeQuemChamou } from './bonecoDeCampoFalso'; // o boneco falso em campo (&boneco=, &semBoneco, &emCampo=0, &chamouBoneco=, &chamouSemBoneco)
import { DISPUTAS } from '../dados/disputas';
import { sementeNova } from '../jogo/aleatorio';
import { TABELA_LANCES_UNIFICADA, medalhaDoLance, type Faixa, type Lance } from '../jogo/lances';
import { faixaNaTela } from '../jogo/lancesTextos';
import { LANCES_PARTIDAS_POR_DIA_UNIFICADO, MELHORES_DO_DIA, itemPenaltis, medalhaDaDisputa } from '../jogo/regraLances';
import {
  goleiroParaOCelular,
  fecharPartidaLances,
  jogarLanceDoJogo,
  type FechamentoLances,
  type GestosLances,
  type RespostaLanceDoJogo,
  type RespostaNovaLances,
} from '../jogo/lancesPartida';
import type { GestoCobranca } from '../jogo/penaltis';
import {
  ErroServidor,
  type LancesHoje,
  type MedalhaDoLance,
  type PedidoLances,
  type ResumoDesafioLances,
  type VitrineDoTime,
} from '../servidor/api';
import { semanaBrasilia } from '../servidor/tempo';
import { DISPUTAS_FALSAS } from './disputasFalsas';
import { comTentativasFalsas } from './tentativasFalsas';

const parametros = new URLSearchParams(location.search);
const latencia = Number(parametros.get('latencia')) || 180;
const caiNoLance = Number(parametros.get('caiNoLance')) || 0;
const noLimite = parametros.get('lancesFalsos') === 'limite';
const x1 = parametros.get('x1') ?? 'ok';
const espera = () => new Promise((ok) => setTimeout(ok, latencia));
const limiteDoDia = () => LANCES_PARTIDAS_POR_DIA_UNIFICADO;

let feitas = noLimite ? limiteDoDia() : 0;
let melhor: number | null = null;
let recorde: number | null = null;
/** Pontos das partidas falsas de hoje (as 3 melhores contam). */
const doDia: number[] = [];
const melhoresDoDia = () => [...doDia].sort((a, b) => b - a).slice(0, MELHORES_DO_DIA);
const CODIGO_FALSO = 'ABCD2345';
// Medalhas de mentira, nos lances do Flamengo primeiro (o time de teste): sem gol, bronze, 23 gols com 4 recriados,
// 52 com 6 (faltam recriados), ouro completo, e dois quase na próxima medalha (4 e 19 gols) para ver a subida.
// A partida falsa soma os gols dela aqui, então "+1 rumo ao…" e a comemoração aparecem de verdade.
const peso = (l: Lance) => (l.tipo !== 'falta' ? 0 : l.clube === 'flamengo' ? 2 : 1);
const ordemDoAlbum = [...LANCES].sort((a, b) => peso(b) - peso(a));
const medalhasFalsas = new Map<string, { gols: number; recriados: number; vitorias: number }>(
  [
    [5, 1],
    [23, 4],
    [52, 11],
    [4, 0],
    [52, 6],
    [19, 3],
  ].map(([gols, recriados], i) => [ordemDoAlbum[i].id, { gols, recriados, vitorias: 0 }]),
);
// Medalhas dos pênaltis, por disputa do catálogo, nas do Flamengo e da Seleção primeiro: a 1ª com
// 55 gols e 10 vitórias (prata, perto do ouro), a 2ª com 9 gols (um gol de subir pro bronze), a 3ª com 12 gols e 3 vitórias
// (bronze) e a 4ª com 30 gols. Não existe mais Disputa livre.
const pesoDaDisputa = (c: string) => (c === 'flamengo' ? 0 : c === 'selecao' ? 1 : 2);
const catalogoDeDisputas = [...(parametros.has('disputasFalsas') ? DISPUTAS_FALSAS : DISPUTAS)].sort((a, b) => pesoDaDisputa(a.clube) - pesoDaDisputa(b.clube));
[
  { gols: 55, vitorias: 10 },
  { gols: 9, vitorias: 0 },
  { gols: 12, vitorias: 3 },
  { gols: 30, vitorias: 2 },
].forEach((n, i) => {
  const d = catalogoDeDisputas[i];
  if (d) medalhasFalsas.set(itemPenaltis(d.id), { ...n, recriados: 0 });
});

/** O lance do X1 falso: o primeiro do álbum (um do Flamengo). */
const lanceDoX1 = () => ordemDoAlbum[0];
let pontosDoX1 = 96;

let estado: { cenas: Lance[]; gestos: GestosLances; chamadas: number; desafio: boolean } | null = null;

/** O X1 falso, como `ver_desafio_lances` o devolve (null: link quebrado). */
export async function verDesafioLances(id: string): Promise<ResumoDesafioLances | null> {
  await espera();
  if (!id || x1 === 'nao' || new URLSearchParams(location.search).has('x1NaoExiste')) return null;
  const l = lanceDoX1();
  const resumo = { id, time_id: timeFalsoDeQuemChamou('palmeiras'), apelido: parametros.has('chamouSemApelido') ? null : 'Camisa10', lance_id: l.id, pontos: 96, gols: 3, recriados: 1, faixa: faixaNaTela(l).faixa, boneco: bonecoFalsoDeQuemChamou(), vencido: parametros.has('x1Vencido') };
  return comTentativasFalsas(resumo, l, parametros);
}

export async function novaPartidaLances(p: PedidoLances): Promise<RespostaNovaLances> {
  await espera();
  let cenas: Lance[];
  let desafio: RespostaNovaLances['desafio'] = null;
  if ('desafio' in p) {
    if (x1 === 'nao') throw new ErroServidor('desafio_nao_encontrado');
    if (x1 === 'proprio') throw new ErroServidor('proprio_desafio');
    if (x1 === 'expirado') throw new ErroServidor('desafio_expirado');
    const l = lanceDoX1();
    // Os pontos a bater são os das tentativas falsas de quem chamou (o resumo e a partida batem).
    pontosDoX1 = (await verDesafioLances(p.desafio))?.pontos ?? 96;
    desafio = { codigo: p.desafio, timeId: timeFalsoDeQuemChamou('palmeiras'), apelido: 'Camisa10', pontos: pontosDoX1 };
    cenas = [l, l, l];
  } else {
    const l = LANCES.find((o) => o.id === p.lance);
    if (!l) throw new ErroServidor('lances_invalidos');
    cenas = [l, l, l];
  }
  if (feitas >= limiteDoDia()) throw new ErroServidor('limite_do_dia');
  // A faixa que vale na partida (a do catálogo recalibrado), gravada nela.
  const faixas: Faixa[] = cenas.map((l) => faixaNaTela(l).faixa);
  cenas = cenas.map((l, i) => ({ ...l, faixa: faixas[i] }));
  feitas++;
  const sementes = cenas.map(() => sementeNova());
  estado = { cenas, gestos: { lances: cenas.map((l) => l.id), sementes, cobrancas: [] }, chamadas: 0, desafio: !!desafio };
  return {
    partidaId: 'falsa',
    expiraEm: new Date(Date.now() + 15 * 60_000).toISOString(),
    lances: cenas.map((l) => l.id),
    faixas,
    ...(desafio ? { desafio } : {}),
    goleiroX: goleiroParaOCelular(sementes[0], 0, cenas[0]),
    restantesHoje: limiteDoDia() - feitas,
  };
}

export async function lanceDoJogo(_id: string, i: number, gesto: GestoCobranca): Promise<RespostaLanceDoJogo> {
  await espera();
  const e = estado;
  if (!e) throw new ErroServidor('partida_nao_encontrada');
  if (++e.chamadas === caiNoLance) throw new ErroServidor('tempo_esgotado');
  const tabela = TABELA_LANCES_UNIFICADA;
  const j = jogarLanceDoJogo(e.cenas, e.gestos, i, gesto, tabela);
  e.gestos = j.gestos;
  let fim: FechamentoLances | null = null;
  if (i === 2) {
    const resultado = fecharPartidaLances(e.gestos.sementes, e.cenas, e.gestos.cobrancas, tabela);
    const novas: { lanceId: string; medalha: 'bronze' | 'prata' | 'ouro' }[] = [];
    resultado.lances.forEach((r, k) => {
      if (r.desfecho !== 'gol') return;
      const id = e.cenas[k].id;
      const antes = medalhasFalsas.get(id) ?? { gols: 0, recriados: 0, vitorias: 0 };
      const depois = { gols: antes.gols + 1, recriados: antes.recriados + (r.recriou ? 1 : 0), vitorias: 0 };
      medalhasFalsas.set(id, depois);
      const m = medalhaDoLance(depois.gols, depois.recriados);
      if (m && m !== medalhaDoLance(antes.gols, antes.recriados)) novas.push({ lanceId: id, medalha: m });
    });
    if (melhor === null || resultado.pontos > melhor) melhor = resultado.pontos;
    doDia.push(resultado.pontos);
    const conta = melhoresDoDia().includes(resultado.pontos);
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
      restantesHoje: limiteDoDia() - feitas,
      melhoresDoDia: melhoresDoDia(),
      desafio: e.desafio ? null : { codigo: CODIGO_FALSO },
      comparacao: e.desafio ? { desafiante: 'Camisa10', pontosDesafiante: pontosDoX1, venceu: resultado.pontos > pontosDoX1 } : null,
    };
  }
  return { lance: j.lance, goleiroProximo: j.goleiroProximo, fim };
}

export async function meusLancesHoje(): Promise<LancesHoje | null> {
  await espera();
  return { feitas, limite: limiteDoDia(), melhor, melhores: melhoresDoDia() };
}

export async function minhasMedalhas(): Promise<MedalhaDoLance[]> {
  await espera();
  return [...medalhasFalsas].map(([lance_id, n]) => ({
    lance_id,
    ...n,
    medalha: lance_id.startsWith('penaltis:') ? medalhaDaDisputa(n.gols, n.vitorias) : medalhaDoLance(n.gols, n.recriados),
  }));
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
