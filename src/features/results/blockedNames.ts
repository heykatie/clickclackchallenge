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
  "fvck",
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
  "fatass",
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
  "boob",
  "boobie",
  "boobies",
  "titties",
  "nipple",
  "nipples",
  "cocksuck",
  "dickhead",
  "dickface",
  "dickweed",
  "kike",
  "chink",
  "wetback",
  "gook",
];

const EXACT = new Set(["ass", "anal", "hell", "sex", "fag", "cum", "tit", "tits", "pee", "poop", "dick", "cock", "anus", "spic"]);

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

/**
 * Real names and places that contain a blocked word: set aside before checking, so Michelle, Annalise,
 * or Scunthorpe is never turned away. Compared after letters are folded and spaces removed.
 */
const SAFE_PARTS = [
  "michel",
  "rochel",
  "mitchel",
  "hellen",
  "hellman",
  "othello",
  "hello",
  "shell",
  "annalis",
  "analia",
  "analy",
  "scunthorpe",
  "penistone",
  "pissarro",
  "shiitake",
  "shitake",
  "shitaki",
];

/**
 * Rude drawings made of symbols, which have no letters for the word checks to catch. They are matched on the
 * name as typed, before punctuation is removed.
 */
const DRAWINGS = [
  // Boobs: (.)(.), (o)(o), ( * )( * )
  /\(\s*[.o0*•°]\s*\)\s*\(\s*[.o0*•°]\s*\)/i,
  // Boobs: (.Y.), (oYo)
  /\(\s*[.o0*]\s*y\s*[.o0*]\s*\)/i,
  // 8=D, 8===>, and B==D; with a B it takes two or more, so "B=D" stays ordinary typing.
  /8\s*=+\s*[d>]/i,
  /b\s*={2,}\s*[d>]/i,
  /c\s*={2,}\s*3/i,
  // The middle finger.
  /╭∩╮|凸/,
];

export function isBlockedName(input: string): boolean {
  if (DRAWINGS.some((drawing) => drawing.test(input))) {
    return true;
  }
  const folded = compactName(input);
  if (folded.length === 0 || SAFE.has(folded)) {
    return false;
  }
  const compact = SAFE_PARTS.reduce((rest, part) => rest.replaceAll(part, ""), folded);
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
  // Short words like "ass", "anal", and "hell" sit inside many real names (Douglass, Annalise, Michelle), so
  // they block only as the whole name; the real compounds (jackass, asshole) are in INCLUDED.
  return EXACT.has(compact);
}
