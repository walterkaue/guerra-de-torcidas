// Aviso de domingo por push (cron: domingo 18h de Brasília). Para cada aparelho inscrito, monta o
// texto com a situação da torcida dele (src/jogo/avisos.ts, o mesmo do celular) e envia pelo Web Push.
// Inscrição que o navegador diz não existir mais (404/410) é apagada. Um aviso por aparelho a cada 20 h.
// Só 18+ recebe (docs/jogo.md, seção 13): outra faixa é desinscrita; sem resposta, espera a triagem.
// Só o cron chama (secret key do projeto). Segredos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.

import webpush from 'npm:web-push@3.6.7';
import { admin, ErroHttp, lerCorpo, servir } from '../_shared/comum.ts';
import { avisoDeDomingo, type LinhaAviso } from '../_shared/jogo/avisos.ts';
import { destinoDaInscricao } from '../_shared/jogo/faixaEtaria.ts';
import { temSegredo } from '../_shared/segredo.ts';
import { semanaBrasilia } from '../_shared/tempo.ts';

const INTERVALO_MS = 20 * 3600_000;
const FALHAS_MAX = 5;

servir(async (req) => {
  if (!(await temSegredo(req))) throw new ErroHttp(401, 'sem_permissao');
  const publica = Deno.env.get('VAPID_PUBLIC_KEY');
  const privada = Deno.env.get('VAPID_PRIVATE_KEY');
  const assunto = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@kauewalter.com.br';
  if (!publica || !privada) return { ok: false, motivo: 'faltam os segredos VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY' };
  webpush.setVapidDetails(assunto, publica, privada);

  const corpo = await lerCorpo(req);
  const teste = corpo.teste === true;
  // Diagnóstico: sem conteúdo não há criptografia; o service worker mostra a mensagem padrão.
  const semCarga = corpo.sem_carga === true;
  const sb = admin();
  const agora = new Date();

  const { data: inscricoes, error } = await sb.from('push_inscricoes').select('endpoint, p256dh, auth, torcedor_id, ultimo_envio, falhas');
  if (error) throw error;
  if (!inscricoes?.length) return { ok: true, enviados: 0 };

  const ids = [...new Set(inscricoes.map((i) => i.torcedor_id))];
  const [{ data: torcedores }, { data: ranking }] = await Promise.all([
    sb.from('torcedores').select('id, time_id, faixa_etaria').in('id', ids),
    sb.from('ranking_semana').select('time_id, ativos, media30, posicao_campeao').eq('semana', semanaBrasilia(agora)),
  ]);
  const timeDe = new Map((torcedores ?? []).map((t) => [t.id, t.time_id as string]));
  const faixaDe = new Map((torcedores ?? []).map((t) => [t.id, t.faixa_etaria as string | null]));
  const linhas: LinhaAviso[] = (ranking ?? []).map((r) => ({ ...r, media30: Number(r.media30) }));

  const resultado = { enviados: 0, pulados: 0, apagados: 0, falhas: 0, codigos: [] as number[] };
  for (const i of inscricoes) {
    const destino = destinoDaInscricao(faixaDe.get(i.torcedor_id));
    if (destino !== 'enviar') {
      if (destino === 'desinscrever') {
        await sb.from('push_inscricoes').delete().eq('endpoint', i.endpoint);
        resultado.apagados++;
      } else {
        resultado.pulados++;
      }
      continue;
    }
    if (!teste && i.ultimo_envio && agora.getTime() - Date.parse(i.ultimo_envio) < INTERVALO_MS) {
      resultado.pulados++;
      continue;
    }
    const aviso = avisoDeDomingo(timeDe.get(i.torcedor_id) ?? 'outro', linhas);
    const carga = JSON.stringify({ titulo: teste ? `[teste] ${aviso.titulo}` : aviso.titulo, corpo: aviso.corpo, url: '/' });
    try {
      const resp = await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, semCarga ? null : carga, {
        TTL: 6 * 3600,
        urgency: 'normal',
      });
      resultado.codigos.push(resp.statusCode);
      console.log(`push ${resp.statusCode} ${new URL(i.endpoint).host}${semCarga ? ' sem conteúdo' : ''}`);
      await sb.from('push_inscricoes').update({ ultimo_envio: agora.toISOString(), falhas: 0 }).eq('endpoint', i.endpoint);
      resultado.enviados++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error(`push falhou ${status ?? ''} ${new URL(i.endpoint).host}: ${(e as { body?: string }).body ?? (e as Error).message}`);
      if (status === 404 || status === 410 || i.falhas + 1 >= FALHAS_MAX) {
        await sb.from('push_inscricoes').delete().eq('endpoint', i.endpoint);
        resultado.apagados++;
      } else {
        await sb.from('push_inscricoes').update({ falhas: i.falhas + 1 }).eq('endpoint', i.endpoint);
        resultado.falhas++;
      }
    }
  }
  return { ok: true, ...resultado };
});
