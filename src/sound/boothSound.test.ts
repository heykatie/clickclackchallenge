import { describe, expect, it, vi } from "vitest";
import { createBoothSound } from "./boothSound";

function fakeContext() {
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const oscillators: { frequency: number; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const bursts: { buffer: unknown; start: ReturnType<typeof vi.fn> }[] = [];
  const filters: { type: string; frequency: { value: number }; Q: { value: number } }[] = [];
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
    sampleRate: 48_000,
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
    })),
    createBufferSource: vi.fn(() => {
      const source = { buffer: null as unknown, connect: vi.fn((node: unknown) => node), start: vi.fn(), stop: vi.fn() };
      bursts.push(source);
      return source;
    }),
    createBiquadFilter: vi.fn(() => {
      const filter = { type: "lowpass", frequency: { value: 0 }, Q: { value: 1 }, connect: vi.fn((node: unknown) => node) };
      filters.push(filter);
      return filter;
    }),
  };
  return { context, oscillators, bursts, filters };
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

  it("plays a key like a clicky switch: two short filtered-noise bursts, a bright snap then a lower bottom-out, no pitched tone", () => {
    const { context, oscillators, bursts, filters } = fakeContext();
    const sound = createBoothSound(() => context as unknown as AudioContext);
    sound.setEnabled(true);
    sound.play("key");
    // A keystroke is broadband noise, not a note, so there is no oscillator to hear as a pitch.
    expect(oscillators).toHaveLength(0);
    expect(bursts).toHaveLength(2);
    // One lowpass over the whole key keeps it warm, so it is not high and hissy.
    expect(filters.map((filter) => filter.type)).toEqual(["lowpass", "bandpass", "bandpass"]);
    expect(filters[0]!.frequency.value).toBeLessThanOrEqual(3_000);
    const [snap, bottom] = filters.slice(1).map((filter) => filter.frequency.value);
    // The click a little under a clicky switch's measured ~3.2 kHz peak, the bottom-out lower, both inside 400 Hz–12 kHz.
    expect(snap).toBeGreaterThanOrEqual(2_300);
    expect(snap).toBeLessThanOrEqual(3_200);
    expect(bottom).toBeGreaterThanOrEqual(500);
    expect(bottom).toBeLessThan(snap / 2);
    // The bottom-out lands a few milliseconds after the snap, as the key hits the plate.
    const [snapStart, bottomStart] = bursts.map((burst) => burst.start.mock.calls[0]![0] as number);
    expect(bottomStart - snapStart).toBeGreaterThanOrEqual(0.004);
    expect(bottomStart - snapStart).toBeLessThanOrEqual(0.012);
  });

  it("varies each key a little, so a run of keys does not sound like one sample repeated", () => {
    const { context, filters } = fakeContext();
    const sound = createBoothSound(() => context as unknown as AudioContext);
    sound.setEnabled(true);
    for (let index = 0; index < 8; index += 1) sound.play("key");
    const snaps = new Set(filters.filter((_, index) => index % 3 === 1).map((filter) => filter.frequency.value));
    expect(snaps.size).toBeGreaterThan(1);
  });

  it("plays a rising run of four for a new high score", () => {
    const { context, oscillators } = fakeContext();
    const sound = createBoothSound(() => context as unknown as AudioContext);
    sound.setEnabled(true);
    sound.play("chime");
    const chime = oscillators.map((oscillator) => oscillator.frequency);
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
