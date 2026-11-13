// SPDX-License-Identifier: AGPL-3.0-or-later
// Abschnitt „Leistungsverzeichnisse“ der Projektübersicht und der LV-Liste des Projekts (Ticket 131, vorher Teil von
// `ProjektSeite.tsx`): die LVs mit Netto, Angeboten und Zuschlag, Umbenennen, Löschen und „Neues Leistungsverzeichnis“.
// Jede Änderung ist genau ein Befehl durch Kern und Speicher (A5). Ganz geladen wird ein LV nur für Umbenennen und Löschen.

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { LeistungsverzeichnisId, LvUebersicht, LvZustand } from '@tethys/vertrag';
import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { auftragPfad } from '../auftrag/ziel';
import { texte as htexte } from '../historie/texte';
import { befehlswegFuer, type Ausgang } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { STANDARD_MASKE_TEXT, ozMaskeLesen } from '../lv/ozmaske';
import { texte as lvTexte } from '../lv/texte';
import { formatiereProzentDe, zahlLesen } from '../lv/zahlen';
import { NachtragKennzeichen } from '../nachtrag/NachtragKennzeichen'; // Ticket 86
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Verweis } from '../ui/Verweis';
import { preisspiegelPfad } from '../vergabe/pfad';
import { texte as vorlageTexte } from '../vorlage/texte'; // Ticket 90
import { STANDARD_MWST, lvAnlegenBefehl } from './befehle';
import { FormDialog } from './FormDialog';
import { LvNetto } from './LvNetto';
import { auftragZu, type Projektstand } from './stand';
import { texte } from './texte';

export function lvPfad(id: LeistungsverzeichnisId): string {
  return `/lv/${id}`;
}

/** Konflikt des Speichers beim Löschen (abhängige Aggregate) als verständliche Meldung, sonst wie überall. */
export function useLoeschMeldung(): (a: Ausgang<unknown>, konflikt: string) => boolean {
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  return (a, konflikt) => {
    if (!a.ok && a.abweisung.art === 'speicher' && a.abweisung.fehler.code === 'konflikt') {
      zeige({ titel: lvTexte.meldungen.nichtGespeichert, beschreibung: konflikt, art: 'fehler' });
      return false;
    }
    return pruefe(a);
  };
}

