import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CRACKLE_VOLUME, createMusicPlayer } from "./musicPlayer";

function fakeContext() {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = () => ({ connect: vi.fn((target: unknown) => target), disconnect: vi.fn() });
  const started: { kind: "oscillator" | "noise"; at: number }[] = [];
  const context = {
    currentTime: 0,
    sampleRate: 8000,
    state: "running" as AudioContextState,
    destination: {},
    resume: vi.fn(async () => {}),
    suspend: vi.fn(async () => {}),
    createGain: vi.fn(() => ({ ...node(), gain: param() })),
    createBiquadFilter: vi.fn(() => ({ ...node(), type: "lowpass", frequency: param(), Q: param() })),
    createOscillator: vi.fn(() => ({
      ...node(),
      type: "sine",
      frequency: param(),
      start: vi.fn((at: number) => started.push({ kind: "oscillator", at })),
      stop: vi.fn(),
    })),
    createBuffer: vi.fn((_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) })),
    createBufferSource: vi.fn(() => ({
      ...node(),
      buffer: null,
      loop: false,
      playbackRate: param(),
      start: vi.fn((at = 0) => started.push({ kind: "noise", at })),
      stop: vi.fn(),
    })),
  };
  return { context, started };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createMusicPlayer", () => {
  it("never opens audio while music is off, whatever screen is showing", () => {
    const factory = vi.fn();
    const music = createMusicPlayer(factory);
    music.setTheme("cozy");
    vi.advanceTimersByTime(2000);
    expect(factory).not.toHaveBeenCalled();
  });

  it("starts the theme's notes once turned on, and keeps scheduling them as time passes", () => {
    const { context, started } = fakeContext();
    const music = createMusicPlayer(() => context as unknown as AudioContext);
    music.setTheme("cozy");
    music.setEnabled(true);
    vi.advanceTimersByTime(200);
    const first = started.filter((note) => note.kind === "oscillator").length;
    expect(first).toBeGreaterThan(0);
    context.currentTime = 6;
    vi.advanceTimersByTime(200);
    expect(started.filter((note) => note.kind === "oscillator").length).toBeGreaterThan(first);
  });

  it("schedules nothing new once turned off", () => {
    const { context, started } = fakeContext();
    const music = createMusicPlayer(() => context as unknown as AudioContext);
    music.setTheme("adventure");
    music.setEnabled(true);
    vi.advanceTimersByTime(200);
    music.setEnabled(false);
    const count = started.length;
    context.currentTime = 10;
    vi.advanceTimersByTime(1000);
    expect(started.length).toBe(count);
  });

  it("switches themes without stopping the music, and is quiet with no theme", () => {
    const { context, started } = fakeContext();
    const music = createMusicPlayer(() => context as unknown as AudioContext);
    music.setEnabled(true);
    music.setTheme(null);
    vi.advanceTimersByTime(500);
    expect(started.filter((note) => note.kind === "oscillator")).toHaveLength(0);
    music.setTheme("victory");
    vi.advanceTimersByTime(200);
    const victory = started.length;
    expect(victory).toBeGreaterThan(0);
    music.setTheme("nostalgic");
    context.currentTime = 1;
    vi.advanceTimersByTime(200);
    expect(started.length).toBeGreaterThan(victory);
  });

  it("does not restart the theme when the same one is set again", () => {
    const { context, started } = fakeContext();
    const music = createMusicPlayer(() => context as unknown as AudioContext);
    music.setEnabled(true);
    music.setTheme("cozy");
    vi.advanceTimersByTime(200);
    const count = started.length;
    music.setTheme("cozy");
    vi.advanceTimersByTime(200);
    expect(started.length).toBe(count);
  });

  it("stays quiet when the device has no audio", () => {
    const music = createMusicPlayer(() => {
      throw new Error("no audio");
    });
    expect(() => {
      music.setEnabled(true);
      music.setTheme("cozy");
      vi.advanceTimersByTime(500);
    }).not.toThrow();
  });

  it("keeps one quiet vinyl hiss, at one level, across every theme change", () => {
    const { context } = fakeContext();
    const music = createMusicPlayer(() => context as unknown as AudioContext);
    music.setEnabled(true);
    for (const theme of ["cozy", "invite", "adventure", "victory", "nostalgic"] as const) {
      music.setTheme(theme);
      vi.advanceTimersByTime(200);
    }
    const loops = context.createBufferSource.mock.results.filter((result) => result.value.loop);
    expect(loops).toHaveLength(1);
    expect(CRACKLE_VOLUME).toBeLessThanOrEqual(0.015);
  });

  it("plays the battle's brass and strings as warm sawtooth tones, and its timpani", () => {
    const { context } = fakeContext();
    const music = createMusicPlayer(() => context as unknown as AudioContext);
    music.setEnabled(true);
    music.setTheme("adventure");
    vi.advanceTimersByTime(200);
    const oscillators = context.createOscillator.mock.results.map((result) => result.value);
    expect(oscillators.filter((oscillator) => oscillator.type === "sawtooth").length).toBeGreaterThan(16);
    // Every sawtooth goes through its own filter, so none of it reaches the speaker raw and buzzy.
    expect(context.createBiquadFilter.mock.calls.length).toBeGreaterThan(16);
  });
});
