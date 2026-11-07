// Amostra dos cards "Telão do estádio" (só dev: /dev/cards.html): cada jogo, com vitória e derrota, para um time
// de cor 1 clara, um escuro e um de cor parecida com o gramado, de dia e de noite. `?times=sao-paulo` e
// `?luz=dia` filtram (`&so=temporada` com `?personalizados` desenha só os cards desse jogo). `?personalizados` desenha os cards personalizáveis (Telão e Placar seco × Stories e Quadrado ×
// tudo ligado e tudo desligado), com nomes como `lances-telao-stories-ligado`. `window.cards` guarda os canvas, para salvar por script.

import '../style.css';
import { timePorId, proTime, type Time } from '../dados/times';
import { desenharCard, prontoParaDesenhar, seloNivel } from '../jogo/card';
import { desenharCardCrava } from '../jogo/cardCrava';
import { desenharCardDia } from '../jogo/cardDia';
import { desenharCardProva } from '../jogo/cardProva';
import { desenharCardPersonalizado } from '../jogo/cardPersonalizadoDesenho';
import { PADRAO } from '../jogo/vestiario';
import { dadosDeAmostraDoTrofeu } from './trofeuFalso';
import { amostraDoMes } from './temporadaCardFalso';
import { quadradinhosDoCard, planoDoCard, type BonecoDoCard, type Chave, type DadosDoCard, type EstiloCard, type FormatoCard } from '../jogo/cardPersonalizado';
import type { Luz } from '../jogo/home';
import type { ItemDaMedalha } from '../jogo/medalhaTextos';
import type { Pistas, Tom } from '../jogo/timeDoDia';

const busca = new URLSearchParams(location.search);
const TIMES_DA_AMOSTRA = (busca.get('times') ?? 'sao-paulo,corinthians,palmeiras').split(',');
const LUZES = (busca.get('luz') ?? 'dia,noite').split(',') as Luz[];
const APELIDO = busca.get('apelido') ?? undefined;
/** ?so=temporada desenha só os cards personalizáveis cujo nome começa assim. */
const SO = busca.get('so');

const linha = (...tons: Tom[]): Pistas => ({
  estado: { tom: tons[0] },
  fundacao: { tom: tons[1] },
  titulos: { tom: tons[2] },
  divisao: { tom: tons[3] },
  cores: { tom: tons[4] },
  capital: { tom: tons[5] },
});
const L: Tom = 'longe';
const P: Tom = 'perto';
const C: Tom = 'certo';

const PALPITES = [
  { mandante: 'Flamengo', visitante: 'Palmeiras', placar: { m: 2, v: 1 }, certeza: true },
  { mandante: 'São Paulo', visitante: 'Corinthians', placar: { m: 1, v: 1 }, certeza: false },
  { mandante: 'Athletico-PR', visitante: 'Chapecoense', placar: { m: 3, v: 0 }, certeza: false },
  { mandante: 'Atlético-MG', visitante: 'Cruzeiro', placar: { m: 0, v: 2 }, certeza: false },
  { mandante: 'Grêmio', visitante: 'Internacional', placar: { m: 1, v: 0 }, certeza: false },
  { mandante: 'Vasco', visitante: 'Botafogo', placar: { m: 2, v: 2 }, certeza: false },
  { mandante: 'Bahia', visitante: 'Vitória', placar: { m: 1, v: 2 }, certeza: false },
  { mandante: 'Santos', visitante: 'Mirassol', placar: { m: 2, v: 0 }, certeza: false },
  { mandante: 'Fluminense', visitante: 'Remo', placar: { m: 3, v: 1 }, certeza: false },
  { mandante: 'Coritiba', visitante: 'Bragantino', placar: { m: 0, v: 0 }, certeza: false },
];

type Amostra = { nome: string; desenhar: (t: Time, luz: Luz) => HTMLCanvasElement };

