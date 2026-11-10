// Unabhaengige Handrechnung zum Prototyp (nur BigInt, keine Bibliothek, kein Code aus der App).
// Sie schreibt daten/erwartet.json; pruefung/pruefen.mjs vergleicht die Bildschirmwerte damit.
// Regeln: GP = kaufmaennisch gerundet(Menge x EP, 2); Titelsumme und Netto = Summe der gerundeten GP;
// Nachlass = kaufmaennisch gerundet(Netto x p / 100, 2), dann abgezogen; MwSt einmal auf Netto nach Nachlass.
// Mittel = arithmetisches Mittel der GP der Bieter, die die Position angeboten haben (mind. 3 Werte),
// Ausreisser: Abweichung vom Mittel strikt groesser als 20 % (Annahme A7 der Fixtures).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const hier = (p) => fileURLToPath(new URL(p, import.meta.url));
const lv = JSON.parse(readFileSync(hier('../src/daten/lv.json'), 'utf8'));
const ang = JSON.parse(readFileSync(hier('../src/daten/angebote.json'), 'utf8'));

const ganz = (s) => BigInt(s.replace('.', '')); // "12.350" -> 12350n
const halbHoch = (zaehler, nenner) => (2n * zaehler + nenner) / (2n * nenner); // nur fuer Werte >= 0
const cent = (c) => {
  const s = c.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
};
const gp = (menge, ep) => halbHoch(ganz(menge) * ganz(ep), 10n ** 4n); // 3 + 3 Stellen -> 2 Stellen

const pos = lv.knoten.filter((k) => k.art === 'position');
const titel = lv.knoten.filter((k) => k.art === 'titel');
const mwstProzent = ganz(lv.mwstSatz); // 19.00 -> 1900

function summen(gpJePosition, nachlassProzent) {
  let netto = 0n;
  for (const p of pos) netto += gpJePosition.get(p.id) ?? 0n;
  const nachlass = nachlassProzent === null ? 0n : halbHoch(netto * ganz(nachlassProzent), 10000n);
  const nach = netto - nachlass;
  const mwst = halbHoch(nach * mwstProzent, 10000n);
  return { netto, nachlass, nach, mwst, brutto: nach + mwst };
}
function titelsummen(gpJePosition) {
  const out = {};
  for (const t of titel) {
    let s = 0n;
    for (const p of pos.filter((q) => q.parentId === t.id)) s += gpJePosition.get(p.id) ?? 0n;
    out[t.ordnungszahl] = s;
  }
  return out;
}
const txt = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, cent(v)]));

// LV (Schaetzpreise)
const lvGp = new Map(pos.map((p) => [p.id, gp(p.menge, p.einheitspreis)]));
const lvS = summen(lvGp, lv.nachlass?.wert ?? null);

// Angebote: Menge aus dem LV, EP aus dem Angebot; "nicht-angeboten" hat keinen GP (nicht 0,00)
const bieter = ang.angebote.map((a, i) => {
  const jePos = new Map();
  for (const e of a.positionen) {
    if (e.status === 'angeboten') {
      const p = pos.find((q) => q.id === e.positionId);
      jePos.set(e.positionId, gp(p.menge, e.einheitspreis));
    }
  }
  return { name: ang.bieter[i].name, nachlass: a.nachlass?.wert ?? null, jePos };
});
const angebote = bieter.map((b) => ({
  name: b.name,
  nachlassProzent: b.nachlass,
  nichtAngeboten: pos.filter((p) => !b.jePos.has(p.id)).map((p) => p.ordnungszahl + (p.ozIndex ?? '')),
  summen: txt(summen(b.jePos, b.nachlass)),
  titel: txt(titelsummen(b.jePos)),
}));

// Rangfolge nach Netto nach Nachlass
const rang = bieter
  .map((b, i) => ({ name: b.name, nach: summen(b.jePos, b.nachlass).nach }))
  .sort((x, y) => (x.nach < y.nach ? -1 : x.nach > y.nach ? 1 : 0))
  .map((r, i) => ({ rang: i + 1, name: r.name, nettoNachNachlass: cent(r.nach) }));

// Preisspiegel je Position
const spiegel = pos.map((p) => {
  const werte = bieter.map((b) => b.jePos.get(p.id) ?? null);
  const da = werte.filter((w) => w !== null);
  const n = BigInt(da.length);
  const sum = da.reduce((a, b) => a + b, 0n);
  const min = da.reduce((a, b) => (b < a ? b : a));
  const max = da.reduce((a, b) => (b > a ? b : a));
  const mittel = halbHoch(sum, n);
  const ausreisser =
    da.length >= 3 && sum > 0n
      ? werte.map((w) => {
          if (w === null) return false;
          const d = w * n - sum;
          return (d < 0n ? -d : d) * 5n > sum; // |w - sum/n| / (sum/n) > 20 %
        })
      : werte.map(() => false);
  return {
    oz: p.ordnungszahl + (p.ozIndex ?? ''),
    kurztext: p.kurztext,
    min: cent(min),
    mittel: cent(mittel),
    max: cent(max),
    schaetzpreis: cent(lvGp.get(p.id)),
    werte: werte.map((w) => (w === null ? null : cent(w))),
    ausreisser,
  };
});

// Summen der virtuellen Bieter ueber die drei Bieter
const nettos = bieter.map((b) => summen(b.jePos, b.nachlass));
const virtuell = (feld) => {
  const w = nettos.map((s) => s[feld]);
  const sum = w.reduce((a, b) => a + b, 0n);
  return {
    min: cent(w.reduce((a, b) => (b < a ? b : a))),
    mittel: cent(halbHoch(sum, BigInt(w.length))),
    max: cent(w.reduce((a, b) => (b > a ? b : a))),
  };
};

const erwartet = {
  lv: { summen: txt(lvS), titel: txt(titelsummen(lvGp)) },
  angebote,
  rangfolge: rang,
  virtuelleBieter: { netto: virtuell('netto'), nettoNachNachlass: virtuell('nach') },
  preisspiegel: spiegel,
  ausreisser: spiegel.flatMap((z) => z.ausreisser.map((a, i) => (a ? `${z.oz} ${angebote[i].name}` : null)).filter(Boolean)),
};
writeFileSync(hier('erwartet.json'), JSON.stringify(erwartet, null, 1) + '\n');
console.log(JSON.stringify({ lv: erwartet.lv, angebote: erwartet.angebote, rangfolge: erwartet.rangfolge, virtuelleBieter: erwartet.virtuelleBieter, ausreisser: erwartet.ausreisser }, null, 1));
