// "Meu boneco em campo" (docs/jogo.md 14.5): a cópia local do interruptor do Perfil; ausente = ligado. Toda leitura do
// servidor a sobrescreve (bonecoPintar.ts) e o desenho dos jogos lê na hora (bonecoEmCampoCena.ts). Fica fora do
// bundle inicial: só o Perfil, os jogos e o bonecoPintar (todos por import()) usam.

const CHAVE_EM_CAMPO = 'gdt:boneco-em-campo';

export function emCampoLigado(): boolean {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_EM_CAMPO) ?? 'null') !== false;
  } catch {
    return true;
  }
}

export function guardarEmCampo(ligado: boolean): void {
  try {
    localStorage.setItem(CHAVE_EM_CAMPO, JSON.stringify(ligado));
  } catch {
    // aparelho sem espaço ou em modo privado: só não lembra
  }
}
