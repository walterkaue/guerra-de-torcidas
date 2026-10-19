// Sincroniza as rodadas 32 a 38 do Brasileirão (competição BSA da API v4 do football-data.org).
// Chamada pelo agendamento do banco (pg_cron, a cada 30 min em dia de jogo e às 6h no resto) e pelo
// botão "Sincronizar agora" do #admin. Fica aberta (o agendador não tem sessão), mas recusa nova
// chamada com menos de 2 minutos da anterior, para ninguém gastar a cota de 10 chamadas por minuto.
// Uma sincronização = 1 chamada à API (a temporada inteira de uma vez).
// Nunca mexe no placar confirmado: só no horário, no status e no placar que veio da API.

import { admin, lerCorpo, servir } from '../_shared/comum.ts';
import { lerPartidas, type PartidaApi } from '../_shared/jogo/footballData.ts';

const API = 'https://api.football-data.org/v4/competitions/BSA/matches';
const INTERVALO_MIN_MS = 2 * 60_000;

servir(async (req) => {
  const sb = admin();
  const corpo = await lerCorpo(req);
  const origem = corpo.origem === 'admin' ? 'admin' : 'agenda';

  const { data: ultima, error: eU } = await sb
    .from('sincronizacoes')
    .select('quando')
    .order('quando', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (eU) throw eU;
  if (ultima && Date.now() - Date.parse(ultima.quando) < INTERVALO_MIN_MS) {
    return { ok: false, motivo: 'cedo', ultima: ultima.quando };
  }

  // Registra a tentativa antes de chamar a API (é ela que segura o intervalo mínimo).
  const { data: registro, error: eR } = await sb.from('sincronizacoes').insert({ origem }).select('id').single();
  if (eR) throw eR;
  const fechar = async (campos: Record<string, unknown>) => {
    const { error } = await sb.from('sincronizacoes').update(campos).eq('id', registro.id);
    if (error) console.error(error);
  };

  const token = Deno.env.get('FOOTBALL_DATA_TOKEN');
  if (!token) {
    await fechar({ mensagem: 'Falta o segredo FOOTBALL_DATA_TOKEN nas funções.' });
    return { ok: false, motivo: 'sem_token' };
  }

  const resposta = await fetch(`${API}?season=2026`, { headers: { 'X-Auth-Token': token } });
  if (!resposta.ok) {
    await fechar({ mensagem: `API respondeu ${resposta.status}` });
    return { ok: false, motivo: 'api', status: resposta.status };
  }
  const { matches } = (await resposta.json()) as { matches?: PartidaApi[] };
  const { jogos, semPar } = lerPartidas(matches ?? []);

  if (jogos.length) {
    const agora = new Date().toISOString();
    const { error } = await sb
      .from('jogos')
      .upsert(jogos.map((j) => ({ ...j, atualizado_em: agora })), { onConflict: 'api_id' });
    if (error) {
      await fechar({ mensagem: `Falha ao gravar: ${error.message}`, sem_par: semPar });
      throw error;
    }
    const { error: eT } = await sb.rpc('atualizar_travas');
    if (eT) throw eT;
  }

  await fechar({ ok: true, jogos: jogos.length, sem_par: semPar, mensagem: semPar.length ? 'Time sem par' : null });
  return { ok: true, jogos: jogos.length, semPar };
});
