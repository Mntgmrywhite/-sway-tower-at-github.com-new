// Runs the time stretch off the main thread, so the game keeps its frame rate while a song is
// stretched. engine.ts imports this as "./stretch.worker?worker&inline": Vite bundles it into the
// page itself (no separate file), which the single-file Artifact build and the iOS app need.

import { stretchLoop, type StretchJob, type StretchReply } from "./stretch";

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<StretchJob>) => void) | null;
  postMessage(message: StretchReply, transfer: Transferable[]): void;
};

scope.onmessage = (e) => {
  const job = e.data;
  try {
    const { channels, map } = stretchLoop(job.channels, job.rate, job.sampleRate);
    const transfer = [...channels.map((c) => c.buffer as ArrayBuffer), map.anchors.buffer as ArrayBuffer];
    scope.postMessage({ id: job.id, ok: true, channels, map }, transfer);
  } catch (err) {
    scope.postMessage({ id: job.id, ok: false, error: String(err) }, []);
  }
};
