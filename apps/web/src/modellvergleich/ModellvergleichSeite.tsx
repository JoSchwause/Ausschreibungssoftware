// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/modelle/<neu>/vergleich[/<alt>]` (Ticket 116, X1f): zwei Modellstände über `bim` verglichen.
// Zusammenfassung und Befunde oben, links die Änderungsliste im `VergleichsGrid` (U2), rechts das neue Modell in 3D mit der
// Färbung hinzugefügt/geändert (`ui-modell`), darunter die Folgen für ein LV und „Mengen aktualisieren“ als ein Undo-Schritt.
//
// Diese Datei und mit ihr three.js lädt `App.tsx` erst beim Öffnen der Seite (dynamischer Import).

import { formatiereBetragDe, formatiereMengeDe } from '@tethys/dezimal';
import { Auswahl, Button, Dialog } from '@tethys/ui-basis';
import { VergleichsGrid } from '@tethys/ui-grid';
import { Modellansicht } from '@tethys/ui-modell';
import type { ModellansichtRef } from '@tethys/ui-modell';
import '@tethys/ui-modell/modellansicht.css';
import type {
  Bauwerksmodell,
  BauwerksmodellId,
  BauwerksmodellZustand,
  LeistungsverzeichnisId,
  LvUebersicht,
  LvZustand,
  ProjektId,
} from '@tethys/vertrag';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import { BefundListe } from '../bim/BefundListe';
import { modellePfad, modellPfad } from '../bim/pfad';
import { bauwerksmodellLaden } from '../bim/schreiben';
import { modellTesthaken } from '../bim/testhaken';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer, lvSitzung, type LvSitzung } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Verweis } from '../ui/Verweis';
import {
  aktualisierungBerechnen,
  befundeErklaert,
  FOLGEN_SPALTEN,
  folgenansicht,
  folgenZeilen,
  mengenAktualisieren,
} from './folgen';
import { texte } from './texte';
import { LISTE_SPALTEN, vergleichsansicht } from './vergleich';
import '../lv/lv.css';
import '../bim/bim.css';
import './modellvergleich.css';

type Laden =
  | { art: 'laedt' }
  | { art: 'fehlt' }
  | { art: 'ohne-vorgaenger'; neu: BauwerksmodellZustand }
  | {
      art: 'da';
      neu: BauwerksmodellZustand;
      alt: BauwerksmodellZustand;
      bytes: Uint8Array | null;
      lvs: readonly LvUebersicht[];
    };

const KENNZEICHEN = {
  hinzugefuegt: { symbol: '+', beschreibung: texte.liste.hinzugefuegt },
  entfernt: { symbol: '−', beschreibung: texte.liste.entfernt },
  geaendert: { symbol: '~', beschreibung: texte.liste.geaendert },
};

export function ModellvergleichSeite({
  projektId,
  neuId,
  altId,
  gehe,
}: {
  projektId: ProjektId;
  neuId: BauwerksmodellId;
  altId: BauwerksmodellId | null;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });

  useEffect(() => {
    let aktiv = true;
    void (async (): Promise<Laden> => {
      const neu = await bauwerksmodellLaden(u.speicher, neuId);
      if (neu === null) return { art: 'fehlt' };
      const vorher = altId ?? neu.bauwerksmodell.vorgaengerId;
      if (vorher === null) return { art: 'ohne-vorgaenger', neu };
      const alt = await bauwerksmodellLaden(u.speicher, vorher);
      if (alt === null) return { art: 'fehlt' };
      const b = await u.speicher.modelldateien.laden(neu.bauwerksmodell.datei.hash);
      const l = await u.speicher.leistungsverzeichnisse.auflisten(projektId);
      return {
        art: 'da',
        neu,
        alt,
        bytes: b.ok ? b.wert : null,
        lvs: l.ok ? l.wert.filter((x) => x.vorlage !== true) : [],
      };
    })().then((l) => {
      if (aktiv) setLage(l);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, neuId, altId]);

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{texte.laden}</p>
      </div>
    );
  }
  if (lage.art !== 'da') {
    return (
      <div className="seite">
        <h1>{lage.art === 'fehlt' ? texte.nichtGefunden : texte.seitentitel}</h1>
        {lage.art === 'ohne-vorgaenger' ? <p>{texte.ohneVorgaenger}</p> : null}
        <div className="lv__werkzeuge">
          <Verweis pfad={modellePfad(projektId)} text={texte.zurListe} gehe={gehe} />
        </div>
      </div>
    );
  }
  return (
    <Vergleich
      projektId={projektId}
      alt={lage.alt.bauwerksmodell}
      neu={lage.neu.bauwerksmodell}
      bytes={lage.bytes}
      lvs={lage.lvs}
      gehe={gehe}
    />
  );
}

