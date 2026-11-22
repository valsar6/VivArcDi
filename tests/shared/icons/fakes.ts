import { DomDocument } from '../../core/dom.js';
import type { DomNode } from '../../core/dom.js';

export class SvgDocument extends DomDocument {
  public createElementNS(_namespace: string, tagName: string): DomNode {
    return this.createElement(tagName);
  }
}
