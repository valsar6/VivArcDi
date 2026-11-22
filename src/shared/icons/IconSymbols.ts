export interface IconSymbol {
  /** The id that is stored in a label. */
  id: string;
  /** The name the picker shows. */
  label: string;
  /** The path of the line drawing in a 24 by 24 box. */
  path: string;
}

const SYMBOLS: readonly IconSymbol[] = [
  { id: 'star', label: 'Star', path: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z' },
  { id: 'bookmark', label: 'Bookmark', path: 'M6 3h12v18l-6-4-6 4z' },
  { id: 'heart', label: 'Heart', path: 'M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20z' },
  { id: 'bolt', label: 'Bolt', path: 'M13 2L4 14h7l-1 8 9-12h-7z' },
  { id: 'triangle', label: 'Triangle', path: 'M12 4l9 16H3z' },
  { id: 'gear', label: 'Gear', path: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1' },
  { id: 'bell', label: 'Bell', path: 'M6 17v-6a6 6 0 0 1 12 0v6l2 2H4zM10 21h4' },
  { id: 'pin', label: 'Pin', path: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z' },
  { id: 'chat', label: 'Chat', path: 'M4 5h16v11H9l-5 4z' },
  { id: 'people', label: 'People', path: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.3a3 3 0 0 1 0 5.4M18 14.3c1.8.8 3 2.6 3 4.7' },
  { id: 'plane', label: 'Plane', path: 'M21 3L3 10l7 3 3 7zM21 3L10 13' },
  { id: 'ball', label: 'Ball', path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8.5l3 2.2-1.1 3.6h-3.8L9 10.7zM12 3v5.5M20.5 9.5L15 10.7M17.5 19l-3.6-4.7M6.5 19l3.6-4.7M3.5 9.5L9 10.7' },
  { id: 'moon', label: 'Moon', path: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z' },
  { id: 'globe', label: 'Globe', path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3.5 3.5 3.5 14.5 0 18M12 3c-3.5 3.5-3.5 14.5 0 18' },
  { id: 'music', label: 'Music', path: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  { id: 'camera', label: 'Camera', path: 'M4 7h3l2-3h6l2 3h3v13H4zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z' },
  { id: 'code', label: 'Code', path: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16' },
  { id: 'smile', label: 'Smile', path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 14a5 5 0 0 0 8 0M9 9.5v.5M15 9.5v.5' },
  { id: 'home', label: 'Home', path: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6' },
  { id: 'book', label: 'Book', path: 'M4 4h7a2 2 0 0 1 1 .3A2 2 0 0 1 13 4h7v16h-7a2 2 0 0 0-2 0H4zM12 4.5V20' },
  { id: 'mail', label: 'Mail', path: 'M3 5h18v14H3zM3 6l9 7 9-7' },
  { id: 'cloud', label: 'Cloud', path: 'M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17 18z' },
  { id: 'flag', label: 'Flag', path: 'M5 21V3M5 4h13l-3 4.5 3 4.5H5' },
  { id: 'key', label: 'Key', path: 'M15 4.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM11.8 12.2L4 20v-3M7 17l2 2' },
];

export class IconSymbols {
  /**
   * @returns The 24 line symbols a label may show, in the order of the picker.
   */
  public static all(): readonly IconSymbol[] {
    return SYMBOLS;
  }

  /**
   * @param id The id stored in a label.
   * @returns The symbol, or undefined when the id is not one of them.
   */
  public static byId(id: string): IconSymbol | undefined {
    return SYMBOLS.find((symbol) => symbol.id === id);
  }
}
