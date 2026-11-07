// Frases do narrador das divisões (docs/narrador.md, seção 16): na Home durante o mês e no fim do mês (placa e card).
// Texto aqui, não no banco gerado pelo `npm run frases`. Checklist de tom da seção 1: zoeira com o time e a situação,
// sem urgência, sem "volte", sem contagem. Nenhum adjetivo concorda com o time (a Chapecoense também "caiu").
// Até 75 caracteres depois da troca, com qualquer time (teste em src/jogo/temporada.test.ts).

import type { DestinoDoMes, SituacaoDoMes } from '../jogo/temporada';
import { FRASES_DA_GALERIA } from './galeria';

export type EventoDaTemporada =
  | SituacaoDoMes
  | 'temporada_campeao'
  | 'temporada_campeao_b'
  | 'temporada_subiu'
  | 'temporada_fica_a'
  | 'temporada_fica_b'
  | 'temporada_caiu'
  | 'temporada_unica_a'
  | 'temporada_unica_b'
  | 'temporada_estreia'
  | 'temporada_rival_caiu';

export const FRASES_DA_TEMPORADA: Record<EventoDaTemporada, readonly string[]> = {
  // Na Home, durante o mês
  temporada_lider: [
    '{o_time} na ponta da {serie}. A tabela tá com cara de taça.',
    'Líder! O resto da {serie} tá olhando de baixo.',
    'Lá em cima e confortável. Por enquanto.',
  ],
  temporada_acesso: [
    '{o_time} tá na zona de acesso. A Série A já tá de olho.',
    'Por enquanto, sobe. Lugar bom esse.',
    'Na zona de acesso. O elevador tá parado no andar certo.',
  ],
  temporada_queda: [
    '{o_time} tá na zona. Zona de queda não é endereço fixo.',
    'Na zona por {dif}. Uma semana boa resolve.',
    'A tabela tá apertada lá embaixo. Dá pra sair.',
  ],
  temporada_meio: ['{o_time} no meio da tabela. Nem festa, nem susto.', 'Meio de tabela: dá pra sonhar com o topo.'],
  // No fim do mês (placa e card)
  temporada_campeao: [
    'Taça da temporada {pro_time}! O mês tem dono.',
    'Taça na estante! Pode pendurar a faixa no grupo.',
    'A Série A do mês ficou com {o_time}. Ninguém segurou.',
  ],
  temporada_campeao_b: ['Taça da Série B e malas prontas pra A!', 'Levou a B com sobra. A Série A que se prepare.'],
  temporada_subiu: [
    'Subiu! A Série B ficou pequena {pro_time}.',
    'Acesso confirmado! {o_time} vai pra Série A.',
    'Elevador pra cima! Próximo andar: Série A.',
  ],
  temporada_fica_a: ['{o_time} fica na Série A. Missão cumprida.', 'Escapou! Série A de novo no mês que vem.'],
  temporada_fica_b: ['{o_time} fica na Série B. O acesso ficou pra próxima.', 'Mais um mês de Série B. De lá sobem dois.'],
  temporada_caiu: [
    'Caiu. Em {mes} é Série B, e de lá sobem dois.',
    'Desceu um andar. A volta tá na tabela do mês que vem.',
    'Caiu, mas os pontos {do_time} contam igual na B.',
  ],
  temporada_unica_a: ['{o_time} começa {mes} na Série A!', 'Top 10! {o_time} vai pra Série A em {mes}.'],
  temporada_unica_b: ['{o_time} começa {mes} na Série B. De lá sobem dois.', 'Série B em {mes}. Lugar de quem quer subir.'],
  // Campeão da estreia: as frases já aprovadas da taça com estrela (seção 15).
  temporada_estreia: FRASES_DA_GALERIA.campeao_estreia ?? [],
  temporada_rival_caiu: ['{o_rival} caiu pra Série B. A torcida {do_time} agradece.', '{o_rival} desceu um andar. Print obrigatório.'],
};

export interface TimeDaFraseDaTemporada {
  nome: string;
  artigo: 'o' | 'a';
}

export interface ContextoDaTemporada {
  time: TimeDaFraseDaTemporada;
  /** "Série A", "Série B" ou "série única". */
  serie?: string;
  /** "3 pontos": só a zona de queda usa. */
  dif?: string | null;
  /** O mês seguinte, minúsculo: "janeiro". */
  mes?: string;
  rival?: TimeDaFraseDaTemporada | null;
}

const contracao = (artigo: 'o' | 'a', base: 'de' | 'para') =>
  base === 'de' ? (artigo === 'a' ? 'da' : 'do') : artigo === 'a' ? 'pra' : 'pro';

/** Troca as variáveis; nula se a frase pede uma que não veio (ex.: {dif} sem distância). */
export function preencherFraseDaTemporada(frase: string, c: ContextoDaTemporada): string | null {
  const valores: Record<string, string | null | undefined> = {
    '{o_time}': `${c.time.artigo} ${c.time.nome}`,
    '{do_time}': `${contracao(c.time.artigo, 'de')} ${c.time.nome}`,
    '{pro_time}': `${contracao(c.time.artigo, 'para')} ${c.time.nome}`,
    '{serie}': c.serie,
    '{dif}': c.dif,
    '{mes}': c.mes,
    '{o_rival}': c.rival ? `${c.rival.artigo} ${c.rival.nome}` : null,
  };
  let texto = frase;
  for (const [chave, valor] of Object.entries(valores)) {
    if (!texto.includes(chave)) continue;
    if (!valor) return null;
    texto = texto.replaceAll(chave, valor);
  }
  // Maiúscula no começo e depois de ponto, "!" ou "?" ("Acesso confirmado! O Cruzeiro…").
  return texto.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_, antes: string, letra: string) => antes + letra.toUpperCase());
}

/** Uma frase do evento, entre as que dá para preencher com o contexto. */
export function fraseDaTemporada(evento: EventoDaTemporada, c: ContextoDaTemporada, rng: () => number = Math.random): string | null {
  const possiveis = FRASES_DA_TEMPORADA[evento].map((f) => preencherFraseDaTemporada(f, c)).filter((f): f is string => !!f);
  if (!possiveis.length) return null;
  return possiveis[Math.floor(rng() * possiveis.length) % possiveis.length];
}

/** O evento do fim do mês para o destino do meu time. */
export const EVENTO_DO_DESTINO: Record<DestinoDoMes, EventoDaTemporada> = {
  campeao: 'temporada_campeao',
  campeao_b: 'temporada_campeao_b',
  subiu: 'temporada_subiu',
  fica_a: 'temporada_fica_a',
  fica_b: 'temporada_fica_b',
  caiu: 'temporada_caiu',
  unica_a: 'temporada_unica_a',
  unica_b: 'temporada_unica_b',
  estreia: 'temporada_estreia',
};

/**
 * O evento da frase do fim do mês. A zoeira com o rival (o clássico da tabela que caiu) só entra quando o meu time
 * ficou na série (fica na A ou na B): em festa, a frase é da festa; na queda, nunca.
 */
export function eventoDoFim(destino: DestinoDoMes, rivalCaiu: boolean): EventoDaTemporada {
  if (rivalCaiu && (destino === 'fica_a' || destino === 'fica_b')) return 'temporada_rival_caiu';
  return EVENTO_DO_DESTINO[destino];
}
