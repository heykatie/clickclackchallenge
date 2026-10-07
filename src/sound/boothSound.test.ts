import { describe, expect, it, vi } from "vitest";
import { createBoothSound } from "./boothSound";

function fakeContext() {
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const oscillators: { frequency: number; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    currentTime: 0,
    state: "suspended",
    destination: {},
    resume: vi.fn(async () => {}),
    createOscillator: vi.fn(() => {
      const oscillator = {
        type: "sine",
        frequency: { ...param(), value: 0 },
        connect: vi.fn((node: unknown) => node),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push({
        get frequency() {
          return oscillator.frequency.value;
        },
        start: oscillator.start,
        stop: oscillator.stop,
      });
      return oscillator;
    }),
    createGain: vi.fn(() => ({ gain: param(), connect: vi.fn((node: unknown) => node) })),
  };
  return { context, oscillators };
}

describe("createBoothSound", () => {
  it("never opens audio while sound is off", () => {
    const factory = vi.fn();
    const sound = createBoothSound(factory);
    sound.play("key");
    sound.play("chime");
    expect(factory).not.toHaveBeenCalled();
  });

  it("opens audio once on the first sound after it is turned on, and wakes a suspended context", () => {
    const { context } = fakeContext();
    const factory = vi.fn(() => context as unknown as AudioContext);
    const sound = createBoothSound(factory);
    sound.setEnabled(true);
    sound.play("key");
    sound.play("miss");
    expect(factory).toHaveBeenCalledOnce();
    expect(context.resume).toHaveBeenCalled();
  });

  it("readies audio ahead of the first sound when woken while on, so the first key is not late, and stays shut while off", () => {
    const { context } = fakeContext();
    const factory = vi.fn(() => context as unknown as AudioContext);
    const sound = createBoothSound(factory);
    sound.wake();
    expect(factory).not.toHaveBeenCalled();
    sound.setEnabled(true);
    sound.wake();
    expect(factory).toHaveBeenCalledOnce();
    expect(context.resume).toHaveBeenCalled();
    expect(context.createOscillator).not.toHaveBeenCalled();
  });

  it("plays one short tone for a key and a rising run of four for a new high score", () => {
    const { context, oscillators } = fakeContext();
    const sound = createBoothSound(() => context as unknown as AudioContext);
    sound.setEnabled(true);
    sound.play("key");
    expect(oscillators).toHaveLength(1);
    sound.play("chime");
    const chime = oscillators.slice(1).map((oscillator) => oscillator.frequency);
    expect(chime).toHaveLength(4);
    expect([...chime].sort((a, b) => a - b)).toEqual(chime);
    oscillators.forEach((oscillator) => expect(oscillator.stop).toHaveBeenCalled());
  });

  it("stays quiet when the device has no audio", () => {
    const sound = createBoothSound(() => {
      throw new Error("no audio");
    });
    sound.setEnabled(true);
    expect(() => sound.play("ding")).not.toThrow();
  });
});
