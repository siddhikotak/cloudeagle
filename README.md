# Editable Data Table

A 10,000-row editable data table built from scratch on React 19 + TypeScript + Vite. No table library: every piece — virtualization, inline cell editing, sort, filter, pagination, undo/redo, CSV export — is custom, so the public API and performance characteristics are fully under our control.

---

## Setup

```bash
pnpm install
pnpm dev          # Vite dev server
pnpm build        # tsc -b && vite build
pnpm typecheck    # tsc -b --noEmit
pnpm lint
pnpm format
```

Requires Node 20.19+ / 22.13+ / 24+ and pnpm 9+. Open the URL Vite prints (usually `http://localhost:5173`).

---

## Architecture decisions

| Decision                                                   | Why                                                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Custom table instead of TanStack Table / AG Grid           | Full control over API surface, edit semantics, and rendering cost. No bundle bloat from features we don't need.                                  |
| Generic `ColumnDef<TRow, K>` + `defineColumn` helper       | `sortFn`, `filterFn`, `validate` receive the exact value type per column. Consumer doesn't write `as` casts.                                     |
| Split context: `TableStateContext` + `TableActionsContext` | Actions context is referentially stable; rows subscribe to it without re-rendering on state changes. State changes funnel through one component. |
| Cell drafts in local `useState` (not context)              | Typing cost is O(1) per cell regardless of dataset size. No global update on keystroke.                                                          |
| Singleton `editingCell: { rowId, columnId } \| null`       | Exactly one cell edits at a time. No N concurrent drafts to reconcile.                                                                           |
| Pure sort / filter / pagination utilities                  | No React, no mutation. Trivial to test, reuse, or replace with a server-side path.                                                               |
| Hand-rolled virtualization                                 | One `useState` for scroll position + a few `Math.floor`s. No dep, no abstraction tax.                                                            |
| `display: block` on the `<table>` element                  | Default `display: table` won't size `display: block` thead/tbody children — they collapse to intrinsic content width (~80px).                    |
| `lodash-es/debounce` for validation error UI               | Single tiny utility; full lodash isn't worth pulling in.                                                                                         |
| Portal the edit dropdown to `document.body`                | Escapes all `overflow: hidden` and `overflow: auto` ancestors that would otherwise clip the menu inside its row.                                 |

### Folder layout

```
src/
  components/
    table/                  # Dumb presentational primitives
    layout/                 # App shell
    EditableTable.tsx       # Container: data + columns + virtualization
    EditableTableRow.tsx    # Memoized row, cell-level edit wiring
    EditableCell.tsx        # Text/number leaf, local draft + validation
    EditableSelectCell.tsx  # Enum-select leaf with portaled menu
    TableContext.tsx        # Two-context provider (state + actions)
    Pagination.tsx
    AdvancedEmployeeTable.tsx  # Demo
  hooks/
    useTableState.ts        # All state slots + memoized actions
    useTable.ts             # Consumer hook
    useUndoRedo.ts          # Edit history + commitChanges
    useVirtualRows.ts       # Fixed-row-height virtualization
    useBeforeUnloadWarning.ts
  utils/
    generateData.ts         # 10k deterministic mock employees (mulberry32)
    sorting.ts              # Multi-column stable sort
    filtering.ts            # Global + per-column filter, debounced helper
    pagination.ts
    csv.ts
    columnSize.ts
  types/
    table.ts                # Column API + state types
    employee.ts
```

---

## Performance optimization strategy

Goal: typing in one cell of a 10,000-row table must not re-render the table.

Tactics, in order of impact:

