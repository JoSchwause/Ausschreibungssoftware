# 23: Amtliche und fremde Testdateien einbinden (F3b)

Status: ready-for-agent
Type: task
Welle: 0/1 · Strang: F · Paket: `fixtures/extern/`
Blocked by: 03
Regeln: C1, C4, G-55, G-12, ADR 0010

## What to build

Dateien Dritter nach Entscheidung **G-55** ins Repo holen, **je Datei mit Herkunft** und REUSE-Eintrag:

1. **Amtlich, unverändert:** BVBS-Prüfdateien GAEB DA XML 3.3 (AVA: X81, X84, X86; Bauausführung: X83, X84;
   Mengenermittlung: X31, X86; Texterstellung: X81, X82) und die GAEB-Musterdateien 3.1. Quellen:
   `https://www.bvbs.de/en/zertifizierungen/` und `https://www.gaeb.de/de/service/downloads/gaeb-datenaustausch/`.
2. **Freie Projekte, nur bei AGPL-3.0-or-later-kompatibler Lizenz (MIT, Apache-2.0, AGPL-3.0):** Fehlerdateien
   (zehn Mini-X83) und synthetische X83/X84/X86/X89 aus den in `okf/research/standards/test-data-sources.md`
   genannten Repos, einzeln ausgewählt. Lizenztext und Urheberzeile je Quelle in `fixtures/extern/LICENSES/`.
3. **Nicht aufnehmen:** Dateien ohne Lizenz (z. B. Sammlungen echter LVs), STLB-Bau- und DIN-Katalogtexte,
   das offizielle XSD (ADR 0010: nur CI, nie committet).

`fixtures/extern/HERKUNFT.md`: je Datei Quelle (URL), Abrufdatum, Lizenz, „unverändert“ (ja/nein), Prüfsumme.
Das erlaubt, eine Datei auf Anfrage schnell zu entfernen. Dokumentierte Risiken (G-55): BVBS/GAEB nennen keine
Lizenz; Anfrage bei BVBS (service@bvbs.de) ist ein Kann, kein Blocker.

## Acceptance criteria

- [ ] Alle Dateien liegen unter `fixtures/extern/` mit REUSE-Eintrag und stehen in `HERKUNFT.md` (URL, Datum, Lizenz, Prüfsumme)
- [ ] Amtliche Dateien sind byte-identisch zur Quelle (Prüfsumme belegt)
- [ ] Kein XSD und keine Datei ohne Lizenz im Baum; CI-Test prüft, dass `HERKUNFT.md` jede Datei unter `fixtures/extern/` nennt
- [ ] `fixtures/extern/README.md` erklärt in fünf Zeilen, wie man eine Datei entfernt
- [ ] Eine kurze Liste der Dateien mit Phase, Version (3.1, 3.2, 3.3) und Zweck (positiv, Fehlerfall, groß)

## Nicht-Ziele

Parsen, Auswertung, Sollwerte (kommen mit G1/G2 und den Prüfkriterien der BVBS).
