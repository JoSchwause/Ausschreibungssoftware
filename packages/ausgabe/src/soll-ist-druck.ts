// SPDX-License-Identifier: AGPL-3.0-or-later
// Soll/Ist als Berichtsmodell (Ticket 141, E11; Glossar „Soll/Ist“): je Position des Auftrags-LV die Soll-Menge gegen die
// aufgemessene Ist-Menge mit Differenz, Anteil und den Gesamtpreisen beider Seiten, je Gliederung und gesamt summiert, dazu
// das Kennzeichen der Schwelle (VOB/B § 2 Abs. 3, D-35). Alle Werte rechnet `abrechnung`, die App reicht sie durch (A2).

import { formatiereProzentDe } from '@tethys/dezimal';
import type {
  AuftragsLvZustand,
  Betrag,
  Buero,
  Druckprofil,
  GliederungId,
  Knoten,
  Menge,
  PositionId,
  Prozent,
} from '@tethys/vertrag';
import { KEINE_ANGABE, berichtSeite, druckdatum, wert, zelle } from './bericht';
import type { BerichtWert, BerichtZeile, Berichtsmodell } from './bericht';
import { ozText } from './aufmass-druck';
import { Kopffelder, absenderZeilen, projektFelder, verbinde } from './koepfe';
import type { ProjektKopf } from './koepfe';
import { kinderNachReihenfolge } from './modell';

/** Was der Druck aus `SollIst` von `abrechnung` liest (gleich gebaut; Fachpakete importieren einander nicht, A3). */
interface SollIstDaten {
  readonly zeilen: readonly {
    readonly positionId: PositionId;
    readonly soll: Menge | null;
    readonly ist: Menge | null;
    readonly differenz: Menge | null;
    readonly anteil: Prozent | null;
    readonly gpSoll: Betrag | null;
    readonly gpIst: Betrag;
  }[];
  readonly gliederungen: readonly {
    readonly gliederungId: GliederungId;
    readonly gpSoll: Betrag;
    readonly gpIst: Betrag;
  }[];
  readonly gesamt: { readonly gpSoll: Betrag; readonly gpIst: Betrag };
  readonly befunde: readonly {
    readonly code: 'ueber-schwelle' | 'unter-schwelle';
    readonly positionId: PositionId;
    readonly anteil: Prozent;
  }[];
}

export interface SollIstEingabe {
  readonly auftragsLv: AuftragsLvZustand;
  readonly sollIst: SollIstDaten;
  /**
   * Die Einstellungen, mit denen `abrechnung` gerechnet hat (`SollIstOptionen`); die Legende nennt die Schwellen, die hier
   * stehen, und sonst keine Zahl (der Druck kennt die Vorgaben der Rechnung nicht).
   */
  readonly optionen?: {
    readonly abgeschlossen?: boolean;
    readonly oberSchwelle?: Prozent;
    readonly unterSchwelle?: Prozent;
  };
  readonly projekt?: ProjektKopf;
  readonly buero?: Buero | null;
  /** Druckdatum `JJJJ-MM-TT`. */
  readonly datum?: string;
  readonly druckprofil?: Druckprofil;
}

const LEER: BerichtWert = { text: '' };