1. **Virtualization** — only the visible window (≈20 rows) exists in the DOM. (See next section.)
2. **`React.memo` on the row** — editing/selecting a cell re-renders at most 2 rows.
3. **Cell-local drafts** — keystrokes never reach context, parents, or siblings.
4. **Two contexts** — action callbacks have a stable identity; state changes flow through one component (`EditableTable`) which narrows them to per-row booleans before broadcasting.
5. **`useMemo` on derived data** — sort and filter run only when inputs change.
6. **Debounced validation UI** — synchronous validation on every keystroke, debounced (150 ms) display of error messages. Save explicitly cancels the pending debounce and validates synchronously, so committed values are never stale.
7. **Pre-resolved column lookups** — `columns.find(id)` runs once before the sort/filter pass, not inside the predicate.

---

## Virtualization explanation

`useVirtualRows({ rowCount, rowHeight, overscan })`:

```
visibleStart = floor(scrollTop / rowHeight) − overscan
visibleEnd   = ceil((scrollTop + containerHeight) / rowHeight) + overscan
virtualRows  = [visibleStart..visibleEnd].map(i ⇒ ({ index: i, start: i * rowHeight, size: rowHeight }))
```

DOM layout:

- `<tbody>`: `position: relative; height: rowCount * rowHeight; display: block`
- Each rendered row: `position: absolute; left: 0; right: 0; transform: translateY(virtualRow.start)`
- Browser scrolls a `rowCount * rowHeight`-tall container that contains ≈20 actual elements.

**Layout subtlety.** The `<table>` element is `display: block`. Under the default `display: table`, browsers don't size `display: block` `<thead>` / `<tbody>` children to the table's width — they collapse to intrinsic content width (≈80 px from the first cell). Switching the table to `display: block` removes the table layout algorithm entirely; everything is laid out as plain block + CSS-grid rows whose tracks come from `grid-template-columns`. The `<colgroup>` becomes a no-op in this mode, which is the intended trade-off.

**Cost.** O(visible rows), not O(rowCount). 10 k rows render with the same DOM weight as 50 rows.

---

## Editing architecture

```
click cell
  └─ EditableCell.onActivate
      └─ TableActionsContext.setEditingCell({ rowId, columnId })
          └─ this row's `editingColumnId` prop flips; cell re-renders in edit mode
              └─ EditableCell allocates local useState for `draft`
                  └─ keystrokes mutate only this cell

Enter / blur
  └─ debouncedValidate.cancel(); validate synchronously
      └─ EditableCell.onSave(next)
          └─ EditableTableRow.handleSave
              ├─ onCommitCell(rowId, accessor, value)      // replace row in upstream state
              ├─ markRowEdited(rowId)                       // add to editedRowIds Set
              └─ clearEditingCell()                         // exit edit mode

Escape
  └─ EditableCell.onCancel → clearEditingCell()
      └─ local draft discarded; cell renders read-mode from the immutable `row` prop
```

**Original-value preservation is implicit.** The `row` prop is never mutated. On cancel we drop the local draft, on save we replace the row upstream. Anything beyond that — undo, "discard all", restore-to-original — lives in `useUndoRedo`.

**"Save changes" semantics.** The toolbar's Save button calls `useUndoRedo.commitChanges()`, which:

1. Replaces the original-rows snapshot with the current rows.
2. Clears the undo/redo history.
3. Empties `editedRowIds` → amber tints disappear → `beforeunload` warning stops firing.

In a real app, wire this to a network call: send the diff to the backend, only call `commitChanges()` on a successful response, otherwise keep rows marked unsaved so the user can retry.

---

## Rerender prevention strategy

Three independent layers, each cuts a different cost.

**Layer 1: virtualization.** Off-screen rows aren't mounted — no reconciliation, no memo check, no DOM.

**Layer 2: `React.memo` on `EditableTableRow`.** Props are stable by construction:

| Prop              | Stability                                                                     |
| ----------------- | ----------------------------------------------------------------------------- |
| `row`             | Referentially equal until commit replaces it                                  |
| `columns`         | Memoized at the consumer site (`useMemo` on the columns array)                |
| `editingColumnId` | `null` for every row except the one being edited; switching cells touches ≤ 2 |
| `isEdited`        | Flips only for the row that just got edited                                   |
| `onCommitCell`    | `useCallback` at the App level                                                |

