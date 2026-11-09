// Mantém o time, o apelido e a faixa etária do aparelho iguais aos do servidor.
// Com o código do torcedor (docs/jogo.md, seção 14.1), a mesma conta pode estar em vários aparelhos: o que
// mudou aqui sobe; o que outro aparelho mudou desce, uma vez por carregamento.

import { esquecerTorcedor, faixaDoAparelho, guardarFaixa, prefs } from '../estado';
import { FAIXAS, podeTerApelido, type FaixaEtaria } from '../jogo/faixaEtaria';
import { entrarNaConta, ErroServidor, meuTorcedor, pedirEntrada, salvarFaixaEtaria, salvarTorcedor, type TorcedorNoServidor } from './api';

export const marcaDe = (time: string, apelido: string | null | undefined) => `${time}|${apelido ?? ''}`;
/** A faixa do servidor é mais nova (mais protetora) que a do aparelho. */
const maisProtetora = (servidor: FaixaEtaria, aparelho: FaixaEtaria | undefined) =>
  !aparelho || FAIXAS.indexOf(servidor) < FAIXAS.indexOf(aparelho);

/** Grava no aparelho o torcedor da conta, já marcado como igual ao do servidor. */
export function adotarTorcedor(t: TorcedorNoServidor): void {
  prefs.set({ time: t.time_id, apelido: t.apelido ?? undefined, apelidoConferido: undefined, sincronizado: marcaDe(t.time_id, t.apelido) });
  if (t.faixa_etaria) {
    guardarFaixa(t.faixa_etaria);
    prefs.set({ faixaSincronizada: t.faixa_etaria });
  } else {
    prefs.set({ faixaSincronizada: undefined });
  }
}

let puxado: Promise<boolean> | null = null;
/** O que outro aparelho mudou e a tela ainda não redesenhou (sincronizarTorcedor devolve uma vez só). */
let mudancaPorAvisar = false;

/**
 * Uma vez por carregamento, adota o que outro aparelho da conta gravou (troca de time, apelido apagado no
 * #admin, faixa da junção). O que mudou aqui e ainda não subiu ganha: sobe em seguida. True se mudou algo.
 * `forcar`: busca de novo (a tela do código, quando o outro aparelho entrou e pode ter escolhido o time dele).
 */
export function puxarTorcedor(forcar = false): Promise<boolean> {
  if (forcar) puxado = null;
  puxado ??= (async () => {
    const t = await meuTorcedor();
    if (!t) return false;
    const p = prefs.get();
    let mudou = false;
    const local = p.time ? marcaDe(p.time, p.apelido) : '';
    if (p.sincronizado === local && marcaDe(t.time_id, t.apelido) !== local) {
      prefs.set({ time: t.time_id, apelido: t.apelido ?? undefined, apelidoConferido: undefined, sincronizado: marcaDe(t.time_id, t.apelido) });
      mudou = true;
    }
    // A faixa do servidor ganha se este aparelho não mudou nada por subir, e sempre que for a mais protetora (a da
    // junção, seção 14.1): uma resposta antiga deste aparelho não desfaz a proteção.
    const faixa = faixaDoAparelho();
    if (t.faixa_etaria && t.faixa_etaria !== faixa && (p.faixaSincronizada === faixa || maisProtetora(t.faixa_etaria, faixa))) {
      guardarFaixa(t.faixa_etaria);
      prefs.set({ faixaSincronizada: t.faixa_etaria });
      mudou = true;
    } else if (!t.faixa_etaria && p.faixaSincronizada) {
      prefs.set({ faixaSincronizada: undefined }); // o servidor perdeu a faixa: sobe de novo
    }
    if (mudou) mudancaPorAvisar = true;
    return mudou;
  })().catch((e) => {
    puxado = null;
    throw e;
  });
  return puxado;
}

/**
 * Grava no servidor se mudou desde a última vez (ou se `forcar`, ex.: sessão nova). Antes, puxa o que outro
 * aparelho mudou. True uma vez só, na primeira chamada depois de o time, o apelido ou a faixa deste aparelho
 * mudarem por isso (a tela redesenha).
 */
