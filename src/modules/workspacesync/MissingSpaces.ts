import { StoredFormat, type Readout, type ReadingStorage } from '../../core/browser/StoredFormat.js';

const ANNOUNCED_KEY = 'vivarcdi.sync.announced';

const FORMAT = new StoredFormat<string[]>({
  empty: [],
  read: (data): Readout<string[]> | null => {
    if (!Array.isArray(data)) {
      return null;
    }
    const names = data.filter((name): name is string => typeof name === 'string');
    return { value: names, skipped: names.length < data.length };
  },
});

export class MissingSpaces {
  #storage: ReadingStorage;
  #notify: (text: string) => void;

  /**
   * Names the workspaces of the sync store that this computer lacks, once each, so the user can
   * create them with the same name. A name already shown stays quiet, also after a restart.
   *
   * @param storage Where the shown names are kept.
   * @param notify Shows the message.
   */
  constructor(storage: ReadingStorage, notify: (text: string) => void) {
    this.#storage = storage;
    this.#notify = notify;
  }

  /**
   * @param names The workspace names the store has and this computer lacks.
   */
  public announce(names: string[]): void {
    const shown = this.#shown();
    const fresh = names.filter((name) => !shown.includes(name));
    if (fresh.length > 0) {
      this.#storage.setItem(ANNOUNCED_KEY, FORMAT.encode([...shown, ...fresh]));
      this.#notify(`Spaces from your other computers: ${fresh.join(', ')}. Create them with the same name to get their pinned tabs.`);
    }
  }

  #shown(): string[] {
    return this.#storage.read(ANNOUNCED_KEY, FORMAT).value;
  }
}
