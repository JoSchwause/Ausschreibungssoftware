// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstieg des Speicher-Workers: SQLite-WASM im OPFS. Die App startet ihn mit
// `new Worker(new URL('@tethys/speicher/worker', import.meta.url), { type: 'module' })`
// und reicht ihn an `speicherOeffnen` (Hauptthread).

import { oeffneOpfs } from './backends';
import { betreibeWorker, type WorkerScope } from './worker-host';

betreibeWorker(self as unknown as WorkerScope, (optionen) => oeffneOpfs(optionen.datenbank));
