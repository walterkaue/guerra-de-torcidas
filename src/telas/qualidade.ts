// Qualidade gráfica em três níveis (docs/visual.md, seção 4.3). Só desenho: nada aqui muda regra,
// pontos ou o que o servidor recalcula.
//
// Automático por padrão: começa em Média; o aparelho fraco (ou com economia de dados) começa em Leve;
// o forte sobe para Alta depois de provar que aguenta (quadros rápidos numa partida). No meio da partida
// o nível só desce, nunca sobe, para não ficar piscando. Quem quiser escolhe na Home ("Gráficos").

import { prefs } from '../estado';

export type Nivel = 'alta' | 'media' | 'leve';
export type Escolha = 'auto' | Nivel;

export interface Qualidade {
  nivel: Nivel;
  /** Teto da densidade de pixels do canvas (nitidez × custo de cada quadro). */
  dprMax: number;
  /** Torcida balançando (3 quadros pré-desenhados) e ola no gol. */
  torcidaViva: boolean;
  ola: boolean;
  /** Degradê na pele e no calção dos bonecos (senão, cor chapada). */
  degrade: boolean;
  /** Tremida da tela no gol. */
  tremida: boolean;
  /** Replay de TV do gol e o zoom lento dentro dele. */
  replay: boolean;
  zoomNoReplay: boolean;
}

export const NIVEIS: Record<Nivel, Qualidade> = {
  alta: { nivel: 'alta', dprMax: 2, torcidaViva: true, ola: true, degrade: true, tremida: true, replay: true, zoomNoReplay: true },
  media: { nivel: 'media', dprMax: 1.5, torcidaViva: true, ola: false, degrade: true, tremida: true, replay: true, zoomNoReplay: false },
  leve: { nivel: 'leve', dprMax: 1, torcidaViva: false, ola: false, degrade: false, tremida: false, replay: false, zoomNoReplay: false },
};

export const NOME_DO_NIVEL: Record<Nivel, string> = { alta: 'Alta', media: 'Média', leve: 'Leve' };

// ---------- decisão (pura, testada) ----------

/** O que o navegador conta do aparelho. Campo ausente = o navegador não diz (iPhone, Firefox). */
export interface Sinais {
  nucleos?: number;
  memoriaGB?: number;
  economiaDeDados?: boolean;
}

/** Nível de partida pelo aparelho: fraco ou com economia de dados = Leve; o resto começa em Média. */
export function nivelInicial(s: Sinais): Nivel {
  if (s.economiaDeDados) return 'leve';
  if ((s.nucleos !== undefined && s.nucleos <= 4) || (s.memoriaGB !== undefined && s.memoriaGB <= 2)) return 'leve';
  return 'media';
}

/** Aparelho que pode subir para Alta, se os quadros confirmarem (o que o navegador não diz, não impede). */
export function podeSerAlta(s: Sinais): boolean {
  return !s.economiaDeDados && (s.nucleos ?? 6) >= 6 && (s.memoriaGB ?? 4) >= 4;
}

/** Quadros medidos antes de decidir (os primeiros, de montagem, ficam de fora). */
export const QUADROS_PARA_DECIDIR = 90;
const QUADROS_IGNORADOS = 30;
/** Intervalo médio entre quadros acima disto (menos de ~45 por segundo) = desce um nível. */
export const LENTO_MS = 22;
/** Intervalo médio abaixo disto (~60 por segundo ou mais) e pouco trabalho por quadro = pode subir. */
export const RAPIDO_MS = 17.5;
export const TRABALHO_LEVE_MS = 6;

/**
 * Veredito de uma janela de quadros: 'desce', 'sobe' (só vale para a próxima partida) ou 'fica'.
 * `intervalo` é o tempo entre quadros (ms) e `trabalho`, o tempo do desenho em cada quadro.
 */
export function avaliarQuadros(intervalo: number, trabalho: number): 'desce' | 'sobe' | 'fica' {
  if (intervalo > LENTO_MS) return 'desce';
  if (intervalo < RAPIDO_MS && trabalho < TRABALHO_LEVE_MS) return 'sobe';
  return 'fica';
}

