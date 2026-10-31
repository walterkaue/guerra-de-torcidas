// Aviso de domingo por notificação push (PWA), sempre com opt-in (docs/jogo.md, pilar 4).
// O convite só aparece depois de um bom momento (vitória, acerto), no máximo a cada 14 dias, nunca
// no iPhone fora do app instalado (lá o navegador não entrega push) e nunca se a pessoa já recusou.
// Primeiro um cartão nosso; o pedido de permissão do navegador só vem se a pessoa tocar em "Quero".
// Só para 18+ (seção 13): quem não marcou 18_mais não vê a oferta nem o sininho, e o servidor recusa.

import { faixaDoAparelho } from '../estado';
import { podeVerPush } from '../jogo/faixaEtaria';
import { comTempoLimite, garantirSessao, supabase } from '../servidor/api';
import { sincronizarTorcedor } from '../servidor/torcedor';

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
    // O servidor só aceita a inscrição de quem já tem a faixa gravada lá.
    await sincronizarTorcedor();
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

/** Tira a inscrição deste navegador; o servidor já apagou a dele com o usuário. */
export async function cancelarInscricaoDoAparelho(): Promise<void> {
  try {
    await (await inscricaoAtual())?.unsubscribe();
  } catch {
    // sem service worker ou sem suporte: não há inscrição para cancelar
  }
}

