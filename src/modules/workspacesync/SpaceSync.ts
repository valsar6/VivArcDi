import type { Logger } from '../../core/support/Logger.js';
import type { WorkspaceNames } from '../../core/workspaces/WorkspaceNames.js';
import type { MenuResult } from './MenuCommand.js';
import type { MissingSpaces } from './MissingSpaces.js';
import type { SpaceBase } from './SpaceBase.js';
import type { SpaceEntry } from './SpaceEntry.js';
import type { SpaceIds } from './SpaceIds.js';
import type { SpaceList } from './SpaceList.js';
import { SpaceMerge } from './SpaceMerge.js';
import type { LocalSpace, SpacePlan, SpaceRename } from './SpaceMerge.js';
import type { SpaceRenamer } from './WorkspaceRenamer.js';
import type { SyncBase } from './SyncBase.js';
import type { SyncStore } from './SyncStore.js';

export interface SpaceSyncParts {
  names: Pick<WorkspaceNames, 'entries'>;
  ids: Pick<SpaceIds, 'fresh' | 'syncIdOf' | 'isDetached' | 'link' | 'detach'>;
  list: Pick<SpaceList, 'read' | 'write'>;
  base: Pick<SpaceBase, 'get' | 'set'>;
  pinnedBase: Pick<SyncBase, 'rename'>;
  store: Pick<SyncStore, 'renameSpace'>;
  creator: { create: (name: string) => Promise<MenuResult> };
  renamer: SpaceRenamer;
  missing: Pick<MissingSpaces, 'announce'>;
  /** Asks for another pass at the next quiet moment. */
  retry: () => void;
  logger: Logger;
}

export class SpaceSync {
  #parts: SpaceSyncParts;
  #warnedRename = false;

  /**
   * Keeps the list of workspaces the same on every computer: merges the workspaces here with the
   * list in the sync store, writes what changed here to the store, creates the workspaces this
   * computer lacks and follows renames made elsewhere. A workspace deleted elsewhere is never
   * deleted here. When Vivaldi's menu cannot be driven, the missing workspaces are only named.
   *
   * @param parts Everything the sync collaborates with.
   */
  constructor(parts: SpaceSyncParts) {
    this.#parts = parts;
  }

  /**
   * Runs the list sync once. Errors reach the caller.
   */
  public async run(): Promise<void> {
    const { ids, list, base, store, pinnedBase } = this.#parts;
    const known = base.get();
    const here = this.#here();
    if (here.length === 0 && known !== null && known.length > 0) {
      return;
    }
    const taking = here.filter(({ vivaldiId, name }) => !ids.isDetached(vivaldiId, name));
    const plan = SpaceMerge.merge({ local: taking, store: await list.read(), base: known, newId: () => ids.fresh() });
    plan.links.forEach(({ vivaldiId, syncId }) => ids.link(vivaldiId, syncId));
    plan.forget.forEach(({ vivaldiId, name }) => ids.detach(vivaldiId, name));
    await list.write(plan.list);
    for (const { from, to } of plan.renameStore) {
      await store.renameSpace(from, to);
      pinnedBase.rename(from, to);
    }
    await this.#renameHere(plan.renameHere);
    await this.#create(plan);
    base.set(this.#agreed(plan.list));
  }

  #here(): LocalSpace[] {
    return this.#parts.names.entries.map(({ id, name, icon, iconId }) => ({ vivaldiId: id, syncId: this.#parts.ids.syncIdOf(id), name, icon, iconId }));
  }

  #agreed(list: SpaceEntry[]): SpaceEntry[] {
    const here = this.#here();
    return list.flatMap(({ syncId }) => {
      const space = here.find((candidate) => candidate.syncId === syncId);
      return space === undefined ? [] : [{ syncId, name: space.name, icon: space.icon, iconId: space.iconId }];
    });
  }

  async #renameHere(renames: SpaceRename[]): Promise<void> {
    const { renamer, store, pinnedBase } = this.#parts;
    for (const { from, to } of renames) {
      if (await renamer.rename(from, to)) {
        await store.renameSpace(from, to);
        pinnedBase.rename(from, to);
      } else {
        this.#warnRename(from, to);
      }
    }
  }

  async #create({ create }: SpacePlan): Promise<void> {
    const { creator, missing, ids } = this.#parts;
    for (const [position, { syncId, name }] of create.entries()) {
      const result = await creator.create(name);
      if (result === 'done') {
        const created = [...this.#parts.names.entries].reverse().find((entry) => entry.name === name);
        if (created !== undefined) {
          ids.link(created.id, syncId);
        }
      } else if (result === 'deferred') {
        this.#parts.retry();
        return;
      } else {
        missing.announce(create.slice(position).map((entry) => entry.name));
        return;
      }
    }
  }

  #warnRename(from: string, to: string): void {
    if (!this.#warnedRename) {
      this.#warnedRename = true;
      this.#parts.logger.warn(`the workspace "${from}" was renamed "${to}" on another computer but could not be renamed here: it keeps its name`);
    }
  }
}
