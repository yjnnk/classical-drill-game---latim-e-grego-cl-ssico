# PRD — Jogo de formas do grego clássico

## Problem Statement

O estudante já memoriza paradigmas de grego clássico fora do aplicativo, inspirado pelo método Ranieri–Dowling, mas precisa de uma maneira rápida, agradável e altamente configurável de testar sua recordação. A planilha de referência contém muitas formas de substantivos, artigos, pronomes, adjetivos, particípios, verbos, numerais e terminologia, porém não oferece uma experiência de prática aleatória, filtrável e adequada a celular ou desktop.

O estudante precisa escolher com precisão o que deseja praticar — desde um paradigma inteiro até um recorte como “`κρήνη`, sem dual” ou “presente ativo indicativo de `λῡ́ω`” — e também combinar vários recortes. A prática não deve exigir digitação, impor tempo, punir erros, produzir rankings ou transformar o estudo em medição de desempenho. Ela deve funcionar offline, sem conta e sem enviar dados pessoais ou histórico a um servidor.

## Solution

Criar uma PWA responsiva e instalável, voltada a Google Chrome, que converta o conteúdo jogável da planilha fornecida em um catálogo interno, fixo, versionado e validado. O usuário monta **baralhos** reutilizáveis a partir de um ou mais **blocos de conteúdo**, cada um formado por um paradigma e seus filtros. Uma **rodada** executa uma fotografia imutável da configuração do baralho.

Cada pergunta apresenta exatamente três alternativas e nunca exige texto digitado. O baralho pode usar:

- **Análise:** uma forma grega é apresentada e o usuário escolhe sua análise morfológica completa.
- **Produção assistida:** uma análise completa é apresentada e o usuário escolhe a forma grega correspondente.
- **Misto:** cada item é perguntado em apenas uma das duas direções na rodada, com divisão aproximadamente equilibrada.
- **Correspondência:** numerais e terminologia usam o mesmo modelo bidirecional para associar grego e português.

O usuário pode realizar uma rodada de cobertura completa ou limitar a quantidade de itens. As perguntas aparecem aleatoriamente. O feedback é imediato e permanece até o usuário avançar manualmente. Um item errado retorna à fila, com espaçamento, quantas vezes forem necessárias até ser acertado. Não há nota nem histórico após a conclusão.

A experiência é local, sem conta e offline após a instalação inicial por URL estática. Apenas baralhos, preferências e uma eventual rodada ativa são persistidos no navegador. O usuário pode exportar e importar um backup JSON.

## User Stories

