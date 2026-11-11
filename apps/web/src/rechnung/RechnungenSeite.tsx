// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: Seiten `/projekt/<id>/auftrag/<id>/rechnungen` (Liste) und `…/rechnungen/<id>` (Prüfansicht). Geladen wird
// über die Repositories des Speichers; geschrieben nur über Befehle (A5, U7) in einer Sitzung des Befehlswegs. Nach
// Rückgängig oder Wiederholen lädt die Seite neu. Weist der Speicher ab (`konflikt`), steht der Grund als Meldung da und
// nichts ändert sich (Q5).

import { Button, useToast } from '@tethys/ui-basis';
import type { ProjektId, Rechnung, RechnungBefehl, Rechnungsart } from '@tethys/vertrag';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import { auftragPfad } from '../auftrag/ziel';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer, type Abweisung, type Ausgang } from '../lv/befehlsweg';
import { abweisungText } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import {
  aenderungsbefehle,
  entwurfAus,
  entwurfLesen,
  naechsteRechnungsnummer,
  neuerEntwurf,
  rechnungAnlegenBefehl,
  type Rechnungsentwurf,
  type Rechnungswerte,
} from './entwurf';
import { rechnungenPfad, rechnungPfad, type Rechnungsadresse } from './pfad';
import { Pruefansicht } from './Pruefansicht';
import { RechnungDialog } from './RechnungDialog';
import { Verweis } from './Verweis';
import { Rechnungsliste } from './Rechnungsliste';
import {
  rechnungenSitzung,
  rechnungsstandLaden,
  type Rechnungsauftrag,
  type Rechnungsstand,
} from './rechnungen';
import { texte } from './texte';
import { XRechnungEinlesen } from './XRechnungEinlesen';
import { entwurfMitXRechnung, type XRechnungsuebernahme } from './xrechnung';
import '../lv/lv.css';
import '../auftrag/auftrag.css';
import './rechnung.css';

const t = texte.liste;

type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; stand: Rechnungsstand };

export function RechnungenSeite({
  adresse,
  gehe,
}: {
  adresse: Rechnungsadresse;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);
  const { auftragsLvId } = adresse;

  useEffect(() => {
    let aktiv = true;
    void rechnungsstandLaden(u.speicher, auftragsLvId).then((r) => {
      if (aktiv) setLage(r.ok ? { art: 'da', stand: r.wert } : { art: 'fehlt' });
    });
    return () => {
      aktiv = false;
    };
  }, [u, auftragsLvId, lauf]);
  // Rückgängig und Wiederholen schreiben am Speicher vorbei an dieser Sitzung: neu laden.
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
        <p>{t.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{t.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
          <Verweis pfad={`/projekt/${adresse.projektId}`} text={texte.liste.zumAuftrag} gehe={gehe} />
        </div>
      </div>
    );
  }
  return <Ansicht key={lauf} stand={lage.stand} adresse={adresse} gehe={gehe} />;
}

/** Abweisung eines Rechnungsbefehls als Meldung; ein `konflikt` des Speichers mit eigenem Text (Freigabe-Reihenfolge). */
export function rechnungsabweisung(a: Abweisung): { titel: string; beschreibung: string } {
  if (a.art === 'speicher' && a.fehler.code === 'konflikt')
    return { titel: texte.meldung.nichtGespeichert, beschreibung: texte.freigabe.konflikt };
  return abweisungText(a);
}

type DialogLage =
  | { readonly art: 'neu'; readonly entwurf: Rechnungsentwurf }
  | { readonly art: 'bearbeiten'; readonly rechnung: Rechnung; readonly entwurf: Rechnungsentwurf };

