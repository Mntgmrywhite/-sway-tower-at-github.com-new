// Minimal WAV reading/writing for the offline music renderer.
// Reads PCM 16/24/32-bit and IEEE float, mono or stereo; always returns stereo float32.

import { readFileSync, writeFileSync } from "node:fs";

export interface Audio {
  rate: number;
  left: Float32Array;
  right: Float32Array;
}

export function readWav(path: string): Audio {
  const buf = readFileSync(path);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${path}: not a RIFF/WAVE file`);
  }
  let pos = 12;
  let format = 0;
  let channels = 0;
  let rate = 0;
  let bits = 0;
  let data: Buffer | null = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt ") {
      format = buf.readUInt16LE(body);
      channels = buf.readUInt16LE(body + 2);
      rate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
      if (format === 0xfffe) format = buf.readUInt16LE(body + 24); // WAVE_FORMAT_EXTENSIBLE sub-format
    } else if (id === "data") {
      data = buf.subarray(body, Math.min(buf.length, body + size));
    }
    pos = body + size + (size % 2);
  }
  if (!data || !channels || !rate) throw new Error(`${path}: missing fmt or data chunk`);
  const bytes = bits / 8;
  const frames = Math.floor(data.length / (bytes * channels));
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const read = (i: number): number => {
    const o = i * bytes;
    if (format === 3) return bits === 64 ? data!.readDoubleLE(o) : data!.readFloatLE(o);
    if (bits === 16) return data!.readInt16LE(o) / 32768;
    if (bits === 24) return data!.readIntLE(o, 3) / 8388608;
    if (bits === 32) return data!.readInt32LE(o) / 2147483648;
    if (bits === 8) return (data!.readUInt8(o) - 128) / 128;
    throw new Error(`${path}: unsupported ${bits}-bit PCM`);
  };
  for (let f = 0; f < frames; f++) {
    left[f] = read(f * channels);
    right[f] = channels > 1 ? read(f * channels + 1) : left[f]!;
  }
  return { rate, left, right };
}

/** Write 16-bit PCM stereo (what afconvert encodes from). */
export function writeWav(path: string, audio: Audio): void {
  const frames = audio.left.length;
  const out = Buffer.alloc(44 + frames * 4);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + frames * 4, 4);
  out.write("WAVE", 8, "ascii");
  out.write("fmt ", 12, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(2, 22);
  out.writeUInt32LE(audio.rate, 24);
  out.writeUInt32LE(audio.rate * 4, 28);
  out.writeUInt16LE(4, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(frames * 4, 40);
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  for (let f = 0; f < frames; f++) {
    out.writeInt16LE(Math.round(clamp(audio.left[f]!) * 32767), 44 + f * 4);
    out.writeInt16LE(Math.round(clamp(audio.right[f]!) * 32767), 46 + f * 4);
  }
  writeFileSync(path, out);
}
