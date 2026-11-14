// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90 (O3): Druckprofil im Druckdialog wählen, ändern, als eigenes Profil ablegen, löschen, als JSON-Datei
// exportieren und importieren. Die eigenen Profile sind eine Einstellung des Nutzers (D-90.1), nicht des Projekts.
// Eine Änderung der Felder gilt für den Druck, auch ohne zu speichern; Befunde beim Import sperren nie (U5).
// Ticket 150 (E15, D-73): Die eigenen Profile stehen in den Einstellungen des Speichers; jede Änderung ist ein Befehl an den
// Einstellungen mit eigenem Rückgängig (D-82 M1), Löschen fragt vorher (Q5). Der alte Schlüssel des Browserspeichers wird nur
// noch für die Einträge gelesen, die bei der Übernahme nicht als Profil galten.

import type { Druckprofil, DruckprofilBefund } from '@tethys/ausgabe';
import { Auswahl, Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { DateiNichtLesbar, dateiBytes, herunterladen } from '../gaeb/datei';
import {
  EinstellungenKnoepfe,
  useEinstellungen,
  useEinstellungenHistorie,
} from '../historie/EinstellungenAnbieter'; // Ticket 150
import { useMeldungen } from '../lv/meldungen';
import { texte } from './texte';
import {
  PROFILE_SCHLUESSEL,
  PROFIL_GEWAEHLT_SCHLUESSEL,
  ablageAlsText,
  ablageLesen,
  alleProfile,
  dateinameProfil,
  istStandardName,
  dateinameZurueck,
  profilAendern,
  profilAnlegen,
  profilGleich,
  profilImportieren,
  profilNachLoeschen,
  standardProfil,
  zurueckAlsDatei,
  zurueckNichtLesbar,
  zeilenLesen,
  type Werkzeug,
  type Zurueckgehalten,
} from './profile';

const t = texte.pdf.profil;

function lesen(schluessel: string): string | null {
  try {
    return window.localStorage.getItem(schluessel);
  } catch {
    return null;
  }
}
function schreiben(schluessel: string, wert: string): void {
  try {
    window.localStorage.setItem(schluessel, wert);
  } catch {
    // Speicher gesperrt: das Profil gilt nur für diese Sitzung.
  }
}

export interface ProfilAnfang {
  /** Einträge im alten Browserspeicher, die nicht als Profil gelten; sie bleiben dort erhalten (Q5). */
  readonly zurueck: readonly Zurueckgehalten[];
  readonly name: string;
  readonly arbeit: Druckprofil;
}

/** Die eigenen Profile der Einstellungen; ein Name eines Standardprofils gilt nicht (die App legt keines so an). */
export const eigeneProfile = (w: Werkzeug, profile: readonly Druckprofil[]): Druckprofil[] =>
  profile.filter((p) => !istStandardName(w, p.name));

/**
 * Anfangsstand: die zuletzt gewählte Profilauswahl, sonst „Auftrags-LV mit Preisen“ (= Druck wie bisher). `profile`: die
 * eigenen Druckprofile der Einstellungen.
 */
export function profilAnfang(w: Werkzeug, profile: readonly Druckprofil[]): ProfilAnfang {
  const { zurueck } = ablageLesen(w, lesen(PROFILE_SCHLUESSEL));
  const alle = alleProfile(w, eigeneProfile(w, profile));
  const name = lesen(PROFIL_GEWAEHLT_SCHLUESSEL);
  const wahl = alle.find((p) => p.name === name) ?? w.STANDARD_DRUCKPROFILE[2] ?? alle[0];
  if (wahl === undefined) throw new Error('Kein Standardprofil vorhanden.');
  return { zurueck, name: wahl.name, arbeit: wahl };
}

export interface DruckProfilFeldProps {
  readonly werkzeug: Werkzeug;
  readonly anfang: ProfilAnfang;
  readonly arbeit: Druckprofil;
  readonly onArbeit: (p: Druckprofil) => void;
  readonly gesperrt: boolean;
}

export function DruckProfilFeld({
  werkzeug: w,
  anfang,
  arbeit,
  onArbeit,
  gesperrt,
}: DruckProfilFeldProps): ReactElement {
  const { zeige } = useToast();
  const { pruefe } = useMeldungen();
  const einstellungen = useEinstellungen();
  const historie = useEinstellungenHistorie();
  const [zurueck, setZurueck] = useState<readonly Zurueckgehalten[]>(anfang.zurueck);
  const [entfernenFrage, setEntfernenFrage] = useState(false);
  const [loeschenFrage, setLoeschenFrage] = useState(false);
  const eigene = eigeneProfile(w, einstellungen.zustand.druckprofile);
  const [gewaehlt, setGewaehlt] = useState(anfang.name);
  const [neuerName, setNeuerName] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [befunde, setBefunde] = useState<readonly DruckprofilBefund[]>([]);
  const [zeilenText, setZeilenText] = useState(
    arbeit.langtext.art === 'zeilen' ? String(arbeit.langtext.anzahl) : '3',
  );
  const datei = useRef<HTMLInputElement>(null);
  // Ticket 162: Solange das Löschen gespeichert wird, warten die Felder; danach steht der Fokus auf der Profilauswahl.
  const [loeschtGerade, setLoeschtGerade] = useState(false);
  const [fokusAufAuswahl, setFokusAufAuswahl] = useState(false);
  const auswahlZeile = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!fokusAufAuswahl || gesperrt || loeschtGerade) return;
    auswahlZeile.current?.querySelector<HTMLElement>('[role="combobox"]')?.focus();
    setFokusAufAuswahl(false);
  }, [fokusAufAuswahl, gesperrt, loeschtGerade]);

  const alle = alleProfile(w, eigene);
  const vorlage = alle.find((p) => p.name === gewaehlt);
  const istEigen = eigene.some((p) => p.name === gewaehlt);
  const geaendert = vorlage !== undefined && !profilGleich(vorlage, arbeit);
  const zeilenOk = arbeit.langtext.art !== 'zeilen' || zeilenLesen(zeilenText) !== null;

  /** Legt ein Profil in den Einstellungen ab (ersetzt eines gleichen Namens); `true`, wenn es gespeichert ist. */
  const merke = async (druckprofil: Druckprofil): Promise<boolean> =>
    pruefe(await einstellungen.sitzung.befehl({ art: 'DruckprofilSetzen', druckprofil }));
  const uebernehme = (p: Druckprofil): void => {
    setGewaehlt(p.name);
    schreiben(PROFIL_GEWAEHLT_SCHLUESSEL, p.name);
    onArbeit(p);
    if (p.langtext.art === 'zeilen') setZeilenText(String(p.langtext.anzahl));
  };
  const waehle = (name: string): void => {
    const p = alle.find((x) => x.name === name);
    if (p === undefined) return;
    uebernehme(p);
    setFehler(null);
    setBefunde([]);
  };
  const aendere = (teil: Partial<Druckprofil>): void => {
    onArbeit({ ...arbeit, ...teil });
  };

  // Ein Rückgängig der Einstellungen kann das gewählte Profil entfernen: dann gilt wieder das Standardprofil.
  const fehlt = vorlage === undefined;
  useEffect(() => {
    if (!fehlt) return;
    uebernehme(standardProfil(w));
    // Nur, wenn das gewählte Profil verschwindet.
  }, [fehlt]);

  const speichern = async (): Promise<void> => {
    const r = profilAendern(w, eigene, arbeit);
    if (!r.ok) {
      setFehler(t.fehler[r.fehler]);
      return;
    }
    if (!(await merke(arbeit))) return;
    setFehler(null);
    zeige({ titel: t.gespeichert(arbeit.name), art: 'erfolg' });
  };
  const speichernUnter = async (): Promise<void> => {
    const r = profilAnlegen(w, eigene, { ...arbeit, name: neuerName });
    if (!r.ok) {
      setFehler(t.fehler[r.fehler]);
      return;
    }
    const name = neuerName.trim();
    if (!(await merke({ ...arbeit, name }))) return;
    uebernehme({ ...arbeit, name });
    setNeuerName('');
    setFehler(null);
    zeige({ titel: t.gespeichert(name), art: 'erfolg' });
  };
  // Ticket 121 (D-92.6, Q5): zurückgehaltene Einträge sichern; entfernen erst nach Bestätigung.
  const zurueckSichern = (): void => {
    herunterladen(dateinameZurueck(), zurueckAlsDatei(zurueck), 'application/json');
  };
  const zurueckEntfernen = (): void => {
    // Nur im alten Browserspeicher; dessen gültige Profile bleiben dort stehen (die alten Schlüssel bleiben, D-73).
    schreiben(PROFILE_SCHLUESSEL, ablageAlsText(ablageLesen(w, lesen(PROFILE_SCHLUESSEL)).eigene, []));
    setZurueck([]);
    setEntfernenFrage(false);
    zeige({ titel: t.zurueckEntfernt, art: 'erfolg' });
  };
  // Ticket 162 (U3): Die Auswahl wechselt sofort auf das nächste Profil (sonst das Standardprofil), und die Felder warten,
  // bis das Löschen gespeichert ist. Vorher ließ sich die Liste öffnen, solange das gelöschte Profil noch gewählt war: Es
  // hielt den Fokus und nahm ihn beim Verschwinden mit; die Meldung danach fing zudem Escape ab.
  const loeschen = async (): Promise<void> => {
    setLoeschenFrage(false);
    const name = gewaehlt;
    const vorher = arbeit;
    uebernehme(profilNachLoeschen(w, eigene, name));
    setLoeschtGerade(true);
    try {
      const a = await einstellungen.sitzung.befehl({ art: 'DruckprofilEntfernen', name });
      if (!pruefe(a)) {
        uebernehme(vorher);
        return;
      }
      zeige({ titel: t.geloescht(name), art: 'erfolg' });
    } finally {
      setLoeschtGerade(false);
      setFokusAufAuswahl(true);
    }
  };
  const importieren = async (f: File): Promise<void> => {
    let text: string;
    try {
      text = new TextDecoder().decode(await dateiBytes(f));
    } catch (e) {
      if (!(e instanceof DateiNichtLesbar)) throw e;
      setFehler(t.nichtLesbar);
      return;
    }
    const r = profilImportieren(w, eigene, text);
    setBefunde(r.befunde);
    if (r.profil === null) return;
    if (!(await merke(r.profil))) return;
    uebernehme(r.profil);
    setFehler(null);
    zeige({
      titel: t.importiert(r.profil.name),
      ...(r.umbenannt ? { beschreibung: t.umbenannt(r.profil.name) } : {}),
      art: 'erfolg',
    });
  };

  const schalter = (feld: 'titelsummen' | 'schlussblock' | 'deckblatt', label: string): ReactElement => (
    <label className="lv__option">
      <input
        type="checkbox"
        checked={arbeit[feld]}
        disabled={!arbeit.mitPreisen && feld !== 'deckblatt'}
        onChange={(e) => {
          aendere({ [feld]: e.target.checked });
        }}
      />
      {label}
    </label>
  );

  return (
    // Ticket 150: Strg+Z und Strg+Y gelten hier dem Rückgängig der Einstellungen (D-82 M1).
    <fieldset className="gaeb__profil" disabled={gesperrt || loeschtGerade} onKeyDown={historie.tasten}>
      <div className="gaeb__auswahl" ref={auswahlZeile}>
        <Auswahl
          label={t.auswahl}
          optionen={alle.map((p) => ({ wert: p.name, label: p.name }))}
          wert={gewaehlt}
          onWertChange={waehle}
        />
        <Auswahl
          label={texte.pdf.preise}
          optionen={[
            { wert: 'mit', label: texte.pdf.mitPreisen },
            { wert: 'ohne', label: texte.pdf.ohnePreisen },
          ]}
          wert={arbeit.mitPreisen ? 'mit' : 'ohne'}
          onWertChange={(x) => {
            aendere({ mitPreisen: x === 'mit' });
          }}
        />
        <Auswahl
          label={t.langtext}
          optionen={[
            { wert: 'voll', label: t.langtextVoll },
            { wert: 'kein', label: t.langtextKein },
            { wert: 'zeilen', label: t.langtextZeilen },
          ]}
          wert={arbeit.langtext.art}
          onWertChange={(x) => {
            if (x === 'voll') aendere({ langtext: { art: 'voll' } });
            else if (x === 'kein') aendere({ langtext: { art: 'kein' } });
            else aendere({ langtext: { art: 'zeilen', anzahl: zeilenLesen(zeilenText) ?? 3 } });
          }}
        />
        {arbeit.langtext.art === 'zeilen' ? (
          <Eingabefeld
            label={t.zeilen}
            value={zeilenText}
            onWertChange={(x) => {
              setZeilenText(x);
              const n = zeilenLesen(x);
              if (n !== null) aendere({ langtext: { art: 'zeilen', anzahl: n } });
            }}
            {...(zeilenOk ? {} : { meldung: t.zeilenFehler })}
          />
        ) : null}
        <Auswahl
          label={t.seitenrand}
          optionen={[
            { wert: 'normal', label: t.randNormal },
            { wert: 'eng', label: t.randEng },
          ]}
          wert={arbeit.seitenrand}
          onWertChange={(x) => {
            aendere({ seitenrand: x === 'eng' ? 'eng' : 'normal' });
          }}
        />
      </div>
      <div className="gaeb__auswahl">
        {schalter('titelsummen', t.titelsummen)}
        {schalter('schlussblock', t.schlussblock)}
        {schalter('deckblatt', t.deckblatt)}
      </div>
      <div className="gaeb__auswahl">
        <Eingabefeld
          label={t.kopfzeile}
          value={arbeit.kopfzeile ?? ''}
          hinweis={t.platzhalter}
          onWertChange={(x) => {
            aendere({ kopfzeile: x === '' ? null : x });
          }}
        />
        <Eingabefeld
          label={t.fusszeile}
          value={arbeit.fusszeile ?? ''}
          onWertChange={(x) => {
            aendere({ fusszeile: x === '' ? null : x });
          }}
        />
      </div>
      {geaendert ? <p>{t.geaendert}</p> : null}
      {!istEigen ? <p>{t.standardHinweis}</p> : null}
      <div className="gaeb__auswahl">
        <Eingabefeld label={t.name} value={neuerName} onWertChange={setNeuerName} />
        <Button disabled={neuerName.trim() === '' || !zeilenOk} onClick={() => void speichernUnter()}>
          {t.speichernUnter}
        </Button>
        <Button disabled={!istEigen || !geaendert || !zeilenOk} onClick={() => void speichern()}>
          {t.speichern}
        </Button>
        <Button
          disabled={!istEigen}
          onClick={() => {
            setLoeschenFrage(true);
          }}
        >
          {t.loeschen}
        </Button>
        <Button
          onClick={() => {
            herunterladen(dateinameProfil(arbeit.name), w.druckprofilAlsJson(arbeit), 'application/json');
          }}
        >
          {t.exportieren}
        </Button>
        <input
          ref={datei}
          type="file"
          accept=".json,application/json"
          className="gaeb__datei"
          aria-label={t.importDatei}
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importieren(f);
          }}
        />
        <Button onClick={() => datei.current?.click()}>{t.importieren}</Button>
        <EinstellungenKnoepfe historie={historie} />
      </div>
      {fehler !== null ? <p role="alert">{fehler}</p> : null}
      {zurueck.length > 0 ? (
        <div role="region" aria-label={t.zurueckgehalten}>
          <ul>
            {zurueck.map((z, i) => (
              <li key={`${z.grund}-${String(i)}`}>
                {z.name === null || z.grund === 'unlesbar'
                  ? t.zurueckGrund.unlesbar
                  : t.zurueckGrund[z.grund](z.name)}
              </li>
            ))}
          </ul>
          <p>{t.zurueckHinweis}</p>
          {zurueckNichtLesbar(zurueck) > 0 ? (
            <p>{t.zurueckNichtLesbar(zurueckNichtLesbar(zurueck))}</p>
          ) : null}
          <Button onClick={zurueckSichern}>{t.zurueckSichern}</Button>
          <Button
            variante="gefahr"
            onClick={() => {
              setEntfernenFrage(true);
            }}
          >
            {t.zurueckEntfernen}
          </Button>
        </div>
      ) : null}
      <Dialog
        offen={entfernenFrage}
        onOffenChange={setEntfernenFrage}
        titel={t.zurueckEntfernenTitel}
        beschreibung={t.zurueckEntfernenFrage(zurueck.length)}
        fuss={
          <>
            <Button
              onClick={() => {
                setEntfernenFrage(false);
              }}
            >
              {texte.pdf.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={zurueckEntfernen}>
              {t.zurueckEntfernenBestaetigen}
            </Button>
          </>
        }
      />
      <Dialog
        offen={loeschenFrage}
        onOffenChange={setLoeschenFrage}
        titel={t.loeschenTitel}
        beschreibung={t.loeschenFrage(gewaehlt)}
        fuss={
          <>
            <Button
              onClick={() => {
                setLoeschenFrage(false);
              }}
            >
              {texte.pdf.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={() => void loeschen()}>
              {t.loeschenBestaetigen}
            </Button>
          </>
        }
      />
      {befunde.length > 0 ? (
        <div role="region" aria-label={t.befunde}>
          <ul>
            {befunde.map((b, i) => (
              <li key={`${b.code}-${b.pfad}-${String(i)}`}>{b.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </fieldset>
  );
}
