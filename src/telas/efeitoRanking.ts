// Efeito no ranking da tela de resultado dos Lances, como selo + nota ("Subiu de 5º pra 3º" / "Contou pro ranking"),
// o mesmo fluxo dos pênaltis (telas/resultado.ts): o servidor refaz o ranking a cada minuto, e a tela compara
// a foto de antes da partida com a primeira tabela calculada depois que a partida foi gravada.
// Partida que não mexe em nada não gera aviso: passado o minuto, o selo vira só "Contou pro ranking".

import { timePorId } from '../dados/times';
import { ESPERA_RANKING_MS, tabelaIncluiPartida } from '../jogo/rankingMinuto';
import { ouvirRanking, rankingCalculadoEm, rankingDaSemana, type LinhaRanking, type PosicaoRanking } from '../servidor/api';

/** "do Flamengo" / "da Chapecoense" */
const doTime = (id: string) => {
  const t = timePorId(id);
  return t ? `${t.artigo === 'a' ? 'da' : 'do'} ${t.nome}` : '';
};

/** "226 pontos de média" / "1 ponto de média" */
const pontosDeMedia = (n: number) => `${n} ${n === 1 ? 'ponto' : 'pontos'} de média`;

export interface DadosDoEfeito {
  timeId: string;
  semana: string;
  confirmadaEm?: string;
  antes: PosicaoRanking | null | undefined;
}

/** Elementos do resultado padrão que recebem o efeito: o selo `data-selo-ranking` e a nota `data-nota`. */
export interface AlvoDoEfeito {
  selo: HTMLElement | null;
  nota: HTMLElement;
}

export interface Leitores {
  rankingDaSemana: typeof rankingDaSemana;
  rankingCalculadoEm: typeof rankingCalculadoEm;
  ouvirRanking: typeof ouvirRanking;
}

const REAIS: Leitores = { rankingDaSemana, rankingCalculadoEm, ouvirRanking };

/** Escreve o efeito no selo e na nota e devolve a função que para de ouvir o ranking. */
export function ligarEfeitoNoRanking(alvo: AlvoDoEfeito, d: DadosDoEfeito, leitores: Leitores = REAIS): () => void {
  let saiu = false;
  let pronto = false;
  let pararRanking: (() => void) | null = null;
  let espera: ReturnType<typeof setTimeout> | undefined;

  const trocarSelo = (texto: string, tom?: 'subiu' | 'caiu') => {
    if (!alvo.selo) return;
    alvo.selo.className = `selo${tom ? ` ${tom}` : ''}`;
    alvo.selo.innerHTML = texto;
  };
  const nota = (texto: string) => {
    alvo.nota.textContent = texto;
    alvo.nota.hidden = false;
  };

  const mostrarEfeito = (linhas: LinhaRanking[]) => {
    const meu = linhas.find((l) => l.time_id === d.timeId);
    if (!meu) return;
    const depois = meu.posicao_campeao;
    const antes = d.antes && Number(d.antes.media30) > 0 ? d.antes.posicao_campeao : undefined;
    if (antes === undefined) trocarSelo(`Entrou em ${depois}º na semana`);
    else if (antes > depois) trocarSelo(`<span aria-hidden="true">▲</span> Subiu de ${antes}º pra ${depois}º`, 'subiu');
    else if (antes < depois) trocarSelo(`<span aria-hidden="true">▼</span> Caiu de ${antes}º pra ${depois}º`, 'caiu');
    else trocarSelo(`Segue em ${depois}º na semana`);
    if (meu.posicao_campeao === 1) {
      const segundo = linhas.find((l) => l.posicao_campeao === 2);
      nota(
        segundo
          ? `Na liderança, ${pontosDeMedia(Math.round(meu.media30 - segundo.media30))} na frente ${doTime(segundo.time_id)}.`
          : 'Na liderança!',
      );
      return;
    }
    const acima = linhas.find((l) => l.posicao_campeao === meu.posicao_campeao - 1);
    const tAcima = acima && timePorId(acima.time_id);
    if (!acima || !tAcima) return;
    const n = Math.max(1, Math.ceil(acima.media30 - meu.media30));
    nota(`Mais ${n} de média e passa ${tAcima.artigo} ${tAcima.nome} (${acima.posicao_campeao}º).`);
  };

  const encerrar = () => {
    pronto = true;
    clearTimeout(espera);
    pararRanking?.();
  };
  // aviso: sem a hora da partida (servidor antigo), o aviso que chega depois de abrir a tela basta.
  const conferir = (aviso: boolean) =>
    Promise.all([leitores.rankingCalculadoEm(d.semana), leitores.rankingDaSemana(d.semana)])
      .then(([calculadoEm, linhas]) => {
        if (saiu || pronto) return;
        if (!tabelaIncluiPartida(calculadoEm, d.confirmadaEm) && !(aviso && !d.confirmadaEm)) return;
        encerrar();
        mostrarEfeito(linhas);
      })
      .catch(() => {});
  void conferir(false);
  leitores
    .ouvirRanking(d.semana, () => void conferir(true), () => void conferir(false))
    .then((f) => (saiu || pronto ? f() : (pararRanking = f)))
    .catch(() => {
      // sem Realtime: a espera abaixo encerra
    });
  espera = setTimeout(() => {
    if (saiu || pronto) return;
    encerrar();
    trocarSelo('Tá no placar');
  }, ESPERA_RANKING_MS);

  return () => {
    saiu = true;
    clearTimeout(espera);
    pararRanking?.();
  };
}
