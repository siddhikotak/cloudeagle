import type { Employee, EmployeeStatus } from '@/types/employee';

const FIRST_NAMES = [
  'Alice',
  'Bob',
  'Carol',
  'David',
  'Eve',
  'Frank',
  'Grace',
  'Henry',
  'Ivy',
  'Jack',
  'Kate',
  'Liam',
  'Mia',
  'Noah',
  'Olivia',
  'Paul',
  'Quinn',
  'Rachel',
  'Sam',
  'Tara',
  'Uma',
  'Victor',
  'Wendy',
  'Xavier',
  'Yara',
  'Zach',
] as const;

const LAST_NAMES = [
  'Adams',
  'Brown',
  'Chen',
  'Davis',
  'Evans',
  'Foster',
  'Garcia',
  'Hughes',
  'Ito',
  'Jones',
  'Kim',
  'Lopez',
  'Miller',
  'Nguyen',
  'Olsen',
  'Patel',
  'Quinn',
  'Reed',
  'Singh',
  'Taylor',
  'Underwood',
  'Vargas',
  'Wong',
  'Xu',
  'Young',
  'Zhang',
] as const;

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

const STATUSES: readonly EmployeeStatus[] = [
  'active',
  'on_leave',
  'inactive',
] as const;

const STATUS_WEIGHTS = [0.7, 0.2, 0.1] as const;

const mulberry32 = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const pick = <T>(rng: () => number, arr: readonly T[]): T => {
  const value = arr[Math.floor(rng() * arr.length)];
  if (value === undefined) {
    throw new Error('pick: empty array');
  }
  return value;
};

const pickWeighted = <T>(
  rng: () => number,
  items: readonly T[],
  weights: readonly number[],
): T => {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i] ?? 0;
    if (r < acc) {
      const value = items[i];
      if (value !== undefined) return value;
    }
  }
  const fallback = items[items.length - 1];
  if (fallback === undefined) {
    throw new Error('pickWeighted: empty array');
  }
  return fallback;
};

const intInRange = (rng: () => number, min: number, max: number): number =>
  Math.floor(rng() * (max - min + 1)) + min;

const roundTo = (value: number, step: number): number =>
  Math.round(value / step) * step;

export type GenerateEmployeesOptions = {
  count?: number;
  seed?: number;
};

export const generateEmployees = ({
  count = 10_000,
  seed = 42,
}: GenerateEmployeesOptions = {}): Employee[] => {
  const rng = mulberry32(seed);
  const employees: Employee[] = new Array<Employee>(count);

  for (let i = 0; i < count; i++) {
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    const id = i + 1;
    const salary = roundTo(intInRange(rng, 40_000, 200_000), 500);

    employees[i] = {
      id,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${id}@example.com`,
      department: pick(rng, DEPARTMENTS),
      salary,
      quantity: intInRange(rng, 1, 100),
      status: pickWeighted(rng, STATUSES, STATUS_WEIGHTS),
    };
  }

  return employees;
};
