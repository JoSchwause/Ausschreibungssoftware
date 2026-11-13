// SPDX-License-Identifier: AGPL-3.0-or-later
// Der Kopf einer Zeile, die eine LV-Position zeigt (Ticket 123 Punkt 4, Ticket 131): einmal statt in jedem Zeilentyp.

import type { PositionId } from '@tethys/vertrag';

/** Welche Position eine Zeile zeigt und wie sie heißt. */
export interface Zeilenkopf {
  readonly positionId: PositionId;
  readonly oz: string;
  readonly kurztext: string;
  readonly einheit: string;
}
