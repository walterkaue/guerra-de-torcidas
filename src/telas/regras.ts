// Folha de regras do botão "?" de cada jogo (docs/jogo.md, seção 14.4): regras completas e tabela de pontos,
// no visual do Grafismo de TV (blocos.ts). Os números vêm dos módulos puros de cada jogo, para não
// destoar da regra de verdade. Texto curto, tom do jogo; na Prova e no Crava, sem "valendo" nem "prêmio".

import '../estilos/regras.css';
import { esc } from '../app';
import { ID_OUTRO, corDeTexto, proTime, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { GOLS_MAX, PESO_TORCIDA, PONTOS_ACERTO, TETO_RODADA } from '../jogo/crava';
import { LANCES_POR_PARTIDA, TABELA_LANCES_UNIFICADA } from '../jogo/lances';
import { PONTOS_UNIFICADOS, RODADAS_EXTRAS_MAX } from '../jogo/penaltis';
import {
  BONUS_PERFEITA,
  DEGRAU_DA_POSICAO,
  ERROS_QUE_ENCERRAM,
  FRACAO_AO_ERRAR,
  NOME_DEGRAU,
  PERGUNTAS,
  PONTOS_DO_DEGRAU,
  PRIMEIRA_DECISAO,
  SEGUNDOS,
  type Degrau,
} from '../jogo/prova';
import { PONTOS as PONTOS_DIA, TENTATIVAS } from '../jogo/timeDoDia';
import { notaDosLances, notaDosPenaltis, pontosDosLances, pontosDosPenaltis } from '../jogo/regrasUnificadas';
import { faixa, placa } from './blocos';
import { folhaNoHistorico } from './folhaNoHistorico';
import { bolinha } from './icones';

export type JogoComRegras = 'penaltis' | 'lances' | 'prova' | 'dia' | 'crava';

interface Regras {
  titulo: string;
  /** Cada passo: negrito e texto (fixos no código; o texto pode levar HTML, como as bolinhas). */
  passos: readonly (readonly [string, string])[];
  /** Tabela de pontos: rótulo e valor (o valor aparece em Anton). */
  pontos: readonly (readonly [string, string])[];
  /** Linha final, abaixo da tabela. */
  nota?: string;
}

const ordinal = (n: number) => `${n}º`;
const bonus = (n: number) => `+${n}`;
const NOME_DO_DEGRAU: Record<Degrau, string> = { ...NOME_DEGRAU, 2: 'Nível médio' };

function dosPenaltis(): Regras {
  return {
    titulo: 'Pênaltis',
    passos: [
      ['Cobrar.', 'Arraste o dedo da bola até o gol. A direção é o canto, o comprimento é a força e a curva no fim do arraste é o efeito. Forte demais vai por cima; fraco demais, o goleiro pega.'],
      ['Cavadinha.', 'Arraste curtinho e reto. Entra, a não ser que o goleiro fique parado no meio.'],
      ['Defender.', 'O batedor corre. Olhe o pé de apoio, em amarelo, e toque no gol onde ele vai pular. Ele nem sempre é honesto, e o tempo pra reagir é curto.'],
      ['Desempate.', `5 cobranças e 5 defesas, alternadas. Empatou? Morte súbita: uma de cada, até ${RODADAS_EXTRAS_MAX} rodadas. Ainda empatado, par ou ímpar com o narrador.`],
    ],
    pontos: pontosDosPenaltis(PONTOS_UNIFICADOS),
    nota: notaDosPenaltis(PONTOS_UNIFICADOS),
  };
}

/** Lances do Jogo (docs/jogo.md, 14.7): um lance, 3 tentativas, pênaltis no mesmo jogo. */
function dosLances(): Regras {
  const t = TABELA_LANCES_UNIFICADA;
  return {
    titulo: 'Lances do Jogo',
    passos: [
      ['Escolha um lance.', `Um toque em Jogar. Na falta e no cara a cara, a partida são ${LANCES_POR_PARTIDA} tentativas do mesmo lance; nos pênaltis, a disputa de sempre.`],
      ['O gesto é o do pênalti.', 'Arraste da bola até o gol: direção, força e curva. Na falta, a bola tem de passar da barreira. No cara a cara, o goleiro pode sair do gol e a cavadinha encobre quem saiu.'],
      ['Recriar o lance.', `Gol na área marcada onde o gol de verdade entrou vale mais ${t.recriou}.`],
      ['X1.', 'Depois de uma partida valendo, mande o link do X1: quem recebe joga o mesmo lance e tenta bater seus pontos. Passou do limite do dia, a partida vira treino, sem ponto nem medalha.'],
    ],
    pontos: pontosDosLances(t),
    nota: notaDosLances(t),
  };
}

function daProva(): Regras {
  const porDegrau = ([1, 2, 3, 4] as const).map((d) => {
    const n = DEGRAU_DA_POSICAO.filter((x) => x === d).length;
    return [`${NOME_DO_DEGRAU[d]} (${n} perguntas)`, `${PONTOS_DO_DEGRAU[d]} cada`] as const;
  });
  return {
    titulo: 'Prova de Boleiro',
    passos: [
      [`${PERGUNTAS} perguntas, ${SEGUNDOS} s cada.`, 'Quatro alternativas. Toque na certa antes de o tempo acabar.'],
      ['Parar ou seguir.', `A partir da ${PRIMEIRA_DECISAO + 1}ª pergunta, antes de ver a próxima, você escolhe: parar e levar o que juntou, ou seguir e arriscar.`],
      [`${ERROS_QUE_ENCERRAM} erros e fora.`, `Errar ou estourar o tempo conta um erro e a prova segue. No ${ERROS_QUE_ENCERRAM}º, acaba e você leva ${Math.round(FRACAO_AO_ERRAR * 100)}% do que juntou.`],
      ['3 ajudas, uma de cada.', 'Tira duas some com duas erradas. Arquibancada mostra como a torcida respondeu (com pouca gente, vira Tira uma). Troca muda a pergunta. O relógio não para.'],
    ],
    pontos: [...porDegrau, [`${PERGUNTAS} de ${PERGUNTAS}, sem nenhum erro`, bonus(BONUS_PERFEITA)]],
  };
}

function doDia(): Regras {
  return {
    titulo: 'Time do Dia',
    passos: [
      ['Um clube secreto por dia.', 'O mesmo pra todo mundo, das Séries A, B e C de 2026. Troca à meia-noite.'],
      [`${TENTATIVAS} chutes.`, 'Escolha um clube na busca. Cada chute traz uma linha de pistas.'],
      ['As pistas.', `${bolinha('certo')} igual, ${bolinha('perto')} perto, ${bolinha('longe')} longe. Estado (perto é a mesma região), fundação (até 10 anos), títulos do Brasileirão (até 2), série, as duas cores (perto é uma igual) e capital ou interior.`],
      ['↑ e ↓.', 'No ano e nos títulos: o secreto tem número maior (↑) ou menor (↓) que o do seu chute.'],
    ],
    pontos: PONTOS_DIA.map((p, i) => [`Acertou no ${ordinal(i + 1)} chute`, String(p)] as const),
    nota: 'Errou os 6? Zero hoje, e amanhã tem outro.',
  };
}

function doCrava(): Regras {
  return {
    titulo: 'Crava a Rodada',
    passos: [
      ['Crave o placar.', `Use − e + nos dois times (de 0 a ${GOLS_MAX}) e toque em Cravar. Dá pra mudar até a bola rolar, e pode pular os jogos que quiser.`],
      ['Jogo da certeza.', 'A estrela marca 1 jogo por rodada que conta em dobro. Escolha até o 1º jogo da rodada começar; depois trava.'],
      ['Na dúvida, olhe os números.', 'Embaixo de cada time: posição, pontos e os últimos 5 jogos (V vitória, E empate, D derrota). A aba Tabela mostra o campeonato.'],
      ['Bola rolando.', 'O palpite tranca e aparece como a torcida cravou (com 20 palpites ou mais). Os pontos saem quando o placar é confirmado.'],
    ],
    pontos: [
      ['🎯 Placar exato', String(PONTOS_ACERTO.exato)],
      ['✅ Vencedor e saldo certos', String(PONTOS_ACERTO.saldo)],
      ['👍 Só o vencedor ou só o empate', String(PONTOS_ACERTO.vencedor)],
      ['❌ Errou', String(PONTOS_ACERTO.errou)],
      ['⭐ Jogo da certeza', '×2'],
    ],
    nota: `Pra torcida, os pontos entram ×${PESO_TORCIDA}, até ${TETO_RODADA} por rodada. Empate com outro placar vale como saldo.`,
  };
}

const POR_JOGO: Record<JogoComRegras, () => Regras> = {
  penaltis: dosPenaltis,
  lances: dosLances,
  prova: daProva,
  dia: doDia,
  crava: doCrava,
};

/** Texto da folha, em HTML (separado do DOM para dar para conferir). */
export function htmlDasRegras(jogo: JogoComRegras, paraTime?: string | null): string {
  const r = POR_JOGO[jogo]();
  const passos = r.passos.map(([forte, texto]) => `<li><strong>${esc(forte)}</strong> ${texto}</li>`).join('');
  const pontos = r.pontos.map(([rotulo, valor]) => `<li><span>${esc(rotulo)}</span><strong>${esc(valor)}</strong></li>`).join('');
  const nota = [r.nota, paraTime && jogo !== 'crava' ? `Os pontos vão ${paraTime}.` : ''].filter(Boolean).join(' ');
  // Nota longa (limite do dia, dificuldade): uma frase por item, em lista, em vez de um parágrafo técnico (J39).
  const frases = nota.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú0-9])/);
  const htmlDaNota = !nota
    ? ''
    : frases.length > 2
      ? `${faixa('Bom saber', 'h3')}<ul class="regras-notas">${frases.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`
      : `<p class="regras-nota">${esc(nota)}</p>`;
  return `<div class="regras-cab">
      <h2 id="regras-titulo" class="titulo-tela">${esc(r.titulo)}</h2>
      <button class="voltar" type="button" data-regras-fechar aria-label="Fechar as regras">×</button>
    </div>
    <div class="regras-corpo" tabindex="0">
      ${faixa('Como joga', 'h3')}
      <ul class="regras-passos">${passos}</ul>
      ${faixa('Pontos', 'h3')}
      <ul class="regras-pontos">${pontos}</ul>
      ${htmlDaNota}
    </div>
    <button class="botao" type="button" data-regras-fechar>Entendi</button>`;
}