1. Como estudante de grego clássico, quero praticar formas já memorizadas, para testar minha recuperação sem substituir meu estudo dos paradigmas.
2. Como estudante, quero criar um baralho reutilizável, para não precisar configurar novamente o mesmo conteúdo antes de cada rodada.
3. Como estudante, quero nomear, duplicar, editar e excluir meus baralhos, para organizar diferentes objetivos de prática.
4. Como estudante, quero combinar vários paradigmas no mesmo baralho, para praticar conteúdos variados em uma única rodada.
5. Como estudante, quero adicionar vários recortes do mesmo paradigma, para montar combinações específicas sem perder flexibilidade.
6. Como estudante, quero navegar por categorias gramaticais, para localizar conteúdo sem conhecer a organização da planilha.
7. Como estudante, quero buscar por grego, transliteração ou tradução portuguesa, para encontrar rapidamente um paradigma.
8. Como estudante, quero que um paradigma comece com todas as formas incluídas, para configurar meu recorte principalmente por exclusão.
9. Como estudante, quero filtrar substantivos por caso e número, para praticar somente as formas que me interessam.
10. Como estudante, quero filtrar pronomes e adjetivos por caso, número e gênero, para controlar exatamente o escopo do desafio.
11. Como estudante, quero filtrar verbos finitos por verbo, tempo, voz, modo, pessoa e número, para praticar até mesmo uma única linha verbal.
12. Como estudante, quero filtrar particípios pelos traços aplicáveis, para praticar suas combinações de tempo, voz, caso, número e gênero.
13. Como estudante, quero incluir ou excluir o dual, para adaptar a prática ao conteúdo que estou estudando.
14. Como estudante, quero combinar conteúdos nominais, verbais e de correspondência, para montar um baralho realmente personalizado.
15. Como estudante, quero ver a quantidade de itens resultante enquanto edito um bloco, para compreender o efeito dos filtros.
16. Como estudante, quero ver um resumo legível de cada bloco, para revisar rapidamente a composição do baralho.
17. Como estudante, quero que sobreposições entre blocos sejam eliminadas, para não duplicar perguntas acidentalmente.
18. Como estudante, quero salvar um baralho incompleto como rascunho, para continuar a configuração depois.
19. Como estudante, quero receber avisos específicos quando um bloco não permitir três respostas distintas, para corrigir a configuração antes de jogar.
20. Como estudante, quero que apenas baralhos válidos possam iniciar rodadas, para nunca encontrar perguntas quebradas.
21. Como estudante, quero modelos copiáveis de `κρήνη` sem dual, presente ativo indicativo de `λῡ́ω` e um baralho misto, para aprender a configurar o aplicativo por exemplos.
22. Como estudante, quero escolher Análise, Produção assistida ou Misto, para variar a direção da recuperação.
23. Como estudante, quero responder sempre com uma das três alternativas, para praticar sem teclado.
24. Como estudante, quero que uma alternativa de análise contenha todos os traços aplicáveis, para identificar a forma em um único gesto.
25. Como estudante, quero que substantivos apresentem caso e número na resposta, para realizar a análise nominal completa.
26. Como estudante, quero que pronomes e adjetivos apresentem caso, número e gênero, para realizar a análise completa dessas classes.
27. Como estudante, quero que verbos finitos apresentem tempo, voz, modo, pessoa e número, para realizar a análise verbal completa.
28. Como estudante, quero que formas não finitas exibam somente os traços que realmente se aplicam, para não receber categorias artificiais.
29. Como estudante, quero que uma pergunta de produção apresente a análise e três formas gregas próximas, para recuperar mentalmente a forma sem digitá-la.
30. Como estudante, quero que numerais e terminologia possam ser perguntados nos dois sentidos, para praticar correspondências entre grego e português.
31. Como estudante, quero que as respostas gramaticais estejam em português, para não depender da terminologia inglesa ou latina da fonte.
32. Como estudante, quero que conteúdo excluído não apareça nem como pergunta nem como distração, para que o recorte do baralho seja uma fronteira real.
33. Como estudante, quero distrações da mesma família ou paradigma, para que as alternativas erradas sejam plausíveis.
34. Como estudante, quero que distrações priorizem diferenças em um único traço, para que as escolhas não sejam óbvias.
35. Como estudante, quero que verbos finitos sejam comparados com análises verbais finitas, para nunca receber alternativas semanticamente absurdas.
36. Como estudante, quero que paradigmas diferentes não forneçam distrações irrelevantes entre si, para manter o desafio linguisticamente coerente.
37. Como estudante, quero que os diacríticos completos da fonte sejam preservados, para ver a ortografia grega correta.
38. Como estudante, quero que uma alternativa errada não difira somente por acento, espírito, iota subscrito ou mácron, para que o MVP teste morfologia, não ortografia isolada.
39. Como estudante, quero que formas equivalentes após normalização técnica de Unicode sejam tratadas como a mesma forma, para evitar duplicatas invisíveis.
40. Como estudante, quero que sincretismos reais apresentem todas as análises válidas dentro do paradigma, para que uma leitura correta nunca seja marcada como errada.
41. Como estudante, quero que as análises válidas de uma forma continuem visíveis mesmo quando um dos traços estiver fora do recorte, para que o filtro não altere os fatos da língua.
42. Como estudante, quero que homógrafos entre paradigmas mostrem o lema como contexto quando necessário, para que a pergunta tenha uma resposta bem definida.
43. Como estudante, quero que variantes equivalentes possam aparecer isoladamente em Análise, para reconhecer cada forma documentada.
44. Como estudante, quero que variantes equivalentes sejam agrupadas numa única alternativa em Produção assistida, para não haver duas respostas corretas.
45. Como estudante, quero que notações compactas da fonte, como `(ν)`, sejam preservadas nos dois modos, para manter a convenção pedagógica da planilha.
46. Como estudante, quero escolher se substantivos aparecem com ou sem artigo, para ajustar a quantidade de pista fornecida.
47. Como estudante, quero que todas as alternativas nominais respeitem a mesma escolha de artigo, para não receber pistas inconsistentes.
48. Como estudante, quero ligar ou desligar a transliteração dos lemas, para usá-la somente quando for pedagogicamente útil.
49. Como estudante, quero que a transliteração nunca substitua uma forma grega, para manter o contato direto com a escrita original.
50. Como estudante, quero que apenas transliterações validadas sejam exibidas, para não aprender uma geração automática inconsistente.
51. Como estudante, quero ligar ou desligar a tradução portuguesa dos lemas independentemente da transliteração, para controlar meus apoios pedagógicos.
52. Como estudante, quero que tradução e transliteração sejam preferências globais, para alterá-las sem reconstruir baralhos.
53. Como estudante, quero escolher cobertura completa, para encontrar cada item elegível uma vez antes das revisões.
54. Como estudante, quero escolher uma quantidade definida de perguntas, para realizar uma prática curta em baralhos grandes.
55. Como estudante, quero que nenhum item original se repita antes de o conjunto elegível ser percorrido, para obter variedade.
56. Como estudante, quero distribuir uma rodada limitada de modo equilibrado por bloco, para impedir que um paradigma grande domine a sessão.
57. Como estudante, quero alternativamente distribuir perguntas em proporção ao conteúdo, para dar a cada forma a mesma chance de aparecer.
58. Como estudante, quero perguntas em ordem aleatória, para não depender da sequência da planilha.
59. Como estudante, quero que a posição da alternativa correta seja aleatória, para não formar padrões espaciais previsíveis.
60. Como estudante, quero que cada item apareça em somente uma direção numa rodada mista, para que uma pergunta não revele a resposta da direção inversa.
61. Como estudante, quero uma divisão aproximadamente equilibrada entre Análise e Produção assistida no modo Misto, para praticar ambas.
62. Como estudante, quero receber feedback imediatamente após responder, para corrigir minha recordação no momento do erro.
63. Como estudante, quero avançar manualmente após examinar o feedback, para não sofrer pressão de tempo.
64. Como estudante, quero ver a resposta correta e os traços que diferiam da minha escolha, para compreender o erro rapidamente.
65. Como estudante, quero abrir opcionalmente o contexto do paradigma, para investigar uma forma sem interromper todas as perguntas.
66. Como estudante, quero que um item errado volte depois de outras perguntas, para tentar recuperá-lo novamente com algum espaçamento.
67. Como estudante, quero que o item continue voltando até eu acertá-lo, para não concluir a rodada deixando erros pendentes.
68. Como estudante, quero que a rodada termine quando todos os itens originais tiverem sido acertados ao menos uma vez, para ter um encerramento claro.
69. Como estudante, quero ver somente meu progresso na rodada, para praticar sem nota, porcentagem ou julgamento.
70. Como estudante, quero concluir a rodada sem gerar histórico de desempenho, para manter o foco na prática atual.
71. Como estudante, quero abandonar uma rodada sem punição, para interromper a prática quando necessário.
72. Como estudante, quero que uma rodada interrompida seja salva automaticamente após cada resposta, para continuar mais tarde.
73. Como estudante, quero ter apenas uma rodada ativa por vez, para evitar estados de prática conflitantes.
74. Como estudante, quero escolher entre retomar ou abandonar a rodada ativa antes de iniciar outra, para controlar explicitamente meu estado.
75. Como estudante, quero que uma rodada use uma fotografia imutável do baralho, para que edições posteriores não mudem uma prática em andamento.
76. Como estudante, quero que alterações no baralho só afetem novas rodadas, para manter a rodada ativa consistente.
77. Como estudante, quero usar o aplicativo sem vidas, energia, cronômetro, ranking, sequência premiada ou punição, para praticar com calma.
78. Como estudante, quero uma interface limpa, bonita, moderna e acadêmica, para manter o foco no grego.
79. Como estudante, quero formas gregas grandes e legíveis, para distinguir diacríticos no celular e no desktop.
80. Como estudante, quero três alternativas confortáveis para toque no celular, para responder sem precisão excessiva.
81. Como estudante, quero atalhos opcionais `1`, `2`, `3` e Enter no desktop, para praticar com fluidez sem tornar o teclado obrigatório.
82. Como estudante, quero que feedback correto e incorreto use texto e ícones além de cor, para não depender somente de verde e vermelho.
83. Como estudante, quero que a interface respeite preferências de movimento reduzido, para evitar animações desconfortáveis.
84. Como estudante, quero que a interface funcione em tamanhos de tela móveis e de desktop, para praticar nos dois contextos.
85. Como estudante, quero usar Google Chrome como navegador suportado, para ter comportamento previsível.
86. Como estudante, quero instalar o jogo a partir de uma URL, para abri-lo como PWA.
87. Como estudante, quero que catálogo, fonte grega e interface funcionem depois sem internet, para praticar offline.
88. Como estudante, quero que nenhuma função essencial dependa de CDN ou serviço externo, para que o modo offline seja completo.
89. Como estudante, quero usar o jogo sem criar conta, para começar imediatamente.
90. Como estudante, quero que baralhos, preferências e rodada ativa permaneçam apenas no meu navegador, para preservar minha privacidade.
91. Como estudante, quero exportar baralhos e preferências para JSON, para criar uma cópia de segurança.
92. Como estudante, quero importar um backup com validação e prévia, para recuperar dados sem corromper o estado local.
93. Como estudante, quero que a rodada ativa não seja incluída no backup, para restaurar somente configurações duráveis.
94. Como estudante, quero que o conteúdo do jogo seja fixo e validado, para não lidar com upload ou interpretação de planilhas.
95. Como estudante, quero que formas suspeitas sejam excluídas até validação, para não praticar dados possivelmente incorretos.
96. Como mantenedor, quero que correções da fonte sejam explícitas e auditáveis, para distinguir normalização de emenda editorial.
97. Como mantenedor, quero que o importador detecte vazios inesperados, conflitos e duplicatas, para impedir erros silenciosos no catálogo.
98. Como mantenedor, quero que cada item tenha identificador estável, para preservar baralhos ao atualizar o aplicativo.
99. Como mantenedor, quero que o catálogo seja versionado, para validar backups e aplicar migrações controladas.
100. Como mantenedor, quero que grego e futuro latim sejam domínios separados, para impedir baralhos ou distrações entre idiomas.

