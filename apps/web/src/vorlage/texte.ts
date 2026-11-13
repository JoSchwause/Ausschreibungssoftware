// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte von Muster-LV und Textquelle (Ticket 90, L1).

export const texte = {
  kennzeichnen: {
    label: 'Als Muster-LV (Vorlage) kennzeichnen',
    hinweis: 'Positionen und Gliederungen eines Muster-LV lassen sich in jedes andere LV übernehmen.',
  },
  kennzeichen: 'Vorlage',
  textquelle: {
    label: 'Textquelle',
    hinweis: 'Woher der Text stammt, frei, z. B. „Muster-LV Hochbau 2026“. Leer: keine Angabe.',
  },
  uebernehmen: {
    knopf: 'Aus Vorlage übernehmen …',
    titel: 'Aus Vorlage übernehmen',
    vorlage: 'Muster-LV',
    laedt: 'Die Muster-LVs werden gesucht …',
    keine: 'Es gibt noch kein Muster-LV. Kennzeichnen Sie ein LV in den LV-Angaben als Muster-LV.',
    waehlen: 'Muster-LV wählen',
    auswahl: 'Zu übernehmende Positionen und Gliederungen',
    ladenFehler: 'Das Muster-LV konnte nicht geladen werden.',
    alle: 'Alles wählen',
    nichts: 'Nichts wählen',
    ortAktiv: 'Eingefügt wird hinter der aktiven Zeile.',
    ortEnde: 'Eingefügt wird am Ende des LV.',
    anzahl: (n: number) => (n === 1 ? '1 Zeile gewählt' : `${String(n)} Zeilen gewählt`),
    uebernehmen: 'Übernehmen',
    abbrechen: 'Abbrechen',
    fertig: (n: number) => (n === 1 ? '1 Position übernommen' : `${String(n)} Positionen übernommen`),
    ohneBezug: (n: number) =>
      n === 1
        ? 'Ein Bezug auf eine nicht übernommene Position wurde entfernt.'
        : `${String(n)} Bezüge auf nicht übernommene Positionen wurden entfernt.`,
    hinweistext: 'Hinweistext',
    projektLv: (projekt: string, lv: string) => `${projekt}: ${lv}`,
  },
} as const;
