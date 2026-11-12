export interface SpaceEntry {
  /** The random id that names the workspace on every computer. */
  syncId: string;
  name: string;
  /** Vivaldi's icon text, or null. */
  icon: string | null;
  /** Vivaldi's icon number, or null. */
  iconId: number | null;
}
