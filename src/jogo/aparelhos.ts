// Textos do código do torcedor e da lista de aparelhos ligados (docs/jogo.md, seção 14.1). Só do celular.

/** Uma sessão da conta, como `meus_aparelhos()` devolve. Sem IP: o servidor nunca manda. */
export interface Aparelho {
  id: string;
  criado_em: string;
  usado_em: string;
  user_agent: string | null;
  este: boolean;
}

export const AVISO_DO_CODIGO = 'Não mande esse código pra ninguém. Quem tiver ele entra na sua conta.';

/** "Celular Android · Chrome", "iPhone · Safari", "Computador Windows · Edge". Só com o que o navegador conta. */
export function rotuloDoAparelho(ua: string | null): string {
  if (!ua) return 'Aparelho';
  const sistema = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? /Mobile/.test(ua)
          ? 'Celular Android'
          : 'Tablet Android'
        : /Windows/.test(ua)
          ? 'Computador Windows'
          : /Macintosh|Mac OS X/.test(ua)
            ? 'Mac'
            : /CrOS/.test(ua)
              ? 'Chromebook'
              : /Linux/.test(ua)
                ? 'Computador Linux'
                : 'Aparelho';
  const navegador = /EdgA?\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox\/|FxiOS/.test(ua)
          ? 'Firefox'
          : /CriOS|Chrome\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : '';
  return navegador ? `${sistema} · ${navegador}` : sistema;
}

const diaDeBrasilia = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

/** "usado hoje", "usado ontem", "usado há 3 dias", "usado em 12/10/2026". */
export function quandoUsou(iso: string, agora = new Date()): string {
  const dias = Math.round((Date.parse(diaDeBrasilia(agora)) - Date.parse(diaDeBrasilia(new Date(iso)))) / 86_400_000);
  if (dias <= 0) return 'usado hoje';
  if (dias === 1) return 'usado ontem';
  if (dias < 7) return `usado há ${dias} dias`;
  return `usado em ${new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
}

/** Contador do código: "9:41". */
export function tempoRestante(expiraEm: string, agora = Date.now()): string {
  const s = Math.max(0, Math.ceil((Date.parse(expiraEm) - agora) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** O que dizer para cada código de erro da função codigo-torcedor e das funções de aparelhos. */
export function mensagemDoCodigo(erro: string): string {
  switch (erro) {
    case 'codigo_invalido':
      return 'Código errado ou vencido. Confere no outro aparelho e tenta de novo.';
    case 'muitas_tentativas':
      return 'Muita tentativa errada. Espera 15 minutos e tenta de novo.';
    case 'pausa_geral':
      return 'A entrada por código deu uma pausa. Tenta de novo em alguns minutos.';
    case 'proprio':
      return 'Esse código é deste aparelho mesmo. Digita ele no outro aparelho.';
    case 'muitos_codigos':
      return 'Já saiu código demais hoje. Espera um pouco e gera outro.';
    case 'sem_time':
      return 'Escolhe seu time primeiro. Depois dá pra jogar em outro aparelho.';
    case 'conta_nao_anonima':
      return 'Esta conta não usa código.';
    case 'captcha':
    case 'captcha_indisponivel':
      return 'Não deu pra conferir o aparelho agora. Tenta de novo daqui a pouco.';
    case 'entrada_falhou':
      return 'A conta foi juntada, mas este aparelho não entrou. Gera outro código no outro aparelho e digita aqui.';
    case 'este_aparelho':
      return 'Este é o aparelho que você está usando.';
    case 'sessao_encerrada':
      return 'Este aparelho foi desconectado da conta.';
    case 'rede':
    case 'tempo_esgotado':
    case 'sem_conexao':
      return 'Sem conexão. Confere a internet e tenta de novo.';
    default:
      return 'Deu ruim aqui. Tenta de novo daqui a pouco.';
  }
}
