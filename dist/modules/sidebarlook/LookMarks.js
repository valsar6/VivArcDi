import { Palettes } from "./Palettes.js";
const LOOK_ATTRIBUTE = "data-vivarcdi-look";
const PALETTE_ATTRIBUTE = "data-vivarcdi-palette";
const GRADIENT_ATTRIBUTE = "data-vivarcdi-gradient";
const GRADIENT_PROPERTY = "--vivarcdi-gradient";
const WATCHED = ["style", "class", LOOK_ATTRIBUTE, PALETTE_ATTRIBUTE, GRADIENT_ATTRIBUTE];
class LookMarks {
  #browser;
  #palette = null;
  #observer = null;
  /**
   * Writes the marks and colors of a palette on Vivaldi's root and keeps them there while Vivaldi
   * redraws it, as it does when Automatically hide UI is turned on or off.
   *
   * @param browser Vivaldi's `#browser` element.
   */
  constructor(browser) {
    this.#browser = browser;
  }
  /**
   * Paints a palette, replacing the one painted before, and starts watching the root.
   *
   * @param palette The palette to show.
   */
  apply(palette) {
    this.#palette = palette;
    this.#paint(palette);
    this.#watch();
  }
  /**
   * Removes every mark and color and stops watching.
   */
  remove() {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#palette = null;
    this.#clear();
  }
  #watch() {
    if (this.#observer !== null) {
      return;
    }
    this.#observer = new MutationObserver(() => this.#repaintWhenStripped());
    this.#observer.observe(this.#browser, { attributes: true, attributeFilter: WATCHED });
  }
  #repaintWhenStripped() {
    if (this.#palette !== null && !this.#intact(this.#palette)) {
      this.#paint(this.#palette);
    }
  }
  #intact(palette) {
    const browser = this.#browser;
    return browser.hasAttribute(LOOK_ATTRIBUTE) && browser.getAttribute(PALETTE_ATTRIBUTE) === palette.name && browser.hasAttribute(GRADIENT_ATTRIBUTE) === (palette.gradient !== void 0) && browser.style.getPropertyValue("--vivarcdi-space") === palette.space;
  }
  #paint(palette) {
    this.#clear();
    const colors = { space: palette.space, pill: palette.pill, ink: palette.ink };
    this.#browser.setAttribute(LOOK_ATTRIBUTE, "");
    this.#browser.setAttribute(PALETTE_ATTRIBUTE, palette.name);
    for (const [name, value] of Object.entries(colors)) {
      this.#browser.style.setProperty(`--vivarcdi-${name}`, value);
    }
    if (palette.gradient) {
      this.#browser.setAttribute(GRADIENT_ATTRIBUTE, "");
      this.#browser.style.setProperty(GRADIENT_PROPERTY, Palettes.css(palette.gradient));
    }
  }
  #clear() {
    this.#browser.removeAttribute(LOOK_ATTRIBUTE);
    this.#browser.removeAttribute(PALETTE_ATTRIBUTE);
    this.#browser.removeAttribute(GRADIENT_ATTRIBUTE);
    ["space", "pill", "ink"].forEach((name) => this.#browser.style.removeProperty(`--vivarcdi-${name}`));
    this.#browser.style.removeProperty(GRADIENT_PROPERTY);
  }
}
export {
  GRADIENT_ATTRIBUTE,
  LOOK_ATTRIBUTE,
  LookMarks,
  PALETTE_ATTRIBUTE
};