export async function sincronizarTorcedor(forcar = false): Promise<boolean> {
  if (!prefs.get().time) throw new ErroServidor('sem_time');
  if (!forcar) await puxarTorcedor();
  const mudou = mudancaPorAvisar;
  mudancaPorAvisar = false;
  // Menos de 16 não tem apelido (jogo.md, seção 4): o que sobrou no aparelho sai antes de calcular a marca.
  if (faixaDoAparelho() === 'menos_16' && prefs.get().apelido) prefs.set({ apelido: undefined, apelidoConferido: undefined });
  let p = prefs.get();
  if (!p.time) throw new ErroServidor('sem_time');
  const marca = marcaDe(p.time, p.apelido);
  let recusado = false;
  // A faixa deste aparelho já estava no servidor quando o apelido foi recusado: outro aparelho a mudou (a próxima
  // carga adota a de lá). Tentar de novo agora só repetiria a recusa.
  let faixaJaEstava = false;
  if (forcar || p.sincronizado !== marca) {
    // Torcedor que já existe: a faixa 16+ chega antes do apelido (o servidor descarta o apelido de quem não tem faixa 16+).
    if (p.sincronizado) await sincronizarFaixa();
    p = prefs.get();
    faixaJaEstava = !!p.faixaSincronizada && p.faixaSincronizada === faixaDoAparelho();
    ({ apelidoRecusado: recusado } = await salvarTorcedor(p.time!, p.apelido));
    if (recusado) {
      // Código 'apelido_idade': o servidor só guardou o time. O apelido fica pendente (sobe quando a faixa 16+ chegar) e o card sai sem ele.
      prefs.set({ sincronizado: marcaDe(p.time!, undefined), apelidoConferido: false, faixaSincronizada: forcar ? undefined : p.faixaSincronizada });
    } else {
      // O servidor aceitou (o filtro de apelidos roda lá): agora o card pode mostrar o apelido.
      prefs.set({ sincronizado: marca, apelidoConferido: undefined, faixaSincronizada: forcar ? undefined : p.faixaSincronizada });
    }
  } else if (p.apelidoConferido === false && p.sincronizado === marca) {
    prefs.set({ apelidoConferido: undefined });
  }
  await sincronizarFaixa();
  // Jogador novo que já tinha respondido a triagem: a faixa só subiu agora, então tenta o apelido mais uma vez.
  const q = prefs.get();
  if (recusado && !faixaJaEstava && q.time && q.apelido && podeTerApelido(faixaDoAparelho()) && q.faixaSincronizada === faixaDoAparelho()) {
    const r = await salvarTorcedor(q.time, q.apelido);
    if (!r.apelidoRecusado) prefs.set({ sincronizado: marcaDe(q.time, q.apelido), apelidoConferido: undefined });
  }
  return mudou;
}

/**
 * Sobe a resposta da triagem. Só existe torcedor depois de escolher o time; antes disso, ou sem
 * internet, fica guardada no aparelho e sobe na próxima sincronização. Nunca segura o jogo.
 */
export async function sincronizarFaixa(): Promise<void> {
  const faixa = faixaDoAparelho();
  const p = prefs.get();
  if (!faixa || !p.time || p.faixaSincronizada === faixa) return;
  try {
    if (await salvarFaixaEtaria(faixa)) prefs.set({ faixaSincronizada: faixa });
  } catch {
    // tenta de novo na próxima
  }
}

export type ResultadoEntrada = { etapa: 'escolher_time'; timeDono: string; timeSeu: string } | { etapa: 'pronto' };

/**
 * Entra com o código do outro aparelho (jogo.md, seção 14.1). Se os dois têm times diferentes, a primeira
 * chamada volta pedindo a escolha; a segunda leva `time`. No fim, este aparelho é o mesmo torcedor do outro.
 */
export async function entrarComCodigo(codigo: string, time?: string): Promise<ResultadoEntrada> {
  const r = await pedirEntrada(codigo, time);
  if (r.etapa === 'escolher_time') return r;
  await entrarNaConta(r.tokenHash);
  esquecerTorcedor();
  prefs.set({ saiuDaConta: undefined });
  if (r.torcedor) adotarTorcedor(r.torcedor);
  puxado = Promise.resolve(false); // acabou de vir do servidor
  return { etapa: 'pronto' };
}
