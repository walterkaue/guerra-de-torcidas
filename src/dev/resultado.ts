// Protótipo do resultado em 3 rotas (B02 + C02 do docs/backlog.md, etapa 1), só dev: /dev/resultado.html.
// Não mexe nas telas de verdade: usa as peças delas (placa, selo, número, adesivo, faixa, boneco, confete) com
// dados falsos, para o Kauê escolher a rota. Nada daqui vai para o site (o build só leva o index.html).
//
// Duas páginas no mesmo arquivo:
// - o painel (sem ?quadro): seletor de rota, situação, largura e WhatsApp, com um iframe por tela;
// - a tela (?quadro): o resultado sozinho, do tamanho do aparelho. Aberto direto no celular, o "⚙" volta ao painel.
// Parâmetros da tela: rota=A|B|C, sit=1..6, fonte=100|130 (130 imita a fonte do sistema grande), zap=simular|abrir.
//
// Regras do protótipo (o brief do B02 + C02):
// 1. Primeira dobra: título, placar, pontos com a linha curta da situação, UM destaque e as ações.
// 2. Destaque, nesta ordem: aviso sem valer > X1 recebido > medalha nova > peça nova > recorde > 3 melhores do dia > frase.
// 3. O resto vai para "Ver detalhes da partida", que abre logo embaixo (aria-expanded). Convite só um, depois.
// 4. "Chamar no X1" com texto pronto por jogo. 5. Sem código de X1, volta o "Mandar no grupo" de hoje.

import '../style.css';
import '../estilos/blocos.css';
import '../estilos/inicio.css';
import '../estilos/resultado.css';
import '../estilos/lances.css';
import '../estilos/prova.css';
import '../estilos/cidade.css';
import '../estilos/trofeus.css';
import '../estilos/palpites.css';
import './resultado.css';
import { esc } from '../app';
import { timePorId, proTime, corDeTexto, type Time } from '../dados/times';
import { LANCES } from '../dados/lances';
import { DISPUTAS } from '../dados/disputas';
import { lembrancaDaDisputa } from '../jogo/disputas';
import { trilhaDoLance, trilhaDaDisputa, NOME_DA_MEDALHA } from '../jogo/lancesTextos';
import type { Medalha } from '../jogo/lances';
import { gruposDaPecaNova, vestirAsNovas } from '../jogo/pecaNova';
import { PADRAO, pecaPorId, type Peca, type Vestimenta } from '../jogo/vestiario';
import { barra, numero, placa, selo, seloPre, trilha } from '../telas/blocos';
import { icone } from '../telas/icones';
import { pintarBoneco } from '../telas/bonecoDoAparelho';
import { medirBarraDeBaixo } from '../telas/alturaBarra';
import { ligarConfete } from '../telas/resultadoPadrao';

const SITE = 'https://torcida.kauewalter.com.br';
const busca = new URLSearchParams(location.search);

// ---------------------------------------------------------------- dados falsos

type Jogo = 'lances' | 'penaltis' | 'prova';
type Rota = 'A' | 'B' | 'C';
type Destaque = 'aviso' | 'x1' | 'medalha' | 'peca' | 'recorde' | 'top3' | 'frase';
type Convite = 'cidade' | 'push' | 'apoio';

/** O X1 que esta partida gerou (tem código): o texto pronto e o que o amigo vai ver. */
interface X1Gerado {
  texto: string;
  link: string;
  /** Placar a bater, em Anton ("96", "3 x 4"). */
  aBater: string;
  rotuloABater: string;
  /** O lance ou a disputa ("A falta do tri, aos 43"). */
  oQue: string;
  /** Como é o X1 ("mesmo lance, 3 tentativas"). */
  comoE: string;
  /** X1 recebido nos pênaltis e na Prova: a ação vira "Revanche". */
  revanche?: boolean;
}

interface X1Recebido {
  voce: number;
  outro: number;
  nome: string;
  timeDoOutro: string;
  venceu: boolean;
  /** Linha pequena embaixo dos números (placar dos pênaltis, escada da Prova). */
  subVoce?: string;
  subOutro?: string;
}

interface Situacao {
  id: string;
  nome: string;
  jogo: Jogo;
  timeId: string;
  rotulo: string;
  titulo: string;
  ganhou: boolean;
  placar: string;
  pontos: number | null;
  /** Linha curta embaixo dos pontos ("Contou pro ranking", "No ranking em 1 min"). */
  linha: string | null;
  aviso: string | null;
  x1Recebido: X1Recebido | null;
  medalha: { medalha: Medalha; lance: string } | null;
  pecas: Peca[] | null;
  recorde: { novo: number; antes: number } | null;
  top3: number[] | null;
  frases: string[];
  /** Placas de detalhe (gols, defesas, escada), em HTML. */
  detalhe: string;
  selos: string;
  carreira: boolean;
  rumo: string | null;
  x1: X1Gerado | null;
  /** Lances (J16) não tem o botão Emoji no "Mandar no grupo". */
  semEmoji: boolean;
  maisUma: string;
  convite: Convite | null;
  confete: boolean;
}

const lance = LANCES.find((l) => l.id === 'flamengo-2001-falta-do-tri')!;
const disputa = DISPUTAS.find((d) => d.id === 'atletico-mg-2013-libertadores')!;
const lanceVasco = LANCES.find((l) => l.id === 'vasco-1998-falta-no-monumental')!;

const BONECO: Vestimenta = { ...PADRAO, corpo: 'm', pele: 3, cabelo: 'crespo', corCabelo: 1, numero: '10', camisa: 'uni1', fundo: 'arquibancada' };
const BONECO_DO_OUTRO: Vestimenta = { ...PADRAO, corpo: 'h', pele: 1, cabelo: 'curto', corCabelo: 2, numero: '7', camisa: 'uni1', fundo: 'gramado' };

