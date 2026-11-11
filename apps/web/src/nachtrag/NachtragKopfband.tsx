// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86: Kopfband auf der LV-Seite eines Nachtrags-LV: „Nachtrag N01 zu <Auftrags-LV> · Status“ mit Link zurück,
// Statuswahl (angemeldet, angeboten, abgelehnt; `beauftragt` nur über „Beauftragen“) und „Beauftragen“. Der Status ist ein
// Befehl der Sitzung des LV (A5, ein Undo-Schritt). Einen Zuschlag gibt es für ein Nachtrags-LV nicht (D-42).

import { Auswahl, Button } from '@tethys/ui-basis';
import type { LvZustand, Nachtragsangaben, Nachtragsstatus } from '@tethys/vertrag';
import { useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { Verweis } from '../auftrag/Verweis';
import { auftragPfad } from '../auftrag/ziel';
import type { LvSitzung } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { BeauftragenDialog, type Beauftragungsziel } from './BeauftragenDialog';
import { texte } from './texte';
import './nachtrag.css';

const t = texte.band;
const WAEHLBAR: readonly Nachtragsstatus[] = ['angemeldet', 'angeboten', 'abgelehnt'];

export function NachtragKopfband({
  sitzung,
  zustand,
  nachtrag,
  gehe,
}: {
  sitzung: LvSitzung;
  zustand: LvZustand;
  nachtrag: Nachtragsangaben;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const hinweisId = useId();
  const lv = zustand.leistungsverzeichnis;
  const [auftragName, setAuftragName] = useState<string | null>(null);
  const [ziel, setZiel] = useState<Beauftragungsziel | null>(null);

  // Nur der Name des Auftrags-LV: aus der Übersicht, ohne es ganz zu laden.
  useEffect(() => {
    let aktiv = true;
    void u.speicher.auftragsLeistungsverzeichnisse.auflisten(lv.projektId).then((r) => {
      if (!aktiv) return;
      setAuftragName(r.ok ? (r.wert.find((a) => a.id === nachtrag.auftragsLvId)?.name ?? null) : null);
    });
    return () => {
      aktiv = false;
    };
  }, [u, lv.projektId, nachtrag.auftragsLvId]);

  const statusSetzen = async (status: Nachtragsstatus): Promise<void> => {
    if (status === nachtrag.status) return;
    pruefe(await sitzung.befehl({ art: 'NachtragsangabenSetzen', nachtrag: { ...nachtrag, status } }));
  };

  const beauftragbar = nachtrag.status === 'angemeldet' || nachtrag.status === 'angeboten';
  const pfad = auftragPfad(lv.projektId, nachtrag.auftragsLvId);
  return (
    <section className="nachtrag__band" aria-label={t.beschriftung}>
      <p>
        <strong>{t.titel(nachtrag.nummer)}</strong> {t.zu}{' '}
        <Verweis pfad={pfad} text={auftragName ?? t.ohneAuftrag} gehe={gehe} /> ·{' '}
        <span data-testid="nachtrag-status">{texte.status[nachtrag.status]}</span>
      </p>
      <Auswahl
        label={t.status}
        kompakt
        wert={nachtrag.status}
        optionen={[
          ...WAEHLBAR.map((s) => ({ wert: s, label: texte.status[s] })),
          { wert: 'beauftragt', label: t.beauftragtNur, deaktiviert: true },
        ]}
        onWertChange={(w) => void statusSetzen(w as Nachtragsstatus)}
      />
      <Button
        variante="primaer"
        disabled={!beauftragbar}
        {...(beauftragbar ? {} : { 'aria-describedby': hinweisId })}
        onClick={() => {
          setZiel({ auftragsLvId: nachtrag.auftragsLvId, nachtragsLvId: lv.id, nummer: nachtrag.nummer });
        }}
      >
        {t.beauftragen}
      </Button>
      {beauftragbar ? null : (
        <p id={hinweisId} className="auftrag__leise">
          {nachtrag.status === 'beauftragt' ? t.istBeauftragt : t.istAbgelehnt}
        </p>
      )}
      <BeauftragenDialog
        ziel={ziel}
        sitzung={sitzung}
        onSchliessen={() => {
          setZiel(null);
        }}
        onBeauftragt={(z) => {
          setZiel(null);
          gehe(auftragPfad(lv.projektId, z.auftragsLvId));
        }}
      />
    </section>
  );
}
