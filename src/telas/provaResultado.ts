// Resultado da Prova de Boleiro no resultado padrão (telas/resultadoPadrao.ts): escada e resumo, pontos
// pro time, pontos da prova e X1 em placas, narrador, selos (posição, recorde, ranking), Carreira,
// "Mandar no grupo" (sem o texto das perguntas) e Mais uma / Revanche como ação principal.

import { esc, irPara, type Rota } from '../app';
import { prontoParaDesenhar, seloNivel } from '../jogo/card';
import { ID_OUTRO, proTime, timePorId, TIMES } from '../dados/times';
import { prefs } from '../estado';
import { desenharCardProva, linhaDoCard } from '../jogo/cardProva';
import { conviteX1Prova } from '../jogo/convites';
import { mostrarCarreiraNoResultado, nivelParaCard } from './carreira';
import { textoForaDasMelhores } from '../jogo/lancesTextos';
import { numero, placa, selo } from './blocos';
import { lancesUnificados } from './corte';
import { motivoDoConfete } from '../jogo/confete';
import { contar, htmlResultado, htmlSelosDaPosicao, ligarConfete, ligarResultado } from './resultadoPadrao';

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
  const novoRecorde = !!fim.desempenho?.novoRecorde;
  const linha = linhaDoCard(fim.resumo, total, paraTime, novoRecorde);
  const textoShare = codigo
    ? `${conviteX1Prova(total, true)}
${fim.escada}
${link}`
    : `${linha}
${fim.escada}
${conviteX1Prova(total, false)} ${link}`;

  // Quando a prova não entrou no ranking, a explicação vem no lugar do selo.
  const situacao = fim.sobSuspeita
    ? 'Essa ficou fora do ranking até a gente conferir.'
    : !fim.contaNoRanking
      ? lancesUnificados()
        ? textoForaDasMelhores() // a Prova tem as 3 dela: sem a lista dos Lances
        : 'Não superou suas 5 melhores de hoje: o ranking não muda.'
      : null;

  const cmp = fim.comparacao;
  const blocoDesafio = cmp
    ? placa(
        `<div class="duelo-desafio">
          <div><span>Você</span><strong>${total}</strong><small>${esc(fim.escada)}</small></div>
          <em>x</em>
          <div><span>${esc(cmp.desafiante ?? 'Quem te chamou')}</span><strong>${cmp.pontosDesafiante}</strong><small>${esc(cmp.escadaDesafiante)}</small></div>
        </div>`,
        { titulo: `X1 · ${cmp.venceu ? 'você venceu!' : 'ficou com quem te chamou'}`, filete: true },
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
    selos: htmlSelosDaPosicao(fim.desempenho, 'prova') + (situacao ? '' : selo('Contou pro ranking')),
    zap: `https://wa.me/?text=${encodeURIComponent(textoShare)}`,
    maisUma: cmp && !cmp.venceu ? 'Revanche' : 'Mais uma',
  });

  contar(root.querySelector<HTMLElement>('[data-contador]'), total);
  // Confete e vibração, uma vez por resultado: 8 de 8 ou X1 vencido, recorde novo ou entrou nas 3 melhores da Prova.
  ligarConfete(root, time)(
    motivoDoConfete({
      venceu: fim.fim === 'perfeita' || !!cmp?.venceu,
      novoRecorde,
      entrouNasMelhores: lancesUnificados() && !!fim.desempenho && !situacao,
    }),
  );
  // Carreira: só quando o servidor fechou a prova (o XP sai de lá).
  if (fim.desempenho) mostrarCarreiraNoResultado(root.querySelector<HTMLElement>('[data-carreira]'));

  const card = (async () => {
    await prontoParaDesenhar();
    const canvas = desenharCardProva({
      time,
      apelido,
      paraTime: outro ? null : paraTime,
      resumo: fim.resumo,
      pontos: total,
      escada: fim.escada,
      frase: frases[0] ?? '',
      novoRecorde,
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
    emoji: `${linha}
${fim.escada}`,
    // Sempre prova nova: o mesmo desafio de novo seria com as perguntas já vistas (o servidor recusa).
    maisUma: () => irPara({ tela: 'prova' }),
    inicio: () => irPara({ tela: 'inicio' }),
  });
}
