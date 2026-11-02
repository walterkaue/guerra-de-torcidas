// Mantém o time, o apelido e a faixa etária do aparelho iguais aos do servidor.

import { faixaDoAparelho, prefs } from '../estado';
import { ErroServidor, salvarFaixaEtaria, salvarTorcedor } from './api';

/** Grava no servidor se mudou desde a última vez (ou se `forcar`, ex.: sessão nova). */
export async function sincronizarTorcedor(forcar = false): Promise<void> {
  const p = prefs.get();
  if (!p.time) throw new ErroServidor('sem_time');
  const marca = `${p.time}|${p.apelido ?? ''}`;
  if (forcar || p.sincronizado !== marca) {
    await salvarTorcedor(p.time, p.apelido);
    prefs.set({ sincronizado: marca, faixaSincronizada: forcar ? undefined : p.faixaSincronizada });
  }
  await sincronizarFaixa();
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
