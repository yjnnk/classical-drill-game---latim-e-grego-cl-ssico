import type { CatalogParadigm, DrillDeck, FilterField } from "./catalog";
import {
  latinBuiltInDecks,
  latinCatalogParadigms,
  latinCatalogVersion,
} from "./latin-catalog";
import {
  clearActiveRound,
  loadActiveRound,
  saveActiveRound,
} from "./active-round";
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
  type SavedDeck,
} from "./decks";
import {
  loadPreferences,
  savePreferences,
  type Preferences,
} from "./preferences";
import { loadTheme, saveTheme } from "./theme";
import { DrillRound, type RoundConfig, type RoundQuestion } from "./round";

type SwitchLanguage = () => void;
type LatinBackup = {
  schemaVersion: 1;
  language: "latin";
  catalogVersion: string;
  exportedAt: string;
  decks: SavedDeck[];
  preferences: Preferences;
};

const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]!,
  );
const choiceLabelHtml = (value: string) =>
  esc(value).replace(
    / ou /gu,
    ' <strong class="choice-separator">ou</strong> ',
  );
const prefs = () => loadPreferences("latin");
const decks = () => loadDecks("latin", latinCatalogParadigms);
const playable = (deck: SavedDeck) =>
  playableDeck(deck, prefs(), latinCatalogParadigms);
const error = (deck: SavedDeck) => deckError(deck, latinCatalogParadigms);
const blockItems = (block: ContentBlock) =>
  itemsForBlock(block, latinCatalogParadigms);

