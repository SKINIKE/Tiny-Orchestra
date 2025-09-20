import { describe, expect, it } from 'vitest';

import { encodeWav, ensureStereoBuffer, renderSong } from '../src/index.js';
import type { SongJson } from '../src/types.js';

function createTestSong(): SongJson {
  return {
    version: '1.0.0',
    bpm: 100,
    tpq: 96,
    swing: 0,
    sampleRate: 48_000,
    instruments: {
      lead: {
        type: 'triangle',
        adsr: [0.01, 0.05, 0.8, 0.1],
        volume: 0.7,
      },
    },
    tracks: [
      {
        id: 'lead',
        instrument: 'lead',
        steps: 16,
        notes: [{ step: 0, note: 60, len: 16, vel: 100 }],
      },
    ],
    song: [{ pattern: 'A', repeat: 1 }],
    patterns: { A: { overrides: [] } },
  };
}

describe('WAV encoder', () => {
  it('creates valid 16-bit stereo WAV header', () => {
    const song = createTestSong();
    const { buffer, sampleRate } = renderSong(song);
    const wav = encodeWav(buffer, { sampleRate });
    const view = new DataView(wav.buffer);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    const dataSize = view.getUint32(40, true);
    const expected = buffer[0].length * 2 * 2;
    expect(dataSize).toBe(expected);
  });

  it('writes PCM samples without exceeding range', () => {
    const buffer = ensureStereoBuffer(4);
    buffer[0].set([0.5, -0.5, 1.2, -1.2]);
    buffer[1].set([0.5, -0.5, 1.2, -1.2]);
    const wav = encodeWav(buffer, { sampleRate: 48_000 });
    const view = new DataView(wav.buffer, 44);
    for (let i = 0; i < 8; i += 2) {
      const value = view.getInt16(i, true);
      expect(value).toBeLessThanOrEqual(32767);
      expect(value).toBeGreaterThanOrEqual(-32768);
    }
  });
});