export const abaixo = (n: Nivel): Nivel => (n === 'alta' ? 'media' : 'leve');

// ---------- estado no aparelho ----------

const CHAVE_AUTO = 'gdt:qualidade-auto';

function sinaisDoAparelho(): Sinais {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return { nucleos: nav.hardwareConcurrency || undefined, memoriaGB: nav.deviceMemory, economiaDeDados: nav.connection?.saveData };
}

function lerAuto(): Nivel | null {
  try {
    const v = localStorage.getItem(CHAVE_AUTO);
    return v === 'alta' || v === 'media' || v === 'leve' ? v : null;
  } catch {
    return null;
  }
}

function gravarAuto(n: Nivel): void {
  try {
    localStorage.setItem(CHAVE_AUTO, n);
  } catch {
    // aba anônima: decide de novo na próxima visita
  }
}

function nivelAutomatico(): Nivel {
  const s = sinaisDoAparelho();
  // Economia de dados manda sempre; senão vale o que as partidas anteriores mostraram.
  if (s.economiaDeDados) return 'leve';
  return lerAuto() ?? nivelInicial(s);
}

function escolhaDev(): Nivel | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null;
  const pedido = new URLSearchParams(location.search).get('qualidade');
  return pedido === 'alta' || pedido === 'media' || pedido === 'leve' ? pedido : null;
}

export const escolha = (): Escolha => prefs.get().qualidade ?? 'auto';

let atual: Qualidade = NIVEIS[escolhaDev() ?? (escolha() === 'auto' ? nivelAutomatico() : (escolha() as Nivel))];
const ouvintes = new Set<() => void>();

export const qualidade = (): Qualidade => atual;

/** Troca o nível agora (as cenas abertas se refazem pelo `aoMudarQualidade`). */
export function definirQualidade(n: Nivel): void {
  if (atual.nivel === n) return;
  atual = NIVEIS[n];
  ouvintes.forEach((fn) => fn());
}

/** Escolha da pessoa na Home: automático ou um nível fixo. */
export function escolherQualidade(e: Escolha): void {
  prefs.set({ qualidade: e });
  definirQualidade(e === 'auto' ? nivelAutomatico() : e);
}

/** As cenas abertas se inscrevem para refazer o canvas quando o nível muda; devolve o cancelamento. */
export function aoMudarQualidade(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

// ---------- medição durante a partida ----------

/**
 * Medidor de uma partida: cada cena chama `quadro(trabalhoMs)` uma vez por quadro. No automático,
 * depois de uma janela de quadros: lento desce um nível na hora; rápido num aparelho que pode ser
 * Alta grava Alta para a próxima partida.
 */
export function medirQuadros(relogio: () => number = () => performance.now()) {
  let ultimo = -1;
  let n = 0;
  let somaIntervalo = 0;
  let somaTrabalho = 0;
  return {
    quadro(trabalhoMs: number): void {
      const agora = relogio();
      const dt = ultimo < 0 ? 0 : agora - ultimo;
      ultimo = agora;
      // Aba em segundo plano ou pausa longa: recomeça a contagem.
      if (dt > 250) {
        n = 0;
        somaIntervalo = 0;
        somaTrabalho = 0;
        return;
      }
      n++;
      if (n <= QUADROS_IGNORADOS) return;
      somaIntervalo += dt;
      somaTrabalho += trabalhoMs;
      const contados = n - QUADROS_IGNORADOS;
      if (contados < QUADROS_PARA_DECIDIR) return;
      const veredito = avaliarQuadros(somaIntervalo / contados, somaTrabalho / contados);
      n = QUADROS_IGNORADOS;
      somaIntervalo = 0;
      somaTrabalho = 0;
      if (escolha() !== 'auto' || escolhaDev()) return;
      if (veredito === 'desce' && atual.nivel !== 'leve') {
        const novo = abaixo(atual.nivel);
        gravarAuto(novo);
        definirQualidade(novo);
      } else if (veredito === 'sobe' && atual.nivel === 'media' && podeSerAlta(sinaisDoAparelho())) {
        gravarAuto('alta');
      }
    },
  };
}