function Vergleich({
  projektId,
  alt,
  neu,
  bytes,
  lvs,
  gehe,
}: {
  projektId: ProjektId;
  alt: Bauwerksmodell;
  neu: Bauwerksmodell;
  bytes: Uint8Array | null;
  lvs: readonly LvUebersicht[];
  gehe: (pfad: string) => void;
}): ReactElement {
  const ansicht = useMemo(() => vergleichsansicht(alt, neu), [alt, neu]);
  const [dreiDFehler, setDreiDFehler] = useState(false);
  const ref = useRef<ModellansichtRef | null>(null);
  useEffect(() => modellTesthaken(ref, () => []), []);
  const z = ansicht.zusammenfassung;

  return (
    <div className="seite bim bim--modell">
      <div className="lv__kopf">
        <h1>{texte.titel(alt.name, neu.name)}</h1>
        <Verweis pfad={modellPfad(projektId, neu.id)} text={texte.zumModell} gehe={gehe} />
        <Verweis pfad={modellePfad(projektId)} text={texte.zurListe} gehe={gehe} />
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={texte.werkzeuge}>
        <HistorieKnoepfe />
      </div>

      <section aria-label={texte.zusammenfassung}>
        <dl className="vergleich__zahlen">
          {(['hinzugefuegt', 'entfernt', 'geaendert', 'unveraendert'] as const).map((k) => (
            <div key={k}>
              <dt>{texte.anzahl[k]}</dt>
              <dd>{z[k].toLocaleString('de-DE')}</dd>
            </div>
          ))}
        </dl>
      </section>
      <BefundListe befunde={ansicht.befunde} beschriftung={texte.befunde} />

      <div className="bim__arbeitsflaeche">
        <div className="lv__grid bim__baum">
          {ansicht.zeilen.length === 0 ? (
            <p>{texte.liste.leer}</p>
          ) : (
            <VergleichsGrid
              beschriftung={texte.liste.beschriftung}
              spalten={LISTE_SPALTEN}
              zeilen={ansicht.zeilen}
              baumspalte="art"
              kennzeichenTexte={KENNZEICHEN}
            />
          )}
        </div>
        <section className="bim__ansicht" aria-label={texte.ansicht}>
          {bytes === null ? (
            <p role="alert">{texte.dateiFehlt}</p>
          ) : (
            <Modellansicht
              ref={ref}
              datei={bytes}
              auswahl={[]}
              ausgeblendet={[]}
              isoliert={null}
              faerbung={ansicht.faerbung}
              onAuswahl={() => undefined}
              onFehler={() => {
                setDreiDFehler(true);
              }}
            />
          )}
          {dreiDFehler ? <p role="alert">{texte.dreiDFehler}</p> : null}
        </section>
      </div>
      <p className="vergleich__legende">{texte.legende}</p>

      <Folgen projektId={projektId} alt={alt} neu={neu} lvs={lvs} />
    </div>
  );
}

type LvLage = { art: 'keins' } | { art: 'laedt' } | { art: 'da'; sitzung: LvSitzung };