/** As 3 tentativas dos Lances, como a lista `.resumo-lances` de hoje. */
function listaDosLances(titulo: string, tentativas: [string, string, number][]): string {
  const ICONE: Record<string, 'bola' | 'mao' | 'barreira' | 'xis'> = { gol: 'bola', defesa: 'mao', barreira: 'barreira', fora: 'xis' };
  return placa(
    `<ul class="resumo-lances">${tentativas
      .map(
        ([desfecho, legenda, pontos], i) => `<li><span class="emoji">${icone(ICONE[desfecho])}</span>
          <span class="resumo-titulo">${i + 1}ª tentativa<small>${esc(legenda)}</small></span>
          <strong>${pontos ? `+${pontos}` : '0'}</strong></li>`,
      )
      .join('')}</ul>
      <button type="button" class="botao-linha" data-dev="Abre a lista dos lances">Ver os lances</button>`,
    { titulo, filete: true },
  );
}

const placarDosLances = (gols: number) => `<section class="res-placar faixa-tv" aria-label="Gols">
    <div><span class="rotulo">Gols</span><strong>${gols}</strong></div><em>de</em>
    <div><span class="rotulo">Tentativas</span><strong>3</strong></div></section>`;

const placarDosPenaltis = (nos: string, eles: string, a: number, b: number, lembranca?: string) => `<section class="res-placar faixa-tv" aria-label="Placar">
    <div><span class="rotulo">${esc(nos)}</span><strong>${a}</strong></div><em>x</em>
    <div><span class="rotulo">${esc(eles)}</span><strong>${b}</strong></div></section>
    ${lembranca ? `<p class="res-disputa rotulo">${esc(lembranca)}</p>` : ''}`;

const numeros = (itens: [string, string][]) =>
  `<div class="numeros${itens.length === 3 ? ' tres' : itens.length === 2 ? ' dois' : ''}">${itens.map(([v, r]) => numero(v, r)).join('')}</div>`;

/** "Rumo às medalhas" com a trilha compacta de verdade (telas/rumoMedalhas.ts, com números de mentira). */
function rumo(linhas: { titulo: string; texto: string; gols: number; disputa?: boolean }[]): string {
  return placa(
    `<ul class="rumo-lista">${linhas
      .map(
        (l) => `<li class="rumo-linha"><div class="rumo-topo"><span class="rumo-titulo">${esc(l.titulo)}</span></div>
          <p class="rumo-texto">${esc(l.texto)}</p>${trilha(l.disputa ? trilhaDaDisputa(l.gols, 0) : trilhaDoLance(l.gols, 0), { compacta: true })}</li>`,
      )
      .join('')}</ul>`,
    { titulo: 'Rumo às medalhas', classe: 'rumo-placa' },
  );
}

/** Boneco do destaque "Peça nova": menor no celular estreito. */
const BONECO_PECA = () => (innerWidth <= 380 ? { w: 52, h: 76 } : { w: 64, h: 94 });

const pecas = (...ids: string[]) => ids.map((id) => pecaPorId(id)!).filter(Boolean);