export function createLatinApp(
  root: HTMLElement,
  switchLanguage: SwitchLanguage,
): { renderHome: () => void } {
  const renderHome = (): void => {
    document.documentElement.dataset.language = "latin";
    document.onkeydown = null;
    const saved = decks();
    const preferences = prefs();
    const theme = loadTheme();
    const active = loadActiveRound("latin");
    root.innerHTML = `<section class="home latin-home" aria-labelledby="page-title">
      <div class="title-row"><div><p class="eyebrow">Recuperação ativa · sem pressa</p><h1 id="page-title">Latim</h1><p class="intro">Monte recortes precisos do que deseja recordar. Tudo fica neste aparelho.</p></div><div class="header-actions"><button class="quiet" data-action="switch">Trocar idioma</button><button class="quiet" data-action="toggle-theme">Usar tema ${theme === "dark" ? "claro" : "escuro"}</button><button class="primary" data-action="create" ${active ? "disabled" : ""}>Criar baralho</button></div></div>
      ${active ? `<section class="active-round"><div><p class="deck-label">Rodada em andamento</p><h2>${esc(active.deck.title)}</h2><p>Progresso: ${active.snapshot.masteredIds.length} de ${active.snapshot.total}</p></div><div class="card-actions"><button class="primary" data-action="resume">Retomar rodada</button><button class="quiet danger" data-action="abandon">Abandonar rodada</button></div></section>` : ""}
      <section class="preference-panel"><div><p class="deck-label">Apoios pedagógicos</p><h2>Exibição</h2></div><label class="filter-option"><input type="checkbox" data-pref="showTransliteration" ${preferences.showTransliteration ? "checked" : ""}><span>Mostrar forma sem mácrons</span></label><label class="filter-option"><input type="checkbox" data-pref="showTranslation" ${preferences.showTranslation ? "checked" : ""}><span>Mostrar tradução</span></label></section>
      ${saved.length ? `<h2 class="section-title">Meus baralhos</h2><div class="deck-list">${saved.map(deckCard).join("")}</div>` : ""}
      <h2 class="section-title">Modelos para começar</h2><div class="deck-list">${latinBuiltInDecks.map(modelCard).join("")}</div>
      <section class="backup-panel backup-secondary"><div><p class="deck-label">Dados locais do latim</p><h2>Backup</h2></div><div class="card-actions"><button class="quiet" data-action="export">Exportar JSON</button><label class="quiet file-button">Importar JSON<input type="file" accept="application/json,.json" data-action="import"></label></div><div class="import-preview" aria-live="polite"></div></section>
    </section>`;
    root
      .querySelector<HTMLButtonElement>("[data-action=switch]")
      ?.addEventListener("click", switchLanguage);
    root
      .querySelector<HTMLButtonElement>("[data-action=toggle-theme]")
      ?.addEventListener("click", () => {
        saveTheme(theme === "dark" ? "light" : "dark");
        renderHome();
      });
    root
      .querySelector<HTMLButtonElement>("[data-action=create]")
      ?.addEventListener("click", () =>
        renderEditor({
          id: createId("latin-deck"),
          name: "baralho customizado",
          blocks: [],
          direction: "analysis",
          coverage: "all",
          quantity: 10,
        }),
      );
    root
      .querySelector<HTMLButtonElement>("[data-action=resume]")
      ?.addEventListener("click", () => {
        const value = loadActiveRound("latin");
        if (value)
          startRound(
            value.deck,
            value.config,
            DrillRound.restore(value.snapshot),
          );
      });
    root
      .querySelector<HTMLButtonElement>("[data-action=abandon]")
      ?.addEventListener("click", () => {
        clearActiveRound("latin");
        renderHome();
      });
    root.querySelectorAll<HTMLInputElement>("[data-pref]").forEach((input) =>
      input.addEventListener("change", () => {
        const value = prefs();
        value[input.dataset.pref as keyof Preferences] = input.checked;
        savePreferences(value, "latin");
        renderHome();
      }),
    );
    root
      .querySelectorAll<HTMLButtonElement>("[data-model]")
      .forEach((button) => {
        const deck = latinBuiltInDecks.find(
          (value) => value.id === button.dataset.model,
        );
        if (deck)
          button.addEventListener("click", () => {
            const model = template(deck.id);
            startRound(playable(model), {
              direction: model.direction,
              coverage: "all",
            });
          });
      });
    root
      .querySelectorAll<HTMLButtonElement>("[data-copy-model]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          const value = template(button.dataset.copyModel!);
          saveDecks([...saved, value], "latin");
          renderEditor(value);
        }),
      );
    root
      .querySelectorAll<HTMLButtonElement>("[data-deck-action]")
      .forEach((button) => {
        const deck = saved.find((value) => value.id === button.dataset.deckId);
        if (!deck) return;
        button.addEventListener("click", () => {
          if (button.dataset.deckAction === "start" && !error(deck))
            startRound(playable(deck), roundConfig(deck));
          if (button.dataset.deckAction === "edit")
            renderEditor(structuredClone(deck));
          if (button.dataset.deckAction === "delete") {
            saveDecks(
              saved.filter(({ id }) => id !== deck.id),
              "latin",
            );
            renderHome();
          }
          if (button.dataset.deckAction === "duplicate") {
            const copy = structuredClone(deck);
            copy.id = createId("latin-deck");
            copy.name += " (cópia)";
            copy.blocks = copy.blocks.map((block) => ({
              ...block,
              id: createId("latin-block"),
            }));
            saveDecks([...saved, copy], "latin");
            renderHome();
          }
        });
      });
    root
      .querySelector<HTMLButtonElement>("[data-action=export]")
      ?.addEventListener("click", () => {
        const value: LatinBackup = {
          schemaVersion: 1,
          language: "latin",
          catalogVersion: latinCatalogVersion,
          exportedAt: new Date().toISOString(),
          decks: saved,
          preferences,
        };
        const blob = new Blob([JSON.stringify(value, null, 2)], {
          type: "application/json",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "classical-drill-latim-backup.json";
        link.click();
        URL.revokeObjectURL(link.href);
      });
    root
      .querySelector<HTMLInputElement>("[data-action=import]")
      ?.addEventListener("change", async (event) => {
        const file = (event.currentTarget as HTMLInputElement).files?.[0];
        const preview = root.querySelector<HTMLElement>(".import-preview");
        if (!file || !preview) return;
        try {
          const backup = parseLatinBackup(await file.text());
          preview.innerHTML = `<p><strong>Prévia:</strong> ${backup.decks.length} baralho(s) latinos.</p><div class="card-actions"><button class="quiet" data-mode="merge">Mesclar mantendo ambos</button><button class="primary" data-mode="replace">Substituir dados latinos</button></div>`;
          preview
            .querySelectorAll<HTMLButtonElement>("[data-mode]")
            .forEach((button) =>
              button.addEventListener("click", () => {
                saveDecks(
                  button.dataset.mode === "merge"
                    ? mergeLatinDecks(saved, backup.decks)
                    : backup.decks,
                  "latin",
                );
                savePreferences(backup.preferences, "latin");
                renderHome();
              }),
            );
        } catch (cause) {
          preview.innerHTML = `<p class="validation-message">${esc(cause instanceof Error ? cause.message : "Backup inválido.")}</p>`;
        }
      });
  };

  const renderEditor = (
    deck: SavedDeck,
    picker = false,
    query = "",
    category = "Todos",
  ): void => {
    const invalid = error(deck);
    root.innerHTML = `<section class="editor latin-editor"><header class="editor-header"><button class="quiet" data-action="back">← Voltar</button><p class="eyebrow">Editor latino</p></header><div class="editor-title"><div><h1>O que você quer recordar?</h1><p>Tudo começa incluído; retire apenas o que não entra nesta prática.</p></div><label class="name-field">Nome do baralho<input aria-label="Nome do baralho" value="${esc(deck.name)}"></label></div><div class="blocks">${deck.blocks.map((block, index) => blockCard(block, index, deck.direction)).join("")}</div><button class="add-block" data-action="catalog">＋ Adicionar conteúdo</button>${picker ? catalogPicker(query, category) : ""}<section class="round-settings"><div><p class="deck-label">Regras da rodada</p><h2>Como praticar</h2></div><fieldset><legend>Direção</legend>${[
      ["analysis", "Análise"],
      ["production", "Produção assistida"],
      ["mixed", "Misto"],
    ]
      .map(
        ([value, label]) =>
          `<label class="filter-option"><input type="radio" name="direction" value="${value}" ${deck.direction === value ? "checked" : ""}><span>${label}</span></label>`,
      )
      .join(
        "",
      )}</fieldset><fieldset><legend>Cobertura</legend><label class="filter-option"><input type="radio" name="coverage" value="all" ${deck.coverage === "all" ? "checked" : ""}><span>Todas as formas</span></label><label class="filter-option"><input type="radio" name="coverage" value="limited" ${deck.coverage === "limited" ? "checked" : ""}><span>Quantidade definida</span></label></fieldset></section><footer class="editor-footer"><p class="validation-message">${invalid ?? ""}</p><div class="footer-actions"><button class="quiet" data-action="save">${invalid ? "Salvar rascunho" : "Salvar baralho"}</button><button class="primary" data-action="start" ${invalid ? "disabled" : ""}>Iniciar rodada</button></div></footer></section>`;
    root
      .querySelector<HTMLInputElement>("[aria-label='Nome do baralho']")
      ?.addEventListener(
        "input",
        (event) =>
          (deck.name = (event.currentTarget as HTMLInputElement).value),
      );
    root
      .querySelector<HTMLButtonElement>("[data-action=back]")
      ?.addEventListener("click", renderHome);
    root
      .querySelector<HTMLButtonElement>("[data-action=catalog]")
      ?.addEventListener("click", () => renderEditor(deck, true));
    root
      .querySelector<HTMLButtonElement>("[data-action=save]")
      ?.addEventListener("click", () => {
        persist(deck);
        renderHome();
      });
    root
      .querySelector<HTMLButtonElement>("[data-action=start]")
      ?.addEventListener("click", () => {
        if (!error(deck)) {
          persist(deck);
          startRound(playable(deck), roundConfig(deck));
        }
      });
    root
      .querySelectorAll<HTMLInputElement>("[name=direction]")
      .forEach((input) =>
        input.addEventListener("change", () => {
          deck.direction = input.value as SavedDeck["direction"];
          renderEditor(deck);
        }),
      );
    root
      .querySelectorAll<HTMLInputElement>("[name=coverage]")
      .forEach((input) =>
        input.addEventListener("change", () => {
          deck.coverage = input.value as SavedDeck["coverage"];
          renderEditor(deck);
        }),
      );
    wireBlocks(deck);
    if (picker) wireCatalog(deck, query, category);
  };

  const persist = (deck: SavedDeck) => {
    const values = decks();
    const index = values.findIndex(({ id }) => id === deck.id);
    if (index < 0) values.push(deck);
    else values[index] = deck;
    saveDecks(values, "latin");
  };
  const blockCard = (
    block: ContentBlock,
    index: number,
    direction: SavedDeck["direction"],
  ) => {
    const paradigm = paradigmFor(block, latinCatalogParadigms);
    const preferences = prefs();
    const support = [
      preferences.showTransliteration ? paradigm.lemma.transliteration : "",
      preferences.showTranslation ? paradigm.lemma.gloss : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const issue = blockError(block, direction, latinCatalogParadigms);
    return `<article class="content-block" data-block="${block.id}"><header class="block-header"><div><p class="deck-label">Bloco ${index + 1} · ${paradigm.category}</p><h2 lang="la">${paradigm.lemma.form}</h2>${support ? `<p>${support}</p>` : ""}</div><div class="inline-actions"><button class="quiet compact" data-clear>Desselecionar tudo</button><button class="quiet compact danger" data-remove>Remover bloco</button></div></header><div class="filter-grid">${paradigm.filters.map((filter) => `<fieldset><legend>${filter.label}</legend>${filter.options.map((option) => `<label class="filter-option"><input type="checkbox" data-field="${filter.field}" value="${option.value}" aria-label="${option.label}" ${(block.selected[filter.field] ?? []).includes(option.value) ? "checked" : ""}><span>${option.label}</span></label>`).join("")}</fieldset>`).join("")}</div><div class="block-summary"><strong>${blockItems(block).length} formas incluídas</strong></div>${issue ? `<p class="validation-message">${issue}</p>` : ""}</article>`;
  };
  const wireBlocks = (deck: SavedDeck) =>
    root.querySelectorAll<HTMLElement>("[data-block]").forEach((element) => {
      const block = deck.blocks.find(({ id }) => id === element.dataset.block);
      if (!block) return;
      element
        .querySelectorAll<HTMLInputElement>("[data-field]")
        .forEach((input) =>
          input.addEventListener("change", () => {
            const field = input.dataset.field as FilterField;
            const selected = new Set(block.selected[field] ?? []);
            input.checked
              ? selected.add(input.value)
              : selected.delete(input.value);
            block.selected[field] = [...selected];
            renderEditor(deck);
          }),
        );
      element
        .querySelector<HTMLButtonElement>("[data-clear]")
        ?.addEventListener("click", () => {
          const paradigm = paradigmFor(block, latinCatalogParadigms);
          paradigm.filters.forEach((filter) => {
            block.selected[filter.field] = [];
          });
          renderEditor(deck);
        });
      element
        .querySelector<HTMLButtonElement>("[data-remove]")
        ?.addEventListener("click", () => {
          deck.blocks = deck.blocks.filter(({ id }) => id !== block.id);
          renderEditor(deck);
        });
    });
  const catalogPicker = (query: string, category: string) => {
    return `<section class="catalog"><div class="catalog-header"><div><p class="eyebrow">Catálogo latino</p><h2>Escolha um paradigma</h2></div><button class="quiet" data-close>Fechar</button></div><input class="search" type="search" aria-label="Pesquisar paradigmas" value="${esc(query)}" placeholder="Latim ou português"><div class="category-tabs">${["Todos", "Substantivo", "Pronome", "Adjetivo", "Verbo"].map((value) => `<button class="quiet compact" data-category="${value}">${value}${value === "Verbo" ? "s" : value === "Substantivo" ? "s" : value === "Pronome" ? "s" : value === "Adjetivo" ? "s" : ""}</button>`).join("")}</div><div class="catalog-results">${catalogResults(query, category)}</div></section>`;
  };
  const catalogResults = (query: string, category: string) => {
    const normalized = withoutMarks(query).toLocaleLowerCase("pt-BR");
    const results = latinCatalogParadigms.filter(
      (p) =>
        (category === "Todos" || p.category === category) &&
        withoutMarks(
          [p.lemma.form, p.lemma.transliteration, p.lemma.gloss].join(" "),
        )
          .toLocaleLowerCase("pt-BR")
          .includes(normalized),
    );
    return (
      results.map(catalogCard).join("") ||
      "<p>Nenhum paradigma encontrado.</p>"
    );
  };
  const wireCatalog = (deck: SavedDeck, query: string, category: string) => {
    root
      .querySelector<HTMLButtonElement>("[data-close]")
      ?.addEventListener("click", () => renderEditor(deck));
    const search = root.querySelector<HTMLInputElement>(
      "[aria-label='Pesquisar paradigmas']",
    );
    search?.addEventListener("input", () => {
      const results = root.querySelector<HTMLElement>(".catalog-results");
      if (results) results.innerHTML = catalogResults(search.value, category);
      wireCatalogAddButtons(deck);
    });
    root
      .querySelectorAll<HTMLButtonElement>("[data-category]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          renderEditor(
            deck,
            true,
            search?.value ?? query,
            button.dataset.category,
          ),
        ),
      );
    wireCatalogAddButtons(deck);
  };
  const wireCatalogAddButtons = (deck: SavedDeck) => {
    root.querySelectorAll<HTMLButtonElement>("[data-add]").forEach((button) => {
      const paradigm = latinCatalogParadigms.find(
        ({ id }) => id === button.dataset.add,
      );
      if (paradigm)
        button.addEventListener("click", () => {
          deck.blocks.push(createBlock(paradigm));
          renderEditor(deck);
        });
    });
  };
  const catalogCard = (paradigm: CatalogParadigm) =>
    `<article class="catalog-card"><div><p class="deck-label">${paradigm.category}</p><h3 lang="la">${paradigm.lemma.form}</h3><p>${paradigm.lemma.gloss}</p></div><button class="primary" data-add="${paradigm.id}">Adicionar ${paradigm.lemma.form}</button></article>`;

  const startRound = (
    deck: DrillDeck,
    config: RoundConfig = { direction: "analysis", coverage: "all" },
    restored?: DrillRound,
    repetitionCount = 0,
  ): void => {
    if (!restored && loadActiveRound("latin")) return renderHome();
    const round = restored ?? new DrillRound(deck.items, config);
    const persistRound = () =>
      saveActiveRound(
        {
          version: 1,
          deck,
          config: {
            direction: config.direction,
            coverage: config.coverage,
            quantity: config.quantity,
          },
          snapshot: round.snapshot(),
        },
        "latin",
      );
    const renderQuestion = () => {
      const question = round.question();
      if (!question) return complete();
      persistRound();
      const analysis = question.direction === "analysis";
      root.innerHTML = `<section class="round latin-round"><header class="round-header"><button class="quiet" data-exit>Sair</button><p>Progresso: ${round.masteredCount} de ${round.total}</p></header><div class="prompt"><p>${analysis ? "Qual é a análise desta forma?" : "Qual forma corresponde a esta análise?"}</p><p class="${analysis ? "latin-form" : "analysis-prompt"}" ${analysis ? 'lang="la"' : ""}>${question.prompt}</p>${question.item.support ? `<p class="form-support">${question.item.support}</p>` : ""}${question.context ? `<p class="form-context">Lema: <span lang="la">${question.context}</span></p>` : ""}</div><div class="options" role="group" aria-label="Alternativas">${question.choices.map((choice, index) => `<button class="option"><span class="option-number">${index + 1}</span><span>${choiceLabelHtml(choice.label)}</span></button>`).join("")}</div><div class="feedback" aria-live="polite"></div></section>`;
      root
        .querySelector<HTMLButtonElement>("[data-exit]")
        ?.addEventListener("click", renderHome);
      const buttons = [...root.querySelectorAll<HTMLButtonElement>(".option")];
      buttons.forEach((button, index) =>
        button.addEventListener("click", () =>
          answer(question, buttons, button, question.choices[index]!.id),
        ),
      );
      document.onkeydown = (event) => {
        if (["1", "2", "3"].includes(event.key))
          buttons[Number(event.key) - 1]?.click();
        if (event.key === "Enter")
          root.querySelector<HTMLButtonElement>("[data-continue]")?.click();
      };
    };
    const answer = (
      question: RoundQuestion,
      buttons: HTMLButtonElement[],
      selectedButton: HTMLButtonElement,
      selected: string,
    ) => {
      const result = round.answer(selected);
      persistRound();
      buttons.forEach((button) => {
        button.disabled = true;
        if (button.textContent?.includes(result.correctLabel))
          button.classList.add("correct");
      });
      if (!result.isCorrect) selectedButton.classList.add("incorrect");
      const feedback = root.querySelector<HTMLElement>(".feedback");
      if (feedback) {
        feedback.innerHTML = `<div class="feedback-copy ${result.isCorrect ? "success" : "error"}"><strong>${result.isCorrect ? "✓ Correto" : "↻ Ainda não"}</strong><span>${result.isCorrect ? "Você reconheceu a forma." : `A resposta é ${result.correctLabel}. Esta forma voltará.`}</span></div><div class="feedback-actions"><button class="quiet" data-paradigm>Ver no paradigma</button><button class="primary" data-continue>Continuar</button></div><div class="paradigm-context" hidden></div>`;
        feedback
          .querySelector<HTMLButtonElement>("[data-continue]")
          ?.addEventListener("click", renderQuestion);
        feedback
          .querySelector<HTMLButtonElement>("[data-paradigm]")
          ?.addEventListener("click", () => {
            const panel =
              feedback.querySelector<HTMLElement>(".paradigm-context");
            if (panel) {
              panel.hidden = !panel.hidden;
              panel.innerHTML = `<strong>Contexto do paradigma</strong><div>${deck.items
                .filter((item) =>
                  item.sourceParadigmIds?.some((id) =>
                    question.item.sourceParadigmIds?.includes(id),
                  ),
                )
                .slice(0, 60)
                .map(
                  (item) =>
                    `<span class="paradigm-form ${item.id === question.item.id ? "current" : ""}" lang="la">${item.form}</span>`,
                )
                .join("")}</div>`;
            }
          });
      }
    };
    const complete = () => {
      clearActiveRound("latin");
      document.onkeydown = null;
      root.innerHTML = `<section class="complete"><p class="completion-mark">✓</p><p class="eyebrow">Rodada concluída</p><h1>Você reconheceu todas as formas.</h1>${repetitionCount ? `<p class="repetition-count">Repetição ${repetitionCount}</p>` : ""}<div class="completion-actions"><button class="primary" data-repeat>Repetir sessão</button><button class="quiet" data-home>Voltar ao início</button></div></section>`;
      root
        .querySelector<HTMLButtonElement>("[data-repeat]")
        ?.addEventListener("click", () =>
          startRound(deck, config, undefined, repetitionCount + 1),
        );
      root
        .querySelector<HTMLButtonElement>("[data-home]")
        ?.addEventListener("click", renderHome);
    };
    renderQuestion();
  };

  renderHome();
  return { renderHome };
}

