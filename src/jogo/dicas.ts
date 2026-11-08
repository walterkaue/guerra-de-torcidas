// Dicas na faixa de instrução (docs/jogo.md, seção 14.4): aparecem na hora do erro, no máximo 2 vezes cada
// por aparelho e 1 por lance. Puro: quem guarda no aparelho é telas/dicas.ts.

export const DICAS = {
  // Pênaltis
  pen_sem_chute: 'Arraste pra cima, na direção do gol.',
  pen_forte_demais: 'Forte demais vai por cima. Arraste mais curto.',
  pen_fraco: 'Fraquinho, o goleiro pega. Arraste mais longo.',
  pen_sem_efeito: 'Curve o fim do arraste pra bola fazer curva.',
  pen_cavadinha: 'Arraste curtinho e reto é cavadinha.',
  pen_cavadinha_meio: 'Cavadinha não engana goleiro parado no meio.',
  pen_defesa_sem_toque: 'Toque no gol antes do chute sair.',
  pen_altura: 'Lado certo! Agora acerte a altura.',
  pen_morte_subita: 'Empatou! Morte súbita: um de cada.',
  pen_par_ou_impar: 'Escolha par ou ímpar e um número.',
  // Faltas e cara a cara
  lan_barreira: 'Na barreira! Mire no canto ou suba a bola.',
  lan_barreira_de_novo: 'Força média faz a bola subir e cair.',
  lan_goleiro_no_meio: 'Goleiro tava ali. Mire nos cantos.',
  lan_cara_a_cara: 'Escolha o canto ou tente a cavadinha.',
  lan_goleiro_saiu: 'Goleiro saiu do gol: cavadinha encobre.',
  lan_cavadinha_sem_sair: 'Cavadinha só encobre goleiro que saiu.',
  // Regra nova (seção 14.7, desde 08/11/2026): o limite soma pênaltis, faltas e cara a cara.
  lan_dez_valendo: 'Hoje as 10 valendo já foram. Treine à vontade.',
  lan_recriar_oito: 'Acerte a área marcada e recrie o lance: +8.',
  // Prova de Boleiro
  prova_parar_ou_seguir: 'Parar leva tudo o que juntou. Seguir arrisca.',
  prova_primeiro_erro: 'Errou, mas a prova segue. Restam 2 vidas.',
  prova_ultima_vida: 'Última vida: errou, acaba e leva 75%.',
  prova_ajuda: 'Travou? Use uma ajuda. O relógio não para.',
  prova_tempo: 'Acabou o tempo: conta como erro.',
  prova_arquibancada: 'Pouca gente respondeu: vale como Tira uma.',
  // Time do Dia
  dia_comeco: 'Adivinhe o clube secreto em 6 chutes.',
  dia_cores: 'Verde é igual. Amarelo é perto.',
  dia_seta: '↑ o secreto é maior; ↓ é menor.',
  dia_cores_amarelo: 'Cores em amarelo: uma bate.',
  dia_fechar: 'Comece fechando o estado e a série.',
  dia_busca: 'Só clubes das Séries A, B e C de 2026.',
  // Crava a Rodada
  crava_mudar: 'Dá pra mudar até a bola rolar.',
  crava_estrela: 'A estrela dobra os pontos de 1 jogo.',
  crava_certeza_travada: 'A certeza travou: a rodada já começou.',
  crava_ved: 'Posição, pontos e os últimos 5 jogos.',
  crava_rolando: 'Bola rolando: veja como a torcida cravou.',
  crava_rodada_fechada: 'Rodada fechada! Mande o resultado no grupo.',
} as const;

export type IdDica = keyof typeof DICAS;

/** Quantas vezes cada dica aparece no máximo, por aparelho. */
export const MAX_POR_APARELHO = 2;

/** Dicas que aparecem sempre, sem contar (o começo da morte súbita). */
export const SEMPRE: ReadonlySet<IdDica> = new Set<IdDica>(['pen_morte_subita']);

/** O que o aparelho guarda (gdt:prefs.dicas). */
export interface EstadoDasDicas {
  /** Quantas vezes cada dica já apareceu. */
  vistas?: Partial<Record<IdDica, number>>;
  /** Contadores de gatilho que atravessam partidas (ex.: partidas de pênaltis jogadas, barreiras). */
  marcos?: Record<string, number>;
}

export function podeMostrar(estado: EstadoDasDicas, id: IdDica, jaTeveDicaNesteLance: boolean): boolean {
  if (jaTeveDicaNesteLance) return false;
  if (SEMPRE.has(id)) return true;
  return (estado.vistas?.[id] ?? 0) < MAX_POR_APARELHO;
}

export function marcarVista(estado: EstadoDasDicas, id: IdDica): EstadoDasDicas {
  if (SEMPRE.has(id)) return estado;
  return { ...estado, vistas: { ...estado.vistas, [id]: (estado.vistas?.[id] ?? 0) + 1 } };
}

/** Soma 1 num contador de gatilho e devolve o estado novo e o valor depois da soma. */
export function contarMarco(estado: EstadoDasDicas, marco: string): { estado: EstadoDasDicas; valor: number } {
  const valor = (estado.marcos?.[marco] ?? 0) + 1;
  return { estado: { ...estado, marcos: { ...estado.marcos, [marco]: valor } }, valor };
}

/**
 * Controle de uma tela de jogo: 1 dica por lance, no máximo 2 vezes cada por aparelho.
 * `ler` e `gravar` vêm de fora (telas/dicas.ts usa o gdt:prefs; o teste usa memória).
 */
export interface Dicas {
  /** Texto da dica, se ela pode aparecer agora (já conta como vista); null se não pode. */
  pedir(id: IdDica): string | null;
  /** Começou outro lance (cobrança, defesa, pergunta, chute ou palpite): libera uma dica nova. */
  novoLance(): void;
  /** Soma 1 num contador que atravessa partidas e devolve o valor novo. */
  marco(nome: string): number;
  /** Valor de um contador, sem somar. */
  valorDoMarco(nome: string): number;
}

export function criarDicas(ler: () => EstadoDasDicas, gravar: (e: EstadoDasDicas) => void): Dicas {
  let nesteLance = false;
  return {
    pedir(id) {
      const estado = ler();
      if (!podeMostrar(estado, id, nesteLance)) return null;
      nesteLance = true;
      gravar(marcarVista(estado, id));
      return DICAS[id];
    },
    novoLance() {
      nesteLance = false;
    },
    marco(nome) {
      const r = contarMarco(ler(), nome);
      gravar(r.estado);
      return r.valor;
    },
    valorDoMarco(nome) {
      return ler().marcos?.[nome] ?? 0;
    },
  };
}
