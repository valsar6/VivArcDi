import type { Row } from './FolderRows.js';

const ENTERING_ATTRIBUTE = 'data-vivarcdi-entering';
export const LEAVING_ATTRIBUTE = 'data-vivarcdi-leaving';

export interface TransitionRow {
  row: Row;
  state: 'entering' | 'leaving' | 'steady';
}

export class RowTransition {
  /**
   * Merges the rows before and after a folder was toggled into one list. A row only in the new list is
   * entering, a row only in the old list is leaving and stays right after the row that preceded it.
   *
   * @param before The rows drawn before the click.
   * @param after The rows to draw now.
   * @returns The rows to draw, each with its state, in display order.
   */
  public static merge(before: Row[], after: Row[]): TransitionRow[] {
    const keptKeys = new Set(after.map(RowTransition.#key));
    const oldKeys = new Set(before.map(RowTransition.#key));
    const merged: TransitionRow[] = [];
    let next = 0;
    for (const old of before) {
      if (!keptKeys.has(RowTransition.#key(old))) {
        merged.push({ row: old, state: 'leaving' });
        continue;
      }
      while (next < after.length) {
        const row = after[next++] as Row;
        merged.push({ row, state: oldKeys.has(RowTransition.#key(row)) ? 'steady' : 'entering' });
        if (RowTransition.#key(row) === RowTransition.#key(old)) {
          break;
        }
      }
    }
    after.slice(next).forEach((row) => merged.push({ row, state: oldKeys.has(RowTransition.#key(row)) ? 'steady' : 'entering' }));
    return merged;
  }

  /**
   * Marks a drawn row for the stylesheet. A leaving row loses its ids, so that a click on it does nothing.
   *
   * @param element The drawn row.
   * @param state Whether the row is entering, leaving or steady.
   * @returns The same element.
   */
  public static mark(element: HTMLElement, state: TransitionRow['state']): HTMLElement {
    if (state === 'entering') {
      element.setAttribute(ENTERING_ATTRIBUTE, '');
    } else if (state === 'leaving') {
      element.setAttribute(LEAVING_ATTRIBUTE, '');
      element.removeAttribute('data-vivarcdi-folder-id');
      element.removeAttribute('data-vivarcdi-link-id');
    }
    return element;
  }

  static #key(row: Row): string {
    return `${row.kind}:${row.id}`;
  }
}