const SITUACOES: Situacao[] = [
  {
    id: '1',
    nome: 'Lances: recorde novo, X1 gerado',
    jogo: 'lances',
    timeId: 'flamengo',
    rotulo: 'Lances do Jogo',
    titulo: 'Fim de jogo',
    ganhou: true,
    placar: placarDosLances(2),
    pontos: 96,
    linha: 'No ranking em 1 min',
    aviso: null,
    x1Recebido: null,
    medalha: null,
    pecas: null,
    recorde: { novo: 96, antes: 84 },
    top3: [96, 72, 55],
    frases: ['NO ÂNGULO! A barreira só assistiu!', 'Duas de três. O goleiro vai sonhar com essa.'],
    detalhe: listaDosLances(lance.titulo, [
      ['gol', 'No ângulo, por cima da barreira', 50],
      ['barreira', 'Parou na barreira', 0],
      ['gol', 'Rasteira, no canto', 46],
    ]),
    selos: selo(`${icone('estrela')} Novo recorde: 96`, 'ouro') + selo('3º de 41 hoje nos Lances') + selo('No ranking em 1 min'),
    carreira: true,
    rumo: rumo([{ titulo: lance.titulo, texto: '+2 rumo ao bronze · 4/5', gols: 4 }]),
    x1: {
      texto: `Fiz 96 no lance “${lance.titulo}”. Te chamo no X1: mesmo lance, 3 tentativas. Bate aí?`,
      link: `${SITE}/?l=K7Q2ZP`,
      aBater: '96',
      rotuloABater: 'pontos pra bater',
      oQue: lance.titulo,
      comoE: 'mesmo lance, 3 tentativas',
    },
    semEmoji: true,
    maisUma: 'Jogar de novo',
    convite: 'cidade',
    confete: true,
  },
  {
    id: '2',
    nome: 'Pênaltis: derrota, X1 gerado',
    jogo: 'penaltis',
    timeId: 'atletico-mg',
    rotulo: 'Na morte súbita',
    titulo: 'Derrota',
    ganhou: false,
    placar: placarDosPenaltis('Atlético-MG', disputa.adversario, 3, 4, lembrancaDaDisputa(disputa)),
    pontos: 41,
    linha: 'No ranking em 1 min',
    aviso: null,
    x1Recebido: null,
    medalha: null,
    pecas: null,
    recorde: null,
    top3: null,
    frases: ['Morte súbita é crueldade. Mas a torcida viu a raça!', 'Os pontos contam igual pro seu time.'],
    detalhe: numeros([
      ['+21', '3 gols'],
      ['+14', '2 defesas'],
      ['+6', '1 ângulo'],
    ]),
    selos: selo('9º de 63 hoje nos pênaltis') + selo('No ranking em 1 min'),
    carreira: true,
    rumo: rumo([{ titulo: disputa.titulo, texto: '+3 rumo ao bronze · 7/10', gols: 7, disputa: true }]),
    x1: {
      texto: 'Perdi de 3 x 4 na disputa e ainda fiz 41. Te chamo no X1 nos pênaltis: quem faz mais?',
      link: `${SITE}/?d=M3VX8A`,
      aBater: '41',
      rotuloABater: 'pontos pra bater',
      oQue: disputa.titulo,
      comoE: '5 cobranças e 5 defesas',
    },
    semEmoji: false,
    maisUma: 'Revanche',
    convite: null,
    confete: false,
  },
  {
    id: '3',
    nome: 'X1 recebido nos Lances, vencido',
    jogo: 'lances',
    timeId: 'palmeiras',
    rotulo: 'Lances do Jogo · X1',
    titulo: 'Fim de jogo',
    ganhou: true,
    placar: placarDosLances(3),
    pontos: 118,
    linha: 'Contou pro ranking',
    aviso: null,
    x1Recebido: { voce: 118, outro: 92, nome: 'Tio Beto', timeDoOutro: 'vasco', venceu: true },
    medalha: null,
    pecas: null,
    recorde: null,
    top3: [118, 80, 61],
    frases: ['Três de três! Quem te chamou vai ter que voltar pro treino.', 'Ganhou o X1 de quem te chamou.'],
    detalhe: listaDosLances(lanceVasco.titulo, [
      ['gol', 'No ângulo, de longe', 42],
      ['gol', 'Por baixo da barreira', 38],
      ['gol', 'Colocada, no canto', 38],
    ]),
    selos: selo('1º de 41 hoje nos Lances', 'subiu') + selo('Contou pro ranking'),
    carreira: true,
    rumo: rumo([{ titulo: lanceVasco.titulo, texto: '+3 rumo ao bronze · 3/5', gols: 3 }]),
    x1: null, // X1 recebido nos Lances não gera outro código
    semEmoji: true,
    maisUma: 'Jogar de novo',
    convite: 'push',
    confete: true,
  },
  {
    id: '4',
    nome: 'Sem rede: sem valer, sem X1',
    jogo: 'penaltis',
    timeId: 'gremio',
    rotulo: 'Fim de jogo',
    titulo: 'Vitória',
    ganhou: true,
    placar: placarDosPenaltis('Grêmio', 'Máquina', 4, 2),
    pontos: null,
    linha: null,
    aviso: 'Caiu a conexão: essa partida ficou só no seu celular e não vale pontos.\ncódigo: rede',
    x1Recebido: null,
    medalha: null,
    pecas: null,
    recorde: null,
    top3: null,
    frases: ['Quatro na rede! Que tarde, que tarde!'],
    detalhe: numeros([
      ['+28', '4 gols'],
      ['+7', '1 defesa'],
      ['+10', 'Vitória'],
    ]),
    selos: '',
    carreira: false,
    rumo: null,
    x1: null,
    semEmoji: false,
    maisUma: 'Mais uma',
    convite: null,
    confete: false,
  },
  {
    id: '5',
    nome: 'Prova: X1 gerado, peça nova',
    jogo: 'prova',
    timeId: 'bahia',
    rotulo: 'Prova de Boleiro',
    titulo: 'Prova completa',
    ganhou: true,
    placar: `<section class="res-placar faixa-tv prova-placar" aria-label="Resumo da prova"><p class="rotulo">7 de 8 certas, sem errar a última</p></section>`,
    pontos: 120,
    linha: 'Contou pro ranking',
    aviso: null,
    x1Recebido: null,
    medalha: null,
    pecas: pecas('bracadeira', 'fundo_holofotes'),
    recorde: { novo: 120, antes: 104 },
    top3: [120, 98, 75],
    frases: ['Isso é prova de quem assiste até o pré-jogo!'],
    detalhe:
      placa(`<p class="escada-emoji grande">🟩🟩🟩🟩🟩🟩🟥🟩</p>`, { titulo: 'Escada' }) +
      numeros([
        ['7', 'certas'],
        ['+120', 'das certas'],
      ]),
    selos: selo(`${icone('estrela')} Novo recorde: 120`, 'ouro') + selo('2º de 37 hoje na Prova') + selo('Contou pro ranking'),
    carreira: true,
    rumo: null,
    x1: {
      texto: 'Fiz 120 na Prova de Boleiro. Te chamo no X1: mesmas perguntas.',
      link: `${SITE}/?p=R9TB4C`,
      aBater: '120',
      rotuloABater: 'pontos pra bater',
      oQue: 'Prova de Boleiro',
      comoE: 'as mesmas 8 perguntas',
    },
    semEmoji: false,
    maisUma: 'Mais uma',
    convite: 'apoio',
    confete: true,
  },
  {
    id: '6',
    nome: 'Extra: X1 recebido nos pênaltis, perdido (Revanche)',
    jogo: 'penaltis',
    timeId: 'corinthians',
    rotulo: 'Fim de jogo · X1',
    titulo: 'Derrota',
    ganhou: false,
    placar: placarDosPenaltis('Corinthians', 'Máquina', 3, 3),
    pontos: 38,
    linha: 'No ranking em 1 min',
    aviso: null,
    x1Recebido: { voce: 38, outro: 52, nome: 'Duda', timeDoOutro: 'palmeiras', venceu: false, subVoce: '3 x 3', subOutro: '4 x 2' },
    medalha: null,
    pecas: null,
    recorde: null,
    top3: null,
    frases: ['Ficou com quem te chamou. A revanche tá aí, é só bater.'],
    detalhe: numeros([
      ['+21', '3 gols'],
      ['+17', '2 defesas'],
    ]),
    selos: selo('14º de 63 hoje nos pênaltis') + selo('No ranking em 1 min'),
    carreira: true,
    rumo: null,
    x1: {
      texto: 'Fiz 38 no seu X1 e perdi por 14. Revanche nos pênaltis: quem faz mais?',
      link: `${SITE}/?d=W2HN6E`,
      aBater: '38',
      rotuloABater: 'pontos pra bater',
      oQue: 'Pênaltis contra a máquina',
      comoE: '5 cobranças e 5 defesas',
      revanche: true,
    },
    semEmoji: false,
    maisUma: 'Mais uma',
    convite: null,
    confete: false,
  },
];

