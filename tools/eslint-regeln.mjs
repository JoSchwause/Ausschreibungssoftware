// SPDX-License-Identifier: AGPL-3.0-or-later
// N1 (Platzhalter): `number` ist für Menge, Preis, Betrag und Prozent verboten.
// Die Regel schlägt an, wenn ein Bezeichner mit Geld-Bezug als `number` typisiert ist.
// Sobald `dezimal` existiert, wird sie durch Typen aus `@tethys/dezimal` erfüllt und ggf. verschärft.

const GELD_NAME =
  '/^(menge|preis|einheitspreis|ep|gp|betrag|prozent|summe|mwst|nachlass)([A-Z0-9_]|$)|(Menge|Preis|Betrag|Prozent|Summe|Mwst|Nachlass)([A-Z0-9_]|$)/';

const meldung =
  'Regel N1: `number` ist für Menge, Preis, Betrag und Prozent verboten. Dezimaltyp aus @tethys/dezimal verwenden.';

/** @type {import('eslint').Rule.RuleModule} */
export const keineNumberFuerGeld = {
  meta: { type: 'problem', schema: [], messages: { geld: meldung } },
  create(context) {
    const selektor = [
      `Identifier[name=${GELD_NAME}] > TSTypeAnnotation > TSNumberKeyword`,
      `PropertyDefinition[key.name=${GELD_NAME}] > TSTypeAnnotation > TSNumberKeyword`,
      `TSPropertySignature[key.name=${GELD_NAME}] > TSTypeAnnotation > TSNumberKeyword`,
    ].join(', ');
    return { [selektor]: (node) => context.report({ node, messageId: 'geld' }) };
  },
};
