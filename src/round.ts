import type { Analysis, DrillItem } from "./catalog";

export interface RoundQuestion {
  item: DrillItem;
  options: Analysis[][];
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnalyses: Analysis[];
}

const labels = {
  tense: {
    present: "presente",
    imperfect: "imperfeito",
    future: "futuro",
    aorist: "aoristo",
    perfect: "perfeito",
    pluperfect: "mais-que-perfeito"
  },
  voice: {
    active: "ativo",
    middle: "médio",
    passive: "passivo"
  },
  mood: {
    indicative: "indicativo",
    subjunctive: "subjuntivo",
    optative: "optativo",
    imperative: "imperativo"
  },
  person: {
    first: "1ª pessoa",
    second: "2ª pessoa",
    third: "3ª pessoa"
  }
} as const;

function analysisIdentity(analysis: Analysis): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(analysis).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    )
  );
}

function analysisSetIdentity(analyses: Analysis[]): string {
  return analyses.map(analysisIdentity).sort().join("|");
}

function sameAnalysisSet(left: Analysis[], right: Analysis[]): boolean {
  return analysisSetIdentity(left) === analysisSetIdentity(right);
}

function matchingTraits(left: Analysis, right: Analysis): number {
  if (left.kind !== right.kind) return -1;
  return Object.entries(left).filter(
    ([key, value]) => key !== "kind" && right[key as keyof Analysis] === value
  ).length;
}

function setCloseness(left: Analysis[], right: Analysis[]): number {
  return Math.max(
    ...left.flatMap((leftAnalysis) =>
      right.map((rightAnalysis) =>
        matchingTraits(leftAnalysis, rightAnalysis)
      )
    )
  );
}

function shuffled<T>(values: T[]): T[] {
  return values
    .map((value) => ({ value, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ value }) => value);
}

function translated(
  dictionary: Record<string, string>,
  value: string
): string {
  return dictionary[value] ?? value;
}

export function formatAnalysis(analysis: Analysis): string {
  if (analysis.kind === "nominal") {
    return `${analysis.grammaticalCase} · ${analysis.grammaticalNumber}`;
  }
  return [
    translated(labels.tense, analysis.tense),
    translated(labels.voice, analysis.voice),
    translated(labels.mood, analysis.mood),
    translated(labels.person, analysis.person),
    analysis.grammaticalNumber
  ].join(" · ");
}

export function formatAnalysisSet(analyses: Analysis[]): string {
  return analyses.map(formatAnalysis).join(" ou ");
}

export class DrillRound {
  readonly total: number;
  private readonly mastered = new Set<string>();
  private readonly analysisSets: Analysis[][];
  private queue: DrillItem[];

  constructor(items: DrillItem[]) {
    this.total = items.length;
    this.queue = shuffled(items);
    this.analysisSets = items
      .map((item) => item.analyses)
      .filter(
        (analyses, index, all) =>
          all.findIndex((candidate) =>
            sameAnalysisSet(candidate, analyses)
          ) === index
      );
  }

  get masteredCount(): number {
    return this.mastered.size;
  }

  question(): RoundQuestion | null {
    const item = this.queue[0];
    if (!item) return null;

    const distractors = this.analysisSets
      .filter((analyses) => !sameAnalysisSet(analyses, item.analyses))
      .sort(
        (left, right) =>
          setCloseness(right, item.analyses) -
          setCloseness(left, item.analyses)
      )
      .slice(0, 2);

    if (distractors.length < 2) {
      throw new Error(`O baralho não possui distrações suficientes para ${item.id}.`);
    }

    return {
      item,
      options: shuffled([item.analyses, ...distractors])
    };
  }

  answer(selected: Analysis[]): AnswerResult {
    const current = this.queue.shift();
    if (!current) {
      throw new Error("Não há pergunta ativa para responder.");
    }

    const isCorrect = sameAnalysisSet(selected, current.analyses);
    if (isCorrect) {
      this.mastered.add(current.id);
    } else {
      const reviewDistance = Math.min(2, this.queue.length);
      this.queue.splice(reviewDistance, 0, current);
    }

    return { isCorrect, correctAnalyses: current.analyses };
  }
}
