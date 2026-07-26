import "./styles.css";

type GrammaticalCase = "nominativo" | "genitivo" | "dativo" | "acusativo";
type GrammaticalNumber = "singular" | "plural";

interface NominalForm {
  id: string;
  form: string;
  grammaticalCase: GrammaticalCase;
  grammaticalNumber: GrammaticalNumber;
}

interface Question {
  item: NominalForm;
  options: string[];
}

const forms: NominalForm[] = [
  {
    id: "krene-nom-sg",
    form: "ἡ κρήνη",
    grammaticalCase: "nominativo",
    grammaticalNumber: "singular"
  },
  {
    id: "krene-gen-sg",
    form: "τῆς κρήνης",
    grammaticalCase: "genitivo",
    grammaticalNumber: "singular"
  },
  {
    id: "krene-dat-sg",
    form: "τῇ κρήνῃ",
    grammaticalCase: "dativo",
    grammaticalNumber: "singular"
  },
  {
    id: "krene-acc-sg",
    form: "τὴν κρήνην",
    grammaticalCase: "acusativo",
    grammaticalNumber: "singular"
  },
  {
    id: "krene-nom-pl",
    form: "αἱ κρῆναι",
    grammaticalCase: "nominativo",
    grammaticalNumber: "plural"
  },
  {
    id: "krene-gen-pl",
    form: "τῶν κρηνῶν",
    grammaticalCase: "genitivo",
    grammaticalNumber: "plural"
  },
  {
    id: "krene-dat-pl",
    form: "ταῖς κρήναις",
    grammaticalCase: "dativo",
    grammaticalNumber: "plural"
  },
  {
    id: "krene-acc-pl",
    form: "τὰ̄ς κρήνᾱς",
    grammaticalCase: "acusativo",
    grammaticalNumber: "plural"
  }
];

function requireAppRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) {
    throw new Error("Elemento raiz da aplicação não encontrado.");
  }
  return root;
}

const app = requireAppRoot();

function analysisOf(item: NominalForm): string {
  return `${item.grammaticalCase} · ${item.grammaticalNumber}`;
}

function shuffled<T>(values: T[]): T[] {
  return values
    .map((value) => ({ value, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ value }) => value);
}

function questionFor(item: NominalForm): Question {
  const correct = analysisOf(item);
  const distractors = forms
    .map(analysisOf)
    .filter((analysis, index, all) => analysis !== correct && all.indexOf(analysis) === index)
    .sort((left, right) => {
      const leftMatches = left.split(" · ").filter((part) => correct.includes(part)).length;
      const rightMatches = right.split(" · ").filter((part) => correct.includes(part)).length;
      return rightMatches - leftMatches;
    })
    .slice(0, 2);

  return {
    item,
    options: shuffled([correct, ...distractors])
  };
}

function renderHome(): void {
  app.innerHTML = `
    <section class="home" aria-labelledby="page-title">
      <p class="eyebrow">Recuperação ativa · sem pressa</p>
      <h1 id="page-title">Prática de grego clássico</h1>
      <p class="intro">Escolha a análise completa de cada forma. Se errar, ela volta até você acertar.</p>

      <article class="deck-card">
        <div>
          <p class="deck-label">Baralho inicial</p>
          <h2 lang="grc">κρήνη</h2>
          <p>Primeira declinação · singular e plural · 8 formas</p>
        </div>
        <button class="primary" type="button" data-action="start">Iniciar rodada</button>
      </article>
    </section>
  `;

  app.querySelector<HTMLButtonElement>("[data-action='start']")?.addEventListener("click", startRound);
}

function startRound(): void {
  const queue = shuffled(forms);
  const mastered = new Set<string>();

  function renderQuestion(): void {
    const current = queue[0];

    if (!current) {
      renderComplete();
      return;
    }

    const question = questionFor(current);
    const correct = analysisOf(current);

    app.innerHTML = `
      <section class="round" aria-labelledby="question-title">
        <header class="round-header">
          <button class="quiet" type="button" data-action="exit">Sair</button>
          <p aria-live="polite">Progresso: ${mastered.size} de ${forms.length}</p>
        </header>

        <div class="prompt">
          <p id="question-title">Qual é a análise desta forma?</p>
          <p class="greek-form" lang="grc">${current.form}</p>
        </div>

        <div class="options" aria-label="Alternativas">
          ${question.options
            .map(
              (option, index) => `
                <button class="option" type="button" data-answer="${option}">
                  <span class="option-number">${index + 1}</span>
                  <span>${option}</span>
                </button>
              `
            )
            .join("")}
        </div>
        <div class="feedback" aria-live="polite"></div>
      </section>
    `;

    app.querySelector<HTMLButtonElement>("[data-action='exit']")?.addEventListener("click", renderHome);
    app.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => answer(button, correct, current));
    });
  }

  function answer(button: HTMLButtonElement, correct: string, current: NominalForm): void {
    const selected = button.dataset.answer;
    const isCorrect = selected === correct;
    const buttons = [...app.querySelectorAll<HTMLButtonElement>("[data-answer]")];

    buttons.forEach((candidate) => {
      candidate.disabled = true;
      if (candidate.dataset.answer === correct) {
        candidate.classList.add("correct");
      }
    });

    if (!isCorrect) {
      button.classList.add("incorrect");
    }

    queue.shift();
    if (isCorrect) {
      mastered.add(current.id);
    } else {
      const reviewDistance = Math.min(2, queue.length);
      queue.splice(reviewDistance, 0, current);
    }

    const feedback = app.querySelector<HTMLElement>(".feedback");
    if (!feedback) return;

    feedback.innerHTML = `
      <div class="feedback-copy ${isCorrect ? "success" : "error"}">
        <strong>${isCorrect ? "Correto" : "Ainda não"}</strong>
        <span>${isCorrect ? "Você reconheceu a forma." : `A resposta é ${correct}. Esta forma voltará.`}</span>
      </div>
      <button class="primary" type="button" data-action="continue">Continuar</button>
    `;
    feedback
      .querySelector<HTMLButtonElement>("[data-action='continue']")
      ?.addEventListener("click", renderQuestion);
  }

  function renderComplete(): void {
    app.innerHTML = `
      <section class="complete">
        <p class="completion-mark" aria-hidden="true">✓</p>
        <p class="eyebrow">Rodada concluída</p>
        <h1>Você reconheceu todas as formas.</h1>
        <p>Sem nota e sem pressa. Apenas a prática feita.</p>
        <button class="primary" type="button" data-action="home">Voltar ao início</button>
      </section>
    `;
    app.querySelector<HTMLButtonElement>("[data-action='home']")?.addEventListener("click", renderHome);
  }

  renderQuestion();
}

renderHome();
