# Guerra de Torcidas

Minigames de futebol de 30 segundos em que cada ponto vai para o placar da sua torcida.
Publicado em https://torcida.kauewalter.com.br.

Regras do jogo e decisões de produto: [`docs/jogo.md`](docs/jogo.md).

## Rodar localmente

```bash
npm install
npm run dev
```

- `npm test` — testes da lógica pura
- `npm run build` — gera `dist/`

Cada push na `main` publica no GitHub Pages pelo workflow em `.github/workflows/deploy.yml`.
