# classical-drill-game---latim-e-grego-cl-ssico

Jogo offline de navegador para praticar formas do grego clássico por meio de baralhos altamente configuráveis.

## Desenvolvimento

```sh
npm install
npm test
```

O build valida o catálogo versionado antes de compilar a PWA.

Para regenerar o catálogo a partir da planilha de referência:

```sh
npm run catalog:generate -- "/caminho/para/forms.xlsx" src/generated/catalog.json
npm run catalog:validate
```

A planilha é uma entrada de desenvolvimento e não faz parte do pacote executado no navegador.