/** Abre a folha de regras de um jogo dentro de `onde` (a tela). Fecha com o botão, o fundo ou Esc. */
export function abrirRegras(onde: HTMLElement, jogo: JogoComRegras): () => void {
  onde.querySelector('.regras-fundo')?.remove();
  const time = timePorId(prefs.get().time);
  const paraTime = time && time.id !== ID_OUTRO ? proTime(time) : null;
  const cores = time?.cores ?? (['#f5f5f0', '#f5f5f0'] as const);
  const antes = document.activeElement as HTMLElement | null;

  const fundo = document.createElement('div');
  fundo.className = 'regras-fundo';
  fundo.style.cssText = `--c1:${cores[0]};--c2:${cores[1]};--txt:${time ? corDeTexto(time.cores[0]) : '#111'}`;
  fundo.innerHTML = placa(htmlDasRegras(jogo, paraTime), {
    filete: true,
    classe: 'regras-folha',
    attrs: 'role="dialog" aria-modal="true" aria-labelledby="regras-titulo"',
  });
  onde.append(fundo);

  // O voltar do celular fecha as regras antes de sair da tela (S08, telas/folhaNoHistorico.ts).
  const folha = folhaNoHistorico(() => {
    document.removeEventListener('keydown', aoTeclar);
    fundo.remove();
    antes?.focus?.();
  });
  const fechar = () => folha.fechar();
  const aoTeclar = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') fechar();
  };
  fundo.querySelectorAll('[data-regras-fechar]').forEach((b) => b.addEventListener('click', fechar));
  fundo.addEventListener('click', (ev) => {
    if (ev.target === fundo) fechar();
  });
  document.addEventListener('keydown', aoTeclar);
  fundo.querySelector<HTMLButtonElement>('.botao')?.focus({ preventScroll: true });
  return fechar;
}
