import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { EditableTable } from '@/components/EditableTable';
import { Pagination } from '@/components/Pagination';
import { TableProvider } from '@/components/TableContext';
import { useTable } from '@/hooks/useTable';
import type { Employee, EmployeeStatus } from '@/types/employee';
import { defineColumn, type ColumnDefs, type FilterState } from '@/types/table';
import { filterRows } from '@/utils/filtering';
import { generateEmployees } from '@/utils/generateData';
import { sortRows, type SortSpec } from '@/utils/sorting';

type LoadState = 'loading' | 'success' | 'error';

type Filters = {
  globalSearch: string;
  name: string;
  email: string;
  department: string;
  status: string;
  minSalary: string;
  maxSalary: string;
  minQuantity: string;
  maxQuantity: string;
};

const INITIAL_FILTERS: Filters = {
  globalSearch: '',
  name: '',
  email: '',
  department: '',
  status: '',
  minSalary: '',
  maxSalary: '',
  minQuantity: '',
  maxQuantity: '',
};

const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'Marketing',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Support',
  'Product',
  'Legal',
  'Design',
] as const;

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: 'Active',
  on_leave: 'On leave',
  inactive: 'Inactive',
};

const SORTABLE_COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'department', label: 'Department' },
  { id: 'salary', label: 'Salary' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'status', label: 'Status' },
] as const;

const buttonClass =
  'rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

const fieldClass =
  'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

const getStatusClass = (status: EmployeeStatus): string => {
  if (status === 'active') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (status === 'on_leave') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-slate-200 bg-slate-100 text-slate-600';
};

export function AdvancedEmployeeTable() {
  return (
    <TableProvider initialPagination={{ pageIndex: 0, pageSize: 100 }}>
      <AdvancedEmployeeTableContent />
    </TableProvider>
  );
}