If any of these references becomes unstable, the optimization silently degrades to "re-render every row." The contract is documented at the top of `EditableTableRow.tsx`.

**Layer 3: cell-local drafts.** Keystrokes update one `useState` inside one `EditableCell`. The component's parent (`EditableTableRow`) doesn't re-render; siblings don't re-render; context doesn't change. The cost of typing is independent of dataset size.

**Funneled state subscription.** Only `EditableTable` subscribes to `TableStateContext`. It computes per-row narrow props (`editingColumnId`, `isEdited`) and broadcasts them. Rows subscribe only to `TableActionsContext`, which never changes value during the provider's lifetime — so the act of dispatching an action doesn't re-render any row that subscribes to actions.

---

## Tradeoffs and limitations

| Limitation                              | Trade-off                                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One cell edited at a time               | Avoids N concurrent drafts. A row-edit mode would need cross-cell draft sync; deferred until use case demands it.                                                                    |
| Single-column sort in the UI            | `sortRows` utility supports multi-column out of the box; only the demo header exposes a single-column toggle.                                                                        |
| Fixed-height virtualization             | `useVirtualRows` assumes a constant `rowHeight`. Variable heights need a measurement pass or offsets cache.                                                                          |
| No column resize / reorder              | Out of scope. Columns are static per definition order.                                                                                                                               |
| No row selection                        | No `selectedRowIds` slot in context.                                                                                                                                                 |
| No arrow-key cell navigation            | Tab traverses focusable elements in DOM order. Arrow-key bindings are not implemented.                                                                                               |
| Client-side CSV export                  | Fine for 10 k rows. Hundreds of thousands would need a streamed server-side path.                                                                                                    |
| Undo history is in-memory, per-session  | A page refresh loses history. `beforeunload` warns the user about unsaved local edits.                                                                                               |
| `<input type="number">` in edit mode    | No locale-aware or currency-aware input formatting. `renderCell` formats the display only.                                                                                           |
| Validators see committed values only    | Cross-field validation can't read in-flight drafts in sibling cells (a consequence of cell-local drafts).                                                                            |
| Dropdown closes when trigger off-screen | The portaled menu repositions on scroll/resize but closes when the trigger leaves the viewport. A floating menu with no visible anchor would be confusing.                           |
| Tailwind v4-specific syntax             | `bg-amber-50!` (important modifier at end), `@import 'tailwindcss';` entrypoint. Downgrading to v3 requires the `!bg-amber-50` form and `@tailwind base; @tailwind components; ...`. |

---

## Future improvements

1. **Async commit lifecycle.** `onCommitCell` returns a `Promise`; the row enters a saving state, rolls back on rejection, and only marks itself edited on success.
2. **Variable-height row virtualization.** Measure-on-mount with an offsets cache, or `IntersectionObserver` for known content sections.
3. **Multi-column sort UI.** Shift-click to add a secondary sort; drag handles to re-prioritize. The utility already supports it.
4. **Row selection.** New context slot `selectedRowIds: Set<RowId>`; checkbox column; bulk actions in the toolbar.
5. **Keyboard cell navigation.** Arrow keys move the active cell; Tab moves right with row wrap; Enter enters edit mode on the focused cell.
6. **Server-driven sort/filter/paginate.** Replace the pure utilities with a fetch hook for million-row datasets. The component API stays unchanged.
7. **Per-type editors.** Date picker, currency input with locale formatting, multi-select tags. The discriminated union in `EditableCell` extends naturally.
8. **Persistent undo.** IndexedDB-backed history that survives reloads, with a "discard all changes" action.
9. **Column resize and reorder.** Drag handles on header cells; persisted preferences.
10. **Headless / unstyled mode.** Decouple the primitives from Tailwind so consumers can ship their own design system.