export function LvAbschnitt({
  stand,
  neuLaden,
  gehe,
}: {
  stand: Projektstand;
  neuLaden: () => void;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe, speicherfehler } = useMeldungen();
  const loeschMeldung = useLoeschMeldung();
  const weg = befehlswegFuer(u);
  const { projekt, lvs } = stand;
  // --- LV umbenennen und löschen (Ticket 48, Punkt 5) ---------------------------------------------------------------
  const [umbenennen, setUmbenennen] = useState<{ lv: LvUebersicht; name: string } | null>(null);
  const [loeschen, setLoeschen] = useState<LvZustand | null>(null);
  // --- LV anlegen -----------------------------------------------------------------------------------------------
  const [lvName, setLvName] = useState('');
  const [maske, setMaske] = useState(STANDARD_MASKE_TEXT);
  const [mwst, setMwst] = useState(formatiereProzentDe(STANDARD_MWST));
  const [lvMeldung, setLvMeldung] = useState<{ feld: 'name' | 'maske' | 'mwst'; text: string } | null>(null);

  /** Das ganze LV für Umbenennen und Löschen, frisch aus dem Speicher; `null` mit Meldung, wenn es nicht geht. */
  const lvLaden = async (lvId: LeistungsverzeichnisId): Promise<LvZustand | null> => {
    const r = await u.speicher.leistungsverzeichnisse.laden(lvId);
    if (r.ok) return r.wert;
    speicherfehler(r.fehler, texte.lvs.ladeFehler);
    return null;
  };

  const lvUmbenennen = async (): Promise<void> => {
    if (umbenennen === null) return;
    const zustand = await lvLaden(umbenennen.lv.id);
    if (zustand === null) return;
    const a = await weg.lv(projekt.id, zustand).befehl({
      art: 'LeistungsverzeichnisUmbenennen',
      name: umbenennen.name.trim(),
    });
    if (!pruefe(a)) return;
    setUmbenennen(null);
    neuLaden();
  };

  const lvLoeschen = async (): Promise<void> => {
    if (loeschen === null) return;
    const lv = loeschen;
    setLoeschen(null);
    const a = await weg.lv(projekt.id, lv).befehl({ art: 'LeistungsverzeichnisLoeschen' });
    if (loeschMeldung(a, htexte.loeschen.lvKonflikt)) neuLaden();
  };

  const lvAnlegen = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (lvName.trim() === '') {
      setLvMeldung({ feld: 'name', text: texte.lvAnlegen.nameFehlt });
      return;
    }
    const m = ozMaskeLesen(maske);
    if (!m.ok) {
      setLvMeldung({ feld: 'maske', text: m.fehler });
      return;
    }
    const satz = zahlLesen('prozent', mwst);
    if (!satz.ok) {
      setLvMeldung({ feld: 'mwst', text: satz.fehler });
      return;
    }
    const befehl = lvAnlegenBefehl(u.ids, projekt.id, lvName.trim(), m.wert, satz.wert);
    const a = await weg.lv(projekt.id, null).befehl(befehl);
    if (pruefe(a)) gehe(lvPfad(befehl.id));
  };

  const meldung = (feld: 'name' | 'maske' | 'mwst') =>
    lvMeldung?.feld === feld ? { meldung: lvMeldung.text } : {};

  return (
    <section className="projekt__abschnitt" aria-labelledby="projekt-lvs">
      <h2 id="projekt-lvs">{texte.lvs.titel}</h2>
      {lvs.length === 0 ? (
        <p>{texte.lvs.leer}</p>
      ) : (
        <ul className="projekt__liste" aria-label={texte.lvs.tabelle}>
          {lvs.map((lv) => {
            const angebote = stand.angebote.get(lv.id) ?? 0;
            const auftrag = auftragZu(stand, lv.id);
            return (
              <li key={lv.id}>
                <Verweis pfad={lvPfad(lv.id)} text={lv.name} gehe={gehe} />
                <NachtragKennzeichen nachtrag={lv.nachtrag} /> {/* Ticket 86 */}
                {/* Ticket 90: Kennzeichen Muster-LV */}
                {lv.vorlage === true ? (
                  <span className="projekt__kennzeichen" data-testid="kennzeichen-vorlage">
                    {vorlageTexte.kennzeichen}
                  </span>
                ) : null}
                <LvNetto name={lv.name} netto={lv.nettoNachNachlass} />
                {lv.vorlage === true ? null : (
                  <span className="projekt__vergabe">
                    {texte.uebersicht.angebote(angebote)}
                    {angebote > 0 ? (
                      <>
                        {' · '}
                        <Verweis
                          pfad={preisspiegelPfad(lv.id)}
                          text={texte.uebersicht.preisspiegel}
                          aria-label={texte.uebersicht.preisspiegelVon(lv.name)}
                          gehe={gehe}
                        />
                      </>
                    ) : null}
                    {' · '}
                    {auftrag === null ? (
                      texte.uebersicht.keinZuschlag
                    ) : (
                      <Verweis
                        pfad={auftragPfad(projekt.id, auftrag.id)}
                        text={texte.uebersicht.zuschlag}
                        aria-label={texte.uebersicht.von(texte.uebersicht.zuschlag, lv.name)}
                        gehe={gehe}
                      />
                    )}
                  </span>
                )}
                <Button
                  groesse="sm"
                  aria-label={`${texte.lvs.umbenennen}: ${lv.name}`}
                  onClick={() => {
                    setUmbenennen({ lv, name: lv.name });
                  }}
                >
                  {texte.lvs.umbenennen}
                </Button>
                <Button
                  groesse="sm"
                  variante="gefahr"
                  aria-label={`${htexte.loeschen.lvKnopf}: ${lv.name}`}
                  onClick={() => {
                    void lvLaden(lv.id).then((z) => {
                      if (z !== null) setLoeschen(z);
                    });
                  }}
                >
                  {htexte.loeschen.lvKnopf}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="projekt__formular"
        onSubmit={(e) => void lvAnlegen(e)}
        aria-label={texte.lvAnlegen.titel}
      >
        <h3>{texte.lvAnlegen.titel}</h3>
        <div className="projekt__felder">
          <Eingabefeld
            label={texte.lvAnlegen.name}
            value={lvName}
            onWertChange={(w) => {
              setLvName(w);
              setLvMeldung(null);
            }}
            {...meldung('name')}
          />
          <Eingabefeld
            label={texte.lvAnlegen.maske}
            value={maske}
            hinweis={texte.lvAnlegen.maskeHinweis}
            onWertChange={(w) => {
              setMaske(w);
              setLvMeldung(null);
            }}
            {...meldung('maske')}
          />
          <Eingabefeld
            label={texte.lvAnlegen.mwst}
            value={mwst}
            onWertChange={(w) => {
              setMwst(w);
              setLvMeldung(null);
            }}
            {...meldung('mwst')}
          />
          <Button type="submit" variante="primaer">
            {texte.lvAnlegen.knopf}
          </Button>
        </div>
      </form>
      <Dialog
        offen={loeschen !== null}
        onOffenChange={(o) => {
          if (!o) setLoeschen(null);
        }}
        titel={htexte.loeschen.lvTitel}
        fuss={
          <>
            <Button
              onClick={() => {
                setLoeschen(null);
              }}
            >
              {htexte.loeschen.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={() => void lvLoeschen()}>
              {htexte.loeschen.bestaetigen}
            </Button>
          </>
        }
      >
        <p>
          {loeschen === null
            ? null
            : htexte.loeschen.lvFrage(
                loeschen.leistungsverzeichnis.name,
                loeschen.leistungsverzeichnis.knoten.filter((k) => k.art === 'position').length,
                loeschen.papierkorb?.length ?? 0,
              )}
        </p>
      </Dialog>
      <FormDialog
        offen={umbenennen !== null}
        titel={texte.lvs.umbenennenTitel}
        onSchliessen={() => {
          setUmbenennen(null);
        }}
        onSenden={() => void lvUmbenennen()}
      >
        <Eingabefeld
          label={texte.lvs.neuerName}
          value={umbenennen?.name ?? ''}
          onWertChange={(w) => {
            setUmbenennen((s) => (s ? { ...s, name: w } : s));
          }}
        />
      </FormDialog>
    </section>
  );
}
