import type { PayloadSource } from '../../core/boot/ResourceLoader.js';
import type { Logger } from '../../core/support/Logger.js';

export interface EmojiEntry {
  emoji: string;
  name: string;
  keywords: string[];
  category: string;
}

export interface EmojiCategory {
  id: string;
  label: string;
  emoji: EmojiEntry[];
}

interface RawEntry {
  e: string;
  n: string;
  k: string[];
}

interface RawCategory {
  id: string;
  label: string;
  emoji: RawEntry[];
}

const EMOJI_PATH = 'shared/emoji/emoji.json';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEntry = (value: unknown): value is RawEntry =>
  isRecord(value) &&
  typeof value['e'] === 'string' &&
  typeof value['n'] === 'string' &&
  Array.isArray(value['k']) &&
  value['k'].every((word) => typeof word === 'string');

const isCategory = (value: unknown): value is RawCategory =>
  isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['label'] === 'string' &&
  Array.isArray(value['emoji']);

export class EmojiCatalog {
  #categories: EmojiCategory[];

  /**
   * Holds the emoji of the picker, grouped by category, and searches them.
   *
   * @param categories Categories in the order the picker shows them.
   */
  private constructor(categories: EmojiCategory[]) {
    this.#categories = categories;
  }

  /**
   * Reads the emoji file of the payload; a file that cannot be read gives an empty catalog.
   *
   * @param payload Source of the files that ship with VivArcDi.
   * @param logger Logger that receives the warning.
   * @returns The catalog.
   */
  public static async load(payload: Pick<PayloadSource, 'json'>, logger: Logger): Promise<EmojiCatalog> {
    try {
      const data = await payload.json<unknown>(EMOJI_PATH);
      if (!isRecord(data) || !Array.isArray(data['categories'])) {
        throw new Error('the emoji file has an unexpected shape');
      }
      return new EmojiCatalog(data['categories'].filter(isCategory).map(EmojiCatalog.#category));
    } catch (error) {
      logger.warn('The emoji list could not be loaded', error);
      return new EmojiCatalog([]);
    }
  }

  static #category(raw: RawCategory): EmojiCategory {
    const emoji = raw.emoji
      .filter(isEntry)
      .map((entry) => ({ emoji: entry.e, name: entry.n, keywords: entry.k, category: raw.id }));
    return { id: raw.id, label: raw.label, emoji };
  }

  /**
   * @returns The categories in the order of the file.
   */
  public categories(): readonly EmojiCategory[] {
    return this.#categories;
  }

  /**
   * Finds the emoji whose name or keywords contain every word of the text.
   *
   * @param text Search text; case is ignored.
   * @returns The matches in file order, none for an empty text.
   */
  public search(text: string): EmojiEntry[] {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return [];
    }
    return this.#categories.flatMap((category) =>
      category.emoji.filter((entry) => {
        const haystack = [entry.name, ...entry.keywords].join(' ').toLowerCase();
        return words.every((word) => haystack.includes(word));
      }),
    );
  }
}
