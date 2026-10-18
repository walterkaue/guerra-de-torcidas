import { esc, irPara, type Rota } from '../app';
import { corDeTexto, timePorId } from '../dados/times';
import { prefs } from '../estado';

const FRASES = [
  'Joga 30 segundos e bota sua torcida na frente do rival.',
  'Cada gol seu é um ponto pro seu time. Cada defesa também.',
  'O rival tá na frente? Vai deixar?',
];

export function telaInicio(root: HTMLElement, _rota: Rota): void {
  const frase = FRASES[Math.floor(Math.random() * FRASES.length)];
  const time = timePorId(prefs.get().time);

  const blocoTime = time
    ? `<button class="time-atual" type="button" data-acao="trocar"
         style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
         <span class="faixa"></span>
         <span>Você joga pelo <strong>${esc(time.nome)}</strong></span>
         <small>trocar</small>
       </button>`
    : '';

  root.innerHTML = `
    <main class="inicio">
      <header class="topo">
        <span class="selo">Temporada da semana</span>
      </header>

      <section class="marca">
        <h1>Guerra<br /><span>de Torcidas</span></h1>
        <p class="frase">${frase}</p>
      </section>

      <section class="placar" aria-label="Exemplo de placar">
        <div class="linha">
          <span class="pos">1º</span><span class="faixa" style="--c1:${time?.cores[0] ?? '#c8102e'};--c2:${time?.cores[1] ?? '#111'}"></span>
          <span class="nome">${time ? esc(time.nome) : 'Sua torcida'}</span><span class="pts">?</span>
        </div>
        <div class="linha">
          <span class="pos">2º</span><span class="faixa" style="--c1:#fff;--c2:#111"></span>
          <span class="nome">O rival</span><span class="pts">?</span>
        </div>
      </section>

      <section class="acoes">
        ${blocoTime}
        <button class="botao" type="button" data-acao="jogar">
          Bate Contra Mim
          <small>5 cobranças · 5 defesas</small>
        </button>
        <p class="nota">Sem cadastro. Abre e joga. Ranking da torcida chega em breve.</p>
      </section>
    </main>
  `;

  root.querySelector('[data-acao="jogar"]')?.addEventListener('click', () => {
    irPara(time ? { tela: 'partida' } : { tela: 'times', depois: 'partida' });
  });
  root.querySelector('[data-acao="trocar"]')?.addEventListener('click', () => {
    irPara({ tela: 'times', depois: 'inicio' });
  });
}