export function baueSollIstModell(e: SollIstEingabe): Berichtsmodell {
  const alv = e.auftragsLv.auftragsLeistungsverzeichnis;
  const { sollIst } = e;
  const zeileJePosition = new Map(sollIst.zeilen.map((z) => [z.positionId as string, z]));
  const gliederung = new Map(sollIst.gliederungen.map((g) => [g.gliederungId as string, g]));
  const befund = new Map(sollIst.befunde.map((b) => [b.positionId as string, b.code]));
  const oben = e.optionen?.oberSchwelle;
  const unten = e.optionen?.unterSchwelle;
  const kennzeichen = (code: 'ueber-schwelle' | 'unter-schwelle'): string =>
    code === 'ueber-schwelle'
      ? oben === undefined
        ? 'über der Schwelle'
        : `über ${formatiereProzentDe(oben)} %`
      : unten === undefined
        ? 'unter der Schwelle'
        : `unter ${formatiereProzentDe(unten)} %`;

  const summenZeile = (bezeichnung: string, gpSoll: Betrag | null, gpIst: Betrag | null): BerichtZeile => ({
    fett: true,
    zellen: [
      '',
      bezeichnung,
      '',
      '',
      '',
      '',
      '',
      zelle(gpSoll === null ? LEER : wert.betrag(gpSoll)),
      zelle(gpIst === null ? LEER : wert.betrag(gpIst)),
    ],
  });
  const kinder = kinderNachReihenfolge(alv.knoten);
  const zeilen: BerichtZeile[] = [];
  const besuche = (elternId: string, ebene: number): void => {
    for (const k of kinder.get(elternId) ?? []) {
      if (k.art === 'los' || k.art === 'titel') {
        zeilen.push({ fett: true, einrueckung: ebene - 1, zellen: [ozText(k), k.kurztext] });
        besuche(k.id, ebene + 1);
        const g = gliederung.get(k.id);
        zeilen.push(summenZeile(`Summe ${ozText(k)} ${k.kurztext}`, g?.gpSoll ?? null, g?.gpIst ?? null));
      } else if (k.art === 'position') zeilen.push(positionsZeile(k, zeileJePosition.get(k.id)));
    }
  };
  const positionsZeile = (
    k: Extract<Knoten, { art: 'position' }>,
    z: SollIstDaten['zeilen'][number] | undefined,
  ) => {
    const code = befund.get(k.id);
    const anteil = wert.prozent(z?.anteil ?? null);
    return {
      zellen: [
        ozText(k),
        k.kurztext,
        k.einheit ?? '',
        zelle(wert.menge(z?.soll ?? null)),
        zelle(wert.menge(z?.ist ?? null)),
        zelle(wert.menge(z?.differenz ?? null)),
        code === undefined ? zelle(anteil) : zelle(anteil, { hinweis: kennzeichen(code) }),
        zelle(wert.betrag(z?.gpSoll ?? null)),
        zelle(z === undefined ? { text: KEINE_ANGABE } : wert.betrag(z.gpIst)),
      ],
    };
  };
  besuche(alv.id, 1);
  zeilen.push(summenZeile('Gesamt', sollIst.gesamt.gpSoll, sollIst.gesamt.gpIst));

  const legende =
    'Soll: Menge im Auftrags-LV; Ist: Summe der Mengen auf den Aufmaßblättern; Anteil: Ist in Prozent der Soll-Menge. ' +
    `Gekennzeichnet ist ein Ist ${oben === undefined ? 'über der oberen Schwelle' : `über ${formatiereProzentDe(oben)} %`}` +
    ` und, sobald die Schlussrechnung vorliegt, ${unten === undefined ? 'unter der unteren Schwelle' : `unter ${formatiereProzentDe(unten)} %`}` +
    ' der Soll-Menge (VOB/B § 2 Abs. 3). GP Soll: Gesamtpreis im Auftrags-LV; GP Ist: Ist-Menge mal Einheitspreis. ' +
    'Gesamt netto vor Nachlass, Beträge in €.';

  const deckblatt = e.druckprofil?.deckblatt ?? true;
  const kopf = new Kopffelder().feld('Auftrags-LV', alv.name);
  if (e.optionen?.abgeschlossen === true) kopf.feld('Stand', 'Schlussrechnung liegt vor');
  if (deckblatt) {
    const an = alv.auftragnehmer;
    if (an) kopf.feld('Auftragnehmer', verbinde([an.name, an.strasse, verbinde([an.plz, an.ort], ' ')]));
    kopf.felder.push(...projektFelder(e.projekt));
  }
  return {
    titel: 'Soll/Ist',
    absender: deckblatt ? absenderZeilen(e.buero) : [],
    kopf: kopf.felder,
    ...druckdatum(e.datum),
    seite: berichtSeite(e.druckprofil, 'hoch', alv.name),
    abschnitte: [
      {
        ueberschrift: null,
        bloecke: [
          {
            art: 'tabelle',
            spalten: [
              { titel: 'OZ', breite: 48 },
              { titel: 'Kurztext', breite: '*' },
              { titel: 'Einh.', breite: 24 },
              { titel: 'Soll', breite: 46, rechts: true },
              { titel: 'Ist', breite: 46, rechts: true },
              { titel: 'Differenz', breite: 46, rechts: true },
              { titel: 'Anteil in %', breite: 50, rechts: true },
              { titel: 'GP Soll', breite: 56, rechts: true },
              { titel: 'GP Ist', breite: 56, rechts: true },
            ],
            zeilen,
          },
          { art: 'absatz', klein: true, text: legende },
        ],
      },
    ],
  };
}
