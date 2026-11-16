// CÓPIA GERADA de src/jogo por scripts/compartilhar.mjs. Não edite aqui: mude em src/jogo e rode `npm run compartilhar`.
// Detecção de partidas estatisticamente impossíveis (aprovada em 19/10/2026; jogo.md, "Anti-trapaça").
// Módulo puro, roda no servidor ao fechar cada partida. Partida marcada fica fora do ranking até revisão.

import { GOLEIRO, ZONAS, chanceDeDefesaSemLer, coluna, type ResultadoCobranca, type ResultadoDefesa } from './penaltis.ts';

export interface ConfigDeteccao {
  /** Últimas N defesas contra o batedor da máquina com chute no gol. */
  janelaDefesas: number;
  /** Marca se defendeu pelo menos isto dentro da janela (honesto: ~60% na segunda, ~35% no domingo). */
  minDefesas: number;
  /**
   * Últimas N cobranças em que o goleiro da máquina pulou por sorteio (não "leu" o chute). Também dá a certeza da regra
   * "nenhuma defendida": 0,8^N, o falso alarme da regra do lado no pior caso.
   */
  janelaCobrancas: number;
}

export const DETECCAO_PADRAO: ConfigDeteccao = { janelaDefesas: 30, minDefesas: 27, janelaCobrancas: 40 };

type CobrancaParaDeteccao = Pick<ResultadoCobranca, 'goleiroLeu' | 'zonaBola' | 'zonaGoleiro' | 'goleiroX'> &
  Partial<Pick<ResultadoCobranca, 'x' | 'y' | 'cavadinha' | 'fraca' | 'desfecho'>>;

interface PartidaParaDeteccao {
  cobrancas: readonly CobrancaParaDeteccao[];
  defesas: readonly Pick<ResultadoDefesa, 'desfecho' | 'contraGravada'>[];
}

const ehDoMotor2 = (c: CobrancaParaDeteccao) => typeof c.goleiroX === 'number';

/**
 * A bola foi onde o goleiro que não leu foi? No motor 2 (cobrança com `goleiroX`) vale o LADO do mergulho (a coluna); no
 * motor 1, a zona. A janela pode misturar os dois. Não troque por "nenhuma ao alcance do goleiro": quem acerta o ângulo
 * de verdade passa 40 cobranças sem nenhuma ao alcance em 23% das vezes; pelo lado, o honesto cai no lado do goleiro em
 * 20% a 40% das cobranças, e o falso alarme fica em 0,013% no pior caso (0,8^40).
 */
export function noLadoDoGoleiro(c: CobrancaParaDeteccao): boolean {
  return ehDoMotor2(c) ? coluna(c.zonaBola) === coluna(c.zonaGoleiro) : c.zonaBola === c.zonaGoleiro;
}

/** Chance de o goleiro de 6 zonas (motor 1), pulando por sorteio, NÃO ir na zona da bola. */
const FORA_DA_ZONA = (ZONAS - 1) / ZONAS;
/** Regra do lado no pior caso (bola no meio contra o goleiro com alcance): chance de ele NÃO ficar no lado da bola. */
const FORA_DO_LADO = 1 - GOLEIRO.meio;

/** Uma cobrança sem leitura para a regra "nenhuma defendida": se o goleiro pegou, e a chance que ele tinha de não pegar. */
interface SemLeitura {
  pegou: boolean;
  escapa: number;
}

/**
 * As cobranças sem leitura de uma partida, da mais recente para a mais antiga. No motor 1, "pegou" é a bola na zona do
 * goleiro (como sempre) e a chance de escapar é 5/6. No motor 2, "pegou" é a defesa, e a chance de escapar sai da bola
 * (chanceDeDefesaSemLer): alta no ângulo, baixa no meio, e na cavadinha cai a cada cavadinha anterior da partida.
 */
