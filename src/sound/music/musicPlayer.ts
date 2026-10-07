import { barEvents, barSeconds, firstBar, type MusicEvent, type ThemeName } from "./themes";

/** Quiet enough to sit under the key clicks and chimes. */
const MASTER_VOLUME = 0.2;
/** A soft treble roll-off: the warm, slightly muffled lo-fi sound. */
const WARMTH_HZ = 3000;
const LOOKAHEAD_SECONDS = 0.5;
const TICK_MS = 100;
const FADE_SECONDS = 1.2;
/** The vinyl hiss: one quiet layer on the master, so it is the same on every screen. */
export const CRACKLE_VOLUME = 0.014;

type Bus = { gain: GainNode; theme: ThemeName; bar: number; nextBarAt: number };

/**
 * Background music, off until the operator turns it on in Event Setup. Every note is generated live, like the
 * booth sounds, so there are no audio files to download and it works offline. A short lookahead scheduler
 * queues each bar a moment before it plays; switching themes fades the old one out as the new one fades in.
 */
export function createMusicPlayer(createContext: () => AudioContext = () => new AudioContext()) {
  let enabled = false;
  let theme: ThemeName | null = null;
  let context: AudioContext | null = null;
  let unavailable = false;
  let master: GainNode | null = null;
  let crackle: AudioBufferSourceNode | null = null;
  let noise: AudioBuffer | null = null;
  let bus: Bus | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  function audio(): AudioContext | null {
    if (context || unavailable) {
      return context;
    }
    try {
      context = createContext();
      const warmth = context.createBiquadFilter();
      warmth.type = "lowpass";
      warmth.frequency.value = WARMTH_HZ;
      master = context.createGain();
      master.gain.value = 0;
      master.connect(warmth).connect(context.destination);
      noise = noiseBuffer(context);
    } catch {
      // No audio on this device: stay quiet rather than break the booth.
      unavailable = true;
      context = null;
    }
    return context;
  }

  function update() {
    const output = enabled && theme ? audio() : context;
    if (!output || !master) {
      return;
    }
    const now = output.currentTime;
    if (!enabled || !theme) {
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0, now, 0.15);
      fadeOut(bus, now);
      bus = null;
      stopCrackle(now);
      stopTimer();
      return;
    }
    if (output.state === "suspended") {
      resumeQuietly(output);
    }
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(MASTER_VOLUME, now, 0.2);
    startCrackle(output);
    if (bus?.theme !== theme) {
      fadeOut(bus, now);
      const gain = output.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(1, now + FADE_SECONDS);
      gain.connect(master);
      bus = { gain, theme, bar: firstBar(theme), nextBarAt: now + 0.05 };
    }
    if (timer === null) {
      timer = setInterval(schedule, TICK_MS);
    }
    schedule();
  }

  function schedule() {
    if (!context || !bus) {
      return;
    }
    while (bus.nextBarAt < context.currentTime + LOOKAHEAD_SECONDS) {
      for (const event of barEvents(bus.theme, bus.bar)) {
        play(context, bus.gain, event, bus.nextBarAt + event.at);
      }
      bus.bar += 1;
      bus.nextBarAt += barSeconds(bus.theme);
    }
  }

  function play(output: AudioContext, destination: AudioNode, event: MusicEvent, at: number) {
    switch (event.instrument) {
      case "keys":
        // A soft electric piano: a sine with a quiet octave on top, slowly fading.
        tone(output, destination, "sine", event.note!, at, event.seconds, event.volume, 0.02, 1);
        tone(output, destination, "sine", event.note! + 12, at, event.seconds * 0.6, event.volume * 0.18, 0.01, 1);
        return;
      case "bass":
        tone(output, destination, "triangle", event.note!, at, event.seconds, event.volume, 0.01, 0.9);
        return;
      case "bell": {
        // A music box: a bright, quick strike with a high partial, ringing on past its written length.
        const ring = Math.max(event.seconds, 0.9);
        tone(output, destination, "sine", event.note!, at, ring, event.volume, 0.003, 0.25);
        tone(output, destination, "sine", event.note! + 24, at, ring * 0.4, event.volume * 0.12, 0.003, 0.2);
        return;
      }
      case "brass":
        // Two slightly detuned saws through a filter that opens as the note swells: a warm, low horn.
        warmWave(output, destination, "sawtooth", event.note!, at, event.seconds, event.volume, 0.05, [-6, 6], 700, 2000);
        return;
      case "strings":
        // Short bowed notes: a single saw, filtered dark, quick to start and stop.
        warmWave(output, destination, "sawtooth", event.note!, at, event.seconds, event.volume, 0.008, [0], 900, 1400);
        return;
      case "square":
        // The arcade lead: a square wave filtered well down, so it is mellow, not a buzzy beep.
        warmWave(output, destination, "square", event.note!, at, event.seconds, event.volume, 0.01, [-4, 4], 900, 1800);
        return;
      case "flute":
        flute(output, destination, event.note!, at, event.seconds, event.volume);
        return;
      case "pluck":
        // A harp or lute: a soft triangle that sounds at once and dies away.
        tone(output, destination, "triangle", event.note!, at, Math.max(event.seconds, 0.35), event.volume, 0.004, 0.15);
        return;
      case "timpani":
        timpani(output, destination, event.note!, at, event.volume);
        return;
      case "kick":
        kick(output, destination, at, event.volume);
        return;
      case "snare":
        hit(output, destination, at, event.volume, "bandpass", 1800, 0.16);
        return;
      case "hat":
        hit(output, destination, at, event.volume, "highpass", 7000, 0.04);
        return;
    }
  }

  function tone(
    output: AudioContext,
    destination: AudioNode,
    wave: OscillatorType,
    note: number,
    at: number,
    seconds: number,
    volume: number,
    attack: number,
    sustain: number,
  ) {
    const oscillator = output.createOscillator();
    const gain = output.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), at + attack);
    // Hold near full for a share of the note, then fade out, so nothing clicks off.
    gain.gain.setTargetAtTime(0.0001, at + attack + seconds * sustain * 0.3, seconds * 0.35);
    oscillator.connect(gain).connect(destination);
    oscillator.start(at);
    oscillator.stop(at + seconds * 1.6 + 0.1);
  }

  function warmWave(
    output: AudioContext,
    destination: AudioNode,
    wave: OscillatorType,
    note: number,
    at: number,
    seconds: number,
    volume: number,
    attack: number,
    detuneCents: readonly number[],
    closedHz: number,
    openHz: number,
  ) {
    const filter = output.createBiquadFilter();
    const gain = output.createGain();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(closedHz, at);
    filter.frequency.exponentialRampToValueAtTime(openHz, at + attack + 0.06);
    filter.frequency.setTargetAtTime(closedHz, at + attack + 0.06, seconds * 0.5);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002) / detuneCents.length, at + attack);
    gain.gain.setTargetAtTime(0.0001, at + seconds * 0.85, 0.05);
    filter.connect(gain).connect(destination);
    for (const cents of detuneCents) {
      const oscillator = output.createOscillator();
      oscillator.type = wave;
      oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12 + cents / 1200);
      oscillator.connect(filter);
      oscillator.start(at);
      oscillator.stop(at + seconds + 0.3);
    }
  }

  /** A soft flute: a sine that breathes in, with a gentle vibrato once the note has settled. */
  function flute(output: AudioContext, destination: AudioNode, note: number, at: number, seconds: number, volume: number) {
    const oscillator = output.createOscillator();
    const vibrato = output.createOscillator();
    const depth = output.createGain();
    const gain = output.createGain();
    const pitch = 440 * 2 ** ((note - 69) / 12);
    oscillator.frequency.value = pitch;
    vibrato.frequency.value = 5;
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(pitch * 0.006, at + 0.25);
    vibrato.connect(depth).connect(oscillator.frequency);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), at + 0.06);
    gain.gain.setTargetAtTime(0.0001, at + seconds * 0.85, 0.06);
    oscillator.connect(gain).connect(destination);
    for (const source of [oscillator, vibrato]) {
      source.start(at);
      source.stop(at + seconds + 0.4);
    }
  }

  /** A low drum: a tone that drops slightly in pitch as it is struck, then rings and fades. */
  function timpani(output: AudioContext, destination: AudioNode, note: number, at: number, volume: number) {
    const oscillator = output.createOscillator();
    const gain = output.createGain();
    const pitch = 440 * 2 ** ((note - 69) / 12);
    oscillator.frequency.setValueAtTime(pitch * 1.06, at);
    oscillator.frequency.exponentialRampToValueAtTime(pitch, at + 0.08);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
    oscillator.connect(gain).connect(destination);
    oscillator.start(at);
    oscillator.stop(at + 0.95);
  }

  function kick(output: AudioContext, destination: AudioNode, at: number, volume: number) {
    const oscillator = output.createOscillator();
    const gain = output.createGain();
    oscillator.frequency.setValueAtTime(120, at);
    oscillator.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
    oscillator.connect(gain).connect(destination);
    oscillator.start(at);
    oscillator.stop(at + 0.35);
  }

  function hit(
    output: AudioContext,
    destination: AudioNode,
    at: number,
    volume: number,
    type: BiquadFilterType,
    frequency: number,
    seconds: number,
  ) {
    if (!noise) {
      return;
    }
    const source = output.createBufferSource();
    const filter = output.createBiquadFilter();
    const gain = output.createGain();
    source.buffer = noise;
    filter.type = type;
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    source.connect(filter).connect(gain).connect(destination);
    source.start(at);
    source.stop(at + seconds + 0.02);
  }

  /** A faint vinyl hiss under every theme, the same record for the whole game. */
  function startCrackle(output: AudioContext) {
    if (crackle || !noise || !master) {
      return;
    }
    const filter = output.createBiquadFilter();
    const gain = output.createGain();
    crackle = output.createBufferSource();
    crackle.buffer = noise;
    crackle.loop = true;
    crackle.playbackRate.value = 0.5;
    filter.type = "bandpass";
    filter.frequency.value = 2500;
    gain.gain.value = CRACKLE_VOLUME;
    crackle.connect(filter).connect(gain).connect(master);
    crackle.start();
  }

  function stopCrackle(at: number) {
    crackle?.stop(at + 0.6);
    crackle = null;
  }

  function fadeOut(old: Bus | null, now: number) {
    if (!old) {
      return;
    }
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setTargetAtTime(0, now, FADE_SECONDS / 3);
    // Notes already queued play into the fading bus; disconnect once they are silent.
    setTimeout(() => old.gain.disconnect(), (LOOKAHEAD_SECONDS + FADE_SECONDS * 2) * 1000);
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    setEnabled(on: boolean) {
      enabled = on;
      update();
    },
    /** The theme for the current screen, or null for silence. Setting the playing theme again changes nothing. */
    setTheme(name: ThemeName | null) {
      theme = name;
      update();
    },
    /** Pauses while the app is hidden, so a backgrounded iPad does not hum or stutter. */
    setHidden(hidden: boolean) {
      if (!context) {
        return;
      }
      if (hidden) {
        context.suspend().catch(() => {});
      } else if (enabled && theme) {
        resumeQuietly(context);
      }
    },
    /** Retries starting audio after a tap or key, for an app reopened with music already on. */
    wake() {
      if (enabled && theme && context?.state === "suspended") {
        resumeQuietly(context);
      }
    },
  };
}

/** A refused start (no tap yet) is retried on the next tap or key, so it is not an error. */
function resumeQuietly(output: AudioContext) {
  output.resume().catch(() => {});
}

function noiseBuffer(output: AudioContext): AudioBuffer {
  const buffer = output.createBuffer(1, output.sampleRate, output.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** The one music player the app shares. */
export const boothMusic = createMusicPlayer();
