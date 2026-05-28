import { createContext, type ReactNode } from 'react';
import {
  useTableState,
  type TableActions,
  type TableState,
  type UseTableStateOptions,
} from '@/hooks/useTableState';

// eslint-disable-next-line react-refresh/only-export-components
export const TableStateContext = createContext<TableState | null>(null);
// eslint-disable-next-line react-refresh/only-export-components
export const TableActionsContext = createContext<TableActions | null>(null);

type TableProviderProps = UseTableStateOptions & {
  children: ReactNode;
};

export function TableProvider({ children, ...options }: TableProviderProps) {
  const { state, actions } = useTableState(options);

  return (
    <TableStateContext.Provider value={state}>
      <TableActionsContext.Provider value={actions}>
        {children}
      </TableActionsContext.Provider>
    </TableStateContext.Provider>
  );
}
