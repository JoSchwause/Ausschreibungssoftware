// Wegwerfcode. Ansicht 1: LV bearbeiten. Drei Varianten.
//  baum   : dichte Tabelle mit Baum, das echte @tethys/ui-grid
//  panel  : Tabelle mit Seitenpanel fuer die gewaehlte Position
//  karten : Karten je Titel mit Eingabefeldern in der Position
import { useEffect, useMemo, useRef, useState } from 'react';
import { LvGrid } from '@tethys/ui-grid';
import { Button, Icon } from '@tethys/ui-basis';
import type { Ergebnis, Position, Titel } from '@tethys/vertrag';
import { euro, gpLv } from './rechnen';
import { useStore, zahlen } from './store';
import { SummenBlock, Seitenkopf, Steuerfelder, baueAnsicht, istPosition, istTitel, oz } from './teile';

// ---------- Eingabefeld fuer Zahlen und Text: uebernimmt jede gueltige Eingabe sofort ----------

function Eingabe<T extends string>({
  wert,
  anzeige,
  parse,
  onWert,
  label,
  zahl,
  testid,
}: {
  wert: T | string | null;
  anzeige?: (w: T) => string;
  parse?: (t: string) => Ergebnis<T, string>;
  onWert: (w: T | string | null) => void;
  label: string;
  zahl?: boolean;
  testid?: string;
}) {
  const text0 = wert === null ? '' : anzeige ? anzeige(wert as T) : wert;
  const [text, setText] = useState(text0);
  const [fehler, setFehler] = useState<string | null>(null);
  const fokus = useRef(false);
  useEffect(() => {
    if (!fokus.current && !fehler) setText(text0);
  }, [text0, fehler]);
  return (
    <input
      className={`tx-eingabe${zahl ? ' tx-eingabe--zahl' : ''}`}
      aria-label={label}
      data-testid={testid}
      value={text}
      aria-invalid={fehler ? true : undefined}
      title={fehler ?? undefined}
      onFocus={(e) => {
        fokus.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        fokus.current = false;
      }}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (!parse) {
          onWert(t);
          return;
        }
        if (t.trim() === '') {
          setFehler(null);
          onWert(null);
          return;
        }
        const r = parse(t.trim());
        if (r.ok) {
          setFehler(null);
          onWert(r.wert);
        } else setFehler(r.fehler);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const alle = [...(e.currentTarget.closest('[data-eingaben]')?.querySelectorAll<HTMLInputElement>('input.tx-eingabe') ?? [])];
          const i = alle.indexOf(e.currentTarget);
          alle[e.shiftKey ? i - 1 : i + 1]?.focus();
          e.preventDefault();
        }
      }}
    />
  );
}

function MengeFeld({ p }: { p: Position }) {
  const s = useStore();
  return (
    <Eingabe
      label="Menge"
      zahl
      wert={p.menge}
      anzeige={zahlen.formatMenge}
      parse={zahlen.parseMenge}
      onWert={(w) => s.befehl({ art: 'MengeAendern', positionId: p.id, menge: w as never })}
    />
  );
}
function EpFeld({ p }: { p: Position }) {
  const s = useStore();
  return (
    <Eingabe
      label="Einheitspreis"
      zahl
      wert={p.einheitspreis}
      anzeige={zahlen.formatEinheitspreis}
      parse={zahlen.parseEinheitspreis}
      onWert={(w) => s.befehl({ art: 'EinheitspreisAendern', positionId: p.id, einheitspreis: w as never })}
    />
  );
}
function EinheitFeld({ p }: { p: Position }) {
  const s = useStore();
  return (
    <Eingabe
      label="Einheit"
      wert={p.einheit}
      onWert={(w) => s.befehl({ art: 'EinheitAendern', positionId: p.id, einheit: (w as string) || null })}
    />
  );
}
function KurztextFeld({ k }: { k: Position | Titel }) {
  const s = useStore();
  return (
    <Eingabe label="Kurztext" wert={k.kurztext} onWert={(w) => s.befehl({ art: 'KurztextAendern', knotenId: k.id, kurztext: w as string })} />
  );
}

// ---------- Variante baum: das echte Grid ----------

