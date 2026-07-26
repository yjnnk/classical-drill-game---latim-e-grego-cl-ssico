import { kreneForms, type NominalAnalysis } from "./catalog";
import { formatAnalysis, NominalRound } from "./round";
import "./styles.css";

function requireAppRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) {
    throw new Error("Elemento raiz da aplicação não encontrado.");
  }
  return root;
}

const app = requireAppRoot();

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

  app
    .querySelector<HTMLButtonElement>("[data-action='start']")
    ?.addEventListener("click", startRound);
}

function startRound(): void {
  const round = new NominalRound(kreneForms);

  function renderQuestion(): void {
    const question = round.question();
    if (!question) {
      renderComplete();
      return;
    }

    app.innerHTML = `
      <section class="round" aria-labelledby="question-title">
        <header class="round-header">
          <button class="quiet" type="button" data-action="exit">Sair</button>
          <p aria-live="polite">Progresso: ${round.masteredCount} de ${round.total}</p>
        </header>

        <div class="prompt">
          <p id="question-title">Qual é a análise desta forma?</p>
          <p class="greek-form" lang="grc">${question.item.form}</p>
        </div>

        <div class="options" role="group" aria-label="Alternativas">
          ${question.options
            .map(
              (option, index) => `
                <button class="option" type="button">
                  <span class="option-number">${index + 1}</span>
                  <span>${formatAnalysis(option)}</span>
                </button>
              `
            )
            .join("")}
        </div>
        <div class="feedback" aria-live="polite"></div>
      </section>
    `;

    app
      .querySelector<HTMLButtonElement>("[data-action='exit']")
      ?.addEventListener("click", renderHome);

    const buttons = [
      ...app.querySelectorAll<HTMLButtonElement>(".option")
    ];
    buttons.forEach((button, index) => {
      const selected = question.options[index];
      if (selected) {
        button.addEventListener("click", () =>
          answer(buttons, button, selected)
        );
      }
    });
  }

  function answer(
    buttons: HTMLButtonElement[],
    selectedButton: HTMLButtonElement,
    selectedAnalysis: NominalAnalysis
  ): void {
    const result = round.answer(selectedAnalysis);
    const correctLabel = formatAnalysis(result.correctAnalysis);

    buttons.forEach((button) => {
      button.disabled = true;
      if (button.textContent?.includes(correctLabel)) {
        button.classList.add("correct");
      }
    });

    if (!result.isCorrect) {
      selectedButton.classList.add("incorrect");
    }

    const feedback = app.querySelector<HTMLElement>(".feedback");
    if (!feedback) return;

    feedback.innerHTML = `
      <div class="feedback-copy ${result.isCorrect ? "success" : "error"}">
        <strong>${result.isCorrect ? "Correto" : "Ainda não"}</strong>
        <span>${
          result.isCorrect
            ? "Você reconheceu a forma."
            : `A resposta é ${correctLabel}. Esta forma voltará.`
        }</span>
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
    app
      .querySelector<HTMLButtonElement>("[data-action='home']")
      ?.addEventListener("click", renderHome);
  }

  renderQuestion();
}

renderHome();
