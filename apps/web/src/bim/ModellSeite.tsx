// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/modelle/<mid>` (Ticket 114, X1b): links der Modellbaum im `VergleichsGrid` (U2), rechts die 3D-Ansicht
// (`ui-modell`, Bytes aus `modelldateien.laden`), darunter Eigenschaften (bei Bedarf aus den Bytes über `ifc` im Worker, D-51)
// und Befunde. Die App hält Auswahl und Sichtbarkeit; Baum und Leinwand zeigen sie (`auswahl.ts`, `sichtbarkeit.ts`).
//
// Diese Datei und mit ihr three.js und web-ifc lädt `App.tsx` erst beim Öffnen der Seite (dynamischer Import).

import type { Objekteigenschaften } from '@tethys/ifc';
import { Auswahl, Button } from '@tethys/ui-basis';
import { VergleichsGrid } from '@tethys/ui-grid';
import { Modellansicht } from '@tethys/ui-modell';
import type { Ladebericht, ModellansichtRef } from '@tethys/ui-modell';
import '@tethys/ui-modell/modellansicht.css';
import type { BauwerksmodellId, BauwerksmodellZustand, ProjektId, Pruefbefund } from '@tethys/vertrag';
import { formatiereMengeDe } from '@tethys/dezimal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Verweis } from '../ui/Verweis';
import { AUSWAHL_START, beiAufklappen, beiKlick3d, beiZeileAktiv, type Auswahlstand } from './auswahl';
import { BAUM_SPALTEN, globalIdDerZeile, modellbaumBauen, sichtbareZeilen } from './baum';
import { BefundListe } from './BefundListe';
import { geometriebefunde } from './befunde';
import { IfcArbeiter } from './ifc-arbeiter';
import { modellePfad } from './pfad';
import { bauwerksmodellLaden } from './schreiben';
import {
  ALLES_SICHTBAR,
  ausblenden,
  bauteileDerKlasse,
  geschosse,
  isolieren,
  klassen,
  type Sichtbarkeit,
} from './sichtbarkeit';
import { modellTesthaken } from './testhaken';
import { texte } from './texte';
import { KennwerteBereich } from './KennwerteBereich'; // Ticket 115
import { useBezug } from './useBezug'; // Ticket 115
import { ZuordnungBereich } from './ZuordnungBereich'; // Ticket 115
import { zuordnungsfaerbung } from './zuordnung'; // Ticket 115
import '../lv/lv.css';
import './bim.css';

type Laden =
  | { art: 'laedt' }
  | { art: 'fehlt' }
  | { art: 'da'; zustand: BauwerksmodellZustand; bytes: Uint8Array | null };

type Eigenschaftslage =
  | { art: 'keine' }
  | { art: 'laedt'; globalId: string }
  | { art: 'da'; globalId: string; wert: Objekteigenschaften | null };

const KEINE_FAERBUNG: ReadonlyMap<string, never> = new Map<string, never>();

export function ModellSeite({
  projektId,
  id,
  gehe,
}: {
  projektId: ProjektId;
  id: BauwerksmodellId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);

  useEffect(() => {
    let aktiv = true;
    void (async (): Promise<Laden> => {
      const z = await bauwerksmodellLaden(u.speicher, id);
      if (z === null) return { art: 'fehlt' };
      const b = await u.speicher.modelldateien.laden(z.bauwerksmodell.datei.hash);
      return { art: 'da', zustand: z, bytes: b.ok ? b.wert : null };
    })().then((l) => {
      if (!aktiv) return;
      // Ein Undo/Redo (Umbenennen) lädt neu; dieselben Bytes behalten, damit die 3D-Ansicht nicht neu lädt.
      setLage((alt) =>
        l.art === 'da' &&
        alt.art === 'da' &&
        alt.zustand.bauwerksmodell.datei.hash === l.zustand.bauwerksmodell.datei.hash
          ? { ...l, bytes: alt.bytes }
          : l,
      );
    });
    return () => {
      aktiv = false;
    };
  }, [u, id, lauf]);
  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [u],
  );

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{texte.seite.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{texte.seite.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
          <Verweis pfad={modellePfad(projektId)} text={texte.seite.zurListe} gehe={gehe} />
        </div>
      </div>
    );
  }
  return <Arbeitsflaeche projektId={projektId} zustand={lage.zustand} bytes={lage.bytes} gehe={gehe} />;
}

