// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte rund um das Öffnen des Speichers (L1, E-14). Jede Meldung nennt Ursache und nächsten Schritt (E13).

import type { Speicherfehlercode } from '@tethys/vertrag';

const UNERWARTET =
  'Beim Öffnen der Ablage ist ein unerwarteter Fehler aufgetreten. Bitte „Erneut versuchen“ wählen oder die Seite neu laden. Hilft das nicht, den Fehler mit den Einzelheiten melden.';

export const texte = {
  oeffnet: 'Die Projekte werden geöffnet …',
  gesperrtTitel: 'Tethys AVA ist schon in einem anderen Tab geöffnet',
  gesperrtText:
    'Die Projekte lassen sich nur in einem Tab oder Fenster zugleich bearbeiten. Bitte im anderen Tab weiterarbeiten oder ihn schließen und hier „Erneut versuchen“ wählen. Ist kein anderer Tab offen, verweigert der Browser den Zugriff auf seine Ablage (etwa in einem privaten Fenster); dann Tethys AVA in einem normalen Fenster von Chrome oder Edge öffnen.',
  fehlerTitel: 'Der Speicher lässt sich nicht öffnen',
  erneut: 'Erneut versuchen',
  einzelheiten: 'Einzelheiten',
  /** Ursache und nächster Schritt, wenn das Öffnen scheitert (B-24); `gesperrt` hat eine eigene Meldung. */
  oeffnenFehler: {
    unbekannt:
      'Der Browser hat den Zugriff auf seine Ablage abgelehnt oder ist dabei gescheitert. Häufige Ursachen: ein privates Fenster, gesperrte Website-Daten in den Browser-Einstellungen oder ein nicht geprüfter Browser (geprüft sind aktuelle Versionen von Chrome und Edge). Bitte in einem normalen Fenster von Chrome oder Edge öffnen und „Erneut versuchen“ wählen.',
    'speicher-voll':
      'Die Ablage des Browsers ist voll. Bitte auf dem Datenträger Platz schaffen oder in den Browser-Einstellungen die Website-Daten anderer Seiten löschen, dann „Erneut versuchen“ wählen.',
    'schema-zu-neu':
      'Die Projekte in diesem Browser stammen von einer neueren Version von Tethys AVA. Bitte die Seite neu laden, damit die neuere Version geladen wird.',
    'migration-fehlgeschlagen':
      'Die Projekte in diesem Browser ließen sich nicht auf diese Version umstellen; sie sind unverändert. Bitte die Seite neu laden. Hilft das nicht, den Fehler mit den Einzelheiten melden.',
    'datei-ungueltig':
      'Die Ablage des Browsers ist nicht lesbar. Bitte die Seite neu laden. Hilft das nicht, den Fehler mit den Einzelheiten melden und die Projekte aus den gesicherten Projektdateien wiederherstellen.',
    gesperrt: UNERWARTET,
    'nicht-gefunden': UNERWARTET,
    konflikt: UNERWARTET,
    'existiert-bereits': UNERWARTET,
    'datei-zu-gross': UNERWARTET,
  } satisfies Record<Speicherfehlercode, string>,
} as const;
