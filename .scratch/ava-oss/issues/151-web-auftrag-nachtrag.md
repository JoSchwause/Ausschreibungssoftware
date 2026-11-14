# 151: App: Auftrags-LV (Langtext, Excel) und geführter Nachtrag

Status: claimed
Type: task
Welle: 7 · Strang: A1, E9 · Paket/Ordner: `apps/web/src/auftrag/`, `nachtrag/`
Blocked by: 142
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U3, Q5
Herkunft: umfang §3 E9, B-17, B-18

## What to build

1. Auftrags-LV-Seite: **Positionsdialog nur lesen** (Langtext sichtbar), **Excel-Ausgabe** (bestehende LV-Excel-Ausgabe).
2. **Nachtrag geführt:** der Auftragnehmer ist als Bieter vorbelegt; nach dem Einlesen des Angebots schlägt die App den Status
   „angeboten“ vor; „Beauftragen“ ist der sichtbare nächste Schritt (Schrittanzeige oder hervorgehobene Schaltfläche).
3. `nachtrag.spec.ts` auf den geführten Weg umstellen (M4-Tor bleibt grün).

## Acceptance criteria

- [ ] E2E für 1–2; M4 grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/151-auftrag-nachtrag`):

- **D-151.1** Nähte? → `nachtragsfuehrung` (rein, `nachtrag/nachtrag.ts`), `auftragnehmerLaden` und
  `auftragnehmerAngebotAnlegen` (gegen echten In-Memory-Speicher, `nachtrag/speichern.test.ts`), `positionsangaben` und
  `auftragExcel` (`auftrag/position.test.ts`, `auftrag/ausgabe.test.ts`: Excel zurückgelesen trägt die EP des Auftrags-LV);
  E2E `nachtrag.spec.ts`. Keine Komponententests (wie die übrigen Seiten der App).
- **D-151.2** Wie wird der Nachtrag „geführt“, ohne fremde Ordner (`gaeb/`, `ausgabe/`, `lv/`) zu ändern (P2)? → Alles im
  Kopfband des Nachtrags-LV (`nachtrag/NachtragKopfband.tsx`, eingehängt von der LV-Seite): Schrittanzeige „Leistungen
  erfassen → Angebot des Auftragnehmers → Status „angeboten“ → Beauftragen“, der nächste Schritt mit `aria-current="step"`
  und ein Satz dazu; nur die Schaltfläche des nächsten Schritts ist hervorgehoben (auch „Beauftragen“, das vorher immer
  hervorgehoben war). Nichts sperrt: Statuswahl und „Beauftragen“ bleiben wie bisher (U5); M4 geht weiter den alten Weg.
- **D-151.3** „Auftragnehmer als Bieter vorbelegt“ → eigene Schaltfläche „Angebot des Auftragnehmers einlesen“ im Band (eine
  Datei, X84 oder Excel) mit denselben Lesern (`angebotLesen`, `excelAngebotLesen`) und eigener Vorschau. Das Feld „Bieter“
  zeigt den Auftragnehmer (Bieter des beauftragten Angebots, Name aus dem Projekt) und ist nicht änderbar: Ein anderer Name
  ergäbe einen neuen Bieter, dessen Angebot „Beauftragen“ nie nimmt. Angebote anderer Bieter gehen weiter über „Angebote“
  der Werkzeugleiste; nennt eine X84 einen anderen Bieter, sagt die Vorschau, dass das Angebot dem Auftragnehmer zugeordnet
  wird. Kein `BieterAnlegen`, ein Undo-Schritt (`AngebotAnlegen` über `weg.angebotAnlegen`).
- **D-151.4** Format am Inhalt erkannt (ZIP „PK“ = Excel, sonst GAEB-XML), nicht an der Endung.
- **D-151.5** „Vorschlag ‚angeboten‘“ → sobald ein Angebot des Auftragnehmers vorliegt (auch über „Angebote“ eingelesen) und
  der Status „angemeldet“ ist, zeigt das Band den Vorschlag und die Schaltfläche „Status „angeboten“ setzen“ (ein Befehl,
  ein Undo-Schritt); kein automatisches Setzen (der Status bleibt eine Entscheidung des Nutzers). Das Band lädt nach jedem
  Protokolleintrag zu Angebot, Projekt oder Auftrags-LV und nach Undo/Redo neu.
- **D-151.6** Positionsdialog des Auftrags-LV → eigener Dialog „nur lesen“ in `auftrag/` (der Positionsdialog der LV-Seite
  kennt keinen Lesemodus und liegt in `lv/`): OZ, Kurztext, Menge, Einheit, EP (bei Zuschlagsposition der Satz), GP aus den
  Summen des Kerns, Merkmale in Worten, Kostengruppe, Langtext im `LangtextEditor` mit `nurLesen`. Öffnen mit Strg+Enter,
  Doppelklick (außer in der Spalte KG, die bearbeitbar bleibt) und „Position anzeigen“ in der Werkzeugleiste.
- **D-151.7** Excel des Auftrags-LV → vorhandene `lvAlsExcel` mit `mitPreisen: true` (die Vertragspreise), Dateiname
  `<Name>-Auftrag.xlsx` (nicht mit dem Blankett `-Bieter.xlsx` zu verwechseln), im Menü „Ausgabe“ als „Excel“, Befunde vor
  dem Download wie bei „Excel für Bieter“.
- **D-151.8** Der Testpfad liest `typisch` ohne Langtexte; `nachtrag.spec.ts` setzt der ersten Position mit Langtext in der
  Fixture ihren Text als Absatz, bevor das LV angelegt wird (Summen unverändert).
- Text „kein Angebot des Auftragnehmers“ im Dialog „Beauftragen“ nennt jetzt den geführten Weg statt „Bieter = Auftragnehmer“.
