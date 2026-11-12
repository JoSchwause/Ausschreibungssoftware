// SPDX-License-Identifier: AGPL-3.0-or-later
// Das schreibgeschützte Vergleichsgrid (Ticket 60), z. B. für den Preisspiegel: freie Spalten mit Gruppenköpfen,
// fixierte linke Spalten, Kennzeichen je Zelle, Summenzeilen am Ende. Es steht auf demselben Kern wie `LvGrid`
// (`gridKern.ts`: aktive Zelle, Virtualisierung, Fokus, Sprung; `navigation.ts`; `Baumeinzug`), keine zweite
// Grid-Implementierung (U2). Vollständig gesteuert; es rechnet und formatiert nie (N1, A5). Flüchtiger Bedienzustand:
// aktive Zelle, Zellauswahl und eine Statusmeldung.

import { useTable } from '@tanstack/react-table';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { Zeitkopf, balkenspaltenbild } from './Balkenspalte';
import { NAVIGATIONSTASTEN, klappAbsicht, useGridKern, useSichtbareSpalten, useSprung } from './gridKern';
import { tabZiel, zielZelle } from './navigation';
import type { Zelle } from './navigation';
import { features, vergleichsSpaltenDefinitionen } from './tabelle';
import { meldungZellenKopiert, texte } from './texte';
import {
  bereichAlsTsv,
  festeZellklassen,
  fixierteVersaetze,
  normiereBereich,
  spaltenbreite,
} from './vergleich';
import type { Bereich } from './vergleich';
import type {
  VergleichsGridProps,
  VergleichsSummenzeile,
  VergleichsZeile,
  VergleichsZellort,
} from './vergleichTypen';
import { Vergleichszeile } from './Vergleichszeile';

const KEINE_SUMMEN: readonly VergleichsSummenzeile[] = [];
const KEINE_DATEN: readonly VergleichsZeile[] = [];
/** Zeile ohne Unterknoten, für das Klappen per Tastatur in einer Summenzeile (dort ändert es nichts). */
const OHNE_BAUM = { hatUnterknoten: false, aufgeklappt: false };

/** Zellauswahl über Kennungen: Sie bleibt an ihren Zellen, wenn Zeilen dazukommen oder wegfallen. */
interface Auswahl {
  readonly anker: VergleichsZellort;
  readonly ende: VergleichsZellort;
}

