"use client";

const MUTE_STORAGE_KEY = "sd-audio-muted";

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

type SoundKind = "new-order" | "assigned" | "delivered";

interface Tone {
  frequency: number;
  start: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  glideTo?: number;
}

let context: AudioContext | null = null;
let muted = readStoredMute();
let unlockBound = false;

function readStoredMute(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistMute(value: boolean): void {
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Storage can be blocked in private contexts.
  }
}

function audioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const view = window as WindowWithWebkitAudio;
  return window.AudioContext ?? view.webkitAudioContext;
}

function getContext(): AudioContext | null {
  const Ctor = audioContextConstructor();
  if (!Ctor) {
    return null;
  }

  if (!context) {
    context = new Ctor();
  }

  return context;
}

async function resumeContext(): Promise<AudioContext | null> {
  const next = getContext();
  if (!next) {
    return null;
  }

  if (next.state === "suspended") {
    try {
      await next.resume();
    } catch {
      return next;
    }
  }

  return next;
}

function scheduleTone(audio: AudioContext, tone: Tone): void {
  const oscillator = audio.createOscillator();
  const amp = audio.createGain();
  const startAt = audio.currentTime + tone.start;
  const endAt = startAt + tone.duration;

  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(tone.frequency, startAt);
  if (tone.glideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(tone.glideTo, endAt);
  }

  amp.gain.setValueAtTime(0.0001, startAt);
  amp.gain.exponentialRampToValueAtTime(tone.gain, startAt + 0.016);
  amp.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(amp);
  amp.connect(audio.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.03);
}

function patternFor(kind: SoundKind): Tone[] {
  if (kind === "new-order") {
    return [
      { frequency: 880, start: 0, duration: 0.11, gain: 0.18, type: "square" },
      { frequency: 1174, start: 0.13, duration: 0.16, gain: 0.2, type: "square", glideTo: 1318 },
    ];
  }

  if (kind === "assigned") {
    return [
      { frequency: 659.25, start: 0, duration: 0.14, gain: 0.14, type: "sine" },
      { frequency: 783.99, start: 0.12, duration: 0.16, gain: 0.13, type: "triangle" },
      { frequency: 987.77, start: 0.26, duration: 0.22, gain: 0.12, type: "sine" },
    ];
  }

  return [
    { frequency: 523.25, start: 0, duration: 0.12, gain: 0.12, type: "triangle" },
    { frequency: 659.25, start: 0.1, duration: 0.12, gain: 0.12, type: "sine" },
    { frequency: 783.99, start: 0.2, duration: 0.14, gain: 0.13, type: "triangle" },
    { frequency: 1046.5, start: 0.34, duration: 0.28, gain: 0.14, type: "sine" },
  ];
}

async function playPattern(kind: SoundKind): Promise<void> {
  if (muted) {
    return;
  }

  const audio = await resumeContext();
  if (!audio || audio.state !== "running") {
    return;
  }

  for (const tone of patternFor(kind)) {
    scheduleTone(audio, tone);
  }
}

export function isAudioMuted(): boolean {
  return muted;
}

export function setAudioMuted(value: boolean): void {
  muted = value;
  persistMute(value);
}

export async function unlockAudio(): Promise<void> {
  await resumeContext();
}

export function bindAudioUnlock(): () => void {
  if (typeof window === "undefined" || unlockBound) {
    return () => undefined;
  }

  unlockBound = true;
  const unlock = (): void => {
    void unlockAudio();
  };

  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);

  return () => {
    unlockBound = false;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

export function playNewOrderSound(): void {
  void playPattern("new-order");
}

export function playAssignedSound(): void {
  void playPattern("assigned");
}

export function playDeliverySuccessSound(): void {
  void playPattern("delivered");
}