/** O destaque único da dobra, na ordem do brief. */
function escolherDestaque(s: Situacao): Destaque | null {
  if (s.aviso) return 'aviso';
  if (s.x1Recebido) return 'x1';
  if (s.medalha) return 'medalha';
  if (s.pecas?.length) return 'peca';
  if (s.recorde) return 'recorde';
  if (s.top3) return 'top3';
  return s.frases.length ? 'frase' : null;
}

// ---------------------------------------------------------------- a tela (?quadro)

const ROTAS: Record<Rota, string> = { A: 'X1 no amarelo', B: 'Mais uma no amarelo', C: 'Placa do X1' };

function htmlDoDestaque(s: Situacao, d: Destaque | null): string {
  switch (d) {
    case 'aviso': {
      const [frase, codigo] = s.aviso!.split('\n');
      return `<p class="res-aviso forte pr-destaque" role="note" data-dobra="destaque">${esc(frase)}${codigo ? `<small class="aviso-codigo">${esc(codigo)}</small>` : ''}</p>`;
    }
    case 'x1': {
      const x = s.x1Recebido!;
      return placa(
        `<div class="duelo-desafio">
          <div><span data-nome-duelo="voce">Você</span><strong>${x.voce}</strong>${x.subVoce ? `<small>${esc(x.subVoce)}</small>` : ''}</div>
          <em>x</em>
          <div><span data-nome-duelo="outro">${esc(x.nome)}</span><strong>${x.outro}</strong>${x.subOutro ? `<small>${esc(x.subOutro)}</small>` : ''}</div>
        </div>`,
        { titulo: `X1 · ${x.venceu ? 'você venceu!' : 'ficou com quem te chamou'}`, filete: true, classe: 'pr-destaque pr-duelo', attrs: 'data-dobra="destaque"' },
      );
    }
    case 'medalha': {
      const m = s.medalha!;
      return placa(
        `<p class="pr-medalha"><span class="medalha ${m.medalha}" aria-hidden="true"></span><span><b>${NOME_DA_MEDALHA[m.medalha]}</b> no lance ${esc(m.lance)}</span></p>`,
        { titulo: 'Medalha nova', filete: true, classe: 'pr-destaque', attrs: 'data-dobra="destaque"' },
      );
    }
    case 'peca': {
      const grupos = gruposDaPecaNova(s.pecas!);
      return placa(
        `<div class="pr-peca"><div class="peca-boneco" data-boneco-peca style="width:${BONECO_PECA().w}px;height:${BONECO_PECA().h}px"></div>
          <div class="pr-peca-lista">${grupos.map((g) => `<p class="peca-conquista">${esc(g.titulo)}</p><p>${esc(g.pecas.map((p) => p.nome).join(' · '))}</p>`).join('')}
          <button type="button" class="botao-linha" data-dev="Abre o vestiário com a peça nova">Vestir agora</button></div></div>`,
        { titulo: 'Peça nova no vestiário', filete: true, classe: 'pr-destaque peca-placa', attrs: 'data-dobra="destaque"' },
      );
    }
    case 'recorde': {
      const r = s.recorde!;
      return placa(
        `<div class="pr-recorde">${selo(`${icone('estrela')} Novo recorde!`, 'ouro')}<p>Seu melhor era <b>${r.antes}</b>. Agora é <b>${r.novo}</b>.</p></div>`,
        { filete: true, classe: 'pr-destaque', attrs: 'data-dobra="destaque"' },
      );
    }
    case 'top3':
      return placa(`<p class="pr-top3">Entrou nas suas 3 melhores de hoje: <b>${s.top3!.join(' · ')}</b></p>`, {
        filete: true,
        classe: 'pr-destaque',
        attrs: 'data-dobra="destaque"',
      });
    case 'frase':
      return `<p class="adesivo pr-destaque" data-dobra="destaque">${esc(s.frases[0])}</p>`;
    default:
      return '';
  }
}

/** Os 4 (ou 3) formatos de hoje, embaixo do "Mandar no grupo". */
const formatosDeHoje = (s: Situacao) => `<div class="formatos${s.semEmoji ? ' tres' : ''}">
    <button type="button" data-dev="Abre a tela Seu card">${icone('imagem')}Card</button>
    <button type="button" data-dev="Manda o card pelos Stories">${icone('celular')}Stories</button>
    ${s.semEmoji ? '' : `<button type="button" data-dev="Manda o placar em emoji">${icone('sorriso')}Emoji</button>`}
    <button type="button" data-dev="Copia o link">${icone('corrente')}Link</button>
  </div>`;

