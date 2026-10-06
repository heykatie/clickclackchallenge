import { describe, expect, it } from "vitest";
import css from "./index.css?raw";

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*#([0-9a-fA-F]{6})`));
  if (!match?.[1]) {
    throw new Error(`Missing color token --${name}`);
  }
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}

/** Mixes like CSS color-mix(in srgb, first share%, second). */
function mix(first: string, second: string, share: number): string {
  return [0, 2, 4]
    .map((offset) => {
      const a = parseInt(first.slice(offset, offset + 2), 16);
      const b = parseInt(second.slice(offset, offset + 2), 16);
      return Math.round(a * share + b * (1 - share))
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
}

// Small text needs 4.5:1 (WCAG AA). These are the text colors and every surface they sit on.
describe("design token contrast", () => {
  const blush = token("tiny-blush");
  const white = token("tiny-white");

  it("keeps muted secondary text readable on the page, cards, and selected setup tiles", () => {
    const muted = token("tiny-muted");
    const surfaces = [
      blush,
      white,
      mix(token("tiny-lavender-light"), white, 0.55),
      mix(token("tiny-mint"), white, 0.3),
    ];
    for (const surface of surfaces) {
      expect(contrast(muted, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the main text colors readable on the page and cards", () => {
    for (const text of ["tiny-charcoal", "tiny-lavender-deep", "tiny-mint-deep", "tiny-gold-deep"]) {
      expect(contrast(token(text), blush)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token(text), white)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
