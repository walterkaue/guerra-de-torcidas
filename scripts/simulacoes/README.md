# Simulador de uso

Personas do público jogando em aparelhos, telas e navegadores diferentes (Playwright: Chromium, WebKit e Firefox), com print de cada passo e conferências automáticas. Não faz parte do `npm test` nem do `tsc`.

## Rodar

```bash
npm run simular                                   # todo mundo
npm run simular -- --persona=ze                   # uma persona
npm run simular -- --persona=ze,duda --alvo=producao   # rodada curta no site no ar (só GET)
npm run simular:consolidar                         # junta os achados da rodada de hoje
```

Outras opções: `--aparelho=<id>` (um aparelho só), `--porta=5291` (porta do Vite do simulador), `--rodada=AAAA-MM-DD` (nome da pasta).

Prints e resultados: `prints/simulacoes/<rodada>/<persona>/<aparelho>/` (fora do Git). O consolidado fica em `prints/simulacoes/<rodada>/consolidado.md`.

## Nada vai para o banco de verdade

- **Dados falsos (padrão):** o simulador sobe um Vite próprio com `VITE_SUPABASE_URL` e a chave trocadas por um projeto que não existe, e confere no módulo servido que o endereço de produção não aparece. No navegador, toda requisição que não é do próprio Vite é abortada (`nucleo/rede.mjs`): Supabase, Turnstile, WhatsApp, qualquer site. WebSocket só fala com o HMR local, o Service Worker fica bloqueado e o `sendBeacon` para fora não sai. Tela que depende do servidor vira "não simulável".
- **Site no ar (`--alvo=producao`):** só passa GET ao próprio site e GET de leitura em `/rest/v1/` do Supabase. POST, PATCH, PUT, DELETE, OPTIONS, `/auth/`, `/rpc/`, `/functions/`, o Turnstile e qualquer outro site são abortados. Nenhuma jornada de produção escolhe time na tela nem começa partida.
- Worker e SharedWorker ficam desligados, porque passariam por fora do `route` (revisão de 06/11/2026).
- Cada resposta recebida é auditada à parte da decisão: se algo responder de fora da lista, a sessão marca `furos`, o comando para a rodada inteira e sai com código 2.
- O pacote é conferido duas vezes: nos arquivos (nenhum outro projeto `*.supabase.co`) e no que a porta está servindo.

## Escrever uma persona

Um arquivo em `personas/<id>.mjs`:

```js
export default {
  id: 'ze', ordem: 1, nome: 'Zé', descricao: '…', time: 'Flamengo',
  menor: false,                                   // true: confere que nenhuma oferta 18+ aparece
  toque: { erroPx: 4, demoraMs: 80 },             // mira do dedo e demora para decidir
  gesto: { escalaForca: 1.6, duracaoMs: 150, tremorPx: 1 }, // arraste longo e rápido = chuta forte
  aparelhos: ['android-entrada'],                 // ids de nucleo/aparelhos.mjs
  async jornada(s, { aparelho }) {
    await s.passo('abre o link do X1', () => s.abrir('/?homeFalsa&penaltiFalso&d=abcdefgh', { esperarPor: 'button' }));
  },
};
```

O que a sessão `s` oferece (`nucleo/sessao.mjs`):

| Método | Para quê |
|---|---|
| `s.abrir(caminho, { esperarPor, limiteMs, rotulo })` | Abre com as flags e mede até `esperarPor` aparecer |
| `s.passo(nome, fn, { tela, fichaFactual, principalNaDobra, axe, paginaInteira })` | Roda o passo, tira print e confere a tela; erro vira achado |
| `s.conferir(nome, opções)` | Print e conferências sem ação |
| `s.tocar(alvo, { semMudancaOk, precisao })` | Toque com a mira da persona; anota "não responde" se nada mudar em 2 s |
| `s.tocarDuplo(alvo)` | Dois toques rápidos |
| `s.arrastar(alvo, de, para, { duracaoMs, passos, curva, semEscala })` | Arraste no canvas em frações [x, y] da caixa; devolve as tarefas longas do arraste |
| `s.tecla('Tab')`, `s.percorrerComTab()`, `s.foco()` | Teclado e foco visível |
| `s.conferirParado(onde)` | Movimento reduzido: anota animação rodando ou canvas mudando sozinho |
| `s.conferirCabeNaTela(alvo, nome)` | O bloco cabe inteiro na altura da tela |
| `s.offline(true/false)`, `s.tamanho(l, a)` | Rede caindo; girar ou dobrar o aparelho |
| `s.semear({ chave: valor })` | localStorage antes da primeira página (aparelho com histórico) |
| `s.novaAba(caminho)`, `s.usarAba(p)` | Segunda aba no mesmo aparelho |
| `s.compartilhados()` | O que foi para o compartilhar nativo (stub no aparelho de toque) |
| `s.achado({...})`, `s.naoSimulavel(tela, motivo)`, `s.medir(rotulo, ms, limite)` | Registro manual |
| `s.page`, `s.contexto`, `s.ehChromium`, `s.cdp` | Acesso direto ao Playwright |

## Conferências automáticas em cada passo

Erros (console, exceção, requisição que falhou fora as bloqueadas, tela em branco, carregamento preso por 10 s, toque sem resposta), layout (rolagem para o lado, elemento saindo da tela, texto cortado, alvo coberto por barra fixa, alvo menor que 44 × 44, texto menor que 12 px, botão principal abaixo da dobra no iPhone SE), regras do `docs/jogo.md` (botões lado a lado do mesmo tamanho, um só amarelo, contraste pelo axe, palavras proibidas da seção 7, urgência e sequência da seção 13, ofertas 18+ para menor, nome de pessoa real fora de ficha factual) e o axe completo (WCAG 2.1 AA).

## Limites

WebKit no Windows não é o Safari do iPhone; trocar o user agent muda só o que o jogo detecta. A fonte do sistema em 130 % e 150 % é uma aproximação (cada elemento cresce uma vez). Vibração, folha de compartilhar, aviso de domingo, Turnstile e navegadores embutidos só no celular de verdade: ver a seção "Só no celular de verdade" do relatório.
