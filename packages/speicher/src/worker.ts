// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstieg des Speicher-Workers: SQLite-WASM im OPFS. Die App startet ihn mit Vite so (siehe harness/main.ts,
// dort im Browser getestet) und reicht ihn an `speicherOeffnen` (Hauptthread):
//   import SpeicherWorker from '@tethys/speicher/worker?worker';
//   const r = await speicherOeffnen({ worker: new SpeicherWorker() });

import { oeffneOpfs } from './backends';
import { betreibeWorker } from './worker-host';

betreibeWorker(self, (optionen) => oeffneOpfs(optionen.datenbank));
