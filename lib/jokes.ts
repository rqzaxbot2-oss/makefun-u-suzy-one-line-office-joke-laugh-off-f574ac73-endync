export type JokeCategory =
  | "remote"
  | "email"
  | "corporate-jargon"
  | "management"
  | "meetings"
  | "workspace";

export interface LexicalMetadata {
  charCount: number;
  wordCount: number;
  uniqueWordCount: number;
  sentenceCount: number;
  lineCount: number;
  isSingleLine: boolean;
  hasOfficeContext: boolean;
  officeTermsMatched: string[];
  averageWordLength: number;
  lexicalDiversity: number;
  punchword: string;
  hasExplicitPivot: boolean;
  setupToPunchRatio: number;
  tightnessScore: number;
}

export interface JokeEntry {
  id: string;
  text: string;
  category: JokeCategory;
  featured: boolean;
  premise: string;
  comicDevice: string;
  metadata: LexicalMetadata;
}

export interface PairwiseComparison {
  leftId: string;
  rightId: string;
  winnerId: string;
  margin: number;
  rationale: string;
}

export interface StandingRow {
  id: string;
  wins: number;
  losses: number;
  score: number;
  text: string;
}

export interface BenchmarkSummary {
  featuredId: string;
  featuredJoke: string;
  totalCandidates: number;
  entries: JokeEntry[];
  matchups: PairwiseComparison[];
  standings: StandingRow[];
}

export const OFFICE_LEXICON: readonly string[] = [
  "all-hands",
  "boss",
  "breakroom",
  "calendar",
  "camera",
  "coworker",
  "coworkers",
  "cubicle",
  "deadline",
  "desk",
  "email",
  "hr",
  "initiatives",
  "invite",
  "job",
  "lanyard",
  "management",
  "manager",
  "meeting",
  "meetings",
  "office",
  "outlook",
  "payroll",
  "printer",
  "profits",
  "pto",
  "quarterly",
  "regards",
  "roadmap",
  "salary",
  "slack",
  "spreadsheet",
  "standup",
  "synergy",
  "team",
  "workday",
  "zoom",
] as const;

export const FEATURED_JOKE_TEXT =
  "I finally turned my camera on at the all-hands, and my manager welcomed me to the team.";

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function extractWords(text: string): string[] {
  const matches = text.trim().match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g);
  return matches ? matches : [];
}

function findPivotPosition(text: string): { found: boolean; ratio: number } {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { found: false, ratio: 0 };
  }

  const pivots = [", and ", ", but ", ", so ", ", ", " — ", " - ", ": ", "; "];
  let bestIndex = -1;

  for (const marker of pivots) {
    const idx = trimmed.indexOf(marker);
    if (idx > 0 && idx > bestIndex) {
      bestIndex = idx;
    }
  }

  if (bestIndex === -1) {
    return { found: false, ratio: 0.5 };
  }

  return {
    found: true,
    ratio: roundTo(bestIndex / trimmed.length, 4),
  };
}

export function analyzeJokeLexicon(text: string): LexicalMetadata {
  const trimmed = text.trim();
  const lineCount = trimmed.length === 0 ? 0 : trimmed.split(/\r?\n/).length;
  const isSingleLine = lineCount === 1;
  const charCount = trimmed.length;
  const words = extractWords(trimmed);
  const wordCount = words.length;
  const lowerWords = words.map((w) => w.toLowerCase());
  const uniqueSet = new Set(lowerWords);
  const uniqueWordCount = uniqueSet.size;

  const sentenceMatches = trimmed.match(/[.!?]+(?=\s|$)/g);
  const sentenceCount =
    trimmed.length === 0 ? 0 : sentenceMatches ? sentenceMatches.length : 1;

  const totalLetters = words.reduce((sum, w) => sum + w.length, 0);
  const averageWordLength =
    wordCount === 0 ? 0 : roundTo(totalLetters / wordCount, 4);
  const lexicalDiversity =
    wordCount === 0 ? 0 : roundTo(uniqueWordCount / wordCount, 4);

  const officeTermsMatched = OFFICE_LEXICON.filter((term) =>
    uniqueSet.has(term),
  );
  const hasOfficeContext = officeTermsMatched.length > 0;
  const punchword =
    lowerWords.length > 0 ? lowerWords[lowerWords.length - 1] : "";

  const pivot = findPivotPosition(trimmed);

  let tightness = 100;
  if (!isSingleLine) {
    tightness -= 60;
  }
  if (sentenceCount > 1) {
    tightness -= (sentenceCount - 1) * 12;
  }
  if (wordCount < 10) {
    tightness -= (10 - wordCount) * 4;
  } else if (wordCount > 18) {
    tightness -= (wordCount - 18) * 4;
  }
  if (charCount > 100) {
    tightness -= (charCount - 100) * 0.6;
  }
  if (pivot.found) {
    const distanceFromGolden = Math.abs(pivot.ratio - 0.55);
    tightness += clamp(6 - distanceFromGolden * 20, -4, 6);
  } else {
    tightness -= 3;
  }

  const tightnessScore = roundTo(clamp(tightness, 0, 100), 2);

  return {
    charCount,
    wordCount,
    uniqueWordCount,
    sentenceCount,
    lineCount,
    isSingleLine,
    hasOfficeContext,
    officeTermsMatched,
    averageWordLength,
    lexicalDiversity,
    punchword,
    hasExplicitPivot: pivot.found,
    setupToPunchRatio: pivot.ratio,
    tightnessScore,
  };
}

