// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein PDF-Lauf im Web Worker (Wellen-Review, SB7): der eine Worker-Start aller PDF-Worker. Geprüft mit einem nachgebauten
// Worker: Auftrag hin, Bytes oder Fehler zurück, danach ist der Worker beendet; Abbrechen beendet ihn sofort.

import { describe, expect, it } from 'vitest';
import { PdfFehler, pdfLauf, type PdfAntwort } from './pdf-lauf';

class WorkerAttrappe {
  onmessage: ((e: MessageEvent<PdfAntwort>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  readonly gesendet: unknown[] = [];
  beendet = false;
  postMessage(m: unknown): void {
    this.gesendet.push(m);
  }
  terminate(): void {
    this.beendet = true;
  }
  antworte(a: PdfAntwort): void {
    this.onmessage?.({ data: a } as MessageEvent<PdfAntwort>);
  }
}

const start = (w: WorkerAttrappe, schritte: string[] = []) =>
  pdfLauf(w as unknown as Worker, { art: 'test' }, (s) => schritte.push(s));

describe('PDF-Lauf im Worker', () => {
  it('schickt den Auftrag, meldet Schritte und liefert die Bytes; danach ist der Worker beendet', async () => {
    const w = new WorkerAttrappe();
    const schritte: string[] = [];
    const lauf = start(w, schritte);
    expect(w.gesendet).toEqual([{ art: 'test' }]);
    w.antworte({ art: 'schritt', schritt: 'schriften' });
    expect(w.beendet).toBe(false);
    w.antworte({ art: 'fertig', bytes: new Uint8Array([37, 80]) });
    await expect(lauf.ergebnis).resolves.toEqual(new Uint8Array([37, 80]));
    expect(schritte).toEqual(['schriften']);
    expect(w.beendet).toBe(true);
  });

  it('ein Fehler des Erzeugers wird zur Ablehnung mit dem technischen Text als Einzelheit', async () => {
    const w = new WorkerAttrappe();
    const lauf = start(w);
    w.antworte({ art: 'fehler', meldung: 'Schrift nicht ladbar: /a.woff (404)' });
    const f: unknown = await lauf.ergebnis.catch((e: unknown) => e);
    expect(f).toBeInstanceOf(PdfFehler);
    expect((f as PdfFehler).einzelheiten).toBe('Schrift nicht ladbar: /a.woff (404)');
    expect(w.beendet).toBe(true);
  });

  it('ein abgestürzter Worker wird zur Ablehnung', async () => {
    const w = new WorkerAttrappe();
    const lauf = start(w);
    w.onerror?.({ message: '' } as ErrorEvent);
    await expect(lauf.ergebnis).rejects.toBeInstanceOf(PdfFehler);
    expect(w.beendet).toBe(true);
  });

  it('Abbrechen beendet den Worker sofort und liefert null; eine späte Antwort ändert nichts', async () => {
    const w = new WorkerAttrappe();
    const lauf = start(w);
    lauf.abbrechen();
    expect(w.beendet).toBe(true);
    w.antworte({ art: 'fertig', bytes: new Uint8Array([1]) });
    await expect(lauf.ergebnis).resolves.toBeNull();
  });
});