function Folgen({
  projektId,
  alt,
  neu,
  lvs,
}: {
  projektId: ProjektId;
  alt: Bauwerksmodell;
  neu: Bauwerksmodell;
  lvs: readonly LvUebersicht[];
}): ReactElement {
  const u = useUmgebung();
  const [lvId, setLvId] = useState<LeistungsverzeichnisId | undefined>(lvs.length === 1 ? lvs[0]?.id : undefined);
  const [lage, setLage] = useState<LvLage>({ art: 'keins' });

  useEffect(() => {
    if (lvId === undefined) {
      setLage({ art: 'keins' });
      return;
    }
    let aktiv = true;
    setLage({ art: 'laedt' });
    void u.speicher.leistungsverzeichnisse.laden(lvId).then((r) => {
      if (aktiv) setLage(r.ok ? { art: 'da', sitzung: lvSitzung(u, projektId, r.wert) } : { art: 'keins' });
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, lvId]);

  return (
    <section className="vergleich__folgen" aria-label={texte.folgen.titel}>
      <h2>{texte.folgen.titel}</h2>
      {lvs.length === 0 ? (
        <p>{texte.folgen.keinLv}</p>
      ) : (
        <Auswahl
          kompakt
          label={texte.folgen.lv}
          wert={lvId}
          optionen={lvs.map((l) => ({ wert: l.id, label: l.name }))}
          onWertChange={(w) => {
            setLvId(w as LeistungsverzeichnisId);
          }}
        />
      )}
      {lage.art === 'laedt' ? <p aria-busy="true">{texte.folgen.lvLaden}</p> : null}
      {lage.art === 'da' ? <FolgenDesLv sitzung={lage.sitzung} alt={alt} neu={neu} /> : null}
    </section>
  );
}

function FolgenDesLv({
  sitzung,
  alt,
  neu,
}: {
  sitzung: LvSitzung;
  alt: Bauwerksmodell;
  neu: Bauwerksmodell;
}): ReactElement | null {
  const u = useUmgebung();
  const { speicherfehler, pruefe } = useMeldungen();
  const lvStart = sitzung.zustand;
  const lvId = lvStart?.leistungsverzeichnis.id;
  useEffect(() => (lvId === undefined ? undefined : befehlswegFuer(u).anmelden(lvId, sitzung)), [u, lvId, sitzung]);
  const lv = useSyncExternalStore(sitzung.abonnieren, sitzung.lesen);
  const [vorschau, setVorschau] = useState(false);
  const ausfuehren = useRef<HTMLButtonElement | null>(null);

  const folgen = useMemo(() => (lv === null ? null : folgenansicht(lv, alt, neu)), [lv, alt, neu]);
  const aktualisierung = useMemo(() => (lv === null ? null : aktualisierungBerechnen(lv, alt, neu)), [lv, alt, neu]);
  if (lv === null || folgen === null || aktualisierung === null) return null;

  const betroffen = folgen.zeilen.filter((z) => z.betroffen).length;
  const befunde = befundeErklaert(
    folgen.zeilen.filter((z) => z.betroffen).flatMap((z) => z.befunde),
    lv,
    alt,
  );
  const n = aktualisierung.befehle.length;

  const uebernehmen = async (): Promise<void> => {
    setVorschau(false);
    const r = await mengenAktualisieren(sitzung, aktualisierung.befehle);
    for (const a of r.ausgaenge) {
      if (!a.ok && a.abweisung.art === 'speicher') speicherfehler(a.abweisung.fehler, texte.vorschau.fehler);
      else pruefe(a);
    }
  };

  return (
    <>
      <div role="group" aria-label={texte.folgen.netto}>
        {texte.folgen.netto}: {formatiereBetragDe(lv.summen.gesamt.netto)}
      </div>
      {folgen.zeilen.length === 0 ? (
        <p>{texte.folgen.keine}</p>
      ) : (
        <>
          <p>{texte.folgen.zaehlung(betroffen, folgen.zeilen.length)}</p>
          <div className="lv__grid vergleich__folgengrid">
            <VergleichsGrid
              beschriftung={texte.folgen.beschriftung}
              spalten={FOLGEN_SPALTEN}
              zeilen={folgenZeilen(folgen)}
              fixierteSpalten={1}
            />
          </div>
          {befunde.length > 0 ? <BefundListe befunde={befunde} beschriftung={texte.vorschau.befunde} /> : null}
        </>
      )}
      <div className="lv__werkzeuge">
        <Button
          disabled={n === 0}
          onClick={() => {
            setVorschau(true);
          }}
        >
          {texte.folgen.aktualisieren}
        </Button>
        {n === 0 && folgen.zeilen.length > 0 ? <span>{texte.folgen.nichtsZuTun}</span> : null}
      </div>

      <Dialog
        offen={vorschau}
        onOffenChange={setVorschau}
        titel={texte.vorschau.titel}
        beschreibung={texte.vorschau.text(n)}
        anfangsfokus={ausfuehren}
        fuss={
          <>
            <Button
              variante="sekundaer"
              onClick={() => {
                setVorschau(false);
              }}
            >
              {texte.vorschau.abbrechen}
            </Button>
            <Button
              ref={ausfuehren}
              onClick={() => {
                void uebernehmen();
              }}
            >
              {texte.vorschau.ausfuehren}
            </Button>
          </>
        }
      >
        <table className="bim__tabelle vergleich__vorschau" aria-label={texte.vorschau.beschriftung}>
          <thead>
            <tr>
              <th scope="col">{texte.vorschau.position}</th>
              <th scope="col">{texte.vorschau.alt}</th>
              <th scope="col">{texte.vorschau.neu}</th>
              <th scope="col">{texte.vorschau.zeilen}</th>
            </tr>
          </thead>
          <tbody>
            {aktualisierung.positionen.map((p) => (
              <tr key={p.positionId}>
                <th scope="row">{`${p.oz} ${p.kurztext}`}</th>
                <td className="bim__zahl">{p.vorher === null ? '' : formatiereMengeDe(p.vorher)}</td>
                <td className="bim__zahl">{formatiereMengeDe(p.nachher)}</td>
                <td>{p.zeilen.map((z) => z.ausdruck).join(' + ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <BefundListe
          befunde={befundeErklaert(
            aktualisierung.positionen.flatMap((p) => p.befunde),
            lv,
            alt,
          )}
          beschriftung={texte.vorschau.befunde}
        />
      </Dialog>
    </>
  );
}
