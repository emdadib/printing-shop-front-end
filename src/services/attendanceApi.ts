import { apiService } from './api'

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'WEEKEND'
  | 'HOLIDAY'
  | 'ON_LEAVE'

export interface AttendanceRecord {
  id: string
  userId: string
  date: string
  checkIn: string | null
  lunchOut: string | null
  lunchIn: string | null
  checkOut: string | null
  totalHours: number | null
  status: AttendanceStatus
  isLate: boolean
  lateMinutes: number
  notes: string | null
  createdAt: string
  updatedAt: string
  user?: { id?: string; firstName: string; lastName: string; email?: string }
}

export interface AttendanceConfigData {
  id: string
  checkInTime: string
  checkInLateThreshold: string
  lunchBreakStartEarliest: string
  lunchBreakEndLatest: string
  checkOutTime: string
  weekendDays: number[]
  lateCountThreshold: number
  absentDaysThreshold: number
  lunchBreakMandatory: boolean
}

export interface TodayStatusData {
  attendance: AttendanceRecord | null
  isWeekend: boolean
  isShopClosed?: boolean
  shopClosureToday?: {
    id: string
    reason: string | null
    startDate: string
    endDate: string
  } | null
  onApprovedLeaveToday?: boolean
  approvedLeaveToday?: {
    id: string
    leaveType: string
    reason: string | null
    startDate: string
    endDate: string
  } | null
  config: Omit<AttendanceConfigData, 'id'>
}

export interface ShopClosure {
  id: string
  startDate: string
  endDate: string
  reason: string | null
  createdAt: string
  updatedAt: string
}

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface EmployeeLeaveRow {
  id: string
  userId: string
  startDate: string
  endDate: string
  leaveType: string
  reason: string | null
  status: LeaveRequestStatus
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; firstName: string; lastName: string; email: string }
  reviewer?: { id: string; firstName: string; lastName: string }
}

export interface MonthlySummary {
  workingDays: number
  shopClosureWeekdays?: number
  approvedLeaveDays?: number
  expectedPresentDays?: number
  presentDays: number
  lateDays: number
  absentDays: number
  lateDeductionDays: number
  absentDeductionDays: number
  totalDeductionDays: number
}

export interface MyHistoryResponse {
  records: AttendanceRecord[]
  summary: MonthlySummary
}

export interface MonthlyReportUser {
  user: { id: string; firstName: string; lastName: string; email: string }
  workingDays: number
  shopClosureWeekdays?: number
  approvedLeaveDays?: number
  expectedPresentDays?: number
  presentDays: number
  lateDays: number
  absentDays: number
  lateDeductionDays: number
  absentDeductionDays: number
  totalDeductionDays: number
  attendanceRecords: AttendanceRecord[]
}

export interface MonthlyReportData {
  month: number
  year: number
  workingDays: number
  shopClosureWeekdays?: number
  report: MonthlyReportUser[]
}

export interface AttendanceSalaryDeduction {
  id: string
  userId: string
  month: number
  year: number
  lateDays: number
  absentDays: number
  lateDeductionDays: number
  absentDeductionDays: number
  totalDeductionDays: number
  deductionAmount: number
  notes: string | null
  user?: { id: string; firstName: string; lastName: string; email: string }
}

export interface AdminMarkPayload {
  userId: string
  date: string
  status?: AttendanceStatus
  checkIn?: string
  checkOut?: string
  lunchOut?: string
  lunchIn?: string
  notes?: string
}

type ApiResp<T> = { success: boolean; data: T; message?: string }

export const attendanceApi = {
  checkIn: () =>
    apiService.post<ApiResp<AttendanceRecord>>('/attendance/check-in'),

  lunchOut: () =>
    apiService.post<ApiResp<AttendanceRecord>>('/attendance/lunch-out'),

  lunchIn: () =>
    apiService.post<ApiResp<AttendanceRecord>>('/attendance/lunch-in'),

  checkOut: () =>
    apiService.post<ApiResp<AttendanceRecord>>('/attendance/check-out'),

  getTodayStatus: () =>
    apiService.get<ApiResp<TodayStatusData>>('/attendance/today'),

  getMyHistory: (month?: number, year?: number) =>
    apiService.get<ApiResp<MyHistoryResponse>>(
      `/attendance/my-history${month ? `?month=${month}&year=${year}` : ''}`
    ),

  getAllAttendance: (params?: {
    userId?: string
    date?: string
    month?: number
    year?: number
  }) =>
    apiService.get<ApiResp<AttendanceRecord[]>>('/attendance', { params }),

  getMonthlyReport: (month: number, year: number, userId?: string) =>
    apiService.get<ApiResp<MonthlyReportData>>('/attendance/report', {
      params: { month, year, ...(userId ? { userId } : {}) },
    }),

  getConfig: () =>
    apiService.get<ApiResp<AttendanceConfigData>>('/attendance/config'),

  updateConfig: (data: Partial<Omit<AttendanceConfigData, 'id'>>) =>
    apiService.put<ApiResp<AttendanceConfigData>>('/attendance/config', data),

  calculateDeductions: (month: number, year: number, userId?: string) =>
    apiService.post<ApiResp<AttendanceSalaryDeduction[]>>(
      `/attendance/calculate-deductions?month=${month}&year=${year}${userId ? `&userId=${userId}` : ''}`
    ),

  getDeductions: (month: number, year: number, userId?: string) =>
    apiService.get<ApiResp<AttendanceSalaryDeduction[]>>('/attendance/deductions', {
      params: { month, year, ...(userId ? { userId } : {}) },
    }),

  adminMarkAttendance: (payload: AdminMarkPayload) =>
    apiService.post<ApiResp<AttendanceRecord>>('/attendance/admin/mark', payload),

  deleteRecord: (id: string) =>
    apiService.delete<ApiResp<null>>(`/attendance/${id}`),

  updateRecord: (id: string, data: Partial<AttendanceRecord>) =>
    apiService.put<ApiResp<AttendanceRecord>>(`/attendance/${id}`, data),

  getShopClosures: (month: number, year: number) =>
    apiService.get<ApiResp<ShopClosure[]>>(`/attendance/shop-closures`, { params: { month, year } }),

  createShopClosure: (body: { startDate: string; endDate: string; reason?: string }) =>
    apiService.post<ApiResp<ShopClosure>>('/attendance/shop-closures', body),

  deleteShopClosure: (closureId: string) =>
    apiService.delete<ApiResp<{ message?: string }>>(`/attendance/shop-closures/${closureId}`),

  getMyLeaves: () => apiService.get<ApiResp<EmployeeLeaveRow[]>>('/attendance/leaves/mine'),

  requestLeave: (body: { startDate: string; endDate: string; leaveType?: string; reason?: string }) =>
    apiService.post<ApiResp<EmployeeLeaveRow>>('/attendance/leaves', body),

  cancelLeaveRequest: (leaveId: string) =>
    apiService.delete<ApiResp<{ message?: string }>>(`/attendance/leaves/${leaveId}`),

  getLeavesForManager: (status?: LeaveRequestStatus) =>
    apiService.get<ApiResp<EmployeeLeaveRow[]>>(
      '/attendance/leaves',
      status ? { params: { status } } : {}
    ),

  reviewLeaveRequest: (leaveId: string, body: { approved: boolean; reviewNote?: string }) =>
    apiService.patch<ApiResp<EmployeeLeaveRow>>(`/attendance/leaves/${leaveId}/review`, body),
}