interface JokeSeed {
  id: string;
  text: string;
  category: JokeCategory;
  featured: boolean;
  premise: string;
  comicDevice: string;
}

const JOKE_SEEDS: readonly JokeSeed[] = [
  {
    id: "featured-all-hands-camera",
    text: FEATURED_JOKE_TEXT,
    category: "remote",
    featured: true,
    premise: "Long-term remote employee stays camera-off so reliably that leadership mistakes them for a new hire.",
    comicDevice: "Misdirection via polite corporate reflex",
  },
  {
    id: "bench-email-escalation",
    text: "You know a coworker snapped when 'Best,' drops to 'Regards,' and then straight to a Friday 4:45 PM invite.",
    category: "email",
    featured: false,
    premise: "Passive-aggressive email sign-offs escalating into a late-Friday calendar trap.",
    comicDevice: "Rule-of-three escalation",
  },
  {
    id: "bench-voodoo-roadmap",
    text: "We have put a pin in so many initiatives that our quarterly roadmap is legally a voodoo doll.",
    category: "corporate-jargon",
    featured: false,
    premise: "Overuse of 'put a pin in it' turns corporate planning into an occult object.",
    comicDevice: "Literalized corporate idiom",
  },
  {
    id: "bench-urgent-lanyard",
    text: "Every email marked urgent at my office is just someone else's procrastination wearing a lanyard.",
    category: "email",
    featured: false,
    premise: "Manufactured urgency disguised as workplace authority.",
    comicDevice: "Visual personification",
  },
  {
    id: "bench-slack-green-dot",
    text: "I do not have imposter syndrome because my green Slack dot genuinely does eighty percent of my job.",
    category: "remote",
    featured: false,
    premise: "Subverting imposter syndrome by admitting presence status does the heavy lifting.",
    comicDevice: "Self-deprecating inversion",
  },
  {
    id: "bench-pizza-slices",
    text: "Management celebrated record quarterly profits by carefully cutting the breakroom pizza into thirty-two slices.",
    category: "management",
    featured: false,
    premise: "Corporate celebration undercut by comically stingy rationing.",
    comicDevice: "Ironic bathos",
  },
];

function hydrateEntry(seed: JokeSeed): JokeEntry {
  return {
    id: seed.id,
    text: seed.text,
    category: seed.category,
    featured: seed.featured,
    premise: seed.premise,
    comicDevice: seed.comicDevice,
    metadata: analyzeJokeLexicon(seed.text),
  };
}

export const BENCHMARK_LINEUP: readonly JokeEntry[] = JOKE_SEEDS.map(hydrateEntry);

export const FEATURED_JOKE: JokeEntry = BENCHMARK_LINEUP[0];

export const ENTRY_JOKE: JokeEntry = FEATURED_JOKE;

export const JOKES: readonly JokeEntry[] = BENCHMARK_LINEUP;

export function getFeaturedJoke(): JokeEntry {
  return FEATURED_JOKE;
}

