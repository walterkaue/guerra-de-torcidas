// Resultado dos Pênaltis no resultado padrão (telas/resultadoPadrao.ts): placar gigante, VITÓRIA/DERROTA,
// "+85 PRO [TIME]" contando, pontos da partida em placas, narrador, selos (posição, recorde, efeito no
// ranking), Carreira, "Mandar no grupo" e Mais uma/Revanche como ação principal.

import { esc, irPara, type DadosResultado, type Rota } from '../app';
import { SELECAO } from '../dados/adversarios';
import { ID_OUTRO, proTime, timePorId, TIMES } from '../dados/times';
import { apelidoDoCard } from '../estado';
import { tipoDoJogo, type DadosDoCard } from '../jogo/cardPersonalizado';
import { linhaDoTorcedor } from '../jogo/cardTextos';
import { conviteX1Penaltis, textoSharePenaltis } from '../jogo/convites';
import { ID_SELECAO, lembrancaDaDisputa } from '../jogo/disputas';
import { placarEmoji } from '../jogo/emoji';
import { escolherFrase } from '../narrador/escolher';
import { eventosDoFim } from '../narrador/lance';
import { contextoDoTime } from '../narrador/sessao';
import { motivoDoConfete } from '../jogo/confete';
import { minhasMedalhas } from '../servidor/api';
import { sorteadorDeFrase } from './cardPersonalizado';
import { mostrarCarreiraNoResultado, nivelParaCard } from './carreira';
import { bomMomentoDosLances } from '../jogo/apoio';
import { oferecerApoio } from './apoio';
import { convidarParaAvisos } from './convitePush';
import { golsDaDisputa, linhaMelhoresDoDia, textoForaDasMelhores } from '../jogo/lancesTextos';
import { itemPenaltis } from '../jogo/regraLances';
import { numero, placa, selo } from './blocos';
import { ligarEfeitoNoRanking } from './efeitoRanking';
import { contar, htmlResultado, htmlSelosDaPosicao, ligarConfete, ligarResultado } from './resultadoPadrao';
import { mostrarRumoDaDisputa } from './rumoMedalhas';
import { vibrar } from './toque';
import { contar as contarFunil } from '../servidor/funil';

