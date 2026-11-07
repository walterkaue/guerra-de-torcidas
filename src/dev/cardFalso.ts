// Só em desenvolvimento (npm run dev, com ?cardFalso na URL): abre direto a tela "Seu card" (telas/cardPersonalizado.ts),
// sem servidor nem partida, com dados de mentira de Lances do Jogo. Serve para conferir a tela e tirar os prints.
//   &tipo=jogo|medalha|trofeu   o tipo do card (padrão: jogo-x1, de Lances com link de X1)
//   &trofeu=semana|mes|vitrine|estreia  (com tipo=trofeu) o troféu; &somou=0|1 (a pessoa somou na semana; padrão 1);
//                               &outroTime=1 (a Galeria de outro time: cores do troféu, sem Pôster e sem Meu boneco)
//   &tipo=temporada            o card de fim de temporada; &cenario=subiu|caiu|campeao|campeao_b|fica_a|fica_b|unica_a|
//                               unica_b|estreia (padrão: subiu); &pre=1 (pré-temporada, "Teste das divisões");
//                               &somou=0|1 (a pessoa somou no mês; padrão 1)
//   &estilo=telao|placar|poster o estilo guardado no aparelho
//   &boneco=sem|parado|bracos   sem = sem rede (sem Pôster); parado = sem a pose de braços liberada; bracos (padrão) = com ela
//   &comBoneco=1                já abre com o busto ligado (Telão e Placar seco)
//   &formato=stories|quadrado   o formato guardado no aparelho
//   &tudo=desligado             todos os quadradinhos de ligar começam desligados
//   &folha=frase                já abre a folha "Escrever minha frase"
//   &barrada=1                  abre a folha da frase, escreve uma frase que o filtro barra e toca em "Pôr no card"
// Nunca entra no build de produção (o import fica atrás de import.meta.env.DEV).

