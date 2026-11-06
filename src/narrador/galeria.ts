// Frases do narrador da Galeria de Troféus (docs/narrador.md, seção 15), uma na ficha de cada troféu.
// Texto aqui, não no banco gerado pelo `npm run frases`. Checklist de tom da seção 1: zoeira com o time e a
// situação, sem urgência, sem "volte", sem sequência. Nenhum adjetivo concorda com o time (a Chapecoense
// também leva "a semana"), por isso nada de "{o_time} é campeão".

import type { TimeDoTexto, TipoDeTrofeu } from '../jogo/galeria';

export const FRASES_DA_GALERIA: Partial<Record<TipoDeTrofeu, readonly string[]>> = {
  campeao_semana: [
    'Semana fechada e a flâmula ficou com {o_time}. Tá pendurada!',
    'Média dos 30 lá em cima: essa semana foi {do_time}.',
    'Flâmula na parede! Na média, ninguém segurou {o_time}.',
    '{o_time} levou a semana. O resto da tabela que lute.',
  ],
  maior_torcida: [
    'Arquibancada lotada! Ninguém somou mais que {o_time}.',
    'Megafone na vitrine: o barulho da semana foi {do_time}.',
    'Não é título, mas que barulho! Muita gente jogando {pro_time}.',
  ],
  campeao_temporada: [
    'Mês inteiro somando, e a taça foi pra estante {do_time}!',
    'A Série A do mês ficou com {o_time}. Taça na estante!',
    'Taça da temporada! Semana a semana, {o_time} somou mais.',
  ],
  campeao_serie_b: [
    'A Série B do mês ficou com {o_time}. Taça na estante!',
    'Taça da Série B {pro_time}! Mês bem jogado.',
    '{o_time} fez o mês na Série B e levou a taça.',
  ],
  campeao_estreia: [
    'Primeira taça da história do jogo: {o_time} estreou com estrela!',
    'Estreia com taça! Essa estrela ninguém tira {do_time}.',
    'O primeiro mês do jogo ficou com {o_time}. Pra sempre na Galeria.',
  ],
  acesso: [
    'Subiu! {o_time} carimbou o passaporte pra Série A.',
    'Acesso na conta! No mês que vem, {o_time} tá na Série A.',
    'Da Série B pra Série A: {o_time} fez a subida no braço.',
  ],
};

const contracao = (artigo: 'o' | 'a', base: 'de' | 'para') => (base === 'de' ? (artigo === 'a' ? 'da' : 'do') : artigo === 'a' ? 'pra' : 'pro');

/** Troca as variáveis do time e põe a primeira letra em maiúscula. */
export function preencherFraseDaGaleria(frase: string, time: TimeDoTexto): string {
  const texto = frase
    .replaceAll('{o_time}', `${time.artigo} ${time.nome}`)
    .replaceAll('{do_time}', `${contracao(time.artigo, 'de')} ${time.nome}`)
    .replaceAll('{pro_time}', `${contracao(time.artigo, 'para')} ${time.nome}`);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Uma frase para a ficha do troféu; nula para o que não tem frase (rebaixamento). */
export function fraseDaGaleria(tipo: TipoDeTrofeu, time: TimeDoTexto, rng: () => number = Math.random): string | null {
  const lista = FRASES_DA_GALERIA[tipo];
  if (!lista?.length) return null;
  return preencherFraseDaGaleria(lista[Math.floor(rng() * lista.length) % lista.length], time);
}
