// Painel do administrador (#admin): login com e-mail e senha, só para quem está na tabela
// administradores. Revisa as perguntas do pipeline com Gemini (adminRevisao.ts) e as partidas sob
// suspeita (adminSuspeitas.ts), e apaga apelido ofensivo (adminApelido.ts). Confirma, corrige ou anula o placar dos jogos do Crava; a distribuição dos
// pontos é feita no servidor (função confirmar-placar), sem duplicar.
// Usa uma sessão separada (storageKey próprio): a sessão de jogador do aparelho continua a mesma.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { esc } from '../app';
import { timePorId } from '../dados/times';
import { ordinalRodada } from '../jogo/crava';
import { horaDoJogo, rodadaEmFoco } from '../jogo/cravaTela';
import type { Jogo } from '../servidor/crava';
import { opcoesComCaptcha, tokenCaptcha } from '../servidor/captcha';
import '../estilos/admin.css';
import { montarApelido } from './adminApelido';
import { montarRevisao } from './adminRevisao';
import { montarSuspeitas } from './adminSuspeitas';
import { aoTocarNoEstado, cabecalhoTela, estado, numero, placa, selo } from './blocos';

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Em desenvolvimento, ?adminFalso (com #admin) troca o Supabase por um de mentira (src/dev/adminFalso.ts):
// entra direto como administrador, com jogos, feedbacks, fila e cobertura de mentira. Não entra no build de produção.
const FALSO = import.meta.env.DEV && new URLSearchParams(location.search).has('adminFalso');

const nome = (id: string) => timePorId(id)?.nome ?? id;

interface Feedback {
  id: number;
  tipo: string;
  texto: string;
  tela: string | null;
  aparelho: string | null;
  lido: boolean;
  criado_em: string;
}

interface Cobertura {
  clube: string;
  degrau: number;
  ativas: number;
  respostas: number;
  acerto: number | null;
}

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
  if (!FALSO && (!URL_SUPABASE || !CHAVE_PUBLICA)) {
    root.innerHTML = `<main class="tela admin">${cabecalhoTela({ titulo: 'Painel do Crava', pre: false })}
      ${placa(estado('erro', 'Supabase não configurado.', { acao: 'Voltar pro jogo' }))}</main>`;
    root.querySelector('[data-estado-acao]')?.addEventListener('click', () => location.assign('./'));
    return () => {};
  }
  let sb: SupabaseClient = FALSO
    ? (null as unknown as SupabaseClient)
    : createClient(URL_SUPABASE!, CHAVE_PUBLICA!, {
        auth: { storageKey: 'gdt-admin', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      });

  let jogos: Jogo[] = [];
  let limparRevisao: (() => void) | undefined;
  let limparSuspeitas: (() => void) | undefined;
  let limparApelido: (() => void) | undefined;
  let rodada: number | null = null;

  const casca = (miolo: string) => {
    root.innerHTML = `<main class="tela admin">
      ${cabecalhoTela({ titulo: 'Painel do Crava', pre: false })}
      ${miolo}
      <a class="botao-linha admin-voltar" href="./">Voltar pro jogo</a>
    </main>`;
  };

  function telaLogin(erro = ''): void {
    casca(
      placa(
        `<form class="admin-login">
      <label class="campo"><span>E-mail</span><input type="email" name="email" autocomplete="username" required /></label>
      <label class="campo"><span>Senha</span><input type="password" name="senha" autocomplete="current-password" required /></label>
      <p class="erro-campo" role="alert" ${erro ? '' : 'hidden'}>${esc(erro)}</p>
      <button class="botao" type="submit">Entrar</button>
    </form>`,
        { titulo: 'Entrar' },
      ),
    );
    const form = root.querySelector<HTMLFormElement>('form')!;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const dados = new FormData(form);
      const botao = form.querySelector<HTMLButtonElement>('button')!;
      botao.disabled = true;
      // Com o CAPTCHA ligado no Supabase, o login por senha também precisa do token.
      let token: string | undefined;
      try {
        token = await tokenCaptcha();
      } catch {
        if (!saiu) telaLogin('Não deu pra passar na verificação. Tente de novo.');
        return;
      }
      const { error } = await sb.auth.signInWithPassword({
        email: String(dados.get('email') ?? ''),
        password: String(dados.get('senha') ?? ''),
        options: opcoesComCaptcha(token),
      });
      if (saiu) return;
      if (error) telaLogin('E-mail ou senha não conferem.');
      else void abrir();
    });
  }

  async function abrir(): Promise<void> {
    if (FALSO && !sb) sb = (await import('../dev/adminFalso')).clienteFalso() as unknown as SupabaseClient;
    const { data } = await sb.auth.getSession();
    if (saiu) return;
    if (!data.session) return telaLogin();
    const { data: admin, error } = await sb.rpc('sou_admin');
    if (saiu) return;
    if (error || !admin) {
      casca(
        placa(
          `<p class="admin-alerta">Esta conta (${esc(data.session.user.email ?? '')}) não está na tabela de administradores.</p>
        <button class="botao-linha" type="button" data-acao="sair">Sair</button>`,
          { titulo: 'Sem acesso' },
        ),
      );
      root.querySelector('[data-acao="sair"]')!.addEventListener('click', sair);
      return;
    }
    casca(
      placa(
        `<div class="dupla">
        <button class="botao" type="button" data-acao="sincronizar">Sincronizar agora</button>
        <button class="botao-linha" type="button" data-acao="sair">Sair</button>
      </div>
      <div data-sinc>${estado('carregando', 'Carregando…')}</div>
      <p class="nota" data-ensaio></p>`,
        { titulo: 'Sincronização' },
      ) +
        placa(
          `<nav class="seletor-rodada" aria-label="Rodada">
        <button type="button" class="voltar" data-acao="ant" aria-label="Rodada anterior">‹</button>
        <strong class="rotulo" data-rodada></strong>
        <button type="button" class="voltar" data-acao="prox" aria-label="Próxima rodada">›</button>
      </nav>
      <section class="lista-jogos" data-jogos></section>
      <p class="nota">Confirmar distribui os pontos da rodada inteira. Confirmar de novo ou corrigir não duplica:
      o servidor grava só a diferença. Placar confirmado depois de segunda 12h entra na semana atual.</p>`,
          { titulo: 'Placares da rodada' },
        ) +
        placa('<div data-revisao></div>', { titulo: 'Revisão de perguntas' }) +
        placa('<div data-suspeitas></div>', { titulo: 'Partidas sob suspeita' }) +
        placa('<div data-apelido></div>', { titulo: 'Apagar apelido' }) +
        placa(`<div class="lista-jogos" data-feedbacks>${estado('carregando', 'Carregando…')}</div>`, { titulo: 'Feedback' }) +
        placa(`<div data-cobertura>${estado('carregando', 'Carregando…')}</div>`, { titulo: 'Prova de Boleiro' }),
    );
    root.querySelector('[data-feedbacks]')!.addEventListener('click', marcarLido);
    root.querySelector('[data-acao="sair"]')!.addEventListener('click', sair);
    root.querySelector('[data-acao="sincronizar"]')!.addEventListener('click', sincronizar);
    root.querySelector('[data-acao="ant"]')!.addEventListener('click', () => mudarRodada(-1));
    root.querySelector('[data-acao="prox"]')!.addEventListener('click', () => mudarRodada(1));
    root.querySelector('[data-jogos]')!.addEventListener('click', acaoNoJogo);
    limparRevisao?.();
    limparRevisao = montarRevisao(root.querySelector<HTMLElement>('[data-revisao]')!, sb, () => void carregar());
    limparSuspeitas?.();
    limparSuspeitas = montarSuspeitas(root.querySelector<HTMLElement>('[data-suspeitas]')!, sb);
    limparApelido?.();
    limparApelido = montarApelido(root.querySelector<HTMLElement>('[data-apelido]')!, sb);
    await carregar();
  }

  async function carregar(): Promise<void> {
    const [j, s, c, f, cob] = await Promise.all([
      sb
        .from('jogos')
        .select('id, rodada, mandante_id, visitante_id, inicio, status_api, gols_api_mandante, gols_api_visitante, gols_mandante, gols_visitante, confirmado_em, corrigido_em, anulado')
        .order('inicio'),
      sb.from('sincronizacoes').select('quando, origem, ok, jogos, sem_par, mensagem').order('quando', { ascending: false }).limit(1),
      sb.from('config_crava').select('valor').eq('chave', 'valendo_desde_rodada').maybeSingle(),
      sb.from('feedbacks').select('id, tipo, texto, tela, aparelho, lido, criado_em').order('criado_em', { ascending: false }).limit(50),
      sb.rpc('cobertura_perguntas'),
    ]);
    if (saiu) return;
    jogos = (j.data ?? []) as Jogo[];
    if (rodada === null || !jogos.some((x) => x.rodada === rodada)) rodada = rodadaEmFoco(jogos, new Date());

    const ultima = ((s.data ?? []) as Sincronizacao[])[0];
    const elSinc = root.querySelector<HTMLElement>('[data-sinc]')!;
    elSinc.innerHTML = !ultima
      ? '<p class="admin-alerta">Ainda não houve sincronização. Toque em "Sincronizar agora".</p>'
      : `<div class="numeros dois">${numero(ultima.ok ? String(ultima.jogos) : '—', 'jogos', ultima.ok ? 'destaque' : 'apagado')}${numero(String(ultima.sem_par.length), 'times sem par', ultima.sem_par.length ? undefined : 'apagado')}</div>
        <p class="nota">Última sincronização: ${new Date(ultima.quando).toLocaleString('pt-BR')} (${esc(ultima.origem)}) ·
          ${ultima.ok ? `${ultima.jogos} jogos` : `falhou${ultima.mensagem ? `: ${esc(ultima.mensagem)}` : ''}`}</p>
        ${ultima.sem_par.length ? `<p class="admin-alerta"><strong>Time sem par na API:</strong> ${ultima.sem_par.map(esc).join(', ')}. Os jogos desses times não entraram. Peça o ajuste em src/jogo/footballData.ts.</p>` : ''}`;
    const valendo = c.data ? Number(c.data.valor) : 99;
    root.querySelector('[data-ensaio]')!.textContent =
      valendo >= 99
        ? 'Modo ensaio ligado: nenhuma rodada soma no ranking da semana (config_crava.valendo_desde_rodada = 99).'
        : `Somam no ranking da semana as rodadas a partir da ${ordinalRodada(valendo)}.`;
    desenharFeedbacks((f.data ?? []) as Feedback[], !!f.error);
    desenharCobertura((cob.data ?? []) as Cobertura[], !!cob.error);
    desenhar();
  }

  /** Painel de cobertura (jogo.md 7.1): perguntas ativas por clube × degrau e acerto médio. */
  function desenharCobertura(linhas: Cobertura[], falhou: boolean): void {
    const el = root.querySelector<HTMLElement>('[data-cobertura]');
    if (!el) return;
    if (falhou) {
      el.innerHTML = estado('erro', 'Não deu pra ler o banco de perguntas.');
      aoTocarNoEstado(el, () => void carregar());
      return;
    }
    if (!linhas.length) {
      el.innerHTML = estado('vazio', 'Nenhuma pergunta ativa.', { detalhe: 'Rode npm run importar-perguntas com perguntas revisadas.' });
      return;
    }
    const clubes = [...new Set(linhas.map((l) => l.clube))];
    const META = [3, 3, 2, 2];
    const abaixo = clubes.filter(
      (c) => c !== 'geral' && META.some((m, i) => (linhas.find((x) => x.clube === c && x.degrau === i + 1)?.ativas ?? 0) < m),
    ).length;
    const celula = (clube: string, d: number) => {
      const l = linhas.find((x) => x.clube === clube && x.degrau === d);
      if (!l) return '<td class="falta">0</td>';
      return `<td>${l.ativas}${l.acerto !== null ? `<small> ${Number(l.acerto).toFixed(0)}%</small>` : ''}</td>`;
    };
    el.innerHTML = `<div class="numeros tres">${numero(String(linhas.reduce((t, l) => t + l.ativas, 0)), 'perguntas ativas', 'destaque')}${numero(String(clubes.length), 'clubes')}${numero(String(abaixo), 'abaixo da meta', abaixo ? undefined : 'apagado')}</div>
      <p class="nota">Perguntas ativas por degrau (e % de acerto). Meta da pré-temporada: 3/3/2/2 por clube.</p>
      <div class="adm-tabela"><table>
        <thead><tr><th>Clube</th><th>Fác.</th><th>Méd.</th><th>Dif.</th><th>Craq.</th></tr></thead>
        <tbody>${clubes
          .map((c) => `<tr><th>${esc(c === 'geral' ? 'Gerais' : nome(c))}</th>${[1, 2, 3, 4].map((d) => celula(c, d)).join('')}</tr>`)
          .join('')}</tbody>
      </table></div>`;
  }

  function desenharFeedbacks(lista: Feedback[], falhou: boolean): void {
    const el = root.querySelector<HTMLElement>('[data-feedbacks]');
    if (!el) return;
    const rotulo = { bug: '🐞 Bug', ideia: '💡 Ideia', outro: '💬 Outro' } as Record<string, string>;
    const novos = lista.filter((x) => !x.lido).length;
    if (falhou) {
      el.innerHTML = estado('erro', 'Não deu pra ler os feedbacks.');
      aoTocarNoEstado(el, () => void carregar());
      return;
    }
    el.innerHTML = !lista.length
      ? estado('vazio', 'Nenhum feedback ainda.')
      : `<div class="numeros dois">${numero(String(novos), novos === 1 ? 'novo' : 'novos', novos ? 'destaque' : 'apagado')}${numero(String(lista.length), 'últimos 50')}</div>` +
        lista
          .map(
            (x) => `<article class="admin-feedback${x.lido ? ' lido' : ''}" data-feedback="${x.id}">
                <p class="rotulo">${rotulo[x.tipo] ?? esc(x.tipo)} · ${new Date(x.criado_em).toLocaleString('pt-BR')} · tela ${esc(x.tela ?? '?')}</p>
                <p class="texto">${esc(x.texto)}</p>
                <p class="nota"><small>${esc(x.aparelho ?? '')}</small></p>
                ${x.lido ? '' : '<button class="botao-linha" type="button" data-acao="lido">Marcar como lido</button>'}
              </article>`,
          )
          .join('');
  }

  async function marcarLido(ev: Event): Promise<void> {
    const botao = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-acao="lido"]');
    const id = botao?.closest<HTMLElement>('[data-feedback]')?.dataset.feedback;
    if (!botao || !id) return;
    botao.disabled = true;
    const { error } = await sb.from('feedbacks').update({ lido: true }).eq('id', Number(id));
    if (saiu) return;
    if (error) {
      botao.disabled = false;
      alert(`Não deu certo: ${error.message}`);
      return;
    }
    await carregar();
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
          ? selo('ANULADO', 'caiu')
          : j.confirmado_em
            ? selo(esc(`Confirmado ${j.gols_mandante} x ${j.gols_visitante}${j.corrigido_em ? ' (corrigido)' : ''}`), 'subiu')
            : selo('Não confirmado');
        return `<article class="admin-jogo${j.confirmado_em && !j.anulado ? ' ok' : ''}" data-jogo="${j.id}">
          <p class="rotulo">${esc(horaDoJogo(j.inicio))} · API: ${esc(j.status_api)} · ${esc(api)}</p>
          <div class="admin-placar">
            <span class="nome">${esc(nome(j.mandante_id))}</span>
            <input type="number" inputmode="numeric" min="0" max="30" value="${m}" data-gols="m" aria-label="Gols ${esc(nome(j.mandante_id))}" />
            <span class="nome">${esc(nome(j.visitante_id))}</span>
            <input type="number" inputmode="numeric" min="0" max="30" value="${v}" data-gols="v" aria-label="Gols ${esc(nome(j.visitante_id))}" />
          </div>
          <div class="selos">${situacao}</div>
          <div class="admin-acoes">
            <button class="botao" type="button" data-acao="confirmar" ${comecou && !j.confirmado_em ? '' : 'disabled'}>Confirmar</button>
            <button class="botao-linha" type="button" data-acao="corrigir" ${j.confirmado_em ? '' : 'disabled'}>Corrigir o placar</button>
            <button class="botao-linha" type="button" data-acao="anular" ${j.anulado ? 'disabled' : ''}>Anular</button>
          </div>
        </article>`;
      })
      .join('') || estado('vazio', 'Nenhum jogo nesta rodada.');
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
    limparRevisao?.();
    limparSuspeitas?.();
    limparApelido?.();
  };
}
