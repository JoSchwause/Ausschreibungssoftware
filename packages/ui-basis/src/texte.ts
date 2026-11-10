// SPDX-License-Identifier: AGPL-3.0-or-later
// Vorgabetexte der Bausteine (L1, U8): deutsch, an einer Stelle, keine Übersetzung in v1.
// Die Anwendung kann jeden Text über die Eigenschaften der Bausteine überschreiben.

export const baustein = {
  dialogSchliessen: 'Schließen',
  toastSchliessen: 'Meldung schließen',
  auswahlPlatzhalter: 'Bitte wählen',
  zahlfeldFormat: 'Das Zahlenformat ist ungewöhnlich. Erwartet wird z. B. 1.234,50.',
  pflichtfeld: 'Pflichtfeld',
} as const;

/** Texte des Langtext-Editors (Ticket 34). */
export const langtextTexte = {
  bild: 'Bild',
  ergaenzung: { bieter: 'Textergänzung Bieter', ausschreibender: 'Textergänzung Ausschreibender' },
  ergaenzungLeer: '…',
  werkzeugleiste: 'Formatierung',
  fett: 'Fett',
  kursiv: 'Kursiv',
  unterstrichen: 'Unterstrichen',
  aufzaehlung: 'Aufzählung',
  nummerierteListe: 'Nummerierte Liste',
  hinweis: 'Strg+Enter oder Verlassen übernimmt, Esc verwirft.',
} as const;
