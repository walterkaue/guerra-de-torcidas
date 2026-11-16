// ?medir: plaquinha discreta no canto da partida (pênaltis e Lances) com o que o aparelho aguenta. Vale também no site
// publicado, para quem testa mandar o print: quadros por segundo (mediana e p90), os 3 piores congelamentos com o
// momento do jogo, a espera de cada lance no servidor e o nível de qualidade. Não manda nada para lugar nenhum.
// Só leitura do relógio: nada aqui muda regra, pontos, sorteio ou o que o servidor recalcula.

/** O que estava acontecendo quando o quadro travou. */
export type Momento = 'preparo' | 'apito' | 'mira' | 'chute' | 'gol' | 'defesa' | 'lance' | 'fim';

/** Intervalo entre quadros acima disto conta como congelamento (o olho já nota um tranco). */
export const CONGELOU_MS = 50;
/** Acima disto a aba foi para segundo plano ou o celular dormiu: não é o jogo travando. */
const PAUSA_MS = 3000;

export interface Congelamento {
  ms: number;
  momento: Momento;
  /** Segundos desde o começo da medição. */
  em: number;
}

export interface Resumo {
  quadros: number;
  /** Quadros por segundo na mediana e no p90 dos intervalos (o p90 é o lado lento: 90% dos quadros saem mais rápido). */
  fpsMediana: number;
  fpsP90: number;
  congelados: number;
  piores: Congelamento[];
  /** Espera de cada lance no servidor (ms), na ordem. */
  esperas: number[];
  /** Todos os congelamentos, na ordem (para quem mede por script). */
  todos: Congelamento[];
}

/** Percentil `p` (0 a 1) de uma lista, pelo método do mais próximo (lista vazia = 0). */
export function percentil(v: readonly number[], p: number): number {
  if (!v.length) return 0;
  const o = [...v].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.max(0, Math.ceil(p * o.length) - 1))];
}

/** Os `n` piores congelamentos, do maior para o menor. */
export function piores(lista: readonly Congelamento[], n = 3): Congelamento[] {
  return [...lista].sort((a, b) => b.ms - a.ms).slice(0, n);
}

/** Medição pura: recebe o instante de cada quadro e os momentos do jogo. */
export function criarContador() {
  const intervalos: number[] = [];
  const congelamentos: Congelamento[] = [];
  const esperas: number[] = [];
  let ultimo = -1;
  let comeco = -1;
  let momento: Momento = 'preparo';
  return {
    marcar(m: Momento): void {
      momento = m;
    },
    espera(ms: number): void {
      esperas.push(Math.round(ms));
    },
    quadro(agora: number): void {
      if (comeco < 0) comeco = agora;
      const dt = ultimo < 0 ? 0 : agora - ultimo;
      ultimo = agora;
      if (dt <= 0 || dt > PAUSA_MS) return;
      intervalos.push(dt);
      if (dt >= CONGELOU_MS) congelamentos.push({ ms: Math.round(dt), momento, em: Math.round((agora - comeco) / 100) / 10 });
    },
    resumo(): Resumo {
      const fps = (ms: number) => (ms > 0 ? Math.round(1000 / ms) : 0);
      return {
        quadros: intervalos.length,
        fpsMediana: fps(percentil(intervalos, 0.5)),
        fpsP90: fps(percentil(intervalos, 0.9)),
        congelados: congelamentos.length,
        piores: piores(congelamentos),
        esperas: [...esperas],
        todos: [...congelamentos],
      };
    },
  };
}

/** As linhas da plaquinha. */
export function textoDaPlaca(r: Resumo, nivel: string): string[] {
  const esperas = r.esperas.length ? `${r.esperas.join(' · ')} ms (mediana ${percentil(r.esperas, 0.5)})` : '—';
  return [
    `medir · gráficos ${nivel}`,
    `${r.fpsMediana} q/s na mediana · ${r.fpsP90} no p90`,
    `travadas (≥${CONGELOU_MS} ms): ${r.congelados}`,
    r.piores.length ? `piores: ${r.piores.map((c) => `${c.ms} ${c.momento}`).join(' · ')}` : 'piores: nenhuma',
    `servidor: ${esperas}`,
  ];
}

/** ?medir no endereço (também no site publicado). */
export function medindo(): boolean {
  try {
    return new URLSearchParams(location.search).has('medir');
  } catch {
    return false;
  }
}

export type Medicao = ReturnType<typeof criarContador> & { parar(): void };

let placaAberta: HTMLElement | null = null;

/**
 * Liga a medição de uma partida. A plaquinha fica no `body` e sobrevive ao resultado (com os números finais, para o
 * print); a próxima partida troca por uma nova. Sem ?medir, devolve um medidor que não faz nada.
 */
export function medirPartida(nivel: () => string): Medicao {
  const contador = criarContador();
  if (!medindo()) return { marcar() {}, espera() {}, quadro() {}, resumo: contador.resumo, parar() {} };
  placaAberta?.remove();
  const placa = document.createElement('pre');
  placa.className = 'placa-medir';
  placa.setAttribute('aria-hidden', 'true');
  placa.style.cssText =
    'position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom));z-index:9999;margin:0;padding:6px 8px;' +
    'max-width:calc(100vw - 16px);border-radius:8px;background:rgba(0,0,0,0.78);color:#fff;font:11px/1.35 ui-monospace,monospace;' +
    'white-space:pre-wrap;pointer-events:none';
  document.body.append(placa);
  placaAberta = placa;
  const escrever = () => (placa.textContent = textoDaPlaca(contador.resumo(), nivel()).join('\n'));
  escrever();
  // Fora do quadro: a plaquinha não pode virar o custo que ela mede.
  const timer = window.setInterval(escrever, 500);
  (window as unknown as Record<string, unknown>).__medir = { resumo: contador.resumo, nivel };
  return {
    ...contador,
    parar() {
      window.clearInterval(timer);
      escrever();
    },
  };
}
