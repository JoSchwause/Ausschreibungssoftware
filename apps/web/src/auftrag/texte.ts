// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte von Zuschlag und Auftrags-LV (Ticket 64, L1).

const liste = (xs: readonly string[]): string => xs.join(', ');
const positionen = (n: number): string => (n === 1 ? '1 Position' : `${String(n)} Positionen`);

export const texte = {
  warnung: {
    entfallen: (anzahl: number, welche: readonly string[]) =>
      `Im Auftrags-LV ${anzahl === 1 ? 'entfällt' : 'entfallen'} ${positionen(anzahl)}: ${liste(welche)}.`,
    nichtAngeboten: (p: string) =>
      `${p}: vom Bieter nicht angeboten; die Position steht ohne Einheitspreis im Auftrags-LV.`,
    satzFehlt: (p: string) =>
      `${p}: Zuschlagsposition ohne Satz des Bieters; der Satz bleibt im Auftrags-LV leer.`,
    ohneGrundposition: (p: string) => `${p}: Die gewählte Alternative ersetzt keine Grundposition.`,
    bezugEntfernt: (p: string, ziel: string) =>
      `${p}: Der Bezug auf ${ziel} entfällt, weil ${ziel} nicht im Auftrags-LV steht.`,
    grundpositionEntfernt: (p: string, ziel: string) =>
      `${p}: Der Verweis auf die Grundposition ${ziel} entfällt, weil ${ziel} nicht im Auftrags-LV steht.`,
  },
  wahl: {
    statt: (grund: readonly string[]) => `Statt ${liste(grund)}`,
    gruppe: (nr: number | null) => (nr === null ? 'Wahlgruppe' : `Wahlgruppe ${String(nr)}`),
  },
  dialog: {
    titel: (bieter: string) => `Zuschlag erteilen – ${bieter}`,
    einleitung: (bieter: string) =>
      `Das Angebot von ${bieter} wird beauftragt. Es entsteht ein Auftrags-LV mit den Preisen des Bieters; das Ausschreibungs-LV bleibt unverändert.`,
    keineWahl: 'Das LV hat keine Wahlpositionen.',
    waehlen: (alternative: string) => `${alternative} wählen`,
    entfallend: 'Entfallende Positionen',
    unbepreist: 'Positionen ohne Preis des Bieters',
    warnungen: 'Hinweise zum Zuschlag',
    undo: 'Rückgängig nimmt den Zuschlag wieder zurück.',
    abbrechen: 'Abbrechen',
    bestaetigen: 'Zuschlag erteilen',
    erteilt: (bieter: string) => `Zuschlag an ${bieter} erteilt`,
    nichtErteilt: 'Zuschlag nicht erteilt',
  },
  knopf: {
    erteilen: 'Zuschlag erteilen',
    erteilenFuer: (bieter: string) => `Zuschlag erteilen: ${bieter}`,
    vergeben: (bieter: string) =>
      `Der Zuschlag zu diesem LV ist an ${bieter} erteilt. Ein zweiter Zuschlag ist nicht möglich; Rückgängig nimmt den Zuschlag zurück.`,
    oeffnen: 'Auftrags-LV öffnen',
  },
  nachtragOhneZuschlag: (nummer: string) =>
    `Nachtrag ${nummer} ist ein Nachtrags-LV und bekommt keinen Zuschlag. Er wird auf seiner LV-Seite beauftragt („Beauftragen“).`,
  schonVergeben:
    'Zu diesem LV gibt es schon ein Auftrags-LV. Ein zweiter Zuschlag ist nicht möglich; Rückgängig nimmt den ersten zurück.',
  seite: {
    laden: 'Auftrags-LV wird geladen …',
    nichtGefunden: 'Auftrags-LV nicht gefunden',
    kennzeichen: 'Auftrags-LV',
    titel: (name: string) => `Auftrags-LV – ${name}`,
    auftragnehmer: 'Auftragnehmer',
    ohneAuftragnehmer: 'nicht angegeben',
    ausschreibung: 'Ausschreibungs-LV',
    angebot: 'Angebot',
    angebotVon: (bieter: string) => `Angebot von ${bieter}`,
    zumProjekt: 'Zum Projekt',
    zumPreisspiegel: 'Zum Preisspiegel',
    werkzeuge: 'Werkzeuge des Auftrags-LV',
    gruppen: { ausgabe: 'Ausgabe', abrechnung: 'Abrechnung' },
    grid: 'Positionen des Auftrags-LV',
  },
  ausgabe: {
    knopf: 'GAEB X86 ausgeben',
    titel: 'Auftrags-LV als GAEB X86 ausgeben',
    version: 'Version',
    herunterladen: 'Herunterladen',
    schliessen: 'Schließen',
    ausgegeben: 'X86 ausgegeben',
  },
  liste: {
    titel: 'Auftrags-LVs',
    tabelle: 'Auftrags-LVs des Projekts',
    leer: 'Noch kein Zuschlag erteilt.',
    eintrag: (name: string, bieter: string) => `${name} (${bieter})`,
    netto: 'Netto nach Nachlass',
  },
} as const;
