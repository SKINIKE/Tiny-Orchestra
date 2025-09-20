export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function toSecondsFromTicks(ticks: number, bpm: number, tpq: number): number {
  const safeBpm = bpm > 0 ? bpm : 120;
  const safeTpq = tpq > 0 ? tpq : 96;
  return (ticks / safeTpq) * (60 / safeBpm);
}

export function stepToTicks(step: number, tpq: number): number {
  if (!Number.isFinite(step)) {
    return 0;
  }
  const ticksPerStep = Math.max(1, Math.round(tpq / 4));
  return step * ticksPerStep;
}

export function stepToSeconds(step: number, bpm: number, tpq: number): number {
  return toSecondsFromTicks(stepToTicks(step, tpq), bpm, tpq);
}

export function cloneDeep<T>(value: T): T {
  return structuredClone(value);
}

export function velocityToGain(velocity: number): number {
  const v = clamp(velocity, 0, 127) / 127;
  return Math.pow(v, 1.5);
}

export function ensureArrayBuffer(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  if (buffer instanceof Uint8Array) {
    return buffer;
  }
  return new Uint8Array(buffer);
}

export function calculateTailSamples(tailSeconds: number, sampleRate: number): number {
  if (!Number.isFinite(tailSeconds) || tailSeconds < 0) {
    return 0;
  }
  return Math.round(tailSeconds * sampleRate);
}

export function swingOffset(step: number, swing: number, bpm: number, tpq: number): number {
  if (!Number.isFinite(swing) || swing === 0) {
    return 0;
  }
  const swingAmount = clamp(swing, -0.75, 0.75);
  const stepSeconds = stepToSeconds(1, bpm, tpq);
  const offset = stepSeconds * 0.5 * swingAmount;
  return step % 2 === 0 ? -offset : offset;
}

export function mean(data: Float32Array): number {
  if (data.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const value of data) {
    sum += value;
  }
  return sum / data.length;
}

export function countClippedSamples(buffer: Float32Array, threshold = 0.999): number {
  let count = 0;
  for (const value of buffer) {
    if (Math.abs(value) >= threshold) {
      count += 1;
    }
  }
  return count;
}

export function rootMeanSquare(buffer: Float32Array): number {
  if (buffer.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const value of buffer) {
    sum += value * value;
  }
  return Math.sqrt(sum / buffer.length);
}

export function zeroCrossings(buffer: Float32Array): number {
  if (buffer.length < 2) {
    return 0;
  }
  let crossings = 0;
  let prev = buffer[0];
  for (let i = 1; i < buffer.length; i += 1) {
    const current = buffer[i];
    if ((prev <= 0 && current > 0) || (prev >= 0 && current < 0)) {
      crossings += 1;
    }
    prev = current;
  }
  return crossings;
}