import { LANCES } from '../dados/lances';
import { TIMES, proTime, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { tipoDoJogo, type BonecoDoCard, type DadosDoCard, type EscolhasDoCard, type TipoDeCard } from '../jogo/cardPersonalizado';
import { PADRAO } from '../jogo/vestiario';
import { linhaDoTorcedor } from '../jogo/cardTextos';
import type { DesfechoLance } from '../jogo/lances';
import { emojisDaPartida } from '../jogo/lancesTextos';
import { ADESIVO_DA_MEDALHA, MEDALHA_NO_CARD, itemDaMedalha, jogoDoItem, noTitulo, quemNaMedalha } from '../jogo/medalhaTextos';
import { contextoDoTime } from '../narrador/sessao';
import { abrirCardPersonalizado, sorteadorDeFrase } from '../telas/cardPersonalizado';
import { sorteadorDeFraseDoTrofeu } from '../jogo/cardTrofeuDados';
import { quemNoTrofeu, textoDoCardDoTrofeu } from '../jogo/galeria';
import { dadosDeAmostraDoTrofeu, trofeuDeAmostra, type AmostraDeTrofeu } from './trofeuFalso';
import { CENARIOS_DO_MES, amostraDoMes, mesDeAmostra } from './temporadaCardFalso';
import { contextoDoFimDoMes, sorteadorDeFraseDoFim } from '../jogo/cardTemporadaDados';

const SITE = 'torcida.kauewalter.com.br';

/** `raiz` é o body, não o #app: a Home por baixo se desenha depois e apagaria a folha. */
export function abrirCardFalso(raiz: HTMLElement): void {
  const q = new URLSearchParams(location.search);
  const time = timePorId(prefs.get().time) ?? TIMES[0];
  const paraTime = proTime(time);
  const apelido = prefs.get().apelido;

  const pedidoEstilo = q.get('estilo');
  const estilo = pedidoEstilo === 'placar' || pedidoEstilo === 'poster' ? pedidoEstilo : 'telao';
  const formato = q.get('formato') === 'quadrado' ? 'quadrado' : 'stories';
  const tudoDesligado = q.get('tudo') === 'desligado';
  const escolhas: EscolhasDoCard = { estilo, formato, desligados: tudoDesligado ? ['frase', 'apelido', 'placar', 'link'] : [], comBoneco: q.get('comBoneco') === '1' };
  prefs.set({ card: escolhas, nivelNoCard: !tudoDesligado });

  // O boneco de mentira: uma vestimenta fixa, sem passar pelo servidor.
  const vestimenta = { ...PADRAO, numero: '07', fundo: 'tunel', camisa: 'uni1' } as BonecoDoCard['vestimenta'];
  const modo = q.get('boneco');
  const boneco: Promise<BonecoDoCard | null> =
    modo === 'sem' ? Promise.resolve(null) : Promise.resolve({ vestimenta, liberadas: modo === 'parado' ? [] : ['pose_bracos'] });

  const pedido = q.get('tipo');
  const tipo: TipoDeCard = pedido === 'temporada' ? 'temporada' : pedido === 'trofeu' ? 'trofeu' : pedido === 'medalha' ? 'medalha' : pedido === 'jogo' ? 'jogo' : tipoDoJogo(true);
  const desfechos: DesfechoLance[] = ['gol', 'defesa', 'gol'];
  const pontos = 47;
  const lance = LANCES.find((l) => l.id === 'flamengo-2019-virada-em-lima') ?? LANCES[0];
  const quemJogo = {
    comApelido: linhaDoTorcedor(apelido, pontos, paraTime),
    semApelido: linhaDoTorcedor(undefined, pontos, paraTime),
  };

  let dados: DadosDoCard;
  let quemComApelido: (a: string) => string = (a) => linhaDoTorcedor(a, pontos, paraTime);
  let sortearFrase: (() => string | null) | undefined;
  const link = `${SITE}/?l=ABC123`;

  let texto = `Fiz ${pontos} pontos nos Lances do Jogo. Bora tentar?\n${emojisDaPartida(desfechos)}\nhttps://${link}`;
  let cardLink = `https://${link}`;
  let avisoSemBoneco: string | undefined;
  let bonecoDoCard = boneco;

  if (tipo === 'temporada') {
    const pedidoC = q.get('cenario');
    const cenario = CENARIOS_DO_MES.find((c) => c === pedidoC) ?? 'subiu';
    const pre = q.get('pre') === '1';
    const somou = q.get('somou') !== '0';
    const a = amostraDoMes(cenario, time, { pre, somou, apelido });
    dados = a.dados;
    texto = a.texto;
    cardLink = 'https://torcida.kauewalter.com.br';
    quemComApelido = (ap) => quemNoTrofeu(ap);
    const m = mesDeAmostra(cenario, time, pre);
    const { ctx, rivalCaiu } = contextoDoFimDoMes(m.linha, m.linhas, time, m.temporada.mes);
    sortearFrase = sorteadorDeFraseDoFim(a.destino, ctx, rivalCaiu, dados.frase);
  } else if (tipo === 'trofeu') {
    const pedidoT = q.get('trofeu');
    const amostra: AmostraDeTrofeu = pedidoT === 'mes' || pedidoT === 'vitrine' || pedidoT === 'estreia' ? pedidoT : 'semana';
    const outroTime = q.get('outroTime') === '1';
    const somou = q.get('somou') !== '0';
    // Outro time: o troféu é de um time que não é o seu.
    const doTime = outroTime ? (TIMES.find((t) => t.id !== time.id && t.id !== 'outro') ?? time) : time;
    dados = dadosDeAmostraDoTrofeu(amostra, doTime, { somou, outroTime, apelido });
    const t = trofeuDeAmostra(amostra, doTime.id).trofeu;
    quemComApelido = (a) => quemNoTrofeu(a);
    sortearFrase = sorteadorDeFraseDoTrofeu(t.trofeu, doTime, dados.frase);
    texto = textoDoCardDoTrofeu(t, doTime, somou && !outroTime && !!t.semana);
    cardLink = 'https://torcida.kauewalter.com.br';
    if (outroTime) {
      bonecoDoCard = Promise.resolve(null);
      avisoSemBoneco = 'Boneco só no card do seu time';
    }
  } else if (tipo === 'medalha') {
    const item = itemDaMedalha(lance.id)!;
    dados = {
      tipo,
      time,
      jogo: 'Lances do Jogo',
      destaque: MEDALHA_NO_CARD.ouro,
      quem: { comApelido: quemNaMedalha(apelido, paraTime), semApelido: quemNaMedalha(undefined, paraTime) },
      lance: `${noTitulo(item.titulo, item.tipo)} · ${jogoDoItem(item)}`,
      placarEmoji: '🥇',
      frase: ADESIVO_DA_MEDALHA.ouro,
      novoRecorde: false,
      link: `${SITE}/${item.caminho}`,
      nivel: 'Craque',
      conteudo: { jogo: 'medalha', medalha: 'ouro', item },
    };
    quemComApelido = (a) => quemNaMedalha(a, paraTime);
  } else {
    dados = {
      tipo,
      time,
      jogo: 'Lances do Jogo',
      destaque: `+${pontos}`,
      quem: quemJogo,
      lance: lance.titulo,
      placarEmoji: emojisDaPartida(desfechos),
      frase: 'Três lances, dois gols e o goleiro de cara feia.',
      novoRecorde: true,
      link,
      nivel: 'Craque',
      conteudo: {
        jogo: 'lances',
        lances: desfechos.map((desfecho, i) => ({ titulo: `Tentativa ${i + 1}`, desfecho, recriou: i === 0, pontos: desfecho === 'gol' ? 20 : 7 })),
        tituloUnico: lance.titulo,
        medalha: 'Bronze no lance A virada em Lima!',
      },
    };
    sortearFrase = sorteadorDeFrase('lance_fim', { ...contextoDoTime(time, apelido), pontos });
  }

  const folha = q.get('barrada') ? { texto: 'que merda de zaga', enviar: true } : q.get('folha') === 'frase' ? { texto: '', enviar: false } : undefined;
  abrirCardPersonalizado({
    raiz,
    dados,
    texto,
    link: cardLink,
    sortearFrase,
    quemComApelido,
    boneco: bonecoDoCard,
    avisoSemBoneco,
    inicial: folha ? { folhaDaFrase: folha } : undefined,
  });
}
