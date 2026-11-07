// Só em desenvolvimento: o boneco da pessoa em campo (docs/jogo.md 14.5) para os jogos falsos (?penaltiFalso,
// ?lancesFalsos, ?homeFalsa, ?aquecimentoFalso). Importado pelos servidores falsos, que, ao carregar, trocam a fonte
// do boneco em campo (bonecoEmCampoCena.ts) por esta: é como se fosse a cópia guardada, sem tocar nas chaves reais do
// aparelho (gdt:boneco, gdt:boneco-em-campo). Nunca entra no build de produção.
//
//   &semBoneco         sem cópia guardada: os batedores saem sorteados, como sempre
//   &emCampo=0         interruptor "Meu boneco em campo" desligado (sorteio)
//   &boneco=<variação> um ou mais nomes ligados por hífen, aplicados na ordem sobre o boneco padrão (homem, pele 3, curto,
//                      número 10, testeira, munhequeira, braçadeira). Ex.: &boneco=coque-pele5-n10
//     cabelos     raspado curto crespo trancas coque rabo comprido
//     corpo       h m                      (m = corpo feminino; coque, trancas, rabo e comprido já ligam o m)
//     peles       clara (=pele0)  escura (=pele5)  pele0 a pele5
//     cor cabelo  cor0 a cor5
//     número      n<0 a 99> (ex.: n7, n10, n99)  sn (sem número, camisa lisa)
//                 A cor do número segue a camisa da cena: &time=<id> com camisa clara dá número escuro, e vice-versa.
//     peças       testeira  munhequeira  bronze  bracadeira  chuteiraTime  dourada  liso (tira todas as peças)
//     tudo        liga testeira, munhequeira, braçadeira e chuteira dourada
//     foras       liga TAMBÉM as peças que não entram em campo (colete, apito, pose "braços", fundo estádio, moldura,
//                 camisa de goleiro): prova que nenhuma aparece
//   Atalhos prontos: coque, trancas, rabo, crespo, comprido, clara, escura, tudo, foras, liso.
//   &time=<id>  muda o time do coração (as cores da testeira, da munhequeira e da chuteira "time").
//
// O boneco de quem chamou o X1 (os resumos falsos do desafio, `boneco` de ver_desafio e ver_desafio_lances; ?penaltiFalso
// com ?d=, ?lancesFalsos com ?l= e ?homeFalsa com o convite):
//   &chamouBoneco=<variação>  as mesmas variações do &boneco=, aplicadas sobre o boneco padrão de quem chamou
//                             (mulher, trancas, pele 2, número 7). Ex.: &chamouBoneco=coque-pele5-n7
//   &chamouSemBoneco          o servidor devolve boneco null (sem boneco, ou interruptor dele desligado): batedores
//                             sorteados e nenhum busto
//   &chamouTime=<id>          o time de quem chamou (padrão: o do resumo falso de cada tela), para ver as cores dele
//   Sem nenhum dos dois, o falso devolve o boneco padrão de quem chamou. Só as 9 chaves de campo, como o servidor.

import { definirFonteDoBoneco } from '../telas/bonecoEmCampoCena';
import { PADRAO, conferirFormato, type Vestimenta } from '../jogo/vestiario';
import type { VestimentaDeCampo } from '../telas/bonecoEmCampo';

const PADRAO_DE_CAMPO: Vestimenta = { ...PADRAO, corpo: 'h', pele: 3, cabelo: 'curto', corCabelo: 0, numero: '10', cabeca: 'testeira', punho: 'munhequeira', braco: 'bracadeira' };

const CHAMOU_PADRAO: Vestimenta = { ...PADRAO_DE_CAMPO, corpo: 'm', pele: 2, cabelo: 'trancas', corCabelo: 1, numero: '7' };