## Implementation Decisions

1. **Vocabulário de domínio**
   - **Catálogo:** conjunto validado e versionado de conteúdo jogável derivado da planilha.
   - **Paradigma:** agrupamento linguístico de formas pertencentes a um lema ou conjunto convencional.
   - **Bloco de conteúdo:** um paradigma acompanhado de filtros e opções específicas da classe gramatical.
   - **Baralho:** configuração reutilizável composta por um ou mais blocos e regras de rodada.
   - **Item:** unidade atômica elegível para pergunta, com forma, análises válidas, paradigma, classe, variantes e metadados pedagógicos.
   - **Rodada:** execução de uma fotografia imutável de um baralho.
   - **Pergunta original:** primeira aparição de um item dentro da quantidade ou cobertura definida.
   - **Revisão:** reaparição de um item errado até que seja acertado.
   - **Análise:** direção forma → traços ou termo grego → correspondente português.
   - **Produção assistida:** direção traços → forma ou português → termo grego, sempre por múltipla escolha.

2. **Fonte e catálogo**
   - A planilha fornecida é uma fonte de importação durante o desenvolvimento, não uma dependência de execução.
   - O catálogo inclui todo conteúdo que possa gerar perguntas com exatamente uma alternativa correta, considerando agrupamento de ambiguidades e variantes.
   - Conteúdo jogável inclui artigo, pronomes, substantivos, adjetivos, particípios, paradigmas verbais, numerais e terminologia.
   - Introdução, notas, resumo da exportação, quadros vazios e outros materiais sem contrato pergunta–resposta são descartados.
   - O Quadro mestre somente entra se suas linhas puderem ser modeladas como correspondências ou análises inequívocas e úteis; caso contrário, é descartado pelo mesmo critério.
   - A terminologia visível é traduzida para português e revisada; as colunas inglesas ou latinas não aparecem ao usuário.
   - Cada item recebe identificador estável, independente da posição da célula, e versão de catálogo.
   - O processo de construção falha diante de conflito não resolvido, análise incompleta necessária, referência órfã ou identificador duplicado.
   - Normalização Unicode é aplicada antes da detecção de igualdade, sem remover diacríticos semanticamente visíveis.
   - Emendas editoriais ficam num manifesto separado com forma original, forma corrigida, justificativa e estado de validação.
   - Formas suspeitas sem validação são omitidas do catálogo publicado.