const link = (t: Time) => `torcida.kauewalter.com.br/?d=ab12cd34&time=${t.id}`;
const base = (t: Time, luz: Luz, frase: string, novoRecorde = false) => ({
  time: t,
  apelido: APELIDO,
  paraTime: proTime(t),
  frase,
  novoRecorde,
  link: link(t),
  luz,
});

const AMOSTRAS: Amostra[] = [
  { nome: 'penaltis-vitoria', desenhar: (t, l) => desenharCard({ ...base(t, l, 'Fechou a conta! Pode mandar no grupo.', true), golsJogador: 4, golsMaquina: 3, pontos: 85 }) },
  { nome: 'penaltis-derrota', desenhar: (t, l) => desenharCard({ ...base(t, l, 'A máquina levou essa, mas revanche tá logo ali.'), golsJogador: 2, golsMaquina: 4, pontos: 30 }) },
  { nome: 'faltas-vitoria', desenhar: (t, l) => desenharCard({ ...base(t, l, 'Na gaveta! A barreira só olhou passar.'), jogo: 'Faltas', golsJogador: 2, golsMaquina: 1, pontos: 62 }) },
  { nome: 'faltas-derrota', desenhar: (t, l) => desenharCard({ ...base(t, l, 'Parou na barreira. Os pontos contam igual.'), jogo: 'Faltas', golsJogador: 0, golsMaquina: 3, pontos: 0 }) },
  { nome: 'cara-a-cara-vitoria', desenhar: (t, l) => desenharCard({ ...base(t, l, 'Ficou de frente e não perdoou!'), jogo: 'Cara a cara', golsJogador: 3, golsMaquina: 0, pontos: 96 }) },
  { nome: 'cara-a-cara-derrota', desenhar: (t, l) => desenharCard({ ...base(t, l, 'Goleiro fechou o gol. Bora de novo.'), jogo: 'Cara a cara', golsJogador: 1, golsMaquina: 2, pontos: 18 }) },
  { nome: 'prova-vitoria', desenhar: (t, l) => desenharCardProva({ ...base(t, l, 'Sabe tudo da bola! Essa foi aula.', true), resumo: 'fiz 8 de 8', pontos: 150, escada: '✅✅✅💡✅✅✅✅' }) },
  { nome: 'prova-parou', desenhar: (t, l) => desenharCardProva({ ...base(t, l, 'Parou na hora certa. Esperteza pura.'), resumo: 'cheguei na 6ª e parei', pontos: 58, escada: '✅✅✅💡✅✋' }) },
  { nome: 'prova-derrota', desenhar: (t, l) => desenharCardProva({ ...base(t, l, 'Escorregou no degrau. Mais uma?'), resumo: 'errei na 4ª', pontos: 14, escada: '✅✅✅❌' }) },
  { nome: 'dia-vitoria', desenhar: (t, l) => desenharCardDia({ ...base(t, l, 'Achou! Faro de quem acompanha tudo.'), numero: 34, placar: '4/6', pontos: 55, pistas: [linha(L, L, P, L, L, C), linha(P, P, L, C, P, C), linha(C, P, P, C, P, C), linha(C, C, C, C, C, C)] }) },
  { nome: 'dia-derrota', desenhar: (t, l) => desenharCardDia({ ...base(t, l, 'Hoje ficou escondido. Amanhã tem outro.'), numero: 34, placar: 'X/6', pontos: 0, pistas: [linha(L, L, L, L, L, L), linha(P, L, L, C, L, C), linha(P, P, L, C, P, C), linha(C, P, P, C, P, C), linha(C, P, C, C, P, C), linha(C, C, C, C, P, C)] }) },
  { nome: 'crava-meus', desenhar: (t, l) => desenharCardCrava({ tipo: 'meus', ...base(t, l, ''), rodada: 34, linhas: PALPITES }) },
  { nome: 'crava-meus-curto', desenhar: (t, l) => desenharCardCrava({ tipo: 'meus', ...base(t, l, ''), rodada: 34, linhas: PALPITES.slice(0, 4) }) },
  {
    nome: 'crava-vitoria',
    desenhar: (t, l) =>
      desenharCardCrava({
        tipo: 'resultado',
        ...base(t, l, 'Cravou! Tem gente abrindo a calculadora.', true),
        rodada: 34,
        pontos: 124,
        resultados: [
          { acerto: 'exato', certeza: true },
          { acerto: 'saldo', certeza: false },
          { acerto: 'vencedor', certeza: false },
          { acerto: 'exato', certeza: false },
          { acerto: 'errou', certeza: false },
          { acerto: 'vencedor', certeza: false },
          { acerto: 'saldo', certeza: false },
          { acerto: 'errou', certeza: false },
          { acerto: 'vencedor', certeza: false },
          { acerto: 'exato', certeza: false },
        ],
      }),
  },
  {
    nome: 'crava-derrota',
    desenhar: (t, l) =>
      desenharCardCrava({
        tipo: 'resultado',
        ...base(t, l, 'Rodada ingrata. Na próxima tem mais.'),
        rodada: 34,
        pontos: 10,
        resultados: [
          { acerto: 'errou', certeza: true },
          { acerto: 'errou', certeza: false },
          { acerto: 'vencedor', certeza: false },
          { acerto: 'errou', certeza: false },
        ],
      }),
  },
];

