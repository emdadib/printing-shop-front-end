import { apiService } from './api';

export interface EmployeeSalaryProfile {
  id: string;
  userId: string;
  baseSalary: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  notes?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  salaryPayments: SalaryPayment[];
}

export interface SalaryPayment {
  id: string;
  userId: string;
  profileId: string;
  amount: number;
  month: number;
  year: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paidAt?: string;
  paidBy?: string;
  deductions?: number;
  bonuses?: number;
  advances?: number;
  notes?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  profile: EmployeeSalaryProfile;
  paidByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface MonthlySummary {
  month: number;
  year: number;
  summary: {
    totalEmployees: number;
    totalPending: number;
    totalPaid: number;
    totalAmount: number;
  };
  pendingPayments: SalaryPayment[];
  paidPayments: SalaryPayment[];
}

export interface SetSalaryData {
  userId: string;
  baseSalary: number;
  notes?: string;
}

export interface ProcessPaymentData {
  userId: string;
  month: number;
  year: number;
  amount?: number;
  deductions?: number;
  bonuses?: number;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ProfilesResponse {
  success: boolean;
  data: EmployeeSalaryProfile[];
}

export interface SummaryResponse {
  success: boolean;
  data: MonthlySummary;
}

export interface PaymentResponse {
  success: boolean;
  data: SalaryPayment;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export const improvedSalaryApi = {
  // Get all employee salary profiles
  getEmployeeSalaryProfiles: async (): Promise<ProfilesResponse> => {
    return apiService.get<ProfilesResponse>('/improved-salary/profiles');
  },

  // Set employee salary (create or update profile)
  setEmployeeSalary: async (data: SetSalaryData): Promise<PaymentResponse> => {
    return apiService.post<PaymentResponse>('/improved-salary/set-salary', data);
  },

  // Process monthly payment
  processMonthlyPayment: async (data: ProcessPaymentData): Promise<PaymentResponse> => {
    return apiService.post<PaymentResponse>('/improved-salary/process-payment', data);
  },

  // Get monthly salary summary
  getMonthlySalarySummary: async (params?: {
    month?: number;
    year?: number;
  }): Promise<SummaryResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.year) queryParams.append('year', params.year.toString());
    
    const url = `/improved-salary/monthly-summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<SummaryResponse>(url);
  },

  // Get salary payment by ID
  getSalaryPaymentById: async (id: string): Promise<PaymentResponse> => {
    return apiService.get<PaymentResponse>(`/improved-salary/payments/${id}`);
  },

  // Mark salary payment as paid
  markPaymentAsPaid: async (id: string, notes?: string): Promise<PaymentResponse> => {
    return apiService.patch<PaymentResponse>(`/improved-salary/payments/${id}/pay`, { notes });
  },

  // Delete salary payment
  deleteSalaryPayment: async (id: string): Promise<MessageResponse> => {
    return apiService.delete<MessageResponse>(`/improved-salary/payments/${id}`);
  }
};