function Arbeitsflaeche({
  projektId,
  zustand,
  bytes,
  gehe,
}: {
  projektId: ProjektId;
  zustand: BauwerksmodellZustand;
  bytes: Uint8Array | null;
  gehe: (pfad: string) => void;
}): ReactElement {
  const modell = zustand.bauwerksmodell;
  const baum = useMemo(() => modellbaumBauen(modell), [modell]);
  const [stand, setStand] = useState<Auswahlstand>(AUSWAHL_START);
  const [sicht, setSicht] = useState<Sichtbarkeit>(ALLES_SICHTBAR);
  const [ladebefunde, setLadebefunde] = useState<readonly Pruefbefund[]>([]);
  const [dreiDFehler, setDreiDFehler] = useState(false);
  const [geschoss, setGeschoss] = useState<string | undefined>(undefined);
  const [klasse, setKlasse] = useState<string | undefined>(undefined);
  const ansicht = useRef<ModellansichtRef | null>(null);
  // Ticket 115: Bezugs-LV der Zuordnung; die 3D-Ansicht färbt „zugeordnet“/„ohne Zuordnung“ bezogen auf dieses LV.
  const bezug = useBezug(projektId);
  const faerbung = useMemo(
    () => (bezug.bezug === null ? KEINE_FAERBUNG : zuordnungsfaerbung(modell, bezug.knoten)),
    [bezug.bezug, bezug.knoten, modell],
  );
  const ergaenzen = useRef(false); // Strg/Cmd beim Klick in den Baum ergänzt die Auswahl (Ticket 115)

  const zeilen = useMemo(() => sichtbareZeilen(baum, stand.zugeklappt), [baum, stand.zugeklappt]);
  const alleGeschosse = useMemo(() => geschosse(baum), [baum]);
  const alleKlassen = useMemo(() => klassen(modell), [modell]);

  // Eigenschaften der aktiven Zeile (nach einem Klick im 3D ist das das getroffene Bauteil), bei Bedarf aus den Bytes.
  const arbeiter = useRef<{ a: IfcArbeiter; index: Promise<boolean> } | null>(null);
  useEffect(() => {
    if (bytes === null) return;
    const a = new IfcArbeiter();
    arbeiter.current = { a, index: a.indexBauen(bytes) };
    return () => {
      a.beenden();
      arbeiter.current = null;
    };
  }, [bytes]);
  const fokus = stand.aktiveZeile == null ? null : globalIdDerZeile(baum, stand.aktiveZeile);
  const [eigenschaften, setEigenschaften] = useState<Eigenschaftslage>({ art: 'keine' });
  useEffect(() => {
    const w = arbeiter.current;
    if (fokus === null || w === null) {
      setEigenschaften({ art: 'keine' });
      return;
    }
    const lauf = { aktiv: true };
    setEigenschaften({ art: 'laedt', globalId: fokus });
    void (async () => {
      const ok = await w.index;
      const wert = ok ? await w.a.eigenschaften(fokus) : null;
      if (lauf.aktiv) setEigenschaften({ art: 'da', globalId: fokus, wert });
    })();
    return () => {
      lauf.aktiv = false;
    };
  }, [fokus, bytes]);

  const onAuswahl = useCallback(
    (ids: readonly string[], art: { readonly hinzufuegen: boolean }) => {
      setStand((s) => beiKlick3d(s, baum, ids, art.hinzufuegen));
    },
    [baum],
  );
  const onGeladen = useCallback(
    (bericht: Ladebericht) => {
      setLadebefunde(geometriebefunde(modell, bericht));
    },
    [modell],
  );
  const zurZeile = useCallback(
    (globalId: string) => {
      setStand((s) => beiKlick3d(s, baum, [globalId], false));
    },
    [baum],
  );

  // Prüfzugang nur im Test-Build (VITE_TESTPFAD=1, D-58): Zustand der Leinwand und Auswahl der App, nie Pixel.
  const standRef = useRef(stand);
  standRef.current = stand;
  const faerbungRef = useRef<ReadonlyMap<string, string>>(faerbung); // Ticket 115
  faerbungRef.current = faerbung;
  useEffect(
    () =>
      modellTesthaken(
        ansicht,
        () => standRef.current.auswahl,
        () => faerbungRef.current,
      ),
    [],
  );

  const fokusBauteil = fokus === null ? undefined : modell.bauteile.find((b) => b.globalId === fokus);
  const fokusKnoten = fokus === null ? undefined : modell.struktur.find((k) => k.globalId === fokus);

  return (
    <div className="seite bim bim--modell">
      <div className="lv__kopf">
        <h1>{modell.name}</h1>
        <Verweis pfad={modellePfad(projektId)} text={texte.seite.zurListe} gehe={gehe} />
      </div>
      <div className="lv__werkzeuge bim__werkzeuge" role="toolbar" aria-label={texte.seite.werkzeuge}>
        <HistorieKnoepfe />
        <Button
          disabled={stand.auswahl.length === 0}
          onClick={() => {
            setSicht((s) => ausblenden(s, stand.auswahl));
          }}
        >
          {texte.seite.ausblenden}
        </Button>
        <Button
          disabled={stand.auswahl.length === 0}
          onClick={() => {
            setSicht((s) => isolieren(s, stand.auswahl));
          }}
        >
          {texte.seite.isolieren}
        </Button>
        <Button
          onClick={() => {
            setSicht(ALLES_SICHTBAR);
          }}
        >
          {texte.seite.allesZeigen}
        </Button>
        <span className="bim__gruppe">
          <Auswahl
            kompakt
            label={texte.seite.geschoss}
            wert={geschoss}
            optionen={alleGeschosse.map((g) => ({ wert: g.zeilenId, label: g.name }))}
            onWertChange={setGeschoss}
          />
          <Button
            groesse="sm"
            disabled={geschoss === undefined}
            onClick={() => {
              const g = alleGeschosse.find((x) => x.zeilenId === geschoss);
              if (g) setSicht((s) => isolieren(s, g.bauteile));
            }}
          >
            {texte.seite.nurDiese}
          </Button>
          <Button
            groesse="sm"
            disabled={geschoss === undefined}
            onClick={() => {
              const g = alleGeschosse.find((x) => x.zeilenId === geschoss);
              if (g) setSicht((s) => ausblenden(s, g.bauteile));
            }}
          >
            {texte.seite.dieseAusblenden}
          </Button>
        </span>
        <span className="bim__gruppe">
          <Auswahl
            kompakt
            label={texte.seite.klasseWaehlen}
            wert={klasse}
            optionen={alleKlassen.map((k) => ({
              wert: k.klasse,
              label: `${k.klasse} (${String(k.anzahl)})`,
            }))}
            onWertChange={setKlasse}
          />
          <Button
            groesse="sm"
            disabled={klasse === undefined}
            onClick={() => {
              if (klasse !== undefined) setSicht((s) => isolieren(s, bauteileDerKlasse(modell, klasse)));
            }}
          >
            {texte.seite.nurDiese}
          </Button>
          <Button
            groesse="sm"
            disabled={klasse === undefined}
            onClick={() => {
              if (klasse !== undefined) setSicht((s) => ausblenden(s, bauteileDerKlasse(modell, klasse)));
            }}
          >
            {texte.seite.dieseAusblenden}
          </Button>
        </span>
      </div>

      <div className="bim__arbeitsflaeche">
        <div
          className="lv__grid bim__baum"
          onPointerDownCapture={(e) => {
            ergaenzen.current = e.ctrlKey || e.metaKey; // Ticket 115
          }}
        >
          <VergleichsGrid
            beschriftung={texte.baum.beschriftung}
            spalten={BAUM_SPALTEN}
            zeilen={zeilen}
            baumspalte="name"
            fixierteSpalten={1}
            {...(stand.sprungziel === null ? {} : { sprungziel: stand.sprungziel })}
            onAufklappen={(zeilenId, auf) => {
              setStand((s) => beiAufklappen(s, zeilenId, auf));
            }}
            onZeileAktiv={(zeilenId) => {
              const mehr = ergaenzen.current; // Ticket 115
              ergaenzen.current = false;
              setStand((s) => beiZeileAktiv(s, baum, zeilenId, mehr));
            }}
          />
        </div>
        <section className="bim__ansicht" aria-label={texte.seite.ansicht}>
          {bytes === null ? (
            <p role="alert">{texte.seite.dateiFehlt}</p>
          ) : (
            <Modellansicht
              ref={ansicht}
              datei={bytes}
              auswahl={stand.auswahl}
              ausgeblendet={sicht.ausgeblendet}
              isoliert={sicht.isoliert}
              faerbung={faerbung}
              onAuswahl={onAuswahl}
              onGeladen={onGeladen}
              onFehler={() => {
                setDreiDFehler(true);
              }}
            />
          )}
          {dreiDFehler ? <p role="alert">{texte.seite.dreiDFehler}</p> : null}
        </section>
      </div>

      <div className="bim__unten">
        <section className="bim__leiste" aria-label={texte.seite.leiste}>
          <h2>{texte.seite.leiste}</h2>
          {stand.auswahl.length > 1 ? <p>{texte.seite.mehrere(stand.auswahl.length)}</p> : null}
          {fokus === null ? (
            <p>{texte.seite.keineAuswahl}</p>
          ) : (
            <>
              <h3>{texte.seite.allgemein}</h3>
              <dl className="bim__eigenschaften">
                <dt>{texte.seite.globalId}</dt>
                <dd>{fokus}</dd>
                <dt>{texte.seite.klasse}</dt>
                <dd>{fokusBauteil?.ifcKlasse ?? (fokusKnoten ? texte.strukturart[fokusKnoten.art] : '')}</dd>
                {fokusBauteil?.typ ? (
                  <>
                    <dt>{texte.seite.typ}</dt>
                    <dd>{fokusBauteil.typ}</dd>
                  </>
                ) : null}
              </dl>
              {(fokusBauteil?.mengen ?? fokusKnoten?.mengen ?? []).length > 0 ? (
                <>
                  <h3>{texte.seite.mengen}</h3>
                  <dl className="bim__eigenschaften">
                    {(fokusBauteil?.mengen ?? fokusKnoten?.mengen ?? []).map((m, i) => (
                      <Paar
                        key={i}
                        name={`${m.satz ?? texte.seite.ohneSatz} · ${m.name}`}
                        wert={formatiereMengeDe(m.wert)}
                      />
                    ))}
                  </dl>
                </>
              ) : null}
              <Eigenschaften lage={eigenschaften} />
            </>
          )}
        </section>
        <BefundListe befunde={ladebefunde} beschriftung={texte.seite.befunde} onSprung={zurZeile} />
      </div>
      {/* Ticket 115: Zuordnung, Aufmaßblatt aus Auswahl, Kennwerte */}
      <div className="bim__unten">
        <ZuordnungBereich
          projektId={projektId}
          modell={modell}
          auswahl={stand.auswahl}
          bezug={bezug}
          zurZeile={zurZeile}
          gehe={gehe}
        />
        <KennwerteBereich projektId={projektId} modell={modell} gehe={gehe} />
      </div>
    </div>
  );
}