const SITE = 'https://torcida.kauewalter.com.br';
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa');
// Em desenvolvimento, ?penaltiFalso lê as medalhas de mentira (src/dev/penaltiFalso.ts).
const PENALTI_FALSO = import.meta.env.DEV && new URLSearchParams(location.search).has('penaltiFalso');
export function telaResultado(root: HTMLElement, rota: Rota): (() => void) | void {
  if (rota.tela !== 'resultado') return;
  const d: DadosResultado = rota.dados;
  const time = timePorId(d.timeId) ?? TIMES[TIMES.length - 1];
  const outro = time.id === ID_OUTRO;
  const apelido = apelidoDoCard();
  const r = d.resultado;
  const p = r.pontos;
  const paraTime = proTime(time);
  // Na disputa histórica (inclusive no X1 recebido) o adversário é o de verdade; o duelo do X1 mostra quem chamou.
  const nomeAdversario = d.disputa?.adversario ?? (d.desafio ? (d.desafio.apelido ?? 'Rival do dia') : 'Máquina');
  // Na disputa da Seleção o placar é da Seleção; os pontos continuam indo para o time.
  const nomeDoLado = d.disputa?.clube === ID_SELECAO ? SELECAO.nome : outro ? 'Você' : time.nome;

  const codigo = d.servidor?.desafio?.codigo;
  const link = codigo ? `${SITE}/?d=${codigo}` : `${SITE}/?time=${time.id}`;
  const convite = conviteX1Penaltis(p.total, paraTime, !!codigo);
  const textoShare = textoSharePenaltis(convite, link);
  const emoji = placarEmoji({
    resultado: r,
    nomeJogador: outro && !d.disputa ? 'Eu' : nomeDoLado,
    nomeAdversario,
    linhaPontos: `+${p.total}${paraTime ? ` ${paraTime}` : ''}`,
    link,
  });

  const decisao =
    r.decisao === 'par_ou_impar' ? 'No par ou ímpar' : r.decisao === 'morte_subita' ? 'Na morte súbita' : 'Fim de jogo';

  // O valor leva o "+" (pontos); o rótulo leva a quantidade ("3 gols"), para não se ler como 21 gols.
  const quantos = (n: number, um: string, varios: string) => n + ' ' + (n === 1 ? um : varios);
  const nGols = r.cobrancas.filter((c) => c.desfecho === 'gol').length;
  const nAngulos = r.cobrancas.filter((c) => c.desfecho === 'gol' && c.angulo).length;
  const nCavadinhas = r.cobrancas.filter((c) => c.desfecho === 'gol' && c.cavadinha).length;
  const nDefesas = r.defesas.filter((x) => x.desfecho === 'defesa' && x.pontos > 0).length;
  const etiquetas: [string, number][] = [
    [quantos(nGols, 'gol', 'gols'), p.gols],
    [quantos(nAngulos, 'ângulo', 'ângulos'), p.angulos],
    [quantos(nCavadinhas, 'cavadinha', 'cavadinhas'), p.cavadinhas],
    [quantos(nDefesas, 'defesa', 'defesas'), p.defesas],
    ['Vitória', p.vitoria],
    ['5 de 5', p.cincoDeCinco],
  ];

  // Quando a partida não entrou no ranking, a explicação vem no lugar do efeito.
  const situacao = !d.valendo
    ? (d.aviso ?? 'Partida sem valer pontos.')
    : d.servidor?.sobSuspeita
      ? 'Essa ficou fora da tabela até a gente conferir.'
      : !d.servidor?.contaNoRanking
        ? textoForaDasMelhores(d.servidor?.melhoresDoDia)
        : null;
  // Regra de 08/11: o dia vale as 3 melhores partidas de Lances (pênaltis, faltas e cara a cara juntos).
  const melhoresDoDia = !situacao ? linhaMelhoresDoDia(d.servidor?.melhoresDoDia) : null;

  // Desafio por link: placar dos dois lado a lado. Mais pontos vence; empate fica com quem desafiou.
  const cmp = d.servidor?.comparacao;
  const fraseDesafio =
    cmp &&
    escolherFrase(
      cmp.venceu ? 'desafio_vitoria' : 'desafio_derrota',
      { ...contextoDoTime(time, apelido), desafiante: d.desafio?.apelido ?? 'o rival do dia' },
      Math.random,
    )?.texto;
  const blocoDesafio = cmp
    ? placa(
        `<div class="duelo-desafio">
          <div><span data-nome-duelo="voce">Você</span><strong>${p.total}</strong><small>${r.golsJogador} x ${r.golsMaquina}</small></div>
          <em>x</em>
          <div><span data-nome-duelo="outro">${esc(cmp.desafiante ?? 'Rival do dia')}</span><strong>${cmp.pontosDesafiante}</strong><small>${cmp.golsJogadorDesafiante} x ${cmp.golsMaquinaDesafiante}</small></div>
        </div>
        ${fraseDesafio ? `<p class="adesivo">${esc(fraseDesafio)}</p>` : ''}`,
        { titulo: 'Desafio', filete: true },
      )
    : '';

  // Disputa histórica que contou (servidor fechou e sem suspeita): a linha rumo à medalha. Treino e sem conexão não têm.
  const contouProMedalha = !!d.disputa && !!d.servidor && d.valendo && !d.servidor.sobSuspeita;
  const detalhes = etiquetas.filter(([, v]) => v > 0);
  // O efeito no ranking chega depois (até 1 minuto): começa como selo de espera.
  // Partida que não vale não mostra "+N pro time" (nem o detalhe).
  const pontos = !d.valendo ? null : { total: p.total, paraTime };
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
    pontos,
    detalhe: `${
      pontos && detalhes.length > 1 // uma parcela só repetiria o total de cima (J24)
        ? `<div class="numeros${detalhes.length === 3 ? ' tres' : ''}">${detalhes.map(([nome, v]) => numero(`+${v}`, nome)).join('')}</div>`
        : ''
    }${blocoDesafio}${contouProMedalha ? '<div data-rumo hidden></div>' : ''}`,
    frases: melhoresDoDia ? [...d.frasesFinais, melhoresDoDia] : d.frasesFinais,
    aviso: situacao ? { texto: situacao, forte: !d.valendo } : null,
    selos:
      htmlSelosDaPosicao(d.servidor?.desempenho ?? null, 'lances') +
      (esperaRanking ? selo('Subindo pro placar…', undefined, 'data-selo-ranking') : '') +
      (!situacao && !esperaRanking ? selo('Tá no placar') : ''),
    zap: `https://wa.me/?text=${encodeURIComponent(textoShare)}`,
    maisUma: r.venceu ? 'Mais uma' : 'Jogo de volta',
  });
  // X1: o busto de cada um ao lado do apelido (sem boneco ou com o interruptor desligado, nada muda).
  if (cmp) void import('./bustosDoDuelo').then((m) => m.bustosDoDuelo(root, d.desafio?.boneco, d.desafio?.timeId));

  contar(root.querySelector<HTMLElement>('[data-contador]'), p.total);
  // Funil do X1: terminou a partida de um X1 recebido (uma vez por tela de resultado).
  const x1Recebido = d.desafio?.id;
  if (x1Recebido) contarFunil({ ev: 'terminou', tipo: 'x1_penaltis', x1: x1Recebido });
  // Confete e vibração, uma vez por resultado: vitória, recorde novo, entrou nas 3 melhores do dia ou medalha nova.
  const comemorar = ligarConfete(root, time);
  comemorar(
    motivoDoConfete({
      venceu: r.venceu,
      novoRecorde: !!d.servidor?.desempenho?.novoRecorde,
      entrouNasMelhores: !!d.servidor && !situacao,
    }),
  );
  // As medalhas são lidas uma vez e servem ao "Rumo às medalhas" e à "Peça nova no vestiário".
  const medalhasLidas =
    contouProMedalha && d.disputa
      ? PENALTI_FALSO
        ? import('../dev/penaltiFalso').then((m) => m.minhasMedalhas())
        : minhasMedalhas()
      : undefined;
  if (contouProMedalha && d.disputa)
    void mostrarRumoDaDisputa({
      alvo: root.querySelector<HTMLElement>('[data-rumo]')!,
      partida: { id: d.disputa.id, titulo: d.disputa.titulo, gols: golsDaDisputa(r.cobrancas), venceu: r.venceu },
      aoSubir: () => comemorar('medalha'),
      ler: () => medalhasLidas!,
    });
  // Fim da morte súbita: o coração para (na vitória, quem explode é a comemoração de cima, docs/jogo.md 14.2).
  if (r.decisao === 'morte_subita' && !r.venceu) vibrar('erro');
  // Carreira: só quando o servidor fechou a partida (o XP sai de lá).
  const carreira = d.servidor
    ? mostrarCarreiraNoResultado(
      root.querySelector<HTMLElement>('[data-carreira]'),
      // Em desenvolvimento, ?homeFalsa lê a carreira de mentira (src/dev/homeFalsa.ts).
      FALSA ? () => import('../dev/homeFalsa').then((m) => m.minhaCarreira()) : undefined,
    )
    : Promise.resolve(null);
  // Peça nova no vestiário: só com a disputa fechada pelo servidor, valendo e sem suspeita (import() lazy).
  void import('./pecaNovaBloco').then((m) =>
    m.pecaNovaDoResultado({
      alvo: root.querySelector<HTMLElement>('[data-peca-nova]'),
      contou: !!d.servidor && d.valendo && !d.servidor.sobSuspeita,
      carreira,
      medalhas: medalhasLidas,
      jogadas: d.disputa ? [{ item: itemPenaltis(d.disputa.id), gols: golsDaDisputa(r.cobrancas), recriados: 0, vitorias: r.venceu ? 1 : 0 }] : [],
      comemorar,
    }),
  ).catch(() => {});
  // Bom momento para oferecer o aviso de domingo: vitória que valeu pra torcida.
  if (r.venceu && d.valendo) convidarParaAvisos(root.querySelector<HTMLElement>('[data-convite-push]'));
  oferecerApoio(
    root.querySelector<HTMLElement>('[data-apoio]'),
    bomMomentoDosLances({ venceu: r.venceu, valendo: d.valendo, novoRecorde: !!d.servidor?.desempenho?.novoRecorde }),
  );

  // ---------- efeito no ranking ("subiu de 5º pra 3º") ----------
  // O mesmo fluxo dos Lances (telas/efeitoRanking.ts): selo de espera que vira "Subiu de 5º pra 3º" e a nota.
  const pararEfeito =
    esperaRanking && d.servidor
      ? ligarEfeitoNoRanking(
          { selo: root.querySelector<HTMLElement>('[data-selo-ranking]'), nota: root.querySelector<HTMLElement>('[data-nota]')! },
          { timeId: time.id, semana: d.servidor.semana, confirmadaEm: d.servidor.confirmadaEm, antes: d.servidor.ranking?.antes },
        )
      : null;

  // ---------- card ----------
  // Card personalizável (jogo.md 14.6): o Card abre a tela "Seu card" e o Stories manda o card com as escolhas guardadas.
  const dados = (async (): Promise<DadosDoCard> => ({
    tipo: tipoDoJogo(!!codigo),
    time,
    jogo: 'Disputa de pênaltis',
    destaque: `+${p.total}`,
    quem: { comApelido: linhaDoTorcedor(apelido, p.total, paraTime), semApelido: linhaDoTorcedor(undefined, p.total, paraTime) },
    lance: `${r.golsJogador} x ${r.golsMaquina}`,
    // As duas linhas de emoji do texto (cobranças e defesas), sem o nome dos lados nem o link.
    placarEmoji: emoji
      .split('\n')
      .filter((l) => l.startsWith('Cobranças:') || l.startsWith('Defesas:'))
      .join('\n'),
    frase: d.frasesFinais[0] ?? '',
    novoRecorde: !!d.servidor?.desempenho?.novoRecorde,
    link: link.replace('https://', ''),
    nivel: await nivelParaCard(),
    conteudo: { jogo: 'penaltis', golsJogador: r.golsJogador, golsMaquina: r.golsMaquina },
  }))();

  ligarResultado(root, {
    dados,
    sortearFrase: sorteadorDeFrase(eventosDoFim(r)[0], {
      ...contextoDoTime(time, apelido),
      placar: `${r.golsJogador} x ${r.golsMaquina}`,
      pontos: p.total,
      numero: d.numeroNarrador,
    }),
    quemComApelido: (a) => linhaDoTorcedor(a, p.total, paraTime),
    textoShare,
    link,
    emoji,
    // Revanche: na disputa histórica, joga a mesma de novo; senão (inclusive depois de um X1, que vale uma vez por
    // pessoa: jogo.md, seção 6), partida nova contra a máquina. Depois do corte não há Disputa livre (seção 14.7):
    // sem disputa (livre começada no domingo e fechada na segunda), volta à escolha, no filtro Pênaltis.
    funil: codigo ? { tipo: 'x1_penaltis', x1: codigo } : { tipo: 'resultado', jogo: 'penaltis' },
    maisUma: () => {
      if (!r.venceu && x1Recebido) contarFunil({ ev: 'revanche', tipo: 'x1_penaltis', x1: x1Recebido });
      irPara(d.disputa ? { tela: 'partida', disputa: d.disputa } : { tela: 'lances', aba: 'penaltis' });
    },
    inicio: () => irPara({ tela: 'inicio' }),
  });

  return () => pararEfeito?.();
}
