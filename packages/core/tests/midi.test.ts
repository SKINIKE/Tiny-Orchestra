import { describe, expect, it } from 'vitest';

import { encodeMidi, stepToTicks } from '../src/index.js';
import type { SongJson } from '../src/types.js';

function createMidiSong(): SongJson {
  return {
    version: '1.0.0',
    bpm: 120,
    tpq: 96,
    swing: 0,
    sampleRate: 48_000,
    instruments: {
      lead: { type: 'square', duty: 0.5, adsr: [0.01, 0.05, 0.7, 0.1], volume: 0.8 },
      bass: { type: 'triangle', adsr: [0.02, 0.1, 0.6, 0.15], volume: 0.7 },
      drum: { type: 'noise', adsr: [0.001, 0.01, 0.4, 0.05], volume: 0.9, lfsr: '7bit' },
    },
    tracks: [
      {
        id: 'lead',
        instrument: 'lead',
        steps: 16,
        notes: [
          { step: 0, note: 72, len: 8, vel: 100 },
          { step: 8, note: 74, len: 8, vel: 90 },
        ],
      },
      {
        id: 'bass',
        instrument: 'bass',
        steps: 16,
        notes: [{ step: 0, note: 48, len: 16, vel: 110 }],
      },
      {
        id: 'drums',
        instrument: 'drum',
        steps: 16,
        notes: [{ step: 0, note: 36, len: 4, vel: 120 }],
      },
    ],
    song: [{ pattern: 'A', repeat: 1 }],
    patterns: { A: { overrides: [] } },
  };
}

function readVarInt(data: Uint8Array, offset: { value: number }): number {
  let result = 0;
  while (true) {
    const byte = data[offset.value];
    offset.value += 1;
    result = (result << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      break;
    }
  }
  return result;
}

describe('MIDI encoder', () => {
  it('creates SMF type 1 with tempo and note tracks', () => {
    const song = createMidiSong();
    const midi = encodeMidi(song);
    const header = midi.slice(0, 14);
    expect(String.fromCharCode(...header.slice(0, 4))).toBe('MThd');
    const format = (header[8] << 8) | header[9];
    const tracks = (header[10] << 8) | header[11];
    const division = (header[12] << 8) | header[13];
    expect(format).toBe(1);
    expect(tracks).toBe(4); // tempo + 3 tracks
    expect(division).toBe(song.tpq);

    let offset = 14;
    const trackHeaders: Array<{ id: string; data: Uint8Array }> = [];
    for (let i = 0; i < tracks; i += 1) {
      const chunkType = String.fromCharCode(...midi.slice(offset, offset + 4));
      expect(chunkType).toBe('MTrk');
      const length =
        (midi[offset + 4] << 24) |
        (midi[offset + 5] << 16) |
        (midi[offset + 6] << 8) |
        midi[offset + 7];
      const data = midi.slice(offset + 8, offset + 8 + length);
      trackHeaders.push({ id: `track-${i}`, data });
      offset += 8 + length;
    }

    // tempo track contains tempo meta event
    const tempoData = trackHeaders[0].data;
    const tempoOffset = { value: 0 };
    expect(readVarInt(tempoData, tempoOffset)).toBe(0);
    expect(tempoData[tempoOffset.value++]).toBe(0xff);
    expect(tempoData[tempoOffset.value++]).toBe(0x51);
    const tempoLength = tempoData[tempoOffset.value++];
    expect(tempoLength).toBe(3);
    const tempoValue =
      (tempoData[tempoOffset.value] << 16) |
      (tempoData[tempoOffset.value + 1] << 8) |
      tempoData[tempoOffset.value + 2];
    expect(tempoValue).toBe(500000);

    // drum track should use channel 9
    const drumTrack = trackHeaders[3].data;
    const drumOffset = { value: 0 };
    readVarInt(drumTrack, drumOffset); // delta for track name
    drumOffset.value += 1; // skip 0xFF
    drumOffset.value += 1; // skip meta type
    const drumNameLength = drumTrack[drumOffset.value];
    drumOffset.value += 1 + drumNameLength;
    const delta = readVarInt(drumTrack, drumOffset);
    expect(delta).toBe(0);
    const status = drumTrack[drumOffset.value];
    expect(status & 0xf).toBe(9);

    // lead track delta sums equal total ticks
    const leadTrack = trackHeaders[1].data;
    const leadOffset = { value: 0 };
    let totalTicks = 0;
    // skip track name meta event
    readVarInt(leadTrack, leadOffset);
    leadOffset.value += 1; // 0xFF
    leadOffset.value += 1; // meta type
    const leadNameLength = leadTrack[leadOffset.value];
    leadOffset.value += 1 + leadNameLength;
    while (leadOffset.value < leadTrack.length) {
      const deltaTime = readVarInt(leadTrack, leadOffset);
      totalTicks += deltaTime;
      const statusByte = leadTrack[leadOffset.value++];
      if (statusByte === 0xff) {
        leadOffset.value += 1; // meta type
        const metaLength = leadTrack[leadOffset.value++];
        leadOffset.value += metaLength;
        continue;
      }
      // skip note number and velocity
      leadOffset.value += 2;
    }
    const expectedTicks = stepToTicks(16, song.tpq);
    expect(totalTicks).toBeGreaterThanOrEqual(expectedTicks);
  });
});
