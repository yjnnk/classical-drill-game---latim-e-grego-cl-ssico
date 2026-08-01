# Classical Drill Game: Grego e Latim

Jogo offline de navegador para praticar formas do grego clássico por meio de baralhos altamente configuráveis.

## Desenvolvimento

```sh
npm install
npm test
```

O build da PWA valida o catálogo versionado antes de compilar. A geração é uma
etapa de desenvolvimento separada e reproduzível porque a planilha de referência
não é distribuída com o jogo.

Para regenerar o catálogo a partir da planilha de referência:

```sh
npm run catalog:generate -- "/caminho/para/forms.xlsx" src/generated/catalog.json
npm run catalog:validate
```

A planilha é uma entrada de desenvolvimento e não faz parte do pacote executado no navegador.
