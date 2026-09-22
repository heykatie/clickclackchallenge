import { commonWords } from "./commonWords";

const MAX_LINE_LENGTH = 48;
const LINE_COUNT = 40;

export function createWordLines(
  random: () => number = Math.random,
  lineCount = LINE_COUNT,
): string[] {
  const lines: string[] = [];
  let previous = "";

  for (let line = 0; line < lineCount; line += 1) {
    const words: string[] = [];
    while (true) {
      const word = nextWord(random, previous);
      const withWord = words.length === 0 ? word : `${words.join(" ")} ${word}`;
      if (words.length > 0 && withWord.length + 1 > MAX_LINE_LENGTH) {
        break;
      }
      words.push(word);
      previous = word;
    }
    lines.push(`${words.join(" ")} `);
  }

  return lines;
}

function nextWord(random: () => number, previous: string): string {
  const word = pick(random);
  if (word !== previous) {
    return word;
  }
  const index = commonWords.indexOf(word as (typeof commonWords)[number]);
  return commonWords[(index + 1) % commonWords.length] ?? word;
}

function pick(random: () => number): string {
  const index = Math.min(
    commonWords.length - 1,
    Math.floor(random() * commonWords.length),
  );
  return commonWords[index] ?? "the";
}
