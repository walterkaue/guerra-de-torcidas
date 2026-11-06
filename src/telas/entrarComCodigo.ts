// Entrar com o código do outro aparelho (docs/jogo.md, seção 14.1): digitar (ou vir do QR com o campo já
// preenchido), juntar com o que este aparelho já tem e, se os times forem diferentes, escolher qual fica.
// O código só vive no campo desta tela e na chamada ao servidor; nunca em console, armazenamento ou endereço.

import '../estilos/aparelhos.css';
import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, corDeTexto, timePorId, type Time } from '../dados/times';
import { prefs } from '../estado';
import { mensagemDoCodigo } from '../jogo/aparelhos';
import { TAMANHO_CODIGO, formatarCodigo, limparDigitado } from '../jogo/codigoTorcedor';
import { ErroServidor } from '../servidor/api';
import { servidorDoCodigo } from './codigoApi';
import { cabecalhoTela, faixa } from './blocos';

export const AVISO_DE_JUNTAR =
  'Este aparelho já tem time e carreira. Ao entrar, tudo junta com a conta do outro aparelho: XP, medalhas e recordes. Os pontos que já contaram no ranking ficam onde estão.';

const nomeDoTime = (id: string) => {
  const t = timePorId(id);
  return !t || t.id === ID_OUTRO ? 'Outro time' : t.nome;
};

const cartaoDoTime = (t: Time | undefined, id: string, legenda: string) => `
  <button type="button" role="radio" class="cartao-time${t?.cores[0].toLowerCase() === '#ffffff' ? ' clara' : ''}" data-id="${esc(id)}" aria-checked="false"
    style="--c1:${t?.cores[0] ?? '#444444'};--c2:${t?.cores[1] ?? '#222222'};--c3:${t?.cor3 ?? t?.cores[1] ?? '#222222'};--txt:${corDeTexto(t?.cores[0] ?? '#444444')}">
    <span class="nome-time">${esc(nomeDoTime(id))}</span>
    <small>${esc(legenda)}</small>
  </button>`;

