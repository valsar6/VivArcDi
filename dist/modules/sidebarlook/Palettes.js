const HEX_RADIX = 16;
const BYTE = 255;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const LINEAR_THRESHOLD = 0.04045;
const LINEAR_SLOPE = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_SCALE = 1.055;
const GAMMA = 2.4;
const CONTRAST_OFFSET = 0.05;
class Palettes {
  /**
   * `arclight`, the coral-to-aqua gradient of Arc's light theme, followed by the six palettes close to
   * Arc's light blue.
   */
  static all = Object.freeze([
    {
      name: "arclight",
      space: "#d0c9c5",
      gradient: { angle: 135, stops: ["#f3b8ac", "#d0c9c5", "#8ae3f2"] },
      pill: "#ffffff",
      ink: "#212121"
    },
    { name: "sky", space: "#a3cee0", pill: "#e9f3f7", ink: "#0f2129" },
    { name: "ice", space: "#b8dbe8", pill: "#eef6f9", ink: "#0f2129" },
    { name: "powder", space: "#9fc2dd", pill: "#e7eff6", ink: "#0f1f2c" },
    { name: "aqua", space: "#9fd6d2", pill: "#e8f5f4", ink: "#0e2423" },
    { name: "mist", space: "#b3c7d6", pill: "#edf2f6", ink: "#141f28" },
    { name: "lagoon", space: "#8ec5cf", pill: "#e4f1f4", ink: "#0c2126" }
  ]);
  /**
   * Name of the palette a workspace without a color of its own uses.
   */
  static defaultName = "arclight";
  /**
   * @param name A palette name from `config.json`.
   * @returns The palette, or the default one when the name is unknown.
   */
  static byName(name) {
    return Palettes.all.find((palette) => palette.name === name) ?? Palettes.#named(Palettes.defaultName);
  }
  /**
   * @param gradient A palette gradient.
   * @returns The CSS `linear-gradient(...)` value for it.
   */
  static css(gradient) {
    return `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(", ")})`;
  }
  /**
   * Computes the WCAG contrast ratio of two colors.
   *
   * @param first A color as `#rrggbb`.
   * @param second A color as `#rrggbb`.
   * @returns The ratio, from 1 (same color) to 21 (black on white).
   */
  static contrast(first, second) {
    const [light, dark] = [Palettes.#luminance(first), Palettes.#luminance(second)].sort((a, b) => b - a);
    return (light + CONTRAST_OFFSET) / (dark + CONTRAST_OFFSET);
  }
  static #named(name) {
    return Palettes.all.find((palette) => palette.name === name);
  }
  static #luminance(color) {
    const rgb = Number.parseInt(color.slice(1), HEX_RADIX);
    const [red, green, blue] = [rgb >> RED_SHIFT, rgb >> GREEN_SHIFT, rgb].map((shifted) => Palettes.#linear((shifted & BYTE) / BYTE));
    return RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue;
  }
  static #linear(channel) {
    return channel <= LINEAR_THRESHOLD ? channel / LINEAR_SLOPE : ((channel + GAMMA_OFFSET) / GAMMA_SCALE) ** GAMMA;
  }
}
export {
  Palettes
};
