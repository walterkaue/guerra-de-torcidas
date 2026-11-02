// Fila de partidas sob suspeita no painel #admin (decidido em 26/10/2026, opção A). A detecção marca a
// partida e ela fica fora do ranking; aqui o administrador libera (volta a contar) ou mantém fora.
// Sem apelido: o torcedor aparece só pelo começo do id, para ver se é sempre a mesma pessoa.

import type { SupabaseClient } from '@supabase/supabase-js';
import { esc } from '../app';
import { timePorId } from '../dados/times';

export interface Suspeita {
  minigame: string;
  id: string;
  torcedor: string;
  time_id: string | null;
  dia: string;
  pontos: number;
  motivo: string;
  partidas_do_torcedor: number;
  suspeitas_do_torcedor: number;
  na_fila: number;
}

const MINIGAME: Record<string, string> = { penaltis: 'Pênaltis', prova: 'Prova de Boleiro', dia: 'Time do Dia' };

const ERROS: Record<string, string> = {
  sem_permissao: 'Esta conta não é de administrador.',
  fora_da_fila: 'Essa partida já saiu da fila (alguém revisou antes).',
};

/** Data no formato do painel (o dia vem do banco como AAAA-MM-DD). */
const dataCurta = (dia: string) => dia.split('-').reverse().slice(0, 2).join('/');

export function cartaoSuspeita(s: Suspeita): string {
  const time = s.time_id ? (timePorId(s.time_id)?.nome ?? s.time_id) : '—';
  return `<article class="admin-revisao" data-suspeita="${esc(s.id)}" data-minigame="${esc(s.minigame)}">
    <p class="rotulo">${esc(MINIGAME[s.minigame] ?? s.minigame)} · ${dataCurta(s.dia)} · ${esc(time)} · ${s.pontos} pontos</p>
    <p>${esc(s.motivo)}</p>
    <p class="nota"><small>Torcedor ${esc(s.torcedor)}: ${s.suspeitas_do_torcedor} sob suspeita em ${s.partidas_do_torcedor} partidas.</small></p>
    <p class="erro-campo" role="alert" hidden></p>
    <div class="dupla">
      <button class="botao" type="button" data-acao="liberar">Liberar</button>
      <button class="botao botao-sec" type="button" data-acao="manter">Manter fora</button>
    </div>
  </article>`;
}

/** Desenha a fila em `el` e cuida de liberar e manter fora. */
export function montarSuspeitas(el: HTMLElement, sb: SupabaseClient): () => void {
  let saiu = false;
  let fila: Suspeita[] = [];

  async function carregar(): Promise<void> {
    el.innerHTML = '<p class="nota">Carregando…</p>';
    const { data, error } = await sb.rpc('suspeitas_fila', { p_limite: 30 });
    if (saiu) return;
    if (error) {
      el.innerHTML = `<p class="admin-alerta">Não deu pra ler a fila: ${esc(ERROS[error.message] ?? error.message)}</p>`;
      return;
    }
    fila = (data ?? []) as Suspeita[];
    desenhar();
  }

  function desenhar(): void {
    el.innerHTML = fila.length
      ? `<p class="nota">${fila[0].na_fila} na fila. Liberar devolve os pontos; semana já confirmada (segunda 12h) não reabre.</p>` +
        fila.map(cartaoSuspeita).join('')
      : '<p class="nota">Nenhuma partida sob suspeita.</p>';
  }

  async function acao(ev: Event): Promise<void> {
    const botao = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-acao]');
    const card = botao?.closest<HTMLElement>('[data-suspeita]');
    if (!botao || !card) return;
    const liberar = botao.dataset.acao === 'liberar';
    card.querySelectorAll('button').forEach((b) => (b.disabled = true));
    const { error } = await sb.rpc('suspeitas_decidir', {
      p_minigame: card.dataset.minigame,
      p_id: card.dataset.suspeita,
      p_liberar: liberar,
    });
    if (saiu) return;
    if (error) {
      card.querySelectorAll('button').forEach((b) => (b.disabled = false));
      const erro = card.querySelector<HTMLElement>('.erro-campo')!;
      erro.textContent = ERROS[error.message] ?? error.message;
      erro.hidden = false;
      return;
    }
    fila = fila.filter((s) => s.id !== card.dataset.suspeita).map((s) => ({ ...s, na_fila: s.na_fila - 1 }));
    desenhar();
  }

  el.addEventListener('click', (ev) => void acao(ev));
  void carregar();
  return () => {
    saiu = true;
  };
}
