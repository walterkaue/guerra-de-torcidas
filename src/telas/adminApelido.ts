// "Apagar apelido" no painel #admin (docs/jogo.md, seção 13; Termos, item 5): busca um apelido exato, mostra
// quantos torcedores usam e limpa, com confirmação. O servidor registra só quando e quantos, nunca o apelido.

import type { SupabaseClient } from '@supabase/supabase-js';
import { esc } from '../app';
import { estado } from './blocos';

const ERROS: Record<string, string> = { sem_permissao: 'Esta conta não é de administrador.' };

const torcedores = (n: number) => `${n} ${n === 1 ? 'torcedor' : 'torcedores'}`;

/** O que a busca mostra. Sem ninguém, não há o que apagar. */
export function textoDaBusca(apelido: string, n: number): string {
  return n ? `${torcedores(n)} com o apelido "${apelido}".` : `Ninguém usa o apelido "${apelido}".`;
}

export function textoDaConfirmacao(n: number): string {
  return `Apagar o apelido de ${torcedores(n)}? Eles ficam sem apelido, os desafios já criados também. Não dá pra desfazer.`;
}

export function textoDoFeito(n: number): string {
  return n ? `Apelido apagado de ${torcedores(n)}.` : 'Ninguém usava mais esse apelido.';
}

/** Desenha a ferramenta em `el`. */
export function montarApelido(el: HTMLElement, sb: SupabaseClient): () => void {
  let saiu = false;
  el.innerHTML = `<form class="admin-revisao" data-apelido-busca>
      <label class="campo"><span>Apelido exato</span><input name="apelido" maxlength="40" autocomplete="off" required /></label>
      <button class="botao-linha" type="submit">Buscar</button>
    </form>
    <div data-apelido-resultado></div>`;
  const form = el.querySelector<HTMLFormElement>('form')!;
  const resultado = el.querySelector<HTMLElement>('[data-apelido-resultado]')!;
  const erro = (e: { message: string }) =>
    (resultado.innerHTML = `<p class="admin-alerta">${esc(ERROS[e.message] ?? e.message)}</p>`);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const apelido = String(new FormData(form).get('apelido') ?? '').trim();
    if (!apelido) return;
    resultado.innerHTML = estado('carregando', 'Buscando…');
    const { data, error } = await sb.rpc('apelido_contar', { p_apelido: apelido });
    if (saiu) return;
    if (error) return void erro(error);
    const n = Number(data ?? 0);
    resultado.innerHTML = `<p class="nota">${esc(textoDaBusca(apelido, n))}</p>${
      n ? '<button class="botao-linha" type="button" data-acao="apagar-apelido">Apagar apelido</button>' : ''
    }`;
    resultado.querySelector('[data-acao="apagar-apelido"]')?.addEventListener('click', () => confirmar(apelido, n));
  });

  function confirmar(apelido: string, n: number): void {
    resultado.innerHTML = `<p class="admin-alerta">${esc(textoDaConfirmacao(n))}</p>
      <div class="dupla">
        <button class="botao" type="button" data-acao="confirmar">Apagar</button>
        <button class="botao-linha" type="button" data-acao="voltar">Voltar</button>
      </div>`;
    resultado.querySelector('[data-acao="voltar"]')!.addEventListener('click', () => (resultado.innerHTML = ''));
    resultado.querySelector('[data-acao="confirmar"]')!.addEventListener('click', async () => {
      resultado.querySelectorAll('button').forEach((b) => (b.disabled = true));
      const { data, error } = await sb.rpc('apelido_apagar', { p_apelido: apelido });
      if (saiu) return;
      if (error) return void erro(error);
      resultado.innerHTML = `<p class="nota">${esc(textoDoFeito(Number(data ?? 0)))}</p>`;
      form.reset();
    });
  }

  return () => {
    saiu = true;
  };
}
