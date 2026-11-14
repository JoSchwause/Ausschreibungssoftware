// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeilen nach Spaltennamen schreiben (Ticket 135, SA7): INSERT und UPDATE binden jeden Wert über den Namen seiner Spalte,
// nicht über seine Stelle in einem Tupel. Eine andere Reihenfolge der Schlüssel ändert nichts am Ergebnis.

import { describe, expect, it } from 'vitest';
import { aendern, einfuegen, spaltenwerte } from './schreiben';
import { neueDatenbank } from './testhilfe/node';

async function tabelle() {
  const db = await neueDatenbank();
  db.skript('CREATE TABLE t (id TEXT PRIMARY KEY, a TEXT, b INTEGER, c TEXT)');
  return db;
}

describe('einfuegen und aendern', () => {
  it('fügt nach Spaltennamen ein, unabhängig von der Reihenfolge der Schlüssel', async () => {
    const db = await tabelle();
    einfuegen(db, 't', { c: 'drei', id: 'x', b: 2, a: 'eins' });
    expect(db.zeilen('SELECT * FROM t')).toEqual([{ id: 'x', a: 'eins', b: 2, c: 'drei' }]);
  });

  it('ändert nur die genannten Spalten der Zeile mit der Kennung', async () => {
    const db = await tabelle();
    einfuegen(db, 't', { id: 'x', a: 'eins', b: 2, c: 'drei' });
    einfuegen(db, 't', { id: 'y', a: 'alt', b: 9, c: 'alt' });
    const zeile = { b: 5, c: 'neu', id: 'x', a: 'nicht geschrieben' };
    aendern(db, 't', zeile, ['c', 'b']);
    expect(db.zeilen('SELECT * FROM t ORDER BY id')).toEqual([
      { id: 'x', a: 'eins', b: 5, c: 'neu' },
      { id: 'y', a: 'alt', b: 9, c: 'alt' },
    ]);
  });

  it('spaltenwerte liefert die Werte in der Reihenfolge der Namen', () => {
    const zeile = { a: 1, b: 'zwei', c: null };
    expect(spaltenwerte(zeile, ['c', 'a'])).toEqual([null, 1]);
  });
});