function AdvancedEmployeeTableContent() {
  const { setPageIndex } = useTable();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [sortSpecs, setSortSpecs] = useState<SortSpec[]>([]);

  const columns = useMemo<ColumnDefs<Employee>>(
    () => [
      defineColumn<Employee, 'id'>({
        id: 'id',
        header: 'ID',
        accessor: 'id',
        sortable: true,
        width: 80,
      }),
      defineColumn<Employee, 'name'>({
        id: 'name',
        header: 'Name',
        accessor: 'name',
        editable: true,
        sortable: true,
        filterable: true,
        minWidth: 180,
        validate: (value) =>
          String(value).trim().length > 0
            ? { valid: true }
            : { valid: false, message: 'Name is required' },
      }),
      defineColumn<Employee, 'email'>({
        id: 'email',
        header: 'Email',
        accessor: 'email',
        editable: true,
        sortable: true,
        filterable: true,
        minWidth: 260,
        validate: (value) =>
          String(value).includes('@')
            ? { valid: true }
            : { valid: false, message: 'Enter a valid email' },
      }),
      defineColumn<Employee, 'department'>({
        id: 'department',
        header: 'Department',
        accessor: 'department',
        editable: true,
        sortable: true,
        filterable: true,
        minWidth: 170,
        editOptions: DEPARTMENTS.map((department) => ({
          label: department,
          value: department,
        })),
        validate: (value) =>
          String(value).trim().length > 0
            ? { valid: true }
            : { valid: false, message: 'Department is required' },
      }),
      defineColumn<Employee, 'salary'>({
        id: 'salary',
        header: 'Salary',
        accessor: 'salary',
        editable: true,
        sortable: true,
        width: 140,
        renderCell: ({ value }) => formatCurrency(value),
        validate: (value) =>
          value >= 0
            ? { valid: true }
            : { valid: false, message: 'Salary must be positive' },
      }),
      defineColumn<Employee, 'quantity'>({
        id: 'quantity',
        header: 'Quantity',
        accessor: 'quantity',
        editable: true,
        sortable: true,
        width: 120,
        validate: (value) =>
          value >= 0
            ? { valid: true }
            : { valid: false, message: 'Quantity must be positive' },
      }),
      defineColumn<Employee, 'status'>({
        id: 'status',
        header: 'Status',
        accessor: 'status',
        sortable: true,
        filterable: true,
        width: 130,
        renderCell: ({ value }) => (
          <span
            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getStatusClass(value)}`}
          >
            {STATUS_LABEL[value]}
          </span>
        ),
      }),
    ],
    [],
  );

  const loadEmployees = useCallback(() => {
    setLoadState('loading');
    setEmployees([]);

    window.setTimeout(() => {
      try {
        const employeeJson = generateEmployees({ count: 10_000, seed: 2026 });
        setEmployees(employeeJson);
        setLoadState('success');
      } catch {
        setLoadState('error');
      }
    }, 500);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const employeeJson = generateEmployees({ count: 10_000, seed: 2026 });
        setEmployees(employeeJson);
        setLoadState('success');
      } catch {
        setLoadState('error');
      }
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const failLoad = useCallback(() => {
    setEmployees([]);
    setLoadState('error');
  }, []);

  const updateFilter = useCallback(
    (key: keyof Filters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPageIndex(0);
    },
    [setPageIndex],
  );

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setPageIndex(0);
  }, [setPageIndex]);

  const clearColumnFilter = useCallback(
    (...keys: Array<keyof Filters>) => {
      setFilters((prev) => {
        const next = { ...prev };
        for (const key of keys) {
          next[key] = '';
        }
        return next;
      });
      setPageIndex(0);
    },
    [setPageIndex],
  );

  const toggleSort = useCallback(
    (columnId: string) => {
      setSortSpecs((prev) => {
        const existing = prev.find((spec) => spec.columnId === columnId);
        if (!existing) return [...prev, { columnId, direction: 'asc' }];
        if (existing.direction === 'asc') {
          return prev.map((spec) =>
            spec.columnId === columnId ? { ...spec, direction: 'desc' } : spec,
          );
        }
        return prev.filter((spec) => spec.columnId !== columnId);
      });
      setPageIndex(0);
    },
    [setPageIndex],
  );

  const clearSort = useCallback(() => {
    setSortSpecs([]);
    setPageIndex(0);
  }, [setPageIndex]);

  const processedRows = useMemo(() => {
    const columnFilters: FilterState = {};
    if (filters.name) columnFilters['name'] = filters.name;
    if (filters.email) columnFilters['email'] = filters.email;
    if (filters.department) columnFilters['department'] = filters.department;
    if (filters.status) columnFilters['status'] = filters.status;

    const minSalary =
      filters.minSalary === '' ? null : Number(filters.minSalary);
    const maxSalary =
      filters.maxSalary === '' ? null : Number(filters.maxSalary);
    const minQuantity =
      filters.minQuantity === '' ? null : Number(filters.minQuantity);
    const maxQuantity =
      filters.maxQuantity === '' ? null : Number(filters.maxQuantity);

    const filtered = filterRows(
      employees,
      columnFilters,
      columns,
      filters.globalSearch,
    ).filter((row) => {
      if (minSalary !== null && row.salary < minSalary) return false;
      if (maxSalary !== null && row.salary > maxSalary) return false;
      if (minQuantity !== null && row.quantity < minQuantity) return false;
      if (maxQuantity !== null && row.quantity > maxQuantity) return false;
      return true;
    });

    return sortRows(filtered, sortSpecs, columns);
  }, [columns, employees, filters, sortSpecs]);

  const isFiltered =
    filters.globalSearch !== '' ||
    filters.name !== '' ||
    filters.email !== '' ||
    filters.department !== '' ||
    filters.status !== '' ||
    filters.minSalary !== '' ||
    filters.maxSalary !== '' ||
    filters.minQuantity !== '' ||
    filters.maxQuantity !== '';

  const headerFilters = useMemo(
    () => ({
      name: (
        <HeaderFilterMenu
          label="Filter name"
          active={filters.name !== ''}
          onClear={() => clearColumnFilter('name')}
        >
          <input
            value={filters.name}
            onChange={(event) => updateFilter('name', event.target.value)}
            placeholder="Contains..."
            className={fieldClass}
          />
        </HeaderFilterMenu>
      ),
      email: (
        <HeaderFilterMenu
          label="Filter email"
          active={filters.email !== ''}
          onClear={() => clearColumnFilter('email')}
        >
          <input
            value={filters.email}
            onChange={(event) => updateFilter('email', event.target.value)}
            placeholder="Contains..."
            className={fieldClass}
          />
        </HeaderFilterMenu>
      ),
      department: (
        <HeaderFilterMenu
          label="Filter department"
          active={filters.department !== ''}
          onClear={() => clearColumnFilter('department')}
        >
          <OptionFilter
            value={filters.department}
            allLabel="All departments"
            options={DEPARTMENTS.map((department) => ({
              value: department,
              label: department,
            }))}
            onChange={(value) => updateFilter('department', value)}
          />
        </HeaderFilterMenu>
      ),
      salary: (
        <HeaderFilterMenu
          label="Filter salary"
          active={filters.minSalary !== '' || filters.maxSalary !== ''}
          onClear={() => clearColumnFilter('minSalary', 'maxSalary')}
        >
          <div className="grid gap-2">
            <input
              type="number"
              min="0"
              value={filters.minSalary}
              onChange={(event) =>
                updateFilter('minSalary', event.target.value)
              }
              placeholder="Min salary"
              className={fieldClass}
            />
            <input
              type="number"
              min="0"
              value={filters.maxSalary}
              onChange={(event) =>
                updateFilter('maxSalary', event.target.value)
              }
              placeholder="Max salary"
              className={fieldClass}
            />
          </div>
        </HeaderFilterMenu>
      ),
      quantity: (
        <HeaderFilterMenu
          label="Filter quantity"
          active={filters.minQuantity !== '' || filters.maxQuantity !== ''}
          onClear={() => clearColumnFilter('minQuantity', 'maxQuantity')}
        >
          <div className="grid gap-2">
            <input
              type="number"
              min="0"
              value={filters.minQuantity}
              onChange={(event) =>
                updateFilter('minQuantity', event.target.value)
              }
              placeholder="Min quantity"
              className={fieldClass}
            />
            <input
              type="number"
              min="0"
              value={filters.maxQuantity}
              onChange={(event) =>
                updateFilter('maxQuantity', event.target.value)
              }
              placeholder="Max quantity"
              className={fieldClass}
            />
          </div>
        </HeaderFilterMenu>
      ),
      status: (
        <HeaderFilterMenu
          label="Filter status"
          active={filters.status !== ''}
          onClear={() => clearColumnFilter('status')}
        >
          <OptionFilter
            value={filters.status}
            allLabel="All statuses"
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(value) => updateFilter('status', value)}
          />
        </HeaderFilterMenu>
      ),
    }),
    [clearColumnFilter, filters, updateFilter],
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-slate-500">
            Editable data table
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Employee operations
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Inline editing, multi-column sorting, filters, pagination,
            virtualization, undo/redo, CSV export, and unsaved-change protection
            are composed into one reusable table workflow.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadEmployees} className={buttonClass}>
            Reload data
          </button>
          <button type="button" onClick={failLoad} className={buttonClass}>
            Simulate failure
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatusCard label="Load state" value={loadState} />
        <StatusCard label="Generated rows" value={employees.length} />
        <StatusCard label="Visible rows" value={processedRows.length} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(280px,420px)_1fr] md:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Search all columns
            <input
              value={filters.globalSearch}
              onChange={(event) =>
                updateFilter('globalSearch', event.target.value)
              }
              placeholder="Name, email, department..."
              className={fieldClass}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Sort:</span>
            {SORTABLE_COLUMNS.map((column) => {
              const active = sortSpecs.find(
                (spec) => spec.columnId === column.id,
              );
              return (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => toggleSort(column.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {column.label}
                  {active
                    ? ` ${active.direction === 'asc' ? 'Asc' : 'Desc'}`
                    : ''}
                </button>
              );
            })}
            <button type="button" onClick={clearSort} className={buttonClass}>
              Clear sort
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className={buttonClass}
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {loadState === 'error' ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800"
        >
          <h3 className="text-base font-semibold">Could not load employees</h3>
          <p className="mt-1 text-sm">
            The table is showing a failure state. Retry to regenerate the
            deterministic 10,000-row dataset.
          </p>
          <button
            type="button"
            onClick={loadEmployees}
            className="mt-4 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <EditableTable
            data={processedRows}
            columns={columns}
            layout="fixed"
            isLoading={loadState === 'loading'}
            isFiltered={isFiltered}
            loadingRowCount={10}
            virtualMaxHeight={620}
            csvFileName="employees-visible-rows.csv"
            headerFilters={headerFilters}
            emptyState={{
              title: 'No employees loaded',
              description: 'Reload the deterministic employee dataset.',
            }}
            noResultsState={{
              title: 'No matching employees',
              description: 'Clear filters or adjust the search criteria.',
            }}
          />
          <Pagination totalRows={processedRows.length} />
        </>
      )}
    </section>
  );
}

function HeaderFilterMenu({
  label,
  active,
  children,
  onClear,
}: {
  label: string;
  active: boolean;
  children: ReactNode;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 288;
    const gutter = 12;
    const left = Math.min(
      Math.max(gutter, rect.right - menuWidth),
      window.innerWidth - menuWidth - gutter,
    );

    setPosition({
      left,
      top: rect.bottom + 8,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !menuRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleReposition = () => {
      updatePosition();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updatePosition]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
          active
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
        }`}
        aria-label={label}
        aria-expanded={open}
      >
        <FilterIcon />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[100] w-72 overflow-auto rounded-lg border border-slate-200 bg-white p-3 normal-case tracking-normal shadow-2xl"
              style={{
                left: position.left,
                top: position.top,
                maxHeight: 'min(420px, calc(100vh - 24px))',
              }}
              onKeyDown={handleKeyDown}
            >
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <button
                  type="button"
                  onClick={onClear}
                  disabled={!active}
                  className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Clear
                </button>
              </div>
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function OptionFilter({
  value,
  allLabel,
  options,
  onChange,
}: {
  value: string;
  allLabel: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const allOptions = [{ value: '', label: allLabel }, ...options];

  return (
    <div className="grid max-h-72 gap-1 overflow-y-auto pr-1">
      {allOptions.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value || '__all'}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
              selected
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{option.label}</span>
            {selected ? (
              <span className="h-2 w-2 rounded-full bg-blue-500" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M4 5h12l-5 6v3l-2 1v-4L4 5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold capitalize text-slate-950">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
