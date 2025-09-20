import type { AdsrEnvelope } from './types.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface EnvelopeState {
  readonly attack: number;
  readonly decay: number;
  readonly sustain: number;
  readonly release: number;
}

export function normalizeEnvelope([attack, decay, sustain, release]: AdsrEnvelope): EnvelopeState {
  return {
    attack: Math.max(0, Number.isFinite(attack) ? attack : 0),
    decay: Math.max(0, Number.isFinite(decay) ? decay : 0),
    sustain: clamp(Number.isFinite(sustain) ? sustain : 0.0, 0, 1),
    release: Math.max(0, Number.isFinite(release) ? release : 0),
  };
}

export function levelDuringGate(time: number, env: EnvelopeState): number {
  if (time <= 0) {
    return env.attack === 0 ? 1 : 0;
  }

  if (env.attack > 0 && time < env.attack) {
    return clamp(time / env.attack, 0, 1);
  }

  const timeAfterAttack = time - env.attack;
  if (env.decay > 0 && timeAfterAttack < env.decay) {
    const progress = clamp(timeAfterAttack / env.decay, 0, 1);
    return 1 - (1 - env.sustain) * progress;
  }

  return env.sustain;
}

export function levelAtGateEnd(gateTime: number, env: EnvelopeState): number {
  if (gateTime <= 0) {
    return 0;
  }
  if (env.attack === 0 && env.decay === 0) {
    return env.sustain;
  }

  if (gateTime < env.attack) {
    return env.attack === 0 ? 1 : clamp(gateTime / env.attack, 0, 1);
  }

  const timeAfterAttack = gateTime - env.attack;
  if (timeAfterAttack < env.decay) {
    const progress = env.decay === 0 ? 1 : clamp(timeAfterAttack / env.decay, 0, 1);
    return 1 - (1 - env.sustain) * progress;
  }

  return env.sustain;
}

export function envelopeLevel(time: number, gateTime: number, envelope: AdsrEnvelope): number {
  const env = normalizeEnvelope(envelope);
  const gate = Math.max(0, gateTime);

  if (time <= gate) {
    return levelDuringGate(time, env);
  }

  if (env.release === 0) {
    return 0;
  }

  const releaseLevel = levelAtGateEnd(gate, env);
  const releaseTime = time - gate;
  if (releaseTime >= env.release) {
    return 0;
  }

  const progress = clamp(releaseTime / env.release, 0, 1);
  return releaseLevel * (1 - progress);
}

export function envelopeSamples(
  gateTime: number,
  envelope: AdsrEnvelope,
  sampleRate: number,
): Float32Array {
  const env = normalizeEnvelope(envelope);
  const totalTime = gateTime + env.release;
  const totalSamples = Math.max(1, Math.ceil(totalTime * sampleRate));
  const output = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i += 1) {
    const time = i / sampleRate;
    output[i] = envelopeLevel(time, gateTime, envelope);
  }

  return output;
}
