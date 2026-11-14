// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein PDF-Lauf im Web Worker (ADR 0012 Folgen; Wellen-Review SB7): der eine Worker-Start für alle PDF-Worker der App. Der
// Worker wird je Lauf angelegt und danach beendet; Abbrechen beendet ihn sofort (die Seite bleibt bedienbar). Den Worker legt
// der Aufrufer an (`new Worker(new URL('./…-worker.ts', import.meta.url), { type: 'module' })`), weil der Bündler die
// Worker-Datei nur an dieser Form erkennt. Die Gegenseite im Worker ist `pdf-worker-basis.ts`.
//
// Ein Fehler wird zur Ablehnung mit `PdfFehler`: Sein Text ist technisch und nur Einzelheit; die Dialoge zeigen nie ihn,
// sondern ihren deutschen Satz mit dem nächsten Schritt (`fehler/texte.ts`, B-26, E13).

/** Was ein PDF-Worker antwortet: Zwischenschritte (wenn er sie meldet), die Bytes oder den Fehler. */
export type PdfAntwort =
  | { readonly art: 'schritt'; readonly schritt: string }
  | { readonly art: 'fertig'; readonly bytes: Uint8Array }
  | { readonly art: 'fehler'; readonly meldung: string };

/** Ein gescheiterter PDF-Lauf; `einzelheiten` ist der technische Text für Fehlerberichte, nie für die Anzeige. */
export class PdfFehler extends Error {
  constructor(readonly einzelheiten: string) {
    super(einzelheiten);
    this.name = 'PdfFehler';
  }
}

export interface PdfLauf {
  /** Die Bytes des PDF; `null`, wenn der Lauf abgebrochen wurde. Ein Fehler des Erzeugers wird zur Ablehnung (`PdfFehler`). */
  readonly ergebnis: Promise<Uint8Array | null>;
  abbrechen: () => void;
}

/** Schickt `auftrag` an `worker` und wartet auf das PDF; `beiSchritt` erfährt die Zwischenschritte des Workers. */
export function pdfLauf<A>(worker: Worker, auftrag: A, beiSchritt?: (schritt: string) => void): PdfLauf {
  let fertig: (b: Uint8Array | null) => void = () => undefined;
  let vorbei = false;
  const ergebnis = new Promise<Uint8Array | null>((ok, fehler) => {
    const ende = (): boolean => {
      if (vorbei) return false;
      vorbei = true;
      worker.terminate();
      return true;
    };
    fertig = (b) => {
      if (ende()) ok(b);
    };
    worker.onmessage = (e: MessageEvent<PdfAntwort>) => {
      const a = e.data;
      if (a.art === 'schritt') {
        if (!vorbei) beiSchritt?.(a.schritt);
      } else if (a.art === 'fertig') fertig(a.bytes);
      else if (ende()) fehler(new PdfFehler(a.meldung));
    };
    worker.onerror = (e) => {
      if (ende()) fehler(new PdfFehler(e.message || 'Der PDF-Worker ist abgestürzt.'));
    };
  });
  worker.postMessage(auftrag);
  return {
    ergebnis,
    abbrechen: () => {
      fertig(null);
    },
  };
}