3. **Modelo gramatical**
   - Traços usam identificadores internos neutros de idioma e rótulos portugueses na apresentação.
   - Classes diferentes declaram explicitamente seus traços aplicáveis; campos irrelevantes não recebem valores artificiais.
   - Análises de substantivos incluem caso e número.
   - Análises de pronomes e adjetivos incluem caso, número e gênero quando aplicável.
   - Análises de verbos finitos incluem tempo, voz, modo, pessoa e número.
   - Análises de particípios incluem os traços documentados e aplicáveis, incluindo tempo, voz, caso, número e gênero.
   - Infinitivos e outras formas não finitas não recebem pessoa ou número salvo se a fonte linguística realmente os definir.
   - Sincretismos internos ao paradigma são representados por um conjunto de análises válidas.
   - O filtro do baralho controla a elegibilidade da pergunta e das distrações, mas não remove análises válidas da forma.
   - Homografia entre paradigmas é resolvida adicionando contexto de lema ao estímulo, sem fundir análises de lemas diferentes.
   - Variantes equivalentes compartilham a mesma análise. Em Análise, uma variante pode ser o estímulo; em Produção assistida, todas aparecem agrupadas na alternativa correta.
   - Notações compactas da fonte, incluindo `(ν)`, permanecem compactas em ambos os modos.
   - A opção de artigo transforma consistentemente estímulos e alternativas de um bloco nominal.

