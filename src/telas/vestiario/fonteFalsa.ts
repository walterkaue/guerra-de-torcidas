// Fonte falsa do Vestiário, só para dev (?vestiarioFalso): monta o estado pelos parâmetros do endereço.
// &nivel=estreante|reserva|titular|craque|idolo|lenda · &ouros=N · &aquecido · &erroAoSalvar

import { NIVEIS } from '../../jogo/carreira';
import { pecasLiberadas, validar, type MedalhaDoItem, type Vestimenta } from '../../jogo/vestiario';
import type { EstadoDaTela } from '../../jogo/vestiarioTela';
import type { FonteDoVestiario } from './fonte';

const NIVEIS_DO_ENDERECO = ['estreante', 'reserva', 'titular', 'craque', 'idolo', 'lenda'] as const;

/** XP de mentira dentro de cada nível (Titular dá 1.770, o exemplo da folha). */
const XP_FALSO = [40, 420, 1_770, 7_300, 21_000, 31_500];

/** Estado de mentira: sem ouros, um lance com 3 gols e uma disputa com 4 (a folha da medalha mostra quanto falta). */
export function estadoFalso(params: URLSearchParams): EstadoDaTela {
  const pedido = (params.get('nivel') ?? 'estreante').toLowerCase() as (typeof NIVEIS_DO_ENDERECO)[number];
  const nivel = Math.max(0, NIVEIS_DO_ENDERECO.indexOf(pedido));
  const ouros = Math.max(0, Math.min(20, Number.parseInt(params.get('ouros') ?? '0', 10) || 0));
  const medalhas: MedalhaDoItem[] = [
    { tipo: 'lance', gols: 3, recriados: 0, vitorias: 0, daSelecao: false },
    { tipo: 'disputa', gols: 4, recriados: 0, vitorias: 0, daSelecao: false },
  ];
  for (let i = 0; i < ouros; i++) medalhas.push({ tipo: 'lance', gols: 50, recriados: 10, vitorias: 0, daSelecao: false });
  return { nivel, xp: Math.max(XP_FALSO[nivel], NIVEIS[nivel].xp), medalhas, aquecido: params.has('aquecido') };
}

const INICIAL: Vestimenta = {
  v: 1,
  corpo: 'h',
  pele: 2,
  cabelo: 'curto',
  corCabelo: 0,
  camisa: 'uni1',
  numero: '10',
  cabeca: 'nenhum',
  punho: 'nenhum',
  braco: 'nenhum',
  peito: 'nenhum',
  pescoco: 'nenhum',
  chuteira: 'neutra',
  pose: 'parado',
  fundo: 'gramado',
  moldura: 'nenhuma',
};

/** A gravada de mentira vale para a aba inteira (o vestiário, a Home e o Perfil falsos veem a mesma). */
let gravadaNaAba: Vestimenta | null = null;

export function fonteFalsa(params: URLSearchParams): FonteDoVestiario {
  const estado = estadoFalso(params);
  const liberadas = pecasLiberadas(estado);
  let gravada = validar(gravadaNaAba ?? INICIAL, liberadas);
  const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
  return {
    async ler() {
      await espera(150);
      return { vestimenta: { ...gravada }, liberadas: [...liberadas], estado };
    },
    async salvar(v) {
      await espera(400);
      if (params.has('erroAoSalvar')) throw new Error('falso: erro ao salvar');
      gravada = validar(v, liberadas);
      gravadaNaAba = gravada;
      return { ...gravada };
    },
  };
}
