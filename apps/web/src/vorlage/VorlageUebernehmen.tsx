// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90 (C5): „Aus Vorlage übernehmen…“ auf der LV-Seite. Alle Muster-LVs aller Projekte (aus `LvUebersicht.vorlage`,
// D-43, ohne jedes LV zu laden), Positionen und Gliederungen wählen, Übernahme mit neuen Kennungen als **ein**
// `KnotenEinfuegen` (K9): ein Undo-Schritt. Das Muster-LV selbst wird nie verändert (A5, Q5).

import { Auswahl, Button, Dialog, useToast } from '@tethys/ui-basis';
import type { KnotenId, LvBefehl, LvZustand } from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import {
  auswahlUmschalten,
  baumZeilen,
  einfuegeOrt,
  uebernahmeBauen,
  vorlagenAus,
  type VorlageEintrag,
} from './logik';
import { texte } from './texte';
import '../gaeb/gaeb.css';

const t = texte.uebernehmen;

type Liste =
  { readonly art: 'laedt' } | { readonly art: 'da'; readonly eintraege: readonly VorlageEintrag[] };
type Quelle =
  | { readonly art: 'keine' }
  | { readonly art: 'laedt' }
  | { readonly art: 'fehler' }
  | { readonly art: 'da'; readonly zustand: LvZustand };

export function VorlageUebernehmen({
  zustand,
  aktiv,
  senden,
}: {
  /** Das LV, in das übernommen wird. */
  zustand: LvZustand;
  /** Die aktive Zeile des Grids (gelesen beim Übernehmen). */
  aktiv: RefObject<KnotenId | null>;
  senden: (befehl: LvBefehl) => Promise<boolean>;
}): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [liste, setListe] = useState<Liste>({ art: 'laedt' });
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [quelle, setQuelle] = useState<Quelle>({ art: 'keine' });
  const [auswahl, setAuswahl] = useState<ReadonlySet<KnotenId>>(new Set());
  const [laeuft, setLaeuft] = useState(false);
  const lvId = zustand.leistungsverzeichnis.id;

  useEffect(() => {
    if (!offen) return;
    const stand = { lebt: true };
    setListe({ art: 'laedt' });
    setGewaehlt(null);
    setQuelle({ art: 'keine' });
    setAuswahl(new Set());
    void (async () => {
      const projekte = await u.speicher.projekte.auflisten();
      const mitLvs = [];
      if (projekte.ok)
        for (const p of projekte.wert) {
          const lvs = await u.speicher.leistungsverzeichnisse.auflisten(p.id);
          if (lvs.ok) mitLvs.push({ id: p.id, name: p.name, lvs: lvs.wert });
        }
      if (stand.lebt) setListe({ art: 'da', eintraege: vorlagenAus(mitLvs, lvId) });
    })();
    return () => {
      stand.lebt = false;
    };
  }, [offen, u, lvId]);

  const waehleVorlage = (id: string): void => {
    setGewaehlt(id);
    setAuswahl(new Set());
    const eintrag = liste.art === 'da' ? liste.eintraege.find((e) => e.lvId === id) : undefined;
    if (eintrag === undefined) return;
    setQuelle({ art: 'laedt' });
    void u.speicher.leistungsverzeichnisse.laden(eintrag.lvId).then((r) => {
      setQuelle(r.ok ? { art: 'da', zustand: r.wert } : { art: 'fehler' });
    });
  };

  const zeilen = useMemo(() => (quelle.art === 'da' ? baumZeilen(quelle.zustand) : []), [quelle]);

  const uebernehmen = async (): Promise<void> => {
    if (quelle.art !== 'da' || laeuft) return;
    const r = uebernahmeBauen(quelle.zustand, auswahl, u.ids, einfuegeOrt(zustand, aktiv.current));
    if (r === null) return;
    setLaeuft(true);
    const ok = await senden(r.befehl);
    setLaeuft(false);
    if (!ok) return;
    zeige({
      titel: t.fertig(r.positionen),
      ...(r.ohneBezug > 0 ? { beschreibung: t.ohneBezug(r.ohneBezug) } : {}),
      art: 'erfolg',
    });
    setOffen(false);
  };

  const ortAktiv =
    aktiv.current !== null && zustand.leistungsverzeichnis.knoten.some((k) => k.id === aktiv.current);
  return (
    <>
      <Button
        onClick={() => {
          setOffen(true);
        }}
      >
        {t.knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={setOffen}
        titel={t.titel}
        fuss={
          <>
            <Button
              onClick={() => {
                setOffen(false);
              }}
            >
              {t.abbrechen}
            </Button>
            <Button
              variante="primaer"
              disabled={auswahl.size === 0 || laeuft || quelle.art !== 'da'}
              onClick={() => void uebernehmen()}
            >
              {t.uebernehmen}
            </Button>
          </>
        }
      >
        {liste.art === 'laedt' ? (
          <p aria-busy="true">{t.laedt}</p>
        ) : liste.eintraege.length === 0 ? (
          <p>{t.keine}</p>
        ) : (
          <>
            <Auswahl
              label={t.vorlage}
              platzhalter={t.waehlen}
              optionen={liste.eintraege.map((e) => ({
                wert: e.lvId,
                label: t.projektLv(e.projektName, e.lvName),
              }))}
              wert={gewaehlt ?? undefined}
              onWertChange={waehleVorlage}
            />
            {quelle.art === 'laedt' ? <p aria-busy="true">…</p> : null}
            {quelle.art === 'fehler' ? <p role="alert">{t.ladenFehler}</p> : null}
            {quelle.art === 'da' ? (
              <>
                <div className="gaeb__auswahl">
                  <Button
                    groesse="sm"
                    onClick={() => {
                      setAuswahl(new Set(zeilen.map((z) => z.id)));
                    }}
                  >
                    {t.alle}
                  </Button>
                  <Button
                    groesse="sm"
                    onClick={() => {
                      setAuswahl(new Set());
                    }}
                  >
                    {t.nichts}
                  </Button>
                  <span role="status">{t.anzahl(auswahl.size)}</span>
                </div>
                <ul className="gaeb__befunde" aria-label={t.auswahl} style={{ listStyle: 'none' }}>
                  {zeilen.map((z) => (
                    <li key={z.id} style={{ paddingLeft: `${String(z.tiefe * 16)}px` }}>
                      <label className="lv__option">
                        <input
                          type="checkbox"
                          checked={auswahl.has(z.id)}
                          onChange={() => {
                            setAuswahl((alt) => auswahlUmschalten(alt, z));
                          }}
                        />
                        {z.art === 'hinweis' ? t.hinweistext : z.text}
                      </label>
                    </li>
                  ))}
                </ul>
                <p>{ortAktiv ? t.ortAktiv : t.ortEnde}</p>
              </>
            ) : null}
          </>
        )}
      </Dialog>
    </>
  );
}
