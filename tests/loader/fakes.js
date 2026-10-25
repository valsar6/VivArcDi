export class FakeLoader {
  #files;

  constructor(files) {
    this.#files = files;
  }

  url(path) {
    return `chrome-extension://vivaldi/vivarcdi/${path}`;
  }

  async json(path) {
    if (!(path in this.#files)) {
      throw new Error(`Missing ${path}`);
    }
    return structuredClone(this.#files[path]);
  }
}

export class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.dataset = {};
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name),
    };
    this.children = [];
    this.parent = null;
  }

  append(child) {
    child.parent = this;
    this.children.push(child);
  }

  remove() {
    if (this.parent) {
      this.parent.children = this.parent.children.filter((child) => child !== this);
    }
  }
}

export class FakeDocument {
  constructor(elementsBySelector = {}) {
    this.elements = elementsBySelector;
    this.head = new FakeElement('head');
  }

  querySelector(selector) {
    return this.elements[selector] ?? null;
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

export class SilentSink {
  constructor() {
    this.lines = [];
  }

  info(...args) {
    this.lines.push(['info', ...args]);
  }

  warn(...args) {
    this.lines.push(['warn', ...args]);
  }

  error(...args) {
    this.lines.push(['error', ...args]);
  }
}
