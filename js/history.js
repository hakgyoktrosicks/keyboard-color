// Undo / redo stack of state snapshots. Consecutive checkpoints of the same kind within
// `coalesceMs` (e.g. dragging a color picker) collapse into one undo step.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KC = Object.assign(root.KC || {}, { history: api });
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function createHistory({ limit = 100, coalesceMs = 600 } = {}) {
    let past = [];
    let future = [];
    let last = { kind: null, at: -Infinity };

    return {
      // Call with the state *before* a change.
      checkpoint(snapshot, kind = null, now = Date.now()) {
        const coalesce = kind !== null && kind === last.kind && now - last.at < coalesceMs;
        last = { kind, at: now };
        if (coalesce) return;
        past.push(snapshot);
        if (past.length > limit) past = past.slice(past.length - limit);
        future = [];
      },
      // Each returns the snapshot to restore, or null when there is nothing to do.
      undo(current) {
        if (!past.length) return null;
        future.push(current);
        last = { kind: null, at: -Infinity };
        return past.pop();
      },
      redo(current) {
        if (!future.length) return null;
        past.push(current);
        last = { kind: null, at: -Infinity };
        return future.pop();
      },
      canUndo: () => past.length > 0,
      canRedo: () => future.length > 0,
    };
  }

  return { createHistory };
});
