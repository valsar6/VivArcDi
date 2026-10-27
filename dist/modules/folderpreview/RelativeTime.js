const SECOND = 1e3;
const MINUTE = 60;
const HOUR = 60;
const DAY = 24;
const MONTH_DAYS = 30;
const YEAR_MONTHS = 12;
class RelativeTime {
  /**
   * Writes how long ago a date was, as minutes, hours, days, months or years, in a language.
   *
   * @param date The past date.
   * @param now The current date.
   * @param locale A language tag such as `it` or `en-US`.
   * @returns For example "23 minuti fa" or "1 month ago"; "now" for less than a minute.
   */
  static format(date, now, locale) {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / SECOND / MINUTE));
    if (minutes < 1) {
      return formatter.format(0, "second");
    }
    const hours = Math.floor(minutes / HOUR);
    const days = Math.floor(hours / DAY);
    const months = Math.floor(days / MONTH_DAYS);
    if (hours < 1) {
      return formatter.format(-minutes, "minute");
    }
    if (days < 1) {
      return formatter.format(-hours, "hour");
    }
    if (months < 1) {
      return formatter.format(-days, "day");
    }
    const years = Math.floor(months / YEAR_MONTHS);
    return years < 1 ? formatter.format(-months, "month") : formatter.format(-years, "year");
  }
}
export {
  RelativeTime
};
