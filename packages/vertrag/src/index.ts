// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/vertrag: Domänentypen, Befehle, ChangeSet, Schnittstellen (Ticket 02).
// Nur Typen und Konstantentabellen (Nachkommastellen, Massenbefehle); keine Logik, keine Laufzeitabhängigkeit.

export type * from './marken';
export type * from './zahlen';
export type * from './modell';
export type * from './summen';
export type * from './befehle';
export type * from './changeset';
export type * from './speicher';
export type * from './gaeb';
export type * from './ansicht';

export { MASSENBEFEHLSARTEN } from './befehle';
export { NACHKOMMASTELLEN } from './zahlen';