export function telaEntrarComCodigo(root: HTMLElement, rota: Rota): () => void {
  const de = rota.tela === 'entrar' ? rota.de : undefined;
  const temTime = !!prefs.get().time;
  let saiu = false;
  let enviando = false;
  let paraHome: number | undefined;

  // Volta à escolha do time de onde veio; quem ainda não tinha time está no primeiro acesso (jogo.md 14.8).
  const voltar = () =>
    irPara(
      de === 'times'
        ? temTime
          ? { tela: 'times' }
          : { tela: 'times', depois: 'inicio', primeira: true }
        : { tela: de === 'perfil' || temTime ? 'perfil' : 'inicio' },
    );

  root.innerHTML = `
    <main class="tela entrar-codigo">
      ${cabecalhoTela({ titulo: 'Entrar com código', voltar: true, pre: false })}
      <div class="entrar-pilha placa" data-corpo></div>
    </main>`;
  root.querySelector('.voltar')!.addEventListener('click', voltar);
  const corpo = root.querySelector<HTMLElement>('[data-corpo]')!;

  function telaDoCodigo(inicial: string, mensagem?: string): void {
    corpo.innerHTML = `
      <p class="campo-dica">No aparelho onde você já joga, abre o Perfil e toca em "Outro aparelho" e depois em "Levar minha conta pra outro aparelho". Digita aqui o código que aparecer, ou abre a câmera do aparelho (fora do jogo) e aponta pro QR.</p>
      ${temTime ? `<p class="aviso-caixa" role="note">${esc(AVISO_DE_JUNTAR)}</p>` : ''}
      <label class="campo campo-codigo">
        <span>Código do outro aparelho</span>
        <input type="text" inputmode="text" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false"
          enterkeyhint="go" maxlength="${TAMANHO_CODIGO + 1}" placeholder="ABCD-2345" aria-describedby="entrar-erro" />
      </label>
      <p class="erro-campo" id="entrar-erro" role="alert" ${mensagem ? '' : 'hidden'}>${esc(mensagem ?? '')}</p>
      <button class="botao" type="button" data-acao="entrar" disabled>${temTime ? 'Juntar e entrar' : 'Entrar'}</button>`;
    const input = corpo.querySelector<HTMLInputElement>('input')!;
    const botao = corpo.querySelector<HTMLButtonElement>('[data-acao="entrar"]')!;
    const erro = corpo.querySelector<HTMLElement>('#entrar-erro')!;
    let codigo = limparDigitado(inicial);
    const atualizar = () => {
      codigo = limparDigitado(input.value);
      input.value = formatarCodigo(codigo);
      botao.disabled = enviando || codigo.length !== TAMANHO_CODIGO;
    };
    input.value = formatarCodigo(codigo);
    atualizar();
    input.addEventListener('input', atualizar);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !botao.disabled) botao.click();
    });

    botao.addEventListener('click', async () => {
      if (enviando || codigo.length !== TAMANHO_CODIGO) return;
      enviando = true;
      erro.hidden = true;
      botao.disabled = true;
      botao.textContent = 'Entrando…';
      await enviar(codigo, undefined, (m) => {
        // Erro: o aparelho segue na tela de digitar, com o que foi digitado.
        erro.textContent = m;
        erro.hidden = false;
        botao.textContent = temTime ? 'Juntar e entrar' : 'Entrar';
        atualizar();
      });
    });
    if (!mensagem && !inicial) input.focus({ preventScroll: true });
  }

  /** Manda o código; `falhou` é chamado com a mensagem quando o servidor recusa. */
  async function enviar(codigo: string, time: string | undefined, falhou: (mensagem: string) => void): Promise<void> {
    try {
      const r = await (await servidorDoCodigo()).entrarComCodigo(codigo, time);
      enviando = false;
      if (saiu) return;
      if (r.etapa === 'escolher_time') return telaDoTime(codigo, r.timeDono, r.timeSeu);
      telaPronta();
    } catch (e) {
      enviando = false;
      if (saiu) return;
      const c = e instanceof ErroServidor ? e.codigo : 'falha';
      if (c === 'saiu_da_conta') return;
      falhou(mensagemDoCodigo(c));
    }
  }

  function telaDoTime(codigo: string, timeDono: string, timeSeu: string): void {
    corpo.innerHTML = `
      ${faixa('Qual time fica?', 'h3')}
      <p class="campo-dica">Os dois aparelhos torcem por times diferentes. A conta fica com um só, e o resto da carreira junta do mesmo jeito.</p>
      <div class="entrar-opcoes" role="radiogroup" aria-label="Qual time fica?">
        ${cartaoDoTime(timePorId(timeDono), timeDono, 'Time do outro aparelho')}
        ${cartaoDoTime(timePorId(timeSeu), timeSeu, 'Time deste aparelho')}
      </div>
      <button class="botao" type="button" data-acao="fica" disabled>Esse fica</button>`;
    let escolhido: string | undefined;
    const botao = corpo.querySelector<HTMLButtonElement>('[data-acao="fica"]')!;
    corpo.querySelectorAll<HTMLButtonElement>('.cartao-time').forEach((b) =>
      b.addEventListener('click', () => {
        escolhido = b.dataset.id;
        corpo.querySelectorAll('.cartao-time').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
        botao.disabled = enviando;
      }),
    );
    botao.addEventListener('click', async () => {
      if (!escolhido || enviando) return;
      enviando = true;
      botao.disabled = true;
      botao.textContent = 'Entrando…';
      // Código gasto ou vencido no meio do caminho: volta pra digitar, com o motivo.
      await enviar(codigo, escolhido, (m) => telaDoCodigo('', m));
    });
  }

  function telaPronta(): void {
    corpo.innerHTML = `
      <p class="codigo-pronto" role="status">Pronto! Este aparelho agora é o mesmo torcedor.</p>
      <button class="botao" type="button" data-acao="home">Bora pra Home</button>`;
    const ir = () => {
      clearTimeout(paraHome);
      if (!saiu) irPara({ tela: 'inicio' });
    };
    corpo.querySelector('[data-acao="home"]')!.addEventListener('click', ir);
    paraHome = window.setTimeout(ir, 1800);
  }

  telaDoCodigo(rota.tela === 'entrar' ? (rota.codigo ?? '') : '');

  return () => {
    saiu = true;
    clearTimeout(paraHome);
  };
}
