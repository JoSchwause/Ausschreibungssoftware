// SPDX-License-Identifier: AGPL-3.0-or-later
// Startprüfung (D-77): erkennt Fähigkeiten, keine Browsernamen. Die Browser-Umgebung wird hier nachgebildet.

import { describe, expect, it } from 'vitest';
import { fehlendeFaehigkeiten, type BrowserUmgebung } from './faehigkeiten';

/** Ein Worker, der wie Chromium die Option `type` liest und an der ungültigen Adresse scheitert. */
function ModulWorker(...args: unknown[]): never {
  const optionen = args[1] as { type?: string } | undefined;
  throw new SyntaxError(`ungültige Adresse (${String(optionen?.type)})`);
}

/** Ein älterer Worker ohne Module: liest `type` nie. */
function KlassischerWorker(): never {
  throw new SyntaxError('ungültige Adresse');
}

const konstruktor = function Konstruktor(): void {
  // nur vorhanden
};

function vollstaendig(): BrowserUmgebung {
  return {
    isSecureContext: true,
    navigator: { storage: { getDirectory: () => Promise.resolve({}) } },
    Worker: ModulWorker,
    crypto: { subtle: {}, getRandomValues: () => undefined },
    WebAssembly: {},
    Blob: konstruktor,
    File: konstruktor,
    URL: { createObjectURL: () => 'blob:x' },
    TextDecoder: konstruktor,
    TextEncoder: konstruktor,
  };
}

/** Die volle Umgebung ohne die genannten Einträge. */
function ohne(...namen: (keyof BrowserUmgebung)[]): BrowserUmgebung {
  return Object.fromEntries(
    Object.entries(vollstaendig()).filter(([name]) => !namen.includes(name as keyof BrowserUmgebung)),
  );
}

describe('fehlendeFaehigkeiten (Startprüfung, D-77)', () => {
  it('meldet nichts in einem Browser mit allen Fähigkeiten', () => {
    expect(fehlendeFaehigkeiten(vollstaendig())).toEqual([]);
  });

  it('meldet fehlendes OPFS (z. B. Browser ohne Ablage im privaten Fenster)', () => {
    expect(fehlendeFaehigkeiten({ ...vollstaendig(), navigator: { storage: {} } })).toEqual(['opfs']);
    expect(fehlendeFaehigkeiten({ ...vollstaendig(), navigator: {} })).toEqual(['opfs']);
  });

  it('meldet fehlende Worker; ohne Worker gibt es auch keine Module-Worker', () => {
    expect(fehlendeFaehigkeiten(ohne('Worker'))).toEqual(['worker', 'modulWorker']);
  });

  it('erkennt Worker ohne Module daran, dass die Option „type“ nie gelesen wird', () => {
    expect(fehlendeFaehigkeiten({ ...vollstaendig(), Worker: KlassischerWorker })).toEqual(['modulWorker']);
  });

  it('meldet fehlende Web Crypto (ohne sichere Verbindung fehlt crypto.subtle)', () => {
    expect(
      fehlendeFaehigkeiten({
        ...vollstaendig(),
        isSecureContext: false,
        crypto: { getRandomValues: () => undefined },
      }),
    ).toEqual(['kryptografie']);
  });

  it('meldet fehlendes WebAssembly, fehlende Datei-Schnittstellen und Textkodierung', () => {
    expect(fehlendeFaehigkeiten(ohne('WebAssembly', 'File', 'TextEncoder'))).toEqual([
      'webassembly',
      'dateien',
      'textkodierung',
    ]);
  });
});
