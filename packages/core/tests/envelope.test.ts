import { describe, expect, it } from 'vitest';

import {
  envelopeLevel,
  envelopeSamples,
  levelAtGateEnd,
  levelDuringGate,
  normalizeEnvelope,
} from '../src/index.js';

describe('adsr envelope', () => {
  it('normalizes envelope values', () => {
    expect(normalizeEnvelope([0.01, 0.1, 1.2, 0.2])).toEqual({
      attack: 0.01,
      decay: 0.1,
      sustain: 1,
      release: 0.2,
    });

    expect(normalizeEnvelope([-1, -1, -1, -1])).toEqual({
      attack: 0,
      decay: 0,
      sustain: 0,
      release: 0,
    });
  });

  it('tracks envelope progression through attack, decay, sustain, release', () => {
    const envelope: [number, number, number, number] = [0.05, 0.1, 0.6, 0.2];
    const attackLevel = envelopeLevel(0.025, 0.2, envelope);
    expect(attackLevel).toBeGreaterThan(0);
    expect(attackLevel).toBeLessThan(1);

    const decayLevel = envelopeLevel(0.1, 0.2, envelope);
    expect(decayLevel).toBeGreaterThan(envelope[2]);

    const sustainLevel = envelopeLevel(0.2, 0.4, envelope);
    expect(sustainLevel).toBeCloseTo(envelope[2], 3);

    const releaseLevel = envelopeLevel(0.5, 0.3, envelope);
    expect(releaseLevel).toBeLessThanOrEqual(envelope[2]);
    expect(envelopeLevel(0.7, 0.3, envelope)).toBeCloseTo(0, 3);
  });

  it('computes envelope samples with smooth transitions', () => {
    const envelope: [number, number, number, number] = [0.01, 0.01, 0.5, 0.05];
    const samples = envelopeSamples(0.1, envelope, 48_000);
    expect(samples.length).toBeGreaterThan(0);
    for (let i = 1; i < samples.length; i += 1) {
      const diff = Math.abs(samples[i] - samples[i - 1]);
      expect(diff).toBeLessThan(0.2);
    }
  });

  it('reports gate levels correctly', () => {
    const envelope: [number, number, number, number] = [0.05, 0.2, 0.3, 0.1];
    const levelMidGate = levelDuringGate(0.1, normalizeEnvelope(envelope));
    const levelEnd = levelAtGateEnd(0.5, normalizeEnvelope(envelope));
    expect(levelMidGate).toBeGreaterThan(levelEnd);
  });
});
