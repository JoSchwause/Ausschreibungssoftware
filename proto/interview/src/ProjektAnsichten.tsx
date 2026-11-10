// Wegwerfcode. Ansicht 3: Projektübersicht. Drei Varianten.
//  baum    : Baum Projekt -> LV -> Angebot mit Detailfläche
//  reiter  : Registerkarten je LV
//  vorgang : Vorgangsliste (Ausschreiben, Angebote, Vergabe, Auftrag)
// Gespielt: Ein zweites LV existiert nur als Platzhalter. Zuschlag erzeugt einen Auftrags-LV-Eintrag ohne Inhalt.
import { useState } from 'react';
import { Button, Icon, Tabs } from '@tethys/ui-basis';
import { formatiereProzentDe } from '@tethys/dezimal';
import { euro } from './rechnen';
import { useStore } from './store';
import { Seitenkopf } from './teile';

const PROJEKT = 'Neubau Musterhaus am Beispielweg (erfunden)';
const BAUHERR = 'Muster-Bauherr (erfunden)';

function useKennzahlen() {
  const s = useStore();
  const sp = s.spiegel;
  const angebote = sp.bieter.map((b, i) => ({
    index: i,
    name: b.name,
    summe: sp.summen[i]!.nettoNachNachlass,
    netto: sp.summen[i]!.netto,
    nachlass: b.nachlass,
    rang: sp.rangfolge.indexOf(i) + 1,
    nichts: sp.nichtAngeboten[i]!,
    quelle: i === 1 ? (s.gaeb.x84 ? 'aus X84 eingelesen' : 'erfasst (X84 liegt bereit)') : 'erfasst',
  }));
  return { s, angebote };
}

function Schalter({ ansicht, children }: { ansicht: string; children: React.ReactNode }) {
  const s = useStore();
  return (
    <Button groesse="sm" onClick={() => s.navigiere(ansicht)}>
      {children}
    </Button>
  );
}

function ZuschlagBox() {
  const { s, angebote } = useKennzahlen();
  if (s.zuschlag === null) {
    return (
      <div className="p-zuschlag">
        <p className="p-leise">Noch kein Zuschlag. Der Auftrags-LV entsteht erst bei der Vergabe als eigenes Objekt.</p>
        {angebote.map((a) => (
          <Button key={a.name} groesse="sm" onClick={() => s.setZuschlag(a.index)}>
            Zuschlag an {a.name}
          </Button>
        ))}
      </div>
    );
  }
  const a = angebote[s.zuschlag]!;
  return (
    <div className="p-zuschlag p-zuschlag--erteilt" data-auftrag>
      <p>
        <Icon name="haken" groesse={14} /> <strong>Auftrags-LV</strong> an {a.name}: <strong>{euro(a.summe)}</strong> netto nach Nachlass
      </p>
      <p className="p-leise">Gespielt: Der Auftrags-LV ist ein eigenes Objekt mit eigenen Preisen. Sein Inhalt ist noch nicht im Prototyp.</p>
      <Button groesse="sm" variante="schlicht" onClick={() => s.setZuschlag(null)}>
        Zuschlag zurücknehmen
      </Button>
    </div>
  );
}

