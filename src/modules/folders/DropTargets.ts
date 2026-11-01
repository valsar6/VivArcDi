export type DropTarget =
  | { kind: 'header' }
  | { kind: 'folder'; id: string }
  | { kind: 'between'; before: string | null; rowId: string; edge: 'before' | 'after' };

interface RowBox {
  element: HTMLElement;
  id: string;
  isFolder: boolean;
  depth: number;
  top: number;
  height: number;
}

export const DROP_ATTRIBUTE = 'data-vivarcdi-drop';

const FOLDER_ATTRIBUTE = 'data-vivarcdi-folder-id';
const LINK_ATTRIBUTE = 'data-vivarcdi-link-id';
const DEPTH_ATTRIBUTE = 'data-vivarcdi-depth';
const FOLDER_EDGE_SHARE = 0.25;
const LINK_EDGE_SHARE = 0.5;

export class DropTargets {
  #section: () => HTMLElement;
  #header: () => HTMLElement | null;
  #marked: HTMLElement | null = null;

  /**
   * Finds what a point of the window stands for when a tab is released over the folders section
   * or its header, and marks it while the tab is dragged. The point is hit-tested against the
   * rectangles of the rows, since Vivaldi moves tabs with the mouse and sends no drag events. On a
   * folder row the upper and lower quarters are the gaps next to it and the rest is the folder; on
   * a link row the upper and lower halves are the gaps. A row inside a folder stands for that
   * folder: a tab released over it goes to the end of the folder.
   *
   * @param section Gives the element of the folders section.
   * @param header Gives the element of the space header, if it is in the window.
   */
  constructor(section: () => HTMLElement, header: () => HTMLElement | null) {
    this.#section = section;
    this.#header = header;
  }

  /**
   * @param x Horizontal position of the pointer in the window.
   * @param y Vertical position of the pointer in the window.
   * @returns The target under the point, or null when the point is elsewhere.
   */
  public at(x: number, y: number): DropTarget | null {
    if (DropTargets.#inside(this.#header(), x, y)) {
      return { kind: 'header' };
    }
    const section = this.#section();
    if (section.hasAttribute('hidden') || !DropTargets.#inside(section, x, y)) {
      return null;
    }
    const rows = DropTargets.#rows(section);
    const first = rows[0];
    if (first === undefined) {
      return null;
    }
    const index = rows.findIndex((row) => y >= row.top && y < row.top + row.height);
    if (index >= 0) {
      return DropTargets.#onRow(rows, index, y);
    }
    return y < first.top ? { kind: 'between', before: first.id, rowId: first.id, edge: 'before' } : DropTargets.#afterTopLevel(rows, rows.length - 1);
  }

  /**
   * Marks the target with `data-vivarcdi-drop`, after unmarking the previous one.
   *
   * @param target What to mark, or null to unmark.
   */
  public mark(target: DropTarget | null): void {
    this.clear();
    const element = target === null ? null : this.#elementOf(target);
    if (element !== null && target !== null) {
      element.setAttribute(DROP_ATTRIBUTE, target.kind === 'between' ? target.edge : 'into');
      this.#marked = element;
    }
  }

  /**
   * Removes the mark.
   */
  public clear(): void {
    this.#marked?.removeAttribute(DROP_ATTRIBUTE);
    this.#marked = null;
  }

  #elementOf(target: DropTarget): HTMLElement | null {
    if (target.kind === 'header') {
      return this.#header();
    }
    const id = target.kind === 'folder' ? target.id : target.rowId;
    return DropTargets.#rows(this.#section()).find((row) => row.id === id)?.element ?? null;
  }

  static #onRow(rows: RowBox[], index: number, y: number): DropTarget | null {
    const row = rows[index];
    if (row === undefined) {
      return null;
    }
    const zone = DropTargets.#zone(row, y);
    if (row.depth > 0) {
      const id = zone === 'middle' && row.isFolder ? row.id : DropTargets.#parentOf(rows, index);
      return id === null ? null : { kind: 'folder', id };
    }
    if (zone === 'middle') {
      return { kind: 'folder', id: row.id };
    }
    return zone === 'before' ? { kind: 'between', before: row.id, rowId: row.id, edge: 'before' } : DropTargets.#afterTopLevel(rows, index);
  }

  static #zone(row: RowBox, y: number): 'before' | 'middle' | 'after' {
    const share = (y - row.top) / row.height;
    const edge = row.isFolder ? FOLDER_EDGE_SHARE : LINK_EDGE_SHARE;
    if (share < edge) {
      return 'before';
    }
    return share >= 1 - edge ? 'after' : 'middle';
  }

  static #afterTopLevel(rows: RowBox[], index: number): DropTarget | null {
    const start = rows.findLastIndex((row, at) => at <= index && row.depth === 0);
    const row = rows[start];
    if (row === undefined) {
      return null;
    }
    const next = rows.find((candidate, at) => at > start && candidate.depth === 0);
    return { kind: 'between', before: next?.id ?? null, rowId: row.id, edge: 'after' };
  }

  static #parentOf(rows: RowBox[], index: number): string | null {
    const depth = rows[index]?.depth ?? 0;
    const parent = rows.findLast((row, at) => at < index && row.isFolder && row.depth === depth - 1);
    return parent?.id ?? null;
  }

  static #rows(section: HTMLElement): RowBox[] {
    return Array.from(section.children).flatMap((child) => {
      const element = child as HTMLElement;
      const id = element.getAttribute(FOLDER_ATTRIBUTE) ?? element.getAttribute(LINK_ATTRIBUTE);
      const { top, height } = element.getBoundingClientRect();
      return id === null ? [] : [{ element, id, isFolder: element.hasAttribute(FOLDER_ATTRIBUTE), depth: Number(element.getAttribute(DEPTH_ATTRIBUTE) ?? 0), top, height }];
    });
  }

  static #inside(element: HTMLElement | null, x: number, y: number): boolean {
    if (element === null) {
      return false;
    }
    const { left, right, top, bottom } = element.getBoundingClientRect();
    return x >= left && x < right && y >= top && y < bottom;
  }
}
