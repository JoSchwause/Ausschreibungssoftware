// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90 (O3): Druckprofil im Druckdialog wählen, ändern, als eigenes Profil ablegen, löschen, als JSON-Datei
// exportieren und importieren. Die eigenen Profile sind eine Einstellung des Nutzers (D-90.1), nicht des Projekts.
// Eine Änderung der Felder gilt für den Druck, auch ohne zu speichern; Befunde beim Import sperren nie (U5).

import type { Druckprofil, DruckprofilBefund } from '@tethys/ausgabe';
import { Auswahl, Button, Eingabefeld, useToast } from '@tethys/ui-basis';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { DateiNichtLesbar, dateiBytes, herunterladen } from '../gaeb/datei';
import { texte } from './texte';
import {
  PROFILE_SCHLUESSEL,
  PROFIL_GEWAEHLT_SCHLUESSEL,
  ablageAlsText,
  ablageLesen,
  alleProfile,
  dateinameProfil,
  profilAendern,
  profilAnlegen,
  profilGleich,
  profilImportieren,
  profilLoeschen,
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
  readonly eigene: Druckprofil[];
  /** Gespeicherte Einträge, die nicht gelten; sie bleiben beim Schreiben erhalten (Q5). */
  readonly zurueck: readonly Zurueckgehalten[];
  readonly name: string;
  readonly arbeit: Druckprofil;
}

/** Anfangsstand: die zuletzt gewählte Profilauswahl, sonst „Auftrags-LV mit Preisen“ (= Druck wie bisher). */
export function profilAnfang(w: Werkzeug): ProfilAnfang {
  const { eigene, zurueck } = ablageLesen(w, lesen(PROFILE_SCHLUESSEL));
  const alle = alleProfile(w, eigene);
  const name = lesen(PROFIL_GEWAEHLT_SCHLUESSEL);
  const wahl = alle.find((p) => p.name === name) ?? w.STANDARD_DRUCKPROFILE[2] ?? alle[0];
  if (wahl === undefined) throw new Error('Kein Standardprofil vorhanden.');
  return { eigene, zurueck, name: wahl.name, arbeit: wahl };
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
  const [eigene, setEigene] = useState<Druckprofil[]>(anfang.eigene);
  const [gewaehlt, setGewaehlt] = useState(anfang.name);
  const [neuerName, setNeuerName] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [befunde, setBefunde] = useState<readonly DruckprofilBefund[]>([]);
  const [zeilenText, setZeilenText] = useState(
    arbeit.langtext.art === 'zeilen' ? String(arbeit.langtext.anzahl) : '3',
  );
  const datei = useRef<HTMLInputElement>(null);

  const alle = alleProfile(w, eigene);
  const vorlage = alle.find((p) => p.name === gewaehlt);
  const istEigen = eigene.some((p) => p.name === gewaehlt);
  const geaendert = vorlage !== undefined && !profilGleich(vorlage, arbeit);
  const zeilenOk = arbeit.langtext.art !== 'zeilen' || zeilenLesen(zeilenText) !== null;

  const merke = (neu: Druckprofil[]): void => {
    setEigene(neu);
    schreiben(PROFILE_SCHLUESSEL, ablageAlsText(neu, anfang.zurueck));
  };
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

  const speichern = (): void => {
    const r = profilAendern(w, eigene, arbeit);
    if (!r.ok) {
      setFehler(t.fehler[r.fehler]);
      return;
    }
    merke(r.eigene);
    setFehler(null);
    zeige({ titel: t.gespeichert(arbeit.name), art: 'erfolg' });
  };
  const speichernUnter = (): void => {
    const r = profilAnlegen(w, eigene, { ...arbeit, name: neuerName });
    if (!r.ok) {
      setFehler(t.fehler[r.fehler]);
      return;
    }
    const name = neuerName.trim();
    merke(r.eigene);
    uebernehme({ ...arbeit, name });
    setNeuerName('');
    setFehler(null);
    zeige({ titel: t.gespeichert(name), art: 'erfolg' });
  };
  const loeschen = (): void => {
    const name = gewaehlt;
    merke(profilLoeschen(eigene, name));
    const standard = w.STANDARD_DRUCKPROFILE[2] ?? w.STANDARD_DRUCKPROFILE[0];
    if (standard !== undefined) uebernehme(standard);
    zeige({ titel: t.geloescht(name), art: 'erfolg' });
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
    merke(r.eigene);
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
    <fieldset className="gaeb__profil" disabled={gesperrt}>
      <div className="gaeb__auswahl">
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
        <Button disabled={neuerName.trim() === '' || !zeilenOk} onClick={speichernUnter}>
          {t.speichernUnter}
        </Button>
        <Button disabled={!istEigen || !geaendert || !zeilenOk} onClick={speichern}>
          {t.speichern}
        </Button>
        <Button disabled={!istEigen} onClick={loeschen}>
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
      </div>
      {fehler !== null ? <p role="alert">{fehler}</p> : null}
      {anfang.zurueck.length > 0 ? (
        <div role="region" aria-label={t.zurueckgehalten}>
          <ul>
            {anfang.zurueck.map((z, i) => (
              <li key={`${z.grund}-${String(i)}`}>
                {z.name === null || z.grund === 'unlesbar'
                  ? t.zurueckGrund.unlesbar
                  : t.zurueckGrund[z.grund](z.name)}
              </li>
            ))}
          </ul>
          <p>{t.zurueckHinweis}</p>
        </div>
      ) : null}
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