/** "Mostrar o resultado: Card · Stories · Link", a linha pequena das rotas. */
const linhaMostrar = (comLink: boolean) => `<p class="pr-mostrar"><span>Mostrar<span class="pr-longo"> o resultado</span>:</span>
    <button type="button" data-dev="Abre a tela Seu card">Card</button><i aria-hidden="true">·</i>
    <button type="button" data-dev="Manda o card pelos Stories">Stories</button>${
      comLink ? `<i aria-hidden="true">·</i><button type="button" data-dev="Copia o link">Link</button>` : ''
    }</p>`;

const zapDe = (texto: string, link: string) => `https://wa.me/?text=${encodeURIComponent(`${texto} ${link}`)}`;

/** Texto do "Mandar no grupo" de hoje (sem X1). */
function textoDeHoje(s: Situacao): string {
  if (s.jogo === 'lances') return `Fiz ${s.pontos ?? 0} nos Lances do Jogo. Joga também:`;
  if (s.jogo === 'prova') return 'Joga também:';
  return `Fiz ${s.pontos ?? 0} nos Pênaltis. Joga também:`;
}

function htmlDasAcoes(s: Situacao, rota: Rota): string {
  const x = s.x1;
  if (!x) {
    return `<section class="mandar" aria-label="Compartilhar" data-dobra="acoes">
        <a class="botao botao-zap" data-zap target="_blank" rel="noopener" href="${zapDe(textoDeHoje(s), `${SITE}/?time=${s.timeId}`)}">Mandar no grupo</a>
        ${formatosDeHoje(s)}
      </section>`;
  }
  const acao = x.revanche ? 'Revanche' : 'Chamar no X1';
  const href = zapDe(x.texto, x.link);
  if (rota === 'A')
    return `<section class="pr-acoes" aria-label="Chamar no X1" data-dobra="acoes">
        <a class="botao pr-x1" data-zap target="_blank" rel="noopener" href="${href}">${acao}<small>Pelo WhatsApp, com o seu placar</small></a>
        ${linhaMostrar(true)}
      </section>`;
  if (rota === 'B')
    return `<section class="pr-acoes" aria-label="Chamar no X1" data-dobra="acoes">
        <a class="botao botao-zap pr-x1-zap" data-zap target="_blank" rel="noopener" href="${href}">${icone('balao')}${acao}</a>
        <p class="pr-previa" aria-label="Texto que vai junto">${esc(x.texto)}</p>
        ${linhaMostrar(true)}
      </section>`;
  return `<section class="pr-acoes" aria-label="Seu X1" data-dobra="acoes">
      ${placa(
        `<div class="pr-x1-alvo"><strong>${esc(x.aBater)}</strong><span><b>O amigo vai ver</b>${esc(x.oQue)} · ${esc(x.comoE)}</span></div>
        <div class="pr-x1-botoes">
          <button type="button" class="botao botao-sec" data-dev="Copia o link do X1">${icone('corrente')}Copiar link</button>
          <a class="botao botao-zap" data-zap target="_blank" rel="noopener" href="${href}">${x.revanche ? 'Revanche' : 'Chamar no grupo'}</a>
        </div>`,
        { titulo: x.revanche ? 'Sua revanche está pronta' : 'Seu X1 está pronto', filete: true, classe: 'pr-placa-x1' },
      )}
      ${linhaMostrar(false)}
    </section>`;
}

function htmlDaCarreira(): string {
  return placa(
    `<div class="carreira-res"><p class="carreira-nivel">Reserva</p><p class="carreira-ganho">+12 XP</p></div>
      ${barra(0.62, 'Faltam 380 XP pra Titular')}<p class="carreira-falta">Faltam 380 XP pra Titular</p>`,
    { titulo: 'Carreira', classe: 'aperta' },
  );
}

function htmlDoConvite(c: Convite | null): string {
  if (c === 'cidade')
    return `<section class="convite-cidade" aria-label="Sua cidade"><p class="rotulo">📍 Defende sua cidade também?</p>
      <p>Os seus pontos somam também pra sua cidade.</p>
      <div class="dupla"><button class="botao-placa" type="button" data-dev="Abre a escolha da cidade">Escolher a cidade</button>
      <button class="botao botao-sec" type="button" data-dev="Fecha o convite">Agora não</button></div></section>`;
  if (c === 'push')
    return `<section class="convite-cidade" aria-label="Aviso de domingo"><p class="rotulo">🔔 Quer um toque no domingo?</p>
      <p>Um aviso por semana, com a situação da torcida.</p>
      <div class="dupla"><button class="botao-placa" type="button" data-dev="Pede a permissão do aviso">Quero o aviso</button>
      <button class="botao botao-sec" type="button" data-dev="Fecha o convite">Agora não</button></div></section>`;
  if (c === 'apoio') return `<p class="pr-apoio"><button class="link-feedback link-apoio" type="button" data-dev="Abre a página Apoie o jogo">Apoie o jogo</button></p>`;
  return '';
}