declare global {
  interface Window {
    cards: { nome: string; canvas: HTMLCanvasElement }[];
    cardsProntos: boolean;
  }
}

// ---------- cards personalizáveis (?personalizados) ----------

const ITEM: ItemDaMedalha = { itemId: 'lance-1', tipo: 'lance', titulo: 'O primeiro gol de Tóquio', clube: 'Flamengo', adversario: 'Liverpool', ano: '1981', caminho: '#lance/lance-1' };
const GRADE_DO_DIA = '⬛🟨⬛⬛🟨🟩\n🟨🟨⬛🟩🟨🟩\n🟩🟨🟨🟩🟨🟩\n🟩🟩🟩🟩🟩🟩';
const LINKS = (t: Time) => `torcida.kauewalter.com.br/?d=ab12cd34&time=${t.id}`;

function dadosPersonalizados(t: Time, luz: Luz): Record<string, DadosDoCard> {
  const comum = (jogo: string, destaque: string, quem: string, lance: string, placarEmoji: string, frase: string, extra: Pick<DadosDoCard, "conteudo"> & Partial<DadosDoCard>): DadosDoCard => ({
    tipo: 'jogo-x1' as const,
    time: t,
    jogo,
    destaque,
    quem: { comApelido: `Zé da Geral ${proTime(t)}`, semApelido: quem },
    lance,
    placarEmoji,
    frase,
    novoRecorde: true,
    link: LINKS(t),
    nivel: 'Craque',
    luz,
    ...extra,
  });
  const lances = [
    { titulo: 'Gol de placa no último minuto', desfecho: 'gol' as const, recriou: true, pontos: 40 },
    { titulo: 'Defesa no susto', desfecho: 'defesa' as const, recriou: false, pontos: 25 },
    { titulo: 'Bola na barreira', desfecho: 'barreira' as const, recriou: false, pontos: 0 },
  ];
  const resultados = ['exato', 'saldo', 'vencedor', 'exato', 'errou', 'vencedor', 'saldo', 'errou', 'vencedor', 'exato'] as const;
  return {
    lances: comum('Lances do Jogo', '+65', 'Fiz 65 pontos pro time', 'Gol de placa no último minuto', '⚽🧤🧱', 'Aula de bola parada! Dá pra mandar no grupo.', {
      conteudo: { jogo: 'lances', lances, tituloUnico: null, medalha: 'Bronze no lance Gol do título!' },
    }),
    penaltis: comum('Pênaltis', '+85', 'Fiz 85 pontos pro time', 'Venci a máquina por 4 a 3', '⚽⚽⚽⚽🧤', 'Fechou a conta! Pode mandar no grupo.', {
      conteudo: { jogo: 'penaltis', golsJogador: 4, golsMaquina: 3 },
    }),
    prova: comum('Prova de Boleiro', '+150', 'Fiz 150 pontos pro time', 'Prova de Boleiro: cheguei na 6ª e parei, 58 pro time', '✅✅✅💡✅✋', 'Parou na hora certa. Esperteza pura.', {
      conteudo: { jogo: 'prova', resumo: 'cheguei na 6ª e parei', escada: '✅✅✅💡✅✋' },
    }),
    dia: comum('Time do Dia #34', '+55', 'Fiz 55 pontos pro time', 'Time do Dia #34: achei em 4/6', GRADE_DO_DIA, 'Achou! Faro de quem acompanha tudo.', {
      tipo: 'jogo',
      conteudo: { jogo: 'dia', numero: 34, placar: '4/6', pistas: [linha(L, L, P, L, L, C), linha(P, P, L, C, P, C), linha(C, P, P, C, P, C), linha(C, C, C, C, C, C)] },
    }),
    'crava-meus': comum('Crava a Rodada · 34ª rodada', '10 CRAVADOS', 'Meus palpites pro time', '34ª rodada: meus palpites', '', '', {
      tipo: 'jogo',
      novoRecorde: false,
      avisoFixo: 'Palpite de resenha: não vale nada além da zoeira.',
      conteudo: { jogo: 'crava-meus', rodada: 34, linhas: PALPITES },
    }),
    'crava-resultado': comum('Crava a Rodada · 34ª rodada', '+124', 'Fiz 124 pontos pro time', '34ª rodada: 3 exatos, 2 no saldo', '🎯🎯🎯✅✅❌❌', 'Cravou! Tem gente abrindo a calculadora.', {
      tipo: 'jogo',
      avisoFixo: 'Palpite de resenha: não vale nada além da zoeira.',
      conteudo: { jogo: 'crava-resultado', rodada: 34, resultados: resultados.map((acerto, i) => ({ acerto, certeza: i === 0 })) },
    }),
    'trofeu-semana': dadosDeAmostraDoTrofeu('semana', t, { somou: true, apelido: 'Zé da Geral', luz }),
    'trofeu-mes': dadosDeAmostraDoTrofeu('mes', t, { somou: false, apelido: 'Zé da Geral', luz }),
    'trofeu-vitrine': dadosDeAmostraDoTrofeu('vitrine', t, { somou: true, apelido: 'Zé da Geral', luz }),
    // O fim de temporada: subiu (com e sem soma), caiu, campeão, "vai pra Série A" e a pré-temporada.
    'temporada-subiu': amostraDoMes('subiu', t, { somou: true, apelido: 'Zé da Geral', luz }).dados,
    'temporada-subiu-sem-soma': amostraDoMes('subiu', t, { somou: false, apelido: 'Zé da Geral', luz }).dados,
    'temporada-caiu': amostraDoMes('caiu', t, { somou: false, apelido: 'Zé da Geral', luz }).dados,
    'temporada-campeao': amostraDoMes('campeao', t, { somou: true, apelido: 'Zé da Geral', luz }).dados,
    'temporada-unica-a': amostraDoMes('unica_a', t, { somou: true, apelido: 'Zé da Geral', luz }).dados,
    'temporada-pre': amostraDoMes('subiu', t, { pre: true, somou: true, apelido: 'Zé da Geral', luz }).dados,
    medalha: comum('Lances do Jogo', 'OURO', 'Medalha pro time', 'Já sou ouro no primeiro gol de Tóquio — Flamengo x Liverpool (1981)', '🥇', 'Medalha no peito e zoeira no grupo.', {
      tipo: 'jogo-x1',
      novoRecorde: false,
      conteudo: { jogo: 'medalha', medalha: 'ouro', item: ITEM },
    }),
  };
}

