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

- [x] Alle Dateien liegen unter `fixtures/extern/` mit REUSE-Eintrag und stehen in `HERKUNFT.md` (URL, Datum, Lizenz, Prüfsumme)
- [x] Amtliche Dateien sind byte-identisch zur Quelle (Prüfsumme belegt)
- [x] Kein XSD und keine Datei ohne Lizenz im Baum; CI-Test prüft, dass `HERKUNFT.md` jede Datei unter `fixtures/extern/` nennt
- [x] `fixtures/extern/README.md` erklärt in fünf Zeilen, wie man eine Datei entfernt
- [x] Eine kurze Liste der Dateien mit Phase, Version (3.1, 3.2, 3.3) und Zweck (positiv, Fehlerfall, groß)

## Nicht-Ziele

Parsen, Auswertung, Sollwerte (kommen mit G1/G2 und den Prüfkriterien der BVBS).

## Comments

### 2026-11-09 — Umsetzung (Teil 1 von 2: amtliche Dateien erledigt, freie Projekte offen)

**Erhalten (17 Dateien, 6,3 MB):** 9 BVBS-Prüfdateien 3.3 und 8 GAEB-Musterdateien 3.1, alle byte-identisch aus den
Quell-ZIPs, mit ZIP-URL, ZIP-SHA-256, Pfad im ZIP und Datei-SHA-256 in `fixtures/extern/HERKUNFT.md`. Quellseiten:
`https://www.bvbs.de/en/zertifizierungen/` und `https://www.gaeb.de/de/service/downloads/gaeb-datenaustausch/`. Beide
Seiten ließen sich ohne Anmeldung, Formular oder Bedingungen laden; sie nennen keine Lizenz (nur „© 2026“ im Seitenfuß
der GAEB-Seite). REUSE: eigene Kennung `LicenseRef-BVBS-GAEB-Pruefdatei` (Text
`LICENSES/LicenseRef-BVBS-GAEB-Pruefdatei.txt`), bewusst nicht AGPL. Das 3.1-Musterpaket gibt es in zwei ZIPs (2007,
2009-12) mit byte-gleichem Inhalt; übernommen ist nur 2009-12. Prüfkriterien- und Muster-PDFs sowie alle XSD (auch das
auf der GAEB-Seite liegende `2021-05_Leistungsverzeichnis.zip`, das nur XSD enthält) wurden nicht übernommen.
3.2-Prüfdateien (ebenfalls auf der BVBS-Seite) liegen nicht bei, weil das Ticket nur 3.3 und die Muster 3.1 nennt; sie
lassen sich bei Bedarf (Ticket G4) nachladen. Das letzte Akzeptanzkriterium ist damit für 3.1 und 3.3 erfüllt, 3.2 fehlt.

**Nicht erhalten: Dateien freier Projekte (Teil 2 der Zielbeschreibung, d. h. zehn Fehlerdateien und synthetische
X83/X84/X86/X89).** Über die Websuche wurden `frameiq/pygaeb` (laut PyPI MIT), `bambamboole/gaeb-php`,
`openbimrs/gaeb` und `meindonut/gaeb-parser` gefunden; ein Projekt „gaebboss“ fand sich nicht. Der Abruf des
Quellarchivs von `frameiq/pygaeb` über `codeload` antwortete mit HTTP 403 („GitHub access to this repository is not
enabled for this session“), das Anfordern des Zugriffs über `add_repo` wurde vom Berechtigungssystem abgelehnt. Das
habe ich nicht umgangen. Folge: keine LICENSE-Datei und keine Testdatei eines freien Projekts gelesen oder übernommen;
nichts davon steht im Baum. Ob eines dieser Projekte überhaupt zehn Fehlerdateien oder AGPL-kompatible synthetische
Dateien hat, ist ungeprüft. Es wurde nichts selbst verfasst (gehört in das Paket von Ticket 22). **Offen für Ticket 22:
die zehn Fehlerdateien fehlen.** Weiteres Vorgehen: Zugriff auf diese Repos für die Sitzung freigeben und dieses Ticket
fortsetzen, oder Ticket 22 verfasst die Fehlerdateien selbst.

