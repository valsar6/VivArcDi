const FIBER_KEY = "__reactFiber";
class ReactInternals {
  /**
   * The only class that reaches into React's internals, which Vivaldi's interface is built with. A
   * workspace row does not offer a way to start renaming from a script, so the state that does is
   * found through the row's fiber. A future Vivaldi that changes this makes the lookups return
   * null, never throw.
   *
   * @param row A row of the workspace menu.
   * @returns The workspace id and the candidate setters, or null when the structure is not there.
   */
  renameHooks(row) {
    try {
      return ReactInternals.#find(row);
    } catch {
      return null;
    }
  }
  static #find(row) {
    const key = Object.keys(row).find((name) => name.startsWith(FIBER_KEY));
    const item = ReactInternals.#up(row[key ?? ""], (props) => "isRenaming" in props);
    const list = ReactInternals.#up(item?.return ?? void 0, (props) => "workspaces" in props && "hidePopup" in props);
    const id = item?.memoizedProps?.id;
    return list === void 0 || typeof id !== "number" ? null : { workspaceId: id, starters: ReactInternals.#starters(list) };
  }
  static #up(start, wanted) {
    let fiber = start;
    while (fiber !== void 0 && fiber !== null && !(fiber.memoizedProps != null && wanted(fiber.memoizedProps))) {
      fiber = fiber.return ?? void 0;
    }
    return fiber ?? void 0;
  }
  static #starters(list) {
    const starters = [];
    for (let hook = list.memoizedState; hook != null; hook = hook.next) {
      const dispatch = hook.queue?.dispatch;
      if (typeof dispatch === "function" && hook.memoizedState === void 0) {
        starters.push(dispatch);
      }
    }
    return starters;
  }
}
export {
  ReactInternals
};
