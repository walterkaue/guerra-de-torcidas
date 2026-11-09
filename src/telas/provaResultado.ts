// Resultado da Prova de Boleiro no resultado padrão em duas camadas (telas/resultadoPadrao.ts): resumo, pontos pro
// time com a situação no placar, um destaque (aviso, desafio recebido, peça, recorde ou frase), a prévia da mensagem
// (sem o texto das perguntas) e "Desafiar a galera"; escada, pontos da prova e o resto em "Ver detalhes da partida".
// Mais uma / Jogo de volta como ação principal.

import { esc, irPara, type Rota } from '../app';
import { ID_OUTRO, proTime, timePorId, TIMES } from '../dados/times';
import { apelidoDoCard } from '../estado';
import { tipoDoJogo, type DadosDoCard } from '../jogo/cardPersonalizado';
import { linhaDoTorcedor } from '../jogo/cardTextos';
import { linhaDoCard } from '../jogo/cardProva';
import { contextoDoTime } from '../narrador/sessao';
import { conviteX1Prova, textoShareProva } from '../jogo/convites';
import { sorteadorDeFrase } from './cardPersonalizado';
import { mostrarCarreiraNoResultado, nivelParaCard } from './carreira';
import { textoForaDasMelhores } from '../jogo/lancesTextos';
import { numero, placa, selo } from './blocos';
import { motivoDoConfete } from '../jogo/confete';
import { contar as contarFunil } from '../servidor/funil';
import { contar, destaqueDaPeca, destaqueDoDuelo, destaqueDoRecorde, htmlResultado, htmlSelosDaPosicao, ligarConfete, ligarResultado, promoverDestaque } from './resultadoPadrao';

const SITE = 'https://torcida.kauewalter.com.br';
const maiuscula = (s: string) => s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1);

