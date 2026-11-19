export interface WaitSummary {
  count: number;
  median: number;
  longest: number;
}

export class WaitStatistics {
  /**
   * Summarises a list of waits.
   *
   * @param waits Durations in milliseconds.
   * @returns How many there are, their median (the mean of the two middle ones for an even count)
   *   and the longest; all zero for an empty list.
   */
  public static summarise(waits: number[]): WaitSummary {
    const sorted = [...waits].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const upper = sorted[middle] ?? 0;
    const lower = sorted[middle - 1] ?? upper;
    return {
      count: sorted.length,
      median: sorted.length % 2 === 1 ? upper : (lower + upper) / 2,
      longest: sorted[sorted.length - 1] ?? 0,
    };
  }
}
