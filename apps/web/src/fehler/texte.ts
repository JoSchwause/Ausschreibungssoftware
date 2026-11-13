// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Fehlerseite und der Startprüfung (E13, L4, L5): unpersönlich, mit nächstem Schritt.

import type { Faehigkeit } from './faehigkeiten';

export const texte = {
  seite: {
    titel: 'Es ist ein Fehler aufgetreten',
    text: 'Diese Ansicht lässt sich nicht weiter anzeigen. Jede Änderung bis zu diesem Fehler ist gespeichert. Bitte die Seite neu laden. Tritt der Fehler wieder auf, vorher die Projektdatei sichern und den Fehler mit den Einzelheiten melden.',
  },
  band: {
    titel: 'Im Hintergrund ist ein Fehler aufgetreten',
    text: 'Die angezeigten Werte könnten veraltet sein. Bitte die Seite neu laden; alles bisher Gespeicherte bleibt erhalten.',
    weiter: 'Weiterarbeiten',
  },
  sichern: 'Projektdatei sichern',
  gesichert: 'Die Projektdatei wurde heruntergeladen.',
  sichernFehler:
    'Die Projektdatei ließ sich nicht sichern. Bitte die Seite neu laden und die Projektdatei auf der Projektseite exportieren.',
  neuLaden: 'Neu laden',
  einzelheiten: 'Einzelheiten',
  ohneMeldung: 'Keine Meldung vorhanden.',
  browser: {
    titel: 'Dieser Browser kann Tethys AVA nicht ausführen',
    fehlt: 'Es fehlt:',
    naechsterSchritt: 'Bitte Tethys AVA in einer aktuellen Version von Chrome oder Edge öffnen.',
    unsicher:
      'Die Seite ist nicht über eine sichere Verbindung geladen; dann fehlen einige Fähigkeiten. Bitte die Adresse mit „https://“ öffnen.',
    privat:
      'Manche Browser stellen in einem privaten Fenster keine Ablage bereit. In diesem Fall ein normales Fenster verwenden.',
    geprueft: 'Geprüft: aktuelle Chromium-Browser (Chrome, Edge). Firefox und Safari sind nicht geprüft.',
    faehigkeit: {
      opfs: 'Ablage für Daten im Browser (Origin Private File System)',
      worker: 'Hintergrundprozesse (Web Worker)',
      modulWorker: 'Hintergrundprozesse als Module (Module Worker)',
      kryptografie: 'Prüfsummen (Web Crypto)',
      webassembly: 'WebAssembly',
      dateien: 'Dateien lesen und herunterladen (File API)',
      textkodierung: 'Textkodierung (TextEncoder, TextDecoder)',
    } satisfies Record<Faehigkeit, string>,
  },
  /** Ersatz für die rohe Ausnahme beim Erzeugen eines PDF (B-26). */
  pdf: 'Bitte den Dialog schließen und erneut versuchen. Hilft das nicht, die Seite neu laden.',
} as const;