export function telaProvaResultado(root: HTMLElement, rota: Rota): void {
  if (rota.tela !== 'provaResultado') return;
  const { fim, frases } = rota.dados;
  const time = timePorId(rota.dados.timeId) ?? TIMES[TIMES.length - 1];
  const outro = time.id === ID_OUTRO;
  const paraTime = proTime(time);
  const apelido = apelidoDoCard();
  const total = fim.pontos.total;

  const codigo = fim.desafio?.codigo;
  const link = codigo ? `${SITE}/?p=${codigo}` : `${SITE}/?time=${time.id}`;
  const novoRecorde = !!fim.desempenho?.novoRecorde;
  const linha = linhaDoCard(fim.resumo, total, paraTime, novoRecorde);
  const textoShare = textoShareProva({ codigo: !!codigo, convite: conviteX1Prova(total, !!codigo), linha, escada: fim.escada, link });

  // Quando a prova não entrou no ranking, a explicação vem no lugar do selo.
  const situacao = fim.sobSuspeita
    ? 'Essa ficou fora da tabela até a gente conferir.'
    : !fim.contaNoRanking
      ? textoForaDasMelhores() // a Prova tem as 3 dela: sem a lista dos Lances
      : null;

  const cmp = fim.comparacao;
  const blocoDesafio = cmp
    ? placa(
        `<div class="duelo-desafio">
          <div><span>Você</span><strong>${total}</strong><small>${esc(fim.escada)}</small></div>
          <em>x</em>
          <div><span>${esc(cmp.desafiante ?? 'Rival do dia')}</span><strong>${cmp.pontosDesafiante}</strong><small>${esc(cmp.escadaDesafiante)}</small></div>
        </div>`,
        { titulo: `Desafio · ${cmp.venceu ? 'vencido!' : 'deu o outro lado'}`, filete: true },
      )
    : '';

  const titulo = fim.fim === 'perfeita' ? '8 de 8' : fim.fim === 'parou' ? 'Parou na hora' : fim.fim === 'completa' ? 'Prova completa' : 'Fim da prova';
  const ganhou = fim.fim === 'perfeita' || fim.fim === 'parou' || fim.fim === 'completa' || !!cmp?.venceu;

  // Pontos da prova: certas, bônus do 8 de 8 e a regra dos 3 erros.
  const levou75 = (fim.fim === 'errou' || fim.fim === 'tempo') && fim.pontos.base > 0;
  const numeros = [
    fim.pontos.acertos ? numero(`${fim.pontos.acertos}`, fim.pontos.acertos === 1 ? 'certa' : 'certas') : '',
    fim.pontos.acertos ? numero(`+${fim.pontos.base}`, 'das certas') : '',
    fim.pontos.bonus ? numero(`+${fim.pontos.bonus}`, '8 de 8', 'destaque') : '',
    levou75 ? numero('75%', '3 erros: leva 75%', 'apagado') : '',
  ].filter(Boolean);

  root.innerHTML = htmlResultado({
    time,
    classe: `resultado prova-resultado ${ganhou ? 'venceu' : 'perdeu'}`,
    rotulo: 'Prova de Boleiro',
    titulo,
    ganhou,
    placar: `<section class="res-placar faixa-tv prova-placar" aria-label="Resumo da prova">
        <p class="rotulo">${esc(maiuscula(fim.resumo))}</p>
      </section>`,
    pontos: { total, paraTime },
    detalhe: `${placa(`<p class="escada-emoji grande">${esc(fim.escada)}</p>`, { titulo: 'Escada' })}${
      numeros.length ? `<div class="numeros${numeros.length === 3 ? ' tres' : numeros.length === 2 ? ' dois' : ''}">${numeros.join('')}</div>` : ''
    }${blocoDesafio}`,
    frases,
    aviso: situacao ? { texto: situacao, forte: false } : null,
    situacao: situacao ? '' : selo('Tá no placar'),
    destaques: [
      cmp ? destaqueDoDuelo({ voce: total, outro: cmp.pontosDesafiante, nomeDoOutro: cmp.desafiante, venceu: cmp.venceu }) : null,
      destaqueDoRecorde(fim.desempenho, 'prova'),
    ],
    selos: novoRecorde ? '' : htmlSelosDaPosicao(fim.desempenho, 'prova'),
    mensagem: textoShare,
    comDesafio: !!codigo,
    maisUma: cmp && !cmp.venceu ? 'Jogo de volta' : 'Mais uma',
  });

  contar(root.querySelector<HTMLElement>('[data-contador]'), total);
  // Funil do X1: o código do X1 recebido vem junto nos dados da prova (`desafio`, null se o servidor recusou).
  const x1Recebido = rota.dados.desafio?.id;
  if (x1Recebido) contarFunil({ ev: 'terminou', tipo: 'x1_prova', x1: x1Recebido });
  // Confete e vibração, uma vez por resultado: 8 de 8 ou X1 vencido, recorde novo ou entrou nas 3 melhores da Prova.
  const comemorar = ligarConfete(root, time);
  comemorar(
    motivoDoConfete({
      venceu: fim.fim === 'perfeita' || !!cmp?.venceu,
      novoRecorde,
      entrouNasMelhores: !!fim.desempenho && !situacao,
    }),
  );
  // Carreira: só quando o servidor fechou a prova (o XP sai de lá).
  const carreira = fim.desempenho ? mostrarCarreiraNoResultado(root.querySelector<HTMLElement>('[data-carreira]')) : Promise.resolve(null);
  // Peça nova no vestiário: só o nível muda na Prova (import() lazy).
  void import('./pecaNovaBloco').then((m) =>
    m.pecaNovaDoResultado({ alvo: root.querySelector<HTMLElement>('[data-peca-nova]'), contou: !!fim.desempenho && !situacao, carreira, comemorar }),
  )
    .then((novas) => novas.length && promoverDestaque(root, destaqueDaPeca(novas.map((p) => p.nome))))
    .catch(() => {});

  // Card personalizável (jogo.md 14.6): o Card abre a tela "Seu card" e o Stories manda o card com as escolhas guardadas.
  const paraOCard = outro ? null : paraTime;
  const dados = (async (): Promise<DadosDoCard> => ({
    tipo: tipoDoJogo(!!codigo),
    time,
    jogo: 'Prova de Boleiro',
    destaque: `+${total}`,
    quem: { comApelido: linhaDoTorcedor(apelido, total, paraOCard), semApelido: linhaDoTorcedor(undefined, total, paraOCard) },
    lance: `Prova de Boleiro: ${fim.resumo}`,
    placarEmoji: fim.escada,
    frase: frases[0] ?? '',
    novoRecorde,
    link: link.replace('https://', ''),
    nivel: await nivelParaCard(),
    conteudo: { jogo: 'prova', resumo: fim.resumo, escada: fim.escada },
  }))();

  ligarResultado(root, {
    dados,
    sortearFrase:
      fim.fim === 'perfeita'
        ? sorteadorDeFrase('prova_perfeita', contextoDoTime(time, apelido))
        : sorteadorDeFrase('prova_fim', { ...contextoDoTime(time, apelido), pontos: total }),
    quemComApelido: (a) => linhaDoTorcedor(a, total, paraOCard),
    textoShare,
    link,
    emoji: `${linha}
${fim.escada}`,
    funil: codigo ? { tipo: 'x1_prova', x1: codigo } : { tipo: 'resultado', jogo: 'prova' },
    // Sempre prova nova: o mesmo desafio de novo seria com as perguntas já vistas (o servidor recusa).
    maisUma: () => {
      if (cmp && !cmp.venceu && x1Recebido) contarFunil({ ev: 'revanche', tipo: 'x1_prova', x1: x1Recebido });
      irPara({ tela: 'prova' });
    },
    inicio: () => irPara({ tela: 'inicio' }),
  });
}
