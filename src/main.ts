import {
  builtInDecks,
  catalogParadigms,
  type Analysis,
  type CatalogParadigm,
  type DrillDeck,
  type FilterField
} from "./catalog";
import {
  blockError,
  createBlock,
  createId,
  deckError,
  itemsForBlock,
  loadDecks,
  paradigmFor,
  playableDeck,
  roundConfig,
  saveDecks,
  type ContentBlock,
  type SavedDeck
} from "./decks";
import { DrillRound, type RoundConfig } from "./round";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Elemento raiz da aplicação não encontrado.");
const app = root;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[
        character
      ] ?? character
  );
}

function deckStats(deck: SavedDeck): string {
  const forms = playableDeck(deck).items.length;
  return `${deck.blocks.length} bloco${deck.blocks.length === 1 ? "" : "s"} · ${forms} formas`;
}

function joinPortuguese(values: string[]): string {
  if (values.length < 2) return values.join("");
  return `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
}

function renderHome(): void {
  const saved = loadDecks();
  app.innerHTML = `
    <section class="home" aria-labelledby="page-title">
      <div class="title-row">
        <div>
          <p class="eyebrow">Recuperação ativa · sem pressa</p>
          <h1 id="page-title">Prática de grego clássico</h1>
          <p class="intro">Monte recortes precisos do que deseja recordar. Tudo fica neste aparelho.</p>
        </div>
        <button class="primary" type="button" data-action="create">Criar baralho</button>
      </div>

      ${saved.length ? `<h2 class="section-title">Meus baralhos</h2><div class="deck-list">${saved.map(savedDeckCard).join("")}</div>` : ""}
      <h2 class="section-title">Modelos para começar</h2>
      <div class="deck-list">${builtInDecks.map(builtInDeckCard).join("")}</div>
    </section>
  `;

  app.querySelector<HTMLButtonElement>("[data-action='create']")?.addEventListener(
    "click",
    () =>
      renderEditor({
        id: createId("deck"),
        name: "",
        blocks: [],
        direction: "analysis",
        coverage: "all",
        quantity: 10
      })
  );
  app.querySelectorAll<HTMLButtonElement>("[data-built-in]").forEach((button) => {
    const deck = builtInDecks.find(({ id }) => id === button.dataset.builtIn);
    if (deck) button.addEventListener("click", () => startRound(deck));
  });
  app.querySelectorAll<HTMLButtonElement>("[data-deck-action]").forEach((button) => {
    const deck = saved.find(({ id }) => id === button.dataset.deckId);
    if (!deck) return;
    button.addEventListener("click", () => {
      switch (button.dataset.deckAction) {
        case "start":
          if (!deckError(deck)) startRound(playableDeck(deck), roundConfig(deck));
          break;
        case "edit":
          renderEditor(structuredClone(deck));
          break;
        case "duplicate": {
          const copy = structuredClone(deck);
          copy.id = createId("deck");
          copy.name = `${deck.name} (cópia)`;
          copy.blocks = copy.blocks.map((block) => ({
            ...block,
            id: createId("block")
          }));
          saveDecks([...saved, copy]);
          renderHome();
          break;
        }
        case "delete":
          saveDecks(saved.filter(({ id }) => id !== deck.id));
          renderHome();
      }
    });
  });
}

function builtInDeckCard(deck: DrillDeck): string {
  return `<article class="deck-card">
    <div><p class="deck-label">Baralho inicial</p><h3 lang="grc">${deck.title}</h3><p>${deck.description}</p></div>
    <button class="primary" type="button" data-built-in="${deck.id}">Iniciar rodada</button>
  </article>`;
}

function savedDeckCard(deck: SavedDeck): string {
  const invalid = deckError(deck);
  return `<article class="deck-card">
    <div><p class="deck-label">${invalid ? "Rascunho" : "Pronto para praticar"}</p>
      <h3>${escapeHtml(deck.name)}</h3><p>${deckStats(deck)}</p>
      ${invalid ? `<p class="validation-message">${invalid}</p>` : ""}
    </div>
    <div class="card-actions">
      <button class="primary" type="button" data-deck-action="start" data-deck-id="${deck.id}" ${invalid ? "disabled" : ""}>Iniciar rodada</button>
      <button class="quiet compact" type="button" data-deck-action="edit" data-deck-id="${deck.id}">Editar</button>
      <button class="quiet compact" type="button" data-deck-action="duplicate" data-deck-id="${deck.id}">Duplicar</button>
      <button class="quiet compact danger" type="button" data-deck-action="delete" data-deck-id="${deck.id}">Excluir</button>
    </div>
  </article>`;
}

function renderEditor(deck: SavedDeck, catalogOpen = false, query = "", category = "Todos"): void {
  const invalid = deckError(deck);
  app.innerHTML = `
    <section class="editor" aria-labelledby="editor-title">
      <header class="editor-header">
        <button class="quiet" type="button" data-action="cancel">← Voltar</button>
        <p class="eyebrow">Editor de baralho</p>
      </header>
      <div class="editor-title">
        <div><h1 id="editor-title">O que você quer recordar?</h1><p>Comece com tudo incluído e retire apenas o que não entra nesta prática.</p></div>
        <label class="name-field">Nome do baralho<input aria-label="Nome do baralho" value="${escapeHtml(deck.name)}" placeholder="Ex.: primeira declinação"></label>
      </div>
      <div class="blocks">
        ${deck.blocks.map((block, index) => blockCard(block, index, deck.direction)).join("")}
      </div>
      <button class="add-block" type="button" data-action="catalog">＋ Adicionar conteúdo</button>
      ${catalogOpen ? catalogPicker(query, category) : ""}
      <section class="round-settings" aria-labelledby="round-settings-title">
        <div><p class="deck-label">Regras da rodada</p><h2 id="round-settings-title">Como praticar</h2></div>
        <fieldset><legend>Direção</legend>
          ${[
            ["analysis", "Análise"],
            ["production", "Produção assistida"],
            ["mixed", "Misto"]
          ].map(([value, label]) => `<label class="filter-option"><input type="radio" name="direction" value="${value}" ${deck.direction === value ? "checked" : ""}><span>${label}</span></label>`).join("")}
        </fieldset>
        <fieldset><legend>Cobertura</legend>
          <label class="filter-option"><input type="radio" name="coverage" value="all" ${deck.coverage === "all" ? "checked" : ""}><span>Todas as formas</span></label>
          <label class="filter-option"><input type="radio" name="coverage" value="limited" ${deck.coverage === "limited" ? "checked" : ""}><span>Quantidade definida</span></label>
        </fieldset>
        ${deck.coverage === "limited" ? `<label class="quantity-field">Quantidade<input type="number" aria-label="Quantidade de formas" min="1" max="${playableDeck(deck).items.length}" value="${deck.quantity}"></label>` : ""}
      </section>
      <footer class="editor-footer">
        <div>${invalid ? `<p class="validation-message">${invalid}</p>` : `<p>${deckStats(deck)} · pronto para iniciar</p>`}</div>
        <div class="footer-actions">
          <button class="quiet" type="button" data-action="save">${invalid ? "Salvar rascunho" : "Salvar baralho"}</button>
          <button class="primary" type="button" data-action="start" ${invalid ? "disabled" : ""}>Iniciar rodada</button>
        </div>
      </footer>
    </section>`;

  const nameInput = app.querySelector<HTMLInputElement>("[aria-label='Nome do baralho']");
  nameInput?.addEventListener("input", () => {
    deck.name = nameInput.value;
  });
  app.querySelector<HTMLButtonElement>("[data-action='cancel']")?.addEventListener("click", renderHome);
  app.querySelector<HTMLButtonElement>("[data-action='catalog']")?.addEventListener("click", () => renderEditor(deck, true));
  app.querySelector<HTMLButtonElement>("[data-action='save']")?.addEventListener("click", () => {
    persistDeck(deck);
    renderHome();
  });
  app.querySelector<HTMLButtonElement>("[data-action='start']")?.addEventListener("click", () => {
    if (!deckError(deck)) {
      persistDeck(deck);
      startRound(playableDeck(deck), roundConfig(deck));
    }
  });
  app.querySelectorAll<HTMLInputElement>("[name='direction']").forEach((input) =>
    input.addEventListener("change", () => {
      deck.direction = input.value as SavedDeck["direction"];
      renderEditor(deck);
    })
  );
  app.querySelectorAll<HTMLInputElement>("[name='coverage']").forEach((input) =>
    input.addEventListener("change", () => {
      deck.coverage = input.value as SavedDeck["coverage"];
      renderEditor(deck);
    })
  );
  app.querySelector<HTMLInputElement>("[aria-label='Quantidade de formas']")?.addEventListener("change", (event) => {
    deck.quantity = Number((event.currentTarget as HTMLInputElement).value);
  });
  wireBlocks(deck);
  if (catalogOpen) wireCatalog(deck, query, category);
}

function persistDeck(deck: SavedDeck): void {
  const decks = loadDecks();
  const existing = decks.findIndex(({ id }) => id === deck.id);
  if (existing >= 0) decks[existing] = deck;
  else decks.push(deck);
  saveDecks(decks);
}

function blockCard(
  block: ContentBlock,
  index: number,
  direction: SavedDeck["direction"]
): string {
  const paradigm = paradigmFor(block);
  const items = itemsForBlock(block);
  const error = blockError(block, direction);
  const summary = paradigm.filters
    .map((filter) => {
      const chosen = block.selected[filter.field] ?? [];
      if (chosen.length === filter.options.length) return null;
      return joinPortuguese(
        chosen
          .map((value) => filter.options.find((option) => option.value === value)?.label)
          .filter((value): value is string => Boolean(value))
      );
    })
    .filter(Boolean)
    .join(" · ") || "todas as formas";
  return `<article class="content-block" data-block="${block.id}">
    <header class="block-header">
      <div><p class="deck-label">Bloco ${index + 1} · ${paradigm.category}</p><h2 lang="grc">${paradigm.lemma.greek}</h2><p>${paradigm.lemma.transliteration} · ${paradigm.lemma.gloss}</p></div>
      <div class="inline-actions"><button class="quiet compact" data-block-action="duplicate">Duplicar bloco</button><button class="quiet compact danger" data-block-action="remove">Remover bloco</button></div>
    </header>
    <div class="filter-grid">${paradigm.filters.map((filter) => `
      <fieldset><legend>${filter.label}</legend>${filter.options.map((option) => `
        <label class="filter-option"><input type="checkbox" data-field="${filter.field}" value="${option.value}" aria-label="${option.label}" ${(block.selected[filter.field] ?? []).includes(option.value) ? "checked" : ""}><span>${option.label}</span></label>`).join("")}
      </fieldset>`).join("")}</div>
    <label class="pedagogy-option"><input type="checkbox" data-presentation="transliteration" ${block.showTransliteration ? "checked" : ""}> Mostrar transliteração como apoio pedagógico</label>
    ${paradigm.supportsArticleMode ? `<fieldset class="article-mode"><legend>Apresentação nominal</legend>
      <label class="filter-option"><input type="radio" name="article-${block.id}" value="with" ${block.articleMode === "with" ? "checked" : ""}><span>Com artigo</span></label>
      <label class="filter-option"><input type="radio" name="article-${block.id}" value="without" ${block.articleMode === "without" ? "checked" : ""}><span>Sem artigo</span></label>
    </fieldset>` : ""}
    <div class="block-summary"><strong>${items.length} formas incluídas</strong><span>${summary}</span></div>
    ${error ? `<p class="validation-message">${error}</p>` : ""}
  </article>`;
}

function wireBlocks(deck: SavedDeck): void {
  app.querySelectorAll<HTMLElement>("[data-block]").forEach((element) => {
    const block = deck.blocks.find(({ id }) => id === element.dataset.block);
    if (!block) return;
    element.querySelectorAll<HTMLInputElement>("[data-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const field = input.dataset.field as FilterField;
        const values = new Set(block.selected[field] ?? []);
        if (input.checked) values.add(input.value);
        else values.delete(input.value);
        block.selected[field] = [...values];
        renderEditor(deck);
      });
    });
    element.querySelector<HTMLInputElement>("[data-presentation]")?.addEventListener("change", (event) => {
      block.showTransliteration = (event.currentTarget as HTMLInputElement).checked;
    });
    element.querySelectorAll<HTMLInputElement>(`[name='article-${block.id}']`).forEach((input) =>
      input.addEventListener("change", () => {
        block.articleMode = input.value as ContentBlock["articleMode"];
        renderEditor(deck);
      })
    );
    element.querySelector<HTMLButtonElement>("[data-block-action='duplicate']")?.addEventListener("click", () => {
      const copy = structuredClone(block);
      copy.id = createId("block");
      deck.blocks.splice(deck.blocks.indexOf(block) + 1, 0, copy);
      renderEditor(deck);
    });
    element.querySelector<HTMLButtonElement>("[data-block-action='remove']")?.addEventListener("click", () => {
      deck.blocks = deck.blocks.filter(({ id }) => id !== block.id);
      renderEditor(deck);
    });
  });
}

function catalogPicker(query: string, category: string): string {
  const normalized = query.normalize("NFC").toLocaleLowerCase("pt-BR");
  const results = catalogParadigms.filter((paradigm) => {
    const matchesCategory = category === "Todos" || paradigm.category === category;
    const searchable = [paradigm.lemma.greek, paradigm.lemma.transliteration, paradigm.lemma.gloss]
      .join(" ")
      .normalize("NFC")
      .toLocaleLowerCase("pt-BR");
    return matchesCategory && searchable.includes(normalized);
  });
  return `<aside class="catalog" aria-labelledby="catalog-title">
    <div class="catalog-header"><div><p class="eyebrow">Catálogo</p><h2 id="catalog-title">Escolha um paradigma</h2></div><button class="quiet" data-action="close-catalog">Fechar</button></div>
    <input class="search" type="search" aria-label="Pesquisar paradigmas" value="${escapeHtml(query)}" placeholder="Grego, transliteração ou português">
    <div class="category-tabs">${[
      ["Todos", "Todos"],
      ["Substantivo", "Substantivos"],
      ["Pronome", "Pronomes"],
      ["Artigo", "Artigo"],
      ["Verbo", "Verbos"]
    ].map(([value, label]) => `<button class="${category === value ? "active" : ""}" data-category="${value}">${label}</button>`).join("")}</div>
    <div class="catalog-results">${results.map(catalogResult).join("") || "<p>Nenhum paradigma encontrado.</p>"}</div>
  </aside>`;
}

function catalogResult(paradigm: CatalogParadigm): string {
  return `<article class="catalog-card"><div><p class="deck-label">${paradigm.category}</p><h3 lang="grc">${paradigm.lemma.greek}</h3><p>${paradigm.lemma.transliteration} · ${paradigm.lemma.gloss}</p></div><button class="primary" data-add-paradigm="${paradigm.id}">Adicionar ${paradigm.lemma.greek}</button></article>`;
}

function wireCatalog(deck: SavedDeck, query: string, category: string): void {
  app.querySelector<HTMLButtonElement>("[data-action='close-catalog']")?.addEventListener("click", () => renderEditor(deck));
  const search = app.querySelector<HTMLInputElement>("[aria-label='Pesquisar paradigmas']");
  search?.addEventListener("input", () => renderEditor(deck, true, search.value, category));
  app.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((button) =>
    button.addEventListener("click", () => renderEditor(deck, true, query, button.dataset.category))
  );
  app.querySelectorAll<HTMLButtonElement>("[data-add-paradigm]").forEach((button) => {
    const paradigm = catalogParadigms.find(({ id }) => id === button.dataset.addParadigm);
    if (paradigm) button.addEventListener("click", () => {
      deck.blocks.push(createBlock(paradigm));
      renderEditor(deck);
    });
  });
}

function startRound(
  deck: DrillDeck,
  config: RoundConfig = { direction: "analysis", coverage: "all" }
): void {
  const round = new DrillRound(deck.items, config);
  function renderQuestion(): void {
    const question = round.question();
    if (!question) return renderComplete();
    const isAnalysis = question.direction === "analysis";
    app.innerHTML = `<section class="round" aria-labelledby="question-title">
      <header class="round-header"><button class="quiet" data-action="exit">Sair</button><p aria-live="polite">Progresso: ${round.masteredCount} de ${round.total}</p></header>
      <div class="prompt"><p id="question-title">${isAnalysis ? "Qual é a análise desta forma?" : "Qual forma corresponde a esta análise?"}</p><p class="${isAnalysis ? "greek-form" : "analysis-prompt"}" ${isAnalysis ? 'lang="grc"' : ""}>${question.prompt}</p>${question.context ? `<p class="form-context">Lema: <span lang="grc">${question.context}</span></p>` : ""}${isAnalysis && question.item.support ? `<p class="pedagogical-support">${question.item.support}</p>` : ""}</div>
      <div class="options" role="group" aria-label="Alternativas">${question.choices.map((choice, index) => `<button class="option"><span class="option-number">${index + 1}</span><span>${choice.label}</span></button>`).join("")}</div><div class="feedback" aria-live="polite"></div></section>`;
    app.querySelector<HTMLButtonElement>("[data-action='exit']")?.addEventListener("click", renderHome);
    const buttons = [...app.querySelectorAll<HTMLButtonElement>(".option")];
    buttons.forEach((button, index) => {
      const selected = question.choices[index];
      if (selected) button.addEventListener("click", () => answer(buttons, button, selected.id));
    });
  }
  function answer(buttons: HTMLButtonElement[], selectedButton: HTMLButtonElement, selected: string): void {
    const result = round.answer(selected);
    const correct = result.correctLabel;
    buttons.forEach((button) => {
      button.disabled = true;
      if (button.textContent?.includes(correct)) button.classList.add("correct");
    });
    if (!result.isCorrect) selectedButton.classList.add("incorrect");
    const feedback = app.querySelector<HTMLElement>(".feedback");
    if (feedback) {
      feedback.innerHTML = `<div class="feedback-copy ${result.isCorrect ? "success" : "error"}"><strong>${result.isCorrect ? "Correto" : "Ainda não"}</strong><span>${result.isCorrect ? "Você reconheceu a forma." : `A resposta é ${correct}. Esta forma voltará.`}</span></div><button class="primary" data-action="continue">Continuar</button>`;
      feedback.querySelector<HTMLButtonElement>("[data-action='continue']")?.addEventListener("click", renderQuestion);
    }
  }
  function renderComplete(): void {
    app.innerHTML = `<section class="complete"><p class="completion-mark">✓</p><p class="eyebrow">Rodada concluída</p><h1>Você reconheceu todas as formas.</h1><p>Sem nota e sem pressa. Apenas a prática feita.</p><button class="primary" data-action="home">Voltar ao início</button></section>`;
    app.querySelector<HTMLButtonElement>("[data-action='home']")?.addEventListener("click", renderHome);
  }
  renderQuestion();
}

renderHome();
