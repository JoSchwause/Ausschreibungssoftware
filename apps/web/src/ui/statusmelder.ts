// SPDX-License-Identifier: AGPL-3.0-or-later
// Meldet den Stand der Statuszeile (Ticket 147, B-30) an die Hülle: Steht unterhalb von Speicher und Sicherung (gerufen aus
// `OrtLader`), weil die Hülle selbst keinen Speicher sieht. Fragt einmal je Speicher dauerhaften Speicher an (Spec §9,
// `speicher.persistenzstatus()`) und liest die Zeitpunkte der Sicherungen neu, sobald gesichert wurde oder sich die
// Projektliste ändern kann.

import { useEffect, useState } from 'react';
import { befehlswegFuer, nachJedemEintrag } from '../lv/befehlsweg';
import { letzterExportLesen } from '../sicherung/ablage';
import { useSicherung } from '../sicherung/SicherungsAnbieter';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { statuszeile } from './statuszeile';

export function useStatusmeldung(): void {
  const u = useUmgebung();
  const { stand } = useSicherung();
  const [lauf, setLauf] = useState(0);

  useEffect(() => {
    let aktiv = true;
    void u.speicher.persistenzstatus().then((s) => {
      if (aktiv) statuszeile.melden({ dauerhaft: s.persistent });
    });
    return () => {
      aktiv = false;
    };
  }, [u]);

  // Projekte entstehen, heißen um und verschwinden mit Befehlen am Projekt und mit Rückgängig/Wiederholen.
  useEffect(() => {
    const neu = (): void => {
      setLauf((n) => n + 1);
    };
    const ab1 = nachJedemEintrag(u, (e) => {
      if (e.aggregat.art === 'projekt') neu();
    });
    const ab2 = befehlswegFuer(u).beiHistorie(neu);
    return () => {
      ab1();
      ab2();
    };
  }, [u]);

  // `stand` zählt hoch, wenn die Sicherung einen Zeitpunkt vermerkt hat (auch beim automatischen Sichern).
  useEffect(() => {
    let aktiv = true;
    void u.speicher.projekte.auflisten().then((r) => {
      if (!aktiv || !r.ok) return;
      statuszeile.melden({
        sicherungen: r.wert.map((p) => ({ id: p.id, name: p.name, zeit: letzterExportLesen(p.id) })),
      });
    });
    return () => {
      aktiv = false;
    };
  }, [u, stand, lauf]);
}
