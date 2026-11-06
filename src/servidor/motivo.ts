// Motivo curto de uma falha com o servidor, para o aviso de partida sem valer pontos.
// Antes o motivo ficava só no console do navegador; com o código na tela, um print basta para saber
// onde parou (rede, CAPTCHA, login, resposta da função).

/**
 * Código de uma falha do functions.invoke. Pedido que nem saiu (sem rede, bloqueado) vira "rede";
 * resposta da função traz o "erro" do corpo ou, sem corpo, o status ("http_503").
 */
export async function codigoDaFuncao(error: { name?: string; context?: unknown }): Promise<string> {
  if (error.name === 'FunctionsFetchError') return 'rede';
  const resposta = error.context;
  if (!(resposta instanceof Response)) return 'falha';
  try {
    const corpo = (await resposta.json()) as { erro?: unknown };
    if (typeof corpo?.erro === 'string' && corpo.erro) return corpo.erro;
  } catch {
    // resposta sem corpo
  }
  return `http_${resposta.status}`;
}

/** Código do erro: o do servidor quando ele mandou; erro de rede do navegador vira "rede". */
export function motivoDaFalha(e: unknown): string {
  const codigo = (e as { codigo?: unknown } | null)?.codigo;
  if (typeof codigo === 'string' && /^[a-z0-9_]{1,40}$/i.test(codigo)) return codigo;
  if (e instanceof TypeError) return 'rede';
  return 'desconhecido';
}

/**
 * Aviso com o código numa linha à parte (separada por "\n"), para o jogador mandar no print.
 * Quem mostra o aviso usa `preencherAviso` (elemento) ou `htmlDoAviso` (HTML), que põem o código pequeno e cinza.
 */
export function comMotivo(aviso: string, e: unknown): string {
  return `${aviso}\ncódigo: ${motivoDaFalha(e)}`;
}

/** Separa a frase do código (linha "código: x" depois do "\n". */
export function partesDoAviso(aviso: string): { frase: string; codigo: string | null } {
  const i = aviso.indexOf('\n');
  return i < 0 ? { frase: aviso, codigo: null } : { frase: aviso.slice(0, i), codigo: aviso.slice(i + 1) };
}

/** Escreve o aviso no elemento: a frase e, embaixo, o código em letra pequena e cinza. */
export function preencherAviso(el: HTMLElement, aviso: string): void {
  const { frase, codigo } = partesDoAviso(aviso);
  el.textContent = frase;
  if (codigo) {
    const small = document.createElement('small');
    small.className = 'aviso-codigo';
    small.textContent = codigo;
    el.append(small);
  }
}

/** Mesmo aviso como HTML (a frase e o código já escapados pelo `esc` de quem chama). */
export function htmlDoAviso(aviso: string, esc: (s: string) => string): string {
  const { frase, codigo } = partesDoAviso(aviso);
  return esc(frase) + (codigo ? `<small class="aviso-codigo">${esc(codigo)}</small>` : '');
}
