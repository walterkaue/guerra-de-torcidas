// Feedback e relato de bug, sem sair do jogo. Vai para a tabela feedbacks, que só o admin lê
// (#admin). Nada de dado pessoal: o aviso pede para não pôr nome, telefone ou e-mail.

import { irPara, type Rota } from '../app';
import { ErroServidor, enviarFeedback, type TipoFeedback } from '../servidor/api';

const TIPOS: { id: TipoFeedback; rotulo: string; dica: string }[] = [
  { id: 'bug', rotulo: '🐞 Bug', dica: 'O que você fez, o que esperava e o que aconteceu. Ex.: "Na aba Palpites, toquei em Cravar e o botão travou."' },
  { id: 'ideia', rotulo: '💡 Ideia', dica: 'Conta a ideia: jogo novo, regra, tela, frase do narrador…' },
  { id: 'outro', rotulo: '💬 Outro', dica: 'Pode falar.' },
];
const MAX = 1000;

export function telaFeedback(root: HTMLElement, rota: Rota): void {
  const de = rota.tela === 'feedback' ? (rota.de ?? 'inicio') : 'inicio';
  let tipo: TipoFeedback = 'bug';

  root.innerHTML = `
    <main class="tela feedback">
      <header class="cabecalho">
        <button class="voltar" type="button" aria-label="Voltar">‹</button>
        <h2 class="titulo-placar">Feedback</h2>
      </header>
      <p>Achou um bug, teve uma ideia ou quer reclamar do narrador? Manda aqui. Quem lê é a gente que faz o jogo.</p>
      <div class="tipos-feedback" role="radiogroup" aria-label="Tipo">
        ${TIPOS.map((t) => `<button type="button" role="radio" aria-checked="${t.id === tipo}" data-tipo="${t.id}">${t.rotulo}</button>`).join('')}
      </div>
      <label class="campo">
        <span data-dica>${TIPOS[0].dica}</span>
        <textarea rows="6" maxlength="${MAX}" required></textarea>
        <small class="contador"><span data-conta>0</span>/${MAX}</small>
      </label>
      <p class="nota nota-esquerda">Não coloque nome, telefone, e-mail ou outro dado pessoal. Junto vai só a tela e o modelo do navegador, pra gente achar o bug.</p>
      <p class="erro-campo" role="alert" hidden></p>
      <button class="botao" type="button" data-acao="enviar" disabled>Enviar</button>
      <section class="feedback-ok" hidden>
        <p class="adesivo">Recebido! Valeu por ajudar a melhorar o jogo.</p>
        <button class="botao botao-sec" type="button" data-acao="voltar">Voltar pro jogo</button>
      </section>
    </main>`;

  const texto = root.querySelector<HTMLTextAreaElement>('textarea')!;
  const enviar = root.querySelector<HTMLButtonElement>('[data-acao="enviar"]')!;
  const erro = root.querySelector<HTMLElement>('.erro-campo')!;
  const voltar = () => irPara(de === 'palpites' ? { tela: 'palpites' } : { tela: 'inicio' });

  root.querySelectorAll<HTMLButtonElement>('[data-tipo]').forEach((b) =>
    b.addEventListener('click', () => {
      tipo = b.dataset.tipo as TipoFeedback;
      root.querySelectorAll('[data-tipo]').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
      root.querySelector('[data-dica]')!.textContent = TIPOS.find((t) => t.id === tipo)!.dica;
    }),
  );

  texto.addEventListener('input', () => {
    root.querySelector('[data-conta]')!.textContent = String(texto.value.length);
    enviar.disabled = texto.value.trim().length < 3;
  });

  enviar.addEventListener('click', async () => {
    enviar.disabled = true;
    enviar.textContent = 'Enviando…';
    erro.hidden = true;
    try {
      await enviarFeedback(tipo, texto.value, de);
      root.querySelectorAll<HTMLElement>('.tipos-feedback, .campo, .nota-esquerda, [data-acao="enviar"]').forEach((e) => (e.hidden = true));
      root.querySelector<HTMLElement>('.feedback-ok')!.hidden = false;
    } catch (e) {
      erro.textContent =
        e instanceof ErroServidor && e.codigo === 'muitos'
          ? 'Muitos envios em pouco tempo. Tenta de novo daqui a uma hora.'
          : 'Sem conexão agora. Seu texto continua aqui: tenta de novo em instantes.';
      erro.hidden = false;
      enviar.disabled = false;
      enviar.textContent = 'Enviar';
    }
  });

  root.querySelector('.voltar')!.addEventListener('click', voltar);
  root.querySelector('[data-acao="voltar"]')!.addEventListener('click', voltar);
}
