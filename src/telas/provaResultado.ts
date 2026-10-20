// Resultado da Prova de Boleiro: resumo, pontos, escada em emoji, X1 lado a lado,
// compartilhar (sem o texto das perguntas) e Mais uma / Revanche.

import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, corDeTexto, proTime, timePorId, TIMES } from '../dados/times';
import { prefs } from '../estado';
import { desenharCardProva, linhaDoCard } from '../jogo/cardProva';
import { conviteX1Prova } from '../jogo/convites';

const SITE = 'https://torcida.kauewalter.com.br';
const maiuscula = (s: string) => s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1);

export function telaProvaResultado(root: HTMLElement, rota: Rota): void {
  if (rota.tela !== 'provaResultado') return;
  const { fim, frases } = rota.dados;
  const time = timePorId(rota.dados.timeId) ?? TIMES[TIMES.length - 1];
  const outro = time.id === ID_OUTRO;
  const paraTime = proTime(time);
  const apelido = prefs.get().apelido;
  const total = fim.pontos.total;

  const codigo = fim.desafio?.codigo;
  const link = codigo ? `${SITE}/?p=${codigo}` : `${SITE}/?time=${time.id}`;
  const linha = linhaDoCard(fim.resumo, total, paraTime, fim.amistoso);
  const textoShare = codigo
    ? `${conviteX1Prova(total, true)}\n${fim.escada}\n${link}`
    : `${linha}\n${fim.escada}\n${conviteX1Prova(total, false)} ${link}`;

  const situacao = fim.amistoso
    ? 'Em teste: ainda não soma no ranking.'
    : fim.sobSuspeita
      ? 'Essa ficou fora do ranking até a gente conferir.'
      : !fim.contaNoRanking
        ? 'Não superou suas 5 melhores de hoje: o ranking não muda.'
        : `Contou pro ranking da semana${paraTime ? ` ${paraTime}` : ''}.`;

  const cmp = fim.comparacao;
  const blocoDesafio = cmp
    ? `<section class="duelo-desafio">
        <p class="rotulo">X1 · ${cmp.venceu ? 'você venceu!' : 'ficou com quem te chamou'}</p>
        <div><span>Você</span><strong>${total}</strong><small>${esc(fim.escada)}</small></div>
        <em>x</em>
        <div><span>${esc(cmp.desafiante ?? 'Quem te chamou')}</span><strong>${cmp.pontosDesafiante}</strong><small>${esc(cmp.escadaDesafiante)}</small></div>
      </section>`
    : '';

  const titulo = fim.fim === 'perfeita' ? '8 de 8' : fim.fim === 'parou' ? 'Parou na hora' : 'Fim da prova';

  root.innerHTML = `
    <main class="tela resultado prova-resultado ${fim.fim === 'perfeita' || cmp?.venceu ? 'venceu' : ''}"
      style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
      <header class="res-topo">
        <p class="rotulo">Prova de Boleiro${fim.amistoso ? ' · em teste' : ''}</p>
        <h1 class="res-titulo">${titulo}</h1>
      </header>

      <section class="res-placar faixa-tv prova-placar" aria-label="Escada">
        <p class="rotulo">${esc(maiuscula(fim.resumo))}</p>
        <p class="escada-emoji grande">${esc(fim.escada)}</p>
      </section>

      <section class="res-pontos">
        <p class="res-total"><strong>+${total}</strong>${paraTime ? `<span>${esc(paraTime)}</span>` : ''}</p>
        <ul class="etiquetas">
          ${fim.pontos.acertos ? `<li class="rotulo">${fim.pontos.acertos} ${fim.pontos.acertos === 1 ? 'certa' : 'certas'} <b>${fim.pontos.base}</b></li>` : ''}
          ${fim.pontos.bonus ? `<li class="rotulo">8 de 8 <b>+${fim.pontos.bonus}</b></li>` : ''}
          ${(fim.fim === 'errou' || fim.fim === 'tempo') && fim.pontos.base ? '<li class="rotulo">Leva metade</li>' : ''}
        </ul>
      </section>

      ${frases.map((t, i) => `<p class="adesivo${i ? ' segundo' : ''}">${esc(t)}</p>`).join('')}

      <section class="res-efeito"><p class="situacao${fim.amistoso ? ' sem-pontos' : ''}">${esc(situacao)}</p></section>

      ${blocoDesafio}

      <section class="res-compartilhar">
        <a class="botao botao-zap" target="_blank" rel="noopener"
          href="https://wa.me/?text=${encodeURIComponent(textoShare)}">Chamar no X1</a>
        <div class="trio">
          <button class="botao botao-sec" type="button" data-acao="share">Stories</button>
          <button class="botao botao-sec" type="button" data-acao="emoji">Escada em emoji</button>
          <button class="botao botao-sec" type="button" data-acao="copiar">Copiar link</button>
        </div>
      </section>

      <details class="res-card">
        <summary class="rotulo">Ver o card</summary>
        <img class="card" alt="Card da Prova de Boleiro" />
      </details>

      <div class="res-acoes">
        <button class="botao botao-sec" type="button" data-acao="inicio">Início</button>
        <button class="botao" type="button" data-acao="denovo">${cmp && !cmp.venceu ? 'Revanche' : 'Mais uma'}<small>prova nova</small></button>
      </div>
    </main>
  `;

  // ---------- card ----------
  const img = root.querySelector<HTMLImageElement>('.card')!;
  const cardPronto = (async () => {
    try {
      await Promise.all([document.fonts.load('400 100px Anton'), document.fonts.load('700 40px Barlow')]);
    } catch {
      // segue com a fonte que tiver
    }
    const canvas = desenharCardProva({
      time,
      apelido,
      paraTime: outro ? null : paraTime,
      resumo: fim.resumo,
      pontos: total,
      escada: fim.escada,
      frase: frases[0] ?? '',
      amistoso: fim.amistoso,
      link: link.replace('https://', ''),
    });
    img.src = canvas.toDataURL('image/png');
    return canvas;
  })();

  const avisar = (botao: HTMLButtonElement, texto: string) => {
    const antes = botao.textContent;
    botao.textContent = texto;
    setTimeout(() => (botao.textContent = antes), 1800);
  };

  const btnShare = root.querySelector<HTMLButtonElement>('[data-acao="share"]')!;
  btnShare.addEventListener('click', async () => {
    try {
      const canvas = await cardPronto;
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
      const arquivo = blob ? new File([blob], 'prova-de-boleiro.png', { type: 'image/png' }) : null;
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) await navigator.share({ files: [arquivo], text: textoShare });
      else if (navigator.share) await navigator.share({ text: textoShare });
      else {
        await navigator.clipboard.writeText(textoShare);
        avisar(btnShare, 'Copiado!');
      }
    } catch {
      // cancelou
    }
  });

  const btnEmoji = root.querySelector<HTMLButtonElement>('[data-acao="emoji"]')!;
  btnEmoji.addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ text: textoShare });
      else {
        await navigator.clipboard.writeText(textoShare);
        avisar(btnEmoji, 'Copiado!');
      }
    } catch {
      // cancelou
    }
  });

  const btnCopiar = root.querySelector<HTMLButtonElement>('[data-acao="copiar"]')!;
  btnCopiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      avisar(btnCopiar, 'Copiado!');
    } catch {
      avisar(btnCopiar, link);
    }
  });

  // Sempre prova nova: o mesmo desafio de novo seria com as perguntas já vistas (o servidor recusa).
  root.querySelector('[data-acao="denovo"]')?.addEventListener('click', () => irPara({ tela: 'prova' }));
  root.querySelector('[data-acao="inicio"]')?.addEventListener('click', () => irPara({ tela: 'inicio' }));
}
