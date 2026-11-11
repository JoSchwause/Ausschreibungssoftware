// SPDX-License-Identifier: AGPL-3.0-or-later
// „Stand als neues LV übernehmen“ (Ticket 48, Punkt 4, Vorschlag): `LeistungsverzeichnisAnlegen` mit dem Inhalt des
// Stands, neuer LV-Kennung und dem Namen „<LV> (Stand <Name>)“. Die Knoten bekommen neue Kennungen über `kopieBauen`
// des Kerns (Bezüge innerhalb des LV werden mit umgebogen); der Papierkorb des Stands kommt nicht mit.

import { kopieBauen } from '@tethys/kern';
import type {
  IdQuelle,
  KnotenId,
  LeistungsverzeichnisAnlegen,
  LeistungsverzeichnisId,
  LvStand,
} from '@tethys/vertrag';
import { texte } from '../historie/texte';

export function standAlsLvBefehl(stand: LvStand, ids: IdQuelle): LeistungsverzeichnisAnlegen {
  const lv = stand.zustand.leistungsverzeichnis;
  const id: LeistungsverzeichnisId = ids.leistungsverzeichnis();
  const wurzeln = lv.knoten.filter((k) => k.elternId === lv.id).map((k) => k.id as KnotenId);
  const knoten =
    wurzeln.length === 0
      ? []
      : kopieBauen(stand.zustand, wurzeln, ids).map((k) =>
          k.elternId === lv.id ? { ...k, elternId: id } : k,
        );
  return {
    art: 'LeistungsverzeichnisAnlegen',
    id,
    projektId: lv.projektId,
    inhalt: {
      name: texte.staende.neuerName(lv.name, stand.name),
      ozMaske: lv.ozMaske,
      mwstSatz: lv.mwstSatz,
      nachlass: lv.nachlass,
      ...(lv.auftraggeber !== undefined ? { auftraggeber: lv.auftraggeber } : {}),
      ...(lv.vergabeinformationen !== undefined ? { vergabeinformationen: lv.vergabeinformationen } : {}),
      wurzelId: id,
      knoten,
    },
  };
}