function Ansicht({
  stand,
  adresse,
  gehe,
}: {
  stand: Rechnungsstand;
  adresse: Rechnungsadresse;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const weg = befehlswegFuer(u);
  const kopf = stand.auftrag.auftragsLeistungsverzeichnis;
  const projektId: ProjektId = kopf.projektId;
  const sitzung = useMemo(() => rechnungenSitzung(weg, projektId, stand.rechnungen), [weg, projektId, stand]);
  const rechnungen = useSyncExternalStore(sitzung.abonnieren, sitzung.lesen);
  const [dialog, setDialog] = useState<DialogLage | null>(null);

  /** Schickt die Befehle als einen Undo-Schritt; `true`, wenn alle angenommen wurden. */
  const ausfuehren = useCallback(
    async (auftraege: readonly Rechnungsauftrag[]): Promise<boolean> => {
      const aus: Ausgang<readonly Rechnung[]>[] = await sitzung.folge(auftraege);
      const abgewiesen = aus.find((a) => !a.ok);
      if (abgewiesen !== undefined) {
        zeige({ ...rechnungsabweisung(abgewiesen.abweisung), art: 'fehler' });
        return false;
      }
      return true;
    },
    [sitzung, zeige],
  );

  const befehle = useCallback(
    (r: Rechnung, bs: readonly RechnungBefehl[]): Promise<boolean> =>
      ausfuehren(bs.map((befehl) => ({ rechnungId: r.id, befehl }))),
    [ausfuehren],
  );

  const anlegen = async (w: Rechnungswerte): Promise<boolean> => {
    const id = u.ids.rechnung();
    const befehl = rechnungAnlegenBefehl(id, projektId, kopf.id, sitzung.zustand, w);
    const ok = await ausfuehren([{ rechnungId: null, befehl }]);
    if (ok) {
      zeige({ titel: texte.meldung.gespeichert(befehl.rechnung.nummer), art: 'erfolg' });
      gehe(rechnungPfad(projektId, kopf.id, id));
    }
    return ok;
  };

  const speichern = async (w: Rechnungswerte): Promise<boolean> => {
    if (dialog?.art !== 'bearbeiten') return anlegen(w);
    const aktuell = sitzung.zustand.find((x) => x.id === dialog.rechnung.id) ?? dialog.rechnung;
    return befehle(aktuell, aenderungsbefehle(aktuell, w));
  };

  const xrechnungUebernehmen = async (
    ziel: Rechnung | null,
    uebernahme: XRechnungsuebernahme,
    art: Rechnungsart,
  ): Promise<boolean> => {
    const basis =
      ziel === null ? neuerEntwurf(sitzung.zustand, stand.blaetter) : entwurfAus(ziel, stand.blaetter);
    const w = entwurfLesen(entwurfMitXRechnung(basis, uebernahme, art));
    if (!w.ok) return false;
    const ok = ziel === null ? await anlegen(w.wert) : await befehle(ziel, aenderungsbefehle(ziel, w.wert));
    if (ok) {
      zeige({ titel: texte.xrechnung.erfolg, art: 'erfolg' });
      if (ziel !== null) gehe(rechnungPfad(projektId, kopf.id, ziel.id));
    }
    return ok;
  };

  const gewaehlt =
    adresse.rechnungId === null ? null : (rechnungen.find((r) => r.id === adresse.rechnungId) ?? null);

  return (
    <div className="seite rechnung">
      <div className="lv__kopf">
        <h1>
          {gewaehlt === null
            ? t.titel(kopf.name)
            : `${texte.pruefung.titel(gewaehlt.art, gewaehlt.nummer)} – ${kopf.name}`}
        </h1>
        <Verweis pfad={auftragPfad(projektId, kopf.id)} text={t.zumAuftrag} gehe={gehe} />
        {adresse.rechnungId === null ? null : (
          <Verweis pfad={rechnungenPfad(projektId, kopf.id)} text={t.zurListe} gehe={gehe} />
        )}
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={t.werkzeuge}>
        <HistorieKnoepfe />
        <Button
          onClick={() => {
            setDialog({ art: 'neu', entwurf: neuerEntwurf(sitzung.zustand, stand.blaetter) });
          }}
        >
          {t.neu}
        </Button>
        <XRechnungEinlesen
          rechnungen={rechnungen}
          ziel={gewaehlt?.id ?? null}
          onUebernehmen={xrechnungUebernehmen}
        />
      </div>
      {adresse.rechnungId === null ? (
        <Rechnungsliste rechnungen={rechnungen} stand={stand} gehe={gehe} />
      ) : gewaehlt === null ? (
        <p>{t.rechnungFehlt}</p>
      ) : (
        <Pruefansicht
          rechnung={gewaehlt}
          rechnungen={rechnungen}
          stand={stand}
          befehle={(bs) => befehle(gewaehlt, bs)}
          onBearbeiten={() => {
            setDialog({
              art: 'bearbeiten',
              rechnung: gewaehlt,
              entwurf: entwurfAus(gewaehlt, stand.blaetter),
            });
          }}
          onGeloescht={() => {
            gehe(rechnungenPfad(projektId, kopf.id));
          }}
        />
      )}
      <RechnungDialog
        offen={
          dialog === null
            ? null
            : {
                titel:
                  dialog.art === 'neu'
                    ? texte.formular.titelNeu(naechsteRechnungsnummer(rechnungen))
                    : texte.formular.titelBearbeiten(dialog.rechnung.nummer),
                entwurf: dialog.entwurf,
              }
        }
        blaetter={stand.blaetter}
        onSchliessen={() => {
          setDialog(null);
        }}
        onSpeichern={speichern}
      />
    </div>
  );
}
