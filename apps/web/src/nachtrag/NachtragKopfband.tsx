// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86: Kopfband auf der LV-Seite eines Nachtrags-LV: „Nachtrag N01 zu <Auftrags-LV> · Status“ mit Link zurück,
// Statuswahl (angemeldet, angeboten, abgelehnt; `beauftragt` nur über „Beauftragen“) und „Beauftragen“. Der Status ist ein
// Befehl der Sitzung des LV (A5, ein Undo-Schritt). Einen Zuschlag gibt es für ein Nachtrags-LV nicht (D-42).
// Ticket 151 (B-18): geführt. Eine Schrittanzeige (Leistungen erfassen → Angebot des Auftragnehmers → Status „angeboten“ →
// Beauftragen) markiert den nächsten Schritt, dessen Schaltfläche hervorgehoben ist; das Angebot liest „Angebot des
// Auftragnehmers einlesen“ mit dem Auftragnehmer als Bieter, danach schlägt das Band den Status „angeboten“ vor. Nichts
// davon sperrt: Statuswahl und „Beauftragen“ bleiben wie bisher (U5).

import { Auswahl, Button } from '@tethys/ui-basis';
import type { LvZustand, Nachtragsangaben, Nachtragsstatus } from '@tethys/vertrag';
import { useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { Verweis } from '../ui/Verweis';
import { auftragPfad } from '../auftrag/ziel';
import { befehlswegFuer, nachJedemEintrag, type LvSitzung } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { AuftragnehmerAngebot } from './AuftragnehmerAngebot';
import { BeauftragenDialog, type Beauftragungsziel } from './BeauftragenDialog';
import { nachtragsfuehrung, type Nachtragsschritt } from './nachtrag';
import { auftragnehmerLaden, type Auftragnehmerstand } from './speichern';
import { texte } from './texte';
import './nachtrag.css';

const t = texte.band;
const WAEHLBAR: readonly Nachtragsstatus[] = ['angemeldet', 'angeboten', 'abgelehnt'];
/** Protokolleinträge, nach denen Auftragnehmer oder Angebote anders sein können. */
const NEU_LADEN: ReadonlySet<string> = new Set(['angebot', 'projekt', 'auftrags-leistungsverzeichnis']);

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
  const [stand, setStand] = useState<Auftragnehmerstand | null>(null);
  const [lauf, setLauf] = useState(0);

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

  // Ticket 151: Auftragnehmer und ob sein Angebot vorliegt; neu nach jedem Angebot (auch über „Angebote“), Undo und Redo.
  useEffect(() => {
    let aktiv = true;
    void auftragnehmerLaden(u.speicher, {
      id: lv.id,
      projektId: lv.projektId,
      auftragsLvId: nachtrag.auftragsLvId,
    }).then((r) => {
      if (aktiv && r.ok) setStand(r.wert);
    });
    return () => {
      aktiv = false;
    };
  }, [u, lv.id, lv.projektId, nachtrag.auftragsLvId, lauf]);
  useEffect(() => {
    const neu = (): void => {
      setLauf((n) => n + 1);
    };
    const ab1 = nachJedemEintrag(u, (e) => {
      if (NEU_LADEN.has(e.aggregat.art)) neu();
    });
    const ab2 = befehlswegFuer(u).beiHistorie(neu);
    return () => {
      ab1();
      ab2();
    };
  }, [u]);

  const statusSetzen = async (status: Nachtragsstatus): Promise<void> => {
    if (status === nachtrag.status) return;
    pruefe(await sitzung.befehl({ art: 'NachtragsangabenSetzen', nachtrag: { ...nachtrag, status } }));
  };

  const fuehrung = nachtragsfuehrung({
    status: nachtrag.status,
    positionen: lv.knoten.filter((k) => k.art === 'position').length,
    angebotDesAuftragnehmers: stand?.angebotDesAuftragnehmers ?? false,
  });
  // Solange der Stand lädt, ist kein Schritt hervorgehoben (kein Springen der Hervorhebung beim Öffnen).
  const aktuell: Nachtragsschritt | null = stand === null ? null : fuehrung.aktuell;
  const auftragnehmer = stand?.auftragnehmer ?? null;
  const offen = nachtrag.status === 'angemeldet' || nachtrag.status === 'angeboten';
  const beauftragbar = offen;
  const pfad = auftragPfad(lv.projektId, nachtrag.auftragsLvId);
  const hinweis =
    aktuell === 'erfassen'
      ? t.erfassenHinweis
      : aktuell === 'angebot'
        ? auftragnehmer === null
          ? texte.einlesen.ohneAuftragnehmer
          : t.angebotHinweis(auftragnehmer.name)
        : aktuell === 'status'
          ? t.vorschlag
          : aktuell === 'beauftragen'
            ? t.beauftragenHinweis
            : null;
  return (
    <section className="nachtrag__band" aria-label={t.beschriftung}>
      <p>
        <strong>{t.titel(nachtrag.nummer)}</strong> {t.zu}{' '}
        <Verweis pfad={pfad} text={auftragName ?? t.ohneAuftrag} gehe={gehe} /> ·{' '}
        <span data-testid="nachtrag-status">{texte.status[nachtrag.status]}</span>
      </p>
      <ol className="nachtrag__schritte" aria-label={t.schritte}>
        {fuehrung.schritte.map((s, i) => (
          <li
            key={s.schritt}
            className={
              s.schritt === aktuell
                ? 'nachtrag__schritt nachtrag__schritt--aktuell'
                : s.erledigt
                  ? 'nachtrag__schritt nachtrag__schritt--erledigt'
                  : 'nachtrag__schritt'
            }
            {...(s.schritt === aktuell ? { 'aria-current': 'step' as const } : {})}
          >
            <span aria-hidden="true">{s.erledigt ? '✓' : String(i + 1)}</span> {t.schritt[s.schritt]}
            {s.erledigt ? <span className="nachtrag__vorlesen"> ({t.erledigt})</span> : null}
            {s.schritt === aktuell ? <span className="nachtrag__vorlesen"> ({t.naechster})</span> : null}
          </li>
        ))}
      </ol>
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
      {offen && auftragnehmer !== null ? (
        <AuftragnehmerAngebot
          zustand={zustand}
          auftragnehmer={auftragnehmer}
          primaer={aktuell === 'angebot'}
          onAngelegt={() => {
            setLauf((n) => n + 1);
          }}
        />
      ) : null}
      {aktuell === 'status' ? (
        <Button variante="primaer" onClick={() => void statusSetzen('angeboten')}>
          {t.angebotenSetzen}
        </Button>
      ) : null}
      <Button
        {...(aktuell === 'beauftragen' ? { variante: 'primaer' as const } : {})}
        disabled={!beauftragbar}
        {...(beauftragbar ? {} : { 'aria-describedby': hinweisId })}
        onClick={() => {
          setZiel({ auftragsLvId: nachtrag.auftragsLvId, nachtragsLvId: lv.id, nummer: nachtrag.nummer });
        }}
      >
        {t.beauftragen}
      </Button>
      {hinweis === null ? null : (
        <p className="nachtrag__naechster" data-testid="nachtrag-naechster">
          {hinweis}
        </p>
      )}
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
