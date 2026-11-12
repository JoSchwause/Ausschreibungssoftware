// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Nachträge (Ticket 86, L1).

const liste = (xs: readonly string[]): string => xs.join(', ');
const positionen = (n: number): string => (n === 1 ? '1 Position' : `${String(n)} Positionen`);

export const texte = {
  lvName: (nummer: string, bezeichnung: string): string =>
    bezeichnung === '' ? `Nachtrag ${nummer}` : `Nachtrag ${nummer} – ${bezeichnung}`,
  beauftragen: {
    keinAngebot: (auftragnehmer: string | null) =>
      `Zu diesem Nachtrag liegt kein Angebot des Auftragnehmers${auftragnehmer === null ? '' : ` (${auftragnehmer})`} vor. Das Angebot entsteht wie jedes andere: X84 oder Excel einlesen, Bieter = Auftragnehmer.`,
    schonUebernommen:
      'Der Nachtrag ist schon übernommen: Seine Positionen stehen bereits im Auftrags-LV. Rückgängig nimmt eine Übernahme zurück.',
    zuTief: 'Unter der Gliederung „Nachtrag“ hätte das Auftrags-LV mehr als 5 Gliederungsebenen (F1).',
    andereMwst:
      'Der MwSt-Satz des Nachtrags-LV ist nicht der des Auftrags-LV; so lässt er sich nicht übernehmen.',
    keinNachtrag: 'Das LV ist kein Nachtrags-LV.',
  },
  status: {
    angemeldet: 'angemeldet',
    angeboten: 'angeboten',
    beauftragt: 'beauftragt',
    abgelehnt: 'abgelehnt',
  },
  kennzeichen: (nummer: string) => `Nachtrag ${nummer}`,
  anlegen: {
    knopf: 'Nachtrag anlegen',
    titel: 'Nachtrag anlegen',
    einleitung:
      'Es entsteht ein leeres Nachtrags-LV mit der nächsten freien Nummer (Status „angemeldet“), dem MwSt-Satz des Auftrags-LV und dessen OZ-Maske ohne die oberste Stufe; die belegt bei der Beauftragung die Gliederung „Nachtrag <Nummer>“.',
    maskeOhneGliederung:
      'Die OZ-Maske des Auftrags-LV hat keine Gliederungsstufe. Das Nachtrags-LV bekommt sie unverändert; die Gliederung „Nachtrag <Nummer>“ passt bei der Beauftragung nicht zur Maske und erscheint als Befund der Prüfung.',
    bezeichnung: 'Bezeichnung',
    hinweis: 'Der Name des LV wird „Nachtrag <Nummer> – <Bezeichnung>“.',
    abbrechen: 'Abbrechen',
    anlegen: 'Anlegen',
    angelegt: (nummer: string) => `Nachtrag ${nummer} angelegt`,
  },
  band: {
    beschriftung: 'Nachtrag',
    titel: (nummer: string) => `Nachtrag ${nummer}`,
    zu: 'zu',
    ohneAuftrag: 'einem Auftrags-LV',
    status: 'Status',
    beauftragtNur: 'beauftragt (nur über „Beauftragen“)',
    beauftragen: 'Beauftragen',
    istBeauftragt: 'Der Nachtrag ist beauftragt und steht im Auftrags-LV; Rückgängig nimmt das zurück.',
    istAbgelehnt: 'Der Nachtrag ist abgelehnt. Zum Beauftragen erst den Status ändern.',
  },
  liste: {
    titel: 'Nachträge',
    tabelle: 'Nachträge des Auftrags-LV',
    leer: 'Noch kein Nachtrag.',
    nummer: 'Nummer',
    bezeichnung: 'Bezeichnung',
    status: 'Status',
    angebot: 'Angebot netto',
    aktion: 'Aktion',
    ohneAngebot: 'kein Angebot',
    befunde: 'Hinweise zu den Nachträgen',
    beauftragenFuer: (nummer: string) => `Beauftragen: Nachtrag ${nummer}`,
  },
  dialog: {
    titel: (nummer: string) => `Nachtrag ${nummer} beauftragen`,
    einleitung:
      'Die Positionen des Nachtrags kommen mit den Preisen des Auftragnehmers als eigene Gliederung „Nachtrag <Nummer>“ ins Auftrags-LV; danach ist der Status „beauftragt“.',
    laden: 'Vorschau wird berechnet …',
    positionen: 'Positionen',
    angebot: 'Summe des Angebots (netto)',
    vorher: 'Auftragssumme netto nach Nachlass bisher',
    nachher: 'Auftragssumme netto nach Nachlass danach',
    warnungen: 'Hinweise zur Übernahme',
    undo: 'Rückgängig nimmt die Beauftragung wieder zurück.',
    abbrechen: 'Abbrechen',
    bestaetigen: 'Beauftragen',
    beauftragt: (nummer: string) => `Nachtrag ${nummer} beauftragt`,
    nicht: 'Nachtrag nicht beauftragt',
    teilweise:
      'Die Positionen stehen im Auftrags-LV, der Status „beauftragt“ ist nicht gesetzt (Hinweis in der Nachtragsliste).',
  },
  befund: {
    nichtUebernommen: (nummer: string, n: number) =>
      `Nachtrag ${nummer}: beauftragt, aber ${positionen(n)} ${n === 1 ? 'fehlt' : 'fehlen'} im Auftrags-LV.`,
    nichtBeauftragt: (nummer: string, n: number, status: string) =>
      `Nachtrag ${nummer}: ${positionen(n)} ${n === 1 ? 'steht' : 'stehen'} im Auftrags-LV, der Status ist aber „${status}“.`,
  },
  warnung: {
    hinweistext: 'Hinweistext',
    mehrereAngebote: (n: number) =>
      `Der Auftragnehmer hat ${String(n)} Angebote zu diesem Nachtrag abgegeben; übernommen werden die Preise des zuletzt eingelesenen.`,
    nachlassIgnoriert:
      'Der Nachlass des Nachtragsangebots gilt nicht; das Auftrags-LV behält seinen Nachlass.',
    alternativenEntfallen: (welche: readonly string[]) =>
      `Wahl-Alternativen kommen nicht ins Auftrags-LV (${positionen(welche.length)}): ${liste(welche)}.`,
    losWirdTitel: (p: string) => `${p}: Das Los des Nachtrags steht im Auftrags-LV als Titel.`,
    nichtAngeboten: (p: string) =>
      `${p}: vom Auftragnehmer nicht angeboten; die Position steht ohne Einheitspreis im Auftrags-LV.`,
    satzFehlt: (p: string) => `${p}: Zuschlagsposition ohne Satz des Auftragnehmers; der Satz bleibt leer.`,
    bezugEntfernt: (p: string, ziel: string) =>
      `${p}: Der Bezug auf ${ziel} entfällt, weil ${ziel} nicht ins Auftrags-LV kommt.`,
    maskeZuTief: (tiefe: number, stufen: number) =>
      `Der Nachtrag braucht samt der Gliederung „Nachtrag“ ${String(tiefe)} Gliederungsstufen, die OZ-Maske des Auftrags-LV hat ${String(stufen)}; seine Ordnungszahlen liegen zu tief.`,
    ozUnpassend: (welche: readonly string[]) =>
      `Ordnungszahl passt nicht zur Maske des Auftrags-LV (übernommen wie sie ist): ${liste(welche)}.`,
  },
} as const;
