import { esc, irPara, type Rota } from '../app';
import { TIMES, corDeTexto } from '../dados/times';
import { APELIDO_MAX, prefs } from '../estado';
import { ErroServidor } from '../servidor/api';
import { sincronizarTorcedor } from '../servidor/torcedor';

export function telaTimes(root: HTMLElement, rota: Rota): void {
  const depois = rota.tela === 'times' ? (rota.depois ?? 'partida') : 'partida';
  const atual = prefs.get();

  root.innerHTML = `
    <main class="tela times">
      <header class="cabecalho">
        <button class="voltar" type="button" aria-label="Voltar">‹</button>
        <h2>Qual é a sua torcida?</h2>
      </header>

      <div class="grade-times" role="radiogroup" aria-label="Times">
        ${TIMES.map(
          (t) => `
          <button type="button" role="radio" class="cartao-time" data-id="${t.id}"
            aria-checked="${t.id === atual.time}"
            style="--c1:${t.cores[0]};--c2:${t.cores[1]};--c3:${t.cores[1]};--txt:${corDeTexto(t.cores[0])}">
            <span class="listras"></span>
            <span class="nome-time">${esc(t.nome)}</span>
          </button>`,
        ).join('')}
      </div>

      <label class="campo">
        <span>Seu apelido no card <small>(opcional)</small></span>
        <input type="text" maxlength="${APELIDO_MAX}" autocomplete="off" placeholder="Ex.: Zé da Geral"
          value="${esc(atual.apelido ?? '')}" />
        <small class="erro-campo" role="alert" hidden></small>
      </label>

      <button class="botao" type="button" data-acao="confirmar" ${atual.time ? '' : 'disabled'}>
        ${depois === 'partida' ? 'Bora pro jogo' : 'Salvar'}
      </button>
    </main>
  `;

  let escolhido = atual.time;
  const confirmar = root.querySelector<HTMLButtonElement>('[data-acao="confirmar"]')!;
  const input = root.querySelector<HTMLInputElement>('input')!;

  root.querySelectorAll<HTMLButtonElement>('.cartao-time').forEach((b) => {
    b.addEventListener('click', () => {
      escolhido = b.dataset.id;
      root.querySelectorAll('.cartao-time').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
      confirmar.disabled = false;
    });
  });

  const erro = root.querySelector<HTMLElement>('.erro-campo')!;
  const textoBotao = confirmar.textContent;

  confirmar.addEventListener('click', async () => {
    if (!escolhido) return;
    erro.hidden = true;
    confirmar.disabled = true;
    confirmar.textContent = 'Salvando…';
    const anterior = prefs.get();
    prefs.set({ time: escolhido, apelido: input.value.trim().replace(/\s+/g, ' ').slice(0, APELIDO_MAX) || undefined });
    try {
      await sincronizarTorcedor();
    } catch (e) {
      if (e instanceof ErroServidor && e.codigo === 'apelido_bloqueado') {
        // Volta o apelido anterior e pede outro.
        prefs.set({ apelido: anterior.apelido });
        erro.textContent = 'Esse apelido não passa no filtro. Tenta outro?';
        erro.hidden = false;
        confirmar.disabled = false;
        confirmar.textContent = textoBotao;
        input.focus();
        return;
      }
      // Sem internet: fica salvo no aparelho e sobe para o servidor na próxima partida.
    }
    const desafio = rota.tela === 'times' ? rota.desafio : undefined;
    irPara(depois === 'partida' ? { tela: 'partida', desafio } : { tela: depois });
  });

  root.querySelector('.voltar')?.addEventListener('click', () => irPara({ tela: depois === 'palpites' ? 'palpites' : 'inicio' }));
}
