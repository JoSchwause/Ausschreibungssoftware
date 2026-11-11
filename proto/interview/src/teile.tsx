// Wegwerfcode. Gemeinsame Bausteine der Ansichten.
import { useEffect, useState } from 'react';
import { formatiereProzentDe, parseProzentDe } from '@tethys/dezimal';
import type { Betrag, Knoten, LvAnsicht, LvZeile, Position, Prozent, Titel, WurzelId } from '@tethys/vertrag';
import type { Summen } from './rechnen';
import { euro } from './rechnen';
import { useStore } from './store';

export const oz = (k: Knoten): string =>
  k.art === 'position' ? `${k.ordnungszahl ?? ''}${k.ozIndex ?? ''}` : k.art === 'titel' ? (k.ordnungszahl ?? '') : '';

export const istPosition = (k: Knoten): k is Position => k.art === 'position';
export const istTitel = (k: Knoten): k is Titel => k.art === 'titel';

/** Sichtbarer, flacher Baum fuer das Grid. */
export function baueAnsicht(
  knoten: readonly Knoten[],
  lvId: string,
  offen: ReadonlySet<string>,
  gp: ReadonlyMap<string, Betrag | null>,
  titel: ReadonlyMap<string, Betrag>,
  gesamt: Summen,
): LvAnsicht {
  const kinder = new Map<string, Knoten[]>();
  for (const k of knoten) {
    const l = kinder.get(k.elternId) ?? [];
    l.push(k);
    kinder.set(k.elternId, l);
  }
  const zeilen: LvZeile[] = [];
  const besuche = (eltern: string, tiefe: number): void => {
    for (const k of kinder.get(eltern) ?? []) {
      const unter = k.art === 'titel' || k.art === 'los' ? (kinder.get(k.id) ?? []) : [];
      const auf = offen.has(k.id);
      zeilen.push({
        knoten: k,
        tiefe,
        hatUnterknoten: unter.length > 0,
        aufgeklappt: auf,
        summe: k.art === 'position' ? (gp.get(k.id) ?? null) : k.art === 'hinweis' ? null : (titel.get(k.id) ?? null),
        gehtInSummeEin: k.art === 'position' ? true : null,
        befunde: [],
      });
      if (auf && unter.length > 0) besuche(k.id, tiefe + 1);
    }
  };
  besuche(lvId, 0);
  return { wurzelId: lvId as WurzelId, zeilen, gesamt };
}

/** Prozentfeld: uebernimmt jede gueltige Eingabe sofort, markiert ungueltige, sperrt nie (U5). */
export function Prozentfeld({
  label,
  wert,
  onWert,
  testid,
}: {
  label: string;
  wert: Prozent;
  onWert: (p: Prozent) => void;
  testid: string;
}) {
  const [text, setText] = useState(formatiereProzentDe(wert));
  const [fehler, setFehler] = useState(false);
  useEffect(() => {
    if (!fehler) setText(formatiereProzentDe(wert));
  }, [wert, fehler]);
  return (
    <label className="p-prozent">
      <span>{label}</span>
      <input
        className="tx-eingabe tx-eingabe--zahl"
        data-testid={testid}
        value={text}
        inputMode="decimal"
        aria-invalid={fehler || undefined}
        onChange={(e) => {
          setText(e.target.value);
          const r = parseProzentDe(e.target.value);
          setFehler(!r.ok);
          if (r.ok) onWert(r.wert);
        }}
        onBlur={() => setFehler(false)}
      />
      <span>%</span>
    </label>
  );
}

/** Nachlass und MwSt-Satz des LV (je ein Wert, N5 und G-28). */
export function Steuerfelder() {
  const s = useStore();
  return (
    <div className="p-steuer">
      <Prozentfeld label="Nachlass" wert={s.nachlass} onWert={s.setNachlass} testid="feld-nachlass" />
      <Prozentfeld label="MwSt-Satz" wert={s.mwst} onWert={s.setMwst} testid="feld-mwst" />
    </div>
  );
}

export function SummenBlock({ summen, titel = 'Summen' }: { summen: Summen; titel?: string }) {
  const zeilen: [string, string, Betrag][] = [
    ['netto', 'Netto', summen.netto],
    ['nachlass', 'Nachlass', summen.nachlass],
    ['nach', 'Netto nach Nachlass', summen.nettoNachNachlass],
    ['mwst', 'MwSt', summen.mwst],
    ['brutto', 'Brutto', summen.brutto],
  ];
  return (
    <dl className="p-summen" aria-label={titel}>
      {zeilen.map(([k, name, w]) => (
        <div key={k} className={k === 'brutto' ? 'p-summen__zeile p-summen__zeile--gross' : 'p-summen__zeile'}>
          <dt>{name}</dt>
          <dd data-summe={k}>{euro(w)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Seitenkopf({ titel, frage, children }: { titel: string; frage: string; children?: React.ReactNode }) {
  return (
    <header className="p-seitenkopf">
      <div>
        <h1>{titel}</h1>
        <p className="p-frage">{frage}</p>
      </div>
      {children ? <div className="p-seitenkopf__rechts">{children}</div> : null}
    </header>
  );
}