function Baum() {
  const s = useStore();
  const ansicht = useMemo(
    () => baueAnsicht(s.knoten, s.lvId, s.offen, s.rechnung.gp, s.rechnung.titel, s.rechnung.summen),
    [s.knoten, s.lvId, s.offen, s.rechnung],
  );
  return (
    <div className="p-seite p-seite--voll">
      <Seitenkopf
        titel="Leistungsverzeichnis"
        frage="Teilfrage 1: Ist Bearbeiten hier schneller und direkter als heute? Reicht Excel-artige Navigation?"
      >
        <Steuerfelder />
      </Seitenkopf>
      <ul className="p-tasten" aria-label="Tastenbelegung">
        <li><kbd>Pfeile</kbd> Zelle wechseln</li>
        <li><kbd>Enter</kbd> oder <kbd>F2</kbd> bearbeiten (Enter bestätigt und geht nach unten)</li>
        <li><kbd>Tab</kbd> nächste Zelle</li>
        <li><kbd>Leertaste</kbd> Zeile wählen</li>
        <li><kbd>Strg</kbd>+<kbd>V</kbd> aus Excel einfügen (legt neue Positionen an)</li>
        <li><kbd>Entf</kbd> Zelle leeren</li>
        <li><kbd>Alt</kbd>+<kbd>→</kbd>/<kbd>←</kbd> auf-/zuklappen</li>
      </ul>
      <div className="p-gridrahmen">
        <LvGrid
          ansicht={ansicht}
          spalten={['ordnungszahl', 'kurztext', 'menge', 'einheit', 'einheitspreis', 'gesamtpreis']}
          zahlen={zahlen}
          ids={s.ids}
          wurzelId={s.lvId as never}
          onBefehl={s.befehl}
          onAufklappen={s.aufklappen}
          beschriftung="Leistungsverzeichnis"
        />
      </div>
    </div>
  );
}

// ---------- Variante panel ----------

