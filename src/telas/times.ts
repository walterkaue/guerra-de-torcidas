import { conferidoAoSalvar } from '../jogo/apelidoConferido';
import '../estilos/times.css';
import { desafioDoLink, desafioLancesDoLink, desafioProvaDoLink, esc, irPara, type Rota } from '../app';
import { TIMES, corDeTexto } from '../dados/times';
import { APELIDO_MAX, prefs } from '../estado';
import { abreSozinho } from '../jogo/aquecimento';
import { ErroServidor } from '../servidor/api';
import { sincronizarTorcedor } from '../servidor/torcedor';
import { cabecalhoTela } from './blocos';

export function telaTimes(root: HTMLElement, rota: Rota): void {
  const depois = rota.tela === 'times' ? (rota.depois ?? 'partida') : 'partida';
  // Primeiro acesso (docs/jogo.md 14.8): a primeira tela de quem é novo, sem voltar (não há Home atrás dela ainda).
  const primeira = rota.tela === 'times' && !!rota.primeira;
  const atual = prefs.get();
  // Aparelho que perdeu a conta: avisa uma vez e limpa a marca.
  const saiuDaConta = !!atual.saiuDaConta;
  if (saiuDaConta) prefs.set({ saiuDaConta: undefined });

  root.innerHTML = `
    <main class="tela times">
      ${cabecalhoTela({ titulo: 'Qual é a sua torcida?', voltar: !primeira, pre: false })}
      ${primeira ? '<p class="campo-dica">Sem cadastro: escolha o time e já entra jogando. O apelido é opcional.</p>' : ''}
      ${saiuDaConta ? '<p class="aviso-caixa" role="note">Este aparelho saiu da conta: foi desconectado em outro aparelho ou a conta foi apagada. Escolha seu time pra começar de novo, ou entre com um código.</p>' : ''}
      ${rota.tela === 'times' && rota.desafio ? '<p class="campo-dica">É só escolher o time: o X1 que te mandaram começa em seguida.</p>' : ''}

      <div class="grade-times" role="radiogroup" aria-label="Times">
        ${TIMES.map(
          (t) => `
          <button type="button" role="radio" class="cartao-time${t.cores[0].toLowerCase() === '#ffffff' ? ' clara' : ''}" data-id="${t.id}"
            aria-checked="${t.id === atual.time}"
            style="--c1:${t.cores[0]};--c2:${t.cores[1]};--c3:${t.cor3 ?? t.cores[1]};--txt:${corDeTexto(t.cores[0])}">
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
        ${primeira || depois === 'partida' || depois === 'prova' || depois === 'timeDoDia' || depois === 'lances' ? 'Bora pro jogo' : 'Salvar'}
      </button>
      ${atual.sincronizado ? '' : '<button class="link-feedback" type="button" data-acao="outro-aparelho">Já jogo em outro aparelho</button>'}
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
    // O apelido novo só vai para o card depois que o servidor aceitar (apelidoConferido, J26).
    const apelidoNovo = input.value.trim().replace(/\s+/g, ' ').slice(0, APELIDO_MAX) || undefined;
    prefs.set({ time: escolhido, apelido: apelidoNovo, apelidoConferido: conferidoAoSalvar(anterior, apelidoNovo) });
    try {
      await sincronizarTorcedor();
    } catch (e) {
      if (e instanceof ErroServidor && e.codigo === 'apelido_bloqueado') {
        // Volta o apelido anterior e pede outro.
        prefs.set({ apelido: anterior.apelido, apelidoConferido: anterior.apelidoConferido });
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
    const destino: Rota =
      depois === 'partida'
        ? { tela: 'partida', desafio }
        : depois === 'prova'
          ? { tela: 'prova', desafio }
          : depois === 'lances'
            ? { tela: 'lances', desafio } // X1 dos Lances (?l=): vai direto ao mesmo lance
            : { tela: depois };
    // Aquecimento (docs/jogo.md, 14.4): uma vez por aparelho, logo depois de escolher o time. Quem chegou por
    // link de desafio vai direto ao desafio; o aquecimento aparece depois, como card na Home.
    const veioPorDesafio = !!desafio || !!desafioDoLink() || !!desafioProvaDoLink() || !!desafioLancesDoLink();
    const aquecimento = prefs.get().aquecimento ?? {};
    if (abreSozinho(aquecimento, veioPorDesafio)) return irPara({ tela: 'aquecimento', depois: destino });
    if (veioPorDesafio && !aquecimento.visto && !aquecimento.cardNaHome) prefs.set({ aquecimento: { ...aquecimento, cardNaHome: true } });
    irPara(destino);
  });

  root.querySelector('[data-acao="outro-aparelho"]')?.addEventListener('click', () => irPara({ tela: 'entrar', de: 'times' }));
  root.querySelector('.voltar')?.addEventListener('click', () =>
    irPara({ tela: depois === 'palpites' || depois === 'perfil' ? depois : 'inicio' }),
  );

  if (rota.tela === 'times' && rota.apelido) {
    input.scrollIntoView({ block: 'center' });
    input.focus({ preventScroll: true });
  }
}
