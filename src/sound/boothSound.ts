import type { SoundCue } from "./soundCues";

type Tone = { frequency: number; wave: OscillatorType; volume: number; seconds: number; delay?: number };

/** Every sound is a few generated tones: no audio files to download or cache, so it works offline. */
type Burst = { frequency: number; q: number; volume: number; seconds: number; delay: number };

/**
 * A key sounds like a clicky tactile switch, built from measurements rather than a note. A keystroke is broadband
 * noise, mostly 400 Hz–12 kHz, and its press holds two sharp bursts about 2–3 ms long within ~10 ms: the switch
 * moving and the key hitting the plate (Asonov and Agrawal, "Keyboard Acoustic Emanations", 2004; Zhuang et al.,
 * 2009). A clicky switch's click peaks near 3.2 kHz (RTINGS, Kailh Box Jade). So: a short, narrow snap a little below
 * that, then a fuller, lower bottom-out about 7 ms later, all under a lowpass so the key is warm rather than hissy.
 * Measured offline, its spectral centre is about 1.6 kHz, below the old 1.2 kHz triangle tick's 2 kHz, at the same
 * loudness. Each key varies a little, like real presses.
 */
const KEY_BURSTS: Burst[] = [
  { frequency: 2_600, q: 4, volume: 0.26, seconds: 0.005, delay: 0 },
  { frequency: 600, q: 1.5, volume: 0.3, seconds: 0.04, delay: 0.007 },
];
const KEY_LOWPASS_HZ = 2_400;
const KEY_SPREAD = 0.06;

const TONES: Record<Exclude<SoundCue, "key">, Tone[]> = {
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

  let noise: AudioBuffer | null = null;

  /** 30 ms of white noise, made once and shared by every key. */
  function noiseFor(output: AudioContext): AudioBuffer {
    if (!noise) {
      noise = output.createBuffer(1, Math.ceil(output.sampleRate * 0.03), output.sampleRate);
      const samples = noise.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1;
      }
    }
    return noise;
  }

  function playKey(output: AudioContext) {
    const vary = () => 1 + (Math.random() * 2 - 1) * KEY_SPREAD;
    const warmth = output.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = KEY_LOWPASS_HZ;
    warmth.connect(output.destination);
    for (const burst of KEY_BURSTS) {
      const start = output.currentTime + burst.delay;
      const source = output.createBufferSource();
      source.buffer = noiseFor(output);
      const filter = output.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = burst.frequency * vary();
      filter.Q.value = burst.q;
      const gain = output.createGain();
      gain.gain.setValueAtTime(burst.volume * vary(), start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + burst.seconds);
      source.connect(filter).connect(gain).connect(warmth);
      source.start(start);
      source.stop(start + burst.seconds);
    }
  }

  function ready(): AudioContext | null {
    const output = audio();
    if (output?.state === "suspended") {
      void output.resume();
    }
    return output;
  }

  return {
    setEnabled(on: boolean) {
      enabled = on;
    },
    /**
     * Opens and resumes audio ahead of time, on any key or tap while sound is on. Opening it takes a few
     * frames, so doing it on the first sound would make the first typed key's click late.
     */
    wake() {
      if (enabled) {
        ready();
      }
    },
    play(cue: SoundCue) {
      if (!enabled) {
        return;
      }
      const output = ready();
      if (!output) {
        return;
      }
      if (cue === "key") {
        playKey(output);
        return;
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