4. **Construção de baralhos**
   - O catálogo é navegável por categorias e pesquisável por grego, transliteração validada e português.
   - Selecionar um paradigma cria um bloco com todas as suas formas incluídas.
   - Filtros subsequentes excluem dimensões do bloco e são específicos da classe.
   - O editor mostra contagem ao vivo e resumo textual do recorte.
   - Blocos podem ser editados, duplicados e removidos.
   - Itens sobrepostos entre blocos do mesmo baralho são deduplicados por identificador e configuração de apresentação.
   - Um baralho pode combinar qualquer quantidade de blocos gregos.
   - Baralhos gregos nunca poderão receber blocos latinos quando o latim for implementado.
   - Rascunhos podem ser salvos inválidos, mas o início da rodada exige validação completa.
   - Cada família de distração precisa fornecer ao menos três alternativas visuais distintas dentro do recorte.
   - Modelos iniciais são imutáveis e copiáveis; não geram histórico e não substituem baralhos do usuário.

5. **Geração de alternativas**
   - Toda pergunta apresenta exatamente três alternativas visualmente distintas.
   - Há exatamente uma alternativa correta depois de agrupar sincretismos e variantes.
   - Alternativas erradas vêm da mesma família semântica e, para produção morfológica, prioritariamente do mesmo paradigma.
   - O algoritmo prioriza candidatos que diferem da resposta correta em um único traço, depois em dois, sem recorrer a conteúdo excluído.
   - Alternativas não podem diferir somente por diacríticos.
   - Alternativas de idiomas, classes ou tipos incompatíveis nunca são misturadas.
   - Posições são embaralhadas de forma uniforme e não podem depender do identificador do item.
   - Se não houver duas distrações válidas, o bloco é inválido; o sistema não relaxa silenciosamente as fronteiras.

6. **Configuração e execução da rodada**
   - Direções disponíveis: Análise, Produção assistida e Misto.
   - No Misto, cada item original recebe uma única direção, aproximadamente 50/50; revisões preservam essa direção.
   - Tipos de duração: cobertura completa ou quantidade definida.
   - Cobertura completa agenda cada item elegível uma vez antes das revisões.
   - Quantidade definida amostra sem repetição até esgotar o conjunto elegível.
   - Distribuições da quantidade definida: equilibrada por bloco ou proporcional ao número de itens.
   - A ordem é sempre aleatória.
   - A configuração do baralho é copiada para uma fotografia imutável no início.
   - Uma resposta errada fornece feedback e reinsere o item depois de um intervalo de outras perguntas.
   - Um item continua retornando até receber uma resposta correta.
   - A rodada termina quando todos os itens originais foram acertados ao menos uma vez.
   - Revisões não alteram a quantidade original apresentada no progresso.
   - Não existe pontuação, porcentagem, histórico concluído, cronômetro, vidas, energia, ranking, recompensa por sequência ou punição.

