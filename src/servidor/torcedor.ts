// Mantém o time e o apelido do aparelho iguais aos do servidor.

import { prefs } from '../estado';
import { ErroServidor, salvarTorcedor } from './api';

/** Grava no servidor se mudou desde a última vez (ou se `forcar`, ex.: sessão nova). */
export async function sincronizarTorcedor(forcar = false): Promise<void> {
  const p = prefs.get();
  if (!p.time) throw new ErroServidor('sem_time');
  const marca = `${p.time}|${p.apelido ?? ''}`;
  if (!forcar && p.sincronizado === marca) return;
  await salvarTorcedor(p.time, p.apelido);
  prefs.set({ sincronizado: marca });
}
