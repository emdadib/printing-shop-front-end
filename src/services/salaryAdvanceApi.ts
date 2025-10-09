import { apiService } from './api'

export interface SalaryAdvance {
  id: string
  userId: string
  salaryId?: string
  amount: number
  requestDate: string
  approvedBy?: string
  approvedAt?: string
  paidBy?: string
  paidAt?: string
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED'
  reason?: string
  notes?: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  salary?: {
    id: string
    month: number
    year: number
    amount: number
  }
  approvedByUser?: {
    id: string
    firstName: string
    lastName: string
  }
  paidByUser?: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface CreateSalaryAdvanceData {
  userId: string
  amount: number
  reason?: string
  notes?: string
}

export interface AdvanceSummary {
  userId: string
  month: number
  year: number
  totalAdvances: number
  totalAmount: number
  pendingAmount: number
  approvedAmount: number
  paidAmount: number
  advances: SalaryAdvance[]
}

export interface SalaryAdvancesResponse {
  success: boolean
  data: SalaryAdvance[]
}

export interface SalaryAdvanceResponse {
  success: boolean
  data: SalaryAdvance
}

export interface AdvanceSummaryResponse {
  success: boolean
  data: AdvanceSummary
}

export interface MessageResponse {
  success: boolean
  message: string
}

export const salaryAdvanceApi = {
  // Get all salary advances with optional filtering
  getAllSalaryAdvances: async (params?: {
    userId?: string
    status?: string
    month?: number
    year?: number
  }): Promise<SalaryAdvancesResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.userId) queryParams.append('userId', params.userId)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.month) queryParams.append('month', params.month.toString())
    if (params?.year) queryParams.append('year', params.year.toString())
    
    const url = `/salary-advances${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiService.get<SalaryAdvancesResponse>(url)
  },

  // Get salary advance by ID
  getSalaryAdvanceById: async (id: string): Promise<SalaryAdvanceResponse> => {
    return apiService.get<SalaryAdvanceResponse>(`/salary-advances/${id}`)
  },

  // Create salary advance request
  createSalaryAdvance: async (advanceData: CreateSalaryAdvanceData): Promise<SalaryAdvanceResponse> => {
    return apiService.post<SalaryAdvanceResponse>('/salary-advances', advanceData)
  },

  // Approve salary advance
  approveSalaryAdvance: async (id: string, notes?: string): Promise<SalaryAdvanceResponse> => {
    return apiService.patch<SalaryAdvanceResponse>(`/salary-advances/${id}/approve`, { notes })
  },

  // Pay salary advance
  paySalaryAdvance: async (id: string, notes?: string): Promise<SalaryAdvanceResponse> => {
    return apiService.patch<SalaryAdvanceResponse>(`/salary-advances/${id}/pay`, { notes })
  },

  // Reject salary advance
  rejectSalaryAdvance: async (id: string, reason?: string): Promise<SalaryAdvanceResponse> => {
    return apiService.patch<SalaryAdvanceResponse>(`/salary-advances/${id}/reject`, { reason })
  },

  // Delete salary advance
  deleteSalaryAdvance: async (id: string): Promise<MessageResponse> => {
    return apiService.delete<MessageResponse>(`/salary-advances/${id}`)
  },

  // Get employee advance summary
  getEmployeeAdvanceSummary: async (userId: string, month?: number, year?: number): Promise<AdvanceSummaryResponse> => {
    const queryParams = new URLSearchParams()
    if (month) queryParams.append('month', month.toString())
    if (year) queryParams.append('year', year.toString())
    
    const url = `/salary-advances/summary/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiService.get<AdvanceSummaryResponse>(url)
  },
}
