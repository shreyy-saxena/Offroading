import { openDB, type IDBPDatabase } from "idb";
import type { FlowState } from "./types";

const DB_NAME = "offroading-report-draft";
const DB_VERSION = 1;
const STORE_NAME = "draft";
const DRAFT_KEY = "current";

// Nothing worth persisting before a photo exists — the flow's very first
// step, always the same empty starting point.
export type PersistableFlowState = Exclude<FlowState, { step: "photo" }>;

// Memoized: the flow calls save/load/clear repeatedly and often in quick
// succession (once per step transition), and opening a fresh connection
// per call raced badly enough to hang in practice — a single shared
// connection avoids that entirely.
let dbPromise: Promise<IDBPDatabase> | undefined;

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
  return dbPromise;
}

// PRD 12.6 / ticket 10: persisted as the citizen moves through the flow,
// so a dropped connection or accidental reload doesn't lose their work.
// The underlying `File` is structured-clone-able and stored as-is; only
// the blob: preview URL doesn't survive a reload (regenerated on load).
export async function saveDraft(state: PersistableFlowState): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, state, DRAFT_KEY);
}

export async function loadDraft(): Promise<PersistableFlowState | undefined> {
  const db = await getDb();
  const state = await db.get(STORE_NAME, DRAFT_KEY);
  if (!state) return undefined;

  // Rebuilt from raw bytes rather than passed straight to
  // URL.createObjectURL: a structured-clone round trip can hand back an
  // object that isn't recognized as `instanceof Blob` in the realm doing
  // the check (real browsers don't have this problem — this shows up
  // under jsdom/fake-indexeddb, where the object survives the trip with
  // the wrong prototype identity).
  const storedFile = state.photo.file;
  const file = new File([await storedFile.arrayBuffer()], storedFile.name, { type: storedFile.type });

  return { ...state, photo: { ...state.photo, file, previewUrl: URL.createObjectURL(file) } };
}

export async function clearDraft(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, DRAFT_KEY);
}

// Test-only: closes the memoized connection so a test runner can delete
// the underlying database between tests without `deleteDatabase` hanging
// (it blocks until every open connection to that database closes).
export async function _closeForTests(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = undefined;
}
