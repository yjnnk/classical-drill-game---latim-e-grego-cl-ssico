import type { Analysis, DrillItem } from "./catalog";

export type RoundDirection = "analysis" | "production";
export type DirectionMode = RoundDirection | "mixed";
export type CoverageMode = "all" | "limited";

export interface RoundConfig {
  direction: DirectionMode;
  coverage: CoverageMode;
  quantity?: number;
  random?: () => number;
}

export interface RoundChoice {
  id: string;
  label: string;
  correct: boolean;
}

export interface RoundQuestion {
  item: DrillItem;
  direction: RoundDirection;
  prompt: string;
  context?: string;
  choices: RoundChoice[];
}

export interface AnswerResult {
  isCorrect: boolean;
  correctLabel: string;
}

interface ScheduledItem {
  item: DrillItem;
  direction: RoundDirection;
}

const labels = {
  tense: {
    present: "presente",
    imperfect: "imperfeito",
    future: "futuro",
    aorist: "aoristo",
    perfect: "perfeito",
    pluperfect: "mais-que-perfeito",
    "future-perfect": "futuro perfeito"
  },
  voice: { active: "ativo", middle: "médio", passive: "passivo" },
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

function paradigmIdentity(item: DrillItem): string {
  return [...(item.sourceParadigmIds ?? [item.id])].sort().join("|");
}

function displayedForms(item: DrillItem): string[] {
  return item.forms ?? item.form.split(/\s*\/\s*/u);
}

function analysesForPrompt(
  item: DrillItem,
  prompt: string,
  eligible: DrillItem[]
): Analysis[] {
  const analyses = eligible
    .filter((candidate) =>
      paradigmIdentity(candidate) === paradigmIdentity(item) &&
      displayedForms(candidate).includes(prompt)
    )
    .flatMap(({ analyses: candidateAnalyses }) => candidateAnalyses);
  return [
    ...new Map(analyses.map((analysis) => [analysisIdentity(analysis), analysis])).values()
  ];
}

function productionIdentity(item: DrillItem): string {
  return `${paradigmIdentity(item)}::${analysisSetIdentity(item.analyses)}`;
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
      right.map((rightAnalysis) => matchingTraits(leftAnalysis, rightAnalysis))
    )
  );
}

function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

function translated(dictionary: Record<string, string>, value: string): string {
  return dictionary[value] ?? value;
}

