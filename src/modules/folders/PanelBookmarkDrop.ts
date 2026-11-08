import type { DropPlace } from './DropPlace.js';
import type { DropTargets } from './DropTargets.js';
import { PanelDragData } from './PanelDragData.js';
import type { WorkspaceFavorites } from './WorkspaceFavorites.js';

export interface PanelBookmarkDropDependencies {
  /** The document of Vivaldi's browser window. */
  document: Document;
  targets: Pick<DropTargets, 'at' | 'mark' | 'clear'>;
  place: Pick<DropPlace, 'of'>;
  favorites: Pick<WorkspaceFavorites, 'copy'>;
}

export class PanelBookmarkDrop {
  #deps: PanelBookmarkDropDependencies;
  #onOver = (event: Event): void => this.#over(event as DragEvent);
  #onDrop = (event: Event): void => this.#drop(event as DragEvent);
  #onLeave = (event: Event): void => this.#leave(event as DragEvent);
  #onEnd = (): void => this.#deps.targets.clear();

  /**
   * Accepts bookmarks and bookmark folders dragged from Vivaldi's Bookmarks panel over the folders
   * section or the space header, and copies them there. The panel uses real HTML5 drag, so it
   * listens to the drag events in the capture phase. It touches only a drag that carries panel
   * bookmarks and is over a target; any other drag goes on as Vivaldi handles it.
   *
   * @param dependencies Everything it collaborates with.
   */
  constructor(dependencies: PanelBookmarkDropDependencies) {
    this.#deps = dependencies;
  }

  /**
   * Starts listening, in the capture phase.
   */
  public attach(): void {
    this.#deps.document.addEventListener('dragover', this.#onOver, true);
    this.#deps.document.addEventListener('drop', this.#onDrop, true);
    this.#deps.document.addEventListener('dragleave', this.#onLeave, true);
    this.#deps.document.addEventListener('dragend', this.#onEnd, true);
  }

  /**
   * Stops listening and removes the mark.
   */
  public detach(): void {
    this.#deps.document.removeEventListener('dragover', this.#onOver, true);
    this.#deps.document.removeEventListener('drop', this.#onDrop, true);
    this.#deps.document.removeEventListener('dragleave', this.#onLeave, true);
    this.#deps.document.removeEventListener('dragend', this.#onEnd, true);
    this.#deps.targets.clear();
  }

  #over(event: DragEvent): void {
    if (!PanelDragData.carriesBookmarks(event.dataTransfer?.types)) {
      return;
    }
    const target = this.#deps.targets.at(event.clientX, event.clientY);
    this.#deps.targets.mark(target);
    if (target !== null && event.dataTransfer !== null) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  #drop(event: DragEvent): void {
    const { dataTransfer } = event;
    if (dataTransfer === null || !PanelDragData.carriesBookmarks(dataTransfer.types)) {
      return;
    }
    const target = this.#deps.targets.at(event.clientX, event.clientY);
    if (target === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#deps.targets.clear();
    const ids = PanelDragData.ids(dataTransfer);
    if (ids.length > 0) {
      void this.#deps.favorites.copy(ids, this.#deps.place.of(target));
    }
  }

  #leave(event: DragEvent): void {
    if (event.relatedTarget === null) {
      this.#deps.targets.clear();
    }
  }
}
