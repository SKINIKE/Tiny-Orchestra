import type { StereoBuffer } from './types.js';
import { clamp, ensureArrayBuffer } from './utils.js';

const RIFF_HEADER_SIZE = 44;

function floatToInt16(sample: number): number {
  const clamped = clamp(sample, -1, 1);
  return Math.max(-32768, Math.min(32767, Math.round(clamped * 32767)));
}

export interface WavEncodingOptions {
  readonly sampleRate: number;
}

export function encodeWav(buffer: StereoBuffer, options: WavEncodingOptions): Uint8Array {
  const left = buffer[0];
  const right = buffer[1];
  const frames = Math.min(left.length, right.length);
  const bytesPerSample = 2;
  const numChannels = 2;
  const dataSize = frames * numChannels * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(RIFF_HEADER_SIZE + dataSize);
  const view = new DataView(arrayBuffer);
  let offset = 0;

  function writeString(value: string) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset, value.charCodeAt(i));
      offset += 1;
    }
  }

  function writeUint32(value: number) {
    view.setUint32(offset, value, true);
    offset += 4;
  }

  function writeUint16(value: number) {
    view.setUint16(offset, value, true);
    offset += 2;
  }

  writeString('RIFF');
  writeUint32(arrayBuffer.byteLength - 8);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16);
  writeUint16(1);
  writeUint16(numChannels);
  writeUint32(options.sampleRate);
  writeUint32(options.sampleRate * numChannels * bytesPerSample);
  writeUint16(numChannels * bytesPerSample);
  writeUint16(bytesPerSample * 8);
  writeString('data');
  writeUint32(dataSize);

  for (let i = 0; i < frames; i += 1) {
    view.setInt16(offset, floatToInt16(left[i]));
    offset += 2;
    view.setInt16(offset, floatToInt16(right[i]));
    offset += 2;
  }

  return ensureArrayBuffer(arrayBuffer);
}
