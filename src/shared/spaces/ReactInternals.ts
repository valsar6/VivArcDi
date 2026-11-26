import type { ShapeBoard } from '../../core/boot/ShapeGuards.js';

export interface RenameHooks {
  /** The Vivaldi id of the workspace of the row. */
  workspaceId: number;
  /** Setters of the list component that may start the renaming of an item, in hook order. */
  starters: Array<(workspaceId: number | undefined) => void>;
}

interface Fiber {
  return?: Fiber | null;
  memoizedProps?: Record<string, unknown> | null;
  memoizedState?: unknown;
}

interface Hook {
  memoizedState?: unknown;
  next?: Hook | null;
  queue?: { dispatch?: unknown } | null;
}

const FIBER_KEY = '__reactFiber';
const RENAME_KEY = 'react-rename';
const RENAME_EXPECTS = 'a workspace row has no React rename state: renaming a space may not work';

export class ReactInternals {
  #shape: Pick<ShapeBoard, 'report'>;

  /**
   * @param shape The board that is told, once, when a row has no rename state.
   */
  constructor(shape: Pick<ShapeBoard, 'report'>) {
    this.#shape = shape;
  }

  /**
   * The only class that reaches into React's internals, which Vivaldi's interface is built with. A
   * workspace row does not offer a way to start renaming from a script, so the state that does is
   * found through the row's fiber. A future Vivaldi that changes this makes the lookups return
   * null, never throw.
   *
   * @param row A row of the workspace menu.
   * @returns The workspace id and the candidate setters, or null when the structure is not there.
   */
  public renameHooks(row: Element): RenameHooks | null {
    const hooks = ReactInternals.#attempt(row);
    if (hooks === null) {
      this.#miss();
    }
    return hooks;
  }

  static #attempt(row: Element): RenameHooks | null {
    try {
      return ReactInternals.#find(row);
    } catch {
      return null;
    }
  }

  #miss(): void {
    try {
      this.#shape.report(RENAME_KEY, RENAME_EXPECTS);
    } catch {
      return;
    }
  }

  static #find(row: Element): RenameHooks | null {
    const key = Object.keys(row).find((name) => name.startsWith(FIBER_KEY));
    const item = ReactInternals.#up((row as unknown as Record<string, Fiber | undefined>)[key ?? ''], (props) => 'isRenaming' in props);
    const list = ReactInternals.#up(item?.return ?? undefined, (props) => 'workspaces' in props && 'hidePopup' in props);
    const id = item?.memoizedProps?.id;
    return list === undefined || typeof id !== 'number' ? null : { workspaceId: id, starters: ReactInternals.#starters(list) };
  }

  static #up(start: Fiber | undefined, wanted: (props: Record<string, unknown>) => boolean): Fiber | undefined {
    let fiber = start;
    while (fiber !== undefined && fiber !== null && !(fiber.memoizedProps != null && wanted(fiber.memoizedProps))) {
      fiber = fiber.return ?? undefined;
    }
    return fiber ?? undefined;
  }

  static #starters(list: Fiber): Array<(workspaceId: number | undefined) => void> {
    const starters: Array<(workspaceId: number | undefined) => void> = [];
    for (let hook = list.memoizedState as Hook | null | undefined; hook != null; hook = hook.next) {
      const dispatch = hook.queue?.dispatch;
      if (typeof dispatch === 'function' && hook.memoizedState === undefined) {
        starters.push(dispatch as (workspaceId: number | undefined) => void);
      }
    }
    return starters;
  }
}
