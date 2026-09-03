import { File as NodeFile } from "node:buffer";

// Node's native File, not jsdom's global one: jsdom's File doesn't
// survive fake-indexeddb's structured clone (comes back as an empty,
// null-prototype object — see draft-store.ts's loadDraft comment). Any
// test whose file might pass through the draft store needs this; using
// it everywhere keeps fixtures consistent rather than having two
// slightly different "sample photo" helpers across test files.
export function samplePhotoFile(): File {
  return new NodeFile([new Uint8Array([1, 2, 3])], "pothole.jpg", { type: "image/jpeg" }) as unknown as File;
}
