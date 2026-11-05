// Vestiário sem servidor (só em desenvolvimento): /?vestiarioFalso liga a fonte falsa e abre a tela.
// &nivel=estreante|reserva|titular|craque|idolo|lenda · &ouros=N · &aquecido · &erroAoSalvar (lidos por fonteFalsa)
// &semMovimento (sem o pulinho) · &aba=corpo|cabelo|camisa|acessorio|fundo (a tela lê) · &time=<id> (a tela lê,
// só na memória: não grava prefs).

import { definirFonteDoVestiario } from '../telas/vestiario/fonte';
import { fonteFalsa } from '../telas/vestiario/fonteFalsa';

export function ligarVestiarioFalso(params: URLSearchParams): void {
  if (params.has('semMovimento')) document.documentElement.dataset.semMovimento = '1';
  definirFonteDoVestiario(fonteFalsa(params));
}
