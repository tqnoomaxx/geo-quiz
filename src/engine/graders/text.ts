export interface TextGradeOptions {
  expected: string;
  aliases?: readonly string[];
  locale?: string;
}

export interface TextGradeResult {
  correct: boolean;
  normalizedInput: string;
  matchedAnswer?: string;
}

const TYPOGRAPHIC_APOSTROPHES = /[’‘`´]/g;
const TYPOGRAPHIC_DASHES = /[‐‑‒–—―]/g;
const MULTIPLE_WHITESPACE = /\s+/g;

export function normalizeTextAnswer(
  value: string,
  locale = "de"
): string {
  return value
    .normalize("NFKC")
    .replace(TYPOGRAPHIC_APOSTROPHES, "'")
    .replace(TYPOGRAPHIC_DASHES, "-")
    .trim()
    .replace(MULTIPLE_WHITESPACE, " ")
    .toLocaleLowerCase(locale);
}

export function gradeTextAnswer(
  input: string,
  options: TextGradeOptions
): TextGradeResult {
  const locale = options.locale ?? "de";
  const normalizedInput = normalizeTextAnswer(input, locale);
  const acceptedAnswers = [options.expected, ...(options.aliases ?? [])];

  const matchedAnswer = acceptedAnswers.find(
    (answer) => normalizeTextAnswer(answer, locale) === normalizedInput
  );

  return {
    correct: Boolean(matchedAnswer),
    normalizedInput,
    matchedAnswer
  };
}
