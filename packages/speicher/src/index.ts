// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/speicher (Hauptthread). Zieht kein SQLite-WASM nach: das lebt im Worker
// (`@tethys/speicher/worker`) und in `backends.ts`.

export { kanonischesJson } from './kanonisch';
export { MIGRATIONEN, SCHEMA_VERSION, type Migration } from './migrationen';
export { SpeicherKern } from './kern';
export {
  direktTransport,
  speicherOeffnen,
  speicherUeberTransport,
  workerTransport,
  type GeoeffneterSpeicher,
  type SpeicherOeffnenOptionen,
  type SpeicherVerwaltung,
  type Transport,
} from './client';
export type { OeffnenOptionen, WorkerLike } from './rpc';