function Panel() {
  const s = useStore();
  const sichtbar = useMemo(() => {
    const kinder = new Map<string, typeof s.knoten[number][]>();
    for (const k of s.knoten) kinder.set(k.elternId, [...(kinder.get(k.elternId) ?? []), k]);
    const aus: { k: typeof s.knoten[number]; tiefe: number }[] = [];
    const geh = (e: string, t: number) => {
      for (const k of kinder.get(e) ?? []) {
        if (k.art === 'hinweis') continue;
        aus.push({ k, tiefe: t });
        if (k.art === 'titel' && s.offen.has(k.id)) geh(k.id, t + 1);
      }
    };
    geh(s.lvId, 0);
    return aus;
  }, [s.knoten, s.offen, s.lvId]);
  const wahl = s.knoten.find((k) => k.id === s.wahl);
  const pos = wahl && istPosition(wahl) ? wahl : null;
  const tit = wahl && istTitel(wahl) ? wahl : null;
  const liste = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!s.wahl && sichtbar[0]) s.setWahl(sichtbar[0].k.id);
  }, [s, sichtbar]);

  const zeile = (e: React.KeyboardEvent) => {
    const i = sichtbar.findIndex((x) => x.k.id === s.wahl);
    const geh = (n: number) => {
      const z = sichtbar[Math.max(0, Math.min(sichtbar.length - 1, n))];
      if (z) {
        s.setWahl(z.k.id);
        requestAnimationFrame(() => liste.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
      }
    };
    if (e.key === 'ArrowDown') (geh(i + 1), e.preventDefault());
    else if (e.key === 'ArrowUp') (geh(i - 1), e.preventDefault());
    else if (e.key === 'Home') (geh(0), e.preventDefault());
    else if (e.key === 'End') (geh(sichtbar.length - 1), e.preventDefault());
    else if (e.key === 'ArrowRight' && tit) (s.aufklappen(tit.id, true), e.preventDefault());
    else if (e.key === 'ArrowLeft' && tit) (s.aufklappen(tit.id, false), e.preventDefault());
    else if (e.key === 'Enter' || e.key === 'F2') {
      document.querySelector<HTMLInputElement>('[data-panel] input')?.focus();
      e.preventDefault();
    }
  };

  const spiegelZeile = pos ? s.spiegel.zeilen.find((z) => z.knoten.id === pos.id) : undefined;

  return (
    <div className="p-seite p-seite--voll">
      <Seitenkopf
        titel="Leistungsverzeichnis"
        frage="Teilfrage 1: Hilft ein Panel, wenn eine Position viele Felder hat, oder bremst es?"
      >
        <Steuerfelder />
      </Seitenkopf>
      <div className="p-panelaufbau">
        <div className="p-panelliste" ref={liste} tabIndex={0} role="listbox" aria-label="Positionen" onKeyDown={zeile} aria-activedescendant={s.wahl ?? undefined}>
          <table className="p-tab">
            <thead>
              <tr>
                <th>OZ</th><th>Kurztext</th><th className="p-r">Menge</th><th>Einh.</th><th className="p-r">Summe</th>
              </tr>
            </thead>
            <tbody>
              {sichtbar.map(({ k, tiefe }) => {
                const gewaehlt = k.id === s.wahl;
                if (k.art === 'titel') {
                  const offen = s.offen.has(k.id);
                  return (
                    <tr key={k.id} id={k.id} role="option" aria-selected={gewaehlt} className={`p-tab__titel${gewaehlt ? ' ist-gewaehlt' : ''}`} onClick={() => s.setWahl(k.id)}>
                      <td>{oz(k)}</td>
                      <td>
                        <button type="button" className="p-klapp" aria-label={offen ? 'Zuklappen' : 'Aufklappen'} onClick={(e) => { e.stopPropagation(); s.aufklappen(k.id, !offen); }} tabIndex={-1}>
                          <Icon name={offen ? 'pfeilUnten' : 'pfeilOben'} groesse={12} style={{ transform: offen ? undefined : 'rotate(90deg)' }} />
                        </button>
                        {k.kurztext}
                      </td>
                      <td colSpan={2}></td>
                      <td className="p-r">{euro(s.rechnung.titel.get(k.id))}</td>
                    </tr>
                  );
                }
                if (!istPosition(k)) return null;
                return (
                  <tr key={k.id} id={k.id} role="option" aria-selected={gewaehlt} className={gewaehlt ? 'ist-gewaehlt' : ''} onClick={() => s.setWahl(k.id)}>
                    <td className="p-mono">{oz(k)}</td>
                    <td style={{ paddingLeft: 8 + tiefe * 12 }}>{k.kurztext || <em>(ohne Kurztext)</em>}</td>
                    <td className="p-r p-mono">{k.menge ? zahlen.formatMenge(k.menge) : ''}</td>
                    <td>{k.einheit}</td>
                    <td className="p-r p-mono">{euro(s.rechnung.gp.get(k.id))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <aside className="p-panel" data-panel data-eingaben aria-label="Position bearbeiten">
          {pos ? (
            <>
              <h2>Position {oz(pos)}</h2>
              <label className="p-feld"><span>Kurztext</span><KurztextFeld k={pos} /></label>
              <div className="p-feldreihe">
                <label className="p-feld"><span>Menge</span><MengeFeld p={pos} /></label>
                <label className="p-feld p-feld--schmal"><span>Einheit</span><EinheitFeld p={pos} /></label>
                <label className="p-feld"><span>Einheitspreis</span><EpFeld p={pos} /></label>
              </div>
              <div className="p-gpzeile"><span>Gesamtpreis</span><strong data-summe="gp">{euro(pos.menge && pos.einheitspreis ? gpLv(pos) : null)}</strong></div>
              {spiegelZeile ? (
                <>
                  <h3>Angebote zu dieser Position</h3>
                  <table className="p-tab p-tab--klein">
                    <tbody>
                      {s.spiegel.bieter.map((b, i) => {
                        const z = spiegelZeile.zellen[i]!;
                        const ep = b.ep.get(pos.id) ?? null;
                        return (
                          <tr key={b.id}>
                            <td>{b.name}</td>
                            <td className="p-r p-mono">{ep ? zahlen.formatEinheitspreis(ep) : <span className="p-nichtangeboten">nicht angeboten</span>}</td>
                            <td className="p-r p-mono">{z.gp ? euro(z.gp) : ''}</td>
                            <td className={z.ausreisser ? 'p-warn' : 'p-leise'}>{z.ausreisser ? `Ausreißer ${z.abweichung ?? ''}` : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              ) : null}
              <p className="p-hinweis">Pfeil hoch/runter wählt die Position, <kbd>Enter</kbd> springt ins Panel, dort wechselt <kbd>Enter</kbd> zum nächsten Feld. Änderungen gelten sofort.</p>
            </>
          ) : tit ? (
            <>
              <h2>Titel {oz(tit)}</h2>
              <label className="p-feld"><span>Kurztext</span><KurztextFeld k={tit} /></label>
              <div className="p-gpzeile"><span>Titelsumme</span><strong>{euro(s.rechnung.titel.get(tit.id))}</strong></div>
            </>
          ) : null}
          <div className="p-panel__summen"><SummenBlock summen={s.rechnung.summen} /></div>
        </aside>
      </div>
    </div>
  );
}

// ---------- Variante karten ----------

function Karten() {
  const s = useStore();
  const titel = s.knoten.filter(istTitel);
  return (
    <div className="p-seite">
      <Seitenkopf
        titel="Leistungsverzeichnis"
        frage="Teilfrage 1: Ist die Gliederung in Karten übersichtlicher, auch wenn weniger Positionen auf den Bildschirm passen?"
      >
        <Steuerfelder />
      </Seitenkopf>
      <div className="p-kartenaufbau">
        <div className="p-karten" data-eingaben>
          {titel.map((t) => {
            const offen = s.offen.has(t.id);
            const positionen = s.knoten.filter((k): k is Position => istPosition(k) && k.elternId === t.id);
            return (
              <section key={t.id} className="p-karte" aria-label={`Titel ${oz(t)}`}>
                <header className="p-karte__kopf">
                  <button type="button" className="p-klapp" aria-expanded={offen} aria-label={offen ? 'Zuklappen' : 'Aufklappen'} onClick={() => s.aufklappen(t.id, !offen)}>
                    <Icon name="pfeilUnten" groesse={14} style={{ transform: offen ? undefined : 'rotate(-90deg)' }} />
                  </button>
                  <span className="p-mono p-karte__oz">{oz(t)}</span>
                  <h2>{t.kurztext}</h2>
                  <span className="p-karte__anzahl">{positionen.length} Positionen</span>
                  <strong className="p-karte__summe" data-summe={`titel-${oz(t)}`}>{euro(s.rechnung.titel.get(t.id))}</strong>
                </header>
                {offen ? (
                  <ul className="p-karte__liste">
                    {positionen.map((p) => (
                      <li key={p.id} className="p-pos">
                        <div className="p-pos__kopf">
                          <span className="p-mono p-pos__oz">{oz(p)}</span>
                          <KurztextFeld k={p} />
                        </div>
                        <div className="p-pos__rechnung">
                          <MengeFeld p={p} />
                          <EinheitFeld p={p} />
                          <span className="p-mal">×</span>
                          <EpFeld p={p} />
                          <span className="p-mal">=</span>
                          <strong className="p-mono p-pos__gp">{euro(s.rechnung.gp.get(p.id))}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
        <aside className="p-kartenseite">
          <h2>Summen</h2>
          <SummenBlock summen={s.rechnung.summen} />
          <p className="p-hinweis">Jede gültige Eingabe wirkt sofort auf Titelsumme, Netto, Nachlass und MwSt. <kbd>Enter</kbd> springt zum nächsten Feld.</p>
          <Button groesse="sm" onClick={() => titel.forEach((t) => s.aufklappen(t.id, true))}>Alle aufklappen</Button>{' '}
          <Button groesse="sm" onClick={() => titel.forEach((t) => s.aufklappen(t.id, false))}>Alle zuklappen</Button>
        </aside>
      </div>
    </div>
  );
}

export function LvAnsicht({ variante }: { variante: string }) {
  if (variante === 'panel') return <Panel />;
  if (variante === 'karten') return <Karten />;
  return <Baum />;
}
