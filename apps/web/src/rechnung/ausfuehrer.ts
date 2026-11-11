// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: die eine Stelle, an der die App den Ausführer der Rechnung-Befehle bezieht (Signaturen `vertrag` v1.4,
// Ausführer in `abrechnung`, Ticket 81). ÜBERGANG bis zum Merge von Ticket 81: Bis dahin steht hier eine schlichte
// Fassung ohne Formprüfung, damit Oberfläche und E2E schon laufen; mit 81 wird diese Datei ein Re-Export aus
// `@tethys/abrechnung` (D-88.2).

import type {
  Befehlsfehler,
  Ergebnis,
  Rechnung,
  RechnungBefehlAusfuehren,
  RechnungChangeSet,
  RechnungChangeSetAnwenden,
  RechnungChangeSetUmkehren,
} from '@tethys/vertrag';

const fehler = (
  code: Befehlsfehler['code'],
  meldung: string,
): Ergebnis<RechnungChangeSet, Befehlsfehler> => ({
  ok: false,
  fehler: { code, meldung },
});

const cs = (vorher: Rechnung | null, nachher: Rechnung | null): RechnungChangeSet => {
  const id = (nachher ?? vorher)?.id;
  if (id === undefined) throw new Error('RechnungChangeSet ohne Rechnung');
  return { art: 'rechnung', rechnungId: id, rechnung: { vorher, nachher } };
};

export const rechnungBefehlAusfuehren: RechnungBefehlAusfuehren = (zustand, befehl) => {
  if (befehl.art === 'RechnungAnlegen') {
    if (zustand !== null) return fehler('ungueltige-eingabe', 'Rechnung besteht schon');
    if (befehl.rechnung.freigabe !== null) return fehler('ungueltige-eingabe', 'freigabe beim Anlegen');
    return { ok: true, wert: cs(null, befehl.rechnung) };
  }
  if (zustand === null) return fehler('ungueltige-eingabe', 'keine Rechnung');
  const r = zustand.rechnung;
  if (befehl.art === 'RechnungsfreigabeAufheben') {
    if (r.freigabe === null) return fehler('ungueltige-eingabe', 'nicht freigegeben');
    return { ok: true, wert: cs(r, { ...r, freigabe: null }) };
  }
  if (r.freigabe !== null) return fehler('rechnung-freigegeben', 'Rechnung ist freigegeben');
  switch (befehl.art) {
    case 'RechnungsangabenSetzen':
      return {
        ok: true,
        wert: cs(r, {
          ...r,
          art: befehl.rechnungsart,
          eingang: befehl.eingang,
          rechnungsnummerAuftragnehmer: befehl.rechnungsnummerAuftragnehmer,
          gefordert: befehl.gefordert,
        }),
      };
    case 'RechnungsaufmasseSetzen':
      return { ok: true, wert: cs(r, { ...r, aufmassIds: befehl.aufmassIds }) };
    case 'RechnungsabzuegeSetzen':
      return {
        ok: true,
        wert: cs(r, {
          ...r,
          umlagen: befehl.umlagen,
          sicherheitSatz: befehl.sicherheitSatz,
          gewaehrleistungSatz: befehl.gewaehrleistungSatz,
        }),
      };
    case 'RechnungFreigeben':
      return { ok: true, wert: cs(r, { ...r, freigabe: { zahlbetrag: befehl.zahlbetrag } }) };
    case 'RechnungLoeschen':
      return { ok: true, wert: cs(r, null) };
  }
};

export const rechnungChangeSetAnwenden: RechnungChangeSetAnwenden = (_zustand, c) =>
  c.rechnung.nachher === null ? null : { rechnung: c.rechnung.nachher };

export const rechnungChangeSetUmkehren: RechnungChangeSetUmkehren = (c) => ({
  ...c,
  rechnung: { vorher: c.rechnung.nachher, nachher: c.rechnung.vorher },
});