export function formatAnalysis(analysis: Analysis): string {
  if (analysis.kind === "numeral" || analysis.kind === "terminology") {
    return analysis.meaning;
  }
  if (analysis.kind === "nominal") {
    return [
      analysis.grammaticalCase,
      analysis.grammaticalNumber,
      analysis.gender
    ].filter(Boolean).join(" · ");
  }
  if (analysis.kind === "infinitive") {
    return [
      "infinitivo",
      translated(labels.tense, analysis.tense),
      translated(labels.voice, analysis.voice)
    ].join(" · ");
  }
  if (analysis.kind === "adjective") {
    return [
      "adjetivo",
      analysis.degree,
      analysis.grammaticalCase,
      analysis.grammaticalNumber,
      analysis.gender
    ].filter(Boolean).join(" · ");
  }
  if (analysis.kind === "participle") {
    return [
      "particípio",
      translated(labels.tense, analysis.tense),
      translated(labels.voice, analysis.voice),
      analysis.grammaticalCase,
      analysis.grammaticalNumber,
      analysis.gender
    ].filter(Boolean).join(" · ");
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

function withoutDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function balancedSample(
  items: DrillItem[],
  quantity: number,
  random: () => number
): DrillItem[] {
  const groups = new Map<string, DrillItem[]>();
  for (const item of shuffled(items, random)) {
    for (const block of item.sourceBlockIds ?? ["unassigned"]) {
      groups.set(block, [...(groups.get(block) ?? []), item]);
    }
  }
  const selected: DrillItem[] = [];
  const selectedIds = new Set<string>();
  while (
    selected.length < quantity &&
    [...groups.values()].some((group) =>
      group.some(({ id }) => !selectedIds.has(id))
    )
  ) {
    for (const group of groups.values()) {
      const item = group.find(({ id }) => !selectedIds.has(id));
      if (item) {
        selected.push(item);
        selectedIds.add(item.id);
      }
      if (selected.length === quantity) break;
    }
  }
  return selected;
}

function sharesParadigm(left: DrillItem, right: DrillItem): boolean {
  const rightParadigms = new Set(right.sourceParadigmIds ?? []);
  return (left.sourceParadigmIds ?? []).some((id) => rightParadigms.has(id));
}

export class DrillRound {
  readonly total: number;
  private readonly mastered = new Set<string>();
  private readonly eligible: DrillItem[];
  private readonly random: () => number;
  private queue: ScheduledItem[];
  private activeQuestion: RoundQuestion | null = null;

  constructor(
    items: DrillItem[],
    config: RoundConfig = { direction: "analysis", coverage: "all" }
  ) {
    this.random = config.random ?? Math.random;
    this.eligible = items;
    const scheduledItems =
      config.coverage === "limited"
        ? balancedSample(
            items,
            Math.min(Math.max(config.quantity ?? items.length, 1), items.length),
            this.random
          )
        : shuffled(items, this.random);
    this.queue = scheduledItems.map((item, index) => ({
      item,
      direction:
        config.direction === "mixed"
          ? index % 2 === 0
            ? "analysis"
            : "production"
          : config.direction
    }));
    this.total = this.queue.length;
  }

  get masteredCount(): number {
    return this.mastered.size;
  }

  question(): RoundQuestion | null {
    const scheduled = this.queue[0];
    if (!scheduled) return null;
    if (
      this.activeQuestion &&
      this.activeQuestion.item.id === scheduled.item.id &&
      this.activeQuestion.direction === scheduled.direction
    ) {
      return this.activeQuestion;
    }
    this.activeQuestion =
      scheduled.direction === "analysis"
        ? this.analysisQuestion(scheduled.item)
        : this.productionQuestion(scheduled.item);
    return this.activeQuestion;
  }

  private analysisQuestion(item: DrillItem): RoundQuestion {
    const prompt = shuffled(displayedForms(item), this.random)[0] ?? item.form;
    const displayedAnalyses = analysesForPrompt(item, prompt, this.eligible);
    const displayedItem = { ...item, analyses: displayedAnalyses };
    const correctIdentity = analysisSetIdentity(displayedAnalyses);
    const candidates = [
      ...new Map(
        this.eligible.map((candidate) => [
          analysisSetIdentity(candidate.analyses),
          candidate.analyses
        ])
      ).entries()
    ]
      .filter(
        ([identity, analyses]) =>
          identity !== correctIdentity &&
          analyses[0]?.kind === displayedAnalyses[0]?.kind
      )
      .sort(
        ([, left], [, right]) => {
          const leftItem = this.eligible.find(
            ({ analyses }) => analysisSetIdentity(analyses) === analysisSetIdentity(left)
          );
          const rightItem = this.eligible.find(
            ({ analyses }) => analysisSetIdentity(analyses) === analysisSetIdentity(right)
          );
          const paradigmPriority =
            Number(Boolean(rightItem && sharesParadigm(displayedItem, rightItem))) -
            Number(Boolean(leftItem && sharesParadigm(displayedItem, leftItem)));
          return (
            paradigmPriority ||
            setCloseness(right, displayedAnalyses) -
              setCloseness(left, displayedAnalyses)
          );
        }
      )
      .slice(0, 2);
    if (candidates.length < 2) {
      throw new Error(`O baralho não possui distrações suficientes para ${item.id}.`);
    }
    const choices = [
      {
        id: correctIdentity,
        label: formatAnalysisSet(displayedAnalyses),
        correct: true
      },
      ...candidates.map(([id, analyses]) => ({
        id,
        label: formatAnalysisSet(analyses),
        correct: false
      }))
    ];
    return {
      item: displayedItem,
      direction: "analysis",
      prompt,
      choices: shuffled(choices, this.random)
    };
  }

  private productionQuestion(item: DrillItem): RoundQuestion {
    const correctAnalysisIdentity = analysisSetIdentity(item.analyses);
    const correctIdentity = productionIdentity(item);
    const groups = new Map<
      string,
      { analyses: Analysis[]; forms: string[]; item: DrillItem }
    >();
    for (const candidate of this.eligible) {
      const identity = productionIdentity(candidate);
      const group = groups.get(identity) ?? {
        analyses: candidate.analyses,
        forms: [],
        item: candidate
      };
      if (!group.forms.includes(candidate.form)) group.forms.push(candidate.form);
      groups.set(identity, group);
    }
    const correct = groups.get(correctIdentity);
    if (!correct) throw new Error(`Forma correta ausente para ${item.id}.`);
    const normalizedCorrect = new Set(
      correct.forms.map((form) => withoutDiacritics(form))
    );
    const distractors = [...groups.entries()]
      .filter(
        ([identity, group]) =>
          identity !== correctIdentity &&
          group.analyses[0]?.kind === item.analyses[0]?.kind &&
          group.forms.every(
            (form) => !normalizedCorrect.has(withoutDiacritics(form))
          )
      )
      .sort(
        ([, left], [, right]) => {
          const paradigmPriority =
            Number(sharesParadigm(item, right.item)) -
            Number(sharesParadigm(item, left.item));
          return (
            paradigmPriority ||
            setCloseness(right.analyses, item.analyses) -
              setCloseness(left.analyses, item.analyses)
          );
        }
      )
      .slice(0, 2);
    if (distractors.length < 2) {
      throw new Error(`O baralho não possui formas distratoras suficientes para ${item.id}.`);
    }
    const choices = [
      {
        id: correctIdentity,
        label: correct.forms.join(" / "),
        correct: true
      },
      ...distractors.map(([id, group]) => ({
        id,
        label: group.forms.join(" / "),
        correct: false
      }))
    ];
    return {
      item,
      direction: "production",
      prompt: formatAnalysisSet(item.analyses),
      context:
        [...groups.values()].some(
          (group) =>
            analysisSetIdentity(group.analyses) === correctAnalysisIdentity &&
            !sharesParadigm(item, group.item)
        )
          ? item.productionContext
          : undefined,
      choices: shuffled(choices, this.random)
    };
  }

  answer(choiceId: string): AnswerResult {
    const current = this.queue.shift();
    const question = this.activeQuestion;
    if (!current || !question) {
      throw new Error("Não há pergunta ativa para responder.");
    }
    const selected = question.choices.find(({ id }) => id === choiceId);
    const correct = question.choices.find(({ correct }) => correct);
    if (!selected || !correct) throw new Error("Alternativa inválida.");
    if (selected.correct) {
      this.mastered.add(current.item.id);
    } else {
      this.queue.push(current);
    }
    this.activeQuestion = null;
    return { isCorrect: selected.correct, correctLabel: correct.label };
  }
}

export function roundFeasibilityError(
  items: DrillItem[],
  direction: DirectionMode
): string | null {
  const directions: RoundDirection[] =
    direction === "mixed" ? ["analysis", "production"] : [direction];
  for (const currentDirection of directions) {
    if (currentDirection === "analysis") {
      const setsByKind = new Map<string, Set<string>>();
      for (const item of items) {
        const kind = item.analyses[0]?.kind;
        if (!kind) continue;
        const identities = setsByKind.get(kind) ?? new Set<string>();
        identities.add(analysisSetIdentity(item.analyses));
        setsByKind.set(kind, identities);
      }
      if (items.some((item) =>
        (setsByKind.get(item.analyses[0]?.kind ?? "")?.size ?? 0) < 3
      )) {
        return "Este bloco não oferece duas distrações válidas para a direção escolhida.";
      }
      continue;
    }

    const groups = new Map<
      string,
      { kind: Analysis["kind"] | undefined; forms: Set<string> }
    >();
    for (const item of items) {
      const identity = productionIdentity(item);
      const group = groups.get(identity) ?? {
        kind: item.analyses[0]?.kind,
        forms: new Set<string>()
      };
      group.forms.add(item.form);
      groups.set(identity, group);
    }
    const values = [...groups.values()];
    for (const correct of values) {
      const normalizedCorrect = new Set(
        [...correct.forms].map(withoutDiacritics)
      );
      const distractors = values.filter((candidate) =>
        candidate !== correct &&
        candidate.kind === correct.kind &&
        [...candidate.forms].every((form) =>
          !normalizedCorrect.has(withoutDiacritics(form))
        )
      );
      if (distractors.length < 2) {
        return "Este bloco não oferece duas distrações válidas para a direção escolhida.";
      }
    }
  }
  return null;
}
