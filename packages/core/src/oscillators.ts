import type { LfsrMode } from './types.js';

const TWO_PI = Math.PI * 2;

export function midiNoteToFrequency(note: number): number {
  if (!Number.isFinite(note)) {
    return 0;
  }

  const clamped = Math.max(0, Math.min(127, Math.round(note)));
  return 440 * Math.pow(2, (clamped - 69) / 12);
}

export function createSquareOscillator(frequency: number, duty: number, sampleRate: number) {
  if (
    frequency <= 0 ||
    !Number.isFinite(frequency) ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0
  ) {
    return () => 0;
  }

  const dutyCycle = Number.isFinite(duty) ? Math.min(0.95, Math.max(0.05, duty)) : 0.5;
  const increment = frequency / sampleRate;
  let phase = 0;

  return () => {
    const value = phase < dutyCycle ? 1 : -1;
    phase += increment;
    if (phase >= 1) {
      phase -= Math.floor(phase);
    }
    return value;
  };
}

export function createTriangleOscillator(frequency: number, sampleRate: number) {
  if (
    frequency <= 0 ||
    !Number.isFinite(frequency) ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0
  ) {
    return () => 0;
  }

  const increment = frequency / sampleRate;
  let phase = 0;

  return () => {
    phase += increment;
    if (phase >= 1) {
      phase -= Math.floor(phase);
    }

    return 1 - 4 * Math.abs(phase - 0.5);
  };
}

export class LfsrNoise {
  private state: number;
  private readonly bits: number;

  constructor(mode: LfsrMode, seed = 1) {
    this.bits = mode === '7bit' ? 7 : 15;
    this.state = seed & ((1 << this.bits) - 1);
    if (this.state === 0) {
      this.state = 1;
    }
  }

  next(): number {
    const bit0 = this.state & 1;
    const bit1 = (this.state >> 1) & 1;
    const feedback = bit0 ^ bit1;
    this.state >>= 1;
    this.state |= feedback << (this.bits - 1);
    const outputBit = this.state & 1;
    return outputBit ? 1 : -1;
  }
}

export function createNoiseGenerator(mode: LfsrMode) {
  const lfsr = new LfsrNoise(mode);
  return () => lfsr.next();
}

export function renderOscillatorSample(
  type: 'square' | 'triangle' | 'noise',
  frequency: number,
  sampleRate: number,
  duty: number,
  noiseMode: LfsrMode,
) {
  if (type === 'square') {
    return createSquareOscillator(frequency, duty, sampleRate);
  }
  if (type === 'triangle') {
    return createTriangleOscillator(frequency, sampleRate);
  }
  return createNoiseGenerator(noiseMode);
}

export function phaseForSample(sampleIndex: number, sampleRate: number, frequency: number): number {
  if (sampleRate <= 0 || frequency <= 0) {
    return 0;
  }
  const t = sampleIndex / sampleRate;
  const phase = (t * frequency) % 1;
  return phase < 0 ? phase + 1 : phase;
}

export function sineSample(phase: number): number {
  return Math.sin(phase * TWO_PI);
}
