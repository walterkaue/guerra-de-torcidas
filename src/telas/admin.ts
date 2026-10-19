// Painel do administrador (#admin): login com e-mail e senha, só para quem está na tabela
// administradores. Confirma, corrige ou anula o placar dos jogos do Crava; a distribuição dos
// pontos é feita no servidor (função confirmar-placar), sem duplicar.
// Usa uma sessão separada (storageKey próprio): a sessão de jogador do aparelho continua a mesma.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { esc } from '../app';
import { timePorId } from '../dados/times';
import { ordinalRodada } from '../jogo/crava';
import { horaDoJogo, rodadaEmFoco } from '../jogo/cravaTela';
import type { Jogo } from '../servidor/crava';

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const nome = (id: string) => timePorId(id)?.nome ?? id;

interface Sincronizacao {
  quando: string;
  origem: string;
  ok: boolean;
  jogos: number;
  sem_par: string[];
  mensagem: string | null;
}

export function telaAdmin(root: HTMLElement): () => void {
  let saiu = false;
  if (!URL_SUPABASE || !CHAVE_PUBLICA) {
    root.innerHTML = '<main class="tela admin"><p class="vazio">Supabase não configurado.</p></main>';
    return () => {};
  }
  const sb: SupabaseClient = createClient(URL_SUPABASE, CHAVE_PUBLICA, {
    auth: { storageKey: 'gdt-admin', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  let jogos: Jogo[] = [];
  let rodada: number | null = null;

  const casca = (miolo: string) => {
    root.innerHTML = `<main class="tela admin">
      <header class="cabecalho"><h2 class="titulo-placar">Painel do Crava</h2></header>
      ${miolo}
      <p class="nota"><a href="./" style="color: var(--amarelo)">Voltar pro jogo</a></p>
    </main>`;
  };

  function telaLogin(erro = ''): void {
    casca(`<form class="admin-login">
      <label class="campo"><span>E-mail</span><input type="email" name="email" autocomplete="username" required /></label>
      <label class="campo"><span>Senha</span><input type="password" name="senha" autocomplete="current-password" required /></label>
      <p class="erro-campo" role="alert" ${erro ? '' : 'hidden'}>${esc(erro)}</p>
      <button class="botao" type="submit">Entrar</button>
    </form>`);
    const form = root.querySelector<HTMLFormElement>('form')!;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const dados = new FormData(form);
      const botao = form.querySelector<HTMLButtonElement>('button')!;
      botao.disabled = true;
      const { error } = await sb.auth.signInWithPassword({
        email: String(dados.get('email') ?? ''),
        password: String(dados.get('senha') ?? ''),
      });
      if (saiu) return;
      if (error) telaLogin('E-mail ou senha não conferem.');
      else void abrir();
    });
  }

  async function abrir(): Promise<void> {
    const { data } = await sb.auth.getSession();
    if (saiu) return;
    if (!data.session) return telaLogin();
    const { data: admin, error } = await sb.rpc('sou_admin');
    if (saiu) return;
    if (error || !admin) {
      casca(`<p class="admin-alerta">Esta conta (${esc(data.session.user.email ?? '')}) não está na tabela de administradores.</p>
        <button class="botao botao-sec" type="button" data-acao="sair">Sair</button>`);
      root.querySelector('[data-acao="sair"]')!.addEventListener('click', sair);
      return;
    }
    casca(`<div class="dupla">
        <button class="botao botao-sec" type="button" data-acao="sincronizar">Sincronizar agora</button>
        <button class="botao botao-sec" type="button" data-acao="sair">Sair</button>
      </div>
      <div data-sinc><p class="nota">Carregando…</p></div>
      <p class="nota" data-ensaio></p>
      <nav class="seletor-rodada" aria-label="Rodada">
        <button type="button" class="voltar" data-acao="ant" aria-label="Rodada anterior">‹</button>
        <strong class="rotulo" data-rodada></strong>
        <button type="button" class="voltar" data-acao="prox" aria-label="Próxima rodada">›</button>
      </nav>
      <section class="lista-jogos" data-jogos></section>
      <p class="nota">Confirmar distribui os pontos da rodada inteira. Confirmar de novo ou corrigir não duplica:
      o servidor grava só a diferença. Placar confirmado depois de segunda 12h entra na semana atual.</p>`);
    root.querySelector('[data-acao="sair"]')!.addEventListener('click', sair);
    root.querySelector('[data-acao="sincronizar"]')!.addEventListener('click', sincronizar);
    root.querySelector('[data-acao="ant"]')!.addEventListener('click', () => mudarRodada(-1));
    root.querySelector('[data-acao="prox"]')!.addEventListener('click', () => mudarRodada(1));
    root.querySelector('[data-jogos]')!.addEventListener('click', acaoNoJogo);
    await carregar();
  }

  async function carregar(): Promise<void> {
    const [j, s, c] = await Promise.all([
      sb
        .from('jogos')
        .select('id, rodada, mandante_id, visitante_id, inicio, status_api, gols_api_mandante, gols_api_visitante, gols_mandante, gols_visitante, confirmado_em, corrigido_em, anulado')
        .order('inicio'),
      sb.from('sincronizacoes').select('quando, origem, ok, jogos, sem_par, mensagem').order('quando', { ascending: false }).limit(1),
      sb.from('config_crava').select('valor').eq('chave', 'valendo_desde_rodada').maybeSingle(),
    ]);
    if (saiu) return;
    jogos = (j.data ?? []) as Jogo[];
    if (rodada === null || !jogos.some((x) => x.rodada === rodada)) rodada = rodadaEmFoco(jogos, new Date());

    const ultima = ((s.data ?? []) as Sincronizacao[])[0];
    const elSinc = root.querySelector<HTMLElement>('[data-sinc]')!;
    elSinc.innerHTML = !ultima
      ? '<p class="admin-alerta">Ainda não houve sincronização. Toque em "Sincronizar agora".</p>'
      : `<p class="nota">Última sincronização: ${new Date(ultima.quando).toLocaleString('pt-BR')} (${esc(ultima.origem)}) ·
          ${ultima.ok ? `${ultima.jogos} jogos` : `falhou${ultima.mensagem ? `: ${esc(ultima.mensagem)}` : ''}`}</p>
        ${ultima.sem_par.length ? `<p class="admin-alerta"><strong>Time sem par na API:</strong> ${ultima.sem_par.map(esc).join(', ')}. Os jogos desses times não entraram. Peça o ajuste em src/jogo/footballData.ts.</p>` : ''}`;
    const valendo = c.data ? Number(c.data.valor) : 99;
    root.querySelector('[data-ensaio]')!.textContent =
      valendo >= 99
        ? 'Modo ensaio ligado: nenhuma rodada soma no ranking da semana (config_crava.valendo_desde_rodada = 99).'
        : `Somam no ranking da semana as rodadas a partir da ${ordinalRodada(valendo)}.`;
    desenhar();
  }

  function mudarRodada(passo: number): void {
    const nums = [...new Set(jogos.map((j) => j.rodada))].sort((a, b) => a - b);
    const i = nums.indexOf(rodada ?? nums[0]) + passo;
    if (i < 0 || i >= nums.length) return;
    rodada = nums[i];
    desenhar();
  }

  function desenhar(): void {
    const elRodada = root.querySelector<HTMLElement>('[data-rodada]');
    const elJogos = root.querySelector<HTMLElement>('[data-jogos]');
    if (!elRodada || !elJogos) return;
    elRodada.textContent = rodada === null ? 'Sem jogos' : `${ordinalRodada(rodada)} rodada`;
    const agora = Date.now();
    elJogos.innerHTML = jogos
      .filter((j) => j.rodada === rodada)
      .map((j) => {
        const comecou = Date.parse(j.inicio) <= agora;
        const m = j.gols_mandante ?? j.gols_api_mandante ?? '';
        const v = j.gols_visitante ?? j.gols_api_visitante ?? '';
        const api = j.gols_api_mandante === null ? 'sem placar' : `${j.gols_api_mandante} x ${j.gols_api_visitante}`;
        const situacao = j.anulado
          ? 'ANULADO'
          : j.confirmado_em
            ? `Confirmado ${j.gols_mandante} x ${j.gols_visitante}${j.corrigido_em ? ' (corrigido)' : ''}`
            : 'Não confirmado';
        return `<article class="admin-jogo${j.confirmado_em && !j.anulado ? ' ok' : ''}" data-jogo="${j.id}">
          <p class="rotulo">${esc(horaDoJogo(j.inicio))} · API: ${esc(j.status_api)} · ${esc(api)}</p>
          <div class="admin-placar">
            <span class="nome">${esc(nome(j.mandante_id))}</span>
            <input type="number" inputmode="numeric" min="0" max="30" value="${m}" data-gols="m" aria-label="Gols ${esc(nome(j.mandante_id))}" />
            <span>x</span>
            <input type="number" inputmode="numeric" min="0" max="30" value="${v}" data-gols="v" aria-label="Gols ${esc(nome(j.visitante_id))}" />
            <span class="nome" style="text-align:right">${esc(nome(j.visitante_id))}</span>
          </div>
          <p class="nota">${situacao}</p>
          <div class="admin-acoes">
            <button class="botao" type="button" data-acao="confirmar" ${comecou && !j.confirmado_em ? '' : 'disabled'}>Confirmar</button>
            <button class="botao botao-sec" type="button" data-acao="corrigir" ${j.confirmado_em ? '' : 'disabled'}>Corrigir o placar</button>
            <button class="botao botao-sec" type="button" data-acao="anular" ${j.anulado ? 'disabled' : ''}>Anular</button>
          </div>
        </article>`;
      })
      .join('') || '<p class="vazio">Nenhum jogo nesta rodada.</p>';
  }

  async function acaoNoJogo(ev: Event): Promise<void> {
    const botao = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-acao]');
    const card = botao?.closest<HTMLElement>('[data-jogo]');
    if (!botao || !card || botao.disabled) return;
    const acao = botao.dataset.acao;
    const jogo = jogos.find((j) => j.id === card.dataset.jogo);
    if (!jogo) return;
    const ler = (lado: string) => Number(card.querySelector<HTMLInputElement>(`[data-gols="${lado}"]`)!.value);
    const m = ler('m');
    const v = ler('v');
    const confronto = `${nome(jogo.mandante_id)} ${m} x ${v} ${nome(jogo.visitante_id)}`;
    if (acao !== 'anular' && (!Number.isInteger(m) || !Number.isInteger(v) || m < 0 || v < 0 || m > 30 || v > 30)) {
      alert('Placar inválido.');
      return;
    }
    const pergunta =
      acao === 'anular'
        ? `Anular ${nome(jogo.mandante_id)} x ${nome(jogo.visitante_id)}? Ninguém ganha ponto nesse jogo.`
        : `${acao === 'corrigir' ? 'Corrigir para' : 'Confirmar'} ${confronto}?`;
    if (!confirm(pergunta)) return;
    card.querySelectorAll('button').forEach((b) => (b.disabled = true));
    const { data, error } = await sb.functions.invoke('confirmar-placar', {
      body: acao === 'anular' ? { jogoId: jogo.id, acao: 'anular' } : { jogoId: jogo.id, acao: 'confirmar', golsMandante: m, golsVisitante: v },
    });
    if (saiu) return;
    if (error) alert(`Não deu certo: ${error.message}`);
    else alert(`Feito. ${(data as { gravados?: number }).gravados ?? 0} lançamentos de pontos gravados.`);
    await carregar();
  }

  async function sincronizar(ev: Event): Promise<void> {
    const botao = ev.currentTarget as HTMLButtonElement;
    botao.disabled = true;
    const { data, error } = await sb.functions.invoke('sincronizar-jogos', { body: { origem: 'admin' } });
    if (saiu) return;
    botao.disabled = false;
    const r = data as { ok?: boolean; motivo?: string } | null;
    if (error) alert(`Não deu certo: ${error.message}`);
    else if (r?.motivo === 'cedo') alert('Teve sincronização há menos de 2 minutos. Espera um pouquinho.');
    else if (!r?.ok) alert(`A sincronização falhou (${r?.motivo ?? 'erro'}).`);
    await carregar();
  }

  async function sair(): Promise<void> {
    await sb.auth.signOut({ scope: 'local' });
    if (!saiu) telaLogin();
  }

  void abrir();
  return () => {
    saiu = true;
  };
}
