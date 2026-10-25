// Chamada ao Gemini (API do Google AI Studio) com resposta em JSON por esquema.
// A chave fica no segredo GEMINI_API_KEY das funções e vai no cabeçalho, nunca na URL.

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Modelos com cota na chave gratuita (testados em 25/10/2026), do mais leve ao mais forte. */
export const MODELOS_GERADOR = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];
/** O auditor começa por outro modelo, para não repetir o mesmo viés do gerador. */
export const MODELOS_AUDITOR = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tenta cada modelo (com 2 novas tentativas em 429/503) e devolve o JSON da primeira resposta válida. */
export async function perguntarJson<T>(
  modelos: string[],
  instrucao: string,
  texto: string,
  esquema: Record<string, unknown>,
): Promise<{ modelo: string; dados: T }> {
  const chave = Deno.env.get('GEMINI_API_KEY');
  if (!chave) throw new Error('Falta o segredo GEMINI_API_KEY nas funções.');
  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: instrucao }] },
    contents: [{ role: 'user', parts: [{ text: texto }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: esquema },
  });
  let ultimo = '';
  for (const modelo of modelos) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const r = await fetch(`${BASE}/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': chave, 'Content-Type': 'application/json' },
        body: corpo,
        signal: AbortSignal.timeout(60_000),
      }).catch(() => null);
      const d = r ? await r.json().catch(() => ({})) : {};
      if (r?.ok) {
        const parte = d?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => typeof p?.text === 'string');
        try {
          return { modelo, dados: JSON.parse(parte.text) as T };
        } catch {
          ultimo = `${modelo}: resposta fora do formato`;
          break;
        }
      }
      ultimo = `${modelo}: ${d?.error?.status ?? (r ? `HTTP ${r.status}` : 'falha de rede')}`;
      if (r && (r.status === 429 || r.status === 503)) await esperar(8_000 * (tentativa + 1));
      else break;
    }
  }
  throw new Error(`nenhum modelo respondeu (${ultimo})`);
}

/** Baixa a página e devolve o HTML (ou o motivo da falha). */
export async function baixar(url: string): Promise<{ html?: string; erro?: string }> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GuerraDeTorcidas/1.0; +https://torcida.kauewalter.com.br)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return { erro: `HTTP ${r.status}` };
    return { html: await r.text() };
  } catch {
    return { erro: 'não abriu' };
  }
}
