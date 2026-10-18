// Tela inicial. Por enquanto só apresenta o jogo; o minigame entra na etapa 2.

const FRASES = [
  'Joga 30 segundos e bota sua torcida na frente do rival.',
  'Cada gol seu é um ponto pro seu time. Cada defesa também.',
  'O rival tá na frente? Vai deixar?',
];

export function renderHome(root: HTMLElement): void {
  const frase = FRASES[Math.floor(Math.random() * FRASES.length)];

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
          <span class="pos">1º</span><span class="faixa" style="--c1:#c8102e;--c2:#111"></span>
          <span class="nome">Sua torcida</span><span class="pts">?</span>
        </div>
        <div class="linha">
          <span class="pos">2º</span><span class="faixa" style="--c1:#fff;--c2:#111"></span>
          <span class="nome">O rival</span><span class="pts">?</span>
        </div>
      </section>

      <section class="acoes">
        <button class="botao" type="button" disabled>
          Bate Contra Mim
          <small>pênaltis · em breve</small>
        </button>
        <p class="nota">Sem cadastro. Abre e joga.</p>
      </section>
    </main>
  `;
}
