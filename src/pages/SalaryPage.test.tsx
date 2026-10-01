import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import SalaryPage from './SalaryPage';
import { apiService } from '@/services/api';
import type { MonthReport } from '@/services/salaryApi';

vi.mock('@/services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({
    currencyCode: 'BDT',
    currencySymbol: 'Tk',
    currencyInfo: {},
    formatCurrency: (amount: number) => `Tk ${amount.toLocaleString('en-US')}`,
    setCurrency: () => {},
    loading: false,
  }),
}));

const permissions = { admin: true };
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isAdmin: () => permissions.admin,
    isManager: () => true,
    isSuperAdmin: () => false,
  }),
}));

const person = (id: string, firstName: string, lastName: string, role = 'STAFF') => ({ id, firstName, lastName, role });

const report: MonthReport = {
  month: 9,
  year: 2026,
  label: 'September 2026',
  rows: [
    {
      userId: 'u1',
      user: person('u1', 'Rahim', 'Uddin'),
      status: 'OPEN',
      hasProfile: true,
      baseSalary: 20000,
      attendance: { userId: 'u1', deductionAmount: 500, lateDays: 3, absentDays: 0, totalDeductionDays: 1 },
      deductions: 500,
      bonuses: 0,
      payoutsTotal: 8000,
      payoutsCount: 2,
      pendingPayoutsCount: 0,
      payouts: [],
      previousBalance: 0,
      netAmount: 11500,
      paidAmount: 11500,
      carryForward: 0,
      processed: null,
    },
    {
      userId: 'u2',
      user: person('u2', 'Karim', 'Ahmed'),
      status: 'OPEN',
      hasProfile: true,
      baseSalary: 12000,
      attendance: null,
      deductions: 0,
      bonuses: 0,
      payoutsTotal: 14000,
      payoutsCount: 1,
      pendingPayoutsCount: 0,
      payouts: [],
      previousBalance: 0,
      netAmount: -2000,
      paidAmount: 0,
      carryForward: 2000,
      processed: null,
    },
    {
      userId: 'u3',
      user: person('u3', 'Sumi', 'Akter'),
      status: 'PROCESSED',
      hasProfile: true,
      baseSalary: 15000,
      attendance: null,
      deductions: 0,
      bonuses: 1000,
      payoutsTotal: 5000,
      payoutsCount: 1,
      pendingPayoutsCount: 0,
      payouts: [],
      previousBalance: 0,
      netAmount: 11000,
      paidAmount: 11000,
      carryForward: 0,
      processed: { id: 'm3', paidAt: '2026-09-30T10:00:00.000Z', processedBy: person('a', 'Admin', 'User'), notes: null },
    },
  ],
  totals: {
    employees: 3,
    processedCount: 1,
    openCount: 2,
    baseSalary: 47000,
    payouts: 27000,
    deductions: 500,
    bonuses: 1000,
    previousBalance: 0,
    netAmount: 20500,
    toPayAtProcessing: 11500,
    paidAtProcessing: 11000,
    owed: 0,
    projectedOwed: 2000,
    cashOut: 38000,
  },
};

const users = [
  { id: 'u1', email: 'r@x.com', username: 'rahim', firstName: 'Rahim', lastName: 'Uddin', role: 'STAFF', isActive: true, createdAt: '' },
  { id: 'u2', email: 'k@x.com', username: 'karim', firstName: 'Karim', lastName: 'Ahmed', role: 'STAFF', isActive: true, createdAt: '' },
  { id: 'u3', email: 's@x.com', username: 'sumi', firstName: 'Sumi', lastName: 'Akter', role: 'CASHIER', isActive: true, createdAt: '' },
];

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SalaryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  // The page opens on the current month; pin it to the fixture's month.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15));
  permissions.admin = true;
  vi.mocked(apiService.get).mockImplementation(async (url: string) => {
    if (url.startsWith('/salary/month')) return { success: true, data: report };
    if (url.startsWith('/users')) return { success: true, data: users };
    throw new Error(`unexpected GET ${url}`);
  });
  vi.mocked(apiService.post).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SalaryPage month report', () => {
  it('shows every employee with what they are owed or owe for the month', async () => {
    renderPage();

    expect(await screen.findByText('Rahim Uddin')).toBeInTheDocument();
    expect(screen.getByText('Karim Ahmed')).toBeInTheDocument();
    expect(screen.getByText('Sumi Akter')).toBeInTheDocument();

    // Rahim still has 11,500 coming; Karim took 2,000 more than he earned.
    expect(screen.getByTestId('net-u1')).toHaveTextContent('Tk 11,500');
    expect(within(screen.getByTestId('row-u1')).getByText('To pay at processing')).toBeInTheDocument();
    expect(screen.getByTestId('net-u2')).toHaveTextContent('Tk 2,000');
    expect(within(screen.getByTestId('row-u2')).getByText('Would owe the company')).toBeInTheDocument();
    expect(within(screen.getByTestId('row-u3')).getByText('Processed')).toBeInTheDocument();

    // Month totals on the cards.
    expect(screen.getByTestId('total-payouts')).toHaveTextContent('Tk 27,000');
    expect(screen.getByTestId('total-to-pay')).toHaveTextContent('Tk 11,500');
    expect(screen.getByText('Owed to the company')).toBeInTheDocument();

    // Only the two open employees can still be processed.
    expect(screen.getByRole('button', { name: /Process all \(2\)/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('row-u3')).queryByRole('button', { name: 'Process' })).not.toBeInTheDocument();
  });

  it('processes one employee with the suggested deduction and shows what will be paid', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      success: true,
      data: { ...report.rows[0], id: 'm1', user: report.rows[0].user, amount: 20000, advances: 8000, paidAmount: 11500, carryForward: 0 },
    });
    renderPage();
    const user = userEvent.setup();

    const rahimRow = await screen.findByTestId('row-u1');
    await user.click(within(rahimRow).getByRole('button', { name: 'Process' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Process September 2026')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Deduction')).toHaveValue(500);
    expect(within(dialog).getByText(/Attendance suggests Tk 500/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Pay Tk 11,500 & close month' }));

    expect(apiService.post).toHaveBeenCalledWith('/salary/process', {
      userId: 'u1',
      month: 9,
      year: 2026,
      deductions: 500,
      bonuses: 0,
      notes: undefined,
    });
  });

  it('opens the pay dialog for a row with that employee preselected and the remaining amount shown', async () => {
    renderPage();
    const user = userEvent.setup();

    const karimRow = await screen.findByTestId('row-u2');
    await user.click(within(karimRow).getByRole('button', { name: 'Pay' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Pay salary — September 2026')).toBeInTheDocument();
    expect(within(dialog).getByText('Remaining for this month')).toBeInTheDocument();
    expect(within(dialog).getByText('Tk -2,000')).toBeInTheDocument();
  });

  it('hides processing and base-salary actions from non-admins', async () => {
    permissions.admin = false;
    renderPage();

    await screen.findByText('Rahim Uddin');
    expect(screen.queryByRole('button', { name: /Process all/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set base salary' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay salary' })).toBeInTheDocument();
  });
});
