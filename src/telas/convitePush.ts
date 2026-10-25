// Aviso de domingo por notificação push (PWA), sempre com opt-in (docs/jogo.md, pilar 4).
// O convite só aparece depois de um bom momento (vitória, acerto), no máximo a cada 14 dias, nunca
// no iPhone fora do app instalado (lá o navegador não entrega push) e nunca se a pessoa já recusou.
// Primeiro um cartão nosso; o pedido de permissão do navegador só vem se a pessoa tocar em "Quero".

import { comTempoLimite, garantirSessao, supabase } from '../servidor/api';

const CHAVE_VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const MEMORIA = 'gdt-convite-push';
const INTERVALO_MS = 14 * 24 * 3600_000;

const lerMemoria = (): number => {
  try {
    return Number(localStorage.getItem(MEMORIA) ?? 0);
  } catch {
    return 0;
  }
};
const gravarMemoria = () => {
  try {
    localStorage.setItem(MEMORIA, String(Date.now()));
  } catch {
    // navegação privada: o convite pode voltar, sem problema
  }
};

/** iPhone/iPad só entregam push para o app instalado na tela inicial. */
function iosForaDoApp(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !window.matchMedia('(display-mode: standalone)').matches;
}

export function pushDisponivel(): boolean {
  return !!CHAVE_VAPID && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !iosForaDoApp();
}

/** Pode mostrar o cartão agora? (regras do convite, sem olhar a rede) */
export function podeConvidar(agora = Date.now(), ultimo = lerMemoria(), permissao = typeof Notification === 'undefined' ? 'denied' : Notification.permission): boolean {
  return permissao === 'default' && agora - ultimo >= INTERVALO_MS;
}

function chaveEmBytes(base64: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function inscricaoAtual(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Liga: permissão do navegador, inscrição e registro no servidor. */
export async function ligarAvisos(): Promise<'ligado' | 'recusado' | 'erro'> {
  try {
    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') return 'recusado';
    const reg = await navigator.serviceWorker.ready;
    const insc = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(CHAVE_VAPID!) }));
    const json = insc.toJSON();
    await garantirSessao();
    const sb = await supabase();
    const { error } = await comTempoLimite(sb.rpc('salvar_inscricao_push', { p_endpoint: insc.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth }));
    if (error) throw error;
    return 'ligado';
  } catch {
    return 'erro';
  }
}

/** Desliga: tira do servidor e do navegador. */
export async function desligarAvisos(): Promise<void> {
  const insc = await inscricaoAtual();
  if (!insc) return;
  try {
    const sb = await supabase();
    await comTempoLimite(sb.rpc('remover_inscricao_push', { p_endpoint: insc.endpoint }));
  } finally {
    await insc.unsubscribe();
  }
}

export async function avisosLigados(): Promise<boolean> {
  if (!pushDisponivel() || Notification.permission !== 'granted') return false;
  return !!(await inscricaoAtual());
}

/** Depois de um bom momento: põe o cartão em `el` (se as regras deixarem). */
export function convidarParaAvisos(el: HTMLElement | null): void {
  if (!el || !pushDisponivel() || !podeConvidar()) return;
  gravarMemoria();
  el.innerHTML = `<section class="convite-push" aria-label="Aviso de domingo">
    <p class="rotulo">Quer um toque no domingo?</p>
    <p>Um aviso por semana, umas horas antes de fechar: como tá a sua torcida e o rival. Só isso.</p>
    <div class="dupla">
      <button class="botao" type="button" data-acao="push-sim">Quero o aviso</button>
      <button class="botao botao-sec" type="button" data-acao="push-nao">Agora não</button>
    </div>
  </section>`;
  const caixa = el.querySelector<HTMLElement>('.convite-push')!;
  el.querySelector('[data-acao="push-nao"]')!.addEventListener('click', () => (el.innerHTML = ''));
  el.querySelector('[data-acao="push-sim"]')!.addEventListener('click', async () => {
    caixa.querySelectorAll('button').forEach((b) => (b.disabled = true));
    const r = await ligarAvisos();
    caixa.innerHTML =
      r === 'ligado'
        ? '<p class="rotulo">Fechado! Domingo à tarde tem aviso.</p><p class="nota">Dá pra desligar no rodapé da tela inicial.</p>'
        : r === 'recusado'
          ? '<p class="nota">Tranquilo, sem aviso. Se mudar de ideia, libera as notificações do site no navegador.</p>'
          : '<p class="nota">Não deu pra ligar o aviso agora. Tenta de novo outro dia.</p>';
  });
}
