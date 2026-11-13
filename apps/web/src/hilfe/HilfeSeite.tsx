// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/hilfe` (Ticket 147, E2; Zielseite der Seitenleiste aus Ticket 131): Reiter „Erste Schritte“ (der Weg von der
// GAEB-Datei bis zur Rechnung), „Daten und Sicherung“, „Tastenkürzel“ (aus der Kürzeltabelle der Grids), „Annahmen“ (G-62,
// `umfang-welle-7.md` §5) und „Über“ (Version und Stand des Builds, Lizenz, Quelltext). Der Anker der Adresse wählt den
// Reiter (`/hilfe#annahmen`); die Seite braucht keinen Speicher.

import { Tabs } from '@tethys/ui-basis';
import type { ReactElement } from 'react';
import { useAnker } from '../ui/route';
import { APP_BUILD, APP_VERSION, bauStandText } from '../version';
import { kuerzelGruppen } from './kuerzel';
import { HILFETEILE, hilfeteilAus, type Hilfeteil } from './pfad';
import { texte, type Annahmenabschnitt } from './texte';
import './hilfe.css';

function Abschnitt({ titel, saetze }: { titel: string; saetze: readonly string[] }): ReactElement {
  return (
    <section className="hilfe__abschnitt">
      <h3>{titel}</h3>
      {saetze.map((s) => (
        <p key={s}>{s}</p>
      ))}
    </section>
  );
}

function ErsteSchritte(): ReactElement {
  const t = texte.ersteSchritte;
  return (
    <>
      <p>{t.einleitung}</p>
      <ol className="hilfe__schritte">
        {t.schritte.map((s) => (
          <li key={s.titel}>
            <h3>{s.titel}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function Daten(): ReactElement {
  return (
    <>
      {texte.daten.abschnitte.map((a) => (
        <Abschnitt key={a.titel} titel={a.titel} saetze={a.saetze} />
      ))}
    </>
  );
}

function Tastenkuerzel(): ReactElement {
  const t = texte.kuerzel;
  return (
    <>
      <p>{t.einleitung}</p>
      {kuerzelGruppen().map((g) => (
        <section key={g.bereich} className="hilfe__abschnitt">
          <h3>{g.bereich}</h3>
          <table className="hilfe__tabelle" aria-label={t.tabelle(g.bereich)}>
            <thead>
              <tr>
                <th scope="col">{t.taste}</th>
                <th scope="col">{t.wirkung}</th>
                <th scope="col">{t.gilt}</th>
              </tr>
            </thead>
            <tbody>
              {g.kuerzel.map((k) => (
                <tr key={k.aktion}>
                  <td className="hilfe__taste">{k.taste}</td>
                  <td>{k.beschreibung}</td>
                  <td>{t.giltIn(k.gilt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}

function Annahme({ a }: { a: Annahmenabschnitt }): ReactElement {
  if (a.kette === undefined) return <Abschnitt titel={a.titel} saetze={a.saetze} />;
  // Die Abzugskette steht als nummerierte Liste hinter dem ersten Satz, der sie ankündigt.
  const [erster, ...rest] = a.saetze;
  return (
    <section className="hilfe__abschnitt">
      <h3>{a.titel}</h3>
      {erster === undefined ? null : <p>{erster}</p>}
      <ol className="hilfe__kette">
        {a.kette.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ol>
      {rest.map((s) => (
        <p key={s}>{s}</p>
      ))}
    </section>
  );
}

function Annahmen(): ReactElement {
  return (
    <>
      <p>{texte.annahmen.einleitung}</p>
      {texte.annahmen.abschnitte.map((a) => (
        <Annahme key={a.titel} a={a} />
      ))}
    </>
  );
}

function Ueber(): ReactElement {
  const t = texte.ueber;
  return (
    <>
      <p>{t.beschreibung}</p>
      <dl className="hilfe__angaben">
        <dt>{t.version}</dt>
        <dd>{APP_VERSION}</dd>
        <dt>{t.stand}</dt>
        <dd>{bauStandText(APP_BUILD)}</dd>
        <dt>{t.lizenz}</dt>
        <dd>{t.lizenzName}</dd>
        <dt>{t.quelltext}</dt>
        <dd>
          <a href={t.quelltextAdresse} target="_blank" rel="noopener noreferrer">
            {t.quelltextAdresse}
          </a>
        </dd>
      </dl>
      <p>{t.lizenzText}</p>
      <p>{t.browser}</p>
      <p>{t.gewaehr}</p>
    </>
  );
}

const INHALT: Record<Hilfeteil, () => ReactElement> = {
  'erste-schritte': ErsteSchritte,
  daten: Daten,
  tastenkuerzel: Tastenkuerzel,
  annahmen: Annahmen,
  ueber: Ueber,
};

export function HilfeSeite(): ReactElement {
  const teil = hilfeteilAus(useAnker()) ?? 'erste-schritte';
  return (
    <div className="seite hilfe">
      <h1>{texte.titel}</h1>
      {/* Neu aufgebaut, wenn ein Verweis den Anker wechselt; sonst wechseln die Reiter wie gewohnt per Maus und Pfeiltasten. */}
      <Tabs
        key={teil}
        label={texte.reiter.name}
        startWert={teil}
        reiter={HILFETEILE.map((t) => {
          const Inhalt = INHALT[t];
          return {
            wert: t,
            label: texte.reiter[t],
            inhalt: (
              <div className="hilfe__teil">
                <h2>{texte.reiter[t]}</h2>
                <Inhalt />
              </div>
            ),
          };
        })}
      />
    </div>
  );
}
