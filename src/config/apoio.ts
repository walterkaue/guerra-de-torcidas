// Configuração do "Apoie o jogo" (docs/jogo.md, seção 7.5). É o único arquivo que se edita para ligar o apoio.
// As duas informações abaixo são públicas (link de campanha e chave Pix), então podem ficar no repositório.

export const APOIO = {
  /** Interruptor geral. Desligado, nenhum botão aparece e #apoie volta para a Home. */
  apoio_ligado: false,
  /** Link da campanha de apoio mensal (APOIA.se). Tem que começar com https://. Vazio = sem o botão. */
  linkApoioMensal: '',
  /** Chave Pix (e-mail, celular, CPF/CNPJ ou chave aleatória). Vazia = sem o bloco do Pix. */
  chavePix: '',
};
