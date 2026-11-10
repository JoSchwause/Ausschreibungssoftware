// SPDX-License-Identifier: AGPL-3.0-or-later
// Kleiner, deterministischer XML-Schreiber für den GAEB-Export (Ticket 40). Rein (A2): baut eine Zeichenkette.
//
// Eingerückt mit zwei Leerzeichen je Ebene, ein Element je Zeile, damit die XSD-Gegenprüfung in der CI eine
// sprechende Zeile nennt. Textinhalt steht nur in Blattelementen (`span`, `Qty` …); der Leser übergeht Leerraum
// zwischen Elementen (Ticket 22), die Einrückung verändert den Inhalt also nicht.

/** Text für einen Elementinhalt: `&`, `<`, `>` und Steuerzeichen, die XML-Werkzeuge sonst umwandeln. */
export function maskiereText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#13;')
    .replace(/\t/g, '&#9;');
}

/** Text für einen Attributwert in doppelten Anführungszeichen. */
export function maskiereAttribut(s: string): string {
  return maskiereText(s).replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
}

export type Attribute = readonly (readonly [string, string | null | undefined])[];

function attributText(attrs: Attribute): string {
  let s = '';
  for (const [name, wert] of attrs)
    if (wert !== null && wert !== undefined) s += ` ${name}="${maskiereAttribut(wert)}"`;
  return s;
}

export class XmlAusgabe {
  private readonly zeilen: string[] = [];
  private readonly offen: string[] = [];

  private einzug(): string {
    return '  '.repeat(this.offen.length);
  }

  oeffne(name: string, attrs: Attribute = []): void {
    this.zeilen.push(`${this.einzug()}<${name}${attributText(attrs)}>`);
    this.offen.push(name);
  }

  schliesse(): void {
    const name = this.offen.pop();
    if (name === undefined) throw new Error('XmlAusgabe: kein offenes Element');
    this.zeilen.push(`${this.einzug()}</${name}>`);
  }

  /** Element mit Textinhalt; leerer Text ergibt ein leeres Element. */
  blatt(name: string, text: string, attrs: Attribute = []): void {
    const a = attributText(attrs);
    this.zeilen.push(
      text === ''
        ? `${this.einzug()}<${name}${a}/>`
        : `${this.einzug()}<${name}${a}>${maskiereText(text)}</${name}>`,
    );
  }

  /** Leeres Element. */
  leer(name: string, attrs: Attribute = []): void {
    this.zeilen.push(`${this.einzug()}<${name}${attributText(attrs)}/>`);
  }

  /** Element mit Kindern, die `inhalt` schreibt. */
  element(name: string, attrs: Attribute, inhalt: () => void): void {
    this.oeffne(name, attrs);
    inhalt();
    this.schliesse();
  }

  text(): string {
    if (this.offen.length > 0) throw new Error(`XmlAusgabe: ${this.offen.join('/')} nicht geschlossen`);
    return `${this.zeilen.join('\n')}\n`;
  }
}