7. **Estado e persistência**
   - Persistência local contém baralhos, preferências, versão/migrações e no máximo uma rodada ativa.
   - A rodada ativa é salva atomicamente após cada resposta e restaurada ao abrir o aplicativo.
   - Iniciar nova rodada com outra ativa exige retomar ou abandonar a anterior.
   - Rodadas concluídas ou abandonadas não geram histórico durável.
   - Edições do baralho não modificam a fotografia da rodada ativa.
   - Backup JSON contém baralhos, preferências, versão do schema e versão compatível do catálogo.
   - Backup não contém rodada ativa, planilha ou catálogo completo.
   - Importação valida schema, referências e compatibilidade antes de oferecer mesclagem ou substituição.
   - Conflitos de identidade durante mesclagem não sobrescrevem silenciosamente baralhos locais.

8. **Interface**
   - Idioma da interface e dos rótulos gramaticais: português.
   - Grego politônico é sempre a escrita principal das formas.
   - Transliteração e tradução do lema são preferências globais e independentes.
   - Transliteração só aparece para lemas e nomes de paradigmas validados, nunca para substituir formas flexionadas.
   - O enunciado de Análise normalmente mostra somente a forma; acrescenta lema e tradução quando necessários para desambiguar paradigmas.
   - A tela da rodada apresenta forma ou análise em destaque, três cartões de resposta, progresso e saída.
   - Após a escolha, a pergunta congela até ação manual de continuar.
   - Feedback marca escolha e resposta correta usando cor, ícone e texto.
   - Erros mostram diferenças de traços e informam que o item voltará.
   - “Ver no paradigma” abre contexto compacto e opcional.
   - No celular, alternativas são empilhadas e possuem áreas de toque acessíveis.
   - No desktop, `1`, `2`, `3` selecionam respostas e Enter continua, sem tornar teclado obrigatório.
   - A estética é contemporânea, acadêmica, tipográfica e sem decoração pseudoantiga.
   - Fundo claro levemente quente, texto escuro, uma cor principal de destaque e cores semânticas reservadas ao feedback.
   - Modo escuro acompanha a preferência do sistema.
   - Movimento é discreto e respeita `prefers-reduced-motion`.
   - A fonte que cobre grego politônico é empacotada localmente.

9. **PWA e implantação**
   - Aplicação cliente estática, sem backend, conta, analytics ou telemetria externa.
   - Google Chrome moderno em celular e desktop é o navegador de aceite.
   - A distribuição inicial ocorre por URL HTTPS estática.
   - Service worker mantém shell, catálogo, fontes e recursos necessários disponíveis offline.
   - O aplicativo inicia e conclui rodadas sem rede depois do primeiro carregamento bem-sucedido.
   - Recursos essenciais não usam CDN nem chamadas remotas.
   - Atualizações são aplicadas de forma segura, sem apagar dados locais, com migrações versionadas.

10. **Separação futura de idiomas**
    - O modelo pode ser estendido para latim, mas idioma é limite obrigatório de catálogo e baralho.
    - Grego e latim têm catálogos, regras de apresentação, validações, distrações e baralhos separados.
    - Nenhuma tela do MVP exibe controles latinos vazios ou mistura idiomas.

## Testing Decisions

1. **Filosofia**
   - Testar comportamentos observáveis e invariantes do domínio, não estrutura interna, nomes de componentes ou detalhes de implementação.
   - Como o repositório ainda não possui testes ou precedentes, criar o menor número possível de pontos de teste.

2. **Ponto de teste principal: fluxo ponta a ponta no navegador**
   - Um único conjunto de cenários de alto nível deve cobrir: instalação/carregamento, criação e validação de baralho, início de rodada, ambos os modos, feedback, fila de revisão, retomada offline, conclusão sem histórico e backup.
   - Cenário nominal mínimo: copiar o modelo `κρήνη` sem dual, iniciar modo Misto com quantidade definida, responder corretamente, errar um item, verificar que ele retorna até o acerto, recarregar offline no meio da rodada e concluir.
   - Cenário de personalização: combinar um bloco nominal e um verbal, desmarcar filtros, alternar artigo, transliteração e tradução, e verificar que nenhuma forma excluída aparece como estímulo ou distração.
   - Cenário de rascunho: salvar bloco com menos de três alternativas, verificar aviso específico e bloqueio do início.
   - Cenário de persistência: editar o baralho durante uma rodada interrompida e verificar que a rodada retomada usa a fotografia antiga.
   - Cenário de backup: exportar, limpar dados locais de teste, importar com prévia e recuperar baralhos e preferências, sem rodada ativa.

