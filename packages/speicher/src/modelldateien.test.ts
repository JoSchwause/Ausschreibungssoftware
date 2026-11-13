// SPDX-License-Identifier: AGPL-3.0-or-later
// Ablage der Modelldateien (`vertrag` v1.6 Punkt 2, D-51; Ticket 106 Punkt 2): inhaltsadressiert über den SHA-256 der
// unkomprimierten Bytes, `ablegen` idempotent, `laden` liefert dieselben Bytes, `vorhanden`. Freigabe ungenutzter Bytes nur beim
// Öffnen des Speichers (D-97.5). Geprüft an der Vertragsschnittstelle (`Speicher.modelldateien`); den Hash rechnet der Test
// unabhängig mit `node:crypto` nach.

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { kernAufDb, neuerKern, wert } from './testhilfe/node';

const sha256 = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const BYTES = new TextEncoder().encode(
  'ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n',
);

describe('Modelldateiablage', () => {
  it('ablegen liefert den SHA-256 der unkomprimierten Bytes; laden liefert dieselben Bytes; vorhanden', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const hash = wert(await s.modelldateien.ablegen(BYTES));
    expect(hash).toBe(sha256(BYTES));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(wert(await s.modelldateien.vorhanden(hash))).toBe(true);
    expect(wert(await s.modelldateien.laden(hash))).toEqual(BYTES);
  });

  it('ablegen ist idempotent: dieselben Bytes zweimal ergeben denselben Hash und keinen Fehler', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const a = wert(await s.modelldateien.ablegen(BYTES));
    const b = wert(await s.modelldateien.ablegen(new Uint8Array(BYTES)));
    expect(b).toBe(a);
    expect(wert(await s.modelldateien.laden(a))).toEqual(BYTES);
  });

  it('auch große und leere Dateien kommen unverändert zurück', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const gross = new Uint8Array(3_000_000).map((_, i) => (i * 7919) % 251);
    const leer = new Uint8Array(0);
    expect(wert(await s.modelldateien.laden(wert(await s.modelldateien.ablegen(gross))))).toEqual(gross);
    expect(wert(await s.modelldateien.ablegen(leer))).toBe(sha256(leer));
    expect(wert(await s.modelldateien.laden(sha256(leer)))).toEqual(leer);
  });

  it('ein Hash ohne Bytes: laden nicht-gefunden, vorhanden false; keine Bytes: unbekannt', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const r = await s.modelldateien.laden('0'.repeat(64));
    expect(!r.ok && r.fehler.code).toBe('nicht-gefunden');
    expect(wert(await s.modelldateien.vorhanden('0'.repeat(64)))).toBe(false);
    const x = await s.modelldateien.ablegen('kein Uint8Array' as never);
    expect(!x.ok && x.fehler.code).toBe('unbekannt');
  });

  it('Freigabe: Bytes, die kein Modell nennt, entfernt erst das nächste Öffnen; während der Sitzung bleiben sie', async () => {
    const { kern, db } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const hash = wert(await s.modelldateien.ablegen(BYTES));
    expect(wert(await s.modelldateien.vorhanden(hash))).toBe(true);
    // Eine neue Sitzung auf derselben Datenbank (In-Memory: ohne Schließen, sonst wäre sie weg).
    const neu = speicherUeberTransport(direktTransport(kernAufDb(db)), null);
    expect(wert(await neu.modelldateien.vorhanden(hash))).toBe(false);
  });

  it('nach dem Schließen: gesperrt', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    wert(await s.schliessen());
    for (const r of [
      await s.modelldateien.ablegen(BYTES),
      await s.modelldateien.laden('0'.repeat(64)),
      await s.modelldateien.vorhanden('0'.repeat(64)),
    ])
      expect(!r.ok && r.fehler.code).toBe('gesperrt');
  });
});
