export interface GapSlot {
  offset: number;
  height: number;
  hidden: boolean;
}

export interface GapCorrection {
  shifts: Array<number | null>;
  hiddenHeight: number;
}

export class GapShifts {
  /**
   * Works out how far each visible slot of the tab strip moves up once the hidden slots take no space.
   *
   * @param slots The slots in any order, with the offset and height Vivaldi gave them.
   * @returns For each input slot its shift, or null when it is hidden, and the total height of the
   *   hidden rows; null when a slot has no valid offset or height, so the strip stays as Vivaldi draws it.
   */
  public static compute(slots: readonly GapSlot[]): GapCorrection | null {
    if (!slots.every((slot) => Number.isFinite(slot.offset) && Number.isFinite(slot.height))) {
      return null;
    }
    const rows = GapShifts.#closedRows(slots);
    const shifts = slots.map((slot) => {
      if (slot.hidden) {
        return null;
      }
      return rows.filter((row) => row.offset < slot.offset).reduce((total, row) => total + row.height, 0);
    });
    return { shifts, hiddenHeight: rows.reduce((total, row) => total + row.height, 0) };
  }

  static #closedRows(slots: readonly GapSlot[]): Array<{ offset: number; height: number }> {
    const rows = new Map<number, GapSlot[]>();
    for (const slot of slots) {
      rows.set(slot.offset, [...(rows.get(slot.offset) ?? []), slot]);
    }
    return [...rows.entries()]
      .filter(([, members]) => members.every((member) => member.hidden))
      .map(([offset, members]) => ({ offset, height: Math.max(...members.map((member) => member.height)) }));
  }
}
