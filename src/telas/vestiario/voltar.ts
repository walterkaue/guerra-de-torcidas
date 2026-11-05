// O voltar do Android no vestiário. A tela empurra um estado no history ao abrir, e cada folha (peça trancada,
// "Sair sem salvar?") empurra mais um: o voltar fecha primeiro a folha de cima; sem folha, é o voltar da tela.
// Fechar tocando (✕, fora, botão) desfaz o estado empurrado com history.back(), sem disparar o tratamento de novo.

export interface Voltar {
  /** Abre uma camada (folha). `fechar` desmonta a folha. Devolve o que fecha tocando: desmonta e desfaz o estado. */
  camada(fechar: () => void): () => void;
  /** O voltar da tela já consumiu o estado (ex.: a pergunta "Sair sem salvar?" fica e a tela precisa dele de volta). */
  restaurarBase(): void;
  /** Saindo da tela por um botão: devolve o history ao ponto de antes e solta o ouvinte. */
  sair(): void;
  /** Limpeza da tela (a troca de tela veio de outro lugar): só solta o ouvinte. */
  desligar(): void;
}

export function criarVoltar(aoVoltarDaTela: () => void): Voltar {
  const pilha: (() => void)[] = [];
  let ignorar = 0;
  let base = false;
  let ligado = true;
  const empurrar = () => history.pushState({ vestiario: true }, '');

  const aoPop = () => {
    if (ignorar > 0) {
      ignorar--;
      return;
    }
    const folha = pilha.pop();
    if (folha) {
      folha();
      return;
    }
    base = false;
    aoVoltarDaTela();
  };
  window.addEventListener('popstate', aoPop);
  empurrar();
  base = true;

  const soltar = () => {
    ligado = false;
    window.removeEventListener('popstate', aoPop);
  };

  return {
    camada(fechar) {
      empurrar();
      pilha.push(fechar);
      return () => {
        const i = pilha.lastIndexOf(fechar);
        if (i < 0) return;
        pilha.splice(i, 1);
        fechar();
        if (!ligado) return;
        ignorar++;
        history.back();
      };
    },
    restaurarBase() {
      if (base || !ligado) return;
      empurrar();
      base = true;
    },
    sair() {
      const voltas = pilha.length + (base ? 1 : 0);
      pilha.length = 0;
      base = false;
      soltar();
      if (voltas > 0) history.go(-voltas);
    },
    desligar: soltar,
  };
}
