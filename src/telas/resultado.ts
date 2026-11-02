// Resultado (docs/visual.md, "Resultado"): placar gigante, VITÓRIA/DERROTA, "+85 PRA [TIME]" contando,
// bônus em etiquetas, efeito no ranking, X1 lado a lado, compartilhar e Mais uma/Revanche como ação principal.

import { esc, irPara, type DadosResultado, type Rota } from '../app';
import { SELECAO } from '../dados/adversarios';
import { ID_OUTRO, corDeTexto, proTime, timePorId, TIMES } from '../dados/times';
import { prefs } from '../estado';
import { desenharCard, mostrarCard, prontoParaDesenhar, seloNivel } from '../jogo/card';
import { conviteX1Penaltis } from '../jogo/convites';
import { ID_SELECAO, lembrancaDaDisputa } from '../jogo/disputas';
import { placarEmoji } from '../jogo/emoji';
import { htmlPosicao } from '../jogo/posicao';
import { escolherFrase } from '../narrador/escolher';
import { contextoDoTime } from '../narrador/sessao';
import { rankingDaSemana } from '../servidor/api';
import { mostrarCarreiraNoResultado, nivelParaCard } from './carreira';
import { bomMomentoDosLances } from '../jogo/apoio';
import { oferecerApoio } from './apoio';
import { convidarParaAvisos } from './convitePush';

