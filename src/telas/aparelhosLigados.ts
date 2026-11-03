// Lista dos aparelhos ligados à conta (docs/jogo.md, seção 14.1), no Perfil e na tela do código.

import '../estilos/aparelhos.css';
import { esc } from '../app';
import { mensagemDoCodigo, quandoUsou, rotuloDoAparelho } from '../jogo/aparelhos';
import { ErroServidor } from '../servidor/api';
import { servidorDoCodigo } from './codigoApi';

export const CONFIRMA_DESCONECTAR = 'Desconectar este aparelho? Ele sai da sua conta e volta a ser um aparelho novo.';

const codigoDoErro = (e: unknown) => (e instanceof ErroServidor ? e.codigo : 'falha');

/** Desenha a lista em `el`. `saiu()` diz se a tela já foi embora. Devolve o `recarregar`. */
export function montarAparelhos(el: HTMLElement, saiu: () => boolean): () => Promise<void> {
  async function recarregar(): Promise<void> {
    try {
      const lista = await (await servidorDoCodigo()).meusAparelhos();
      if (saiu()) return;
      desenhar(lista);
    } catch (e) {
      if (saiu() || codigoDoErro(e) === 'saiu_da_conta') return;
      el.innerHTML = `<p class="vazio">${esc(mensagemDoCodigo(codigoDoErro(e)))}</p>`;
    }
  }

  function desenhar(lista: Awaited<ReturnType<Awaited<ReturnType<typeof servidorDoCodigo>>['meusAparelhos']>>): void {
    el.innerHTML = `
      <ul class="aparelhos">
        ${lista
          .map(
            (a) => `
          <li class="aparelho" data-id="${esc(a.id)}">
            <div class="aparelho-texto">
              <strong>${esc(rotuloDoAparelho(a.user_agent))}</strong>
              ${a.este ? '' : `<span>${esc(quandoUsou(a.usado_em))}</span>`}
            </div>
            ${a.este ? '<span class="aparelho-este">Este aparelho</span>' : '<button class="aparelho-sair" type="button" data-desconectar>Desconectar</button>'}
          </li>`,
          )
          .join('')}
      </ul>
      <p class="erro-campo" role="alert" hidden data-erro-aparelhos></p>`;
    const erro = el.querySelector<HTMLElement>('[data-erro-aparelhos]')!;
    el.querySelectorAll<HTMLButtonElement>('[data-desconectar]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm(CONFIRMA_DESCONECTAR)) return;
        const id = b.closest<HTMLElement>('.aparelho')!.dataset.id!;
        erro.hidden = true;
        b.disabled = true;
        try {
          await (await servidorDoCodigo()).desconectarAparelho(id);
        } catch (e) {
          const c = codigoDoErro(e);
          if (saiu() || c === 'saiu_da_conta') return;
          if (c !== 'nao_encontrado' && c !== 'sessao_encerrada') {
            erro.textContent = mensagemDoCodigo(c);
            erro.hidden = false;
            b.disabled = false;
            return;
          }
        }
        await recarregar();
      }),
    );
  }

  el.innerHTML = '<p class="vazio">Carregando…</p>';
  void recarregar();
  return recarregar;
}
