// Só em desenvolvimento (npm run dev, com ?cardFalso na URL): abre direto a tela "Seu card" (telas/cardPersonalizado.ts),
// sem servidor nem partida, com dados de mentira de Lances do Jogo. Serve para conferir a tela e tirar os prints.
//   &tipo=jogo|medalha          o tipo do card (padrão: jogo-x1, de Lances com link de X1)
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
  const tipo: TipoDeCard = pedido === 'medalha' ? 'medalha' : pedido === 'jogo' ? 'jogo' : tipoDoJogo(true);
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

  if (tipo === 'medalha') {
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
    texto: `Fiz ${pontos} pontos nos Lances do Jogo. Bora tentar?\n${emojisDaPartida(desfechos)}\nhttps://${link}`,
    link: `https://${link}`,
    sortearFrase,
    quemComApelido,
    boneco,
    inicial: folha ? { folhaDaFrase: folha } : undefined,
  });
}
