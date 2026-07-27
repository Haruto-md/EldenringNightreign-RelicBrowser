/**
 * Tracks whether a relic deletion has already been written + downloaded for
 * the currently loaded save file.
 *
 * Why this lives outside the component tree
 * -----------------------------------------
 * The in-memory `BND4Entry` objects are never updated after a delete: they
 * still hold the ORIGINAL bytes that were decrypted when the file was loaded.
 * A second delete therefore rebuilds the modified save from pristine bytes and
 * silently discards the first batch's deletions. The only safe recovery is for
 * the user to re-load the file they just downloaded, which produces fresh
 * entries.
 *
 * Holding this flag in `RelicBrowser` was not sufficient: the component is
 * unmounted whenever the user switches tabs, and it also re-mounted/reset on
 * character-slot changes, both of which silently unlocked the flow.
 *
 * Why the lock is file-scoped and not per-entry
 * ---------------------------------------------
 * Every `BND4Entry` parsed out of one save file shares the same `rawData`
 * buffer - the entire original .sl2 file (see `SaveFileDecryptor`, which
 * assigns `rawData: raw` to every entry). `SaveFileEncryptor.writeRelicDeletions`
 * builds its output as a copy of `deletions[0].entry.rawData` and re-encrypts
 * only the entries it touches. So deleting on character A and then, without
 * reloading, deleting on character B produces a download that contains B's
 * deletions on top of the ORIGINAL A data - A's deletions are gone. Per-entry
 * tracking would consider that second delete legitimate and hand the user a
 * file that silently omits the first one.
 *
 * The entry indices are still recorded rather than collapsing to a bare
 * boolean, because they are what makes the invariant checkable and they let
 * callers explain *which* character was already edited.
 */
export interface DeleteLockState {
  /**
   * BND4 entry indices that have had a successful delete + download during the
   * current file's session. Non-empty means the loaded bytes are stale.
   */
  readonly deletedEntryIndices: ReadonlySet<number>;
}

/** The state a freshly loaded (or cleared) save file starts in. */
export const emptyDeleteLock: DeleteLockState = {
  deletedEntryIndices: new Set<number>(),
};

/**
 * Records a successful delete + download against a BND4 entry index. Returns a
 * new state object; never mutates the one passed in.
 */
export function recordDelete(
  state: DeleteLockState,
  entryIndex: number
): DeleteLockState {
  const next = new Set(state.deletedEntryIndices);
  next.add(entryIndex);
  return { deletedEntryIndices: next };
}

/**
 * True when no further delete may be performed on the currently loaded file.
 *
 * Deliberately ignores which entry is being viewed: any earlier delete in this
 * session makes every entry's in-memory bytes stale for download purposes (see
 * the module comment).
 */
export function isDeleteLocked(state: DeleteLockState): boolean {
  return state.deletedEntryIndices.size > 0;
}

/**
 * True when this specific entry is the one that was already edited. Only for
 * messaging - `isDeleteLocked` is what gates the delete flow.
 */
export function hasEntryBeenDeletedFrom(
  state: DeleteLockState,
  entryIndex: number
): boolean {
  return state.deletedEntryIndices.has(entryIndex);
}
