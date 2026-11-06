// Resultado dos Pênaltis no resultado padrão (telas/resultadoPadrao.ts): placar gigante, VITÓRIA/DERROTA,
// "+85 PRO [TIME]" contando, pontos da partida em placas, narrador, selos (posição, recorde, efeito no
// ranking), Carreira, "Mandar no grupo" e Mais uma/Revanche como ação principal.

import { esc, irPara, type DadosResultado, type Rota } from '../app';
import { SELECAO } from '../dados/adversarios';
import { ID_OUTRO, proTime, timePorId, TIMES } from '../dados/times';
import { prefs } from '../estado';
import { tipoDoJogo, type DadosDoCard } from '../jogo/cardPersonalizado';
import { linhaDoTorcedor } from '../jogo/cardTextos';
import { conviteX1Penaltis } from '../jogo/convites';
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
import { lancesUnificados } from './corte';
import { ligarEfeitoNoRanking } from './efeitoRanking';
import { contar, htmlResultado, htmlSelosDaPosicao, ligarConfete, ligarResultado } from './resultadoPadrao';
import { mostrarRumoDaDisputa } from './rumoMedalhas';
import { vibrar } from './toque';

const SITE = 'https://torcida.kauewalter.com.br';
const FALSA = import.meta.env.DEV && new URLSearchParams(location.search).has('homeFalsa');
// Em desenvolvimento, ?penaltiFalso lê as medalhas de mentira (src/dev/penaltiFalso.ts).
const PENALTI_FALSO = import.meta.env.DEV && new URLSearchParams(location.search).has('penaltiFalso');
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
  // Partida que não vale não mostra "+N pro time" (nem o detalhe) desde o corte; antes dele a tela antiga seguia mostrando.
  const pontos = unificada && !d.valendo ? null : { total: p.total, paraTime };
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
      htmlSelosDaPosicao(d.servidor?.desempenho ?? null, unificada ? 'lances' : 'penaltis') +
      (esperaRanking ? selo('No ranking em 1 min', undefined, 'data-selo-ranking') : '') +
      (!situacao && !esperaRanking ? selo('Contou pro ranking') : ''),
    zap: `https://wa.me/?text=${encodeURIComponent(textoShare)}`,
    maisUma: r.venceu ? 'Mais uma' : 'Revanche',
  });

  contar(root.querySelector<HTMLElement>('[data-contador]'), p.total);
  // Confete e vibração, uma vez por resultado: vitória, recorde novo, entrou nas 3 melhores do dia ou medalha nova.
  const comemorar = ligarConfete(root, time);
  comemorar(
    motivoDoConfete({
      venceu: r.venceu,
      novoRecorde: !!d.servidor?.desempenho?.novoRecorde,
      entrouNasMelhores: unificada && !!d.servidor && !situacao,
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
    jogo: 'Bate Contra Mim',
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
    maisUma: () => irPara(d.disputa || !lancesUnificados() ? { tela: 'partida', disputa: d.disputa } : { tela: 'lances', aba: 'penaltis' }),
    inicio: () => irPara({ tela: 'inicio' }),
  });

  return () => pararEfeito?.();
}