const SITE = 'https://torcida.kauewalter.com.br';
const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Conta de 0 até `total` em ~700 ms (sem animação para quem pediu menos movimento). */
function contar(el: HTMLElement, total: number): void {
  if (semMovimento() || total <= 0) {
    el.textContent = `+${total}`;
    return;
  }
  const inicio = performance.now();
  const passo = (agora: number) => {
    const t = Math.min(1, (agora - inicio) / 700);
    el.textContent = `+${Math.round(total * (1 - (1 - t) ** 3))}`;
    if (t < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

/** Confete curto nas cores do time (só na vitória e só para quem não pediu menos movimento). */
function confete(canvas: HTMLCanvasElement, cores: string[]): void {
  if (semMovimento()) {
    canvas.remove();
    return;
  }
  const c = canvas.getContext('2d');
  if (!c) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = (canvas.width = innerWidth * dpr);
  const H = (canvas.height = innerHeight * dpr);
  const pedacos = Array.from({ length: 90 }, () => ({
    x: Math.random() * W,
    y: -Math.random() * H * 0.4,
    vx: (Math.random() - 0.5) * 3 * dpr,
    vy: (2 + Math.random() * 3) * dpr,
    giro: Math.random() * Math.PI,
    cor: cores[Math.floor(Math.random() * cores.length)],
    t: (6 + Math.random() * 6) * dpr,
  }));
  const inicio = performance.now();
  const quadro = (agora: number) => {
    const passou = agora - inicio;
    c.clearRect(0, 0, W, H);
    c.globalAlpha = passou > 1200 ? Math.max(0, 1 - (passou - 1200) / 400) : 1;
    for (const p of pedacos) {
      p.x += p.vx;
      p.y += p.vy;
      p.giro += 0.15;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.giro);
      c.fillStyle = p.cor;
      c.fillRect(-p.t / 2, -p.t / 4, p.t, p.t / 2);
      c.restore();
    }
    if (passou < 1600) requestAnimationFrame(quadro);
    else canvas.remove();
  };
  requestAnimationFrame(quadro);
}

/** "do Flamengo" / "da Chapecoense" */
const doTime = (id: string) => {
  const t = timePorId(id);
  return t ? `${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}` : '';
};

/** "226 pontos de média" / "1 ponto de média" */
const pontosDeMedia = (n: number) => `${n} ${n === 1 ? 'ponto' : 'pontos'} de média`;

export function telaResultado(root: HTMLElement, rota: Rota): void {
  if (rota.tela !== 'resultado') return;
  const d: DadosResultado = rota.dados;
  const time = timePorId(d.timeId) ?? TIMES[TIMES.length - 1];
  const outro = time.id === ID_OUTRO;
  const apelido = prefs.get().apelido;
  const r = d.resultado;
  const p = r.pontos;
  const paraTime = proTime(time);
  const nomeAdversario = d.desafio ? (d.desafio.apelido ?? 'Quem te chamou') : (d.disputa?.adversario ?? 'Máquina');
  // Na disputa da Seleção o placar é da Seleção; os pontos continuam indo para o time.
  const nomeDoLado = d.disputa?.clube === ID_SELECAO ? SELECAO.nome : outro ? 'Você' : time.nome;

  const codigo = d.servidor?.desafio?.codigo;
  const link = codigo ? `${SITE}/?d=${codigo}` : `${SITE}/?time=${time.id}`;
  const convite = conviteX1Penaltis(p.total, paraTime, !!codigo);
  const textoShare = `${convite} ${link}`;
  const emoji = placarEmoji({
    resultado: r,
    nomeJogador: outro && !d.disputa ? 'Eu' : nomeDoLado,
    nomeAdversario,
    linhaPontos: `+${p.total}${paraTime ? ` ${paraTime}` : ''}`,
    link,
  });

  const decisao =
    r.decisao === 'par_ou_impar' ? 'No par ou ímpar' : r.decisao === 'morte_subita' ? 'Na morte súbita' : 'Fim de jogo';

  const etiquetas: [string, number][] = [
    ['Gols', p.gols],
    ['Ângulo', p.angulos],
    ['Cavadinha', p.cavadinhas],
    ['Defesas', p.defesas],
    ['Vitória', p.vitoria],
    ['5 de 5', p.cincoDeCinco],
  ];

  // Quando a partida não entrou no ranking, a explicação vem no lugar do efeito.
  const situacao = !d.valendo
    ? (d.aviso ?? 'Partida sem valer pontos.')
    : d.servidor?.sobSuspeita
      ? 'Essa ficou fora do ranking até a gente conferir.'
      : !d.servidor?.contaNoRanking
        ? 'Não superou suas 5 melhores de hoje: o ranking não muda.'
        : null;

  // Desafio por link: placar dos dois lado a lado. Mais pontos vence; empate fica com quem desafiou.
  const cmp = d.servidor?.comparacao;
  const fraseDesafio =
    cmp &&
    escolherFrase(
      cmp.venceu ? 'desafio_vitoria' : 'desafio_derrota',
      { ...contextoDoTime(time, apelido), desafiante: d.desafio?.apelido ?? 'quem te chamou' },
      Math.random,
    )?.texto;
  const blocoDesafio = cmp
    ? `<section class="duelo-desafio">
        <p class="rotulo">X1</p>
        <div><span>Você</span><strong>${p.total}</strong><small>${r.golsJogador} x ${r.golsMaquina}</small></div>
        <em>x</em>
        <div><span>${esc(cmp.desafiante ?? 'Quem te chamou')}</span><strong>${cmp.pontosDesafiante}</strong><small>${cmp.golsJogadorDesafiante} x ${cmp.golsMaquinaDesafiante}</small></div>
        ${fraseDesafio ? `<p class="adesivo">${esc(fraseDesafio)}</p>` : ''}
      </section>`
    : '';

  root.innerHTML = `
    <main class="tela resultado ${r.venceu ? 'venceu' : 'perdeu'}"
      style="--c1:${time.cores[0]};--c2:${time.cores[1]};--txt:${corDeTexto(time.cores[0])}">
      ${r.venceu ? '<canvas class="confete" aria-hidden="true"></canvas>' : ''}

      <header class="res-topo">
        <p class="rotulo">${decisao}</p>
        <h1 class="res-titulo">${r.venceu ? 'Vitória' : 'Derrota'}</h1>
      </header>

      <section class="res-placar faixa-tv" aria-label="Placar">
        <div><span class="rotulo">${esc(nomeDoLado)}</span><strong>${r.golsJogador}</strong></div>
        <em>x</em>
        <div><span class="rotulo">${esc(nomeAdversario)}</span><strong>${r.golsMaquina}</strong></div>
      </section>
      ${d.disputa ? `<p class="res-disputa rotulo">${esc(lembrancaDaDisputa(d.disputa))}</p>` : ''}

      <section class="res-pontos">
        <p class="res-total"><strong data-contador>+0</strong>${paraTime ? `<span>${esc(paraTime)}</span>` : ''}</p>
        <ul class="etiquetas">
          ${etiquetas
            .filter(([, v]) => v > 0)
            .map(([nome, v]) => `<li class="rotulo">${nome} <b>+${v}</b></li>`)
            .join('')}
        </ul>
      </section>

      ${d.frasesFinais.map((t, i) => `<p class="adesivo${i ? ' segundo' : ''}">${esc(t)}</p>`).join('')}

      <section class="res-efeito" aria-live="polite">
        ${situacao ? `<p class="situacao${d.valendo ? '' : ' sem-pontos'}">${esc(situacao)}</p>` : ''}
      </section>

      ${htmlPosicao(d.servidor?.desempenho ?? null, 'penaltis')}
      <div class="res-carreira" data-carreira hidden></div>

      ${blocoDesafio}

      <section class="res-compartilhar">
        <a class="botao botao-zap" data-sem-aviso target="_blank" rel="noopener"
          href="https://wa.me/?text=${encodeURIComponent(textoShare)}">Chamar no X1</a>
        <div class="trio">
          <button class="botao botao-sec" type="button" data-acao="share">Stories</button>
          <button class="botao botao-sec" type="button" data-acao="emoji">Placar em emoji</button>
          <button class="botao botao-sec" type="button" data-acao="copiar">Copiar link</button>
        </div>
      </section>

      <details class="res-card">
        <summary class="rotulo">Ver o card</summary>
        <img class="card" alt="Card do resultado" />
      </details>

      <div data-convite-push></div>
      <div class="res-apoio" data-apoio></div>

      <div class="res-acoes">
        <button class="botao botao-sec" type="button" data-acao="inicio">Início</button>
        <button class="botao" type="button" data-acao="revanche">${r.venceu ? 'Mais uma' : 'Revanche'}</button>
      </div>
    </main>
  `;

  contar(root.querySelector<HTMLElement>('[data-contador]')!, p.total);
  // Carreira: só quando o servidor fechou a partida (o XP sai de lá).
  if (d.servidor) mostrarCarreiraNoResultado(root.querySelector<HTMLElement>('[data-carreira]'));
  // Bom momento para oferecer o aviso de domingo: vitória que valeu pra torcida.
  if (r.venceu && d.valendo) convidarParaAvisos(root.querySelector<HTMLElement>('[data-convite-push]'));
  oferecerApoio(
    root.querySelector<HTMLElement>('[data-apoio]'),
    bomMomentoDosLances({ venceu: r.venceu, valendo: d.valendo, novoRecorde: !!d.servidor?.desempenho?.novoRecorde }),
  );
  const elConfete = root.querySelector<HTMLCanvasElement>('.confete');
  if (elConfete) confete(elConfete, [time.cores[0], time.cores[1], '#ffd23f']);

  // ---------- efeito no ranking ("subiu de 5º pra 3º") ----------
  const elEfeito = root.querySelector<HTMLElement>('.res-efeito')!;
  const rk = d.servidor?.ranking;
  if (!situacao && d.servidor && rk?.depois && !outro) {
    const depois = rk.depois.posicao_campeao;
    const antes = rk.antes && rk.antes.media30 > 0 ? rk.antes.posicao_campeao : undefined;
    const frase =
      antes === undefined
        ? `Entrou em <strong>${depois}º</strong> na semana`
        : antes > depois
          ? `<span class="seta subiu" aria-hidden="true">▲</span> Subiu de ${antes}º pra <strong>${depois}º</strong> na semana`
          : antes < depois
            ? `<span class="seta caiu" aria-hidden="true">▼</span> Caiu de ${antes}º pra <strong>${depois}º</strong> na semana`
            : `Segue em <strong>${depois}º</strong> na semana`;
    elEfeito.innerHTML = `<p class="efeito-texto">${frase}</p>
      <div class="efeito-barra"><span></span></div>
      <p class="efeito-falta"></p>`;
    rankingDaSemana(d.servidor.semana)
      .then((linhas) => {
        const meu = linhas.find((l) => l.time_id === time.id);
        if (!meu) return;
        const barra = elEfeito.querySelector<HTMLElement>('.efeito-barra span')!;
        const falta = elEfeito.querySelector<HTMLElement>('.efeito-falta')!;
        if (meu.posicao_campeao === 1) {
          const segundo = linhas.find((l) => l.posicao_campeao === 2);
          barra.style.setProperty('--enche', '1');
          falta.textContent = segundo
            ? `Na liderança, ${pontosDeMedia(Math.round(meu.media30 - segundo.media30))} na frente ${doTime(segundo.time_id)}.`
            : 'Na liderança!';
          return;
        }
        const acima = linhas.find((l) => l.posicao_campeao === meu.posicao_campeao - 1);
        const tAcima = acima && timePorId(acima.time_id);
        if (!acima || !tAcima) return;
        barra.style.setProperty('--enche', String(acima.media30 > 0 ? Math.min(1, meu.media30 / acima.media30) : 1));
        const n = Math.max(1, Math.ceil(acima.media30 - meu.media30));
        falta.textContent = `Mais ${n} de média e passa ${tAcima.artigo} ${tAcima.nome} (${acima.posicao_campeao}º).`;
      })
      .catch(() => {});
  } else if (!situacao) {
    elEfeito.innerHTML = `<p class="situacao">Contou pro ranking da semana${paraTime ? ` ${esc(paraTime)}` : ''}.</p>`;
  }

  // ---------- card ----------
  const img = root.querySelector<HTMLImageElement>('.card')!;
  const cardPronto = (async () => {
    await prontoParaDesenhar();
    const canvas = desenharCard({
      time,
      apelido,
      paraTime,
      golsJogador: r.golsJogador,
      golsMaquina: r.golsMaquina,
      pontos: p.total,
      frase: d.frasesFinais[0] ?? '',
      novoRecorde: !!d.servidor?.desempenho?.novoRecorde,
      link: link.replace('https://', ''),
    });
    const nivel = await nivelParaCard();
    if (nivel) seloNivel(canvas, nivel);
    await mostrarCard(img, canvas);
    return canvas;
  })();

  // ---------- botões ----------
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
      const arquivo = blob ? new File([blob], 'guerra-de-torcidas.png', { type: 'image/png' }) : null;
      if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], text: textoShare });
      } else if (navigator.share) {
        await navigator.share({ text: textoShare, url: link });
      } else {
        await navigator.clipboard.writeText(textoShare);
        avisar(btnShare, 'Copiado!');
      }
    } catch {
      // cancelou o compartilhamento
    }
  });

  const btnEmoji = root.querySelector<HTMLButtonElement>('[data-acao="emoji"]')!;
  btnEmoji.addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ text: emoji });
      else {
        await navigator.clipboard.writeText(emoji);
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

  // Revanche: no desafio ou na disputa histórica, joga a mesma de novo; senão, partida nova contra a máquina.
  root.querySelector('[data-acao="revanche"]')?.addEventListener('click', () =>
    irPara({ tela: 'partida', desafio: d.desafio?.id, disputa: d.disputa }),
  );
  root.querySelector('[data-acao="inicio"]')?.addEventListener('click', () => irPara({ tela: 'inicio' }));
}