3. **Ponto de teste de catálogo no build**
   - Uma validação única deve importar ou ler o catálogo gerado e falhar diante de identificadores duplicados, referências órfãs, rótulos portugueses ausentes, análises incompletas, alternativas impossíveis, conflitos de variantes ou emendas sem justificativa.
   - O teste deve verificar amostras representativas de todas as classes jogáveis, não apenas contagens globais.
   - Casos obrigatórios incluem `τῆς κρήνης`, `λῡ́ει`, dual sincrético, forma com `(ν)`, célula com variantes, pronome com gênero, particípio, numeral e termo gramatical.
   - A validação deve garantir que conteúdo auxiliar descartado não aparece no catálogo.

4. **Invariantes do gerador de perguntas**
   - Para uma amostra ampla ou geração baseada em propriedades, toda pergunta deve ter três alternativas visuais distintas e uma única alternativa correta após agrupamentos.
   - Nenhuma distração pode vir de conteúdo excluído, idioma diferente ou família incompatível.
   - Nenhuma distração pode diferir somente por diacríticos.
   - Sincretismos devem conservar todas as análises válidas.
   - Variantes de produção devem permanecer agrupadas.
   - A posição correta deve variar e não formar padrão determinístico visível.
   - Em Misto, um item original não pode aparecer nas duas direções na mesma rodada.
   - Em quantidade limitada, não há repetição original antes do esgotamento; reaparições só podem ser revisões de erro.

5. **Offline e acessibilidade**
   - O teste de navegador deve bloquear a rede após a primeira carga e confirmar abertura, retomada e conclusão.
   - Verificar que fonte grega, catálogo e ícones não fazem solicitações externas.
   - Validar navegação por toque e teclado, foco visível, nomes acessíveis, contraste, feedback não dependente somente de cor e movimento reduzido.
   - Validar layouts representativos de celular e desktop no Chrome.

6. **Critérios de aceite**
   - Todos os fluxos acima passam com dados reais do catálogo.
   - Nenhuma forma excluída aparece em perguntas ou alternativas.
   - Uma rodada com erro não termina antes do acerto posterior do item.
   - Uma rodada concluída não deixa histórico de desempenho persistido.
   - O aplicativo funciona integralmente offline após a primeira carga.
   - Nenhuma ambiguidade ou variante conhecida produz duas alternativas corretas.

## Out of Scope

- Ensino inicial, explicações curriculares ou substituição da memorização de paradigmas.
- Contagem das 100 repetições do método Ranieri–Dowling.
- Digitação de formas ou correção de texto livre.
- Desafios dedicados exclusivamente a acento, espírito, iota subscrito ou quantidade vocálica.
- Áudio, gravações, pronúncia ou síntese de voz.
- Cronômetro, vidas, energia, streaks, pontos, notas, porcentagens, rankings ou punições.
- Histórico de rodadas concluídas, analytics de desempenho ou repetição espaçada automática.
- Recomendações automáticas do que estudar, notificações ou calendário.
- Contas, login, sincronização entre dispositivos, backend ou banco remoto.
- Upload de planilhas, editor de catálogo no navegador ou suporte a layouts arbitrários.
- Exibição de introdução, notas, resumo de exportação, quadros vazios ou material sem contrato jogável.
- Suporte oficial a navegadores além de Google Chrome moderno.
- Áreas sociais, compartilhamento público ou competição.
- Latim no MVP.
- Baralhos que misturem grego e latim, mesmo numa versão futura.

## Further Notes

- Fonte de conteúdo confirmada: `Ancient Greek Ranieri-Dowling Method Summary of Forms v2.0.xlsx`.
- A planilha contém 38 abas, incluindo as três declinações, artigo, pronomes, adjetivos, particípios e 23 paradigmas verbais, além de numerais e terminologia.
- O produto é inspirado pelo método Ranieri–Dowling, mas sua unidade não é a repetição de um paradigma inteiro. Ele é um instrumento posterior de desafio configurável.
- “Produção assistida” é recuperação mental seguida de reconhecimento entre três alternativas; não equivale à produção livre digitada.
- A ausência deliberada de métricas é uma característica do produto, não uma lacuna temporária.
- A validação linguística conservadora pode reduzir temporariamente o número de itens disponíveis. Correção tem prioridade sobre cobertura aparente.
- O repositório não possuía código, ADRs, convenções de teste, remoto ou configuração de issue tracker no momento desta especificação.
- A publicação como issue e a aplicação da label `ready-for-agent` ficaram pendentes por falta de issue tracker configurado.
