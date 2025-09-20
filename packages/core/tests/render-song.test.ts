import { describe, expect, it } from 'vitest';

import {
  countClippedSamples,
  mean,
  renderSong,
  stepToSeconds,
  velocityToGain,
} from '../src/index.js';
import type { SongJson } from '../src/types.js';

function createBaseSong(): SongJson {
  return {
    version: '1.0.0',
    bpm: 120,
    tpq: 96,
    swing: 0,
    sampleRate: 48_000,
    instruments: {
      lead: {
        type: 'square',
        duty: 0.5,
        adsr: [0.01, 0.05, 0.7, 0.1],
        volume: 0.8,
      },
    },
    tracks: [
      {
        id: 'lead-track',
        instrument: 'lead',
        steps: 32,
        notes: [],
      },
    ],
    song: [{ pattern: 'A', repeat: 1 }],
    patterns: { A: { overrides: [] } },
  };
}

describe('renderSong', () => {
  it('renders silence with minimum tail for empty song', () => {
    const song = createBaseSong();
    song.tracks[0].steps = 0;
    const result = renderSong(song);
    const expectedSamples = Math.round(0.05 * song.sampleRate);
    expect(result.buffer[0].length).toBe(expectedSamples);
    expect(result.buffer[0].every((sample) => Math.abs(sample) < 1e-6)).toBe(true);
  });

  it('renders note with correct duration and tail', () => {
    const song = createBaseSong();
    const durationSteps = 24; // 3 seconds at 120 BPM
    song.tracks[0].steps = durationSteps;
    song.tracks[0].notes = [{ step: 0, note: 72, len: durationSteps, vel: 100 }];
    const result = renderSong(song);
    const gateSeconds = stepToSeconds(durationSteps, song.bpm, song.tpq);
    const expectedSeconds = gateSeconds + song.instruments.lead.adsr[3] + 0.05;
    expect(result.durationSeconds).toBeCloseTo(expectedSeconds, 2);
  });

  it('keeps clipping under threshold and mean near zero', () => {
    const song = createBaseSong();
    song.tracks[0].steps = 32;
    song.tracks[0].notes = [
      { step: 0, note: 64, len: 16, vel: 127 },
      { step: 16, note: 67, len: 16, vel: 127 },
    ];
    const { buffer } = renderSong(song);
    const totalSamples = buffer[0].length;
    const clipped = countClippedSamples(buffer[0]) + countClippedSamples(buffer[1]);
    const ratio = clipped / (totalSamples * 2);
    expect(ratio).toBeLessThan(0.001);
    expect(Math.abs(mean(buffer[0]))).toBeLessThan(0.001);
    expect(Math.abs(mean(buffer[1]))).toBeLessThan(0.001);
  });

  it('applies normalization when requested', () => {
    const song = createBaseSong();
    song.tracks[0].notes = [{ step: 0, note: 80, len: 8, vel: 40 }];
    const normalized = renderSong(song, { normalize: true });
    const max = Math.max(...normalized.buffer[0], ...normalized.buffer[1]);
    expect(max).toBeLessThanOrEqual(1);
  });

  it('responds to velocity scaling', () => {
    const song = createBaseSong();
    song.tracks[0].notes = [{ step: 0, note: 60, len: 8, vel: 30 }];
    const quiet = renderSong(song);
    song.tracks[0].notes = [{ step: 0, note: 60, len: 8, vel: 120 }];
    const loud = renderSong(song);
    const rmsQuiet = Math.sqrt(
      quiet.buffer[0].reduce((acc, val) => acc + val * val, 0) / quiet.buffer[0].length,
    );
    const rmsLoud = Math.sqrt(
      loud.buffer[0].reduce((acc, val) => acc + val * val, 0) / loud.buffer[0].length,
    );
    expect(rmsLoud).toBeGreaterThan(rmsQuiet);
    expect(velocityToGain(120)).toBeGreaterThan(velocityToGain(30));
  });
});
