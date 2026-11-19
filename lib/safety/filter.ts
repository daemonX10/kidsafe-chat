import type { SafetyCategory, SafetyVerdict } from "./categories";
import { CATEGORY_PRIORITY, EMBEDDED_TERMS, WORDLIST } from "./wordlist";

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "i",
};

function toTokens(text: string): string[] {
  const cleaned = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\*/g, "")
    .replace(/[0-9@$!|]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]+/g, " ")
    .trim();
  return cleaned ? cleaned.split(" ") : [];
}

// Joins spaced-out letters ("s e x" -> "sex") so they can't dodge the filter.
function joinSingleLetterRuns(tokens: string[]): string[] {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 3) out.push(run.join(""));
    else out.push(...run);
    run = [];
  };
  for (const t of tokens) {
    if (t.length === 1) run.push(t);
    else {
      flush();
      out.push(t);
    }
  }
  flush();
  return out;
}

const collapseAll = (s: string) => s.replace(/(.)\1+/g, "$1");
const hasStretch = (s: string) => /(.)\1\1/.test(s);

type Compiled = {
  category: SafetyCategory;
  words: Set<string>;
  collapsedWords: Set<string>;
  phrases: string[];
};

const COMPILED: Compiled[] = CATEGORY_PRIORITY.map((category) => {
  const { words, phrases } = WORDLIST[category];
  const normWords = words.flatMap(toTokens);
  return {
    category,
    words: new Set(normWords),
    collapsedWords: new Set(normWords.map(collapseAll)),
    phrases: phrases.map((p) => ` ${toTokens(p).join(" ")} `),
  };
});

export function checkWordFilter(text: string): SafetyVerdict {
  const tokens = joinSingleLetterRuns(toTokens(text));
  if (tokens.length === 0) return { safe: true };
  const padded = ` ${tokens.join(" ")} `;

  for (const c of COMPILED) {
    for (const token of tokens) {
      // Only compare collapsed forms for deliberately stretched words ("fuuuck"), so "as" != "ass".
      if (c.words.has(token) || (hasStretch(token) && c.collapsedWords.has(collapseAll(token)))) {
        return { safe: false, category: c.category, source: "word-filter", matched: token };
      }
    }
    for (const phrase of c.phrases) {
      if (padded.includes(phrase)) {
        return { safe: false, category: c.category, source: "word-filter", matched: phrase.trim() };
      }
    }
  }

  for (const token of tokens) {
    const collapsed = collapseAll(token);
    for (const { term, category } of EMBEDDED_TERMS) {
      if (token.includes(term) || collapsed.includes(collapseAll(term))) {
        return { safe: false, category, source: "word-filter", matched: token };
      }
    }
  }

  return { safe: true };
}
