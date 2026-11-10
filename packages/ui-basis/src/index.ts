// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/ui-basis: Bausteine ohne Fachwissen (A3). Die Tokens stehen in
// `tokens.css`, das Styling der Bausteine in `bausteine.css`; die App bindet beide ein.
// Ausnahme: Der Langtext-Editor liegt unter `src/langtext/` und kennt nur die Typen des Vertrags (`Langtext`),
// keine Rechenregeln und keine Befehle (Ticket 34).

export { Button, Tastenkuerzel } from './Button';
export type { ButtonProps, TastenkuerzelProps } from './Button';
export { Eingabefeld, Zahlfeld, pruefeZahlformatDeDE } from './Felder';
export type { EingabefeldProps, ZahlfeldProps, ZahlPruefer, Zahlpruefung } from './Felder';
export { Auswahl } from './Auswahl';
export type { AuswahlOption, AuswahlProps } from './Auswahl';
export { Dialog } from './Dialog';
export type { DialogProps } from './Dialog';
export { Tabs } from './Tabs';
export type { Reiter, TabsProps } from './Tabs';
export { Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';
export { ToastAnbieter, useToast } from './Toast';
export type { ToastAnbieterProps, ToastArt, ToastInhalt } from './Toast';
export { Icon } from './Icon';
export type { IconName, IconProps } from './Icon';
export { baustein as bausteinTexte, langtextTexte } from './texte';
export { LangtextEditor } from './langtext/LangtextEditor';
export type { LangtextEditorProps } from './langtext/LangtextEditor';
export {
  dokumentZuLangtext,
  langtextGleich,
  langtextKanonisch,
  langtextZuDokument,
} from './langtext/abbildung';
export type { DokumentKnoten, DokumentMarke } from './langtext/abbildung';
