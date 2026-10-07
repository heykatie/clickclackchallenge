import { describe, expect, it } from "vitest";
import { isBlockedName } from "./blockedNames";

describe("isBlockedName", () => {
  // Real names that happen to contain a blocked word. Turning any of these away tells a real person their name
  // is not allowed.
  const REAL_NAMES = [
    "Michelle", "Rochelle", "Mitchell", "Shelly", "Hellen", "Helena", "Othello", "Hello Kitty",
    "Annalise", "Analia", "Hannah", "Cassidy", "Cassandra", "Chris Bass", "Douglass", "Hassan", "Assad", "Lassie",
    "Dickens", "Dickinson", "Scunthorpe", "Penistone", "Sussex", "Essex", "Cockburn", "Hancock", "Peacock",
    "Pissarro", "Matsuda", "Shiitake", "Titus", "Tito", "Kumar", "Cumberbatch", "Spencer", "Grape", "Analyn",
    "Therapist", "Shitaki", "Peter", "Asha", "Glass", "Classy", "Bassett", "Hellman", "Ashley",
  ];

  it("lets real names through", () => {
    expect(REAL_NAMES.filter((name) => isBlockedName(name))).toEqual([]);
  });

  it("keeps blocking Dick, a real nickname but also slang: a deliberate call", () => {
    expect(isBlockedName("Dick")).toBe(true);
  });

  it("still blocks abuse, including disguised spellings", () => {
    const ABUSE = [
      "fuck", "F U C K", "fuuuuck", "fvck", "f*ck", "5h1t", "sh!t", "shithead", "bitch", "a$$hole", "dumbass", "jackass",
      "badass", "fatass", "cunt", "nigger", "n1gger", "hell", "anal", "ass", "sex", "tits", "penis", "Big Penis", "pissoff",
    ];
    expect(ABUSE.filter((name) => !isBlockedName(name))).toEqual([]);
  });

  it("blocks rude symbol drawings, which have no letters to catch", () => {
    const DRAWINGS = [
      "(.)(.)", "( . )( . )", "(o)(o)", "(O)(O)", "(0)(0)", "(*)(*)", "(.Y.)", "( . Y . )", "(oYo)",
      "8=D", "8==D", "8===D", "8=====>", "B==D", "c==3", "╭∩╮", "凸", "Jo (.)(.)", "8==D Kai",
    ];
    expect(DRAWINGS.filter((name) => !isBlockedName(name))).toEqual([]);
  });

  it("lets names with ordinary punctuation through", () => {
    const NAMES = ["Jo (OG)", "Ana :)", "K.O.", "Bo (8)", "R2-D2", "Mr. T", "(Kai)", "Lee :D", "B=D?"];
    // B=D? is a single equals: too close to ordinary typing to block.
    expect(NAMES.filter((name) => isBlockedName(name))).toEqual([]);
  });
});
