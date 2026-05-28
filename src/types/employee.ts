export type EmployeeStatus = 'active' | 'on_leave' | 'inactive';

export type Employee = {
  id: number;
  name: string;
  email: string;
  department: string;
  salary: number;
  quantity: number;
  status: EmployeeStatus;
};
