// Efeito no ranking da tela de resultado ("Subiu de 5º pra 3º na semana" / "Contou pro ranking da semana"),
// o mesmo fluxo dos pênaltis (telas/resultado.ts): o servidor refaz o ranking a cada minuto, e a tela compara
// a foto de antes da partida com a primeira tabela calculada depois que a partida foi gravada.
// Partida que não mexe em nada não gera aviso: passado o minuto, fica só o "contou pro ranking".

import { esc } from '../app';
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
  /** "pro Flamengo"; null para "Outro time". */
  paraTime: string | null;
  semana: string;
  confirmadaEm?: string;
  antes: PosicaoRanking | null | undefined;
}

export interface Leitores {
  rankingDaSemana: typeof rankingDaSemana;
  rankingCalculadoEm: typeof rankingCalculadoEm;
  ouvirRanking: typeof ouvirRanking;
}

const REAIS: Leitores = { rankingDaSemana, rankingCalculadoEm, ouvirRanking };

/** Escreve o efeito em `el` e devolve a função que para de ouvir o ranking. */
export function ligarEfeitoNoRanking(el: HTMLElement, d: DadosDoEfeito, leitores: Leitores = REAIS): () => void {
  const paraTime = d.paraTime;
  let saiu = false;
  let pronto = false;
  let pararRanking: (() => void) | null = null;
  let espera: ReturnType<typeof setTimeout> | undefined;

  const contou = (aguardando: boolean) =>
    `<p class="situacao">Contou pro ranking da semana${paraTime ? ` ${esc(paraTime)}` : ''}.${
      aguardando ? ' A tabela mexe em até 1 minuto.' : ''
    }</p>`;

  const mostrarEfeito = (linhas: LinhaRanking[]) => {
    const meu = linhas.find((l) => l.time_id === d.timeId);
    if (!meu) return;
    const depois = meu.posicao_campeao;
    const antes = d.antes && Number(d.antes.media30) > 0 ? d.antes.posicao_campeao : undefined;
    const frase =
      antes === undefined
        ? `Entrou em <strong>${depois}º</strong> na semana`
        : antes > depois
          ? `<span class="seta subiu" aria-hidden="true">▲</span> Subiu de ${antes}º pra <strong>${depois}º</strong> na semana`
          : antes < depois
            ? `<span class="seta caiu" aria-hidden="true">▼</span> Caiu de ${antes}º pra <strong>${depois}º</strong> na semana`
            : `Segue em <strong>${depois}º</strong> na semana`;
    el.innerHTML = `<p class="efeito-texto">${frase}</p>
      <div class="efeito-barra"><span></span></div>
      <p class="efeito-falta"></p>`;
    const barra = el.querySelector<HTMLElement>('.efeito-barra span')!;
    const falta = el.querySelector<HTMLElement>('.efeito-falta')!;
    if (meu.posicao_campeao === 1) {
      const segundo = linhas.find((l) => l.posicao_campeao === 2);
      barra.style.setProperty('--enche', '1');
      falta.textContent = segundo
        ? `Na liderança, ${pontosDeMedia(Math.round(meu.media30 - segundo.media30))} na frente ${doTime(segundo.time_id)}.`
        : 'Na liderança!';
      return;
    }
    const acima = linhas.find((l) => l.posicao_campeao === meu.posicao_campeao - 1);
    const tAcima = acima && timePorId(acima.time_id);
    if (!acima || !tAcima) return;
    barra.style.setProperty('--enche', String(acima.media30 > 0 ? Math.min(1, meu.media30 / acima.media30) : 1));
    const n = Math.max(1, Math.ceil(acima.media30 - meu.media30));
    falta.textContent = `Mais ${n} de média e passa ${tAcima.artigo} ${tAcima.nome} (${acima.posicao_campeao}º).`;
  };

  el.innerHTML = contou(true);
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
    el.innerHTML = contou(false);
  }, ESPERA_RANKING_MS);

  return () => {
    saiu = true;
    clearTimeout(espera);
    pararRanking?.();
  };
}
