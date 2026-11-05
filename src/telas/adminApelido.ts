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

/** Títulos da lista de apelidos que o filtro barraria. */
export function textoDaLista(n: number): string {
  return n
    ? `${n} ${n === 1 ? 'apelido gravado é barrado' : 'apelidos gravados são barrados'} pelo filtro de hoje. Toque para ver e apagar.`
    : 'Nenhum apelido gravado é barrado pelo filtro de hoje.';
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
    <div data-apelido-resultado></div>
    <div data-apelido-lista>${estado('carregando', 'Procurando apelidos barrados…')}</div>`;
  const form = el.querySelector<HTMLFormElement>('form')!;
  const resultado = el.querySelector<HTMLElement>('[data-apelido-resultado]')!;
  const lista = el.querySelector<HTMLElement>('[data-apelido-lista]')!;
  const erro = (e: { message: string }) =>
    (resultado.innerHTML = `<p class="admin-alerta">${esc(ERROS[e.message] ?? e.message)}</p>`);

  async function buscar(apelido: string): Promise<void> {
    resultado.innerHTML = estado('carregando', 'Buscando…');
    const { data, error } = await sb.rpc('apelido_contar', { p_apelido: apelido });
    if (saiu) return;
    if (error) return void erro(error);
    const n = Number(data ?? 0);
    resultado.innerHTML = `<p class="nota">${esc(textoDaBusca(apelido, n))}</p>${
      n ? '<button class="botao-linha" type="button" data-acao="apagar-apelido">Apagar apelido</button>' : ''
    }`;
    resultado.querySelector('[data-acao="apagar-apelido"]')?.addEventListener('click', () => confirmar(apelido, n));
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const apelido = String(new FormData(form).get('apelido') ?? '').trim();
    if (apelido) void buscar(apelido);
  });

  /** Os apelidos já gravados que o filtro barraria; tocar em um faz a mesma busca do campo. */
  async function carregarLista(): Promise<void> {
    const { data, error } = await sb.rpc('apelidos_filtrados');
    if (saiu) return;
    if (error) return void (lista.innerHTML = `<p class="admin-alerta">${esc(ERROS[error.message] ?? error.message)}</p>`);
    const linhas = (data ?? []) as { texto: string; quantos: number }[];
    lista.innerHTML = `<p class="nota">${esc(textoDaLista(linhas.length))}</p>${
      linhas.length
        ? `<div class="admin-revisao">${linhas
            .map(
              (l, i) =>
                `<button class="botao-linha" type="button" data-apelido-item="${i}">${esc(l.texto)} · ${esc(torcedores(l.quantos))}</button>`,
            )
            .join('')}</div>`
        : ''
    }`;
    lista.querySelectorAll<HTMLButtonElement>('[data-apelido-item]').forEach((b) =>
      b.addEventListener('click', () => {
        const apelido = linhas[Number(b.dataset.apelidoItem)].texto;
        form.querySelector<HTMLInputElement>('input[name="apelido"]')!.value = apelido;
        void buscar(apelido);
      }),
    );
  }
  void carregarLista();

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
      void carregarLista();
    });
  }

  return () => {
    saiu = true;
  };
}