function Paar({ name, wert }: { name: string; wert: string }): ReactElement {
  return (
    <>
      <dt>{name}</dt>
      <dd>{wert}</dd>
    </>
  );
}

function Eigenschaften({ lage }: { lage: Eigenschaftslage }): ReactElement | null {
  if (lage.art === 'keine') return null;
  if (lage.art === 'laedt') return <p aria-busy="true">{texte.seite.eigenschaftenLaden}</p>;
  const w = lage.wert;
  if (w === null) return <p>{texte.seite.eigenschaftenFehlen}</p>;
  const saetze = new Map<string, { name: string; wert: string }[]>();
  for (const e of w.eigenschaften) {
    const satz = e.satz ?? texte.seite.ohneSatz;
    const l = saetze.get(satz) ?? [];
    l.push({ name: e.name, wert: e.werte.map((x) => x.text).join(', ') });
    saetze.set(satz, l);
  }
  return (
    <>
      {saetze.size === 0 ? <p>{texte.seite.keineEigenschaften}</p> : null}
      {[...saetze].map(([satz, liste]) => (
        <section key={satz} aria-label={satz}>
          <h3>{satz}</h3>
          <dl className="bim__eigenschaften">
            {liste.map((p, i) => (
              <Paar key={i} name={p.name} wert={p.wert} />
            ))}
          </dl>
        </section>
      ))}
      {w.klassifikationen.length > 0 ? (
        <>
          <h3>{texte.seite.klassifikationen}</h3>
          <ul>
            {w.klassifikationen.map((k, i) => (
              <li key={i}>
                {[k.system, k.kennung, k.name].filter((x) => x !== null && x !== '').join(' · ')}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {w.materialien.length > 0 ? (
        <>
          <h3>{texte.seite.materialien}</h3>
          <p>{w.materialien.join(', ')}</p>
        </>
      ) : null}
      {w.befunde.length > 0 ? <BefundListe befunde={w.befunde} beschriftung={texte.seite.befunde} /> : null}
    </>
  );
}