function modelCard(deck: DrillDeck): string {
  return `<article class="deck-card"><div><p class="deck-label">Baralho inicial</p><h3 lang="la">${deck.title}</h3><p>${deck.description}</p></div><div class="card-actions"><button class="primary" data-model="${deck.id}">Iniciar rodada</button><button class="quiet compact" data-copy-model="${deck.id}">Usar como modelo</button></div></article>`;
}
function deckCard(deck: SavedDeck): string {
  const invalid = deckError(deck, latinCatalogParadigms);
  return `<article class="deck-card"><div><p class="deck-label">${invalid ? "Rascunho" : "Pronto para praticar"}</p><h3>${esc(deck.name)}</h3>${invalid ? `<p class="validation-message">${invalid}</p>` : ""}</div><div class="card-actions"><button class="primary" data-deck-action="start" data-deck-id="${deck.id}" ${invalid ? "disabled" : ""}>Iniciar rodada</button><button class="quiet compact" data-deck-action="edit" data-deck-id="${deck.id}">Editar</button><button class="quiet compact" data-deck-action="duplicate" data-deck-id="${deck.id}">Duplicar</button><button class="quiet compact danger" data-deck-action="delete" data-deck-id="${deck.id}">Excluir</button></div></article>`;
}
function template(id: string): SavedDeck {
  const common = {
    id: createId("latin-deck"),
    coverage: "all" as const,
    quantity: 10,
  };
  if (id === "latin:deck:porta")
    return {
      ...common,
      name: "porta — primeira declinação",
      blocks: [
        createBlock(
          latinCatalogParadigms.find((p) => p.id === "latin:noun:porta")!,
        ),
      ],
      direction: "analysis",
    };
  if (id === "latin:deck:laudo-present") {
    const block = createBlock(
      latinCatalogParadigms.find((p) => p.id === "latin:verb:laudo")!,
    );
    block.selected.tense = ["present"];
    block.selected.voice = ["active"];
    block.selected.mood = ["indicative"];
    return {
      ...common,
      name: "laudō — presente indicativo ativo",
      blocks: [block],
      direction: "analysis",
    };
  }
  return {
    ...common,
    name: "porta + rēx + laudō + hic",
    blocks: [
      "latin:noun:porta",
      "latin:noun:rex",
      "latin:verb:laudo",
      "latin:pronoun:hic",
    ].map((id) => createBlock(latinCatalogParadigms.find((p) => p.id === id)!)),
    direction: "mixed",
  };
}
function withoutMarks(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}
function parseLatinBackup(text: string): LatinBackup {
  const value = JSON.parse(text) as Partial<LatinBackup>;
  const validPreferences =
    typeof value.preferences?.showTransliteration === "boolean" &&
    typeof value.preferences?.showTranslation === "boolean";
  const validDecks =
    Array.isArray(value.decks) &&
    value.decks.every(
      (deck) =>
        deck &&
        typeof deck.id === "string" &&
        typeof deck.name === "string" &&
        Array.isArray(deck.blocks) &&
        deck.blocks.every(
          (block) =>
            block &&
            typeof block.id === "string" &&
            latinCatalogParadigms.some(({ id }) => id === block.paradigmId),
        ),
    );
  if (
    value.schemaVersion !== 1 ||
    value.language !== "latin" ||
    value.catalogVersion !== latinCatalogVersion ||
    !validDecks ||
    !validPreferences
  )
    throw new Error("Este arquivo não é um backup latino compatível.");
  return value as LatinBackup;
}
function mergeLatinDecks(
  current: SavedDeck[],
  incoming: SavedDeck[],
): SavedDeck[] {
  const ids = new Set(current.map(({ id }) => id));
  return [
    ...current,
    ...incoming.map((deck) =>
      ids.has(deck.id)
        ? {
            ...deck,
            id: createId("latin-deck"),
            name: `${deck.name} (importado)`,
            blocks: deck.blocks.map((block) => ({
              ...block,
              id: createId("latin-block"),
            })),
          }
        : deck,
    ),
  ];
}