function htmlDaTela(s: Situacao, rota: Rota, t: Time, topo: boolean): string {
  const d = escolherDestaque(s);
  // O que não virou destaque vai para os detalhes.
  const frasesDoDetalhe = d === 'frase' ? s.frases.slice(1) : s.frases;
  const temX1 = !!s.x1;
  // Rota A com X1: Início e Mais uma ficam os dois secundários. Sem X1, o rodapé volta ao de hoje.
  const rodapeIgual = rota === 'A' && temX1;
  const chip = topo
    ? `<a class="pr-chip" href="${painelUrl(rota, s.id)}" aria-label="Trocar rota ou situação">${icone('troca')}${rota}·${s.id}</a>`
    : '';
  return `
  <main class="tela resultado ${s.ganhou ? 'venceu' : 'perdeu'} res-padrao proto rota-${rota}"
    style="--c1:${t.cores[0]};--c2:${t.cores[1]};--txt:${corDeTexto(t.cores[0])}">
    <header class="res-topo" data-dobra="topo" data-bloco="Título">
      <div class="res-topo-linha">${chip}<p class="rotulo">${esc(s.rotulo)}</p>${seloPre()}</div>
      <h1 class="res-titulo${s.ganhou ? '' : ' neutro'}">${esc(s.titulo)}</h1>
    </header>

    <div class="pr-placar" data-dobra="placar" data-bloco="Placar">${s.placar}</div>

    ${
      s.pontos !== null
        ? `<div class="pr-pontos" data-dobra="pontos" data-bloco="Pontos">
            <p class="res-total"><strong data-contador>+${s.pontos}</strong><span>${esc(proTime(t) ?? 'pontos')}</span></p>
            ${s.linha ? `<p class="pr-linha">${icone(s.linha.startsWith('Contou') ? 'estrela' : 'grafico')} ${esc(s.linha)}</p>` : ''}
          </div>`
        : ''
    }

    <div data-bloco="Destaque">${htmlDoDestaque(s, d)}</div>

    <div data-bloco="${temX1 ? (rota === 'C' ? 'Placa do X1' : 'Chamar no X1') : 'Mandar no grupo'}">${htmlDasAcoes(s, rota)}</div>

    <div class="pr-detalhes-caixa" data-bloco="Ver detalhes da partida">
      <button type="button" class="pr-ver" aria-expanded="false" aria-controls="pr-detalhes">
        <span>Ver detalhes da partida</span>
      </button>
      <section id="pr-detalhes" class="pr-detalhes" aria-label="Detalhes da partida" hidden>
        ${s.detalhe}
        ${frasesDoDetalhe.map((f, i) => `<p class="adesivo${i ? ' segundo' : ''}">${esc(f)}</p>`).join('')}
        ${s.selos ? `<div class="selos">${s.selos}</div>` : ''}
        ${s.carreira ? htmlDaCarreira() : ''}
        ${s.pecas?.length && d !== 'peca' ? `<p class="nota">Peça nova no vestiário: ${esc(s.pecas.map((p) => p.nome).join(', '))}</p>` : ''}
        ${s.rumo ?? ''}
      </section>
    </div>

    ${s.convite ? `<div class="pr-convite" data-bloco="Convite">${htmlDoConvite(s.convite)}</div>` : ''}

    <div class="res-acoes${rodapeIgual ? ' pr-iguais' : ''}" data-bloco="Rodapé">
      <button class="botao botao-sec" type="button" data-dev="Volta para o início">Início</button>
      <button class="botao${rodapeIgual ? ' botao-sec' : ''}" type="button" data-dev="Começa outra partida">${esc(s.maisUma)}</button>
    </div>
    <p class="pr-toast" role="status" aria-live="polite" hidden></p>
  </main>`;
}

/** Fonte do sistema grande, aproximada como nas simulações (scripts/simulacoes/nucleo/aparelhos.mjs): cada elemento cresce uma vez. */
function crescerFonte(f: number): void {
  if (f === 1) return;
  const crescer = () => {
    for (const el of document.querySelectorAll<HTMLElement>('body *:not([data-sim-fonte])')) {
      if (el.closest('svg') || /^(CANVAS|SCRIPT|STYLE|svg)$/.test(el.tagName)) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) continue;
      let orig = px;
      const pai = el.parentElement;
      if (pai?.dataset.simFonte && Math.abs(px - parseFloat(getComputedStyle(pai).fontSize)) < 0.05) orig = parseFloat(pai.dataset.simFonte);
      el.dataset.simFonte = String(orig);
      el.style.setProperty('font-size', `${(orig * f).toFixed(2)}px`, 'important');
    }
  };
  crescer();
  new MutationObserver(crescer).observe(document.body, { childList: true, subtree: true });
}

export interface Medida {
  /** Onde a dobra corta (altura da tela menos o rodapé fixo). */
  dobra: number;
  /** Título, placar, pontos, destaque e ações cabem sem rolar. */
  cabe: boolean;
  /** O que passa da dobra entre os obrigatórios, com quantos px. */
  passa: { nome: string; px: number }[];
  /** Blocos que ficam abaixo da dobra, inteiros ou em parte. */
  abaixo: string[];
  /** O botão que abre o WhatsApp está inteiro na dobra (1 toque, sem rolar). */
  zapNaDobra: boolean;
}

function medir(main: HTMLElement): Medida {
  const rodape = main.querySelector<HTMLElement>('.res-acoes')!;
  const dobra = innerHeight - rodape.getBoundingClientRect().height;
  const passa: Medida['passa'] = [];
  for (const el of main.querySelectorAll<HTMLElement>('[data-dobra]')) {
    const baixo = el.getBoundingClientRect().bottom + scrollY;
    if (baixo > dobra + 0.5) passa.push({ nome: el.closest<HTMLElement>('[data-bloco]')?.dataset.bloco ?? el.dataset.dobra!, px: Math.ceil(baixo - dobra) });
  }
  const abaixo = [...main.querySelectorAll<HTMLElement>(':scope > [data-bloco]')]
    .filter((el) => el.dataset.bloco !== 'Rodapé' && el.offsetHeight > 0 && el.getBoundingClientRect().bottom + scrollY > dobra + 0.5)
    .map((el) => (el.getBoundingClientRect().top + scrollY >= dobra ? el.dataset.bloco! : `${el.dataset.bloco} (em parte)`));
  const zap = main.querySelector<HTMLElement>('[data-zap]');
  const zapNaDobra = !!zap && zap.getBoundingClientRect().bottom + scrollY <= dobra + 0.5;
  return { dobra: Math.round(dobra), cabe: !passa.length, passa, abaixo, zapNaDobra };
}

