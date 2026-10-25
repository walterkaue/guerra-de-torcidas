// Revisão das perguntas do pipeline com Gemini, dentro do painel #admin (decidido em 26/10/2026:
// revisão direto no Supabase, sem CSV). Mostra cada pergunta pre_aprovada com o trecho da fonte;
// o administrador corrige se precisar e aprova (vira ativa em public.perguntas) ou reprova com o motivo.
// O texto corrigido passa pelo mesmo validador dos CSVs antes de ir ao banco.

import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_ALTERNATIVA, MAX_PERGUNTA, validarPergunta } from '../../scripts/perguntas/validar.mjs';
import { esc } from '../app';
import { timePorId } from '../dados/times';

interface Rascunho {
  id: number;
  clube: string;
  degrau: string;
  tema: string;
  pergunta: string;
  certa: string;
  errada1: string;
  errada2: string;
  errada3: string;
  fonte: string;
  trecho: string;
  auditoria_trecho: string | null;
  modelo: string;
  auditoria_modelo: string | null;
  na_fila: number;
}

const DEGRAUS = [
  ['facil', 'Fácil'],
  ['media', 'Média'],
  ['dificil', 'Difícil'],
  ['craque', 'Craque'],
] as const;

const ERROS: Record<string, string> = {
  sem_permissao: 'Esta conta não é de administrador.',
  fora_da_fila: 'Essa pergunta já saiu da fila (alguém revisou antes).',
  degrau_invalido: 'Degrau inválido.',
};

const nomeClube = (c: string) => (c === 'geral' ? 'Geral' : (timePorId(c)?.nome ?? c));
const dominio = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
};

/** Erros do validador para os campos do formulário (o id e a data são do servidor). */
export function errosDoFormulario(r: Pick<Rascunho, 'clube' | 'fonte'>, campos: Record<string, string>): string[] {
  const letra = { facil: 'f', media: 'm', dificil: 'd', craque: 'c' }[campos.degrau] ?? 'f';
  return validarPergunta({
    id: `${r.clube}-${letra}-01`,
    clube: r.clube,
    degrau: campos.degrau,
    tema: campos.tema,
    pergunta: campos.pergunta,
    certa: campos.certa,
    errada1: campos.errada1,
    errada2: campos.errada2,
    errada3: campos.errada3,
    fonte: r.fonte,
    fonte2: '',
    verificada_em: '2026-01-01',
    status: 'revisada',
  });
}

