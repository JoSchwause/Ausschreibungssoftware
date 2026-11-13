# 133: Einheitliche Sprache und Sprachtest

Status: ready-for-agent
Type: task
Welle: 7 · Strang: E14 · Paket/Ordner: `apps/web/src/*/texte.ts`, `packages/ui-*/src/texte.ts`, `GLOSSARY.md`, neu `apps/web/src/sprache.test.ts`; Textstellen außerhalb von `texte.ts` nur, wo dort Nutzertext fest steht
Blocked by: –
Modell: sonnet
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: L1, L2, L4, L5; G-63
Herkunft: umfang §3 E14, B-27, B-28

## What to build

1. **Test zuerst:** `apps/web/src/sprache.test.ts` liest alle `texte.ts` (App und `packages/ui-*`) und schlägt fehl bei
   „du“-Formen (du, dich, dir, dein…, Imperativ mit „du“-Endung ist nicht prüfbar – nur Pronomen), bei den abgewählten
   Doppelbegriffen (Liste im Test, aus Punkt 2) und bei Ticketnummern/Paketnamen (L5: „Ticket“, „vertrag“ als Wort, `G4`, …).
2. **Ein Begriff je Sache** nach `GLOSSARY.md`; wo das Glossar zwei zulässt, hier entscheiden und dort eintragen (L2):
   Ordnungszahl/OZ (Vorschlag: Spaltenkopf „OZ“, Fließtext „Ordnungszahl“ – festlegen), MwSt/Umsatzsteuer, Menge/Vordersatz,
   „Projektdatei exportieren“/„Datensicherung“ → ein Name, einlesen/importieren → „einlesen“, „Projekt anlegen“/„Anlegen“/„Neue
   Rechnung“ → Verb mit Gegenstand.
3. **Anrede nach L4:** unpersönlich, wo nötig „Sie“; alle „du“-Texte (`kosten`, `bauzeit`, `honorar`) und „Sie“-Texte prüfen.
4. **Schaltflächen:** Verb mit Gegenstand, „…“ nur, wenn ein Dialog folgt; ein Trennzeichen in Seitentiteln; „€“ einheitlich
   (Regel im Glossar oder in `docs/regeln.md` unter L festhalten? Nur Glossar/Kommentar im Test; `docs/regeln.md` nicht ändern).
5. **IFC-Klassen** mit deutschem Namen und der Klasse in Klammern („Fundament (IfcFooting)“): Tabelle in `apps/web/src/bim/`
   Texten, nur Anzeige.
6. E2E-Specs, die geänderte Texte suchen, nachziehen.

Läuft parallel zu 131 und 132, die in `ui/`, `projekt/` und den Specs arbeiten: dort Texte ändern, Konflikte löst der Merger.

## Acceptance criteria

- [ ] Sprachtest grün und schlägt bei einem eingefügten „du“ fehl (Test des Tests)
- [ ] Glossar trägt jede Entscheidung aus Punkt 2; alle E2E grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
