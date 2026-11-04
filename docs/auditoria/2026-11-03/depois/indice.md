# Depois do Grafismo de TV (rota A), 03/11/2026

Prints das telas depois da rota A (`docs/jogo.md` 14.2, `docs/visual.md` 4.6). Todas em **390 × 844, escala 2**; as de página inteira ficam mais altas. Os números do nome seguem a auditoria (`../indice.md`): `44` aqui é o depois do `../44-penaltis-resultado.png`.

## Como foram feitos

- Vite local do worktree, Chrome sem cabeça com toque emulado e **movimento reduzido** (sem confete nem contagem, para o print sair igual sempre).
- O Supabase apontava para um endereço local que não responde: nada tocou produção. Os dados vêm dos modos de dev do jogo: `?homeFalsa` (Home, Perfil, Ranking e, com `&crava=aberta|encerrada|vazia|erro`, o Crava), `&semRanking`, `&rankingErro`, `&rankingDemora`, `?temporadaFalsa`, `?lancesFalsos`, `?provaFalsa`, `?diaFalso=goias`.
- Na página inteira, a barra de baixo fica no pé da imagem (a altura da tela é a da página).
- Time Flamengo, sem dado pessoal. Datas, posições e números são de mentira.

## Comparações lado a lado

`comparacao-44-penaltis-resultado.png`, `comparacao-14-perfil-com-carreira.png`, `comparacao-16-ranking-semana-campeao.png` e `comparacao-17-ranking-semana-maior-torcida.png`.

## Não capturadas de novo (não mudaram)

A partida em canvas (39 a 43, 46 a 48, 51 a 54), os tutoriais "Como jogar" (a fase 2), os cards de compartilhar (45, 50, 56, 63, 68, 76, 78), o aviso de partida sem valer pontos (85), o "Seja sócio" aberto (32) e o painel `#admin`.

## Arquivos extras

- `11b-selo-pre-temporada-aberto.png`: o selo único aberto.
- `14b-perfil-com-apelido.png`: o cabeçalho do Perfil com apelido.
- `44b-penaltis-resultado-derrota-card.png`: derrota com o Card aberto.
- `49-55-lances-resultado.png`: resultado de Faltas e Cara a cara, os dois com o mesmo layout.
- `71b-crava-rodada-rolada.png`: a faixa "Aqui é só resenha" grudada no topo ao rolar.
- `77b` e `77c`: Crava vazio e com erro.
- `90` a `92`: Feedback, Jogar em outro aparelho e Entrar com código.
