// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86 (D-35): Dialog „Nachtrag beauftragen“ vom Kopfband des Nachtrags-LV und aus der Nachtragsliste. Vor dem
// Bestätigen: Zahl der Positionen, Summe des Angebots, Auftragssumme vorher und nachher, Hinweise in Worten (U5). Bestätigen
// schreibt die Befehlsfolge über den Befehlsweg (ein Undo-Schritt, U7); der Dialog ist die ausdrückliche Bestätigung (Q5).

import { Button, Dialog, useToast } from '@tethys/ui-basis';
import type { AuftragsLeistungsverzeichnisId, LeistungsverzeichnisId } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { befehlswegFuer, type LvSitzung } from '../lv/befehlsweg';
import { abweisungText } from '../lv/meldungen';
import { texte as lvTexte } from '../lv/texte';
import { formatiereBetragDe } from '../lv/zahlen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import type { Beauftragungsplan } from './nachtrag';
import { beauftragungVorschau, nachtragBeauftragen } from './speichern';
import { texte } from './texte';
import '../auftrag/auftrag.css';

const t = texte.dialog;

export interface Beauftragungsziel {
  readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
  readonly nachtragsLvId: LeistungsverzeichnisId;
  readonly nummer: string;
}

export interface BeauftragenDialogProps {
  /** Der Nachtrag, der beauftragt werden soll; `null`: Dialog zu. */
  readonly ziel: Beauftragungsziel | null;
  /** Die offene Seite des Nachtrags-LV, die den neuen Status gleich zeigt. */
  readonly sitzung?: LvSitzung;
  readonly onSchliessen: () => void;
  /** Übernahme und Status sind geschrieben. */
  readonly onBeauftragt: (ziel: Beauftragungsziel) => void;
}

export function BeauftragenDialog(props: BeauftragenDialogProps): ReactElement {
  const { ziel } = props;
  return (
    <Dialog
      offen={ziel !== null}
      onOffenChange={(o) => {
        if (!o) props.onSchliessen();
      }}
      titel={t.titel(ziel?.nummer ?? '')}
    >
      {ziel === null ? null : <Inhalt {...props} ziel={ziel} key={ziel.nachtragsLvId} />}
    </Dialog>
  );
}

type Vorschau = { art: 'laedt' } | { art: 'fehler'; text: string } | { art: 'da'; plan: Beauftragungsplan };

function Inhalt({
  ziel,
  sitzung,
  onSchliessen,
  onBeauftragt,
}: BeauftragenDialogProps & { ziel: Beauftragungsziel }): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const { zeige } = useToast();
  const [vorschau, setVorschau] = useState<Vorschau>({ art: 'laedt' });
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    let aktiv = true;
    void beauftragungVorschau(weg, ziel.auftragsLvId, ziel.nachtragsLvId, sitzung).then((r) => {
      if (!aktiv) return;
      setVorschau(
        r.ok ? { art: 'da', plan: r.wert } : { art: 'fehler', text: lvTexte.speicherfehler[r.fehler.code] },
      );
    });
    return () => {
      aktiv = false;
    };
  }, [weg, ziel, sitzung]);

  const plan = vorschau.art === 'da' ? vorschau.plan : null;
  const fehler = vorschau.art === 'fehler' ? vorschau.text : (plan?.fehler ?? null);

  const beauftragen = async (): Promise<void> => {
    if (plan?.befehl == null || laeuft) return;
    setLaeuft(true);
    const r = await nachtragBeauftragen(weg, {
      auftragsLvId: ziel.auftragsLvId,
      nachtragsLvId: ziel.nachtragsLvId,
      ...(sitzung === undefined ? {} : { sitzung }),
    });
    setLaeuft(false);
    if (r.ok) {
      zeige({ titel: t.beauftragt(ziel.nummer), art: 'erfolg' });
      onBeauftragt(ziel);
      return;
    }
    if (r.art === 'plan') {
      zeige({ titel: t.nicht, beschreibung: r.fehler, art: 'fehler' });
      onSchliessen();
      return;
    }
    const m = abweisungText(r.abweisung);
    zeige({
      titel: m.titel,
      beschreibung: r.teilweise ? `${m.beschreibung} ${t.teilweise}` : m.beschreibung,
      art: 'fehler',
    });
    onSchliessen();
  };

  return (
    <div className="auftrag__zuschlag" aria-busy={vorschau.art === 'laedt'}>
      <p>{t.einleitung}</p>
      {vorschau.art === 'laedt' ? <p>{t.laden}</p> : null}
      {plan === null || plan.befehl === null ? null : (
        <dl className="auftrag__zahlen">
          <dt>{t.positionen}</dt>
          <dd data-testid="nachtrag-positionen">{plan.positionen}</dd>
          <dt>{t.angebot}</dt>
          <dd data-testid="nachtrag-angebot">
            {plan.angebotsnetto === null ? '–' : `${formatiereBetragDe(plan.angebotsnetto)} €`}
          </dd>
          {plan.auftrag === null ? null : (
            <>
              <dt>{t.vorher}</dt>
              <dd data-testid="nachtrag-vorher">
                {formatiereBetragDe(plan.auftrag.vorher.nettoNachNachlass)} €
              </dd>
              <dt>{t.nachher}</dt>
              <dd data-testid="nachtrag-nachher">
                {formatiereBetragDe(plan.auftrag.nachher.nettoNachNachlass)} €
              </dd>
            </>
          )}
        </dl>
      )}
      {fehler === null ? null : (
        <p className="auftrag__fehler" role="alert">
          {fehler}
        </p>
      )}
      {plan === null || plan.warnungen.length === 0 ? null : (
        <section aria-label={t.warnungen}>
          <h3 className="auftrag__unterkopf">{t.warnungen}</h3>
          <ul className="auftrag__warnungen">
            {plan.warnungen.map((w, i) => (
              <li key={`${String(i)}-${w}`}>{w}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="auftrag__leise">{t.undo}</p>
      <div className="auftrag__fuss">
        <Button onClick={onSchliessen}>{t.abbrechen}</Button>
        <Button
          variante="primaer"
          disabled={plan?.befehl == null || laeuft}
          onClick={() => void beauftragen()}
        >
          {t.bestaetigen}
        </Button>
      </div>
    </div>
  );
}