const CABELOS = ['raspado', 'curto', 'crespo', 'trancas', 'coque', 'rabo', 'comprido'] as const;
/** Cabelos que o gerador das partidas dá mais às mulheres: o atalho já liga o corpo "m" para provar de costas. */
const CABELOS_DE_MULHER = ['trancas', 'coque', 'rabo', 'comprido'];

function aplicar(v: Vestimenta, nome: string): Vestimenta {
  const cabelo = CABELOS.find((c) => c === nome);
  if (cabelo) return { ...v, cabelo, ...(CABELOS_DE_MULHER.includes(cabelo) ? { corpo: 'm' as const } : {}) };
  const pele = /^pele([0-5])$/.exec(nome);
  if (pele) return { ...v, pele: Number(pele[1]) as Vestimenta['pele'] };
  const cor = /^cor([0-5])$/.exec(nome);
  if (cor) return { ...v, corCabelo: Number(cor[1]) as Vestimenta['corCabelo'] };
  const numero = /^n([0-9]{1,2})$/.exec(nome);
  if (numero) return { ...v, numero: numero[1] };
  switch (nome) {
    case 'h':
    case 'm':
      return { ...v, corpo: nome };
    case 'clara':
      return { ...v, pele: 0 };
    case 'escura':
      return { ...v, pele: 5 };
    case 'sn':
      return { ...v, numero: null };
    case 'testeira':
      return { ...v, cabeca: 'testeira' };
    case 'munhequeira':
      return { ...v, punho: 'munhequeira' };
    case 'bronze':
      return { ...v, punho: 'munhequeira_bronze' };
    case 'bracadeira':
      return { ...v, braco: 'bracadeira' };
    case 'chuteiraTime':
      return { ...v, chuteira: 'time' };
    case 'dourada':
      return { ...v, chuteira: 'dourada' };
    case 'liso':
      return { ...v, cabeca: 'nenhum', punho: 'nenhum', braco: 'nenhum', chuteira: 'neutra' };
    case 'tudo':
      return { ...v, cabeca: 'testeira', punho: 'munhequeira', braco: 'bracadeira', chuteira: 'dourada' };
    case 'foras':
      return { ...aplicar(v, 'tudo'), camisa: 'goleiro', peito: 'colete', pescoco: 'apito', pose: 'bracos', fundo: 'estadio_noite', moldura: 'galeria' };
    default:
      return v;
  }
}

/** A vestimenta falsa pedida em &boneco= (ou null com &semBoneco). */
export function vestimentaFalsaDeCampo(busca: string = location.search): Vestimenta | null {
  const params = new URLSearchParams(busca);
  if (params.has('semBoneco')) return null;
  const v = (params.get('boneco') ?? '').split('-').filter(Boolean).reduce(aplicar, PADRAO_DE_CAMPO);
  return conferirFormato(v) ? v : PADRAO_DE_CAMPO;
}

/** O time de quem chamou nos resumos falsos: &chamouTime=<id> ou o `padrao` de cada tela. */
export const timeFalsoDeQuemChamou = (padrao: string, busca: string = location.search): string => new URLSearchParams(busca).get('chamouTime') ?? padrao;

/** O `boneco` do resumo falso do desafio (só as 9 chaves de campo), ou null com &chamouSemBoneco. */
export function bonecoFalsoDeQuemChamou(busca: string = location.search): VestimentaDeCampo | null {
  const params = new URLSearchParams(busca);
  if (params.has('chamouSemBoneco')) return null;
  const v = (params.get('chamouBoneco') ?? '').split('-').filter(Boolean).reduce(aplicar, CHAMOU_PADRAO);
  if (!conferirFormato(v)) return null;
  const { corpo, pele, cabelo, corCabelo, numero, cabeca, punho, braco, chuteira } = v;
  return { corpo, pele, cabelo, corCabelo, numero, cabeca, punho, braco, chuteira };
}

definirFonteDoBoneco(() => ({ vestimenta: vestimentaFalsaDeCampo(), ligado: new URLSearchParams(location.search).get('emCampo') !== '0' }));
