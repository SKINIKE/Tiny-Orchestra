import { describe, expect, it } from 'vitest';

import {
  applyDcBlocker,
  clamp,
  countClippedSamples,
  dbToGain,
  ensureStereoBuffer,
  mean,
  normalizeBuffer,
  rootMeanSquare,
  softClip,
  stepToSeconds,
  stepToTicks,
  swingOffset,
  velocityToGain,
  zeroCrossings,
} from '../src/index.js';

describe('mixer and utility helpers', () => {
  it('converts decibels to gain', () => {
    expect(dbToGain(-12)).toBeCloseTo(0.251, 3);
    expect(dbToGain(0)).toBe(1);
  });

  it('normalizes buffer to target peak', () => {
    const buffer = ensureStereoBuffer(4);
    buffer[0].set([0.2, 0.3, 0.9, -0.4]);
    buffer[1].set([0.1, 0.4, -0.9, 0.4]);
    normalizeBuffer(buffer, 0.5);
    expect(Math.max(...buffer[0], ...buffer[1])).toBeLessThanOrEqual(0.5);
  });

  it('applies soft clip without exceeding bounds', () => {
    expect(softClip(10)).toBeLessThan(1);
    expect(softClip(-10)).toBeGreaterThan(-1);
  });

  it('removes DC offset with blocker', () => {
    const buffer = ensureStereoBuffer(1000);
    buffer[0].fill(0.5);
    buffer[1].fill(-0.5);
    applyDcBlocker(buffer);
    expect(Math.abs(buffer[0][buffer[0].length - 1])).toBeLessThan(0.01);
    expect(Math.abs(buffer[1][buffer[1].length - 1])).toBeLessThan(0.01);
  });

  it('calculates statistics helpers', () => {
    const buffer = new Float32Array([0.1, -0.2, 0.3, -0.4]);
    expect(mean(buffer)).toBeCloseTo(-0.05, 3);
    expect(countClippedSamples(buffer, 0.2)).toBeGreaterThan(0);
    expect(rootMeanSquare(buffer)).toBeGreaterThan(0);
    expect(zeroCrossings(buffer)).toBeGreaterThan(0);
  });

  it('converts steps to ticks and seconds consistently', () => {
    const ticks = stepToTicks(4, 96);
    const seconds = stepToSeconds(4, 120, 96);
    expect(ticks).toBeGreaterThan(0);
    expect(seconds).toBeCloseTo(ticks * (60 / (120 * 96)), 6);
  });

  it('applies swing offset alternately', () => {
    const offsetEven = swingOffset(0, 0.3, 120, 96);
    const offsetOdd = swingOffset(1, 0.3, 120, 96);
    expect(offsetEven).toBeLessThan(0);
    expect(offsetOdd).toBeGreaterThan(0);
  });

  it('maps velocity to gain', () => {
    expect(velocityToGain(0)).toBe(0);
    expect(velocityToGain(127)).toBeCloseTo(1, 3);
    expect(velocityToGain(64)).toBeGreaterThan(0.3);
  });

  it('clamps values correctly', () => {
    expect(clamp(5, 0, 4)).toBe(4);
    expect(clamp(-2, 0, 4)).toBe(0);
  });
});
