// Filtro da frase própria do card (docs/jogo.md 14.6): o mesmo do apelido (supabase/migrations/20261019000000_base.sql,
// `normalizar_apelido` e `apelido_bloqueado`), mais as palavras proibidas da seção 7. Roda só no aparelho: a frase
// nunca vai para o servidor. A lista fica escrita de trás para frente, para nenhum texto do jogo trazer a palavra
// como está (o teste de palavras proibidas varre o código); `filtroDeFrase.test.ts` confere a lista com a migração.

/** Tamanho máximo da frase própria, em letras (cada emoji conta como uma). */
export const FRASE_MAX = 60;

/** Palavras da migração do apelido e da seção 7, de trás para frente. */
const AO_CONTRARIO = [
  // palavrão
  'adrem', 'arrop', 'ohlarac', 'etecac', 'atecub', 'atecob', 'atoxox', 'acorip',
  'alor', 'uc', 'oazuc', 'adof', 'redof', 'esadof', 'atup', 'otup', 'airatup',
  'odabmorra', 'adabmorra', 'oirato', 'airato', 'pdf', 'fsv', 'pqp', 'lrk',
  // ofensas
  'odaiv', 'odaev', 'ahcib', 'ocevart', 'oatapas', 'ocacam', 'acacam', 'oluoirc',
  'aluoirc', 'oriebmucam', 'atsizan', 'izan', 'reltih',
  // seção 7 (a lista do apelido)
  'atsopa', 'ratsopa', 'teb', 'ddo', 'sddo', 'oacatoc',
] as const;

/** Seção 7, além da lista do apelido: só bloqueiam inteiras ("bancada" e "redondo" passam). */
const INTEIRAS_AO_CONTRARIO = ['satsopa', 'steb', 'seocatoc', 'acnab', 'odnelav oalob', 'neerg', 'der'] as const;

const desvirar = (p: string) => [...p].reverse().join('');

/** As palavras do apelido como o filtro compara: minúsculas, sem acento. */
export const PALAVRAS_BLOQUEADAS: readonly string[] = AO_CONTRARIO.map(desvirar);
/** As da seção 7 que só valem como palavra inteira. */
export const PALAVRAS_INTEIRAS: readonly string[] = INTEIRAS_AO_CONTRARIO.map(desvirar);

/** Igual a `normalizar_apelido`: minúsculas, sem acento, 0→o 1→i 3→e 4→a 5→s 7→t @→a $→s, o resto vira espaço. */
export function normalizarFrase(texto: string): string {
  const troca: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => troca[c])
    .replace(/[^a-z ]/g, ' ');
}

/**
 * Igual a `apelido_bloqueado`: palavra de até 4 letras só bloqueia inteira ("cu" não pega "Curitiba"); palavra
 * mais longa bloqueia em qualquer lugar, mesmo com espaços no meio ("p o r r a").
 */
export function fraseBloqueada(
  texto: string,
  palavras: readonly string[] = PALAVRAS_BLOQUEADAS,
  inteiras: readonly string[] = PALAVRAS_INTEIRAS,
): boolean {
  const n = normalizarFrase(texto);
  const comEspacos = ` ${n.replace(/ +/g, ' ')} `;
  const junto = n.replace(/ /g, '');
  return (
    palavras.some((p) => (p.length <= 4 ? comEspacos.includes(` ${p} `) : junto.includes(p))) ||
    inteiras.some((p) => comEspacos.includes(` ${p} `))
  );
}

/** Letras como o contador mostra: cada emoji ou letra acentuada conta uma. */
export const letrasDaFrase = (texto: string): number => [...texto.normalize('NFC')].length;

/** Espaços repetidos viram um e as pontas somem. */
export const limparFrase = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

export type FrasePropria = { ok: true; frase: string } | { ok: false; motivo: 'vazia' | 'longa' | 'filtro' };

/** Confere a frase própria antes de "Pôr no card". */
export function conferirFrasePropria(texto: string): FrasePropria {
  const frase = limparFrase(texto);
  if (!frase) return { ok: false, motivo: 'vazia' };
  if (letrasDaFrase(frase) > FRASE_MAX) return { ok: false, motivo: 'longa' };
  if (fraseBloqueada(frase)) return { ok: false, motivo: 'filtro' };
  return { ok: true, frase };
}

/** Textos da folha "Escrever minha frase" (docs/jogo.md 14.6). */
export const TEXTOS_DA_FRASE = {
  titulo: 'Escrever minha frase',
  regra: 'Sem palavrão nem nome de pessoa',
  privacidade: 'Fica só no seu aparelho. O jogo não guarda nem mostra pra ninguém: só quem receber o card vê.',
  barrada: 'Essa frase não passou no filtro. Tenta outra, falando do time ou do lance.',
  usarNarrador: 'Usar a do narrador',
  porNoCard: 'Pôr no card',
} as const;
