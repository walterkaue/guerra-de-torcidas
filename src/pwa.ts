// Registro do service worker (PWA instalável). Só no site publicado: em `npm run dev` ele
// atrapalharia o recarregamento automático do Vite.

export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  // Depois do carregamento, para não disputar a rede com o jogo.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sem service worker o jogo funciona igual; só não fica instalável.
    });
  });
}
