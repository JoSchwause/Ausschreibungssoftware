// Wegwerfcode. Ansicht 2: Preisspiegel. Drei Varianten.
//  farbe  : Matrix, Zellen nach Abweichung vom Mittel eingefaerbt
//  rang   : Matrix mit Rangzahl je Position und Bieter
//  balken : Balken je Position mit Mittelwert und +-20-%-Band
// Alle Werte kommen aus spiegel.ts (Dezimalarithmetik); nichts ist hier fest eingetragen.
import { Icon } from '@tethys/ui-basis';
import type { Betrag, Position } from '@tethys/vertrag';
import { formatiereMengeDe, formatiereProzentDe } from '@tethys/dezimal';
import { euro } from './rechnen';
import { anteil, differenzText } from './spiegel';
import type { SpiegelZelle, SpiegelZeile, Stat } from './spiegel';
import { useStore } from './store';
import { Seitenkopf, istTitel, oz } from './teile';

const NICHT = 'nicht angeboten';

function useGruppen() {
  const s = useStore();
  return s.knoten.filter(istTitel).map((t) => ({
    titel: t,
    zeilen: s.spiegel.zeilen.filter((z) => z.knoten.elternId === t.id),
  }));
}

// ---------- Rangfolge (oben, in allen Varianten) ----------

