// Contagem do funil do X1 e de onde a pessoa desiste (src/jogo/funil.ts tem a lista fechada). Fica no JS inicial,
// por isso é mínimo: só a fila na memória e a etapa atual. Quem manda é o funilEnvio.ts, baixado por import() no
// 1º evento (já está pronto quando a página some). Sem rede, o lote volta para a fila na memória (com teto); nada fica guardado no aparelho.
// Um ouvinte só: o `visibilitychange` para "hidden" vem também quando a página fecha (antes do pagehide).

import type { EtapaFunil, EventoFunil } from '../jogo/funil';

let fila: EventoFunil[] = [];
let relogio: ReturnType<typeof setTimeout> | undefined;
let envio: Promise<typeof import('./funilEnvio')> | undefined;
/** Teto da fila na memória (5 lotes do servidor): sem rede por muito tempo, os mais antigos caem. */
const MAX_FILA = 100;
let atual: EtapaFunil | null = null;
/** A etapa em que a pessoa estava quando o jogo foi pro fundo (o `desistiu` já saiu; volta = `voltou`). */
let fundo: EtapaFunil | null = null;

/** Manda o que estiver na fila. `saindo`: a página está indo embora (sendBeacon). */
export function enviar(saindo?: boolean): void {
  clearTimeout(relogio);
  relogio = undefined;
  const lote = fila;
  fila = [];
  if (lote.length)
    void (envio ?? baixar()).then(
      (m) => m.mandar(lote, saindo),
      () => {
        // Sem rede o módulo não veio: o lote volta à frente da fila e o próximo envio tenta de novo.
        fila = [...lote, ...fila].slice(-MAX_FILA);
      },
    );
}

/** Baixa o módulo de envio. Se falhar, esquece a promessa rejeitada para o próximo envio tentar outra vez. */
function baixar(): NonNullable<typeof envio> {
  const p = (envio = import('./funilEnvio'));
  p.catch(() => {
    if (envio == p) envio = undefined;
  });
  return p;
}

/** Conta um evento. Sai junto com os outros dos próximos segundos. */
export function contar(e: EventoFunil): void {
  envio ?? baixar();
  fila.push(e);
  if (fila.length > MAX_FILA) fila.shift();
  relogio ??= setTimeout(enviar, 3000);
}

/** Entrou numa etapa em que dá para desistir; `null` quando a pessoa concluiu (ou seguiu adiante). */
export function etapa(e: EtapaFunil | null): void {
  atual = e;
  fundo = null;
}

/**
 * Saiu da etapa sem concluir (troca de tela, voltar). Chamado pelo irPara antes de limpar a tela. Se o `desistiu`
 * dela já saiu quando o jogo foi pro fundo (e a volta não foi avisada), não conta de novo.
 */
export function sairDaEtapa(): void {
  if (atual && atual != fundo) contar({ ...atual, ev: 'desistiu' } as EventoFunil);
  etapa(null);
}

if (typeof document != 'undefined')
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (atual && !fundo) contar({ ...(fundo = atual), ev: 'desistiu' } as EventoFunil);
      enviar(true);
    } else if (fundo) {
      // Mesma etapa de antes de sumir: a desistência não valeu. Continua valendo se ela sair dela depois.
      if (fundo == atual) contar({ ...fundo, ev: 'voltou' } as EventoFunil);
      fundo = null;
    }
  });
