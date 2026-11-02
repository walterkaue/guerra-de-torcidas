// Semana e dia em horário de Brasília (UTC−3 fixo), igual ao servidor (supabase/functions/_shared/tempo.ts).
// No celular serve só para ler o ranking certo e mostrar a contagem; quem decide é o relógio do servidor.

const FUSO_MS = -3 * 60 * 60 * 1000;
const emBrasilia = (d: Date) => new Date(d.getTime() + FUSO_MS);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function diaBrasilia(d = new Date()): string {
  return iso(emBrasilia(d));
}

export function semanaBrasilia(d = new Date()): string {
  const b = emBrasilia(d);
  b.setUTCDate(b.getUTCDate() - ((b.getUTCDay() + 6) % 7));
  return iso(b);
}

/** Milissegundos até a próxima segunda 00h de Brasília (quando a semana zera). */
export function msAteZerarSemana(d = new Date()): number {
  const b = emBrasilia(d);
  const diasAteSegunda = (8 - b.getUTCDay()) % 7 || 7;
  const proxima = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() + diasAteSegunda) - FUSO_MS;
  return proxima - d.getTime();
}

/** Dia da semana em Brasília (0 = domingo). */
export function diaDaSemanaBrasilia(d = new Date()): number {
  return emBrasilia(d).getUTCDay();
}

/** Hora em Brasília (0 a 23): a luz da arquibancada da Home. */
export function horaBrasilia(d = new Date()): number {
  return emBrasilia(d).getUTCHours();
}
