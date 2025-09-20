import { describe, expect, it } from 'vitest';

import {
  LfsrNoise,
  createSquareOscillator,
  createTriangleOscillator,
  midiNoteToFrequency,
  phaseForSample,
  sineSample,
} from '../src/index.js';

describe('oscillators', () => {
  it('converts MIDI note to frequency', () => {
    expect(midiNoteToFrequency(69)).toBeCloseTo(440, 5);
    expect(midiNoteToFrequency(60)).toBeCloseTo(261.625, 2);
  });

  it('generates square wave with correct duty cycle', () => {
    const sampleRate = 48_000;
    const frequency = 440;
    const durations = [0.1, 0.25, 0.5, 0.75, 0.9];

    for (const duty of durations) {
      const osc = createSquareOscillator(frequency, duty, sampleRate);
      let positive = 0;
      const totalSamples = sampleRate; // ~1 second
      for (let i = 0; i < totalSamples; i += 1) {
        if (osc() > 0) {
          positive += 1;
        }
      }
      const ratio = positive / totalSamples;
      expect(ratio).toBeCloseTo(duty, 0.05);
    }
  });

  it('generates triangle wave within expected range', () => {
    const osc = createTriangleOscillator(220, 48_000);
    let min = Infinity;
    let max = -Infinity;
    const samples = 10_000;
    for (let i = 0; i < samples; i += 1) {
      const value = osc();
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    expect(min).toBeGreaterThanOrEqual(-1);
    expect(max).toBeLessThanOrEqual(1);
    expect((min + max) / 2).toBeCloseTo(0, 2);
  });

  it('produces decorrelated LFSR noise for 7-bit and 15-bit modes', () => {
    const modes: Array<'7bit' | '15bit'> = ['7bit', '15bit'];
    for (const mode of modes) {
      const noise = new LfsrNoise(mode, 1);
      const values = new Set<number>();
      let sum = 0;
      const iterations = mode === '7bit' ? 512 : 4096;
      for (let i = 0; i < iterations; i += 1) {
        const value = noise.next();
        values.add(value);
        sum += value;
      }
      expect(values.has(1)).toBe(true);
      expect(values.has(-1)).toBe(true);
      expect(Math.abs(sum / iterations)).toBeLessThan(0.1);
    }
  });

  it('computes sine sample from phase correctly', () => {
    expect(sineSample(0)).toBeCloseTo(0);
    expect(sineSample(0.25)).toBeCloseTo(1, 5);
    expect(sineSample(0.5)).toBeCloseTo(0, 5);
    expect(sineSample(0.75)).toBeCloseTo(-1, 5);
  });

  it('computes phase progression for samples', () => {
    const phase0 = phaseForSample(0, 48_000, 440);
    const phase1 = phaseForSample(1, 48_000, 440);
    expect(phase0).toBeCloseTo(0, 5);
    expect(phase1).toBeGreaterThan(phase0);
  });
});
