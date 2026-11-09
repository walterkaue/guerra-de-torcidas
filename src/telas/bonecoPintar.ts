// O desenho e a leitura do boneco fora do vestiário. Só baixa por import() (bonecoDoAparelho.ts): nada disto pesa
// no bundle inicial. Cores pelo time do coração de agora (trocar de time troca as cores sozinho).

import { ID_OUTRO, timePorId } from '../dados/times';
import { prefs } from '../estado';
import { comFormato, type Vestimenta } from '../jogo/vestiario';
import type { BonecoDoServidor } from '../servidor/boneco';
import { bonecoGuardado, guardarBoneco, marcarVistas, type Pintura } from './bonecoDoAparelho';
import { vestimentaDeCampo } from './bonecoEmCampo';
import { guardarEmCampo } from './bonecoEmCampoGuardado';
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
  return comFormato(v);
}

/** Desenha num canvas novo e troca o conteúdo do alvo por ele. Sem vestimenta, não toca no alvo. */
export function pintarNoAlvo(alvo: HTMLElement, p: Pintura): void {
  const v = p.deCampo !== undefined ? vestimentaDeCampo(p.deCampo) : (p.vestimenta ?? vestimentaGuardada());
  if (!v) return;
  if (p.aoLado) {
    const lado = document.createElement('span');
    lado.className = 'convite-busto';
    lado.setAttribute('aria-hidden', 'true');
    // O parágrafo passa a conter o busto (texto curto não deixa ele vazar em cima do botão).
    alvo.classList.add('com-busto');
    alvo.prepend(lado);
    alvo = lado;
  }
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
    desenharBoneco(c, v, p.cores ?? coresDeAgora(), p.recorte, p.largura, p.altura);
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
export function lerDoServidor(): Promise<BonecoDoServidor> {
  // Duas telas pedindo ao mesmo tempo (o avatar e o bloco do Perfil) dividem a mesma leitura.
  lendo ??= lerDeVerdade()
    .then((b) => {
      guardarBoneco(b.vestimenta);
      // "Meu boneco em campo": o servidor manda; função antiga não manda (undefined: não mexe).
      if (typeof b.emCampo === 'boolean') guardarEmCampo(b.emCampo);
      marcarVistas(b.liberadas);
      return b;
    })
    .finally(() => {
      lendo = null;
    });
  return lendo;
}

let lendo: Promise<BonecoDoServidor> | null = null;

let conferido: Promise<boolean> | null = null;

/** Uma conferência por abertura do app (Home e Perfil): true se a vestimenta guardada mudou. Sem rede: false. */
export function conferirComOServidor(): Promise<boolean> {
  // Sem cópia guardada (troca de conta: esquecerTorcedor apaga), confere de novo mesmo já tendo conferido.
  if (conferido && bonecoGuardado() === null) conferido = null;
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
