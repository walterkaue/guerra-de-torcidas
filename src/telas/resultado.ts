import { esc, irPara, type DadosResultado, type Rota } from '../app';
import { corDeTexto, timePorId, TIMES } from '../dados/times';
import { prefs } from '../estado';
import { desenharCard } from '../jogo/card';

const SITE = 'https://torcida.kauewalter.com.br';

export function telaResultado(root: HTMLElement, rota: Rota): void {
  if (rota.tela !== 'resultado') return;
  const d: DadosResultado = rota.dados;
  const time = timePorId(d.timeId) ?? TIMES[TIMES.length - 1];
  const apelido = prefs.get().apelido || 'Um torcedor';
  const { resultado: r } = d;
  const p = r.pontos;

  // Etapa 3: este link vira o desafio "duvido você me vencer" com as cobranças gravadas.
  const link = `${SITE}/?time=${time.id}`;
  const textoShare = `${apelido} fez ${p.total} pontos pro ${time.nome} no Bate Contra Mim (${r.golsJogador} x ${r.golsMaquina}). Duvido você me vencer! ${link}`;

  const linhas: [string, number][] = [
    ['Gols', p.gols],
    ['Gols no ângulo', p.angulos],
    ['Cavadinhas', p.cavadinhas],
    ['Defesas', p.defesas],
    ['Vitória', p.vitoria],
    ['5 de 5', p.cincoDeCinco],
  ];

  root.innerHTML = `
    <main class="tela resultado" style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
      <img class="card" alt="Card do resultado" />

      <section class="pontos">
        <h2>${p.total} pontos pro ${esc(time.nome)}</h2>
        <ul>
          ${linhas
            .filter(([, v]) => v > 0)
            .map(([nome, v]) => `<li><span>${nome}</span><strong>+${v}</strong></li>`)
            .join('')}
        </ul>
      </section>

      <section class="compartilhar">
        <a class="botao botao-zap" target="_blank" rel="noopener"
          href="https://wa.me/?text=${encodeURIComponent(textoShare)}">Mandar no WhatsApp</a>
        <div class="dupla">
          <button class="botao botao-sec" type="button" data-acao="share">Stories / mais</button>
          <button class="botao botao-sec" type="button" data-acao="copiar">Copiar link</button>
        </div>
      </section>

      <section class="dupla">
        <button class="botao botao-sec" type="button" data-acao="inicio">Início</button>
        <button class="botao" type="button" data-acao="denovo">Jogar de novo</button>
      </section>
    </main>
  `;

  const canvas = desenharCard({
    time,
    apelido,
    golsJogador: r.golsJogador,
    golsMaquina: r.golsMaquina,
    pontos: p.total,
    frase: d.fraseFinal,
    link: link.replace('https://', ''),
  });
  const img = root.querySelector<HTMLImageElement>('.card')!;
  img.src = canvas.toDataURL('image/png');

  const aviso = (botao: HTMLButtonElement, texto: string) => {
    const antes = botao.textContent;
    botao.textContent = texto;
    setTimeout(() => (botao.textContent = antes), 1800);
  };

  const btnShare = root.querySelector<HTMLButtonElement>('[data-acao="share"]')!;
  btnShare.addEventListener('click', async () => {
    try {
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
      const arquivo = blob ? new File([blob], 'guerra-de-torcidas.png', { type: 'image/png' }) : null;
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], text: textoShare });
      } else if (navigator.share) {
        await navigator.share({ text: textoShare, url: link });
      } else {
        await navigator.clipboard.writeText(textoShare);
        aviso(btnShare, 'Texto copiado!');
      }
    } catch {
      // usuário cancelou o compartilhamento
    }
  });

  const btnCopiar = root.querySelector<HTMLButtonElement>('[data-acao="copiar"]')!;
  btnCopiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      aviso(btnCopiar, 'Copiado!');
    } catch {
      aviso(btnCopiar, link);
    }
  });

  root.querySelector('[data-acao="denovo"]')?.addEventListener('click', () => irPara({ tela: 'partida' }));
  root.querySelector('[data-acao="inicio"]')?.addEventListener('click', () => irPara({ tela: 'inicio' }));
}