/** Boneco falso fixo da amostra: número 07, fundo túnel e a pose de braços pra cima liberada. */
const BONECO_FALSO: BonecoDoCard = { vestimenta: { ...PADRAO, camisa: 'uni1', numero: '07', fundo: 'tunel', cabelo: 'raspado' }, liberadas: ['pose_bracos'] };

function nomeDoCard(id: string, jogo: string, estilo: string, formato: string, modo: string): string {
  return `${TIMES_DA_AMOSTRA.length > 1 ? `${id}-` : ''}${jogo}-${estilo}-${formato}-${modo}`;
}

function mostrar(nome: string, canvas: HTMLCanvasElement, formato: FormatoCard): void {
  window.cards.push({ nome, canvas });
  canvas.style.cssText = `width:270px;height:${formato === 'stories' ? 480 : 270}px`;
  canvas.title = nome;
  document.body.append(canvas);
}

async function personalizados(): Promise<void> {
  const estilos: EstiloCard[] = ['telao', 'placar'];
  const formatos: FormatoCard[] = ['stories', 'quadrado'];
  const luz = LUZES[0];
  for (const id of TIMES_DA_AMOSTRA) {
    const time = timePorId(id)!;
    const todos = dadosPersonalizados(time, luz);
    for (const [jogo, d] of Object.entries(todos)) {
      if (SO && !jogo.startsWith(SO)) continue;
      for (const estilo of estilos) {
        for (const formato of formatos) {
          for (const modo of ['ligado', 'desligado'] as const) {
            const ligados = new Set<Chave>(modo === 'ligado' ? quadradinhosDoCard(d).map((q) => q.chave) : []);
            const plano = planoDoCard(d, { estilo, formato, ligados });
            const canvas = await desenharCardPersonalizado(d, plano);
            mostrar(nomeDoCard(id, jogo, estilo === 'telao' ? 'telao' : 'placar', formato, modo), canvas, formato);
          }
          // O mesmo estilo com o busto do boneco ("Meu boneco" ligado).
          const ligados = new Set<Chave>(quadradinhosDoCard(d).map((q) => q.chave));
          const comBusto = planoDoCard(d, { estilo, formato, ligados, boneco: BONECO_FALSO, comBoneco: true });
          mostrar(nomeDoCard(id, jogo, estilo === 'telao' ? 'telao' : 'placar', formato, 'busto'), await desenharCardPersonalizado(d, comBusto), formato);
        }
      }
      // O Pôster: tudo ligado (com apelido) e só o essencial.
      for (const formato of formatos) {
        for (const modo of ['ligado', 'desligado'] as const) {
          const ligados = new Set<Chave>(modo === 'ligado' ? quadradinhosDoCard(d).map((q) => q.chave) : []);
          const plano = planoDoCard(d, { estilo: 'poster', formato, ligados, boneco: BONECO_FALSO, apelido: 'Zé da Geral' });
          mostrar(nomeDoCard(id, jogo, 'poster', formato, modo), await desenharCardPersonalizado(d, plano), formato);
        }
      }
    }
  }
}

document.body.style.cssText = 'margin:0;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,270px);gap:12px';
window.cards = [];
await prontoParaDesenhar();
if (busca.has('personalizados')) await personalizados();
else for (const id of TIMES_DA_AMOSTRA) {
  const time = timePorId(id)!;
  for (const luz of LUZES) {
    for (const a of AMOSTRAS) {
      const canvas = a.desenhar(time, luz);
      if (a.nome === 'penaltis-vitoria') seloNivel(canvas, 'Titular');
      const nome = `${id}-${luz}-${a.nome}`;
      window.cards.push({ nome, canvas });
      canvas.style.cssText = 'width:270px;height:480px';
      canvas.title = nome;
      document.body.append(canvas);
    }
  }
}
window.cardsProntos = true;