/** Depois de um bom momento: põe o cartão em `el` (se as regras deixarem). */
export function convidarParaAvisos(el: HTMLElement | null): void {
  if (!el || !podeVerPush(faixaDoAparelho()) || !pushDisponivel() || !podeConvidar()) return;
  gravarMemoria();
  el.innerHTML = `<section class="convite-push" aria-label="Aviso de domingo">
    <p class="rotulo">🔔 Quer um toque no domingo?</p>
    <p>Um aviso por semana, no domingo à tarde: como tá a sua torcida e o rival. Só isso.</p>
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
        ? '<p class="rotulo">🔔 Fechado! Domingo à tarde tem aviso.</p><p class="nota">Dá pra desligar no sininho da tela inicial.</p>'
        : r === 'recusado'
          ? '<p class="nota">Tranquilo, sem aviso. Se mudar de ideia, libera as notificações do site no navegador.</p>'
          : '<p class="nota">Não deu pra ligar o aviso agora. Tenta de novo outro dia.</p>';
  });
}

// ---------- sininho da tela inicial ----------

export type EstadoAviso = 'ligado' | 'pode-ligar' | 'bloqueado' | 'iphone-fora-do-app' | 'sem-suporte' | 'sem-chave';

/** Situação do aviso neste aparelho (o sininho mostra e explica cada uma). */
export async function estadoDoAviso(): Promise<EstadoAviso> {
  if (!CHAVE_VAPID) return 'sem-chave';
  if (iosForaDoApp()) return 'iphone-fora-do-app';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'sem-suporte';
  if (Notification.permission === 'denied') return 'bloqueado';
  if (Notification.permission === 'granted' && (await inscricaoAtual().catch(() => null))) return 'ligado';
  return 'pode-ligar';
}

/** Opera (inclusive GX) aceita a inscrição mas não recebe os avisos (testado em 25/10/2026). */
export const ehOpera = (ua = navigator.userAgent) => /\bOPR\/|\bOpera\b|\bOPX\//.test(ua);
const NOTA_OPERA = '<p class="nota">No Opera os avisos costumam não chegar. Se não chegar, use o Google Chrome (no celular e no computador).</p>';

const appInstalado = () => window.matchMedia('(display-mode: standalone)').matches;
const android = () => /Android/i.test(navigator.userAgent);

/** Explicação de cada caso em que o aparelho não recebe o aviso, com o que fazer. */
export function explicacaoDoAviso(estado: Exclude<EstadoAviso, 'ligado' | 'pode-ligar'>, instalado = appInstalado(), ehAndroid = android()): string {
  if (estado === 'iphone-fora-do-app') {
    return 'No iPhone, o aviso só chega com o jogo instalado: no Safari, toque em Compartilhar → "Adicionar à Tela de Início" e abra o jogo pelo ícone.';
  }
  if (estado === 'sem-suporte') {
    return instalado
      ? 'Este app foi instalado por um navegador que não recebe avisos (o navegador da Xiaomi, por exemplo). Abra o site no Chrome e instale de novo por lá: menu ⋮ → "Instalar app".'
      : 'Este navegador não recebe avisos. Se você abriu pelo link do WhatsApp ou do Instagram, abra o site no Chrome (menu ⋮ → "Abrir no Chrome").';
  }
  if (estado === 'bloqueado') {
    return ehAndroid
      ? 'As notificações estão bloqueadas. Confira as duas: (1) no site, toque no cadeado ao lado do endereço → Notificações → Permitir; (2) no celular, Configurações → Apps → Chrome (ou o navegador que você usa) → Notificações → ligar. Depois volte aqui.'
      : 'As notificações deste site estão bloqueadas no navegador. Toque no cadeado ao lado do endereço → Notificações → Permitir, e volte aqui.';
  }
  return 'O aviso ainda não está configurado no servidor.';
}

/** Painel do sininho: liga, desliga ou explica por que este aparelho não recebe o aviso. */
export async function painelDoAviso(el: HTMLElement, aoMudar: (ligado: boolean) => void): Promise<void> {
  const estado = await estadoDoAviso();
  const fechar = '<button class="botao botao-sec" type="button" data-acao="push-fechar">Fechar</button>';
  if (estado === 'ligado') {
    el.innerHTML = `<section class="convite-push" aria-label="Aviso de domingo">
      <p class="rotulo">🔔 Aviso de domingo ligado</p>
      <p>Domingo à tarde chega um toque com a situação da sua torcida e do rival. Um por semana.</p>
      ${ehOpera() ? NOTA_OPERA : ''}
      <button class="botao botao-sec" type="button" data-acao="push-testar">Testar neste aparelho</button>
      <p class="nota" data-teste-push hidden></p>
      <div class="dupla"><button class="botao botao-sec" type="button" data-acao="push-desligar">Desligar</button>${fechar}</div>
    </section>`;
  } else if (estado === 'pode-ligar') {
    el.innerHTML = `<section class="convite-push" aria-label="Aviso de domingo">
      <p class="rotulo">🔔 Quer um toque no domingo?</p>
      <p>Um aviso por semana, no domingo à tarde: como tá a sua torcida e o rival. Só isso.</p>
      ${ehOpera() ? NOTA_OPERA : ''}
      <div class="dupla"><button class="botao" type="button" data-acao="push-sim">Quero o aviso</button>${fechar}</div>
    </section>`;
  } else {
    el.innerHTML = `<section class="convite-push" aria-label="Aviso de domingo">
      <p class="rotulo">🔔 Aviso de domingo</p>
      <p>${explicacaoDoAviso(estado)}</p>
      ${fechar}
    </section>`;
  }
  el.querySelector('[data-acao="push-fechar"]')?.addEventListener('click', () => (el.innerHTML = ''));
  // Teste local (sem servidor): se esta notificação não aparecer, o bloqueio é do aparelho ou do navegador.
  el.querySelector('[data-acao="push-testar"]')?.addEventListener('click', async () => {
    const nota = el.querySelector<HTMLElement>('[data-teste-push]')!;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('🔔 Teste do aviso de domingo', {
        body: 'Se você está lendo isto, o aparelho mostra os avisos do jogo.',
        icon: '/icones/icone-192.png',
        tag: 'teste-aviso',
      });
      nota.textContent =
        'Mandei uma notificação de teste agora. Não apareceu? Então o aparelho está escondendo: confira as notificações do navegador nas configurações do sistema (no Windows: Configurações → Sistema → Notificações; e o "Não perturbe").';
    } catch {
      nota.textContent = 'O navegador não deixou mostrar a notificação de teste.';
    }
    nota.hidden = false;
  });
  el.querySelector('[data-acao="push-desligar"]')?.addEventListener('click', async () => {
    await desligarAvisos().catch(() => {});
    aoMudar(false);
    el.innerHTML = '<section class="convite-push"><p class="nota">Aviso desligado. É só tocar no sininho para ligar de novo.</p></section>';
  });
  el.querySelector('[data-acao="push-sim"]')?.addEventListener('click', async () => {
    el.querySelectorAll('button').forEach((b) => (b.disabled = true));
    gravarMemoria();
    const r = await ligarAvisos();
    if (r === 'ligado') aoMudar(true);
    el.innerHTML = `<section class="convite-push"><p class="${r === 'ligado' ? 'rotulo' : 'nota'}">${
      r === 'ligado'
        ? '🔔 Fechado! Domingo à tarde tem aviso.'
        : r === 'recusado'
          ? 'Sem aviso, tranquilo. Se mudar de ideia, libera as notificações do site no navegador.'
          : 'Não deu pra ligar o aviso agora. Tenta de novo daqui a pouco.'
    }</p></section>`;
  });
}
