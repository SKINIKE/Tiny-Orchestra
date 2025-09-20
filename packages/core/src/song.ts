import type {
  CompiledNoteEvent,
  CompiledSong,
  NoteDefinition,
  PatternDefinition,
  PatternOverride,
  SongJson,
  TrackDefinition,
} from './types.js';
import { cloneDeep } from './utils.js';

function validatePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative finite number`);
  }
}

function validateNote(note: NoteDefinition, trackId: string): void {
  validatePositive(`note.step (${trackId})`, note.step);
  validatePositive(`note.len (${trackId})`, note.len);
  if (!Number.isFinite(note.note)) {
    throw new Error(`note.note (${trackId}) must be finite`);
  }
  if (!Number.isFinite(note.vel) || note.vel < 0) {
    throw new Error(`note.vel (${trackId}) must be >= 0`);
  }
}

function getPattern(song: SongJson, patternId: string): PatternDefinition | undefined {
  return song.patterns?.[patternId];
}

function overrideForTrack(
  pattern: PatternDefinition | undefined,
  trackId: string,
): PatternOverride | undefined {
  return pattern?.overrides?.find((override) => override.trackId === trackId);
}

function resolveTrackNotes(
  track: TrackDefinition,
  override: PatternOverride | undefined,
): NoteDefinition[] {
  if (!override?.notes) {
    return track.notes.map((note) => ({ ...note }));
  }
  return override.notes.map((note) => ({ ...note }));
}

function resolveTrackSteps(track: TrackDefinition, override: PatternOverride | undefined): number {
  if (override?.steps !== undefined) {
    validatePositive(`override.steps (${track.id})`, override.steps);
    return override.steps;
  }
  return track.steps;
}

export function compileSong(song: SongJson): CompiledSong {
  if (!song) {
    throw new Error('Song is required');
  }

  const bpm = Number.isFinite(song.bpm) ? song.bpm : 120;
  const tpq = Number.isFinite(song.tpq) ? song.tpq : 96;
  const sampleRate = Number.isFinite(song.sampleRate) ? song.sampleRate : 48_000;

  if (bpm <= 0) {
    throw new Error('bpm must be positive');
  }
  if (tpq <= 0) {
    throw new Error('tpq must be positive');
  }
  if (sampleRate <= 0) {
    throw new Error('sampleRate must be positive');
  }

  const events: CompiledNoteEvent[] = [];
  let globalStep = 0;
  let maxStep = 0;

  const patternSequence = song.song?.length ? song.song : [{ pattern: 'default', repeat: 1 }];
  const hasExplicitPatterns = song.song?.length && song.patterns;
  const defaultPattern: PatternDefinition = { overrides: [] };

  for (const track of song.tracks) {
    if (!song.instruments[track.instrument]) {
      throw new Error(`Missing instrument for track ${track.id}`);
    }
  }

  for (const entry of patternSequence) {
    const pattern = hasExplicitPatterns
      ? (getPattern(song, entry.pattern) ?? defaultPattern)
      : defaultPattern;
    const repeat = Math.max(1, entry.repeat ?? 1);

    for (let r = 0; r < repeat; r += 1) {
      let patternSteps = 0;
      for (const track of song.tracks) {
        const override = overrideForTrack(pattern, track.id);
        const steps = resolveTrackSteps(track, override);
        patternSteps = Math.max(patternSteps, steps);
        const instrument = song.instruments[track.instrument];
        const notes = resolveTrackNotes(track, override);

        for (const note of notes) {
          validateNote(note, track.id);
          const startStep = globalStep + note.step;
          const durationSteps = Math.max(1, note.len);
          events.push({
            startStep,
            durationSteps,
            note: note.note,
            velocity: note.vel,
            track,
            instrument,
          });
          maxStep = Math.max(maxStep, startStep + durationSteps);
        }
      }

      globalStep += patternSteps;
    }
  }

  return {
    events: cloneDeep(events),
    totalSteps: Math.max(globalStep, maxStep),
  };
}