export function VergleichsGrid(props: VergleichsGridProps): ReactElement {
  const { spalten, zeilen, onAufklappen, onZeileAktiv, onZelleAktiv, sprungziel, kennzeichenTexte } = props;
  const summen = props.summen ?? KEINE_SUMMEN;
  const zh = props.zeilenhoehe ?? 28;
  const spaltenIds = useMemo(() => spalten.map((s) => s.id), [spalten]);
  const baumspalte = props.baumspalte ?? spaltenIds[0];
  // Balkenspalten (Ticket 96): Achse, Kopfabschnitte und Raster einmal je Spalte, an alle Zeilen gereicht.
  const achsen = useMemo(
    () => spalten.map((s) => (s.zeitleiste ? balkenspaltenbild(s.zeitleiste) : null)),
    [spalten],
  );
  const kopfId = useId();

  // --- TanStack Table: Spalten- und Kopfmodell (Gruppen); die Zeilen rendert das Grid selbst -------------------
  const columns = useMemo(() => vergleichsSpaltenDefinitionen(spalten), [spalten]);
  const table = useTable({ features, columns, data: KEINE_DATEN, getRowId: (z) => z.id }, () => ({}));
  const kopfgruppen = table.getHeaderGroups();
  // Kopfzeilen für den Screenreader: die von TanStack (Gruppen). Sichtbar ist der Kopf mit einer Zeitleiste immer
  // zweizeilig; die Spaltenköpfe reichen dann bis unten.
  const ariaKopfzeilen = Math.max(1, kopfgruppen.length);
  const kopfzeilen = achsen.some((a) => a !== null) ? 2 : ariaKopfzeilen;

  const vorlage = useMemo(
    () => spalten.map((s) => `${String(spaltenbreite(s))}px`).join(' '),
    [spalten],
  );
  const mindestbreite = useMemo(
    () => spalten.reduce((summe, s) => summe + spaltenbreite(s), 0),
    [spalten],
  );
  const fixiert = Math.min(props.fixierteSpalten ?? 0, spalten.length);
  const versaetze = useMemo(() => fixierteVersaetze(spalten, fixiert), [spalten, fixiert]);
  const zellklassen = useMemo(() => festeZellklassen(spalten, versaetze), [spalten, versaetze]);

  // --- gemeinsamer Kern: aktive Zelle, Virtualisierung, Fokus (U2) -----------------------------------------
  const zeilenIds = useMemo(() => [...zeilen.map((z) => z.id), ...summen.map((s) => s.id)], [zeilen, summen]);
  const kern = useGridKern({
    zeilenIds,
    koerper: zeilen.length,
    spalten: spaltenIds,
    zeilenhoehe: zh,
    kopfhoehe: kopfzeilen * zh,
    fusshoehe: summen.length * zh,
    fixierteSpalten: fixiert,
    onAktiveZeileChange: onZeileAktiv,
  });
  const {
    wurzel,
    scroller,
    virtualizer,
    indexVonId,
    aktiv,
    aktivIndex,
    aktivSpalte,
    aktiveId,
    raster,
    zelleVon,
  } = kern;

  const [auswahlZustand, setAuswahl] = useState<Auswahl | null>(null);
  const [status, setStatus] = useState('');

  // Die Auswahl gilt nur, solange ihre beiden Ecken in der Ansicht stehen.
  const ecke = (o: VergleichsZellort): Zelle | null => {
    const zeile = indexVonId.get(o.zeilenId);
    const spalte = spaltenIds.indexOf(o.spalte);
    return zeile === undefined || spalte < 0 ? null : { zeile, spalte };
  };
  const auswahlEcken = auswahlZustand
    ? ([ecke(auswahlZustand.anker), ecke(auswahlZustand.ende)] as const)
    : null;
  const auswahl: Bereich | null =
    auswahlEcken?.[0] && auswahlEcken[1] ? normiereBereich(auswahlEcken[0], auswahlEcken[1]) : null;

  // Aktive Zelle melden, sobald sie sich ändert (Zeile oder Spalte).
  const gemeldeteZelle = useRef<string | undefined>(undefined);
  useEffect(() => {
    const ort =
      aktiveId !== undefined && aktivSpalte !== undefined
        ? { zeilenId: aktiveId, spalte: aktivSpalte }
        : null;
    const schluessel = ort ? `${ort.zeilenId}\u0000${ort.spalte}` : '';
    if (!onZelleAktiv || gemeldeteZelle.current === schluessel) return;
    gemeldeteZelle.current = schluessel;
    onZelleAktiv(ort);
  });

  // --- Aktivieren, Auswahl ------------------------------------------------------------------------------------
  const ort = (z: Zelle): VergleichsZellort | null => {
    const zeilenId = zeilenIds[z.zeile];
    const spalte = spaltenIds[z.spalte];
    return zeilenId === undefined || spalte === undefined ? null : { zeilenId, spalte };
  };
  const aktivOrt = (): VergleichsZellort | null =>
    aktiveId !== undefined && aktivSpalte !== undefined ? { zeilenId: aktiveId, spalte: aktivSpalte } : null;

  /** Bewegt die aktive Zelle; mit `erweitern` zieht sie die Auswahl vom Anker (sonst der bisherigen Zelle) auf. */
  const aktiviere = (ziel: Zelle, erweitern: boolean, mitFokus: boolean): void => {
    const nach = ort(ziel);
    if (!nach) return;
    if (erweitern) {
      const anker = auswahl && auswahlZustand ? auswahlZustand.anker : aktivOrt();
      setAuswahl(anker ? { anker, ende: nach } : null);
    } else {
      setAuswahl(null);
    }
    kern.zeigeZelle(ziel, mitFokus);
  };

  useSprung(
    sprungziel && { zeilenId: sprungziel.zeilenId, spalte: sprungziel.spalte, nr: sprungziel.nr },
    kern,
    spaltenIds,
    (ziel) => {
      aktiviere(ziel, false, true);
    },
  );

  const waehleAlles = (): void => {
    const anker = ort({ zeile: 0, spalte: 0 });
    const ende = ort({ zeile: zeilenIds.length - 1, spalte: spaltenIds.length - 1 });
    if (anker && ende) setAuswahl({ anker, ende });
  };

  const kopiere = (): void => {
    const bereich: Bereich | null =
      auswahl ??
      (aktivIndex >= 0
        ? normiereBereich(
            { zeile: aktivIndex, spalte: kern.aktivSpaltenIndex },
            { zeile: aktivIndex, spalte: kern.aktivSpaltenIndex },
          )
        : null);
    if (!bereich) return;
    const text = bereichAlsTsv([...zeilen, ...summen], spalten, bereich);
    setStatus(
      meldungZellenKopiert(
        bereich.zeilen[1] - bereich.zeilen[0] + 1,
        bereich.spalten[1] - bereich.spalten[0] + 1,
      ),
    );
    navigator.clipboard.writeText(text).catch(() => {
      setStatus(texte.zwischenablageGesperrt);
    });
  };

  const klappe = (zi: number, auf: boolean): void => {
    const z = zeilen[zi];
    if (z?.hatUnterknoten && z.aufgeklappt !== auf) onAufklappen?.(z.id, auf);
  };

  // --- Ereignisse (Delegation am Wurzelelement) ------------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const zelle = zelleVon(e.target);
    if (!zelle) return;
    const { zi, si, spalte } = zelle;
    const strg = e.ctrlKey || e.metaKey;
    const von: Zelle = { zeile: zi, spalte: si };

    const klappen = klappAbsicht(e, zeilen[zi] ?? OHNE_BAUM, spalte === baumspalte);
    if (klappen !== null) {
      e.preventDefault();
      klappe(zi, klappen);
      return;
    }
    if (strg && !e.altKey) {
      const taste = e.key.toLowerCase();
      if (taste === 'c') {
        e.preventDefault();
        kopiere();
        return;
      }
      if (taste === 'a') {
        e.preventDefault();
        waehleAlles();
        return;
      }
      if (taste === 'x' || taste === 'v') {
        e.preventDefault();
        setStatus(texte.gridSchreibgeschuetzt);
        return;
      }
    }
    switch (e.key) {
      case 'Tab': {
        const ziel = tabZiel(von, e.shiftKey, raster());
        if (ziel) {
          e.preventDefault();
          aktiviere(ziel, false, true);
        }
        return;
      }
      case 'Enter': {
        e.preventDefault();
        const ziel = zielZelle(e.shiftKey ? 'ArrowUp' : 'ArrowDown', false, von, raster());
        if (ziel) aktiviere(ziel, false, true);
        return;
      }
      case 'Escape':
        setAuswahl(null);
        setStatus('');
        return;
      case 'F2':
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        setStatus(texte.gridSchreibgeschuetzt);
        return;
      default:
        break;
    }
    if (NAVIGATIONSTASTEN.has(e.key)) {
      e.preventDefault();
      const ziel = zielZelle(e.key, strg, von, raster());
      if (ziel) aktiviere(ziel, e.shiftKey, true);
      return;
    }
    if (e.key.length === 1 && !strg && !e.altKey && e.key !== ' ') {
      e.preventDefault();
      setStatus(texte.gridSchreibgeschuetzt);
    }
  };

  const onMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target instanceof Element && e.target.closest('[data-aufklappen]')) {
      e.preventDefault(); // der Knopf nimmt keinen Fokus; das Auf-/Zuklappen läuft über onClick
      return;
    }
    const zelle = zelleVon(e.target);
    if (!zelle) return;
    aktiviere({ zeile: zelle.zi, spalte: zelle.si }, e.shiftKey, false);
  };

  const onClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (!(e.target instanceof Element) || !e.target.closest('[data-aufklappen]')) return;
    const zelle = zelleVon(e.target);
    const z = zelle ? zeilen[zelle.zi] : undefined;
    if (zelle && z) klappe(zelle.zi, !z.aufgeklappt);
  };

  const onFocus = (e: FocusEvent<HTMLDivElement>): void => {
    const zelle = zelleVon(e.target);
    const id = zelle ? zeilenIds[zelle.zi] : undefined;
    if (zelle && id !== undefined && (aktiv?.id !== id || aktiv.spalte !== zelle.spalte)) {
      kern.setAktiv({ id, spalte: zelle.spalte });
    }
  };

  // --- Darstellung ----------------------------------------------------------------------------------------------
  // Waagerecht virtualisiert: Bei 20 Spalten halbiert das die Zellen je Zeile beim schnellen Scrollen (D-60.10).
  const breiten = useMemo(() => spalten.map(spaltenbreite), [spalten]);
  const sichtbar = useSichtbareSpalten({
    scroller,
    breiten,
    fixiert,
    aktivSpaltenIndex: kern.aktivSpaltenIndex,
  });
  const zeilenAuswahl = (i: number): readonly [number, number] | null =>
    auswahl && i >= auswahl.zeilen[0] && i <= auswahl.zeilen[1] ? auswahl.spalten : null;
  const aktivIn = (i: number): string | null =>
    i === aktivIndex && aktivSpalte !== undefined ? aktivSpalte : null;
  const gemeinsam = {
    spalten,
    versaetze,
    zellklassen,
    sichtbar,
    baumspalte,
    kennzeichenTexte,
    achsen,
  };

  // Der Kopf hängt nicht an der Scrollposition: einmal gebaut, beim Scrollen nicht neu verglichen (Ticket 74).
  const kopf = useMemo(
    () => (
      <div
        role="rowgroup"
        className="tx-grid__kopf tx-grid__kopf--raster"
        style={{
          gridTemplateColumns: vorlage,
          gridTemplateRows: `repeat(${String(kopfzeilen)}, ${String(zh)}px)`,
          minWidth: mindestbreite,
        }}
      >
        {kopfgruppen.map((gruppe, tiefe) => {
          let start = 0;
          return (
            <div
              key={gruppe.id}
              role="row"
              aria-rowindex={tiefe + 1}
              className="tx-grid__kopfzeile tx-grid__kopfzeile--rolle"
            >
              {gruppe.headers.map((h) => {
                const erste = start;
                start += h.colSpan;
                if (h.rowSpan === 0) return null;
                const istGruppe = !h.isPlaceholder && h.subHeaders.length > 0;
                const spalte = istGruppe ? undefined : spalten[erste];
                const titel = istGruppe ? (spalten[erste]?.gruppe?.kopf ?? '') : (spalte?.kopf ?? '');
                const bild = istGruppe ? null : (achsen[erste] ?? null);
                const links = versaetze[erste] ?? null;
                const k = ['tx-grid__kopfzelle'];
                if (istGruppe) k.push('tx-grid__kopfzelle--gruppe');
                else if (spalte?.ausrichtung === 'rechts' || spalte?.ausrichtung === 'mitte') {
                  k.push(`tx-grid__kopfzelle--${spalte.ausrichtung}`);
                }
                if (bild) k.push('tx-grid__kopfzelle--zeitleiste');
                if (links !== null) k.push('tx-grid__kopfzelle--fixiert');
                if (erste + h.colSpan === fixiert) k.push('tx-grid__kopfzelle--fixiert-letzte');
                // Sichtbar reicht ein Spaltenkopf bis zur unteren Kopfzeile, auch wenn nur die Zeitleiste den Kopf
                // zweizeilig macht; `aria-rowspan` zählt die Kopfzeilen von TanStack.
                const zeilenspanne = istGruppe ? 1 : kopfzeilen - tiefe;
                const markierungsId = `${kopfId}-markierungen-${String(erste)}`;
                return (
                  <div
                    key={h.id}
                    role="columnheader"
                    aria-colindex={erste + 1}
                    aria-colspan={h.colSpan > 1 ? h.colSpan : undefined}
                    aria-rowspan={h.rowSpan > 1 ? h.rowSpan : undefined}
                    aria-label={bild && titel !== '' ? titel : undefined}
                    aria-describedby={bild && bild.markierungen.length > 0 ? markierungsId : undefined}
                    data-spalte-kopf={istGruppe ? undefined : spalte?.id}
                    className={k.join(' ')}
                    style={{
                      gridColumn: `${String(erste + 1)} / span ${String(h.colSpan)}`,
                      gridRow: `${String(tiefe + 1)} / span ${String(Math.max(1, zeilenspanne))}`,
                      ...(links === null ? {} : { left: links }),
                    }}
                  >
                    {bild ? <Zeitkopf bild={bild} beschreibungsId={markierungsId} /> : titel}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    ),
    [kopfgruppen, kopfzeilen, mindestbreite, spalten, versaetze, fixiert, vorlage, zh, achsen, kopfId],
  );

  return (
    <div className="tx-grid tx-grid--vergleich" ref={wurzel}>
      <div
        ref={scroller}
        className="tx-grid__scroll"
        role="treegrid"
        aria-label={props.beschriftung ?? texte.vergleichBeschriftung}
        aria-multiselectable="true"
        aria-readonly
        aria-rowcount={ariaKopfzeilen + zeilenIds.length}
        aria-colcount={spalten.length}
        tabIndex={zeilenIds.length === 0 ? 0 : undefined}
        onKeyDown={onKeyDown}
        onMouseDown={onMouseDown}
        onClick={onClick}
        onFocus={onFocus}
        style={{ ['--tx-grid-zeilenhoehe' as string]: `${String(zh)}px` }}
      >
        {kopf}
        <div
          role="rowgroup"
          className="tx-grid__koerper"
          style={{
            height: virtualizer.getTotalSize(),
            minWidth: mindestbreite,
            gridTemplateColumns: vorlage,
          }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const z = zeilen[item.index];
            if (!z) return null;
            return (
              <Vergleichszeile
                key={z.id}
                zellen={z.zellen}
                baum={z}
                index={item.index}
                ariaZeile={ariaKopfzeilen + item.index + 1}
                versatz={kern.versatz(item.start)}
                aktiv={aktivIn(item.index)}
                auswahl={zeilenAuswahl(item.index)}
                {...gemeinsam}
              />
            );
          })}
        </div>
        {summen.length > 0 ? (
          <div
            role="rowgroup"
            className="tx-grid__fuss"
            style={{ minWidth: mindestbreite, gridTemplateColumns: vorlage }}
          >
            {summen.map((s, j) => {
              const i = zeilen.length + j;
              return (
                <Vergleichszeile
                  key={s.id}
                  zellen={s.zellen}
                  baum={null}
                  index={i}
                  ariaZeile={ariaKopfzeilen + i + 1}
                  versatz={null}
                  aktiv={aktivIn(i)}
                  auswahl={zeilenAuswahl(i)}
                  {...gemeinsam}
                />
              );
            })}
          </div>
        ) : null}
        {zeilenIds.length === 0 ? <p className="tx-grid__leer">{texte.vergleichLeer}</p> : null}
      </div>
      <div className="tx-grid__status" role="status" aria-live="polite">
        {status}
      </div>
    </div>
  );
}