export function getBenchmarkLineup(): JokeEntry[] {
  return BENCHMARK_LINEUP.map((entry) => ({
    ...entry,
    metadata: {
      ...entry.metadata,
      officeTermsMatched: [...entry.metadata.officeTermsMatched],
    },
  }));
}

export function scoreJokeCandidate(entry: JokeEntry): number {
  const m = entry.metadata;
  const formatValidity = m.isSingleLine && m.hasOfficeContext ? 30 : 0;
  const officeGrounding = Math.min(m.officeTermsMatched.length, 4) * 5;
  const economy = m.tightnessScore * 0.35;
  const freshness = m.lexicalDiversity * 12;
  const pivotClarity = m.hasExplicitPivot
    ? clamp(8 - Math.abs(m.setupToPunchRatio - 0.55) * 20, 2, 8)
    : 3;

  return roundTo(
    formatValidity + officeGrounding + economy + freshness + pivotClarity,
    2,
  );
}

export function compareJokesPairwise(
  left: JokeEntry,
  right: JokeEntry,
): PairwiseComparison {
  const leftScore = scoreJokeCandidate(left);
  const rightScore = scoreJokeCandidate(right);

  const leftWins =
    leftScore > rightScore ||
    (leftScore === rightScore &&
      (left.metadata.charCount < right.metadata.charCount ||
        (left.metadata.charCount === right.metadata.charCount &&
          left.id < right.id)));

  const winner = leftWins ? left : right;
  const loser = leftWins ? right : left;
  const margin = roundTo(Math.abs(leftScore - rightScore), 2);

  const reasons: string[] = [];
  if (winner.metadata.tightnessScore > loser.metadata.tightnessScore) {
    reasons.push("tighter one-line wording");
  }
  if (
    winner.metadata.officeTermsMatched.length >
    loser.metadata.officeTermsMatched.length
  ) {
    reasons.push("stronger office grounding");
  }
  if (winner.metadata.hasExplicitPivot && !loser.metadata.hasExplicitPivot) {
    reasons.push("cleaner setup-to-punch pivot");
  }
  if (winner.metadata.lexicalDiversity > loser.metadata.lexicalDiversity) {
    reasons.push("fresher word choice");
  }
  if (reasons.length === 0) {
    reasons.push("higher overall brevity and punch");
  }

  return {
    leftId: left.id,
    rightId: right.id,
    winnerId: winner.id,
    margin,
    rationale: `${winner.id} edges ${loser.id} on ${reasons.join(", ")}.`,
  };
}

export function runBenchmarkTournament(
  entries: readonly JokeEntry[] = BENCHMARK_LINEUP,
): BenchmarkSummary {
  const list = [...entries];
  const matchups: PairwiseComparison[] = [];
  const winMap = new Map<string, number>();
  const lossMap = new Map<string, number>();

  for (const entry of list) {
    winMap.set(entry.id, 0);
    lossMap.set(entry.id, 0);
  }

  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const result = compareJokesPairwise(list[i], list[j]);
      matchups.push(result);
      const loserId =
        result.winnerId === list[i].id ? list[j].id : list[i].id;
      winMap.set(result.winnerId, (winMap.get(result.winnerId) ?? 0) + 1);
      lossMap.set(loserId, (lossMap.get(loserId) ?? 0) + 1);
    }
  }

  const standings: StandingRow[] = list
    .map((entry) => ({
      id: entry.id,
      wins: winMap.get(entry.id) ?? 0,
      losses: lossMap.get(entry.id) ?? 0,
      score: scoreJokeCandidate(entry),
      text: entry.text,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.id.localeCompare(b.id);
    });

  const featured = list.find((entry) => entry.featured) ?? list[0];

  return {
    featuredId: featured ? featured.id : "",
    featuredJoke: featured ? featured.text : FEATURED_JOKE_TEXT,
    totalCandidates: list.length,
    entries: list,
    matchups,
    standings,
  };
}

export default {
  OFFICE_LEXICON,
  FEATURED_JOKE_TEXT,
  FEATURED_JOKE,
  ENTRY_JOKE,
  BENCHMARK_LINEUP,
  JOKES,
  analyzeJokeLexicon,
  getFeaturedJoke,
  getBenchmarkLineup,
  scoreJokeCandidate,
  compareJokesPairwise,
  runBenchmarkTournament,
};