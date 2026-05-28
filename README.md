# Editable Data Table

A 10,000-row editable table built from scratch in React 19 + TypeScript + Vite. No table library - a custom, composable table architecture tailored for inline cell editing, virtualization, sorting/filtering, and undo/redo.

## Setup

```bash
pnpm install
pnpm dev           # Vite dev server
pnpm build         # tsc -b && vite build
pnpm typecheck
pnpm lint
pnpm format
```

Node 20.19+ / 22.13+ / 24+, pnpm 9+. Open the URL Vite prints (usually `http://localhost:5173`).

## Approach

Build a custom table instead of using a library (TanStack Table, AG Grid, etc.) so the API, performance characteristics, and behavior are fully under our control. Dumb presentational primitives at the bottom, a typed `ColumnDef` contract in the middle, a container that composes them, and React Context for shared state.

Built incrementally:

1. Vite + TS scaffold, Tailwind v4, ESLint, Prettier, strict TS, `@/*` imports
2. Reusable types - `ColumnDef<TRow, K>`, sort/filter/pagination/edit state
3. Deterministic 10k mock employee generator (`mulberry32` PRNG)
4. Presentational primitives - `Table`, `TableHeader/Body/Row/Cell`, `TableCol/Colgroup`
5. `EditableTable` container - `data` + `columns` in, dynamic headers/rows out, respects `renderCell`
6. State via two-context split - `TableStateContext` + `TableActionsContext`, plus `useTableState` / `useTable`
7. Column sizing system (`width` / `minWidth` / `maxWidth` via colgroup)
8. Row memoization - `React.memo` + stable per-row props, editing one row only re-renders that row
9. `EditableCell` - text/number, local draft, validation, Enter/blur saves, Escape cancels
10. Inline cell editing - `editingCell` singleton in context, click-to-edit, `editedRowIds` set
11. Sorting utility - multi-column, stable, custom `sortFn`, null/undefined to end
12. Filtering utility - global search + per-column, custom `filterFn`, debounced via `lodash-es`
13. UI states - `TableLoadingState`, `TableSkeletonRow`, `TableEmptyState`, no-results
14. Pagination utility + `Pagination` component
15. Virtual scrolling (`useVirtualRows`) - absolute-positioned rows in `display: block` table, ~20 DOM nodes for 10k rows
16. Undo/redo (`useUndoRedo`) - bounded edit-history stack
17. CSV export - visible rows after sort/filter/paginate, with escaping
18. Unsaved-changes tracking + `beforeunload` warning

## Decisions

- **Two-context state split.** Actions context is referentially stable, so rows subscribe to it without re-rendering on state changes. State changes funnel through `EditableTable`, which broadcasts narrow per-row props (`editingColumnId`, `isEdited`) so `React.memo` bails out for unaffected rows.
- **Drafts live locally in each cell.** Keystrokes never touch context - typing cost is O(1) per cell. The committed row is replaced upstream only on Enter/blur.
- **One cell edited at a time.** `editingCell` is a singleton `{ rowId, columnId } | null`. Avoids N concurrent drafts and keeps state simple.
- **Original value preservation is implicit.** The `row` prop is immutable; on cancel we drop the local draft and re-render from `row`. Undo history is maintained separately by `useUndoRedo`.
- **Generic `ColumnDef<TRow, K>` + `defineColumn` helper** preserves per-column type narrowing for `sortFn` / `filterFn` / `validate`.
- **`display: block` on the table.** The default `display: table` doesn't size `display: block` thead/tbody to the table's width - they collapse to intrinsic content width (~80px). Switching to `display: block` lets the virtualized grid rows fill the full width.
- **Pure sort/filter utilities.** No React, no mutation. Multi-column stable sort relies on ES2019 `Array.prototype.sort`. Default filter is substring match; enum columns override with equality (e.g. status column - otherwise `"inactive"` would match the filter `"active"`).
- **Hand-rolled virtualization** instead of `react-window` / `react-virtual` - fixed row height, `transform: translateY()`, no extra dependency.
- **lodash-es** only for `debounce` (validation + filter input).

## Known Limitations

- One cell edited at a time (singleton `editingCell`).
- Single-column sort in the UI (the utility supports multi).
- Fixed-height virtualization - no variable row heights.
- No column resize/reorder, no row selection, no arrow-key cell navigation.
- CSV export is client-side only (fine for 10k, not for hundreds of thousands).
- Undo history is in-memory, per-session.
- `<input type="number">` in edit mode - no locale/currency-aware input formatting.
- Tailwind v4 specific (`bg-amber-50!` important syntax, `@import 'tailwindcss';`).
