// SPDX-License-Identifier: AGPL-3.0-or-later
// Fehlergrenze um die ganze App (E13, B-23). Ein Fehler beim Anzeigen ersetzt die App durch eine Fehlerseite statt einer
// leeren Fläche. Ein unbehandelter Fehler im Hintergrund (`error`, `unhandledrejection`) lässt die App stehen und zeigt
// darüber ein Band (D-132.1): Jeder Befehl ist schon gespeichert (U7), die Ansicht kann aber veraltet sein. Beide bieten
// „Projektdatei sichern“ (wenn ein Projekt offen ist und der Speicher lebt), „Neu laden“ und aufklappbare Einzelheiten.

import { Button } from '@tethys/ui-basis';
import { Component, useState } from 'react';
import type { ErrorInfo, ReactElement, ReactNode } from 'react';
import { projektdateiSichern, sicherbaresProjekt } from './notfall';
import { texte } from './texte';
import './fehler.css';

export interface Fehlerbild {
  readonly meldung: string;
  readonly stapel: string;
}

/** Macht aus einem beliebigen geworfenen Wert Meldung und Stapel für die Einzelheiten. */
export function fehlerbild(wert: unknown, zusatz = ''): Fehlerbild {
  if (wert instanceof Error) {
    return {
      meldung: `${wert.name}: ${wert.message}`,
      stapel: [wert.stack ?? '', zusatz].filter(Boolean).join('\n'),
    };
  }
  let meldung = String(wert);
  try {
    const json: unknown = JSON.stringify(wert); // `undefined` etwa bei einer Funktion
    if (typeof wert === 'string') meldung = wert;
    else if (typeof json === 'string') meldung = json;
  } catch {
    // zyklisch: bleibt bei String(wert)
  }
  return { meldung, stapel: zusatz };
}

/** Meldungen ohne Folgen für die App, die Chromium als `error` ausgibt. */
const HARMLOS = /^ResizeObserver loop/;

interface FehlerAnzeigeProps {
  readonly art: 'seite' | 'band';
  readonly bild: Fehlerbild;
  readonly onWeiter?: () => void;
}

function FehlerAnzeige({ art, bild, onWeiter }: FehlerAnzeigeProps): ReactElement {
  const [gesichert, setGesichert] = useState<boolean | null>(null);
  const mitSichern = sicherbaresProjekt() !== null;
  const t = art === 'seite' ? texte.seite : texte.band;
  return (
    <div className={`fehler fehler--${art}`} role="alert">
      {art === 'seite' ? <h1>{t.titel}</h1> : <h2>{t.titel}</h2>}
      <p>{t.text}</p>
      <div className="fehler__knoepfe">
        {mitSichern ? (
          <Button
            onClick={() => {
              void projektdateiSichern().then(setGesichert);
            }}
          >
            {texte.sichern}
          </Button>
        ) : null}
        <Button
          variante="primaer"
          onClick={() => {
            window.location.reload();
          }}
        >
          {texte.neuLaden}
        </Button>
        {onWeiter ? <Button onClick={onWeiter}>{texte.band.weiter}</Button> : null}
      </div>
      {gesichert === null ? null : <p role="status">{gesichert ? texte.gesichert : texte.sichernFehler}</p>}
      <details className="fehler__einzelheiten">
        <summary>{texte.einzelheiten}</summary>
        <pre>{[bild.meldung || texte.ohneMeldung, bild.stapel].filter(Boolean).join('\n\n')}</pre>
      </details>
    </div>
  );
}

interface FehlergrenzeState {
  readonly seite: Fehlerbild | null;
  readonly band: Fehlerbild | null;
}

export class Fehlergrenze extends Component<{ readonly children: ReactNode }, FehlergrenzeState> {
  override state: FehlergrenzeState = { seite: null, band: null };

  static getDerivedStateFromError(wert: unknown): Partial<FehlergrenzeState> {
    return { seite: fehlerbild(wert) };
  }

  override componentDidCatch(wert: unknown, info: ErrorInfo): void {
    this.setState({ seite: fehlerbild(wert, info.componentStack ?? '') });
  }

  private readonly beiFehler = (e: ErrorEvent): void => {
    if (HARMLOS.test(e.message)) return;
    this.setState({ band: fehlerbild(e.error ?? e.message) });
  };

  private readonly beiAbweisung = (e: PromiseRejectionEvent): void => {
    this.setState({ band: fehlerbild(e.reason) });
  };

  override componentDidMount(): void {
    window.addEventListener('error', this.beiFehler);
    window.addEventListener('unhandledrejection', this.beiAbweisung);
  }

  override componentWillUnmount(): void {
    window.removeEventListener('error', this.beiFehler);
    window.removeEventListener('unhandledrejection', this.beiAbweisung);
  }

  override render(): ReactNode {
    const { seite, band } = this.state;
    if (seite !== null) {
      return (
        <main className="fehler-seite">
          <FehlerAnzeige art="seite" bild={seite} />
        </main>
      );
    }
    return (
      <>
        {band === null ? null : (
          <FehlerAnzeige
            art="band"
            bild={band}
            onWeiter={() => {
              this.setState({ band: null });
            }}
          />
        )}
        {this.props.children}
      </>
    );
  }
}
