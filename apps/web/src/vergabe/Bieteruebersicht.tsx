// SPDX-License-Identifier: AGPL-3.0-or-later
// Bieterübersicht unter dem Preisspiegel (Ticket 63): je Bieter Rang, Netto, Netto nach Nachlass, Brutto und die Zahl
// der nicht angebotenen Positionen, nach Rang. Alle Zahlen aus `preisspiegelBerechnen`, formatiert über `dezimal`.
// Die letzte Spalte gehört Ticket 64 („Zuschlag erteilen“ je Bieter).

import { formatiereBetragDe } from '@tethys/dezimal';
import type { Preisspiegel } from '@tethys/vergabe';
import type { ReactElement, ReactNode } from 'react';
import type { Anbieter } from './ansicht';
import { texte } from './texte';

export function Bieteruebersicht({
  anbieter,
  preisspiegel,
  aktion,
}: {
  anbieter: readonly Anbieter[];
  preisspiegel: Preisspiegel;
  /** Ticket 64: Aktion je Bieter (z. B. „Zuschlag erteilen“); ohne sie entfällt die Spalte. */
  aktion?: (a: Anbieter) => ReactNode;
}): ReactElement {
  const t = texte.summen;
  const zeilen = preisspiegel.bietersummen
    .map((s) => ({ s, a: anbieter.find((x) => x.zustand.angebot.id === s.angebotId) }))
    .filter((z): z is { s: (typeof z)['s']; a: Anbieter } => z.a !== undefined)
    .sort((x, y) => x.s.rang - y.s.rang || x.a.name.localeCompare(y.a.name, 'de'));
  return (
    <table className="preisspiegel__bieter" aria-label={texte.bieter.liste}>
      <thead>
        <tr>
          <th scope="col">{texte.bieter.bieter}</th>
          <th scope="col">{t.rang}</th>
          <th scope="col">{t.netto}</th>
          <th scope="col">{t.nettoNachNachlass}</th>
          <th scope="col">{t.brutto}</th>
          <th scope="col">{t.nichtAngeboten}</th>
          {aktion === undefined ? null : <th scope="col">{texte.bieter.aktion}</th>}
        </tr>
      </thead>
      <tbody>
        {zeilen.map(({ s, a }) => (
          <tr key={s.angebotId}>
            <th scope="row">{a.name}</th>
            <td data-testid="rang">{s.rang}</td>
            <td data-testid="netto">{formatiereBetragDe(s.gesamt.netto)}</td>
            <td data-testid="nettoNachNachlass">{formatiereBetragDe(s.gesamt.nettoNachNachlass)}</td>
            <td data-testid="brutto">{formatiereBetragDe(s.gesamt.brutto)}</td>
            <td data-testid="nichtAngeboten">{s.nichtAngeboten}</td>
            {aktion === undefined ? null : <td>{aktion(a)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
