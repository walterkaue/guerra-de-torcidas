// Amostra dos cards "Telão do estádio" (só dev: /dev/cards.html): cada jogo, com vitória e derrota, para um time
// de cor 1 clara, um escuro e um de cor parecida com o gramado, de dia e de noite. `?times=sao-paulo` e
// `?luz=dia` filtram. `window.cards` guarda os canvas, para salvar por script.

import '../style.css';
import { timePorId, proTime, type Time } from '../dados/times';
import { desenharCard, prontoParaDesenhar, seloNivel } from '../jogo/card';
import { desenharCardCrava } from '../jogo/cardCrava';
import { desenharCardDia } from '../jogo/cardDia';
import { desenharCardProva } from '../jogo/cardProva';
import type { Luz } from '../jogo/home';
import type { Pistas, Tom } from '../jogo/timeDoDia';

const busca = new URLSearchParams(location.search);
const TIMES_DA_AMOSTRA = (busca.get('times') ?? 'sao-paulo,corinthians,palmeiras').split(',');
const LUZES = (busca.get('luz') ?? 'dia,noite').split(',') as Luz[];
const APELIDO = busca.get('apelido') ?? undefined;

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

document.body.style.cssText = 'margin:0;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,270px);gap:12px';
window.cards = [];
await prontoParaDesenhar();
for (const id of TIMES_DA_AMOSTRA) {
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
