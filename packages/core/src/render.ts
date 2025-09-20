import { envelopeSamples, normalizeEnvelope } from './envelope.js';
import {
  applyDcBlocker,
  applySoftClip,
  dbToGain,
  ensureStereoBuffer,
  normalizeBuffer,
} from './mixer.js';
import { midiNoteToFrequency, renderOscillatorSample } from './oscillators.js';
import { compileSong } from './song.js';
import type { RenderOptions, SongJson, StereoBuffer } from './types.js';
import {
  calculateTailSamples,
  clamp,
  stepToSeconds,
  swingOffset,
  velocityToGain,
} from './utils.js';

interface RenderContext {
  readonly bpm: number;
  readonly tpq: number;
  readonly swing: number;
  readonly sampleRate: number;
  readonly tailSeconds: number;
  readonly normalize: boolean;
  readonly masterGain: number;
}

function renderEventSamples(
  startSample: number,
  gateSeconds: number,
  velocityGain: number,
  instrumentVolume: number,
  oscillatorType: 'square' | 'triangle' | 'noise',
  frequency: number,
  duty: number,
  lfsrMode: '7bit' | '15bit',
  envelope: [number, number, number, number],
  sampleRate: number,
  target: StereoBuffer,
  pan: number,
) {
  const envelopeBuffer = envelopeSamples(gateSeconds, envelope, sampleRate);
  const totalSamples = envelopeBuffer.length;
  const osc = renderOscillatorSample(oscillatorType, frequency, sampleRate, duty, lfsrMode);

  const leftGain = pan <= 0 ? 1 : 1 - pan;
  const rightGain = pan >= 0 ? 1 : 1 + pan;
  const maxIndex = target[0].length;
  const gain = velocityGain * instrumentVolume;

  for (let i = 0; i < totalSamples; i += 1) {
    const idx = startSample + i;
    if (idx >= maxIndex) {
      break;
    }
    const sample = osc() * envelopeBuffer[i] * gain;
    target[0][idx] += sample * leftGain;
    target[1][idx] += sample * rightGain;
  }
}

function createContext(song: SongJson, options: RenderOptions): RenderContext {
  const bpm = Number.isFinite(song.bpm) && song.bpm > 0 ? song.bpm : 120;
  const tpq = Number.isFinite(song.tpq) && song.tpq > 0 ? song.tpq : 96;
  const sampleRate =
    Number.isFinite(song.sampleRate) && song.sampleRate > 0 ? song.sampleRate : 48_000;
  const swing = Number.isFinite(song.swing) ? song.swing : 0;
  const tailSeconds = Math.max(
    0.05,
    Number.isFinite(options.tailSeconds ?? NaN) ? (options.tailSeconds ?? 0.05) : 0.05,
  );
  const normalize = Boolean(options.normalize);
  const masterGain = dbToGain(options.masterGainDb ?? -12);

  return { bpm, tpq, swing, sampleRate, tailSeconds, normalize, masterGain };
}

export interface RenderedSong {
  buffer: StereoBuffer;
  sampleRate: number;
  durationSeconds: number;
}

export function renderSong(song: SongJson, options: RenderOptions = {}): RenderedSong {
  const context = createContext(song, options);
  const compiled = compileSong(song);
  const tailSamples = calculateTailSamples(context.tailSeconds, context.sampleRate);

  let maxSeconds = 0;
  for (const event of compiled.events) {
    const startSeconds = Math.max(
      0,
      stepToSeconds(event.startStep, context.bpm, context.tpq) +
        swingOffset(event.startStep, context.swing, context.bpm, context.tpq),
    );
    const gateSeconds = stepToSeconds(event.durationSteps, context.bpm, context.tpq);
    const release = normalizeEnvelope(event.instrument.adsr).release;
    maxSeconds = Math.max(maxSeconds, startSeconds + gateSeconds + release);
  }

  const totalSamples = Math.max(1, Math.ceil(maxSeconds * context.sampleRate) + tailSamples);
  const buffer = ensureStereoBuffer(totalSamples);

  for (const event of compiled.events) {
    if (event.track.mute) {
      continue;
    }

    const freq = event.instrument.type === 'noise' ? 0 : midiNoteToFrequency(event.note);
    const gateSeconds = stepToSeconds(event.durationSteps, context.bpm, context.tpq);
    const startSeconds = Math.max(
      0,
      stepToSeconds(event.startStep, context.bpm, context.tpq) +
        swingOffset(event.startStep, context.swing, context.bpm, context.tpq),
    );
    const startSample = Math.max(0, Math.round(startSeconds * context.sampleRate));
    const velocityGain = velocityToGain(event.velocity);
    const volume = Number.isFinite(event.instrument.volume)
      ? clamp(event.instrument.volume, 0, 1.5)
      : 1;
    const duty = Number.isFinite(event.instrument.duty ?? NaN)
      ? (event.instrument.duty ?? 0.5)
      : 0.5;
    const lfsrMode: '7bit' | '15bit' = event.instrument.lfsr ?? '15bit';
    const pan = clamp(event.instrument.pan ?? event.track.pan ?? 0, -1, 1);

    renderEventSamples(
      startSample,
      gateSeconds,
      velocityGain,
      volume,
      event.instrument.type,
      freq,
      duty,
      lfsrMode,
      event.instrument.adsr,
      context.sampleRate,
      buffer,
      pan,
    );
  }

  for (let i = 0; i < buffer[0].length; i += 1) {
    buffer[0][i] *= context.masterGain;
    buffer[1][i] *= context.masterGain;
  }

  applyDcBlocker(buffer);
  if (context.normalize) {
    normalizeBuffer(buffer);
  }
  applySoftClip(buffer);

  return {
    buffer,
    sampleRate: context.sampleRate,
    durationSeconds: buffer[0].length / context.sampleRate,
  };
}