function tela(): void {
  const rota = (['A', 'B', 'C'].includes(busca.get('rota') ?? '') ? busca.get('rota') : 'A') as Rota;
  const s = SITUACOES.find((x) => x.id === busca.get('sit')) ?? SITUACOES[0];
  const fonte = busca.get('fonte') === '130' ? 1.3 : 1;
  const abrirZap = busca.get('zap') === 'abrir';
  const topo = window.top === window;
  const t = timePorId(s.timeId)!;
  document.title = `Resultado ${rota} · ${s.id}`;
  document.body.innerHTML = htmlDaTela(s, rota, t, topo);
  const main = document.querySelector<HTMLElement>('main')!;
  medirBarraDeBaixo(main.querySelector<HTMLElement>('.res-acoes'));

  // Botões: na tela de mentira, um aviso curto diz o que fariam no jogo.
  const toast = main.querySelector<HTMLElement>('.pr-toast')!;
  let tempo = 0;
  const avisar = (texto: string, ms = 2200) => {
    toast.textContent = texto;
    toast.hidden = false;
    clearTimeout(tempo);
    tempo = window.setTimeout(() => (toast.hidden = true), ms);
  };
  main.addEventListener('click', (e) => {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-dev], [data-zap]');
    if (!alvo) return;
    if (alvo.hasAttribute('data-zap')) {
      if (abrirZap) return; // segue o link do WhatsApp
      e.preventDefault();
      const texto = decodeURIComponent((alvo as HTMLAnchorElement).href.split('text=')[1] ?? '');
      avisar(`Abriria o WhatsApp com:\n“${texto}”`, 4200);
      return;
    }
    avisar(`No jogo: ${alvo.dataset.dev}`);
  });

  // "Ver detalhes da partida": abre logo embaixo, na mesma tela.
  const ver = main.querySelector<HTMLButtonElement>('.pr-ver')!;
  const detalhes = main.querySelector<HTMLElement>('#pr-detalhes')!;
  ver.addEventListener('click', () => {
    const abrir = ver.getAttribute('aria-expanded') !== 'true';
    ver.setAttribute('aria-expanded', String(abrir));
    ver.querySelector('span')!.textContent = abrir ? 'Esconder detalhes' : 'Ver detalhes da partida';
    detalhes.hidden = !abrir;
    mandar(); // o convite volta para o lugar dele (com os detalhes abertos ele já fica abaixo da dobra)
  });

  // Bonecos: o seu e o de quem chamou no X1; o seu com a peça nova.
  const voce = main.querySelector<HTMLElement>('[data-nome-duelo="voce"]');
  const outro = main.querySelector<HTMLElement>('[data-nome-duelo="outro"]');
  if (voce && outro && s.x1Recebido) {
    const t2 = timePorId(s.x1Recebido.timeDoOutro)!;
    for (const [nome, v, cores] of [
      [voce, BONECO, t.cores],
      [outro, BONECO_DO_OUTRO, t2.cores],
    ] as const) {
      const b = document.createElement('b');
      b.textContent = nome.textContent;
      const alvo = document.createElement('span');
      alvo.className = 'busto-duelo';
      alvo.style.width = alvo.style.height = '40px';
      nome.classList.add('com-busto');
      nome.replaceChildren(alvo, b);
      pintarBoneco(alvo, { recorte: 'busto', largura: 40, altura: 40, vestimenta: v, cores: [cores[0], cores[1]] });
    }
  }
  const caixaPeca = main.querySelector<HTMLElement>('[data-boneco-peca]');
  if (caixaPeca && s.pecas)
    pintarBoneco(caixaPeca, { recorte: 'corpo', largura: BONECO_PECA().w, altura: BONECO_PECA().h, vestimenta: vestirAsNovas(BONECO, s.pecas), cores: [t.cores[0], t.cores[1]], rotulo: 'Seu boneco com a peça nova' });

  if (s.confete) ligarConfete(document.body, t)(s.recorde ? 'recorde' : 'vitoria');

  crescerFonte(fonte);

  // Convite nunca na primeira dobra: se ele cabe nela, desce para logo abaixo (o espaço fica vazio, sem nada piscando).
  const convite = main.querySelector<HTMLElement>('.pr-convite');
  const empurrarConvite = () => {
    if (!convite) return;
    convite.style.marginTop = '';
    const dobra = innerHeight - main.querySelector<HTMLElement>('.res-acoes')!.getBoundingClientRect().height;
    const topoDoConvite = convite.getBoundingClientRect().top + scrollY;
    if (topoDoConvite < dobra) convite.style.marginTop = `${Math.ceil(dobra - topoDoConvite) + 12}px`;
  };

  // Medida da dobra: vai para o painel (iframe) e fica em window.medida (prints por script).
  const mandar = () => {
    empurrarConvite();
    const m = medir(main);
    (window as unknown as { medida: Medida }).medida = m;
    if (!topo) parent.postMessage({ tipo: 'medida', id: busca.get('id'), medida: m }, '*');
  };
  void document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(mandar)));
  addEventListener('resize', mandar);
}

// ---------------------------------------------------------------- o painel

function painelUrl(rota: string, sit: string): string {
  const p = new URLSearchParams(location.search);
  p.delete('quadro');
  p.set('rota', rota);
  p.set('sit', sit);
  return `${location.pathname}?${p}`;
}

const LARGURAS = {
  '390': { w: 390, h: 844, fonte: 100, nome: '390 × 844' },
  '360': { w: 360, h: 740, fonte: 130, nome: '360 × 740 · fonte 130%' },
} as const;

