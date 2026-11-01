const EDIT_ATTRIBUTE = "data-vivarcdi-edit";
const EDIT_LABEL = "Folder name";
const WANTED_MS = 3e3;
class FolderNameEditor {
  #document;
  #timers;
  #onFinish;
  #editing = null;
  #input = null;
  #wanted = null;
  /**
   * The text field that replaces the name of a folder row while it is edited. It keeps what was
   * typed when the rows are drawn again, and asks for a folder that is not drawn yet, such as one
   * just created, for a few seconds.
   *
   * @param document The browser window document.
   * @param timers Timers, replaceable in tests.
   * @param onFinish Called when the edit ends, with the new name, or null when the name is kept (Escape, empty or unchanged text).
   */
  constructor(document, timers, onFinish) {
    this.#document = document;
    this.#timers = timers;
    this.#onFinish = onFinish;
  }
  /**
   * @param folderId A folder row.
   * @returns Whether its name is being edited.
   */
  isEditing(folderId) {
    return this.#editing?.id === folderId;
  }
  /**
   * Starts editing a folder whose row is drawn.
   *
   * @param folderId The folder.
   * @param original Its name now.
   */
  begin(folderId, original) {
    this.#editing = { id: folderId, original, draft: null };
    this.#input = null;
  }
  /**
   * Starts editing a folder as soon as its row is drawn, if that happens in a few seconds.
   *
   * @param folderId The folder.
   */
  wait(folderId) {
    this.#forgetWanted();
    this.#wanted = { id: folderId, timer: this.#timers.set(() => this.#wanted = null, WANTED_MS) };
  }
  /**
   * Called before the rows are drawn again: keeps the typed text, starts a waiting edit whose row
   * now exists, and ends an edit whose folder is gone.
   *
   * @param rows The rows about to be drawn.
   */
  prepare(rows) {
    if (this.#editing !== null && this.#input !== null) {
      this.#editing.draft = this.#input.value;
    }
    this.#input = null;
    const wanted = rows.find((row) => row.kind === "folder" && row.id === this.#wanted?.id);
    if (wanted !== void 0) {
      this.#forgetWanted();
      this.begin(wanted.id, wanted.title);
    }
    if (this.#editing !== null && !rows.some((row) => row.kind === "folder" && row.id === this.#editing?.id)) {
      this.#editing = null;
    }
  }
  /**
   * @returns The field for the folder being edited, to put in its row.
   */
  field() {
    const input = this.#document.createElement("input");
    input.className = "vivarcdi-folders-edit";
    input.setAttribute("type", "text");
    input.setAttribute("aria-label", EDIT_LABEL);
    input.setAttribute(EDIT_ATTRIBUTE, "");
    input.style.setProperty("-webkit-app-region", "no-drag");
    input.value = this.#editing?.draft ?? this.#editing?.original ?? "";
    input.addEventListener("keydown", (event) => this.#key(event, input));
    input.addEventListener("blur", () => this.#finish(true, input));
    this.#input = input;
    return input;
  }
  /**
   * Called after the rows are drawn: focuses the field, selecting the text the first time.
   */
  focus() {
    const input = this.#input;
    if (input === null) {
      return;
    }
    input.focus();
    if (this.#editing?.draft === null) {
      input.select();
    } else {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
  /**
   * Forgets a waiting edit and its timer.
   */
  dispose() {
    this.#forgetWanted();
  }
  #key(event, input) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      this.#finish(true, input);
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.#finish(false, input);
    }
  }
  #finish(save, input) {
    const editing = this.#editing;
    if (editing === null || input !== this.#input) {
      return;
    }
    const name = input.value.trim();
    this.#editing = null;
    this.#input = null;
    this.#onFinish(editing.id, save && name !== "" && name !== editing.original ? name : null);
  }
  #forgetWanted() {
    if (this.#wanted !== null) {
      this.#timers.clear(this.#wanted.timer);
      this.#wanted = null;
    }
  }
}
export {
  EDIT_ATTRIBUTE,
  FolderNameEditor
};
