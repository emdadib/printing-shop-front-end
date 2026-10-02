import { apiService } from './api'

/**
 * Salary module API (`/api/salary`).
 *
 *  - profiles : each employee's monthly base salary
 *  - payouts  : cash handed to an employee during the month (recorded in one
 *               step; the money is given when the row is created)
 *  - process  : month-end settlement per employee: pays the remainder or
 *               carries the shortfall forward to the next processed month
 */

export interface PersonRef {
  id: string
  firstName: string
  lastName: string
  role?: string
  email?: string
}

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'
/** OPEN = not closed yet; PROCESSED = salary settled; SKIPPED = closed without salary. */
export type RowStatus = 'OPEN' | 'PROCESSED' | 'SKIPPED'

export interface SalaryProfile {
  id: string
  userId: string
  baseSalary: number
  user: PersonRef
}

export interface SalaryPayout {
  id: string
  userId: string
  amount: number
  status: PayoutStatus
  /** ISO date the money was given. */
  date: string
  reason: string | null
  notes: string | null
  givenBy: PersonRef | null
  user: PersonRef
}

export interface AttendanceDeductionInfo {
  userId: string
  deductionAmount: number
  lateDays: number
  absentDays: number
  totalDeductionDays: number
}

export interface EmployeeMonthRow {
  userId: string
  user: PersonRef
  status: RowStatus
  hasProfile: boolean
  baseSalary: number
  attendance: AttendanceDeductionInfo | null
  deductions: number
  bonuses: number
  payoutsTotal: number
  payoutsCount: number
  /** Legacy payouts still waiting to be handed over; they block processing. */
  pendingPayoutsCount: number
  payouts: SalaryPayout[]
  previousBalance: number
  /** Signed: positive = company pays, negative = employee owes. */
  netAmount: number
  paidAmount: number
  carryForward: number
  processed: {
    id: string
    paidAt: string | null
    processedBy: PersonRef | null
    notes: string | null
  } | null
}

export interface MonthTotals {
  employees: number
  processedCount: number
  openCount: number
  skippedCount: number
  baseSalary: number
  payouts: number
  deductions: number
  bonuses: number
  previousBalance: number
  netAmount: number
  toPayAtProcessing: number
  paidAtProcessing: number
  owed: number
  projectedOwed: number
  cashOut: number
}

export interface MonthReport {
  month: number
  year: number
  label: string
  rows: EmployeeMonthRow[]
  totals: MonthTotals
}

export interface ProcessedMonth {
  id: string
  userId: string
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'SKIPPED'
  amount: number
  deductions: number
  bonuses: number
  advances: number
  previousBalance: number
  netAmount: number
  paidAmount: number
  carryForward: number
  paidAt: string | null
  processedBy: PersonRef | null
  notes: string | null
  user: PersonRef
}

export interface EmployeeYearMonth {
  month: number
  year: number
  label: string
  status: RowStatus
  baseSalary: number
  payoutsTotal: number
  payoutsCount: number
  deductions: number
  bonuses: number
  previousBalance: number | null
  netAmount: number | null
  paidAmount: number | null
  carryForward: number | null
  processedAt: string | null
  processedBy: PersonRef | null
  processedId: string | null
  payouts: SalaryPayout[]
}

export interface EmployeeYear {
  user: PersonRef
  year: number
  baseSalary: number | null
  currentBalanceOwed: number
  months: EmployeeYearMonth[]
  totals: {
    payouts: number
    paidAtProcessing: number
    cashOut: number
    deductions: number
    bonuses: number
    processedMonths: number
  }
}

export interface ProcessAllResult {
  month: number
  year: number
  label: string
  processedCount: number
  processed: ProcessedMonth[]
  skipped: { userId: string; name: string; reason: string }[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface MessageResponse {
  success: boolean
  message: string
}

export interface CreatePayoutData {
  userId: string
  amount: number
  month: number
  year: number
  /** ISO date (YYYY-MM-DD) the money was given; defaults to now. */
  date?: string
  reason?: string
  notes?: string
}

export interface ProcessMonthData {
  userId: string
  month: number
  year: number
  deductions?: number
  bonuses?: number
  notes?: string
}

export interface SkipMonthData {
  userId: string
  month: number
  year: number
  reason?: string
}

export interface SetBaseSalaryData {
  userId: string
  baseSalary: number
  notes?: string
}

export const salaryApi = {
  getProfiles: () => apiService.get<ApiResponse<SalaryProfile[]>>('/salary/profiles'),

  setBaseSalary: (data: SetBaseSalaryData) =>
    apiService.post<ApiResponse<SalaryProfile>>('/salary/profiles', data),

  getMonthReport: (month: number, year: number) =>
    apiService.get<ApiResponse<MonthReport>>(`/salary/month?month=${month}&year=${year}`),

  getEmployeeYear: (userId: string, year: number) =>
    apiService.get<ApiResponse<EmployeeYear>>(`/salary/employee/${userId}?year=${year}`),

  createPayout: (data: CreatePayoutData) =>
    apiService.post<ApiResponse<SalaryPayout>>('/salary/payouts', data),

  /** Legacy rows from the old request/approve flow: hand the money over now. */
  payPendingPayout: (id: string) =>
    apiService.patch<ApiResponse<SalaryPayout>>(`/salary/payouts/${id}/pay`, {}),

  cancelPayout: (id: string, reason?: string) =>
    apiService.patch<ApiResponse<SalaryPayout>>(`/salary/payouts/${id}/cancel`, { reason }),

  deletePayout: (id: string) => apiService.delete<MessageResponse>(`/salary/payouts/${id}`),

  processMonth: (data: ProcessMonthData) =>
    apiService.post<ApiResponse<ProcessedMonth>>('/salary/process', data),

  processAll: (month: number, year: number, options: { userIds?: string[]; notes?: string } = {}) =>
    apiService.post<ApiResponse<ProcessAllResult>>('/salary/process-all', { month, year, ...options }),

  /** Close a month without salary (employee not present for the full month). */
  skipMonth: (data: SkipMonthData) => apiService.post<ApiResponse<ProcessedMonth>>('/salary/skip', data),

  undoProcess: (id: string) => apiService.delete<MessageResponse>(`/salary/process/${id}`),
}