function semLeitura(p: PartidaParaDeteccao): SemLeitura[] {
  const lista: SemLeitura[] = [];
  let cavadinhas = 0;
  for (const c of p.cobrancas) {
    const antes = cavadinhas;
    if (c.cavadinha) cavadinhas++;
    if (c.goleiroLeu) continue;
    if (!ehDoMotor2(c)) {
      lista.push({ pegou: c.zonaBola === c.zonaGoleiro, escapa: FORA_DA_ZONA });
    } else if (typeof c.x === 'number' && typeof c.y === 'number') {
      lista.push({ pegou: c.desfecho === 'defesa', escapa: 1 - chanceDeDefesaSemLer({ x: c.x, y: c.y, cavadinha: !!c.cavadinha, fraca: !!c.fraca }, antes) });
    }
  }
  return lista.reverse();
}

/**
 * Recebe as partidas do torcedor da MAIS RECENTE para a mais antiga (incluindo a que acabou de fechar)
 * e devolve o motivo da suspeita, ou null. Resultado de outro minigame (a Prova não tem cobranças
 * nem defesas) é ignorado: em 20/10/2026 um deles quebrou o fechamento dos pênaltis.
 */
export function motivoSuspeita(todas: readonly PartidaParaDeteccao[], cfg: ConfigDeteccao = DETECCAO_PADRAO): string | null {
  const partidas = todas.filter((p) => Array.isArray(p?.cobrancas) && Array.isArray(p?.defesas));

  // 1. Defesas: quem lê a semente sabe o canto do batedor e defende quase tudo.
  const defesas = partidas
    .flatMap((p) => [...p.defesas].reverse())
    .filter((d) => !d.contraGravada && d.desfecho !== 'fora')
    .slice(0, cfg.janelaDefesas);
  if (defesas.length === cfg.janelaDefesas) {
    const n = defesas.filter((d) => d.desfecho === 'defesa').length;
    if (n >= cfg.minDefesas) return `defesas: ${n} de ${cfg.janelaDefesas}`;
  }

  // 2. Cobranças: quando o goleiro pula por sorteio, por acaso ~1 em 6 vai na zona dele (motor 1), ou 1 em 5 a 2 em 5
  //    no lado dele (motor 2). Quem lê a semente nunca chuta lá.
  const cobrancas = partidas
    .flatMap((p) => [...p.cobrancas].reverse())
    .filter((c) => !c.goleiroLeu)
    .slice(0, cfg.janelaCobrancas);
  if (cobrancas.length === cfg.janelaCobrancas && cobrancas.every((c) => !noLadoDoGoleiro(c))) {
    return `cobranças: nenhuma no canto do goleiro em ${cfg.janelaCobrancas}`;
  }

  // 3. Cobranças, nenhuma defendida: no motor 2 dá para fazer gol no lado do goleiro (basta ficar fora do alcance), então
  //    quem lê a semente não precisa fugir do lado e passa pela regra 2. O que ele não deixa acontecer é a defesa. Anda
  //    das cobranças sem leitura mais recentes para as antigas, multiplicando a chance que o goleiro tinha de NÃO pegar
  //    cada uma, até achar uma que ele pegou (aí está tudo certo) ou até essa chance ficar tão pequena quanto o falso
  //    alarme da regra 2 no pior caso, 0,8^N (N = `janelaCobrancas`). Bola no ângulo quase não pesa (o goleiro quase
  //    nunca pega mesmo): quem mira bem não é marcado. Só com cobranças do motor 1 quem decide é a regra 2, como sempre
  //    (cada uma pesa 5/6, e 40 delas ainda não enchem esta conta).
  if (cfg.janelaCobrancas >= 1) {
    let limite = 1;
    for (let k = 0; k < cfg.janelaCobrancas; k++) limite *= FORA_DO_LADO;
    let escapou = 1;
    let n = 0;
    busca: for (const p of partidas) {
      for (const c of semLeitura(p)) {
        if (c.pegou) break busca;
        escapou *= c.escapa;
        n++;
        if (escapou <= limite) return `cobranças: nenhuma defendida pelo goleiro em ${n}`;
      }
    }
  }
  return null;
}
