type Item = Record<string, unknown>;

const ID_KEYS = ['id', 'command'];
const LABEL_KEYS = ['label', 'name', 'text', 'title'];
const SEPARATOR_TYPE = 'separator';

const isItem = (value: unknown): value is Item => typeof value === 'object' && value !== null && !Array.isArray(value);

const isPlain = (item: Item): boolean => Object.values(item).every((value) => typeof value !== 'object' || value === null);

export class MenuItemShape {
  #sample: Item;
  #idKey: string;
  #labelKey: string;

  /**
   * The shape of the items of a menu that Vivaldi builds, learned from the items themselves: which
   * keys hold the id and the label, and the type of a plain command. New items are made with the
   * same keys, so Vivaldi reads them as it reads its own.
   *
   * @param sample A plain command item of the menu.
   * @param idKey The key of its id.
   * @param labelKey The key of its label.
   */
  private constructor(sample: Item, idKey: string, labelKey: string) {
    this.#sample = sample;
    this.#idKey = idKey;
    this.#labelKey = labelKey;
  }

  /**
   * @param items The items of a menu.
   * @returns The shape of the first plain command among them, or null when the items are not recognised.
   */
  public static from(items: readonly unknown[]): MenuItemShape | null {
    for (const item of items) {
      const idKey = MenuItemShape.#keyOf(item, ID_KEYS);
      const labelKey = MenuItemShape.#keyOf(item, LABEL_KEYS);
      if (isItem(item) && idKey !== null && labelKey !== null && item['type'] !== SEPARATOR_TYPE && isPlain(item)) {
        return new MenuItemShape(item, idKey, labelKey);
      }
    }
    return null;
  }

  /**
   * @param value What an activation reports: an id, or an object that has one.
   * @returns The id, or null.
   */
  public static idIn(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }
    const key = MenuItemShape.#keyOf(value, ID_KEYS);
    return isItem(value) && key !== null ? String(value[key]) : null;
  }

  /**
   * @returns A separator, or null when the items carry no type to say so.
   */
  public separator(): Item | null {
    return 'type' in this.#sample ? { type: SEPARATOR_TYPE } : null;
  }

  /**
   * @param id The id of the command.
   * @param label The text of the command.
   * @returns An item with the keys of the sample.
   */
  public command(id: string, label: string): Item {
    const item: Item = {};
    for (const key of Object.keys(this.#sample)) {
      item[key] = this.#valueOf(key, id, label);
    }
    return item;
  }

  #valueOf(key: string, id: string, label: string): unknown {
    if (key === this.#idKey) {
      return id;
    }
    if (key === this.#labelKey) {
      return label;
    }
    const value = this.#sample[key];
    if (typeof value === 'boolean') {
      return key !== 'checked';
    }
    if (typeof value === 'string') {
      return key === 'type' ? value : '';
    }
    return typeof value === 'number' ? 0 : null;
  }

  static #keyOf(value: unknown, keys: readonly string[]): string | null {
    return (isItem(value) ? keys.find((key) => typeof value[key] === 'string') : undefined) ?? null;
  }
}
