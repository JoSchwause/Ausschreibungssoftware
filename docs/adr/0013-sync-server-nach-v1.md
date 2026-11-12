---
status: proposed
---
# Optionaler, selbst betriebener Sync-Server nach v1

Die PWA bleibt lokal und ohne Server voll nutzbar (ADR 0001, G-01). Ein Sync-Server ist frühestens nach v1 ein **optionaler Zusatz** für mehrere Nutzer eines Büros. Er wird selbst betrieben, nicht als Dienst angeboten. Ohne ihn verliert die App nichts.

Ein **Bieterportal gibt es nicht.** G-14 ist entschieden und bleibt bindend: Die Bieterseite läuft nur über X84 und den Excel-Rundlauf, es gibt keine zweite Installation für Bieter.

Status: Vorschlag. Der Mensch entscheidet über G-57 (Entscheidung D-55). Bis dahin ist nichts davon beschlossen und es entsteht kein Code.

## Kontext

ADR 0001 schließt in v1 Server, Anmeldung und Mandanten aus. G-01 hält fest: lokale Einzelnutzer-PWA, Mehrbenutzer mit Server ist das spätere Ziel, IDs und Befehle bleiben sync-fähig. Diese ADR hält fest, wie weit der Entwurf dafür heute trägt und was fehlt.

Was der Entwurf schon trägt:

- Stabile UUIDv7-Kennungen für jede Entität (A7).
- Befehle als reine Daten (A5).
- ChangeSets mit altem und neuem Stand (A6).
- Ein dauerhaftes Befehlsprotokoll mit dem Feld „wer“ (ADR 0009).

## Hindernisse heute

Diese Punkte blockieren einen Abgleich. Sie sind keine Randnotizen.

- **Das Protokoll lässt sich nicht nachspielen.** Massenbefehle stehen nur als Kopf und Prüfsumme im Protokoll (E-13, ADR 0009). Wer das Protokoll abspielt, bekommt den Zustand nach einem GAEB-Import nicht zurück.
- **ChangeSets tragen ganze Aggregate** (D-36 (8)). Für das Zusammenführen ist das zu grob: Zwei Nutzer, die zwei Positionen desselben Aggregats ändern, überschreiben sich gegenseitig.
- **Ein Tab je Datenbank** (E-14). Die App meldet im zweiten Tab, dass die Datenbank belegt ist. Ein Abgleich im Hintergrund braucht eine saubere Rolle für genau einen Schreiber.
- **Große Modelldateien** (D-51). IFC-Bytes liegen in einer eigenen Tabelle außerhalb von Aggregat, ChangeSet und Undo-Historie und können Hunderte MB groß sein. Sie dürfen nicht in jeden Abgleich laufen.

## Betrachtete Optionen

- **(a) Server als führende Datenquelle.** Verworfen: widerspricht ADR 0001 und der Local-First-Entscheidung. Der Tabellenzustand im Browser bleibt die Quelle der Wahrheit (ADR 0009).
- **(b) Abgleich über Dateien zwischen zwei Installationen.** Kein Betrieb, aber Mehrbenutzer durch die Hintertür: Es braucht dieselben Zusammenführungsregeln wie (c), ohne dass jemand die Konflikte begleitet.
- **(c) Optionaler Sync-Server mit ChangeSet-Abgleich.** Der Server nimmt ChangeSets entgegen und verteilt sie. Lokal bleibt alles führend und voll nutzbar; der Server ist abschaltbar.

## Entscheidungsvorschlag

Option (c), erst nach v1 und nur, wenn G-57 mit „ja“ beantwortet wird. Option (a) entfällt. Option (b) bleibt als kleinere Stufe denkbar, braucht aber dieselben Vorarbeiten.

## Nötige Vorarbeiten

Vor einem ersten Sync-Ticket braucht es eigene, einzeln entschiedene Tickets:

- Das Protokoll wird nachspielbar. Massenbefehle brauchen den vollständigen Inhalt oder einen gleichwertigen Weg, den Zustand herzustellen (Änderung an E-13).
- Der Abgleich läuft je Aggregat oder feiner. Die ChangeSets müssen für Zusammenführen taugen (Änderung an D-36 (8)).
- Es gibt Konfliktregeln. Konflikte werden gemeldet und nie still aufgelöst (Q5).
- Die Identität des Nutzers steht im Protokolleintrag. Das Feld „wer“ ist vorgehalten (ADR 0009), aber heute immer derselbe Nutzer.
- Modelldateien (D-51) werden getrennt und nur auf Anforderung übertragen.
- Die Rolle „ein Schreiber je Datenbank“ aus E-14 bleibt erhalten.

## Consequences

- ADR 0001 und G-01 bleiben unverändert in Kraft. v1 enthält keinen Server und keinen Sync-Code.
- G-14 bleibt bindend: kein Bieterportal.
- Die Hindernisse oben ändern sich nur durch eigene Entscheidungen, nicht nebenbei.
- Frage G-57 in `.scratch/ava-oss/grilling.md` hält fest, ob und in welcher Form der Mensch einen Sync-Server will.
