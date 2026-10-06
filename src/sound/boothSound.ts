import type { SoundCue } from "./soundCues";

type Tone = { frequency: number; wave: OscillatorType; volume: number; seconds: number; delay?: number };

/** Every sound is a few generated tones: no audio files to download or cache, so it works offline. */
const TONES: Record<SoundCue, Tone[]> = {
  // A soft, short tick, quiet enough to play on every key.
  key: [{ frequency: 1200, wave: "triangle", volume: 0.04, seconds: 0.04 }],
  // A low, muted blip for a wrong key: noticeable, never harsh.
  miss: [{ frequency: 180, wave: "sine", volume: 0.06, seconds: 0.09 }],
  // A bright single bell for a Plinko win.
  ding: [{ frequency: 1319, wave: "sine", volume: 0.12, seconds: 0.45 }],
  // A rising C major run for a new high score.
  chime: [1047, 1319, 1568, 2093].map((frequency, index) => ({
    frequency,
    wave: "sine" as const,
    volume: 0.1,
    seconds: 0.5,
    delay: index * 0.09,
  })),
};

/**
 * Booth sounds, off until the operator turns them on in Event Setup. The audio context opens lazily on the
 * first sound, which always follows a key press or tap, so the browser allows it.
 */
export function createBoothSound(createContext: () => AudioContext = () => new AudioContext()) {
  let enabled = false;
  let context: AudioContext | null = null;
  let unavailable = false;

  function audio(): AudioContext | null {
    if (context || unavailable) {
      return context;
    }
    try {
      context = createContext();
    } catch {
      // No audio on this device: stay quiet rather than break the test.
      unavailable = true;
    }
    return context;
  }

  return {
    setEnabled(on: boolean) {
      enabled = on;
    },
    play(cue: SoundCue) {
      if (!enabled) {
        return;
      }
      const output = audio();
      if (!output) {
        return;
      }
      if (output.state === "suspended") {
        void output.resume();
      }
      for (const tone of TONES[cue]) {
        const start = output.currentTime + (tone.delay ?? 0);
        const oscillator = output.createOscillator();
        const gain = output.createGain();
        oscillator.type = tone.wave;
        oscillator.frequency.value = tone.frequency;
        gain.gain.setValueAtTime(tone.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.seconds);
        oscillator.connect(gain).connect(output.destination);
        oscillator.start(start);
        oscillator.stop(start + tone.seconds);
      }
    },
  };
}

/** The one booth sound player the app shares. */
export const boothSound = createBoothSound();
