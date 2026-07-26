# Issue tracker: GitHub

Issues e PRDs deste repositório vivem no GitHub Issues. Use o `gh` CLI para todas as operações e infira o repositório a partir do remoto Git configurado.

## Convenções

- Crie um issue com `gh issue create`.
- Leia corpo, comentários e labels com `gh issue view`.
- Liste issues abertos com `gh issue list`.
- Comente com `gh issue comment`.
- Aplique ou remova labels com `gh issue edit`.
- Feche com `gh issue close`.

## Pull requests como superfície de triagem

**PRs como superfície de solicitações: não.**

## Publicação

Quando um skill mandar publicar no issue tracker, crie um GitHub Issue.

## Dependências

Prefira dependências nativas do GitHub Issues. O identificador usado pela API de dependências é o `id` numérico do issue, não seu número visível nem seu `node_id`.

Quando dependências nativas não estiverem disponíveis, registre `Blocked by: #<n>` no corpo do issue. Um ticket está desbloqueado quando todos os bloqueadores estão fechados.

## Fronteira de trabalho

Um ticket pode ser iniciado quando todos os seus bloqueadores estiverem fechados e ele não estiver atribuído. Tickets produzidos por `to-tickets` já estão triados e não devem passar novamente por `triage`.