function painel(): void {
  const estado = {
    rota: busca.get('rota') ?? 'todas',
    sit: busca.get('sit') ?? '1',
    largura: busca.get('largura') ?? 'as-duas',
    zap: busca.get('zap') ?? 'simular',
  };
  document.title = 'Resultado: 3 rotas';
  document.body.classList.add('pr-painel-corpo');
  document.body.innerHTML = `<div class="pr-painel">
    <header class="pr-cab">
      <h1>Resultado: 3 rotas <small>protótipo do B02 + C02, dados de mentira</small></h1>
      <div class="pr-seletores">
        <fieldset><legend>Rota</legend>${[
          ['A', `A · ${ROTAS.A}`],
          ['B', `B · ${ROTAS.B}`],
          ['C', `C · ${ROTAS.C}`],
          ['todas', 'As 3 lado a lado'],
        ]
          .map(([v, n]) => `<label><input type="radio" name="rota" value="${v}"> ${esc(n)}</label>`)
          .join('')}</fieldset>
        <fieldset><legend>Situação</legend><select name="sit">${SITUACOES.map((s) => `<option value="${s.id}">${s.id}. ${esc(s.nome)}</option>`).join('')}</select></fieldset>
        <fieldset><legend>Largura</legend>${[
          ['390', LARGURAS['390'].nome],
          ['360', LARGURAS['360'].nome],
          ['as-duas', 'As duas'],
        ]
          .map(([v, n]) => `<label><input type="radio" name="largura" value="${v}"> ${esc(n)}</label>`)
          .join('')}</fieldset>
        <fieldset><legend>WhatsApp</legend>${[
          ['simular', 'Só mostrar o texto'],
          ['abrir', 'Abrir de verdade (link de mentira)'],
        ]
          .map(([v, n]) => `<label><input type="radio" name="zap" value="${v}"> ${esc(n)}</label>`)
          .join('')}</fieldset>
      </div>
      <p class="pr-celular">No celular: escolha a rota e a situação e abra em tela cheia. O <b>⚙</b> no canto de cima volta pra cá.
        <a class="botao" data-abrir href="#">Abrir em tela cheia</a>
        <label class="pr-fonte"><input type="checkbox" name="fonte130"> Simular fonte 130%</label></p>
    </header>
    <div class="pr-quadros" data-quadros></div>
  </div>`;
  const form = document.querySelector<HTMLElement>('.pr-cab')!;
  const marcar = () => {
    form.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach((i) => (i.checked = i.value === estado[i.name as keyof typeof estado]));
    form.querySelector<HTMLSelectElement>('select')!.value = estado.sit;
  };
  marcar();
  const caixa = document.querySelector<HTMLElement>('[data-quadros]')!;
  const quadroUrl = (rota: string, largura: keyof typeof LARGURAS, id: string) =>
    `${location.pathname}?quadro&rota=${rota}&sit=${estado.sit}&fonte=${LARGURAS[largura].fonte}&zap=${estado.zap}&id=${id}`;
  const desenhar = () => {
    const p = new URLSearchParams({ rota: estado.rota, sit: estado.sit, largura: estado.largura, zap: estado.zap });
    history.replaceState(null, '', `${location.pathname}?${p}`);
    const rotas = estado.rota === 'todas' ? (['A', 'B', 'C'] as const) : [estado.rota];
    const larguras = (estado.largura === 'as-duas' ? ['390', '360'] : [estado.largura]) as (keyof typeof LARGURAS)[];
    caixa.innerHTML = larguras
      .map(
        (l) => `<div class="pr-fileira">${rotas
          .map((r) => {
            const id = `${r}-${l}`;
            const L = LARGURAS[l];
            return `<figure class="pr-quadro">
              <figcaption><b>Rota ${r}</b> · ${esc(ROTAS[r as Rota])} · ${esc(L.nome)}</figcaption>
              <iframe title="Rota ${r}, ${esc(L.nome)}" src="${quadroUrl(r, l, id)}" width="${L.w}" height="${L.h}"></iframe>
              <p class="pr-medida" data-medida="${id}">medindo…</p>
            </figure>`;
          })
          .join('')}</div>`,
      )
      .join('');
    const abrir = document.querySelector<HTMLAnchorElement>('[data-abrir]')!;
    const r = estado.rota === 'todas' ? 'A' : estado.rota;
    const fonte130 = document.querySelector<HTMLInputElement>('[name=fonte130]')!.checked;
    abrir.href = `${location.pathname}?quadro&rota=${r}&sit=${estado.sit}&fonte=${fonte130 ? 130 : 100}&zap=${estado.zap}`;
  };
  form.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    if (el.name in estado) estado[el.name as keyof typeof estado] = el.value;
    desenhar();
  });
  addEventListener('message', (e: MessageEvent<{ tipo: string; id: string; medida: Medida }>) => {
    if (e.data?.tipo !== 'medida') return;
    const el = document.querySelector<HTMLElement>(`[data-medida="${e.data.id}"]`);
    if (!el) return;
    const m = e.data.medida;
    el.classList.toggle('ruim', !m.cabe);
    el.innerHTML = `${
      m.cabe ? '✓ Título, placar, pontos, destaque e ações cabem na dobra.' : `✗ Passa da dobra: ${m.passa.map((p) => `${esc(p.nome)} (+${p.px} px)`).join(', ')}.`
    } ${m.zapNaDobra ? 'O botão do WhatsApp está na dobra.' : 'O botão do WhatsApp fica abaixo da dobra.'}<br><small>Abaixo da dobra: ${m.abaixo.length ? m.abaixo.map(esc).join(' · ') : 'nada'}.</small>`;
  });
  desenhar();
}

if (busca.has('quadro')) tela();
else painel();
