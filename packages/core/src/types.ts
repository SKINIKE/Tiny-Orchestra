export type OscillatorType = 'square' | 'triangle' | 'noise';

export type LfsrMode = '7bit' | '15bit';

export type AdsrEnvelope = [attack: number, decay: number, sustain: number, release: number];

export interface InstrumentDefinition {
  type: OscillatorType;
  duty?: number;
  lfsr?: LfsrMode;
  adsr: AdsrEnvelope;
  volume: number;
  pan?: number;
}

export interface NoteDefinition {
  step: number;
  note: number;
  len: number;
  vel: number;
}

export interface TrackDefinition {
  id: string;
  instrument: string;
  steps: number;
  notes: NoteDefinition[];
  mute?: boolean;
  pan?: number;
}

export interface PatternOverride {
  trackId: string;
  steps?: number;
  notes?: NoteDefinition[];
}

export interface PatternDefinition {
  overrides: PatternOverride[];
}

export interface SongPatternEntry {
  pattern: string;
  repeat?: number;
}

export interface SongJson {
  version: string;
  bpm: number;
  tpq: number;
  swing: number;
  sampleRate: number;
  instruments: Record<string, InstrumentDefinition>;
  tracks: TrackDefinition[];
  song: SongPatternEntry[];
  patterns: Record<string, PatternDefinition>;
}

export interface RenderOptions {
  normalize?: boolean;
  tailSeconds?: number;
  masterGainDb?: number;
}

export type StereoBuffer = [Float32Array, Float32Array];

export interface CompiledNoteEvent {
  startStep: number;
  durationSteps: number;
  note: number;
  velocity: number;
  track: TrackDefinition;
  instrument: InstrumentDefinition;
}

export interface CompiledSong {
  events: CompiledNoteEvent[];
  totalSteps: number;
}