**Für Ticket 22 (3.3, X81/X83):**

- `bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81` (614.035 Bytes, Namensraum `.../DA81/3.3`)
- `bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83` (101.515 Bytes, `.../DA83/3.3`); das ist die
  X83 „Bauausführung 3.3“. Der Dateiname im ZIP trägt kein Präfix „BVBS_“, die Prüfkriterien nennen ihn mit Präfix.
- `bvbs/3.3-texterstellung/Pruefdatei_3.3_Texterstellung_V-11-06-2021.x81` (kleine X81, Texterstellung)
- Weitere 3.3-Dateien (X82, X84, X86, X31) sind Phasen, die Ticket 22 nicht liest. Die 3.1-Muster (X81, X83) sind
  Version 3.1 (Namensraum `.../200407`), also für G4.
- Einige Dateien beginnen mit UTF-8-BOM (AVA X81/X86, Texterstellung); das gehört zur Originaldatei.

**Öffentlich genannte Prüfkriterien (nur gelesen, die PDFs liegen nicht im Repo):**

- `https://www.bvbs.de/wp-content/uploads/2024/05/Pruefkriterien-GAEB-DA-XML-3.3-Bauausfuehrung-V-04-04-2024.pdf`:
  Prüfvorgang 1.1 „Datei beinhaltet keine Preise“; 1.8 Menge mit 8 Vorkomma- und 3 Nachkommastellen (12.345.678,012)
  in Position 001.002.0030; Positionen 001.001.0010 (Normalposition, Bedarfsposition mit Index `.1` und `.A`),
  001.002.0010 (Grafik im Langtext), 001.002.0040 (Grundposition), 001.002.0050 (Alternativposition), 002.000.0000
  (Position „0000“ muss vorhanden sein), Zuschlagspositionen ab 002.001.0030; 2.4 Gesamtbetrag der X84 2.000.000,00
  Euro ohne MwSt. **Eine Gesamtzahl der Positionen oder eine OZ-Maske nennt das Dokument nicht**, nur „die OZ-Maske
  darf im Export nicht verändert werden“. Das Akzeptanzkriterium „Positionszahl und OZ-Maske stimmen mit den
  BVBS-Angaben überein“ von Ticket 22 hat damit keine öffentliche Zahl als Quelle; Ticket 22 muss die Werte aus der
  Datei ableiten oder das Kriterium ändern.
- `https://www.bvbs.de/wp-content/uploads/2024/02/BVBS_Pruefkriterien-GAEB-DA-XML-3.3-AVA-V-11-06-2021.pdf`:
  Gesamtbetrag der AVA-X86 Euro 1.421.003.968,15 (Prüfvorgang 4.2, mit Bedarfspositionen mit GB als „auszuführend“);
  Position 2.1.1.10 hat einen EP mit 3 Nachkommastellen (4.12); Positionen u. a. 1.10.11.10 (StL-Nr.), 1.10.15.10
  (Leitbeschreibung), 1.10.16.10 (Ausführungsbeschreibung), 1.10.20.10 bis .12 (Bezüge), 1.10.25.10 bis 30
  (EP-Aufgliederung), 1.30.20.40/.50/.70 und 1.30.30.30/.40 (Zuschlagspositionen). Keine Positionszahl.
- Eigene Zählung (keine amtliche Angabe): `<Item `-Elemente in der Bauausführungs-X83: 27; in der AVA-X81: 68.

**Prüfung:** `tools/herkunft.test.mjs` (Vitest, über `pnpm test`) schlägt fehl bei einer Datei ohne Eintrag, einer
falschen Prüfsumme, einem Eintrag ohne Datei oder einer `.xsd` im Ordner oder unter den versionierten Dateien.
`fixtures/extern/.gitattributes` setzt `-text`, damit die Zeilenenden der Originale erhalten bleiben.
