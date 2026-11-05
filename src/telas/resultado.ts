// Resultado dos Pênaltis no resultado padrão (telas/resultadoPadrao.ts): placar gigante, VITÓRIA/DERROTA,
// "+85 PRO [TIME]" contando, pontos da partida em placas, narrador, selos (posição, recorde, efeito no
// ranking), Carreira, "Mandar no grupo" e Mais uma/Revanche como ação principal.

import { esc, irPara, type DadosResultado, type Rota } from '../app';
import { SELECAO } from '../dados/adversarios';
import { ID_OUTRO, proTime, timePorId, TIMES } from '../dados/times';
import { prefs } from '../estado';
import { desenharCard, prontoParaDesenhar, seloNivel } from '../jogo/card';
import { conviteX1Penaltis } from '../jogo/convites';
import { ID_SELECAO, lembrancaDaDisputa } from '../jogo/disputas';
import { placarEmoji } from '../jogo/emoji';
import { escolherFrase } from '../narrador/escolher';
import { contextoDoTime } from '../narrador/sessao';
import { minhasMedalhas, ouvirRanking, rankingCalculadoEm, rankingDaSemana, type LinhaRanking } from '../servidor/api';
import { ESPERA_RANKING_MS, tabelaIncluiPartida } from '../jogo/rankingMinuto';
import { mostrarCarreiraNoResultado, nivelParaCard } from './carreira';
import { bomMomentoDosLances } from '../jogo/apoio';
import { oferecerApoio } from './apoio';
import { convidarParaAvisos } from './convitePush';
import { golsDaDisputa, linhaMelhoresDoDia, textoForaDasMelhores } from '../jogo/lancesTextos';
import { numero, placa, selo } from './blocos';
import { lancesUnificados } from './corte';
import { contar, htmlResultado, htmlSelosDaPosicao, ligarResultado } from './resultadoPadrao';
import { mostrarRumoDaDisputa } from './rumoMedalhas';
import { vibrar } from './toque';

const SITE = 'https://torcida.kauewalter.com.br';
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa');
// Em desenvolvimento, ?penaltiFalso lê as medalhas de mentira (src/dev/penaltiFalso.ts).
const PENALTI_FALSO = import.meta.env.DEV && new URLSearchParams(location.search).has('penaltiFalso');
const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

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

