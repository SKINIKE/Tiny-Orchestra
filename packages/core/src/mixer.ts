import type { StereoBuffer } from './types.js';

export function dbToGain(db: number): number {
  if (!Number.isFinite(db)) {
    return 1;
  }
  return Math.pow(10, db / 20);
}

export function softClip(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.tanh(value);
}

export function ensureStereoBuffer(length: number): StereoBuffer {
  const safeLength = Math.max(0, length);
  return [new Float32Array(safeLength), new Float32Array(safeLength)];
}

export function mixIntoBuffer(
  target: StereoBuffer,
  source: StereoBuffer,
  gain: number,
  pan = 0,
): void {
  const leftGain = gain * (pan <= 0 ? 1 : 1 - pan);
  const rightGain = gain * (pan >= 0 ? 1 : 1 + pan);
  const frames = Math.min(target[0].length, source[0].length);

  for (let i = 0; i < frames; i += 1) {
    target[0][i] += source[0][i] * leftGain;
    target[1][i] += source[1][i] * rightGain;
  }
}

export function applySoftClip(buffer: StereoBuffer): void {
  const frames = Math.min(buffer[0].length, buffer[1].length);
  for (let i = 0; i < frames; i += 1) {
    buffer[0][i] = softClip(buffer[0][i]);
    buffer[1][i] = softClip(buffer[1][i]);
  }
}

export function applyDcBlocker(buffer: StereoBuffer, coefficient = 0.995): void {
  const frames = Math.min(buffer[0].length, buffer[1].length);
  let prevInputL = 0;
  let prevOutputL = 0;
  let prevInputR = 0;
  let prevOutputR = 0;

  for (let i = 0; i < frames; i += 1) {
    const inputL = buffer[0][i];
    const inputR = buffer[1][i];
    const outputL = inputL - prevInputL + coefficient * prevOutputL;
    const outputR = inputR - prevInputR + coefficient * prevOutputR;
    buffer[0][i] = outputL;
    buffer[1][i] = outputR;
    prevInputL = inputL;
    prevOutputL = outputL;
    prevInputR = inputR;
    prevOutputR = outputR;
  }
}

export function normalizeBuffer(buffer: StereoBuffer, peak = 0.99): void {
  let max = 0;
  const frames = Math.min(buffer[0].length, buffer[1].length);
  for (let i = 0; i < frames; i += 1) {
    max = Math.max(max, Math.abs(buffer[0][i]), Math.abs(buffer[1][i]));
  }

  if (max === 0 || max <= peak) {
    return;
  }

  const gain = peak / max;
  for (let i = 0; i < frames; i += 1) {
    buffer[0][i] *= gain;
    buffer[1][i] *= gain;
  }
}

export function cloneStereoBuffer(buffer: StereoBuffer): StereoBuffer {
  return [buffer[0].slice(), buffer[1].slice()];
}
