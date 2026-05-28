import { useContext, useMemo } from 'react';
import {
  TableActionsContext,
  TableStateContext,
} from '@/components/TableContext';
import type { TableActions, TableState } from '@/hooks/useTableState';

export type UseTableResult = TableState & TableActions;

export function useTable(): UseTableResult {
  const state = useContext(TableStateContext);
  const actions = useContext(TableActionsContext);

  if (state === null || actions === null) {
    throw new Error('useTable must be used inside <TableProvider>');
  }

  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
