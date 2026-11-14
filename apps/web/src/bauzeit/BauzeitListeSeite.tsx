// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/bauzeit` (Ticket 118): die Bauzeitenpläne des Projekts, anlegen, öffnen. Jede Änderung ist ein Befehl
// durch `bauzeit` und Speicher (A5, U7).

import { STANDARD_ARBEITSTAGE } from '@tethys/bauzeit';
import { Button } from '@tethys/ui-basis';
import type { BauzeitenplanUebersicht, Projekt, ProjektId } from '@tethys/vertrag';
import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { datumDe } from '../lv/kopfdaten';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Ladeansicht, useSeitenladen } from '../ui/seite';
import { Verweis } from '../ui/Verweis';
import { planAnlegenBefehl, type Feldfehler, type Kopfentwurf } from './befehle';
import { KopfFelder } from './KopfFelder';
import { bauzeitenplanPfad } from './pfad';
import { bauzeitenplaeneAuflisten, bauzeitenplanSitzung } from './schreiben';
import { texte } from './texte';
import '../lv/lv.css';
import './bauzeit.css';

const LEER: Kopfentwurf = {
  name: '',
  projektbeginn: '',
  arbeitstage: STANDARD_ARBEITSTAGE,
  bundesland: null,
  freieTage: '',
};

export function BauzeitListeSeite({
  projektId,
  gehe,
}: {
  projektId: ProjektId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const [entwurf, setEntwurf] = useState<Kopfentwurf>(LEER);
  const [fehler, setFehler] = useState<readonly Feldfehler[]>([]);
  const t = texte.liste;

  // Undo und Redo können Pläne anlegen, ändern oder löschen: das Gerüst lädt neu.
  const { lage } = useSeitenladen(
    async ({
      speicher,
    }): Promise<{ projekt: Projekt; plaene: readonly BauzeitenplanUebersicht[] } | null> => {
      const p = await speicher.projekte.laden(projektId);
      const b = await bauzeitenplaeneAuflisten(speicher, projektId);
      return p.ok && b.ok ? { projekt: p.wert, plaene: b.wert } : null;
    },
    [projektId],
  );

  if (lage.art !== 'da') return <Ladeansicht lage={lage} laden={t.laden} nichtGefunden={t.nichtGefunden} />;
  const { projekt, plaene } = lage.wert;

  const anlegen = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    const b = planAnlegenBefehl(u.ids, projekt.id, entwurf);
    if (!b.ok) {
      setFehler(b.fehler);
      return;
    }
    setFehler([]);
    const a = await bauzeitenplanSitzung(u, projekt.id, null).befehl(b.wert);
    if (pruefe(a)) gehe(bauzeitenplanPfad(projekt.id, b.wert.bauzeitenplan.id));
  };

  return (
    <div className="seite projekt bauzeit">
      <div className="lv__kopf">
        <h1>{t.titel(projekt.name)}</h1>
        <Verweis pfad={`/projekt/${projekt.id}`} text={t.zumProjekt} gehe={gehe} />
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={t.werkzeuge}>
        <HistorieKnoepfe />
      </div>
      {plaene.length === 0 ? (
        <p>{t.leer}</p>
      ) : (
        <ul className="projekt__liste" aria-label={t.liste}>
          {plaene.map((b) => (
            <li key={b.id}>
              <Verweis pfad={bauzeitenplanPfad(projekt.id, b.id)} text={b.name} gehe={gehe} />
              <span>{t.beginnAb(datumDe(b.projektbeginn))}</span>
            </li>
          ))}
        </ul>
      )}
      <h2>{t.anlegenTitel}</h2>
      <form className="bauzeit__formular" onSubmit={(e) => void anlegen(e)} aria-label={t.anlegenTitel}>
        <KopfFelder entwurf={entwurf} onEntwurf={setEntwurf} fehler={fehler} />
        <Button type="submit" variante="primaer">
          {t.anlegen}
        </Button>
      </form>
    </div>
  );
}
