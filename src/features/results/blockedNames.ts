const LETTER_SWAPS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

const INCLUDED = [
  "fuck",
  "fuk",
  "fuq",
  "phuck",
  "phuk",
  "fck",
  "shit",
  "shyt",
  "bitch",
  "asshole",
  "ashole",
  "asshat",
  "asswipe",
  "bastard",
  "damn",
  "crap",
  "piss",
  "slut",
  "whore",
  "cunt",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "twat",
  "wank",
  "bollock",
  "motherfuck",
  "bullshit",
  "dipshit",
  "jackass",
  "dumbass",
  "badass",
  "smartass",
  "shithead",
  "fucker",
  "fucking",
  "goddam",
  "porn",
  "pussy",
  "penis",
  "vagina",
  "dildo",
  "anal",
  "cocksuck",
  "dickhead",
  "dickface",
  "dickweed",
  "kike",
  "chink",
  "wetback",
  "gook",
];

const EXACT = new Set(["ass", "hell", "sex", "fag", "cum", "tit", "tits", "pee", "poop", "dick", "cock", "anus", "spic"]);

const SAFE = new Set([
  "hello",
  "hellos",
  "shell",
  "shelly",
  "shelley",
  "bass",
  "cass",
  "cassandra",
  "cassie",
  "pass",
  "mass",
  "glass",
  "class",
]);

function compactName(input: string): string {
  const folded = input.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
  let letters = "";
  for (const char of folded) {
    letters += LETTER_SWAPS[char] ?? char;
  }
  return letters.replace(/[^a-z]/g, "").replace(/(.)\1{2,}/g, "$1");
}

function squashRepeats(value: string): string {
  return value.replace(/(.)\1+/g, "$1");
}

export function isBlockedName(input: string): boolean {
  const compact = compactName(input);
  if (compact.length === 0 || SAFE.has(compact)) {
    return false;
  }
  const squashed = squashRepeats(compact);
  if (
    INCLUDED.some((term) => {
      if (compact.includes(term)) {
        return true;
      }
      const folded = squashRepeats(term);
      return folded.length >= 4 && squashed.includes(folded);
    })
  ) {
    return true;
  }
  if (compact === "ass" || compact.endsWith("ass")) {
    return true;
  }
  if (compact.includes("hell") || EXACT.has(compact)) {
    return true;
  }
  return false;
}
