const MARKS = /\p{Diacritic}/gu;
const NOT_A_WORD = /[^\p{L}\p{N}]+/u;
const NO_MATCH = Number.POSITIVE_INFINITY;
const STARTS = 0;
const WORD = 1;
const CONTAINS = 2;
function fold(text) {
  return text.normalize("NFD").replace(MARKS, "").toLowerCase();
}
function scoreOf(suggestion, typed) {
  const title = fold(suggestion.title);
  const host = fold(suggestion.host);
  if (title.startsWith(typed) || host.startsWith(typed)) {
    return STARTS;
  }
  if (title.split(NOT_A_WORD).some((word) => word.startsWith(typed))) {
    return WORD;
  }
  return [title, host, fold(suggestion.url)].some((field) => field.includes(typed)) ? CONTAINS : NO_MATCH;
}
function matches(suggestion, text) {
  return scoreOf(suggestion, fold(text.trim())) !== NO_MATCH;
}
export {
  NO_MATCH,
  fold,
  matches,
  scoreOf
};
