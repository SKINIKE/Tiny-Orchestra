import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  compileSong,
  countClippedSamples,
  encodeMidi,
  encodeWav,
  renderSong,
  stepToSeconds,
} from '../src/index.js';
import type { SongJson } from '../src/types.js';

const instrumentType = fc.constantFrom<'square' | 'triangle' | 'noise'>(
  'square',
  'triangle',
  'noise',
);

const noteArb = fc.record({
  step: fc.integer({ min: 0, max: 31 }),
  len: fc.integer({ min: 1, max: 16 }),
  note: fc.integer({ min: 36, max: 96 }),
  vel: fc.integer({ min: 1, max: 127 }),
});

const trackArb = fc
  .array(
    fc.record({
      id: fc.hexaString({ minLength: 3, maxLength: 6 }),
      type: instrumentType,
      duty: fc.float({
        min: Math.fround(0.1),
        max: Math.fround(0.9),
        noNaN: true,
        noDefaultInfinity: true,
      }),
      volume: fc.float({
        min: Math.fround(0.3),
        max: Math.fround(1),
        noNaN: true,
        noDefaultInfinity: true,
      }),
      adsr: fc.tuple(
        fc.float({ min: 0, max: Math.fround(0.05), noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0, max: Math.fround(0.15), noNaN: true, noDefaultInfinity: true }),
        fc.float({
          min: Math.fround(0.3),
          max: Math.fround(1),
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.float({
          min: Math.fround(0.05),
          max: Math.fround(0.3),
          noNaN: true,
          noDefaultInfinity: true,
        }),
      ),
      lfsr: fc.constantFrom<'7bit' | '15bit'>('7bit', '15bit'),
      steps: fc.integer({ min: 4, max: 32 }),
      notes: fc.array(noteArb, { minLength: 0, maxLength: 4 }),
    }),
    { minLength: 1, maxLength: 3 },
  )
  .map((tracks) => {
    const instruments: SongJson['instruments'] = {};
    const trackDefs: SongJson['tracks'] = [];
    tracks.forEach((track, index) => {
      const instrumentId = `inst${index}`;
      const trackId = `tr${index}_${track.id}`;
      const sanitizedNotes = track.notes.map((note) => {
        const startStep = note.step % track.steps;
        const maxLen = Math.max(1, track.steps - startStep);
        return {
          step: startStep,
          len: Math.max(1, Math.min(note.len, maxLen)),
          note: note.note,
          vel: note.vel,
        };
      });
      instruments[instrumentId] = {
        type: track.type,
        duty: track.type === 'square' ? track.duty : undefined,
        volume: track.volume,
        adsr: track.adsr,
        lfsr: track.type === 'noise' ? track.lfsr : undefined,
      };
      trackDefs.push({
        id: trackId,
        instrument: instrumentId,
        steps: track.steps,
        notes: sanitizedNotes,
      });
    });
    return { instruments, trackDefs };
  });

const songArb = fc
  .record({
    bpm: fc.integer({ min: 80, max: 160 }),
    tpq: fc.constant(96),
    swing: fc.float({ min: 0, max: Math.fround(0.4), noNaN: true, noDefaultInfinity: true }),
    sampleRate: fc.constant(48_000),
    structure: trackArb,
  })
  .map(({ bpm, tpq, swing, sampleRate, structure }) => {
    const song: SongJson = {
      version: '1.0.0',
      bpm,
      tpq,
      swing,
      sampleRate,
      instruments: structure.instruments,
      tracks: structure.trackDefs,
      song: [{ pattern: 'A', repeat: 1 }],
      patterns: { A: { overrides: [] } },
    };
    return song;
  });

describe('property based invariants', () => {
  it('maintains amplitude and timing invariants for random songs', () => {
    fc.assert(
      fc.property(songArb, (song) => {
        const rendered = renderSong(song);
        expect(rendered.buffer[0].length).toBe(rendered.buffer[1].length);
        let maxSample = 0;
        for (let i = 0; i < rendered.buffer[0].length; i += 1) {
          maxSample = Math.max(
            maxSample,
            Math.abs(rendered.buffer[0][i]),
            Math.abs(rendered.buffer[1][i]),
          );
        }
        expect(maxSample).toBeLessThanOrEqual(1);
        const clipped =
          countClippedSamples(rendered.buffer[0]) + countClippedSamples(rendered.buffer[1]);
        const ratio = clipped / (rendered.buffer[0].length * 2);
        expect(ratio).toBeLessThan(0.01);

        const compiled = compileSong(song);
        let maxSeconds = 0;
        for (const event of compiled.events) {
          const startSeconds = stepToSeconds(event.startStep, song.bpm, song.tpq);
          const gateSeconds = stepToSeconds(event.durationSteps, song.bpm, song.tpq);
          const release = event.instrument.adsr[3];
          maxSeconds = Math.max(maxSeconds, startSeconds + gateSeconds + release);
        }
        const expectedMinDuration = (compiled.events.length === 0 ? 0 : maxSeconds) + 0.05;
        expect(rendered.durationSeconds).toBeGreaterThanOrEqual(expectedMinDuration - 0.05);

        const wav = encodeWav(rendered.buffer, { sampleRate: song.sampleRate });
        expect(wav.byteLength).toBeGreaterThan(44);
        const midi = encodeMidi(song);
        expect(midi.byteLength).toBeGreaterThan(20);
      }),
      { verbose: false },
    );
  });
});
