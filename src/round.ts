import type { NominalAnalysis, NominalForm } from "./catalog";

export interface RoundQuestion {
  item: NominalForm;
  options: NominalAnalysis[];
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnalysis: NominalAnalysis;
}

function sameAnalysis(left: NominalAnalysis, right: NominalAnalysis): boolean {
  return (
    left.grammaticalCase === right.grammaticalCase &&
    left.grammaticalNumber === right.grammaticalNumber
  );
}

function shuffled<T>(values: T[]): T[] {
  return values
    .map((value) => ({ value, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ value }) => value);
}

export function formatAnalysis(analysis: NominalAnalysis): string {
  return `${analysis.grammaticalCase} · ${analysis.grammaticalNumber}`;
}

export class NominalRound {
  readonly total: number;
  private readonly mastered = new Set<string>();
  private readonly analyses: NominalAnalysis[];
  private queue: NominalForm[];

  constructor(items: NominalForm[]) {
    this.total = items.length;
    this.queue = shuffled(items);
    this.analyses = items
      .map((item) => item.analysis)
      .filter(
        (analysis, index, all) =>
          all.findIndex((candidate) => sameAnalysis(candidate, analysis)) === index
      );
  }

  get masteredCount(): number {
    return this.mastered.size;
  }

  get isComplete(): boolean {
    return this.queue.length === 0;
  }

  question(): RoundQuestion | null {
    const item = this.queue[0];
    if (!item) return null;

    const correct = item.analysis;
    const distractors = this.analyses
      .filter((analysis) => !sameAnalysis(analysis, correct))
      .sort((left, right) => {
        const leftMatches =
          Number(left.grammaticalCase === correct.grammaticalCase) +
          Number(left.grammaticalNumber === correct.grammaticalNumber);
        const rightMatches =
          Number(right.grammaticalCase === correct.grammaticalCase) +
          Number(right.grammaticalNumber === correct.grammaticalNumber);
        return rightMatches - leftMatches;
      })
      .slice(0, 2);

    return {
      item,
      options: shuffled([correct, ...distractors])
    };
  }

  answer(selected: NominalAnalysis): AnswerResult {
    const current = this.queue.shift();
    if (!current) {
      throw new Error("Não há pergunta ativa para responder.");
    }

    const isCorrect = sameAnalysis(selected, current.analysis);
    if (isCorrect) {
      this.mastered.add(current.id);
    } else {
      const reviewDistance = Math.min(2, this.queue.length);
      this.queue.splice(reviewDistance, 0, current);
    }

    return { isCorrect, correctAnalysis: current.analysis };
  }
}
