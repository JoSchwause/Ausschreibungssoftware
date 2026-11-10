// Wegwerfcode (Prototyp Nutzerinterview): kopiert die Fixtures `typisch` und `typisch-angebote` in den
// Prototyp-Ordner und macht aus allen Positionen Normalpositionen (Bedarf, Wahl, Zuschlag gibt es im Prototyp
// nicht). `fixtures/` wird nur gelesen, nie geaendert. Aufruf: node proto/interview/daten/erzeugen.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const hier = (p) => fileURLToPath(new URL(p, import.meta.url));
const lv = JSON.parse(readFileSync(hier('../../../fixtures/typisch.json'), 'utf8'));
const angebote = JSON.parse(readFileSync(hier('../../../fixtures/typisch-angebote.json'), 'utf8'));

const umbenennen = { 'Zuschlag Frosteinbau': 'Frostschutz beim Einbau' };

const knoten = lv.knoten.map((k) => {
  if (k.art !== 'position') return k;
  const { bedarfMitGesamtbetrag, bezugspositionId, grundpositionId, ...rest } = k;
  return { ...rest, positionsart: 'normal', kurztext: umbenennen[k.kurztext] ?? k.kurztext };
});

writeFileSync(
  hier('../src/daten/lv.json'),
  JSON.stringify(
    {
      id: lv.id,
      name: 'Rohbau und Ausbau (erfunden)',
      mwstSatz: lv.mwstSatz,
      nachlass: lv.nachlass,
      knoten,
    },
    null,
    1,
  ) + '\n',
);

writeFileSync(
  hier('../src/daten/angebote.json'),
  JSON.stringify(
    {
      bieter: angebote.bieter,
      angebote: angebote.angebote.map((a) => ({
        id: a.id,
        bieterId: a.bieterId,
        nachlass: a.nachlass,
        positionen: a.positionen,
      })),
    },
    null,
    1,
  ) + '\n',
);
console.log('geschrieben: src/daten/lv.json, src/daten/angebote.json');
