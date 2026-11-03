// Código do torcedor (docs/jogo.md, seção 14.1): uma carreira em vários aparelhos, sem login e sem dado pessoal.
// O servidor sorteia e confere o código; o celular só mostra, limpa o que foi digitado e lê o link do QR.
// Compartilhado com a função codigo-torcedor (npm run compartilhar): sem nada do navegador aqui.

/** 31 símbolos, sem os que se confundem na hora de digitar: 0 e O, 1, I e L. */
export const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const TAMANHO_CODIGO = 8;
export const VALIDADE_MINUTOS = 10;
/** 31^8, cerca de 853 bilhões de códigos. */
export const CODIGOS_POSSIVEIS = ALFABETO.length ** TAMANHO_CODIGO;

/**
 * Identidade interna da conta ligada: a Supabase só cria sessão para uma conta que já existe por um link de
 * uso único, e esse link pede um e-mail. O domínio é reservado (RFC 2606): não existe e não recebe e-mail.
 * Ninguém vê o endereço, e a parte da frente sai de um HMAC do id com um segredo das funções (sempre a mesma
 * para a mesma conta, e ninguém de fora calcula).
 */
export const DOMINIO_TECNICO = 'torcedor.invalid';
const EMAIL_TECNICO = /^t\.[0-9a-f]{32}@torcedor\.invalid$/;

/** Rota do link do QR: `#entrar/CODIGO`. O que vem depois do # nunca vai para servidor nenhum. */
export const ROTA_ENTRAR = 'entrar';

/** `sortear(n)`: inteiro sem viés em [0, n), com sorteio criptográfico (no servidor, `sortear` de comum.ts). */
export function sortearCodigo(sortear: (n: number) => number): string {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO; i++) codigo += ALFABETO[sortear(ALFABETO.length)];
  return codigo;
}

/** O código como foi digitado, sem espaço e sem traço, em maiúsculas; null se não for um código possível. */
export function normalizarCodigo(texto: unknown): string | null {
  if (typeof texto !== 'string' || texto.length > 40) return null;
  const codigo = texto.toUpperCase().replace(/[\s-]/g, '');
  if (codigo.length !== TAMANHO_CODIGO) return null;
  for (const c of codigo) if (!ALFABETO.includes(c)) return null;
  return codigo;
}

/** Para o campo de digitar: maiúsculas, só os símbolos do alfabeto, no máximo 8. */
export function limparDigitado(texto: string): string {
  let limpo = '';
  for (const c of texto.toUpperCase()) {
    if (ALFABETO.includes(c)) limpo += c;
    if (limpo.length === TAMANHO_CODIGO) break;
  }
  return limpo;
}

/** "ABCD-2345": dois blocos de 4, mais fácil de ler em voz alta e de copiar. */
export function formatarCodigo(codigo: string): string {
  return codigo.length > 4 ? `${codigo.slice(0, 4)}-${codigo.slice(4)}` : codigo;
}

/** Link do QR. Fica no hash para nunca chegar ao servidor do site (nem aos logs dele). */
export function linkDoCodigo(origem: string, codigo: string): string {
  return `${origem.replace(/\/+$/, '')}/#${ROTA_ENTRAR}/${codigo}`;
}

/** Código do link do QR (`#entrar/ABCD2345`); null se o endereço não for esse. */
export function codigoDoEndereco(hash: string): string | null {
  const m = /^#?entrar\/([^/?#]+)$/.exec(hash);
  return m ? normalizarCodigo(decodeURIComponent(m[1])) : null;
}

/** HMAC-SHA256 em hexadecimal. */
async function hmac(segredo: string, texto: string): Promise<string> {
  const te = new TextEncoder();
  const chave = await crypto.subtle.importKey('raw', te.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', chave, te.encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Impressão digital do código: é só ela que o banco guarda, nunca o código. HMAC com um segredo das funções, e não
 * só SHA-256: com 853 bilhões de códigos, quem lesse a tabela acharia um código ativo por força bruta em minutos.
 */
export function impressaoDoCodigo(codigo: string, segredo: string): Promise<string> {
  return hmac(segredo, `codigo-torcedor:${codigo}`);
}

/** `t.<32 hexadecimais>@torcedor.invalid`, sempre o mesmo para a mesma conta (duas entradas juntas não brigam). */
export async function emailTecnicoDe(uid: string, segredo: string): Promise<string> {
  return `t.${(await hmac(segredo, `email-tecnico:${uid}`)).slice(0, 32)}@${DOMINIO_TECNICO}`;
}

export function ehEmailTecnico(email: unknown): boolean {
  return typeof email === 'string' && EMAIL_TECNICO.test(email);
}

/** Chance de acertar algum código ativo em `tentativas` palpites ao acaso (para os testes e o jogo.md). */
export function chanceDeAcertar(tentativas: number, codigosAtivos: number): number {
  return 1 - (1 - codigosAtivos / CODIGOS_POSSIVEIS) ** tentativas;
}