export function telaResultado(root: HTMLElement, rota: Rota): (() => void) | void {
  if (rota.tela !== 'resultado') return;
  const d: DadosResultado = rota.dados;
  const time = timePorId(d.timeId) ?? TIMES[TIMES.length - 1];
  const outro = time.id === ID_OUTRO;
  const apelido = prefs.get().apelido;
  const r = d.resultado;
  const p = r.pontos;
  const paraTime = proTime(time);
  // Na disputa histórica (inclusive no X1 recebido) o adversário é o de verdade; o duelo do X1 mostra quem chamou.
  const nomeAdversario = d.disputa?.adversario ?? (d.desafio ? (d.desafio.apelido ?? 'Quem te chamou') : 'Máquina');
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

  const unificada = lancesUnificados();

  // Quando a partida não entrou no ranking, a explicação vem no lugar do efeito.
  const situacao = !d.valendo
    ? (d.aviso ?? 'Partida sem valer pontos.')
    : d.servidor?.sobSuspeita
      ? 'Essa ficou fora do ranking até a gente conferir.'
      : !d.servidor?.contaNoRanking
        ? unificada
          ? textoForaDasMelhores(d.servidor?.melhoresDoDia)
          : 'Não superou suas 5 melhores de hoje: o ranking não muda.'
        : null;
  // Regra de 09/11: o dia vale as 3 melhores partidas de Lances (pênaltis, faltas e cara a cara juntos).
  const melhoresDoDia = unificada && !situacao ? linhaMelhoresDoDia(d.servidor?.melhoresDoDia) : null;

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
    ? placa(
        `<div class="duelo-desafio">
          <div><span>Você</span><strong>${p.total}</strong><small>${r.golsJogador} x ${r.golsMaquina}</small></div>
          <em>x</em>
          <div><span>${esc(cmp.desafiante ?? 'Quem te chamou')}</span><strong>${cmp.pontosDesafiante}</strong><small>${cmp.golsJogadorDesafiante} x ${cmp.golsMaquinaDesafiante}</small></div>
        </div>
        ${fraseDesafio ? `<p class="adesivo">${esc(fraseDesafio)}</p>` : ''}`,
        { titulo: 'X1', filete: true },
      )
    : '';

  // Disputa histórica que contou (servidor fechou e sem suspeita): a linha rumo à medalha. Treino e sem conexão não têm.
  const contouProMedalha = !!d.disputa && !!d.servidor && d.valendo && !d.servidor.sobSuspeita;
  const detalhes = etiquetas.filter(([, v]) => v > 0);
  // O efeito no ranking chega depois (até 1 minuto): começa como selo de espera.
  const esperaRanking = !situacao && !!d.servidor && !outro;

  root.innerHTML = htmlResultado({
    time,
    classe: `resultado ${r.venceu ? 'venceu' : 'perdeu'}`,
    rotulo: decisao,
    titulo: r.venceu ? 'Vitória' : 'Derrota',
    ganhou: r.venceu,
    placar: `<section class="res-placar faixa-tv" aria-label="Placar">
        <div><span class="rotulo">${esc(nomeDoLado)}</span><strong>${r.golsJogador}</strong></div>
        <em>x</em>
        <div><span class="rotulo">${esc(nomeAdversario)}</span><strong>${r.golsMaquina}</strong></div>
      </section>
      ${d.disputa ? `<p class="res-disputa rotulo">${esc(lembrancaDaDisputa(d.disputa))}</p>` : ''}`,
    pontos: { total: p.total, paraTime },
    detalhe: `${
      detalhes.length
        ? `<div class="numeros${detalhes.length === 3 ? ' tres' : ''}">${detalhes.map(([nome, v]) => numero(`+${v}`, nome)).join('')}</div>`
        : ''
    }${blocoDesafio}${contouProMedalha ? '<div data-rumo hidden></div>' : ''}`,
    frases: melhoresDoDia ? [...d.frasesFinais, melhoresDoDia] : d.frasesFinais,
    aviso: situacao ? { texto: situacao, forte: !d.valendo } : null,
    selos:
      htmlSelosDaPosicao(d.servidor?.desempenho ?? null, unificada ? 'lances' : 'penaltis') +
      (esperaRanking ? selo('No ranking em 1 min', undefined, 'data-selo-ranking') : '') +
      (!situacao && !esperaRanking ? selo('Contou pro ranking') : ''),
    zap: `https://wa.me/?text=${encodeURIComponent(textoShare)}`,
    maisUma: r.venceu ? 'Mais uma' : 'Revanche',
    confete: r.venceu,
  });

  contar(root.querySelector<HTMLElement>('[data-contador]'), p.total);
  if (contouProMedalha && d.disputa)
    void mostrarRumoDaDisputa({
      alvo: root.querySelector<HTMLElement>('[data-rumo]')!,
      partida: { id: d.disputa.id, titulo: d.disputa.titulo, gols: golsDaDisputa(r.cobrancas), venceu: r.venceu },
      cores: [time.cores[0], time.cores[1], '#ffd23f'],
      ler: PENALTI_FALSO ? () => import('../dev/penaltiFalso').then((m) => m.minhasMedalhas()) : () => minhasMedalhas(),
    });
  // Fim da morte súbita: o coração para ou explode (docs/jogo.md 14.2).
  if (r.decisao === 'morte_subita') vibrar(r.venceu ? 'gol' : 'erro');
  // Carreira: só quando o servidor fechou a partida (o XP sai de lá).
  if (d.servidor)
    mostrarCarreiraNoResultado(
      root.querySelector<HTMLElement>('[data-carreira]'),
      // Em desenvolvimento, ?homeFalsa lê a carreira de mentira (src/dev/homeFalsa.ts).
      FALSA ? () => import('../dev/homeFalsa').then((m) => m.minhaCarreira()) : undefined,
    );
  // Bom momento para oferecer o aviso de domingo: vitória que valeu pra torcida.
  if (r.venceu && d.valendo) convidarParaAvisos(root.querySelector<HTMLElement>('[data-convite-push]'));
  oferecerApoio(
    root.querySelector<HTMLElement>('[data-apoio]'),
    bomMomentoDosLances({ venceu: r.venceu, valendo: d.valendo, novoRecorde: !!d.servidor?.desempenho?.novoRecorde }),
  );
  const elConfete = root.querySelector<HTMLCanvasElement>('.confete');
  if (elConfete) confete(elConfete, [time.cores[0], time.cores[1], '#ffd23f']);

  // ---------- efeito no ranking ("subiu de 5º pra 3º") ----------
  // O servidor refaz o ranking a cada minuto: a tela compara a foto de antes da partida com a primeira
  // tabela calculada depois que a partida foi gravada (já pronta ao abrir, ou pelo aviso do Realtime).
  // Partida que não mexe em nada não gera aviso: passado o minuto, o selo vira só "Contou pro ranking".
  const elSelo = root.querySelector<HTMLElement>('[data-selo-ranking]');
  const elNota = root.querySelector<HTMLElement>('[data-nota]')!;
  const rk = d.servidor?.ranking;
  let saiu = false;
  let pararRanking: (() => void) | null = null;
  let espera: ReturnType<typeof setTimeout> | undefined;
  const trocarSelo = (texto: string, tom?: 'subiu' | 'caiu') => {
    if (!elSelo) return;
    elSelo.className = `selo${tom ? ` ${tom}` : ''}`;
    elSelo.innerHTML = texto;
  };
  const mostrarEfeito = (linhas: LinhaRanking[]) => {
    const meu = linhas.find((l) => l.time_id === time.id);
    if (!meu) return;
    const depois = meu.posicao_campeao;
    const antes = rk?.antes && Number(rk.antes.media30) > 0 ? rk.antes.posicao_campeao : undefined;
    if (antes === undefined) trocarSelo(`Entrou em ${depois}º na semana`);
    else if (antes > depois) trocarSelo(`<span aria-hidden="true">▲</span> Subiu de ${antes}º pra ${depois}º`, 'subiu');
    else if (antes < depois) trocarSelo(`<span aria-hidden="true">▼</span> Caiu de ${antes}º pra ${depois}º`, 'caiu');
    else trocarSelo(`Segue em ${depois}º na semana`);
    const nota = (texto: string) => {
      elNota.textContent = texto;
      elNota.hidden = false;
    };
    if (meu.posicao_campeao === 1) {
      const segundo = linhas.find((l) => l.posicao_campeao === 2);
      nota(
        segundo
          ? `Na liderança, ${pontosDeMedia(Math.round(meu.media30 - segundo.media30))} na frente ${doTime(segundo.time_id)}.`
          : 'Na liderança!',
      );
      return;
    }
    const acima = linhas.find((l) => l.posicao_campeao === meu.posicao_campeao - 1);
    const tAcima = acima && timePorId(acima.time_id);
    if (!acima || !tAcima) return;
    const n = Math.max(1, Math.ceil(acima.media30 - meu.media30));
    nota(`Mais ${n} de média e passa ${tAcima.artigo} ${tAcima.nome} (${acima.posicao_campeao}º).`);
  };
  if (esperaRanking && d.servidor) {
    const semana = d.servidor.semana;
    const confirmadaEm = d.servidor.confirmadaEm;
    let pronto = false;
    const encerrar = () => {
      pronto = true;
      clearTimeout(espera);
      pararRanking?.();
    };
    // aviso: sem a hora da partida (servidor antigo), o aviso que chega depois de abrir a tela basta.
    const conferir = (aviso: boolean) =>
      Promise.all([rankingCalculadoEm(semana), rankingDaSemana(semana)])
        .then(([calculadoEm, linhas]) => {
          if (saiu || pronto) return;
          if (!tabelaIncluiPartida(calculadoEm, confirmadaEm) && !(aviso && !confirmadaEm)) return;
          encerrar();
          mostrarEfeito(linhas);
        })
        .catch(() => {});
    void conferir(false);
    ouvirRanking(semana, () => void conferir(true), () => void conferir(false))
      .then((f) => (saiu || pronto ? f() : (pararRanking = f)))
      .catch(() => {
        // sem Realtime: a espera abaixo encerra
      });
    espera = setTimeout(() => {
      if (saiu || pronto) return;
      encerrar();
      trocarSelo('Contou pro ranking');
    }, ESPERA_RANKING_MS);
  }

  // ---------- card ----------
  const card = (async () => {
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
    return canvas;
  })();

  ligarResultado(root, {
    card,
    textoShare,
    link,
    emoji,
    // Revanche: na disputa histórica, joga a mesma de novo; senão (inclusive depois de um X1, que vale uma vez por
    // pessoa: jogo.md, seção 6), partida nova contra a máquina. Depois do corte não há Disputa livre (seção 14.7):
    // sem disputa (livre começada no domingo e fechada na segunda), volta à escolha, no filtro Pênaltis.
    maisUma: () => irPara(d.disputa || !lancesUnificados() ? { tela: 'partida', disputa: d.disputa } : { tela: 'lances', aba: 'penaltis' }),
    inicio: () => irPara({ tela: 'inicio' }),
  });

  return () => {
    saiu = true;
    clearTimeout(espera);
    pararRanking?.();
  };
}
