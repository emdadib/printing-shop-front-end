import { apiService } from './api'

export interface Salary {
  id: string
  userId: string
  amount: number
  month: number
  year: number
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'
  paidAt?: string
  paidBy?: string
  notes?: string
  deductions?: number
  bonuses?: number
  advances?: number
  createdAt: string
  updatedAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  paidByUser?: {
    id: string
    firstName: string
    lastName: string
  }
  salaryAdvances?: Array<{
    id: string
    amount: number
    status: string
  }>
}

export interface CreateSalaryData {
  userId: string
  amount: number
  month: number
  year: number
  notes?: string
  deductions?: number
  bonuses?: number
}

export interface UpdateSalaryData {
  amount?: number
  notes?: string
  deductions?: number
  bonuses?: number
  status?: Salary['status']
}

export interface SalarySummary {
  totalSalaries: number
  totalAmount: number
  totalDeductions: number
  totalBonuses: number
  paidSalaries: number
  pendingSalaries: number
  approvedSalaries: number
  salaries: Salary[]
}

export interface SalariesResponse {
  success: boolean
  data: Salary[]
}

export interface SalaryResponse {
  success: boolean
  data: Salary
}

export interface SalarySummaryResponse {
  success: boolean
  data: SalarySummary
}

export interface MessageResponse {
  success: boolean
  message: string
}

export const salaryApi = {
  // Get all salaries with optional filtering
  getAllSalaries: async (params?: {
    month?: number
    year?: number
    userId?: string
    status?: string
  }): Promise<SalariesResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.month) queryParams.append('month', params.month.toString())
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.userId) queryParams.append('userId', params.userId)
    if (params?.status) queryParams.append('status', params.status)
    
    const url = `/salaries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiService.get<SalariesResponse>(url)
  },

  // Get salary by ID
  getSalaryById: async (id: string): Promise<SalaryResponse> => {
    return apiService.get<SalaryResponse>(`/salaries/${id}`)
  },

  // Create salary record
  createSalary: async (salaryData: CreateSalaryData): Promise<SalaryResponse> => {
    return apiService.post<SalaryResponse>('/salaries', salaryData)
  },

  // Update salary record
  updateSalary: async (id: string, salaryData: UpdateSalaryData): Promise<SalaryResponse> => {
    return apiService.put<SalaryResponse>(`/salaries/${id}`, salaryData)
  },

  // Mark salary as paid
  markSalaryAsPaid: async (id: string, notes?: string): Promise<SalaryResponse> => {
    return apiService.patch<SalaryResponse>(`/salaries/${id}/pay`, { notes })
  },

  // Delete salary record
  deleteSalary: async (id: string): Promise<MessageResponse> => {
    return apiService.delete<MessageResponse>(`/salaries/${id}`)
  },

  // Get salary summary for a specific period
  getSalarySummary: async (params: { month: number; year: number }): Promise<SalarySummaryResponse> => {
    return apiService.get<SalarySummaryResponse>(`/salaries/summary?month=${params.month}&year=${params.year}`)
  },
}