function Rangfolge({ balken }: { balken?: boolean }) {
  const s = useStore();
  const sp = s.spiegel;
  const bester = sp.summen[sp.rangfolge[0]!]!.nettoNachNachlass;
  const hoechster = sp.summen[sp.rangfolge[sp.rangfolge.length - 1]!]!.nettoNachNachlass;
  return (
    <section className="p-rangfolge" aria-label="Rangfolge der Bieter" data-rangfolge>
      <h2>Rangfolge nach Netto nach Nachlass</h2>
      <ol className={balken ? 'p-rang-balken' : 'p-rang-karten'}>
        {sp.rangfolge.map((i, r) => {
          const b = sp.bieter[i]!;
          const sm = sp.summen[i]!;
          const nichts = sp.nichtAngeboten[i]!;
          const nAus = sp.zeilen.filter((z) => z.zellen[i]!.ausreisser).length;
          return (
            <li key={b.id} data-bieter={b.name} data-rang={r + 1}>
              <div className="p-rang-karte__kopf">
                <span className={`p-rangzahl p-rangzahl--${r + 1}`}>{r + 1}</span>
                <strong>{b.name}</strong>
                <span className="p-rang-karte__diff">{r === 0 ? 'günstigster Bieter' : `${differenzText(sm.nettoNachNachlass, bester)} zum günstigsten`}</span>
              </div>
              {balken ? (
                <div className="p-gesamtbalken" aria-hidden="true">
                  <span className="p-gesamtbalken__voll" style={{ width: `${anteil(sm.nettoNachNachlass, hoechster) * 0.8}%` }} />
                  {b.nachlass ? <span className="p-gesamtbalken__nachlass" style={{ width: `${anteil(sm.nachlass, hoechster) * 0.8}%` }} /> : null}
                </div>
              ) : null}
              <div className="p-rang-karte__summe" data-wert="nach">{euro(sm.nettoNachNachlass)}</div>
              <div className="p-rang-karte__zeile">
                Netto {euro(sm.netto)}
                {b.nachlass ? <> · Nachlass {formatiereProzentDe(b.nachlass)} % = <span className="p-nachlass">−{euro(sm.nachlass)}</span></> : <> · kein Nachlass</>}
              </div>
              <div className="p-rang-karte__flags">
                {nichts > 0 ? <span className="p-flag p-flag--warn"><Icon name="warnung" groesse={12} /> {nichts} Position nicht angeboten, Summe nicht vollständig vergleichbar</span> : null}
                {nAus > 0 ? <span className="p-flag p-flag--warn"><Icon name="warnung" groesse={12} /> {nAus} Ausreißer</span> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Legende({ text }: { text: string }) {
  return (
    <p className="p-legende">
      <span className="p-nicht">{NICHT}</span> ist etwas anderes als <span className="p-null">0,00</span>: das Büro hat die Position nicht bepreist, die 0,00 ist ein angebotener Preis.
      {' '}Ausreißer: mehr als 20 % vom Mittel der Bieter. {text}
    </p>
  );
}

function StatZellen({ st }: { st: Stat }) {
  return (
    <>
      <td className="p-r p-mono p-virt" data-wert="min">{euro(st.min)}</td>
      <td className="p-r p-mono p-virt" data-wert="mittel">{euro(st.mittel)}</td>
      <td className="p-r p-mono p-virt" data-wert="max">{euro(st.max)}</td>
    </>
  );
}

// ---------- Zellen der Matrizen ----------

function farbe(z: SpiegelZelle): React.CSSProperties | undefined {
  if (z.gp === null || z.abweichung === null || z.staerke === 0) return undefined;
  const hoch = !z.abweichung.startsWith('-') && z.abweichung !== '0,0 %';
  const ton = hoch ? 'var(--tx-color-danger-subtle)' : 'var(--tx-color-success-subtle)';
  return { background: `color-mix(in srgb, ${ton} ${Math.max(25, z.staerke)}%, var(--tx-color-surface))` };
}

function ZelleFarbe({ z, bieter }: { z: SpiegelZelle; bieter: string }) {
  if (z.gp === null) return <td className="p-r p-zelle p-zelle--nicht" data-bieter={bieter} data-wert="nicht"><span className="p-nicht">{NICHT}</span></td>;
  return (
    <td className={`p-r p-zelle${z.ausreisser ? ' p-zelle--ausreisser' : ''}`} style={farbe(z)} data-bieter={bieter} data-wert="gp" data-ausreisser={z.ausreisser || undefined}>
      <span className="p-mono">{euro(z.gp)}</span>
      {z.abweichung ? <small className={z.ausreisser ? 'p-abw p-abw--warn' : 'p-abw'}>{z.ausreisser ? '⚠ ' : ''}{z.abweichung}</small> : null}
    </td>
  );
}

function ZelleRang({ z, bieter }: { z: SpiegelZelle; bieter: string }) {
  if (z.gp === null) return <td className="p-r p-zelle p-zelle--nicht" data-bieter={bieter} data-wert="nicht"><span className="p-nicht">{NICHT}</span></td>;
  return (
    <td className={`p-r p-zelle${z.ausreisser ? ' p-zelle--ausreisser' : ''}`} data-bieter={bieter} data-wert="gp" data-ausreisser={z.ausreisser || undefined}>
      <span className="p-zelle__reihe">
        <span className="p-mono">{euro(z.gp)}</span>
        <span className={`p-rangzahl p-rangzahl--${Math.min(z.rang ?? 3, 3)} p-rangzahl--klein`} title={`Rang ${z.rang ?? ''} unter den Bietern dieser Position`}>{z.rang}</span>
      </span>
      {z.ausreisser ? <small className="p-abw p-abw--warn">⚠ Ausreißer {z.abweichung}</small> : null}
    </td>
  );
}

function Matrix({ rang }: { rang?: boolean }) {
  const s = useStore();
  const sp = s.spiegel;
  const gruppen = useGruppen();
  const Z = rang ? ZelleRang : ZelleFarbe;
  const summenzeile = (name: string, feld: 'netto' | 'nach' | 'brutto' | 'mwst', st?: Stat, klasse = '') => {
    const f = { netto: 'netto', nach: 'nettoNachNachlass', brutto: 'brutto', mwst: 'mwst' }[feld] as 'netto';
    return (
      <tr className={`p-summenzeile ${klasse}`} data-zeile={feld}>
        <th scope="row" colSpan={4}>{name}</th>
        <td className="p-r p-mono p-schaetz" data-wert="schaetz">{euro(feld === 'netto' ? s.rechnung.summen.netto : feld === 'nach' ? s.rechnung.summen.nettoNachNachlass : feld === 'brutto' ? s.rechnung.summen.brutto : s.rechnung.summen.mwst)}</td>
        {sp.summen.map((sm, i) => (
          <td key={i} className="p-r p-mono" data-bieter={sp.bieter[i]!.name} data-wert={feld}>{euro(sm[f])}</td>
        ))}
        {st ? <StatZellen st={st} /> : <td colSpan={3} />}
      </tr>
    );
  };
  return (
    <div className="p-matrixrahmen">
      <table className="p-tab p-matrix" aria-label="Preisspiegel">
        <thead>
          <tr>
            <th>OZ</th>
            <th>Kurztext</th>
            <th className="p-r">Menge</th>
            <th>Einh.</th>
            <th className="p-r p-schaetz">Schätzpreis (LV)</th>
            {sp.bieter.map((b, i) => (
              <th key={b.id} className="p-r" data-bieter={b.name}>
                {b.name}
                <span className={`p-rangzahl p-rangzahl--${sp.rangfolge.indexOf(i) + 1} p-rangzahl--klein`} title="Rang nach Netto nach Nachlass">{sp.rangfolge.indexOf(i) + 1}</span>
              </th>
            ))}
            <th className="p-r p-virt">Min</th>
            <th className="p-r p-virt">Mittel</th>
            <th className="p-r p-virt">Max</th>
          </tr>
        </thead>
        <tbody>
          {gruppen.map(({ titel, zeilen }) => (
            <TitelBlock key={titel.id} titel={titel} zeilen={zeilen} Z={Z} />
          ))}
        </tbody>
        <tfoot>
          {summenzeile('Netto', 'netto', sp.nettoStat)}
          <tr className="p-summenzeile p-summenzeile--nachlass" data-zeile="nachlass">
            <th scope="row" colSpan={4}>Nachlass des Bieters (getrennt, nicht in den Einheitspreisen)</th>
            <td className="p-r p-mono p-schaetz">{euro(s.rechnung.summen.nachlass)}</td>
            {sp.summen.map((sm, i) => (
              <td key={i} className="p-r p-mono" data-bieter={sp.bieter[i]!.name} data-wert="nachlass">
                {sp.bieter[i]!.nachlass ? <><span className="p-nachlass">−{euro(sm.nachlass)}</span><small className="p-abw">{formatiereProzentDe(sp.bieter[i]!.nachlass!)} %</small></> : <span className="p-leise">kein Nachlass</span>}
              </td>
            ))}
            <td colSpan={3} />
          </tr>
          {summenzeile('Netto nach Nachlass', 'nach', sp.nachStat, 'p-summenzeile--fett')}
          {summenzeile('MwSt', 'mwst')}
          {summenzeile('Brutto', 'brutto')}
          <tr className="p-summenzeile" data-zeile="rang">
            <th scope="row" colSpan={5}>Rang nach Netto nach Nachlass</th>
            {sp.bieter.map((b, i) => (
              <td key={b.id} className="p-r" data-bieter={b.name} data-wert="rang"><span className={`p-rangzahl p-rangzahl--${sp.rangfolge.indexOf(i) + 1}`}>{sp.rangfolge.indexOf(i) + 1}</span></td>
            ))}
            <td colSpan={3} />
          </tr>
          {rang ? (
            <tr className="p-summenzeile" data-zeile="platzierungen">
              <th scope="row" colSpan={5}>Platz 1 / 2 / 3 bei den Positionen</th>
              {sp.bieter.map((b, i) => {
                const n = [1, 2, 3].map((r) => sp.zeilen.filter((z) => z.zellen[i]!.rang === r).length);
                return <td key={b.id} className="p-r p-mono">{n.join(' / ')}</td>;
              })}
              <td colSpan={3} />
            </tr>
          ) : null}
        </tfoot>
      </table>
    </div>
  );
}

function TitelBlock({ titel, zeilen, Z }: { titel: ReturnType<typeof useGruppen>[number]['titel']; zeilen: SpiegelZeile[]; Z: typeof ZelleFarbe }) {
  const s = useStore();
  const sp = s.spiegel;
  const st = sp.rechnungen.map((r) => r.titel.get(titel.id) ?? null);
  const stat = (() => {
    const w = st.filter((x): x is Betrag => x !== null);
    return w.length
      ? { min: w.reduce((a, b) => (b < a ? b : a)), mittel: null, max: w.reduce((a, b) => (b > a ? b : a)) }
      : { min: null, mittel: null, max: null };
  })();
  return (
    <>
      <tr className="p-tab__titel" data-titel={oz(titel)}>
        <td>{oz(titel)}</td>
        <td colSpan={3}>{titel.kurztext}</td>
        <td className="p-r p-mono p-schaetz">{euro(s.rechnung.titel.get(titel.id))}</td>
        {st.map((v, i) => (
          <td key={i} className="p-r p-mono" data-bieter={sp.bieter[i]!.name} data-wert="titel">{euro(v)}</td>
        ))}
        <td className="p-r p-mono p-virt">{euro(stat.min)}</td>
        <td className="p-virt" />
        <td className="p-r p-mono p-virt">{euro(stat.max)}</td>
      </tr>
      {zeilen.map((z) => {
        const p = z.knoten as Position;
        return (
          <tr key={p.id} data-oz={oz(p)}>
            <td className="p-mono">{oz(p)}</td>
            <td>{p.kurztext}</td>
            <td className="p-r p-mono">{p.menge ? formatiereMengeDe(p.menge) : ''}</td>
            <td>{p.einheit}</td>
            <td className="p-r p-mono p-schaetz" data-wert="schaetz">{euro(s.rechnung.gp.get(p.id))}</td>
            {z.zellen.map((zz, i) => (
              <Z key={i} z={zz} bieter={sp.bieter[i]!.name} />
            ))}
            <StatZellen st={z.stat} />
          </tr>
        );
      })}
    </>
  );
}

// ---------- Balken ----------

function BalkenZeile({ z }: { z: SpiegelZeile }) {
  const s = useStore();
  const sp = s.spiegel;
  const p = z.knoten as Position;
  const werte = z.zellen.map((c) => c.gp).filter((g): g is Betrag => g !== null);
  const skala = werte.reduce((a, b) => (b > a ? b : a), z.stat.mittel ?? ('0.00' as Betrag));
  const mittel = z.stat.mittel;
  const bewertbar = z.zellen.some((c) => c.abweichung !== null);
  return (
    <div className="p-balkenzeile" data-oz={oz(p)}>
      <div className="p-balkenzeile__text">
        <span className="p-mono">{oz(p)}</span>
        <span>{p.kurztext}</span>
        <small className="p-leise">{p.menge ? formatiereMengeDe(p.menge) : ''} {p.einheit}</small>
      </div>
      <div className="p-balkenzeile__chart" role="img" aria-label={`Preise zu ${p.kurztext}`}>
        {mittel && bewertbar ? (
          <span className="p-skala" aria-hidden="true">
            <span className="p-band" style={{ left: `${anteil(mittel, skala) * 0.9 * 0.8}%`, width: `${anteil(mittel, skala) * 0.9 * 0.4}%` }} />
            <span className="p-mittellinie" style={{ left: `${anteil(mittel, skala) * 0.9}%` }} title={`Mittel ${euro(mittel)}`} />
          </span>
        ) : null}
        {z.zellen.map((c, i) => (
          <div key={i} className="p-balken" data-bieter={sp.bieter[i]!.name} data-wert={c.gp === null ? 'nicht' : 'gp'} data-ausreisser={c.ausreisser || undefined}>
            <span className="p-balken__name">{sp.bieter[i]!.name.replace('Bieter ', '')}</span>
            <span className="p-balken__spur">
              {c.gp === null ? (
                <span className="p-balken__nicht">{NICHT}</span>
              ) : (
                <span
                  className={`p-balken__stab${c.ausreisser ? ' p-balken__stab--warn' : ''}${c.rang === 1 ? ' p-balken__stab--min' : ''}`}
                  style={{ width: `${Math.max(0.6, anteil(c.gp, skala) * 0.9)}%` }}
                />
              )}
            </span>
            <span className="p-balken__wert p-mono">
              {c.gp === null ? '' : euro(c.gp)}
              {c.ausreisser ? <small className="p-abw p-abw--warn"> ⚠ {c.abweichung}</small> : null}
            </span>
          </div>
        ))}
      </div>
      <div className="p-balkenzeile__stat p-mono">
        <span data-wert="min">Min {euro(z.stat.min)}</span>
        <span data-wert="mittel">Mittel {euro(z.stat.mittel)}</span>
        <span data-wert="max">Max {euro(z.stat.max)}</span>
      </div>
    </div>
  );
}

function Balken() {
  const gruppen = useGruppen();
  const s = useStore();
  const sp = s.spiegel;
  return (
    <div className="p-balkenaufbau" aria-label="Preisspiegel">
      {gruppen.map(({ titel, zeilen }) => (
        <section key={titel.id} className="p-balkengruppe" data-titel={oz(titel)}>
          <h2>
            <span className="p-mono">{oz(titel)}</span> {titel.kurztext}
          </h2>
          <ul className="p-titelsummen">
            {sp.bieter.map((b, i) => (
              <li key={b.id} data-bieter={b.name}>
                <span>{b.name}</span> <strong className="p-mono" data-bieter={b.name} data-wert="titel">{euro(sp.rechnungen[i]!.titel.get(titel.id))}</strong>
              </li>
            ))}
          </ul>
          {zeilen.map((z) => (
            <BalkenZeile key={z.knoten.id} z={z} />
          ))}
        </section>
      ))}
      <section className="p-balkengruppe">
        <h2>Summen</h2>
        <table className="p-tab" aria-label="Summen der Bieter">
          <thead>
            <tr>
              <th></th>
              {sp.bieter.map((b) => (
                <th key={b.id} className="p-r" data-bieter={b.name}>{b.name}</th>
              ))}
              <th className="p-r p-virt">Min</th>
              <th className="p-r p-virt">Mittel</th>
              <th className="p-r p-virt">Max</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['Netto', 'netto', sp.nettoStat],
                ['Nachlass (getrennt)', 'nachlass', null],
                ['Netto nach Nachlass', 'nettoNachNachlass', sp.nachStat],
                ['MwSt', 'mwst', null],
                ['Brutto', 'brutto', null],
              ] as const
            ).map(([name, f, st]) => (
              <tr key={f} data-zeile={f === 'nettoNachNachlass' ? 'nach' : f}>
                <th scope="row">{name}</th>
                {sp.summen.map((sm, i) => (
                  <td key={i} className="p-r p-mono" data-bieter={sp.bieter[i]!.name} data-wert={f === 'nettoNachNachlass' ? 'nach' : f}>
                    {f === 'nachlass' && !sp.bieter[i]!.nachlass ? <span className="p-leise">kein Nachlass</span> : f === 'nachlass' ? <span className="p-nachlass">−{euro(sm[f])}</span> : euro(sm[f])}
                  </td>
                ))}
                {st ? <StatZellen st={st} /> : <td colSpan={3} />}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function SpiegelAnsicht({ variante }: { variante: string }) {
  const frage = 'Teilfrage 2: Erkennt man auf einen Blick, wer günstig ist, wo Preise auffallen und wie die Rangfolge aussieht?';
  return (
    <div className="p-seite">
      <Seitenkopf titel="Preisspiegel" frage={frage} />
      <Rangfolge balken={variante === 'balken'} />
      {variante === 'rang' ? (
        <>
          <Legende text="Die Zahl im Kreis ist der Rang unter den Bietern dieser Position (1 = günstigster Preis)." />
          <Matrix rang />
        </>
      ) : variante === 'balken' ? (
        <>
          <Legende text="Senkrechte Linie = Mittel, hinterlegtes Band = ±20 %. Der günstigste Bieter je Position ist grün, Ausreißer sind rot." />
          <Balken />
        </>
      ) : (
        <>
          <Legende text="Grün = unter dem Mittel, rot = über dem Mittel; je stärker die Farbe, desto größer die Abweichung." />
          <Matrix />
        </>
      )}
    </div>
  );
}
