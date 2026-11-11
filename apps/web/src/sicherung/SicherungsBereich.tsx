// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingehängt in die Projektliste: nicht sperrende Erinnerung je Projekt mit „Jetzt sichern“ und der Dialog
// „Datensicherung“ (Ordner wählen/entfernen, automatisch an/aus).

import { Button, Dialog } from '@tethys/ui-basis';
import type { ProjektId } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { letzterExportLesen } from './ablage';
import { ERINNERUNG_SCHWELLE_TAGE, erinnerungPruefen } from './regel';
import { useSicherung } from './SicherungsAnbieter';
import { texte } from './texte';
import './sicherung.css';

interface Faellig {
  readonly id: ProjektId;
  readonly name: string;
  readonly tage: number;
}

const TAG_MS = 24 * 60 * 60 * 1000;

/** Projekte, deren Sicherung überfällig ist. Das Befehlsprotokoll wird nur gelesen, wenn die Schwelle überschritten ist. */
function useFaellige(): readonly Faellig[] {
  const u = useUmgebung();
  const { stand } = useSicherung();
  const [faellig, setFaellig] = useState<readonly Faellig[]>([]);

  useEffect(() => {
    let aktiv = true;
    void (async () => {
      const liste = await u.speicher.projekte.auflisten();
      if (!liste.ok) return;
      const jetzt = Date.now();
      const treffer: Faellig[] = [];
      for (const p of liste.wert) {
        const letzter = letzterExportLesen(p.id);
        if (letzter !== null && jetzt - letzter <= ERINNERUNG_SCHWELLE_TAGE * TAG_MS) continue;
        const protokoll = await u.speicher.protokoll(p.id);
        if (!protokoll.ok) continue;
        const r = erinnerungPruefen({
          jetzt,
          letzterExport: letzter,
          befehlszeiten: protokoll.wert.map((e) => Date.parse(e.wann)),
        });
        if (r.faellig) treffer.push({ id: p.id, name: p.name, tage: r.tage });
      }
      treffer.sort((a, b) => a.name.localeCompare(b.name, 'de'));
      if (aktiv) setFaellig(treffer);
    })();
    return () => {
      aktiv = false;
    };
  }, [u, stand]);

  return faellig;
}

function SicherungsDialog({ offen, onSchliessen }: { offen: boolean; onSchliessen: () => void }): ReactElement {
  const s = useSicherung();
  const t = texte.dialog;
  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={t.titel}
      beschreibung={t.beschreibung}
      fuss={<Button onClick={onSchliessen}>{t.schliessen}</Button>}
    >
      {s.ordnerMoeglich ? (
        <div className="sicherung__dialog">
          <h3>{t.ordnerTitel}</h3>
          <p>{s.ordnerName === null ? t.keinOrdner : t.ordnerGewaehlt(s.ordnerName)}</p>
          <div className="sicherung__zeile">
            <Button
              onClick={() => {
                void s.ordnerAuswaehlen();
              }}
            >
              {s.ordnerName === null ? t.ordnerWaehlen : t.ordnerAendern}
            </Button>
            {s.ordnerName !== null ? (
              <Button
                variante="gefahr"
                onClick={() => {
                  void s.ordnerEntfernen();
                }}
              >
                {t.ordnerEntfernen}
              </Button>
            ) : null}
          </div>
          <label className="sicherung__schalter">
            <input
              type="checkbox"
              checked={s.automatisch}
              disabled={s.ordnerName === null}
              onChange={(e) => {
                s.automatischSetzen(e.target.checked);
              }}
            />
            <span>{t.automatisch}</span>
          </label>
          {s.ordnerName === null ? <p className="sicherung__leise">{t.automatischOhneOrdner}</p> : null}
        </div>
      ) : (
        <p>{t.keinOrdner}</p>
      )}
    </Dialog>
  );
}

export function SicherungsBereich(): ReactElement {
  const s = useSicherung();
  const faellige = useFaellige();
  const [dialog, setDialog] = useState(false);

  return (
    <div className="sicherung">
      {faellige.length > 0 ? (
        <ul className="sicherung__erinnerungen" aria-label={texte.erinnerung.bereich}>
          {faellige.map((p) => (
            <li key={p.id} role="status" className="sicherung__erinnerung">
              <span>{texte.erinnerung.text(p.name, p.tage)}</span>
              <Button
                variante="primaer"
                aria-label={texte.erinnerung.jetztSichernFuer(p.name)}
                onClick={() => {
                  void s.sichern(p);
                }}
              >
                {texte.erinnerung.jetztSichern}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        onClick={() => {
          setDialog(true);
        }}
      >
        {texte.dialog.knopf}
      </Button>
      <SicherungsDialog
        offen={dialog}
        onSchliessen={() => {
          setDialog(false);
        }}
      />
    </div>
  );
}
