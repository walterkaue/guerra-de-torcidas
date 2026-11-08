// O voltar do celular e do navegador fecha a folha aberta antes de sair da tela (S08, como o vestiário em
// telas/vestiario/voltar.ts). Abrir a folha empurra um estado no history, sem mudar o endereço (o hash da rota fica,
// então o roteador não percebe). O voltar consome esse estado e fecha a folha. Fechar tocando (✕, fora, Esc, um
// botão) desfaz o estado com history.back(), sem fechar de novo.
//
// Quem fecha para ir a outra tela (o "Jogar" da disputa muda o hash) passa `depois`: a troca só sai quando o
// history.back() já voltou. Se a troca viesse antes, o back atrasado desfaria a navegação nova.

export interface FolhaNoHistorico {
  /** Fecha tocando: desmonta a folha, desfaz o estado e, já de volta, roda `depois`. Chamar de novo não faz nada. */
  fechar(depois?: () => void): void;
}

/** Quanto esperar o popstate do history.back() antes de seguir mesmo assim (navegador que não avisa). */
const ESPERA_DO_BACK_MS = 400;

let proximoId = 0;

export function folhaNoHistorico(desmontar: () => void): FolhaNoHistorico {
  const id = `folha-${++proximoId}`;
  let aberta = true;
  const nossoEstado = () => (history.state as { folha?: unknown } | null)?.folha === id;

  const aoVoltar = () => {
    // O voltar consumiu o nosso estado: só desmonta.
    if (!aberta) return;
    aberta = false;
    window.removeEventListener('popstate', aoVoltar);
    desmontar();
  };

  try {
    history.pushState({ ...(history.state ?? {}), folha: id }, '');
    window.addEventListener('popstate', aoVoltar);
  } catch {
    // sem history (teste ou navegador restrito): a folha fecha só tocando
  }

  return {
    fechar(depois) {
      if (!aberta) {
        depois?.();
        return;
      }
      aberta = false;
      window.removeEventListener('popstate', aoVoltar);
      desmontar();
      if (!nossoEstado()) {
        // Alguém já empurrou outra coisa por cima (ou o history não existe): voltar desfaria a navegação dele.
        depois?.();
        return;
      }
      if (!depois) {
        history.back();
        return;
      }
      let foi = false;
      const seguir = () => {
        if (foi) return;
        foi = true;
        window.removeEventListener('popstate', seguir);
        clearTimeout(t);
        depois();
      };
      window.addEventListener('popstate', seguir);
      const t = setTimeout(seguir, ESPERA_DO_BACK_MS);
      history.back();
    },
  };
}
