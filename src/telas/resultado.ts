import { esc, irPara, type DadosResultado, type Rota } from '../app';
import { corDeTexto, proTime, timePorId, TIMES } from '../dados/times';
import { prefs } from '../estado';
import { desenharCard } from '../jogo/card';
import { escolherFrase } from '../narrador/escolher';
import { contextoDoTime } from '../narrador/sessao';

const SITE = 'https://torcida.kauewalter.com.br';

export function telaResultado(root: HTMLElement, rota: Rota): void {
  if (rota.tela !== 'resultado') return;
  const d: DadosResultado = rota.dados;
  const time = timePorId(d.timeId) ?? TIMES[TIMES.length - 1];
  const apelidoSalvo = prefs.get().apelido;
  // Sem apelido, o card fala em primeira pessoa ("Fiz 47 pontos…"), neutro de gênero.
  const apelido = apelidoSalvo;
  const { resultado: r } = d;
  const p = r.pontos;

  // Etapa 3: este link vira o desafio "duvido você me vencer" com as cobranças gravadas.
  const link = `${SITE}/?time=${time.id}`;
  const paraTime = proTime(time);
  // Texto do convite vem do banco do narrador (desafio_convite), sorteado com o gerador do narrador.
  const convite =
    escolherFrase('desafio_convite', { ...contextoDoTime(time, apelidoSalvo), pontos: p.total }, Math.random)?.texto ??
    'Duvido você me vencer!';
  const textoShare = `${convite} ${link}`;

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
        ${d.frasesFinais.map((t) => `<p class="frase-final">${esc(t)}</p>`).join('')}
        <h2>${p.total} pontos${paraTime ? ` ${esc(paraTime)}` : ''}</h2>
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
    paraTime,
    golsJogador: r.golsJogador,
    golsMaquina: r.golsMaquina,
    pontos: p.total,
    frase: d.frasesFinais[0] ?? '',
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
