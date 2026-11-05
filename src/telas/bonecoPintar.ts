// O desenho e a leitura do boneco fora do vestiário. Só baixa por import() (bonecoDoAparelho.ts): nada disto pesa
// no bundle inicial. Cores pelo time do coração de agora (trocar de time troca as cores sozinho).

import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { conferirFormato, type Vestimenta } from '../jogo/vestiario';
import type { BonecoDoServidor } from '../servidor/boneco';
import { bonecoGuardado, guardarBoneco, marcarVistas, type Pintura } from './bonecoDoAparelho';
import { desenharBoneco, fonteDoNumeroPronta, numeroVisivel, prepararFonteDoNumero } from './bonecoMontavel';

/** Em dev, os servidores de mentira (?homeFalsa, ?vestiarioFalso, os jogos falsos) também têm boneco de mentira. */
const FLAGS_FALSAS = ['homeFalsa', 'vestiarioFalso', 'lancesFalsos', 'penaltiFalso', 'provaFalsa', 'diaFalso', 'disputasFalsas'];
const FALSO = import.meta.env.DEV && FLAGS_FALSAS.some((f) => new URLSearchParams(location.search).has(f));

function coresDeAgora(): readonly [string, string] {
  const pedido = import.meta.env.DEV ? timePorId(new URLSearchParams(location.search).get('time')) : undefined;
  const t = pedido ?? timePorId(prefs.get().time) ?? timePorId(ID_OUTRO)!;
  return [t.cores[0], t.cores[1]];
}

/** A cópia guardada, se ainda tiver o formato do catálogo. */
export function vestimentaGuardada(): Vestimenta | null {
  const v = bonecoGuardado();
  return conferirFormato(v) ? v : null;
}

/** Desenha num canvas novo e troca o conteúdo do alvo por ele. Sem vestimenta, não toca no alvo. */
export function pintarNoAlvo(alvo: HTMLElement, p: Pintura): void {
  const v = p.vestimenta ?? vestimentaGuardada();
  if (!v) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(p.largura * dpr);
  canvas.height = Math.round(p.altura * dpr);
  canvas.style.width = `${p.largura}px`;
  canvas.style.height = `${p.altura}px`;
  canvas.style.display = 'block';
  if (p.rotulo) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', p.rotulo);
  } else canvas.setAttribute('aria-hidden', 'true');
  const desenhar = () => {
    const c = canvas.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, p.largura, p.altura);
    desenharBoneco(c, v, coresDeAgora(), p.recorte, p.largura, p.altura);
  };
  desenhar();
  alvo.replaceChildren(canvas);
  alvo.classList.add('com-boneco');
  // Número na camisa sem a Anton carregada: desenha de novo quando a fonte chegar.
  if (numeroVisivel(v) !== null && !fonteDoNumeroPronta()) void prepararFonteDoNumero().then(() => canvas.isConnected && desenhar());
}

async function lerDeVerdade(): Promise<BonecoDoServidor> {
  if (FALSO) return (await import('../dev/bonecoFalso')).bonecoFalso();
  return (await import('../servidor/boneco')).lerBoneco();
}

/**
 * Lê o boneco do servidor, guarda a cópia de exibição e marca as peças liberadas como vistas (o resultado não
 * anuncia peça que este aparelho já viu). Rejeita sem rede.
 */
export async function lerDoServidor(): Promise<BonecoDoServidor> {
  const b = await lerDeVerdade();
  guardarBoneco(b.vestimenta);
  marcarVistas(b.liberadas);
  return b;
}

let conferido: Promise<boolean> | null = null;

/** Uma conferência por abertura do app (Home e Perfil): true se a vestimenta guardada mudou. Sem rede: false. */
export function conferirComOServidor(): Promise<boolean> {
  conferido ??= (async () => {
    const antes = JSON.stringify(vestimentaGuardada());
    try {
      const b = await lerDoServidor();
      return JSON.stringify(b.vestimenta) !== antes;
    } catch {
      conferido = null; // tenta de novo na próxima tela
      return false;
    }
  })();
  return conferido;
}