function AngeboteTabelle() {
  const { angebote } = useKennzahlen();
  return (
    <table className="p-tab" aria-label="Angebote">
      <thead>
        <tr>
          <th>Angebot</th>
          <th className="p-r">Netto</th>
          <th>Nachlass</th>
          <th className="p-r">Netto nach Nachlass</th>
          <th>Rang</th>
          <th>Hinweis</th>
        </tr>
      </thead>
      <tbody>
        {angebote.map((a) => (
          <tr key={a.name}>
            <td>{a.name}</td>
            <td className="p-r p-mono">{euro(a.netto)}</td>
            <td>{a.nachlass ? `${formatiereProzentDe(a.nachlass)} %` : 'keiner'}</td>
            <td className="p-r p-mono">{euro(a.summe)}</td>
            <td>{a.rang}</td>
            <td className="p-leise">{a.quelle}{a.nichts ? `, ${a.nichts} Position nicht angeboten` : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Variante baum ----------

type Knotenart = { id: string; titel: string; art: string; tiefe: number; icon: 'projekt' | 'verzeichnis' | 'vergabe' | 'info' };

function Baum() {
  const { s, angebote } = useKennzahlen();
  const [wahl, setWahl] = useState('lv1');
  const [zu, setZu] = useState<ReadonlySet<string>>(new Set());
  const knoten: (Knotenart & { eltern: string | null })[] = [
    { id: 'projekt', titel: PROJEKT, art: 'Projekt', tiefe: 0, icon: 'projekt', eltern: null },
    { id: 'lv1', titel: s.lvName, art: 'Leistungsverzeichnis', tiefe: 1, icon: 'verzeichnis', eltern: 'projekt' },
    { id: 'aus', titel: 'Ausschreibungs-LV', art: 'Ausschreibung', tiefe: 2, icon: 'verzeichnis', eltern: 'lv1' },
    ...angebote.map((a) => ({ id: `ang${String(a.index)}`, titel: `Angebot ${a.name}`, art: 'Angebot', tiefe: 2, icon: 'vergabe' as const, eltern: 'lv1' })),
    ...(s.zuschlag !== null ? [{ id: 'auftrag', titel: `Auftrags-LV (${angebote[s.zuschlag]!.name})`, art: 'Auftrag', tiefe: 2, icon: 'verzeichnis' as const, eltern: 'lv1' }] : []),
    { id: 'lv2', titel: 'Haustechnik (noch nicht im Prototyp)', art: 'Leistungsverzeichnis', tiefe: 1, icon: 'verzeichnis', eltern: 'projekt' },
  ];
  const sichtbar = knoten.filter((k) => {
    let e = k.eltern;
    while (e) {
      if (zu.has(e)) return false;
      e = knoten.find((x) => x.id === e)?.eltern ?? null;
    }
    return true;
  });
  const k = knoten.find((x) => x.id === wahl)!;
  const a = wahl.startsWith('ang') ? angebote[Number(wahl.slice(3))] : undefined;
  return (
    <div className="p-baumaufbau">
      <ul className="p-baum" role="tree" aria-label="Projekt">
        {sichtbar.map((n) => {
          const hatKinder = knoten.some((x) => x.eltern === n.id);
          return (
            <li key={n.id} role="treeitem" aria-selected={n.id === wahl} aria-level={n.tiefe + 1} className={n.id === wahl ? 'ist-gewaehlt' : ''} style={{ paddingLeft: 8 + n.tiefe * 18 }}>
              <button type="button" className="p-baum__knopf" onClick={() => setWahl(n.id)}>
                {hatKinder ? (
                  <span
                    role="button"
                    aria-label={zu.has(n.id) ? 'Aufklappen' : 'Zuklappen'}
                    className="p-klapp"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZu((alt) => {
                        const neu = new Set(alt);
                        if (neu.has(n.id)) neu.delete(n.id);
                        else neu.add(n.id);
                        return neu;
                      });
                    }}
                  >
                    <Icon name="pfeilUnten" groesse={12} style={{ transform: zu.has(n.id) ? 'rotate(-90deg)' : undefined }} />
                  </span>
                ) : (
                  <span className="p-klapp" />
                )}
                <Icon name={n.icon} groesse={14} />
                <span>{n.titel}</span>
                <small className="p-leise">{n.art}</small>
              </button>
            </li>
          );
        })}
      </ul>
      <section className="p-detail" aria-label="Details">
        <h2>{k.titel}</h2>
        <p className="p-leise">{k.art}</p>
        {wahl === 'projekt' ? (
          <dl className="p-liste">
            <dt>Bauherr</dt><dd>{BAUHERR}</dd>
            <dt>Leistungsverzeichnisse</dt><dd>2 (eines davon Platzhalter)</dd>
            <dt>Bieter</dt><dd>{angebote.map((x) => x.name).join(', ')}</dd>
          </dl>
        ) : null}
        {wahl === 'lv1' || wahl === 'aus' ? (
          <>
            <dl className="p-liste">
              <dt>Netto</dt><dd>{euro(s.rechnung.summen.netto)}</dd>
              <dt>Nachlass</dt><dd>{formatiereProzentDe(s.nachlass)} %</dd>
              <dt>Brutto</dt><dd>{euro(s.rechnung.summen.brutto)}</dd>
              <dt>Angebote</dt><dd>3</dd>
            </dl>
            <div className="p-aktionen"><Schalter ansicht="lv">LV bearbeiten</Schalter><Schalter ansicht="spiegel">Preisspiegel</Schalter><Schalter ansicht="gaeb">GAEB</Schalter></div>
            {wahl === 'lv1' ? <ZuschlagBox /> : null}
          </>
        ) : null}
        {a ? (
          <>
            <dl className="p-liste">
              <dt>Netto</dt><dd>{euro(a.netto)}</dd>
              <dt>Nachlass</dt><dd>{a.nachlass ? `${formatiereProzentDe(a.nachlass)} %` : 'keiner'}</dd>
              <dt>Netto nach Nachlass</dt><dd>{euro(a.summe)}</dd>
              <dt>Rang</dt><dd>{a.rang}</dd>
              <dt>Herkunft</dt><dd>{a.quelle}</dd>
              {a.nichts ? (<><dt>Nicht angeboten</dt><dd>{a.nichts} Position</dd></>) : null}
            </dl>
            <Schalter ansicht="spiegel">Im Preisspiegel ansehen</Schalter>
          </>
        ) : null}
        {wahl === 'auftrag' ? <ZuschlagBox /> : null}
        {wahl === 'lv2' ? <p className="p-platzhalter">Noch nicht im Prototyp.</p> : null}
      </section>
    </div>
  );
}

// ---------- Variante reiter ----------

function Reiter() {
  const { s } = useKennzahlen();
  return (
    <Tabs
      label="Leistungsverzeichnisse"
      reiter={[
        {
          wert: 'lv1',
          label: s.lvName,
          inhalt: (
            <div className="p-reiterinhalt">
              <section className="p-karte p-karte--eben">
                <h2>Ausschreibung</h2>
                <dl className="p-liste">
                  <dt>Netto</dt><dd>{euro(s.rechnung.summen.netto)}</dd>
                  <dt>Brutto</dt><dd>{euro(s.rechnung.summen.brutto)}</dd>
                  <dt>Positionen</dt><dd>25 in 3 Titeln</dd>
                </dl>
                <div className="p-aktionen"><Schalter ansicht="lv">LV bearbeiten</Schalter><Schalter ansicht="gaeb">X83 exportieren</Schalter></div>
              </section>
              <section className="p-karte p-karte--eben">
                <h2>Angebote</h2>
                <AngeboteTabelle />
                <Schalter ansicht="spiegel">Preisspiegel</Schalter>
              </section>
              <section className="p-karte p-karte--eben">
                <h2>Auftrag</h2>
                <ZuschlagBox />
              </section>
            </div>
          ),
        },
        {
          wert: 'lv2',
          label: 'Haustechnik',
          inhalt: <p className="p-platzhalter">Noch nicht im Prototyp. Ein zweites LV hätte denselben Aufbau: Ausschreibung, Angebote, Auftrag.</p>,
        },
      ]}
    />
  );
}

// ---------- Variante vorgang ----------

function Vorgang() {
  const { s, angebote } = useKennzahlen();
  const beste = angebote.find((a) => a.rang === 1)!;
  const phasen: { name: string; schritte: { text: string; stand: 'fertig' | 'offen' | 'laeuft'; knopf?: [string, string] }[] }[] = [
    {
      name: 'Ausschreiben',
      schritte: [
        { text: `LV „${s.lvName}“ aufgestellt, Netto ${euro(s.rechnung.summen.netto)}`, stand: 'fertig', knopf: ['LV bearbeiten', 'lv'] },
        { text: s.gaeb.export ? 'X83 als Entwurf exportiert' : 'X83 exportieren', stand: s.gaeb.export ? 'fertig' : 'offen', knopf: ['GAEB', 'gaeb'] },
      ],
    },
    {
      name: 'Angebote',
      schritte: [
        { text: '3 Angebote erfasst (Bieter A, B, C)', stand: 'fertig' },
        { text: s.gaeb.x84 ? 'X84 von Bieter B eingelesen' : 'X84 von Bieter B einlesen', stand: s.gaeb.x84 ? 'fertig' : 'offen', knopf: ['GAEB', 'gaeb'] },
      ],
    },
    {
      name: 'Vergabe',
      schritte: [
        { text: `Preisspiegel prüfen: günstigster Bieter ${beste.name} mit ${euro(beste.summe)}`, stand: 'laeuft', knopf: ['Preisspiegel', 'spiegel'] },
        { text: s.zuschlag === null ? 'Zuschlag erteilen' : `Zuschlag an ${angebote[s.zuschlag]!.name} erteilt`, stand: s.zuschlag === null ? 'offen' : 'fertig' },
      ],
    },
    {
      name: 'Auftrag',
      schritte: [{ text: s.zuschlag === null ? 'Auftrags-LV entsteht mit dem Zuschlag' : 'Auftrags-LV angelegt (Inhalt noch nicht im Prototyp)', stand: s.zuschlag === null ? 'offen' : 'fertig' }],
    },
  ];
  const marke = { fertig: 'erledigt', offen: 'offen', laeuft: 'in Arbeit' } as const;
  return (
    <div className="p-vorgang">
      <ol className="p-phasen">
        {phasen.map((p, i) => (
          <li key={p.name} className="p-phase">
            <h2>
              <span className="p-schritt">{i + 1}</span> {p.name}
            </h2>
            <ul>
              {p.schritte.map((st) => (
                <li key={st.text} className={`p-vschritt p-vschritt--${st.stand}`}>
                  <span className="p-vschritt__marke">{marke[st.stand]}</span>
                  <span>{st.text}</span>
                  {st.knopf ? <Schalter ansicht={st.knopf[1]}>{st.knopf[0]}</Schalter> : null}
                </li>
              ))}
            </ul>
            {p.name === 'Angebote' ? <AngeboteTabelle /> : null}
            {p.name === 'Vergabe' ? <ZuschlagBox /> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ProjektAnsicht({ variante }: { variante: string }) {
  return (
    <div className="p-seite">
      <Seitenkopf
        titel={PROJEKT}
        frage="Teilfrage 3: Passt „ein Projekt, mehrere LVs, Angebote und Auftrags-LV als getrennte Objekte“ zur Denkweise im Büro?"
      >
        <span className="p-leise">Bauherr: {BAUHERR}</span>
      </Seitenkopf>
      {variante === 'reiter' ? <Reiter /> : variante === 'vorgang' ? <Vorgang /> : <Baum />}
    </div>
  );
}
