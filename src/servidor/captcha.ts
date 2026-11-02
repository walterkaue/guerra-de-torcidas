// CAPTCHA (Cloudflare Turnstile) antes do login (jogo.md, seção 12, "Antes de divulgar"). Decidido em
// 27/10/2026: escondido, uma vez por aparelho (só no login anônimo, que fica salvo), sem cadastro.
// Desligado enquanto VITE_TURNSTILE_SITE_KEY estiver vazia. A chave do site é pública; a secreta fica
// só no painel do Supabase (Auth → Attack Protection), nunca aqui.
// O script da Cloudflare só é baixado quando precisa (primeiro login do aparelho ou login do #admin).

const CHAVE_SITE = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TEMPO_LIMITE_MS = 20000;

interface Turnstile {
  render(el: HTMLElement, opcoes: Record<string, unknown>): string;
  remove(id: string): void;
}

export const captchaLigado = (chave = CHAVE_SITE) => chave !== '';

/** Opções do signInAnonymously / signInWithPassword: com token, o Supabase confere o CAPTCHA. */
export function opcoesComCaptcha(token: string | undefined): { captchaToken?: string } {
  return token ? { captchaToken: token } : {};
}

let script: Promise<Turnstile> | null = null;

function carregarScript(): Promise<Turnstile> {
  script ??= new Promise<Turnstile>((ok, falha) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => {
      const t = (window as unknown as { turnstile?: Turnstile }).turnstile;
      if (t) ok(t);
      else falha(new Error('turnstile_ausente'));
    };
    s.onerror = () => falha(new Error('turnstile_rede'));
    document.head.append(s);
  }).catch((e) => {
    script = null; // tenta de novo na próxima (ex.: voltou a internet)
    throw e;
  });
  return script;
}

/**
 * Token do Turnstile, ou undefined com o CAPTCHA desligado. No modo escondido nada aparece; se a
 * Cloudflare pedir um toque (raro), a caixinha surge no rodapé e some depois.
 */
export async function tokenCaptcha(): Promise<string | undefined> {
  if (!captchaLigado()) return undefined;
  const turnstile = await carregarScript();
  const caixa = document.createElement('div');
  caixa.className = 'captcha';
  document.body.append(caixa);
  let id = '';
  try {
    return await new Promise<string>((ok, falha) => {
      const tempo = setTimeout(() => falha(new Error('captcha_tempo')), TEMPO_LIMITE_MS);
      id = turnstile.render(caixa, {
        sitekey: CHAVE_SITE,
        appearance: 'interaction-only',
        language: 'pt-br',
        callback: (token: string) => {
          clearTimeout(tempo);
          ok(token);
        },
        'error-callback': () => {
          clearTimeout(tempo);
          falha(new Error('captcha_falhou'));
        },
      });
    });
  } finally {
    if (id) turnstile.remove(id);
    caixa.remove();
  }
}