/** Desenha a fila em `el` e cuida de aprovar e reprovar. `aoPublicar` atualiza o resto do painel. */
export function montarRevisao(el: HTMLElement, sb: SupabaseClient, aoPublicar: () => void): () => void {
  let saiu = false;
  let fila: Rascunho[] = [];

  async function carregar(): Promise<void> {
    el.innerHTML = '<p class="nota">Carregando a fila…</p>';
    const { data, error } = await sb.rpc('revisao_perguntas_fila', { p_limite: 30 });
    if (saiu) return;
    if (error) {
      el.innerHTML = `<p class="admin-alerta">Não deu pra ler a fila: ${esc(ERROS[error.message] ?? error.message)}</p>`;
      return;
    }
    fila = (data ?? []) as Rascunho[];
    desenhar();
  }

  function desenhar(): void {
    if (!fila.length) {
      el.innerHTML = '<p class="nota">Fila vazia. O gerador roda às 6h e o auditor às 7h.</p>';
      return;
    }
    el.innerHTML =
      `<p class="nota">${fila[0].na_fila} na fila · cada uma passou nas travas do código e num auditor que não sabia a resposta. Confira o fato no trecho.</p>` +
      fila.map(cartao).join('');
  }

  function cartao(r: Rascunho): string {
    const campo = (nome: string, rotulo: string, valor: string, max: number) =>
      `<label class="campo"><span>${rotulo}</span><input name="${nome}" maxlength="${max}" value="${esc(valor)}" /></label>`;
    return `<article class="admin-revisao" data-rascunho="${r.id}">
      <p class="rotulo">${esc(nomeClube(r.clube))} · ${esc(r.tema)}</p>
      <label class="campo"><span>Pergunta</span><textarea name="pergunta" rows="3" maxlength="${MAX_PERGUNTA}">${esc(r.pergunta)}</textarea></label>
      ${campo('certa', '✅ Certa', r.certa, MAX_ALTERNATIVA)}
      ${campo('errada1', 'Errada 1', r.errada1, MAX_ALTERNATIVA)}
      ${campo('errada2', 'Errada 2', r.errada2, MAX_ALTERNATIVA)}
      ${campo('errada3', 'Errada 3', r.errada3, MAX_ALTERNATIVA)}
      <div class="dupla">
        <label class="campo"><span>Degrau</span><select name="degrau">${DEGRAUS.map(([v, t]) => `<option value="${v}"${v === r.degrau ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        ${campo('tema', 'Tema', r.tema, 30)}
      </div>
      <blockquote class="admin-trecho">“${esc(r.trecho)}”
        <a href="${esc(r.fonte)}" target="_blank" rel="noopener noreferrer">${esc(dominio(r.fonte))}</a></blockquote>
      ${r.auditoria_trecho && r.auditoria_trecho !== r.trecho ? `<p class="nota"><small>Auditor (${esc(r.auditoria_modelo ?? '')}): “${esc(r.auditoria_trecho)}”</small></p>` : ''}
      <p class="erro-campo" role="alert" hidden></p>
      <div class="dupla">
        <button class="botao" type="button" data-acao="aprovar">Aprovar</button>
        <button class="botao botao-sec" type="button" data-acao="reprovar">Reprovar</button>
      </div>
    </article>`;
  }

  async function acao(ev: Event): Promise<void> {
    const botao = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-acao]');
    const card = botao?.closest<HTMLElement>('[data-rascunho]');
    if (!botao || !card) return;
    const r = fila.find((x) => x.id === Number(card.dataset.rascunho));
    if (!r) return;
    const erro = card.querySelector<HTMLElement>('.erro-campo')!;
    const mostrar = (msg: string) => {
      erro.textContent = msg;
      erro.hidden = !msg;
    };
    const valor = (n: string) => (card.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${n}"]`)?.value ?? '').trim();
    const campos = Object.fromEntries(['pergunta', 'certa', 'errada1', 'errada2', 'errada3', 'degrau', 'tema'].map((n) => [n, valor(n)]));

    let resposta;
    if (botao.dataset.acao === 'aprovar') {
      const erros = errosDoFormulario(r, campos);
      if (erros.length) return mostrar(erros.join(' · '));
      botao.disabled = true;
      resposta = await sb.rpc('revisao_perguntas_aprovar', {
        p_id: r.id, p_pergunta: campos.pergunta, p_certa: campos.certa, p_errada1: campos.errada1,
        p_errada2: campos.errada2, p_errada3: campos.errada3, p_degrau: campos.degrau, p_tema: campos.tema,
      });
    } else {
      const motivo = window.prompt('Por que reprovar? (ex.: fato ambíguo, trecho não prova, pergunta fraca)', '');
      if (motivo === null) return;
      botao.disabled = true;
      resposta = await sb.rpc('revisao_perguntas_reprovar', { p_id: r.id, p_motivo: motivo });
    }
    if (saiu) return;
    if (resposta.error) {
      botao.disabled = false;
      return mostrar(ERROS[resposta.error.message] ?? resposta.error.message);
    }
    fila = fila.filter((x) => x.id !== r.id).map((x) => ({ ...x, na_fila: x.na_fila - 1 }));
    desenhar();
    if (botao.dataset.acao === 'aprovar') aoPublicar();
  }

  el.addEventListener('click', (ev) => void acao(ev));
  void carregar();
  return () => {
    saiu = true;
  };
}
